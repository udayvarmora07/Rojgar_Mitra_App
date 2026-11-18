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
//! Design:
//!   * robots.txt is honoured per origin before every fetch; a polite delay separates requests.
//!   * Parsing is pure (HTML in -> rows out) so it is unit-tested against fixtures.
//!   * Dry-run by default; --no-dry-run writes with the service-role key (server-side only).

mod dates;
mod db;
mod fetch;
mod parse;
mod sources;

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
}

fn main() {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    if args.iter().any(|a| a == "--help" || a == "-h") {
        println!("usage: rojgar-scraper [--dry-run | --no-dry-run]");
        println!("  --dry-run     print what would be inserted (default)");
        println!("  --no-dry-run  insert into Supabase; needs SUPABASE_URL and");
        println!("                SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_URL)");
        return;
    }
    let dry_run = !args.iter().any(|a| a == "--no-dry-run");
    std::process::exit(run(dry_run));
}

fn run(dry_run: bool) -> i32 {
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

    let total_scraped = scraped.len();
    let (valid, rejected) = sources::select_insertable(scraped, &today);
    for (job, reason) in &rejected {
        println!("  - Skipped ({}): {}", reason, truncate(&job.title, 70));
    }
    println!("\n📋 {} valid of {} scraped", valid.len(), total_scraped);

    let mut inserted = 0usize;
    let mut already_present = 0usize;
    if !dry_run {
        match db::insert_new_jobs(&valid) {
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

    let _ = write_report(dry_run, &source_counts, &valid, &rejected, inserted, already_present);

    // Nothing found anywhere usually means a site changed its layout: fail loudly in CI.
    let source_total: usize = source_counts.iter().map(|(_, n)| *n).sum();
    if source_total == 0 {
        println!("\n❌ No advertisements found on any source - selectors may need updating.");
        return 1;
    }
    println!("\n✅ Done{}", if dry_run { " (dry run)" } else { "" });
    0
}

fn truncate(text: &str, max: usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() <= max {
        return text.to_string();
    }
    format!("{}…", chars[..max].iter().collect::<String>())
}

/// Writes the run report where CI can pick it up.
fn write_report(
    dry_run: bool,
    source_counts: &[(String, usize)],
    valid: &[Job],
    rejected: &[(Job, String)],
    inserted: usize,
    already_present: usize,
) -> std::io::Result<()> {
    let report = serde_json::json!({
        "ran_at": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        "dry_run": dry_run,
        "sources": source_counts.iter().cloned().collect::<std::collections::BTreeMap<_, _>>(),
        "valid": valid.len(),
        "inserted": inserted,
        "already_present": already_present,
        "rejected": rejected.iter().map(|(job, reason)| serde_json::json!({
            "title": job.title,
            "reason": reason,
        })).collect::<Vec<_>>(),
    });
    let path = std::env::var("SCRAPER_REPORT_PATH").unwrap_or_else(|_| "scrape_report.json".to_string());
    std::fs::write(path, serde_json::to_string_pretty(&report)?)
}
