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
        println!("  --dry-run        print what would be inserted (default)");
        println!("  --no-dry-run     insert into Supabase; needs SUPABASE_URL and");
        println!("                   SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_URL)");
        println!("  --resources-only scrape official study material, not job listings");
        println!("  --skip-resources skip study-material pages");
        return;
    }
    let dry_run = !args.iter().any(|a| a == "--no-dry-run");
    let resources_only = args.iter().any(|a| a == "--resources-only");
    let skip_resources = args.iter().any(|a| a == "--skip-resources");
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
    let (pages_fetched, locations_found) = enrich_locations(&mut client, &mut valid, &present);
    if pages_fetched > 0 {
        println!(
            "📍 locations: {} new detail pages fetched, {} with a stated location",
            pages_fetched, locations_found
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

/// FreeJobAlert article pages are the only source that states `Job Location`. Fetching them
/// for every row would triple a daily run, so only new rows are visited.
fn enrich_locations(
    client: &mut fetch::Client,
    jobs: &mut [Job],
    present: &HashSet<String>,
) -> (usize, usize) {
    let mut fetched = 0usize;
    let mut found = 0usize;
    for job in jobs.iter_mut() {
        if job.location.is_some() || present.contains(&job.source_link) {
            continue;
        }
        if !job.source_link.contains("freejobalert.com/articles/") {
            continue;
        }
        if let Some(html) = client.get(&job.source_link) {
            fetched += 1;
            if let Some(location) = parse::freejobalert_location(&html) {
                job.location = Some(location);
                found += 1;
            }
        }
    }
    (fetched, found)
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
