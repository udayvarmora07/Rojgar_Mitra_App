//! Enrichment from official notification PDFs.
//!
//! FreeJobAlert's article summary often says `As Per the Advertisement` for qualification, and
//! some articles omit the age entirely. The linked GPSC/OJAS/GSSSB PDF states both. Text is
//! extracted with Poppler's `pdftotext -layout`; it is mature, available on Ubuntu, and handles
//! these table-heavy PDFs far better than a pure-Rust extractor. The daily scrape does not need
//! Poppler — only `--backfill-pdfs` and the monthly enrichment workflow do.

use std::collections::HashMap;
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};

use regex::Regex;
use scraper::{ElementRef, Html, Selector};
use url::Url;

#[derive(Debug, Default, Clone, PartialEq)]
pub struct Facts {
    pub post: Option<String>,
    pub age: Option<String>,
    pub pay: Option<String>,
    pub qualification: Option<String>,
}

impl Facts {
    pub fn is_empty(&self) -> bool {
        self.age.is_none() && self.pay.is_none() && self.qualification.is_none()
    }
}

pub fn clean(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// A safe prefix of at most `count` characters (never splits a UTF-8 boundary).
fn take_chars(text: &str, count: usize) -> &str {
    match text.char_indices().nth(count) {
        Some((index, _)) => &text[..index],
        None => text,
    }
}

/// A safe suffix of at most `count` characters.
fn take_last_chars(text: &str, count: usize) -> &str {
    let total = text.chars().count();
    if total <= count {
        return text;
    }
    let skip = total - count;
    match text.char_indices().nth(skip) {
        Some((index, _)) => &text[index..],
        None => text,
    }
}

fn trim_money(value: &str) -> String {
    let trimmed = value.trim().trim_end_matches([')', '.', ';', ',']);
    take_chars(trimmed, 300).to_string()
}

/// Ordered candidates for the notice's official PDF. Root-relative links are resolved, which
/// is what GPSC's `Important Links` table uses. Generic "Online Application"/FAQ documents are
/// heavily penalised; `advt_no` boosts the advertisement matching the notice's advt number.
pub fn notification_pdfs(html: &str, base: &str, advt_no: Option<&str>) -> Vec<String> {
    const BAD_URL: &[&str] = &[
        "freejobalert.com", "online-application", "faq", "reservation", "otr",
        "call-letter", "exam-center", "answer-key", "syllabus", "instruction",
        "application-form", "format", "admit-card", "result", "previous", "rules",
    ];
    const BAD_TEXT: &[&str] = &[
        "online application", "faq", "one time registration", "otr", "reservation",
        "call letter", "exam center", "answer key", "syllabus", "instruction",
        "application form", "admit card", "result", "previous", "question paper",
        "recruitment rules", "rules -", "home",
    ];

    let document = Html::parse_document(html);
    let Ok(anchor_sel) = Selector::parse("a[href]") else {
        return Vec::new();
    };
    let Ok(base_url) = Url::parse(base) else {
        return Vec::new();
    };
    let notice_re = Regex::new(
        r"(?i)detailed advertisement|advertisement\s*[-–]\s*\d+|official notification|notification pdf|advertisement",
    )
    .expect("static regex");
    let advt_re = Regex::new(r"(?i)advertisement\s*[-–]\s*\d+").expect("static regex");
    let mut best: HashMap<String, i32> = HashMap::new();

    for anchor in document.select(&anchor_sel) {
        let Some(href) = anchor.value().attr("href") else {
            continue;
        };
        let Ok(url) = base_url.join(href.trim()) else {
            continue;
        };
        if !matches!(url.scheme(), "http" | "https") {
            continue;
        }
        let link = url.to_string();
        let lower = link.to_lowercase();
        let text = clean(&anchor.text().collect::<Vec<_>>().join(" "));
        let text_lower = text.to_lowercase();

        // Walk up to the nearest table row / list item / paragraph so "Click here" next to
        // "Official Notification" still carries the label.
        let mut context = text_lower.clone();
        let mut node = anchor.parent();
        while let Some(current) = node {
            if let Some(element) = ElementRef::wrap(current) {
                let name = element.value().name();
                if matches!(name, "tr" | "li" | "p") {
                    context = format!(
                        "{text_lower} {}",
                        clean(&element.text().collect::<Vec<_>>().join(" ")).to_lowercase()
                    );
                    break;
                }
                if matches!(name, "table" | "body") {
                    break;
                }
            }
            node = current.parent();
        }

        let is_pdf = lower.split('?').next().is_some_and(|path| path.ends_with(".pdf"))
            || lower.contains("viewfile")
            || lower.contains("writereaddata");
        let is_notice = notice_re.is_match(&context);
        if !(is_pdf || is_notice) {
            continue;
        }

        let mut score = 0i32;
        if BAD_URL.iter().any(|bad| lower.contains(bad))
            || BAD_TEXT.iter().any(|bad| text_lower.contains(bad))
        {
            score -= 20;
        }
        if context.contains("detailed advertisement") {
            score += 12;
        }
        if advt_re.is_match(&context) {
            score += 10;
        }
        if context.contains("official notification") || context.contains("notification pdf") {
            score += 8;
        }
        if lower.contains("advertismentdocument/da-") || lower.contains("advertismentdocument/") {
            score += 7;
        }
        if ["advertis", "advt", "recruitment", "notification"]
            .iter()
            .any(|needle| lower.contains(needle))
        {
            score += 4;
        }
        if is_pdf {
            score += 3;
        }
        if text_lower.starts_with("official") {
            score += 2;
        }
        if let Some(number) = advt_no {
            if lower.contains(&format!("da-{number}-"))
                || context.contains(&format!("advertisement - {number}/"))
            {
                score += 15;
            }
        }
        if score <= 0 {
            continue;
        }
        let entry = best.entry(link).or_insert(score);
        if score > *entry {
            *entry = score;
        }
    }

    let mut ranked: Vec<(String, i32)> = best.into_iter().collect();
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    ranked.into_iter().take(3).map(|(url, _)| url).collect()
}

/// Extracts the advertisement's `Advt. 65/2026-27` number from a notice title.
pub fn advt_number(title: &str) -> Option<String> {
    Regex::new(r"Advt\.?\s*(\d+)\s*/")
        .expect("static regex")
        .captures(title)
        .map(|caps| caps[1].to_string())
}

/// Runs Poppler over the downloaded bytes. Returns a clear error for a scanned PDF or a
/// missing `pdftotext`, so the caller can move on without guessing.
pub fn extract_text(bytes: &[u8]) -> Result<String, String> {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    if !bytes.windows(5).take(2048).any(|window| window == b"%PDF-") {
        return Err("not a PDF".to_string());
    }
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("rojgar-{}-{id}.pdf", std::process::id()));
    std::fs::write(&path, bytes).map_err(|err| format!("could not write temp PDF: {err}"))?;
    let output = Command::new("pdftotext")
        .arg("-layout")
        .arg(&path)
        .arg("-")
        .output();
    let _ = std::fs::remove_file(&path);
    match output {
        Ok(result) if result.status.success() => {
            let text = String::from_utf8_lossy(&result.stdout).into_owned();
            if text.trim().chars().count() < 20 {
                return Err("PDF has no text layer (scanned image?)".to_string());
            }
            Ok(text)
        }
        Ok(result) => Err(format!(
            "pdftotext failed: {}",
            String::from_utf8_lossy(&result.stderr).trim()
        )),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            Err("pdftotext is not installed (install poppler-utils)".to_string())
        }
        Err(err) => Err(format!("could not run pdftotext: {err}")),
    }
}

/// Reads a numeric age range or maximum from a statement such as
/// `18 to 24 Years`, `Not be more than 35 years of age`, or `maximum age limit ... 55 years`.
pub fn parse_age_window(window: &str) -> Option<String> {
    let text = clean(window);
    let range = Regex::new(
        r"(?i)(?:not\s+(?:be\s+)?less\s+than\s+)?(\d{2})\s*(?:years?|yrs?)?[^.]{0,90}?(?:and|to|-|–|—)\s*(?:not\s+(?:be\s+)?more\s+than\s+)?(\d{2})\s*(?:years?|yrs?)",
    )
    .expect("static regex");
    if let Some(caps) = range.captures(&text) {
        if let (Ok(min), Ok(max)) = (caps[1].parse::<i32>(), caps[2].parse::<i32>()) {
            if (14..=70).contains(&min) && (14..=70).contains(&max) && min < max {
                return Some(format!("{min} to {max} years"));
            }
        }
    }
    let maximum = Regex::new(
        r"(?i)(?:not\s+(?:be\s+)?more\s+than|maximum(?:\s+age)?(?:\s+limit)?(?:\s+up\s+to)?|max\.?|upper\s+age(?:\s+limit)?|up\s+to|not\s+exceeding|should\s+not\s+exceed|below)\D{0,60}(\d{2})\s*years?",
    )
    .expect("static regex");
    if let Some(caps) = maximum.captures(&text) {
        if let Ok(age) = caps[1].parse::<i32>() {
            if (14..=70).contains(&age) {
                return Some(format!("Maximum {age} years"));
            }
        }
    }
    let minimum = Regex::new(
        r"(?i)(?:not\s+(?:be\s+)?less\s+than|minimum(?:\s+age)?|min\.?|at\s+least)\D{0,40}(\d{2})\s*years?",
    )
    .expect("static regex");
    if let Some(caps) = minimum.captures(&text) {
        if let Ok(age) = caps[1].parse::<i32>() {
            if (14..=70).contains(&age) {
                return Some(format!("Minimum {age} years"));
            }
        }
    }
    None
}

pub fn numeric_age(text: &str) -> Option<String> {
    parse_age_window(text)
}

/// Article summaries sometimes carry `AGE LIMIT 25 - 58 Years` in the intro instead of a table.
pub fn age_from_html(html: &str) -> Option<String> {
    let document = Html::parse_document(html);
    let text = clean(&document.root_element().text().collect::<Vec<_>>().join(" "));
    let pattern = Regex::new(
        r"(?i)age\s+limit\s*[:\-]?\s*(\d{2})\s*(?:-|to|–|—)\s*(\d{2})\s*(?:years?|yrs?)",
    )
    .expect("static regex");
    let caps = pattern.captures(&text)?;
    let min: i32 = caps[1].parse().ok()?;
    let max: i32 = caps[2].parse().ok()?;
    if (14..=70).contains(&min) && (14..=70).contains(&max) && min < max {
        Some(format!("{min} to {max} years"))
    } else {
        None
    }
}

fn gpsc_facts(text: &str) -> Option<Facts> {
    let start = text.find("[3] Name of Posts")?;
    let end = text[start..]
        .find("[4] Age Relaxation")
        .map(|offset| start + offset)
        .unwrap_or_else(|| (start + 8000).min(text.len()));
    let section = &text[start..end];

    let post = Regex::new(r"Name of Post:\s*([^\n]+)")
        .expect("static regex")
        .captures(section)
        .map(|caps| clean(&caps[1]));
    let qs = section.find("Name of Post:")?;
    let age_start = Regex::new(
        r"(?i)(?:Not\s+be\s+(?:less|more)\s+than|Maximum\s+up\s+to\s+\d{2}\s*years|Not\s+more\s+than|Age\s+Limit\s*[:\-]|Minimum\s+Age|Age\s*[:\-])",
    )
    .expect("static regex")
    .find(&section[qs..])
    .map(|found| qs + found.start())?;

    let before = take_last_chars(&section[..age_start], 160);
    let after = take_chars(&section[age_start..], 340);
    let age = parse_age_window(&format!("{before}{after}"));

    let raw_qual = &section[qs..age_start];
    let without_post = Regex::new(r"Name of Post:[^\n]*")
        .expect("static regex")
        .replace_all(raw_qual, " ");
    let without_labels = Regex::new(r"(?i)\b(?:Education|Qualification)\b")
        .expect("static regex")
        .replace_all(&without_post, " ");
    let without_verb = Regex::new(r"(?is)^.*?possesses\s*:?-?")
        .expect("static regex")
        .replace(&without_labels, " ");
    let qualification = clean(&without_verb);
    let qualification = if qualification.chars().count() > 10 {
        Some(qualification.chars().take(750).collect())
    } else {
        None
    };

    Some(Facts { post, age, pay: pay_in_section(section), qualification })
}

fn pay_in_section(text: &str) -> Option<String> {
    let label = Regex::new(r"(?i)(?:pay\s*scale|payscale|remuneration|salary)")
        .expect("static regex");
    let money = Regex::new(
        r"(?i)(?:Rs\.?|₹|INR)\s*[\d,]{4,}(?:\s*(?:-|to)\s*(?:Rs\.?|₹|INR)?\s*[\d,]{4,})?[^\n]{0,80}",
    )
    .expect("static regex");
    for found in label.find_iter(text) {
        let window = take_chars(&text[found.start()..], 300);
        if let Some(value) = money.find(window) {
            return Some(trim_money(value.as_str()));
        }
    }
    let header = Regex::new(
        r"(?i)(?:7th\s*CPC|Pay\s*Level|Level\s+\d+)[\s\S]{0,200}?((?:₹|Rs\.?)\s*[\d,]{4,}(?:\s*(?:-|to)\s*(?:₹|Rs\.?)?\s*[\d,]{4,})?)",
    )
    .expect("static regex");
    header.captures(text).map(|caps| trim_money(&caps[1]))
}

fn generic_age(text: &str) -> Option<String> {
    let marker = Regex::new(r"(?i)\bage\b|years?\s+of\s+age").expect("static regex");
    let year_word = Regex::new(r"(?i)years?|yrs?").expect("static regex");
    for found in marker.find_iter(text) {
        let before = take_last_chars(&text[..found.start()], 120);
        let after = take_chars(&text[found.start()..], 460);
        let window = format!("{before}{after}");
        if clean(take_chars(&window, 260)).to_lowercase().contains("relaxation") {
            continue;
        }
        if !year_word.is_match(&window) {
            continue;
        }
        if let Some(age) = parse_age_window(&window) {
            return Some(age);
        }
    }
    None
}

fn generic_pay(text: &str) -> Option<String> {
    let label = Regex::new(
        r"(?i)(?:pay\s*(?:scale|matrix|level|band)?|payscale|remuneration|salary|stipend|consolidated(?:\s+pay)?|honorarium|fellowship)",
    )
    .expect("static regex");
    let money = Regex::new(
        r"(?i)(?:Rs\.?|₹|INR)\s*[\d,]{4,}(?:\s*(?:-|to)\s*(?:Rs\.?|₹|INR)?\s*[\d,]{4,})?[^\n]{0,80}",
    )
    .expect("static regex");
    for found in label.find_iter(text) {
        let window = take_chars(&text[found.start()..], 300);
        let head = clean(take_chars(window, 120)).to_lowercase();
        if head.contains("application fee") || head.contains("examination fee") || head.contains("exam fee") {
            continue;
        }
        if let Some(value) = money.find(window) {
            return Some(trim_money(value.as_str()));
        }
    }
    let header = Regex::new(
        r"(?i)(?:7th\s*CPC|Pay\s*Level|Level\s+\d+)[\s\S]{0,200}?((?:₹|Rs\.?)\s*[\d,]{4,}(?:\s*(?:-|to)\s*(?:₹|Rs\.?)?\s*[\d,]{4,})?)",
    )
    .expect("static regex");
    header.captures(text).map(|caps| trim_money(&caps[1]))
}

fn generic_qualification(text: &str) -> Option<String> {
    // "Qualification & Experience:" is common in deputation ads; the word "Experience" must
    // not cut the qualification off at once.
    let combined = Regex::new(
        r"(?i)(?:Essential\s+)?Qualification\s*(?:&|and)\s*Experience\s*[:\-]\s*",
    )
    .expect("static regex");
    if let Some(found) = combined.find(text) {
        let tail = take_chars(&text[found.end()..], 1200);
        let stop = Regex::new(r"(?i)Age\s*[:\-]|Desirable|Important\s+Instructions|Note\s*[:\-]")
            .expect("static regex")
            .find(tail);
        let value = clean(match stop {
            Some(stop) => &tail[..stop.start()],
            None => tail,
        });
        if value.chars().count() > 4 {
            return Some(value.chars().take(750).collect());
        }
    }

    let possess = Regex::new(r"(?i)\(b\)\s*Possess\s*[:\-]\s*").expect("static regex");
    if let Some(found) = possess.find(text) {
        let tail = take_chars(&text[found.start()..], 1200);
        let stop = Regex::new(r"(?i)Desirable|Age\s*[:\-]|Age\s+Limit|Experience\s*[:\-]|Note\s*[:\-]")
            .expect("static regex")
            .find(&tail[10..]);
        let value = clean(match stop {
            Some(stop) => &tail[..10 + stop.start()],
            None => tail,
        });
        if value.chars().count() > 4 {
            return Some(value.chars().take(750).collect());
        }
    }

    let applicants = Regex::new(r"(?i)Applicants?\s+must\s+have\s+(?:passed|completed)[^.]{5,400}\.")
        .expect("static regex");
    if let Some(found) = applicants.find(text) {
        let value = clean(found.as_str());
        if value.chars().count() > 4 {
            return Some(value.chars().take(750).collect());
        }
    }

    let label = Regex::new(
        r"(?i)(?:essential\s+qualifications?|educational\s+qualifications?|required\s+qualifications?|qualifications?)\s*[:\-]?\s*",
    )
    .expect("static regex");
    let found = label.find(text)?;
    let tail = take_chars(&text[found.end()..], 1100);
    let stop = Regex::new(
        r"(?i)(?:essential\s+experience|experience\s*[:\-]|desirable|age\s+limit|age\s*[:\-]|pay\s+scale|remuneration|salary|stipend)",
    )
    .expect("static regex")
    .find(tail);
    let value = clean(match stop {
        Some(stop) => &tail[..stop.start()],
        None => tail,
    });
    if value.chars().count() > 4 {
        Some(value.chars().take(750).collect())
    } else {
        None
    }
}

/// Rejects `As Per the Advertisement`, `Other`, and prose from the selection process. Accepts
/// degree/diploma lists and experience-based eligibility (deputation posts).
pub fn valid_qualification(value: &str) -> bool {
    let text = value.trim();
    if text.chars().count() < 4 {
        return false;
    }
    if Regex::new(r"(?i)submitting a video|selection process|shortlisted|interview process")
        .expect("static regex")
        .is_match(text)
    {
        return false;
    }
    Regex::new(
        r"(?i)degree|bachelor|master|diploma|graduate|graduation|llb|b\.?e\b|b\.?tech|m\.?sc|ph\.?d|mbbs|chartered|\bca\b|iti|12th|10th|any\s+discipline|officers?\s+holding|analogous|regular\s+service",
    )
    .expect("static regex")
    .is_match(text)
}

pub fn extract_facts(text: &str) -> Facts {
    if let Some(facts) = gpsc_facts(text) {
        return facts;
    }
    Facts {
        post: None,
        age: generic_age(text),
        pay: generic_pay(text),
        qualification: generic_qualification(text),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefers_the_detailed_advertisement_over_a_faq() {
        let html = r#"
          <table>
            <tr><td><a href="/Documents/Online-Application.pdf">Online Application</a></td></tr>
            <tr><td><a href="/Documents/AdvertismentDocument/DA-65-202627.pdf">Advertisement - 65/2026-27 Detailed Advertisement - DA-65</a></td></tr>
            <tr><td><a href="https://www.freejobalert.com/">Home</a></td></tr>
          </table>"#;
        let urls = notification_pdfs(html, "https://gpsc.gujarat.gov.in/Recruitment", Some("65"));
        assert_eq!(urls.len(), 1, "{urls:?}");
        assert!(urls[0].ends_with("DA-65-202627.pdf"), "{urls:?}");
    }

    #[test]
    fn resolves_root_relative_advertisement_links() {
        let html = r#"<a href="/Documents/AdvertismentDocument/DA-60-2026-27.pdf">Advertisement - 60/2026-27 Detailed Advertisement</a>"#;
        let urls = notification_pdfs(html, "https://gpsc.gujarat.gov.in/x", Some("60"));
        assert_eq!(urls, vec!["https://gpsc.gujarat.gov.in/Documents/AdvertismentDocument/DA-60-2026-27.pdf"]);
    }

    #[test]
    fn parses_a_range_without_the_first_years_word() {
        assert_eq!(parse_age_window("Age Limit 18 to 24 Years").as_deref(), Some("18 to 24 years"));
        assert_eq!(parse_age_window("Age Limit 25 - 58 Years").as_deref(), Some("25 to 58 years"));
    }

    #[test]
    fn parses_a_maximum_with_a_long_gap() {
        assert_eq!(
            parse_age_window("Age: The maximum age limit to apply for the post shall be 55 years.").as_deref(),
            Some("Maximum 55 years")
        );
    }

    #[test]
    fn reads_the_gpsc_section() {
        let text = r#"
[3] Name of Posts, Education Qualification, Experience, Age and Pay Scale Details:
Advt. No.- 65/2026-27
Name of Post: Assistant Engineer (Electrical), Class-II
a. Possess Bachelor's degree in Engineering (Electrical).
Not be less than 18 years and not more than 35 years of age. Age
Pay Scale Pay scale Rs. 44900-142400/-, Level-8.
[4] Age Relaxation:
5 years (Maximum up to 45 Years)
"#;
        let facts = extract_facts(text);
        assert_eq!(facts.post.as_deref(), Some("Assistant Engineer (Electrical), Class-II"));
        assert_eq!(facts.age.as_deref(), Some("18 to 35 years"));
        assert_eq!(facts.pay.as_deref(), Some("Rs. 44900-142400/-, Level-8"));
        assert!(facts.qualification.unwrap_or_default().contains("Bachelor"));
    }

    #[test]
    fn reads_a_possess_qualification() {
        let text = "(b) Possess: (i) a Master's Degree in Chemistry; or (ii) a degree in Food Technology. Desirable: experience.";
        let facts = extract_facts(text);
        let qualification = facts.qualification.unwrap_or_default();
        assert!(qualification.contains("Master's Degree"), "{qualification}");
        assert!(valid_qualification(&qualification));
    }

    #[test]
    fn accepts_experience_based_deputation_eligibility() {
        let text = "Essential Qualification & Experience: Officers holding analogous positions on regular basis in Pay Level 12. Age: The maximum age limit to apply for the post shall be 55 years.";
        let facts = extract_facts(text);
        assert_eq!(facts.age.as_deref(), Some("Maximum 55 years"));
        assert!(valid_qualification(facts.qualification.as_deref().unwrap_or_default()));
    }

    #[test]
    fn reads_an_applicant_eligibility_sentence() {
        let text = "Applicants must have passed the SSC, HSC and graduation examinations with a minimum of 60% marks each.";
        let facts = extract_facts(text);
        assert!(facts.qualification.unwrap_or_default().contains("graduation"));
    }

    #[test]
    fn rejects_placeholders() {
        assert!(!valid_qualification("As Per the Advertisement"));
        assert!(!valid_qualification("Other"));
    }
}
