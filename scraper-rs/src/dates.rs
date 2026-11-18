//! Indian date parsing for the portals we scrape.
//!
//! Indian listings are day-first: `20-11-2026`, `17/11/2026`, `10-November-2026`. OJAS also
//! renders Gujarati digits (`૧૦-૧૧-૨૦૨૬`) and some boards use Devanagari (`१०-११-२०२६`).
//! Every format below is one we have actually observed in the live HTML.

use chrono::{Datelike, Duration, NaiveDate, Utc};

/// Replaces Gujarati (U+0AE6..) and Devanagari (U+0966..) digits with ASCII.
pub fn normalize_digits(text: &str) -> String {
    text.chars()
        .map(|c| match c {
            '\u{0AE6}'..='\u{0AEF}' => char::from(b'0' + (c as u32 - 0x0AE6) as u8),
            '\u{0966}'..='\u{096F}' => char::from(b'0' + (c as u32 - 0x0966) as u8),
            other => other,
        })
        .collect()
}

const MONTHS: [&str; 12] = [
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
];

fn month_from_name(name: &str) -> Option<u32> {
    let probe: String = name.chars().take(3).collect::<String>().to_lowercase();
    MONTHS.iter().position(|m| *m == probe).map(|i| i as u32 + 1)
}

/// Parses the first valid date in `text` as YYYY-MM-DD. Returns None when nothing valid exists.
///
/// Accepts, in order: `d-m-yyyy`, `d Month yyyy`, `d/m/yy`.
pub fn parse_date(text: &str) -> Option<String> {
    if text.trim().is_empty() {
        return None;
    }
    let normalized = normalize_digits(text);
    let bytes = normalized.as_bytes();

    let mut i = 0usize;
    while i < bytes.len() {
        if !bytes[i].is_ascii_digit() {
            i += 1;
            continue;
        }
        // Collect the day digits.
        let day_start = i;
        while i < bytes.len() && bytes[i].is_ascii_digit() {
            i += 1;
        }
        let day: u32 = normalized[day_start..i].parse().unwrap_or(0);
        if !(1..=31).contains(&day) {
            continue;
        }

        // Skip separators.
        let mut j = i;
        while j < bytes.len() && !bytes[j].is_ascii_alphanumeric() {
            j += 1;
        }
        if j >= bytes.len() {
            break;
        }

        let (month, after_month) = if bytes[j].is_ascii_digit() {
            let start = j;
            while j < bytes.len() && bytes[j].is_ascii_digit() {
                j += 1;
            }
            (normalized[start..j].parse::<u32>().unwrap_or(0), j)
        } else {
            let start = j;
            while j < bytes.len() && bytes[j].is_ascii_alphabetic() {
                j += 1;
            }
            match month_from_name(&normalized[start..j]) {
                Some(m) => (m, j),
                None => continue,
            }
        };
        if !(1..=12).contains(&month) {
            continue;
        }

        let mut k = after_month;
        while k < bytes.len() && !bytes[k].is_ascii_alphanumeric() {
            k += 1;
        }
        let year_start = k;
        while k < bytes.len() && bytes[k].is_ascii_digit() {
            k += 1;
        }
        let digits = k - year_start;
        if digits < 2 {
            continue;
        }
        let raw_year: i32 = normalized[year_start..k].parse().unwrap_or(0);
        let year = match digits {
            2 => 2000 + raw_year,
            4 => raw_year,
            _ => continue,
        };
        if !(1990..=2100).contains(&year) {
            continue;
        }

        if let Some(date) = NaiveDate::from_ymd_opt(year, month, day) {
            return Some(date.format("%Y-%m-%d").to_string());
        }
        i = k;
    }
    None
}

/// Today's date in the portal's timezone (Asia/Kolkata is UTC+5:30, no DST).
pub fn today() -> NaiveDate {
    let now = Utc::now().naive_utc();
    let ist = now + Duration::minutes(330);
    NaiveDate::from_ymd_opt(ist.year(), ist.month(), ist.day()).unwrap_or_else(|| Utc::now().date_naive())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_formats_seen_on_portals() {
        assert_eq!(parse_date("10-November-2026").as_deref(), Some("2026-11-10"));
        assert_eq!(parse_date("20/11/2026 23:59:00").as_deref(), Some("2026-11-20"));
        assert_eq!(parse_date("20-11-2026").as_deref(), Some("2026-11-20"));
        assert_eq!(parse_date("Last Date: 01-10-2026").as_deref(), Some("2026-10-01"));
        assert_eq!(parse_date("17/11/26").as_deref(), Some("2026-11-17"));
    }

    #[test]
    fn parses_gujarati_and_devanagari_digits() {
        assert_eq!(parse_date("૧૭-૧૧-૨૦૨૬").as_deref(), Some("2026-11-17"));
        assert_eq!(parse_date("१७-११-२०२६").as_deref(), Some("2026-11-17"));
    }

    #[test]
    fn rejects_invalid_dates() {
        assert_eq!(parse_date(""), None);
        assert_eq!(parse_date("no date here"), None);
        assert_eq!(parse_date("31-02-2026"), None);
        assert_eq!(parse_date("45-13-2026"), None);
    }

    #[test]
    fn normalizes_digits_only() {
        assert_eq!(normalize_digits("૧૦-૧૧-૨૦૨૬"), "10-11-2026");
        assert_eq!(normalize_digits("१७/११/२०२६"), "17/11/2026");
        assert_eq!(normalize_digits("10-11-2026"), "10-11-2026");
    }
}
