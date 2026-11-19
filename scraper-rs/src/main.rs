//! Rojgar Mitra job scraper.
//!
//! Collects current Gujarat government job advertisements and inserts new ones into Supabase.
//!
//! Sources (all server-rendered HTML, no headless browser needed):
//!   * OJAS home   - "current advertisements" block. Link text carries organisation, post and
//!     last date, e.g. "GSSSB - Food Safety Officer ( અંતિમ તારીખ 10-November-2026 )".
//!   * GPSC "Apply Online" table - Advt. No. | Description | Total Posts | Last Apply Date.
//!   * FreeJobAlert Gujarat - aggregated table with vacancies, qualification and advertisement
//!     number in separate columns; the only source that reliably carries all three.
//!
//! Study material:
//!   * GSSSB downloads, Gujarat Police downloads and GPSSB previous papers. Only rows whose
//!     title names a syllabus, rules, exam or paper are kept.
//!
//! Design:
//!   * robots.txt is honoured per origin before every fetch; a polite delay separates requests.
//!   * Parsing is pure (HTML in -> rows out) so it is unit-tested against fixtures.
//!   * Dry-run by default; --no-dry-run writes with the service-role key (server-side only).

mod dates;
mod db;
mod fetch;
mod parse;
mod pdf;
mod resources;
mod sources;

use std::collections::HashSet;

use serde::Serialize;

/// Every row sent in one bulk insert must carry the same key set, or PostgREST rejects the
/// batch with PGRST102 "All object keys must match". Sources fill different subsets, so rows
/// are normalised through this struct instead of ad-hoc maps.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Job {
    pub title: String,
    pub department: String,
    pub source_link: String,
    pub post_date: String,
    pub deadline: String,
    pub salary: Option<String>,
    pub vacancies: Option<i64>,
    pub qualification: Option<String>,
    pub advertisement_no: Option<String>,
    pub location: Option<String>,
}

fn main() {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    if args.iter().any(|a| a == "--help" || a == "-h") {
        println!("usage: rojgar-scraper [--dry-run | --no-dry-run] [--resources-only] [--skip-resources]");
        println!("       rojgar-scraper --backfill-pdfs [--dry-run | --no-dry-run]");
        println!("  --dry-run        print what would be inserted (default)");
        println!("  --no-dry-run     insert into Supabase; needs SUPABASE_URL and");
        println!("                   SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_URL)");
        println!("  --resources-only scrape official study material, not job listings");
        println!("  --skip-resources skip study-material pages");
        println!("  --backfill-pdfs  read official notification PDFs for live notices that still");
        println!("                   miss eligibility or pay (needs pdftotext/poppler-utils)");
        return;
    }
    let dry_run = !args.iter().any(|a| a == "--no-dry-run");
    let resources_only = args.iter().any(|a| a == "--resources-only");
    let skip_resources = args.iter().any(|a| a == "--skip-resources");
    if args.iter().any(|a| a == "--backfill-pdfs") {
        std::process::exit(run_pdf_backfill(dry_run));
    }
    std::process::exit(run(dry_run, resources_only, skip_resources));
}

fn run(dry_run: bool, resources_only: bool, skip_resources: bool) -> i32 {
    println!("\n🔄 Rojgar Mitra Job Scraper (rust)");
    println!("{}", "=".repeat(50));
    if dry_run {
        println!("⚠️  DRY RUN - nothing will be written to the database\n");
    }

    let mut client = fetch::Client::new();
    let today = dates::today();
    let today_text = today.format("%Y-%m-%d").to_string();

    let mut scraped: Vec<Job> = Vec::new();
    let mut source_counts: Vec<(String, usize)> = Vec::new();

    if !resources_only {
        for source in sources::all() {
            let url = source.url().to_string();
            let found = match client.get(&url) {
                Some(body) => source.parse(&body, &url, &today_text),
                None => Vec::new(),
            };
            source_counts.push((url.clone(), found.len()));
            println!("📥 {}: {} advertisements", url, found.len());
            scraped.extend(found);
        }
    }

    let total_scraped = scraped.len();
    let (mut valid, rejected) = sources::select_insertable(scraped, &today);
    for (job, reason) in &rejected {
        println!("  - Skipped ({}): {}", reason, truncate(&job.title, 70));
    }
    println!("\n📋 {} valid of {} scraped", valid.len(), total_scraped);

    let mut present: HashSet<String> = HashSet::new();
    if !dry_run {
        match db::existing_links(&valid) {
            Ok(links) => present = links,
            Err(err) => {
                eprintln!("\n❌ Could not read existing jobs: {err}");
                return 1;
            }
        }
    }
    // Only rows that are new (or still missing facts) reach the network, so a daily run stays
    // close to the listing's own cost.
    let (pages_fetched, locations_found, detail_rows, document_rows) =
        enrich_locations(&mut client, &mut valid, &present);
    if pages_fetched > 0 {
        println!(
            "📍 detail pages: {} fetched, {} with a stated location, {} eligibility records, {} documents",
            pages_fetched,
            locations_found,
            detail_rows.len(),
            document_rows.len()
        );
    }

    let mut inserted = 0usize;
    let mut already_present = 0usize;
    if !dry_run {
        match db::insert_new_jobs(&valid, &present) {
            Ok(stats) => {
                inserted = stats.inserted;
                already_present = stats.already_present;
                for link in &stats.new_links {
                    if let Some(job) = valid.iter().find(|j| &j.source_link == link) {
                        println!("  ✓ Inserted: {}", truncate(&job.title, 70));
                    }
                }
                println!("\n📊 {} inserted, {} already present", inserted, already_present);
            }
            Err(err) => {
                eprintln!("\n❌ Database write failed: {err}");
                return 1;
            }
        }

        // Eligibility lives in `job_details`, so it is written after the job rows exist.
        if !detail_rows.is_empty() {
            match db::insert_job_details(&detail_rows) {
                Ok(written) => println!("🧾 {} eligibility records written", written),
                Err(err) => eprintln!("⚠️  Could not write eligibility records: {err}"),
            }
        }

        // The notice's own document list, written after the job rows so the FK resolves.
        if !document_rows.is_empty() {
            match db::insert_documents(&document_rows) {
                Ok(written) => println!("📄 {} document requirements written", written),
                Err(err) => eprintln!("⚠️  Could not write document requirements: {err}"),
            }
        }
    } else {
        for (i, job) in valid.iter().enumerate() {
            println!(
                "  {}. {} | {} | last date {}",
                i + 1,
                truncate(&job.title, 70),
                job.department,
                job.deadline
            );
        }
    }

    let (resource_counts, resource_rows, resources_inserted) =
        scrape_resources(&mut client, dry_run, skip_resources);

    let _ = write_report(RunReport {
        dry_run,
        source_counts: &source_counts,
        valid: &valid,
        rejected: &rejected,
        inserted,
        already_present,
        resource_counts: &resource_counts,
        resources_found: resource_rows.len(),
        resources_inserted,
    });

    // Nothing found anywhere usually means a site changed its layout: fail loudly in CI.
    let source_total: usize = source_counts.iter().map(|(_, n)| *n).sum();
    if !resources_only && source_total == 0 {
        println!("\n❌ No advertisements found on any source - selectors may need updating.");
        return 1;
    }
    println!("\n✅ Done{}", if dry_run { " (dry run)" } else { "" });
    0
}

/// Fills missing eligibility and pay from the official notification PDF linked by each article.
///
/// This is deliberately separate from the daily listing run: it visits every live notice that
/// still lacks a fact, which is a backfill-sized job rather than a daily one. A monthly workflow
/// runs it, and it can be dispatched manually. `pdftotext -layout` (Poppler) supplies the text.
fn run_pdf_backfill(dry_run: bool) -> i32 {
    println!("\n📄 PDF enrichment (official notification PDFs)");
    println!("{}", "=".repeat(50));
    if dry_run {
        println!("⚠️  DRY RUN - nothing will be written\n");
    }
    let today = dates::today().format("%Y-%m-%d").to_string();
    let (jobs, with_details) = match db::live_jobs_for_backfill(&today) {
        Ok(value) => value,
        Err(err) => {
            eprintln!("❌ {err}");
            return 1;
        }
    };

    let mut client = fetch::Client::new();
    let mut details: Vec<db::DetailRow> = Vec::new();
    let mut salaries: Vec<(String, String)> = Vec::new();
    let mut scanned = 0usize;

    for job in jobs {
        let needs_details = !with_details.contains(&job.id);
        let needs_salary = job.salary.is_none();
        if !needs_details && !needs_salary {
            continue;
        }
        let Some(html) = client.get(&job.source_link) else {
            continue;
        };
        scanned += 1;

        let article_age = parse::freejobalert_age_limit(&html)
            .as_deref()
            .and_then(pdf::numeric_age)
            .or_else(|| pdf::age_from_html(&html));
        let article_qual = parse::freejobalert_qualification(&html)
            .filter(|value| pdf::valid_qualification(value));
        let article_pay = parse::freejobalert_salary(&html);

        let advt = pdf::advt_number(&job.title);
        let candidates = pdf::notification_pdfs(&html, &job.source_link, advt.as_deref());
        let mut facts = pdf::Facts::default();
        for url in candidates.iter().take(2) {
            let Some(bytes) = client.get_bytes(url) else {
                continue;
            };
            match pdf::extract_text(&bytes) {
                Ok(text) => {
                    let found = pdf::extract_facts(&text);
                    if !found.is_empty() {
                        facts = found;
                        break;
                    }
                }
                Err(err) => eprintln!("  · {}: {err}", truncate(url, 90)),
            }
        }

        let age = facts
            .age
            .clone()
            .or(article_age)
            .filter(|value| pdf::numeric_age(value).is_some());
        let qualification = job
            .qualification
            .clone()
            .filter(|value| pdf::valid_qualification(value))
            .or_else(|| facts.qualification.clone().filter(|value| pdf::valid_qualification(value)))
            .or(article_qual);
        let pay = facts.pay.clone().or(article_pay);

        let mut actions: Vec<String> = Vec::new();
        if needs_details {
            if let (Some(age_limit), Some(required)) = (&age, &qualification) {
                details.push(db::DetailRow {
                    job_source_link: job.source_link.clone(),
                    age_limit: age_limit.clone(),
                    required_qualifications: required.clone(),
                    application_fees: None,
                });
                actions.push(format!("eligibility ({age_limit})"));
            }
        }
        if needs_salary {
            if let Some(pay) = &pay {
                salaries.push((job.source_link.clone(), pay.clone()));
                actions.push(format!("pay ({})", truncate(pay, 45)));
            }
        }
        if !actions.is_empty() {
            println!("  ✓ {}: {}", truncate(&job.title, 62), actions.join(", "));
        }
    }

    println!(
        "\n📊 scanned {scanned} articles · {} eligibility rows · {} pay fills",
        details.len(),
        salaries.len()
    );
    if dry_run {
        println!("Dry run: nothing written.");
        return 0;
    }
    if !details.is_empty() {
        match db::insert_job_details(&details) {
            Ok(written) => println!("Wrote {written} job_details rows."),
            Err(err) => {
                eprintln!("❌ job_details write failed: {err}");
                return 1;
            }
        }
    }
    let mut failed = 0usize;
    for (link, pay) in &salaries {
        if let Err(err) = db::update_salary(link, pay) {
            eprintln!("❌ {err}");
            failed += 1;
        }
    }
    if failed > 0 {
        return 1;
    }
    println!("Wrote {} salary updates.", salaries.len());
    0
}

/// FreeJobAlert article pages carry facts the listing table does not: `Job Location`, `Pay`
/// and `Age Limit`. Fetching them for every row would triple a daily run, so only rows that
/// are new (or still missing all three facts) are visited — one fetch fills every empty field.
fn enrich_locations(
    client: &mut fetch::Client,
    jobs: &mut [Job],
    present: &HashSet<String>,
) -> (usize, usize, Vec<db::DetailRow>, Vec<db::DocumentRow>) {
    let mut fetched = 0usize;
    let mut found = 0usize;
    let mut details: Vec<db::DetailRow> = Vec::new();
    let mut documents: Vec<db::DocumentRow> = Vec::new();
    for job in jobs.iter_mut() {
        let complete = job.location.is_some() && job.salary.is_some();
        if complete || present.contains(&job.source_link) {
            continue;
        }
        if !job.source_link.contains("freejobalert.com/articles/") {
            continue;
        }
        if let Some(html) = client.get(&job.source_link) {
            fetched += 1;
            let mut got = false;
            if job.location.is_none() {
                if let Some(location) = parse::freejobalert_location(&html) {
                    job.location = Some(location);
                    got = true;
                }
            }
            // Pay is the field that was previously always empty: the listing has no salary
            // column, so 0 of 87 live rows had one before this.
            if job.salary.is_none() {
                if let Some(salary) = parse::freejobalert_salary(&html) {
                    job.salary = Some(salary);
                    got = true;
                }
            }
            // Eligibility facts for `job_details`. Both required columns must be present or the
            // row cannot be written, so the pair is collected together.
            let age = parse::freejobalert_age_limit(&html);
            // "As Per the Advertisement" and "Other" are placeholders, not requirements.
            let qualification = parse::freejobalert_qualification(&html)
                .filter(|value| pdf::valid_qualification(value));
            if let (Some(age_limit), Some(required_qualifications)) = (age, qualification) {
                details.push(db::DetailRow {
                    job_source_link: job.source_link.clone(),
                    age_limit,
                    required_qualifications,
                    application_fees: parse::freejobalert_fee(&html),
                });
                got = true;
            }
            // The article's own "Documents Required" list, which is what the checklist screen
            // shows instead of the generic fallback. Documents are needed to apply, so they are
            // recorded in the `Application` phase.
            for document_name in parse::freejobalert_documents(&html) {
                documents.push(db::DocumentRow {
                    job_source_link: job.source_link.clone(),
                    document_name,
                    phase: "Application".to_string(),
                });
            }
            if got {
                found += 1;
            }
        }
    }
    (fetched, found, details, documents)
}

fn scrape_resources(
    client: &mut fetch::Client,
    dry_run: bool,
    skip_resources: bool,
) -> (Vec<(String, usize)>, Vec<resources::Resource>, usize) {
    if skip_resources {
        return (Vec::new(), Vec::new(), 0);
    }

    let mut counts = Vec::new();
    let mut all = Vec::new();
    for source in resources::all() {
        let url = source.url.to_string();
        let found = match client.get(&url) {
            Some(body) => source.parse(&body, &url),
            None => Vec::new(),
        };
        counts.push((source.label.to_string(), found.len()));
        println!("📚 {}: {} resources", source.label, found.len());
        all.extend(found);
    }

    let mut seen = HashSet::new();
    let unique: Vec<_> = all
        .into_iter()
        .filter(|item| seen.insert(item.link_or_content.clone()))
        .collect();

    if unique.is_empty() {
        return (counts, unique, 0);
    }

    if dry_run {
        for item in &unique {
            println!("  · {}", truncate(&item.title, 70));
        }
        return (counts, unique, 0);
    }

    match db::insert_new_global_resources(&unique) {
        Ok(inserted) => {
            println!("📊 {} study resources inserted", inserted);
            (counts, unique, inserted)
        }
        Err(err) => {
            // A resource-page failure must not hide the job run that already succeeded.
            eprintln!("⚠️  Study resources not written: {err}");
            (counts, unique, 0)
        }
    }
}

fn truncate(text: &str, max: usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() <= max {
        return text.to_string();
    }
    format!("{}…", chars[..max].iter().collect::<String>())
}

/// Inputs for the CI run report. Grouped so the function stays readable and clippy-clean.
struct RunReport<'a> {
    dry_run: bool,
    source_counts: &'a [(String, usize)],
    valid: &'a [Job],
    rejected: &'a [(Job, String)],
    inserted: usize,
    already_present: usize,
    resource_counts: &'a [(String, usize)],
    resources_found: usize,
    resources_inserted: usize,
}

/// Writes the run report where CI can pick it up.
fn write_report(report: RunReport<'_>) -> std::io::Result<()> {
    let payload = serde_json::json!({
        "ran_at": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        "dry_run": report.dry_run,
        "sources": report.source_counts.iter().cloned().collect::<std::collections::BTreeMap<_, _>>(),
        "valid": report.valid.len(),
        "inserted": report.inserted,
        "already_present": report.already_present,
        "rejected": report.rejected.iter().map(|(job, reason)| serde_json::json!({
            "title": job.title,
            "reason": reason,
        })).collect::<Vec<_>>(),
        "resource_sources": report.resource_counts.iter().cloned().collect::<std::collections::BTreeMap<_, _>>(),
        "resources_found": report.resources_found,
        "resources_inserted": report.resources_inserted,
    });
    let path = std::env::var("SCRAPER_REPORT_PATH").unwrap_or_else(|_| "scrape_report.json".to_string());
    std::fs::write(path, serde_json::to_string_pretty(&payload)?)
}
