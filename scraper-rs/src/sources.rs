//! Source registry plus the shared validation/dedupe step that every run applies.

use chrono::NaiveDate;
use url::Url;

use crate::parse;
use crate::Job;

pub const OJAS_HOME: &str = "https://ojas.gujarat.gov.in/";
pub const GPSC_OPEN: &str = "https://gpsc.gujarat.gov.in/RecruitmentOpen";
/// Aggregated listing covering many Gujarat boards in one stable server-rendered table.
pub const FREEJOBALERT_GUJARAT: &str = "https://www.freejobalert.com/gujarat-government-jobs/";

pub struct Source {
    url: &'static str,
    parser: fn(&str, &str, &str) -> Vec<Job>,
}

impl Source {
    pub fn url(&self) -> &'static str {
        self.url
    }

    pub fn parse(&self, html: &str, url: &str, today: &str) -> Vec<Job> {
        (self.parser)(html, url, today)
    }
}

pub fn all() -> Vec<Source> {
    vec![
        Source { url: OJAS_HOME, parser: parse::ojas_home },
        Source { url: GPSC_OPEN, parser: parse::gpsc_open },
        Source { url: FREEJOBALERT_GUJARAT, parser: parse::freejobalert_gujarat },
    ]
}

/// Splits rows into (valid, rejected-with-reason) and de-duplicates by source_link.
///
/// A row is kept only when it has an http(s) link, a parseable deadline that has not passed,
/// and is the first appearance of that link in the run.
pub fn select_insertable(jobs: Vec<Job>, today: &NaiveDate) -> (Vec<Job>, Vec<(Job, String)>) {
    let today_text = today.format("%Y-%m-%d").to_string();
    let mut valid: Vec<Job> = Vec::new();
    let mut rejected: Vec<(Job, String)> = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();

    for job in jobs {
        let scheme_ok = Url::parse(&job.source_link)
            .map(|u| matches!(u.scheme(), "http" | "https"))
            .unwrap_or(false);

        let reason = if !scheme_ok {
            Some("no http(s) source link")
        } else if seen.contains(&job.source_link) {
            Some("duplicate in this run")
        } else if job.deadline.is_empty() {
            // `deadline` is NOT NULL in the schema, and a job with no last date would mislead users.
            Some("no deadline found")
        } else if job.deadline.as_str() < today_text.as_str() {
            Some("deadline already passed")
        } else {
            None
        };

        match reason {
            Some(reason) => rejected.push((job, reason.to_string())),
            None => {
                seen.insert(job.source_link.clone());
                valid.push(job);
            }
        }
    }
    (valid, rejected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    fn job(link: &str, deadline: &str) -> Job {
        Job {
            title: "Post".into(),
            department: "ONGC".into(),
            source_link: link.into(),
            post_date: "2026-11-05".into(),
            deadline: deadline.into(),
            salary: None,
            vacancies: None,
            qualification: None,
            advertisement_no: None,
            location: None,
        }
    }

    fn today() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 11, 5).unwrap()
    }

    #[test]
    fn filters_expired_dateless_and_duplicate_rows() {
        let input = vec![
            job("https://example.test/open", "2026-11-20"),
            job("https://example.test/open", "2026-11-20"),
            job("https://example.test/expired", "2026-10-01"),
            job("https://example.test/nodate", ""),
            job("ftp://example.test/bad", "2026-11-20"),
        ];
        let (valid, rejected) = select_insertable(input, &today());
        assert_eq!(valid.len(), 1);
        assert_eq!(valid[0].source_link, "https://example.test/open");
        assert_eq!(rejected.len(), 4);
        let reasons: Vec<&str> = rejected.iter().map(|(_, r)| r.as_str()).collect();
        assert!(reasons.contains(&"duplicate in this run"));
        assert!(reasons.contains(&"deadline already passed"));
        assert!(reasons.contains(&"no deadline found"));
        assert!(reasons.contains(&"no http(s) source link"));
    }

    #[test]
    fn keeps_a_row_that_closes_today() {
        let (valid, _) = select_insertable(vec![job("https://example.test/last", "2026-11-05")], &today());
        assert_eq!(valid.len(), 1);
    }
}
