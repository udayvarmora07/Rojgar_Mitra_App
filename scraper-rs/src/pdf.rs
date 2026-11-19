//! Enrichment from official notification PDFs.
//!
//! FreeJobAlert's article summary often says `As Per the Advertisement` for qualification, and
//! some articles omit the age entirely. The linked GPSC/OJAS/GSSSB PDF states both. Text is
//! extracted with Poppler's `pdftotext -layout`; when the layer is empty — or produces no fact,
//! which is what a legacy Gujarati font looks like — the first pages are rendered and read with
//! Tesseract (`guj+eng`). The daily scrape does not need Poppler or Tesseract; only
//! `--backfill-pdfs` and the monthly enrichment workflow do.

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

/// Google Drive's legacy `/uc?export=download&id=...` endpoint answers 400 to a plain GET.
/// The `usercontent` endpoint serves the same file without the confirmation dance, and
/// `/file/d/<id>/view` links are rewritten to it as well.
fn normalize_notification_url(url: &Url) -> String {
    let host = url.host_str().unwrap_or("").to_lowercase();
    if host != "drive.google.com" && host != "docs.google.com" {
        return url.to_string();
    }
    let from_query = url
        .query_pairs()
        .find(|(key, _)| key == "id")
        .map(|(_, value)| value.into_owned());
    let from_path = url
        .path_segments()
        .and_then(|mut segments| {
            segments
                .position(|segment| segment == "d")
                .and_then(|index| segments.nth(index))
        })
        .map(str::to_string);
    match from_query.or(from_path) {
        Some(id) => {
            format!("https://drive.usercontent.google.com/download?id={id}&export=download")
        }
        None => url.to_string(),
    }
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
        // `scraper` returns `&amp;` undecoded, and joining that string sends a different query
        // to Google Drive (HTTP 400), which is why those notification PDFs were never read.
        let Ok(url) = base_url.join(crate::parse::decode_entities(href).trim()) else {
            continue;
        };
        if !matches!(url.scheme(), "http" | "https") {
            continue;
        }
        let link = normalize_notification_url(&url);
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

/// Text from a notice PDF, with the route that produced it.
pub struct ExtractedText {
    pub text: String,
    /// True when the text came from OCR rather than an embedded text layer.
    pub ocr: bool,
}

/// Runs Poppler over the downloaded bytes, falling back to OCR when there is no text layer.
///
/// Text with a layer is returned as-is. When the layer is empty (a phone-scanned circular, a
/// photocopied annexure) the first three pages are rendered and read with Tesseract, trying
/// `guj+eng` first and `eng` if the Gujarati trained data is absent.
pub fn extract_text(bytes: &[u8]) -> Result<ExtractedText, String> {
    let (work_dir, path) = write_temp_pdf(bytes)?;

    let output = Command::new("pdftotext").arg("-layout").arg(&path).arg("-").output();
    let extracted = match output {
        Ok(result) if result.status.success() => {
            String::from_utf8_lossy(&result.stdout).into_owned()
        }
        Ok(result) => {
            let _ = std::fs::remove_dir_all(&work_dir);
            return Err(format!(
                "pdftotext failed: {}",
                String::from_utf8_lossy(&result.stderr).trim()
            ));
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            let _ = std::fs::remove_dir_all(&work_dir);
            return Err("pdftotext is not installed (install poppler-utils)".to_string());
        }
        Err(err) => {
            let _ = std::fs::remove_dir_all(&work_dir);
            return Err(format!("could not run pdftotext: {err}"));
        }
    };

    let result = if extracted.trim().chars().count() >= 20 {
        Ok(ExtractedText { text: extracted, ocr: false })
    } else {
        ocr_pdf(&path, &work_dir).map(|text| ExtractedText { text, ocr: true })
    };
    let _ = std::fs::remove_dir_all(&work_dir);
    result
}

/// OCRs the first pages even when a text layer exists.
///
/// Legacy Gujarati fonts can produce a text layer that looks like Latin gibberish, so
/// `pdftotext` neither fails nor yields a usable fact. The backfill calls this when the text
/// layer produced no fact at all; Tesseract reads the rendered page instead.
pub fn extract_text_ocr(bytes: &[u8]) -> Result<ExtractedText, String> {
    let (work_dir, path) = write_temp_pdf(bytes)?;
    let result = ocr_pdf(&path, &work_dir).map(|text| ExtractedText { text, ocr: true });
    let _ = std::fs::remove_dir_all(&work_dir);
    result
}

fn write_temp_pdf(bytes: &[u8]) -> Result<(std::path::PathBuf, std::path::PathBuf), String> {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    if !bytes.windows(5).take(2048).any(|window| window == b"%PDF-") {
        return Err("not a PDF".to_string());
    }
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let work_dir = std::env::temp_dir().join(format!("rojgar-{}-{id}", std::process::id()));
    std::fs::create_dir_all(&work_dir)
        .map_err(|err| format!("could not create temp directory: {err}"))?;
    let path = work_dir.join("notice.pdf");
    std::fs::write(&path, bytes).map_err(|err| format!("could not write temp PDF: {err}"))?;
    Ok((work_dir, path))
}

/// Renders up to three pages and OCRs them. Returns an actionable error when the OCR toolchain
/// is not installed, because that is a deployment gap, not a bad notice.
///
/// The page is rendered grayscale at 300 dpi: Tesseract's own guidance is that skew, borders
/// and low resolution are the main accuracy losses, and colour carries no text information.
fn ocr_pdf(path: &std::path::Path, work_dir: &std::path::Path) -> Result<String, String> {
    let probe = Command::new("tesseract").arg("--version").output();
    match probe {
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            return Err(
                "PDF has no usable text layer and tesseract is not installed (install \
                 tesseract-ocr and tesseract-ocr-guj)"
                    .to_string(),
            )
        }
        Err(err) => return Err(format!("could not run tesseract: {err}")),
        Ok(result) if !result.status.success() => {
            return Err(format!(
                "tesseract is unusable: {}",
                String::from_utf8_lossy(&result.stderr).trim()
            ))
        }
        Ok(_) => {}
    }

    let prefix = work_dir.join("page");
    let render = Command::new("pdftoppm")
        .arg("-gray")
        .arg("-r")
        .arg("300")
        .arg("-png")
        .arg("-f")
        .arg("1")
        .arg("-l")
        .arg("3")
        .arg(path)
        .arg(&prefix)
        .output();
    match render {
        Ok(result) if result.status.success() => {}
        Ok(result) => {
            return Err(format!(
                "pdftoppm failed: {}",
                String::from_utf8_lossy(&result.stderr).trim()
            ))
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            return Err("pdftoppm is not installed (install poppler-utils)".to_string())
        }
        Err(err) => return Err(format!("could not run pdftoppm: {err}")),
    }

    let mut pages: Vec<std::path::PathBuf> = std::fs::read_dir(work_dir)
        .map_err(|err| format!("could not list OCR pages: {err}"))?
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|page| page.extension().is_some_and(|extension| extension == "png"))
        .collect();
    pages.sort();

    let mut text = String::new();
    let mut read_any = false;
    for page in pages {
        // Gujarati first: these documents mix Gujarati body text with English headings, and
        // the Gujarati model also recognises the Latin characters.
        let page_text =
            run_tesseract(&page, "guj+eng").or_else(|_| run_tesseract(&page, "eng"));
        if let Ok(page_text) = page_text {
            text.push_str(&page_text);
            text.push('\n');
            read_any = true;
        }
    }
    if !read_any {
        return Err("scanned PDF: OCR could not read any page".to_string());
    }
    if text.trim().chars().count() < 20 {
        return Err("scanned PDF: OCR produced too little text".to_string());
    }
    Ok(text)
}

fn run_tesseract(page: &std::path::Path, languages: &str) -> Result<String, String> {
    let output = Command::new("tesseract")
        .arg(page)
        .arg("stdout")
        .arg("-l")
        .arg(languages)
        .arg("--psm")
        .arg("3")
        .output()
        .map_err(|err| format!("could not run tesseract: {err}"))?;
    if !output.status.success() {
        return Err(format!(
            "tesseract failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// True when a text layer is mostly replacement, private-use or control characters.
///
/// This catches a font whose ToUnicode map is absent; the page looks right but the text is
/// `(cid:nnn)` or private-use glyphs. Legacy ASCII-transliterated Gujarati fonts are not
/// caught here, which is why the backfill also OCRs whenever no fact was found.
pub fn looks_garbled(text: &str) -> bool {
    let chars: Vec<char> = text.chars().filter(|c| !c.is_whitespace()).collect();
    if chars.len() < 40 {
        return false;
    }
    let bad = chars
        .iter()
        .filter(|c| {
            let c = **c;
            c == '\u{FFFD}' || ('\u{E000}'..='\u{F8FF}').contains(&c) || c.is_control()
        })
        .count();
    bad * 10 > chars.len()
}

/// Reads a numeric age range or maximum from a statement such as
/// `18 to 24 Years`, `Not be more than 35 years of age`, or `maximum age limit ... 55 years`.
pub fn parse_age_window(window: &str) -> Option<String> {
    let text = clean(window);
    let range = Regex::new(
        r"(?i)(?:not\s+(?:be\s+)?less\s+than\s+)?(\d{2})\s*(?:years?|yrs?)?[^\d.]{0,90}?(?:and|to|-|–|—)\s*(?:not\s+(?:be\s+)?more\s+than\s+)?(\d{2})\s*(?:years?|yrs?)",
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
        r"(?i)(?:not\s+(?:be\s+)?more\s+than|not\s+above|maximum(?:\s+age)?(?:\s+limit)?(?:\s+up\s+to)?|max\.?|upper\s+age(?:\s+limit)?|up\s+to|under|not\s+exceeding|should\s+not\s+exceed|below)\D{0,60}(\d{2})\s*years?",
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

/// Accepts only a real age statement.
///
/// Some article tables put the last date in the `Age Limit` cell. A bare date parses as a
/// number range (`20 … 2026`), so a value that is a valid date and names no years is rejected
/// before the age regexes run.
pub fn numeric_age(text: &str) -> Option<String> {
    let normalized = crate::dates::normalize_digits(text);
    let mentions_years = Regex::new(r"(?i)years?|yrs?|વર્ષ")
        .expect("static regex")
        .is_match(&normalized);
    if !mentions_years && crate::dates::parse_date(&normalized).is_some() {
        return None;
    }
    parse_age_window(&normalized)
}

/// Article summaries sometimes carry `AGE LIMIT 25 - 58 Years` in the intro instead of a table.
pub fn age_from_html(html: &str) -> Option<String> {
    let text = crate::parse::visible_text(html);
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
        r"(?i)(?:essential\s*/\s*desirable\s+)?(?:essential\s+qualifications?|educational\s+qualifications?|required\s+qualifications?|qualificaitons?|qualifications?)\s*[:\-]?\s*",
    )
    .expect("static regex");
    let found = label.find(text)?;
    let tail = take_chars(&text[found.end()..], 1100);
    let stop = Regex::new(
        r"(?i)(?:essential\s+experience|experience\b|desirable|age\s+limit|age\s*[:\-]|pay\s+scale|remuneration|salary|stipend)",
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

/// Rejects `As Per the Advertisement`, `Other`, document-checklist fragments, JSON-LD FAQ
/// payloads and prose from the selection process. Accepts degree/diploma lists, medical and
/// professional qualifications, experience-based eligibility (deputation posts) and legal
/// enrolment, in English or Gujarati.
///
/// Short acronyms are matched case-sensitively and with word boundaries. A case-insensitive
/// `iti` matched the word "auditing", which validated an income threshold as a qualification;
/// a case-insensitive `be` did the same for the verb.
pub fn valid_qualification(value: &str) -> bool {
    let text = value.trim();
    // `CA` and `CS` are complete qualifications, so the floor is two characters; the patterns
    // below do the real filtering.
    if text.chars().count() < 2 || text.chars().count() > 1200 {
        return false;
    }
    if Regex::new(
        r"(?i)submitting a video|selection process|shortlisted|interview process|eligibility verification|required for eligibility|self[- ]attested|documents? required|photograph|signature|application fee|examination fee|how to apply|acceptedanswer|@type",
    )
    .expect("static regex")
    .is_match(text)
    {
        return false;
    }
    if Regex::new(r"(?i)^(?:as per|other|any)$")
        .expect("static regex")
        .is_match(text)
    {
        return false;
    }

    // A Gujarati qualification statement is accepted as written. The candidate already came
    // from a qualification field or section, and the reader is Gujarati-first.
    let gujarati = text
        .chars()
        .filter(|c| ('\u{0A80}'..='\u{0AFF}').contains(c))
        .count();
    if gujarati >= 3 {
        return true;
    }

    let words = Regex::new(
        r"(?i:degree|bachelor|master|diploma|graduate|graduation|llb|llm|b\.?tech|m\.?tech|b\.?sc|m\.?sc|b\.?com|m\.?com|b\.?a\b|m\.?a\b|ph\.?d|mbbs|bds|mds|\bdnb\b|\bmch\b|b\.?pharm|m\.?pharm|bmlt|dmlt|gnm|anm|b\.?ed|m\.?ed|b\.?lib|m\.?lib|b\.?arch|m\.?arch|\bmba\b|\bpgdm\b|\bmca\b|\bbca\b|chartered|\bicwa\b|\biti\b|\bhsc\b|\bssc\b|12th|10th|standard\s+(?:\d+|ten|twelve)|1[02]\s*pass|any\s+discipline|any\s+graduate|officers?\s+holding|analogous|regular\s+service|advocates?|bar\s+council|enrolled|practi[cs]e\s+law|m\.?f\.?sc|b\.?f\.?sc|m\.?v\.?sc|b\.?v\.?sc)",
    )
    .expect("static regex")
    .is_match(text);
    if words {
        return true;
    }

    // Ambiguous two-letter acronyms: `CA`, `MS`, `BE` are qualifications only when written as
    // acronyms. Matching them case-insensitively turns ordinary words into a requirement.
    Regex::new(
        r"\b(?:CA|CS|MS|MD|DM|BE|ME|B\.E|M\.E|B\.Tech|M\.Tech|MBBS|BDS|MDS|DNB|LLB|LLM|ITI|HSC|SSC)\b",
    )
    .expect("static regex")
    .is_match(text)
}

/// Facts from an official HTML page rather than a PDF.
///
/// OJAS advertisement pages (and some board pages linked as "official notification") state the
/// age and qualification in the page body. The scraper used to read only FreeJobAlert articles,
/// so a live OJAS row stayed empty even though its page said `Age 20 To 35 Years` and
/// `Any Graduate`.
pub fn page_facts(html: &str) -> Facts {
    let text = crate::parse::visible_text(html);
    let facts = Facts {
        post: None,
        age: generic_age(&text),
        pay: generic_pay(&text),
        qualification: generic_qualification(&text),
    };
    Facts {
        post: None,
        age: facts.age,
        pay: facts.pay,
        qualification: facts.qualification.filter(|value| valid_qualification(value)),
    }
}

fn has_gujarati(text: &str) -> bool {
    text.chars().any(|c| ('\u{0A80}'..='\u{0AFF}').contains(&c))
}

/// Reads the Gujarati wording used by GSSSB, GPSC and municipal advertisements.
///
/// Poppler returns these PDFs as real Unicode, but the English-only patterns cannot see
/// `વય મર્યાદા : ૨૦ થી ૩૫ વર્ષ` or `શૈક્ષણિક લાયકાત`. Gujarati digits are normalised first so
/// the age range is stored in the same `20 to 35 years` shape as every other row.
fn gujarati_facts(text: &str) -> Facts {
    let normalized = crate::dates::normalize_digits(text);

    let age = Regex::new(
        r"(?:વય|ઉંમર|વય\s*મર્યાદા)[^\d]{0,80}(\d{2})[^\d]{0,25}(?:થી|to|-|–|—)[^\d]{0,15}(\d{2})",
    )
    .expect("static regex")
    .captures(&normalized)
    .and_then(|caps| {
        let min = caps[1].parse::<i32>().ok()?;
        let max = caps[2].parse::<i32>().ok()?;
        if (14..=70).contains(&min) && (14..=70).contains(&max) && min < max {
            Some(format!("{min} to {max} years"))
        } else {
            None
        }
    })
    .or_else(|| {
        let maximum = Regex::new(r"(?:વય\s*મર્યાદા|ઉંમર)[^\d]{0,60}(\d{2})\s*(?:વર્ષ|years?)")
            .expect("static regex");
        maximum.captures(&normalized).and_then(|caps| {
            let age = caps[1].parse::<i32>().ok()?;
            (14..=70).contains(&age).then(|| format!("Maximum {age} years"))
        })
    });

    let qualification = Regex::new(r"(?:શૈક્ષણિક\s*)?લાયકાત[^\n:：]{0,20}[:：\-]?\s*")
        .expect("static regex")
        .find(&normalized)
        .map(|found| {
            let tail = take_chars(&normalized[found.end()..], 700);
            let stop = Regex::new(r"(?:વય|ઉંમર|પગાર|વેતન|ફી|અનુભવ|જાહેરાત|અરજી)")
                .expect("static regex")
                .find(tail);
            clean(match stop {
                Some(stop) => &tail[..stop.start()],
                None => tail,
            })
        })
        .filter(|value| valid_qualification(value));

    let pay = Regex::new(
        r"(?:પગાર|વેતન|માસિક\s*પગાર)[^\d]{0,60}((?:₹|Rs\.?)?\s*[\d,]{4,}(?:\s*(?:-|થી|to)\s*(?:₹|Rs\.?)?\s*[\d,]{4,})?)",
    )
    .expect("static regex")
    .captures(&normalized)
    .map(|caps| trim_money(&caps[1]));

    Facts { post: None, age, pay, qualification }
}

pub fn extract_facts(text: &str) -> Facts {
    let mut facts = if let Some(facts) = gpsc_facts(text) {
        facts
    } else {
        Facts {
            post: None,
            age: generic_age(text),
            pay: generic_pay(text),
            qualification: generic_qualification(text),
        }
    };

    if has_gujarati(text) {
        let gujarati = gujarati_facts(text);
        if facts.age.is_none() {
            facts.age = gujarati.age;
        }
        if facts.pay.is_none() {
            facts.pay = gujarati.pay;
        }
        if facts.qualification.is_none() {
            facts.qualification = gujarati.qualification;
        }
    }
    facts
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
        assert_eq!(
            parse_age_window("Preferably under 30 years of age at the time of application").as_deref(),
            Some("Maximum 30 years")
        );
        assert_eq!(
            parse_age_window("Under 32 years of age at the time of application").as_deref(),
            Some("Maximum 32 years")
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

    #[test]
    fn accepts_medical_and_professional_qualifications() {
        assert!(valid_qualification("MS/MD, DNB"));
        assert!(valid_qualification("BDS with MDS"));
        assert!(valid_qualification("Any Graduate"));
        assert!(valid_qualification("સ્નાતક અથવા અનુસ્નાતક"));
    }

    #[test]
    fn rejects_a_document_checklist_as_a_qualification() {
        assert!(!valid_qualification("Required for Eligibility Verification"));
        assert!(!valid_qualification("Aadhaar card and self-attested copies"));
    }

    #[test]
    fn rejects_an_income_threshold_as_a_qualification() {
        // `iti` used to match inside "auditing", which made this pass.
        assert!(!valid_qualification(
            "The applicant's gross professional receipts exclusively from professional services like accountancy and auditing must not be less than Rs. 50 lakhs"
        ));
    }

    #[test]
    fn accepts_chartered_accountants_and_fisheries_degrees() {
        assert!(valid_qualification("CA"));
        assert!(valid_qualification("SRF: M.F.Sc. in any Discipline of Fisheries Science."));
    }

    #[test]
    fn rejects_json_ld_fragments() {
        assert!(!valid_qualification(
            r#"is needed for this recruitment?", "acceptedAnswer": { "@type": "Answer", "text": "Officers holding analogous posts"#
        ));
    }

    #[test]
    fn does_not_accept_a_verb_as_an_engineering_degree() {
        assert!(!valid_qualification("Candidates must be below 35 years of age"));
    }

    #[test]
    fn detects_a_garbled_text_layer() {
        assert!(looks_garbled(&"\u{FFFD}".repeat(100)));
        assert!(!looks_garbled("18 to 35 years, Bachelor degree required"));
    }

    #[test]
    fn reads_facts_from_an_official_page_body() {
        let html = r#"
        <table><tr><td>Description / Duties</td></tr></table>
        <p>PayScale 26000/- 40800/- and 49600/- Fix Pay Probation 5 Year
           Age 20 To 35 Years Essential/Desirable Qualificaiton Any Graduate
           Experience(If an</p>"#;
        let facts = page_facts(html);
        assert_eq!(facts.age.as_deref(), Some("20 to 35 years"));
        assert_eq!(facts.qualification.as_deref(), Some("Any Graduate"));
    }

    #[test]
    fn reads_gujarati_age_and_qualification() {
        let text = "જાહેરાત ક્રમાંકઃ ૪૬૮/ર૦૨૬૨૭\nવય મર્યાદા : ૨૦ થી ૩૫ વર્ષ\nશૈક્ષણિક લાયકાત : કોઈ પણ સ્નાતક\nપગાર : ₹ 26,000";
        let facts = extract_facts(text);
        assert_eq!(facts.age.as_deref(), Some("20 to 35 years"));
        let qualification = facts.qualification.unwrap_or_default();
        assert!(qualification.contains("સ્નાતક"), "{qualification}");
    }

    #[test]
    fn rewrites_google_drive_links_without_the_confirmation_dance() {
        let legacy = Url::parse("https://drive.google.com/uc?export=download&id=abc123").unwrap();
        assert_eq!(
            normalize_notification_url(&legacy),
            "https://drive.usercontent.google.com/download?id=abc123&export=download"
        );
        let already_fixed =
            Url::parse("https://drive.usercontent.google.com/download?id=abc123&export=download")
                .unwrap();
        assert_eq!(normalize_notification_url(&already_fixed), already_fixed.to_string());
    }
}
