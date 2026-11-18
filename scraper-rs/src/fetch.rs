//! Polite HTTP fetching: robots.txt is honoured per origin, requests are spaced out, and
//! transient failures are retried with exponential backoff.

use std::collections::HashMap;
use std::thread::sleep;
use std::time::{Duration, Instant};

pub const USER_AGENT: &str = "RojgarMitraBot/1.0 (Gujarat government job aggregator)";
const REQUEST_DELAY: Duration = Duration::from_secs(2);
const MAX_ATTEMPTS: u32 = 3;
const TIMEOUT: Duration = Duration::from_secs(30);

pub struct Client {
    agent: ureq::Agent,
    robots: HashMap<String, robotxt::Robots>,
    last_request: Option<Instant>,
}

fn origin_of(url: &str) -> String {
    match url::Url::parse(url) {
        Ok(parsed) => parsed.origin().ascii_serialization(),
        Err(_) => String::new(),
    }
}

/// Path + query of a URL, which is what a robots.txt rule matches against.
fn path_of(url: &str) -> String {
    match url::Url::parse(url) {
        Ok(parsed) => match parsed.query() {
            Some(query) => format!("{}?{}", parsed.path(), query),
            None => parsed.path().to_string(),
        },
        Err(_) => "/".to_string(),
    }
}

impl Client {
    pub fn new() -> Self {
        let agent: ureq::Agent = ureq::Agent::config_builder()
            .timeout_global(Some(TIMEOUT))
            .user_agent(USER_AGENT)
            .build()
            .into();
        Self { agent, robots: HashMap::new(), last_request: None }
    }

    /// Fetches robots.txt once per origin and caches the parsed rules. The request goes
    /// through the same throttle as page requests, so the first hit to a site is spaced too.
    fn robots_for(&mut self, origin: &str) -> &robotxt::Robots {
        if !self.robots.contains_key(origin) {
            self.wait_turn();
            let rules = match self.agent.get(format!("{origin}/robots.txt")).call() {
                Ok(mut response) => {
                    let body = response.body_mut().read_to_string().unwrap_or_default();
                    robotxt::Robots::parse(body.as_bytes(), USER_AGENT)
                }
                // An unreachable robots.txt means allow-all, the standard crawler behaviour.
                Err(_) => robotxt::Robots::parse(b"", USER_AGENT),
            };
            self.robots.insert(origin.to_string(), rules);
        }
        self.robots.get(origin).expect("just inserted")
    }

    fn wait_turn(&mut self) {
        if let Some(last) = self.last_request {
            let elapsed = last.elapsed();
            if elapsed < REQUEST_DELAY {
                sleep(REQUEST_DELAY - elapsed);
            }
        }
        self.last_request = Some(Instant::now());
    }

    /// Returns the page body, or None when robots.txt disallows it or every attempt failed.
    pub fn get(&mut self, url: &str) -> Option<String> {
        let origin = origin_of(url);
        if origin.is_empty() {
            eprintln!("  ✗ Unparseable URL {url}");
            return None;
        }

        let allowed = self.robots_for(&origin).is_allowed(&path_of(url));
        if !allowed {
            println!("  ✗ robots.txt disallows {url} - skipped");
            return None;
        }

        for attempt in 1..=MAX_ATTEMPTS {
            self.wait_turn();
            match self.agent.get(url).call() {
                Ok(mut response) => match response.body_mut().read_to_string() {
                    Ok(body) => return Some(body),
                    Err(err) => eprintln!("  ✗ Could not read {url}: {err}"),
                },
                Err(ureq::Error::StatusCode(code)) if (500..600).contains(&code) || code == 429 => {
                    let backoff = Duration::from_secs(2u64.pow(attempt));
                    eprintln!("  ! {url}: HTTP {code}, retrying in {}s", backoff.as_secs());
                    sleep(backoff);
                }
                Err(err) => {
                    eprintln!("  ✗ Could not fetch {url}: {err}");
                    return None;
                }
            }
        }
        eprintln!("  ✗ Gave up on {url} after {MAX_ATTEMPTS} attempts");
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_origin_without_path() {
        assert_eq!(origin_of("https://ojas.gujarat.gov.in/AdvtDetails.aspx?sid=x"), "https://ojas.gujarat.gov.in");
        assert_eq!(origin_of("https://gpsc.gujarat.gov.in:443/RecruitmentOpen"), "https://gpsc.gujarat.gov.in");
    }

    #[test]
    fn rejects_unparseable_urls() {
        assert_eq!(origin_of("not a url"), "");
        assert_eq!(origin_of(""), "");
    }
}
