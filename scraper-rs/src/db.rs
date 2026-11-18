//! Supabase writes over the PostgREST API, using the service-role key (server-side only).

use std::collections::HashSet;

use serde::Deserialize;

use crate::resources::Resource;
use crate::Job;

pub struct InsertStats {
    pub inserted: usize,
    pub already_present: usize,
    /// Links that were actually written, so the caller can print them.
    pub new_links: Vec<String>,
}

#[derive(Deserialize)]
struct ExistingRow {
    source_link: Option<String>,
}

#[derive(Deserialize)]
struct ExistingResource {
    link_or_content: String,
}

/// Resolves the project URL and service key from the environment.
///
/// The scraper runs server-side, so it takes the secret key. `EXPO_PUBLIC_SUPABASE_URL` is
/// accepted for the URL only because that value is public by design.
fn credentials() -> Result<(String, String), String> {
    let url = std::env::var("SUPABASE_URL")
        .or_else(|_| std::env::var("EXPO_PUBLIC_SUPABASE_URL"))
        .map_err(|_| "SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) must be set".to_string())?;
    let key = std::env::var("SUPABASE_SERVICE_ROLE_KEY")
        .map_err(|_| "SUPABASE_SERVICE_ROLE_KEY must be set for --no-dry-run".to_string())?;
    Ok((url.trim_end_matches('/').to_string(), key))
}

fn agent() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(std::time::Duration::from_secs(45)))
        .user_agent("RojgarMitraScraper/2.0")
        .build()
        .into()
}

#[cfg(test)]
mod tests {
    use super::credentials;

    // One test covers both outcomes because `credentials()` reads process-wide env vars, and
    // Rust runs tests in parallel by default. Setting and clearing inside one function keeps
    // these assertions from racing with each other.
    #[test]
    fn missing_credentials_are_rejected() {
        std::env::remove_var("SUPABASE_URL");
        std::env::remove_var("EXPO_PUBLIC_SUPABASE_URL");
        std::env::remove_var("SUPABASE_SERVICE_ROLE_KEY");

        let err = credentials().expect_err("a write with no credentials must fail");
        assert!(err.contains("SUPABASE_URL"), "unexpected error: {err}");

        std::env::set_var("SUPABASE_URL", "http://127.0.0.1:54321/");
        let err = credentials().expect_err("a write with no key must fail");
        assert!(err.contains("SUPABASE_SERVICE_ROLE_KEY"), "unexpected error: {err}");

        std::env::set_var("SUPABASE_SERVICE_ROLE_KEY", "test-key");
        let (url, key) = credentials().expect("both values present should resolve");
        assert_eq!(url, "http://127.0.0.1:54321", "trailing slash should be trimmed");
        assert_eq!(key, "test-key");

        std::env::remove_var("SUPABASE_URL");
        std::env::remove_var("SUPABASE_SERVICE_ROLE_KEY");
    }
}

/// Which source links are already stored, so the caller can enrich only genuinely new rows
/// (location detail pages are fetched one per new advertisement).
pub fn existing_links(jobs: &[Job]) -> Result<HashSet<String>, String> {
    if jobs.is_empty() {
        return Ok(HashSet::new());
    }
    let (url, key) = credentials()?;
    let agent = agent();

    // Source links contain `=`, `&` and `?`, which are illegal inside a PostgREST `in.(...)`
    // filter. Percent-encode each value, then the list. A single request with ~100 encoded
    // links exceeds the server's URI limit (414), so the lookup is chunked.
    let encode = |value: &str| -> String {
        url::form_urlencoded::byte_serialize(value.as_bytes()).collect()
    };
    const CHUNK: usize = 20;

    let mut present = HashSet::new();
    let links: Vec<&str> = jobs.iter().map(|j| j.source_link.as_str()).collect();
    for chunk in links.chunks(CHUNK) {
        let filter = chunk.iter().map(|l| encode(l)).collect::<Vec<_>>().join(",");
        let query_url = format!(
            "{url}/rest/v1/jobs?select=source_link&source_link=in.({})",
            encode(&filter)
        );
        let existing: Vec<ExistingRow> = match agent
            .get(&query_url)
            .header("apikey", &key)
            .header("Authorization", &format!("Bearer {key}"))
            .call()
        {
            Ok(mut response) => response
                .body_mut()
                .read_json::<Vec<ExistingRow>>()
                .map_err(|e| format!("could not read existing jobs: {e}"))?,
            Err(err) => return Err(format!("could not query existing jobs: {err}")),
        };
        present.extend(existing.into_iter().filter_map(|row| row.source_link));
    }
    Ok(present)
}

/// Inserts jobs whose source_link is not in `present`.
///
/// Rows are inserted one at a time so that a single duplicate cannot reject the batch
/// (the table has a unique index on source_link).
pub fn insert_new_jobs(jobs: &[Job], present: &HashSet<String>) -> Result<InsertStats, String> {
    if jobs.is_empty() {
        return Ok(InsertStats { inserted: 0, already_present: 0, new_links: Vec::new() });
    }
    let (url, key) = credentials()?;
    let agent = agent();

    let mut inserted = 0usize;
    let mut new_links = Vec::new();
    let insert_url = format!("{url}/rest/v1/jobs");
    for job in jobs {
        if present.contains(&job.source_link) {
            continue;
        }
        let body = serde_json::to_string(&[job]).map_err(|e| e.to_string())?;
        match agent
            .post(&insert_url)
            .header("apikey", &key)
            .header("Authorization", &format!("Bearer {key}"))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .send(body.as_bytes())
        {
            Ok(_) => {
                inserted += 1;
                new_links.push(job.source_link.clone());
            }
            // 409 = the unique index already had this link (a concurrent run won the race).
            Err(ureq::Error::StatusCode(409)) => {}
            Err(err) => return Err(format!("insert failed for {}: {err}", job.source_link)),
        }
    }

    Ok(InsertStats { inserted, already_present: present.len(), new_links })
}

/// One eligibility record per job, written to `public.job_details` after the job rows exist.
///
/// `age_limit` and `required_qualifications` are NOT NULL in the schema, so a record is only
/// sent when both are present. `application_fees` is optional.
pub struct DetailRow {
    pub job_source_link: String,
    pub age_limit: String,
    pub required_qualifications: String,
    pub application_fees: Option<String>,
}

#[derive(Deserialize)]
struct JobIdRow {
    id: String,
}

/// Writes `job_details` for jobs that have none yet.
///
/// The detail screen shows an eligibility card for every job, but the scraped rows never had
/// one — 0 of 94 live jobs had a `job_details` row, so every scraped advertisement showed
/// "No eligibility information yet". This looks up the job ids by `source_link` and posts the
/// facts the article page states.
pub fn insert_job_details(details: &[DetailRow]) -> Result<usize, String> {
    if details.is_empty() {
        return Ok(0);
    }
    let (url, key) = credentials()?;
    let agent = agent();

    let mut written = 0usize;
    for detail in details {
        // Resolve the parent job id; the FK requires it and PostgREST cannot join on insert.
        let lookup = format!(
            "{url}/rest/v1/jobs?select=id,source_link&source_link=eq.{}",
            encode_query(&detail.job_source_link)
        );
        let rows: Vec<JobIdRow> = match agent
            .get(&lookup)
            .header("apikey", &key)
            .header("Authorization", &format!("Bearer {key}"))
            .call()
        {
            Ok(mut response) => response
                .body_mut()
                .read_json::<Vec<JobIdRow>>()
                .map_err(|e| format!("could not read job id: {e}"))?,
            Err(err) => return Err(format!("could not look up job: {err}")),
        };
        let Some(job_id) = rows.into_iter().next().map(|r| r.id) else {
            continue;
        };

        let payload = serde_json::json!([{
            "job_id": job_id,
            "age_limit": detail.age_limit,
            "required_qualifications": detail.required_qualifications,
            "application_fees": detail.application_fees,
        }]);
        let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
        match agent
            .post(&format!("{url}/rest/v1/job_details"))
            .header("apikey", &key)
            .header("Authorization", &format!("Bearer {key}"))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .send(body.as_bytes())
        {
            Ok(_) => written += 1,
            // 409 means a concurrent run already wrote this job's details.
            Err(ureq::Error::StatusCode(409)) => {}
            Err(err) => return Err(format!("insert job_details failed: {err}")),
        }
    }
    Ok(written)
}

/// Percent-encodes a value for use inside a PostgREST `eq.` filter.
///
/// Article URLs contain `:` and `/`, which PostgREST treats as filter syntax, so everything
/// outside the unreserved set is escaped.
fn encode_query(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

#[cfg(test)]
mod encode_tests {
    use super::encode_query;

    #[test]
    fn encodes_url_special_characters_for_a_rest_filter() {
        assert_eq!(
            encode_query("https://x.com/a?b=1&c=2"),
            "https%3A%2F%2Fx.com%2Fa%3Fb%3D1%26c%3D2"
        );
    }

    #[test]
    fn leaves_unreserved_characters_alone() {
        assert_eq!(encode_query("a-b_c.d~e"), "a-b_c.d~e");
    }
}

/// Inserts general (job_id NULL) study resources that are not already stored. The partial
/// unique index on `learning_resources.link_or_content WHERE job_id IS NULL` makes a
/// concurrent duplicate a harmless 409.
pub fn insert_new_global_resources(resources: &[Resource]) -> Result<usize, String> {
    if resources.is_empty() {
        return Ok(0);
    }
    let (url, key) = credentials()?;
    let agent = agent();
    let query_url =
        format!("{url}/rest/v1/learning_resources?select=link_or_content&job_id=is.null");

    let existing: Vec<ExistingResource> = match agent
        .get(&query_url)
        .header("apikey", &key)
        .header("Authorization", &format!("Bearer {key}"))
        .call()
    {
        Ok(mut response) => response
            .body_mut()
            .read_json::<Vec<ExistingResource>>()
            .map_err(|e| format!("could not read existing resources: {e}"))?,
        Err(err) => return Err(format!("could not query existing resources: {err}")),
    };
    let present: HashSet<String> =
        existing.into_iter().map(|row| row.link_or_content).collect();

    let mut inserted = 0usize;
    let insert_url = format!("{url}/rest/v1/learning_resources");
    for item in resources {
        if present.contains(&item.link_or_content) {
            continue;
        }
        let body = serde_json::to_string(&[item]).map_err(|e| e.to_string())?;
        match agent
            .post(&insert_url)
            .header("apikey", &key)
            .header("Authorization", &format!("Bearer {key}"))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .send(body.as_bytes())
        {
            Ok(_) => inserted += 1,
            Err(ureq::Error::StatusCode(409)) => {}
            Err(err) => {
                return Err(format!(
                    "resource insert failed for {}: {err}",
                    item.link_or_content
                ))
            }
        }
    }
    Ok(inserted)
}
