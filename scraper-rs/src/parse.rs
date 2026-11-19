//! Pure HTML -> rows parsing. No network, so every branch is unit-testable against fixtures.
//!
//! Selectors come from inspecting the live HTML, not from guesses:
//!   OJAS        `a[href*="AdvtDetails"]`, link text `ORG - Post ( અંતિમ તારીખ 10-November-2026 )`
//!   GPSC        `table` whose <th> row has "advt" and "date", cells in a fixed order
//!   FreeJobAlert `table` whose <th> row has "last date" and "board", columns by header name

use scraper::{ElementRef, Html, Selector};

use crate::dates::parse_date;
use crate::Job;

/// Short codes used on OJAS -> full names a rural user can recognise.
const ORGANISATIONS: &[(&str, &str)] = &[
    ("GSSSB", "Gujarat Subordinate Service Selection Board (GSSSB)"),
    ("GPSC", "Gujarat Public Service Commission (GPSC)"),
    ("GPRB", "Gujarat Police Recruitment Board (GPRB)"),
    ("GPSSB", "Gujarat Panchayat Service Selection Board (GPSSB)"),
    ("GSEB", "Gujarat Secondary and Higher Secondary Education Board (GSEB)"),
    ("GHC", "Gujarat High Court"),
    ("SPIPA", "Sardar Patel Institute of Public Administration (SPIPA)"),
    ("AMC", "Ahmedabad Municipal Corporation (AMC)"),
    ("SMC", "Surat Municipal Corporation (SMC)"),
    ("VMC", "Vadodara Municipal Corporation (VMC)"),
    ("RMC", "Rajkot Municipal Corporation (RMC)"),
    ("BMC", "Bhavnagar Municipal Corporation (BMC)"),
    ("JMC", "Jamnagar Municipal Corporation (JMC)"),
    ("GMC", "Gandhinagar Municipal Corporation (GMC)"),
    ("DPA", "Dholera Port Authority"),
    ("GSRTC", "Gujarat State Road Transport Corporation (GSRTC)"),
    ("GMB", "Gujarat Maritime Board (GMB)"),
    ("GIDC", "Gujarat Industrial Development Corporation (GIDC)"),
    ("GWSSB", "Gujarat Water Supply and Sewerage Board (GWSSB)"),
    ("GUVNL", "Gujarat Urja Vikas Nigam Limited (GUVNL)"),
    ("MGVCL", "Madhya Gujarat Vij Company Limited (MGVCL)"),
    ("PGVCL", "Paschim Gujarat Vij Company Limited (PGVCL)"),
    ("UGVCL", "Uttar Gujarat Vij Company Limited (UGVCL)"),
    ("DGVCL", "Dakshin Gujarat Vij Company Limited (DGVCL)"),
    ("GETCO", "Gujarat Energy Transmission Corporation (GETCO)"),
];

/// Decodes the HTML character references that appear in source text.
///
/// `scraper` decodes one layer while parsing, but some FreeJobAlert table cells carry a
/// second layer (`&amp;rsquo;`), and the backfill that first populated `job_details` wrote
/// the raw text. A reader must never see `Bachelor&rsquo;s` where the notice says
/// "Bachelor's". Unknown names are left untouched rather than dropped.
fn decode_entities(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;

    while let Some(amp) = rest.find('&') {
        out.push_str(&rest[..amp]);
        let after = &rest[amp..];
        let decoded = after
            .find(';')
            .filter(|end| *end <= 12)
            .map(|end| (&after[1..end], end))
            .and_then(|(body, end)| {
                let ch = if let Some(hex) = body.strip_prefix("#x").or_else(|| body.strip_prefix("#X")) {
                    u32::from_str_radix(hex, 16).ok().and_then(char::from_u32)
                } else if let Some(num) = body.strip_prefix('#') {
                    num.parse::<u32>().ok().and_then(char::from_u32)
                } else {
                    match body {
                        "amp" => Some('&'),
                        "lt" => Some('<'),
                        "gt" => Some('>'),
                        "quot" => Some('"'),
                        "apos" => Some('\''),
                        "nbsp" => Some(' '),
                        "rsquo" => Some('’'),
                        "lsquo" => Some('‘'),
                        "rdquo" => Some('”'),
                        "ldquo" => Some('“'),
                        "ndash" => Some('–'),
                        "mdash" => Some('—'),
                        "hellip" => Some('…'),
                        "bull" => Some('•'),
                        "middot" => Some('·'),
                        "copy" => Some('©'),
                        "reg" => Some('®'),
                        "trade" => Some('™'),
                        "deg" => Some('°'),
                        _ => None,
                    }
                };
                ch.map(|ch| (ch, end))
            });

        match decoded {
            Some((ch, end)) => {
                out.push(ch);
                rest = &after[end + 1..];
            }
            None => {
                out.push('&');
                rest = &after[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

/// Collapses runs of whitespace, which the portals scatter through their markup.
pub fn clean(text: &str) -> String {
    decode_entities(text)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Maps a short code to a readable name; unknown codes pass through unchanged.
pub fn department(code: &str) -> String {
    let cleaned = clean(code);
    ORGANISATIONS
        .iter()
        .find(|(short, _)| short.eq_ignore_ascii_case(&cleaned))
        .map(|(_, full)| (*full).to_string())
        .unwrap_or(cleaned)
}

pub(crate) fn text_of(el: &ElementRef) -> String {
    clean(&el.text().collect::<Vec<_>>().join(" "))
}

pub(crate) fn absolute(base: &str, href: &str) -> Option<String> {
    url::Url::parse(base)
        .ok()
        .and_then(|b| b.join(href).ok())
        .map(|u| u.to_string())
}

/// `ORG - Post title ( અંતિમ તારીખ 10-November-2026 )`, also tolerating `Last Date`.
fn split_ojas_link(text: &str) -> Option<(String, String, String)> {
    let open = text.rfind('(')?;
    let close = text[open..].find(')').map(|i| open + i)?;
    let inside = &text[open + 1..close];
    let lower = inside.to_lowercase();
    let marker = if lower.contains("અંતિમ") {
        inside.find("અંતિમ").map(|i| i + "અંતિમ".len())
    } else if lower.contains("last date") {
        lower.find("last date").map(|i| i + "last date".len())
    } else {
        None
    }?;
    let date_text = inside[marker..].trim_start_matches([':', ' ', '\u{00a0}']).trim();

    let head = text[..open].trim();
    let (org, title) = head.split_once(" - ")?;
    Some((clean(org), clean(title), date_text.to_string()))
}

/// Current advertisements from the OJAS home page.
pub fn ojas_home(html: &str, base: &str, today: &str) -> Vec<Job> {
    let document = Html::parse_document(html);
    let link_sel = Selector::parse(r#"a[href*="AdvtDetails"]"#).expect("static selector");
    let mut jobs = Vec::new();

    for link in document.select(&link_sel) {
        let text = text_of(&link);
        let Some((org, title, date_text)) = split_ojas_link(&text) else {
            continue;
        };
        let Some(href) = link.value().attr("href") else {
            continue;
        };
        let Some(source_link) = absolute(base, href) else {
            continue;
        };
        jobs.push(Job {
            title: title.chars().take(200).collect(),
            department: department(&org),
            source_link,
            post_date: today.to_string(),
            // Left empty when unparseable: select_insertable rejects rows without a deadline.
            deadline: parse_date(&date_text).unwrap_or_default(),
            salary: None,
            vacancies: None,
            qualification: None,
            advertisement_no: None,
            location: None,
        });
    }
    jobs
}

/// `Job Location | Surat` from a FreeJobAlert article page. Listing rows do not carry a
/// location, so the scraper fetches the article for new rows and reads this table.
pub fn freejobalert_location(html: &str) -> Option<String> {
    freejobalert_field(html, &["job location", "location"])
}

/// The pay stated on a FreeJobAlert article, e.g. `Rs. 67,700 to Rs. 1,18,500`.
///
/// The listing table has no salary column, so this is only available on the article page the
/// scraper already fetches for the location. Both `Pay` and `Salary` are used across articles.
pub fn freejobalert_salary(html: &str) -> Option<String> {
    freejobalert_field(html, &["pay", "salary", "pay scale", "salary details"])
}

/// The age limit stated on a FreeJobAlert article, e.g. `18 to 38 years`.
pub fn freejobalert_age_limit(html: &str) -> Option<String> {
    freejobalert_field(html, &["age limit", "age"])
}

/// The application fee stated on a FreeJobAlert article, e.g. `Rs. 100 for General`.
pub fn freejobalert_fee(html: &str) -> Option<String> {
    freejobalert_field(html, &["application fee", "fee", "examination fee"])
}

/// The qualification stated on a FreeJobAlert article, used to fill `job_details`.
pub fn freejobalert_qualification(html: &str) -> Option<String> {
    freejobalert_field(html, &["qualification", "educational qualification"])
}

/// The per-job "Documents Required" list from a FreeJobAlert article.
///
/// Each item is returned as plain text, newest-first order preserved. The section is
/// normally an `<h2>Documents Required</h2>` followed by a `<ul>`; a few articles render it
/// as `<h3>`. Items are trimmed and capped so one long paragraph cannot become a row.
///
/// This is what fills `public.documents_required`, which had 0 rows for every scraped job:
/// the screens fell back to the generic PRD 5.5 checklist instead of the notice's own list.
pub fn freejobalert_documents(html: &str) -> Vec<String> {
    let document = Html::parse_document(html);
    let heading_sel =
        Selector::parse("h2, h3, h4").expect("static selector");
    let li_sel = Selector::parse("li").expect("static selector");

    for heading in document.select(&heading_sel) {
        let title = text_of(&heading).to_lowercase();
        if !(title.contains("document") || title.contains("certificate")) {
            continue;
        }
        // Walk the siblings that follow the heading until the next heading of the same rank.
        let mut items = Vec::new();
        for sibling in heading
            .parent()
            .map(|p| p.children())
            .into_iter()
            .flatten()
            .skip_while(|n| n.id() != heading.id())
            .skip(1)
        {
            if sibling.value().is_element() {
                let el = ElementRef::wrap(sibling).expect("element");
                let tag = el.value().name();
                if tag == "h2" || tag == "h3" || tag == "h4" {
                    break;
                }
                for li in el.select(&li_sel) {
                    let text = clean(&text_of(&li));
                    if !text.is_empty() && text.len() >= 4 {
                        items.push(text.chars().take(300).collect::<String>());
                    }
                }
                if !items.is_empty() {
                    return items;
                }
            }
        }
    }
    Vec::new()
}

/// Reads the second cell of the table row whose first cell matches one of `labels`.
///
/// Articles render each fact as its own two-cell row, so one helper serves every field.
/// A prefix match is allowed for labels like `Job Location` when the cell carries extra text,
/// but the match is anchored at the start so `Age` cannot match `Language`.
fn freejobalert_field(html: &str, labels: &[&str]) -> Option<String> {
    let document = Html::parse_document(html);
    let tr_sel = Selector::parse("tr").expect("static selector");
    let td_sel = Selector::parse("td").expect("static selector");

    for row in document.select(&tr_sel) {
        let cells: Vec<String> = row.select(&td_sel).map(|td| text_of(&td)).collect();
        if cells.len() < 2 {
            continue;
        }
        let label = cells[0].to_lowercase();
        let matches = labels
            .iter()
            .any(|want| label == *want || label.starts_with(&format!("{want} ")));
        if matches {
            return placeholder_to_none(&cells[1]);
        }
    }
    None
}

/// Open recruitments from GPSC's table: Advt. No. | Description | Total Posts | Last Apply Date.
pub fn gpsc_open(html: &str, base: &str, today: &str) -> Vec<Job> {
    let document = Html::parse_document(html);
    let table_sel = Selector::parse("table").expect("static selector");
    let th_sel = Selector::parse("th").expect("static selector");
    let tr_sel = Selector::parse("tr").expect("static selector");
    let td_sel = Selector::parse("td").expect("static selector");
    let a_sel = Selector::parse("a[href]").expect("static selector");
    let mut jobs = Vec::new();

    for table in document.select(&table_sel) {
        let headers: Vec<String> = table
            .select(&th_sel)
            .map(|th| text_of(&th).to_lowercase())
            .collect();
        if !headers.iter().any(|h| h.contains("advt")) || !headers.iter().any(|h| h.contains("date")) {
            continue;
        }
        let idx_advt = headers.iter().position(|h| h.contains("advt"));
        let idx_desc = headers
            .iter()
            .position(|h| h.contains("desc") || h.contains("title"))
            .or_else(|| idx_advt.map(|i| i + 1));
        let idx_date = headers.iter().position(|h| h.contains("date"));

        for row in table.select(&tr_sel) {
            let cells: Vec<String> = row.select(&td_sel).map(|td| text_of(&td)).collect();
            let (Some(i_advt), Some(i_desc), Some(i_date)) = (idx_advt, idx_desc, idx_date) else {
                continue;
            };
            let needed = [i_advt, i_desc, i_date].into_iter().max().unwrap_or(0);
            if cells.len() <= needed {
                continue;
            }
            let advt_no = &cells[i_advt];
            let title = &cells[i_desc];
            if title.is_empty() {
                continue;
            }

            let source_link = match row.select(&a_sel).next().and_then(|a| a.value().attr("href")) {
                Some(href) => absolute(base, href),
                // A stable unique link is needed for de-duplication even without an anchor.
                None => Some(format!("{base}#advt-{advt_no}")),
            };
            let Some(source_link) = source_link else { continue };

            jobs.push(Job {
                title: if advt_no.is_empty() {
                    title.chars().take(200).collect()
                } else {
                    format!("{title} (Advt. {advt_no})").chars().take(200).collect()
                },
                department: department("GPSC"),
                source_link,
                post_date: today.to_string(),
                deadline: parse_date(&cells[i_date]).unwrap_or_default(),
                salary: None,
                vacancies: None,
                qualification: None,
                advertisement_no: if advt_no.is_empty() { None } else { Some(advt_no.clone()) },
                location: None,
            });
        }
    }
    jobs
}

/// Gujarat rows from the aggregated FreeJobAlert table.
pub fn freejobalert_gujarat(html: &str, base: &str, today: &str) -> Vec<Job> {
    let document = Html::parse_document(html);
    let table_sel = Selector::parse("table").expect("static selector");
    let th_sel = Selector::parse("th").expect("static selector");
    let tr_sel = Selector::parse("tr").expect("static selector");
    let td_sel = Selector::parse("td").expect("static selector");
    let a_sel = Selector::parse("a[href]").expect("static selector");
    let mut jobs = Vec::new();

    for table in document.select(&table_sel) {
        let headers: Vec<String> = table
            .select(&th_sel)
            .map(|th| text_of(&th).to_lowercase())
            .collect();
        // Identify the recruitment table by its distinctive columns.
        if !headers.iter().any(|h| h.contains("last date")) {
            continue;
        }
        if !headers.iter().any(|h| h.contains("board") || h.contains("recruitment")) {
            continue;
        }
        let col = |names: &[&str]| -> Option<usize> {
            headers.iter().position(|h| names.iter().any(|n| h.contains(n)))
        };
        let idx_board = col(&["board"]);
        let idx_post = col(&["post name"]);
        let idx_title = col(&["job title"]);
        let idx_vac = col(&["vacanc"]);
        let idx_qual = col(&["qualification"]);
        let idx_advt = col(&["advt"]);
        let idx_last = col(&["last date"]);
        let (Some(i_board), Some(i_last)) = (idx_board, idx_last) else {
            continue;
        };

        for row in table.select(&tr_sel) {
            let cells: Vec<String> = row.select(&td_sel).map(|td| text_of(&td)).collect();
            let cell = |i: Option<usize>| -> &str {
                i.and_then(|i| cells.get(i)).map(String::as_str).unwrap_or("")
            };
            let board = cell(Some(i_board));
            let post = cell(idx_post);
            let title = cell(idx_title);
            if board.is_empty() || (post.is_empty() && title.is_empty()) {
                continue;
            }
            let Some(href) = row.select(&a_sel).next().and_then(|a| a.value().attr("href")) else {
                continue;
            };
            let Some(source_link) = absolute(base, href) else {
                continue;
            };

            // "Apprentice – 3047 Posts" -> "Apprentice"
            let label = strip_post_count(post);
            let label = if label.is_empty() { title.to_string() } else { label };
            let vacancies = cell(idx_vac)
                .split(|c: char| !c.is_ascii_digit())
                .find(|s| !s.is_empty())
                .and_then(|s| s.parse::<i64>().ok());

            jobs.push(Job {
                title: label.chars().take(200).collect(),
                department: department(board),
                source_link,
                post_date: today.to_string(),
                deadline: parse_date(cell(Some(i_last))).unwrap_or_default(),
                salary: None,
                vacancies,
                qualification: placeholder_to_none(cell(idx_qual)),
                advertisement_no: placeholder_to_none(cell(idx_advt)),
                location: None,
            });
        }
    }
    jobs
}

/// Removes the trailing "– 3047 Posts" that the listing appends to the post name.
fn strip_post_count(text: &str) -> String {
    let lower = text.to_lowercase();
    if let Some(idx) = lower.rfind(" posts") {
        let before = &text[..idx];
        // Only strip when the suffix is "– <digits> Posts".
        let trimmed = before.trim_end();
        let head = trimmed.trim_end_matches(|c: char| c.is_ascii_digit() || c == ',' || c.is_whitespace() || c == '–' || c == '-');
        if trimmed.len() != head.len() {
            return clean(head);
        }
    }
    clean(text)
}

/// The listing uses an en dash for "not applicable"; store nothing instead.
pub(crate) fn placeholder_to_none(text: &str) -> Option<String> {
    let cleaned = clean(text);
    if cleaned.is_empty() || cleaned == "–" || cleaned == "-" || cleaned == "—" {
        None
    } else {
        Some(cleaned.chars().take(200).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TODAY: &str = "2026-11-05";

    const OJAS_HTML: &str = r#"
    <marquee class="ojas-small"><div id="Job_Advt1_rowScrollingNw">
      <a href="AdvtDetails.aspx?sid=K3J&amp;yr=iNS&amp;ano=0Ci">GSSSB - Food Safety Officer ( અંતિમ તારીખ 10-November-2026 )</a>
      <a href="AdvtDetails.aspx?sid=6kB&amp;yr=iNS&amp;ano=9yP">JMC - ગાયનેકોલોજીસ્ટ - 202627 ( અંતિમ તારીખ ૧૭-November-૨૦૨૬ )</a>
      <a href="AdvtDetails.aspx?sid=no-date">Some notice without a date</a>
      <a href="PreRegistration.aspx">Apply</a>
    </div></marquee>"#;

    const GPSC_HTML: &str = r#"
    <table>
      <tr><th>Advt. No.</th><th>Description</th><th>Total Posts</th><th>Last Apply Date</th><th>Apply Online</th></tr>
      <tr><td>41/2026-27</td><td>Lecturer (Selection Scale)</td><td>12</td><td>20/11/2026 23:59:00</td>
          <td><a href="https://gpsc-ojas.gujarat.gov.in/ApplyOnline.aspx?a=41">Apply</a></td></tr>
    </table>"#;

    const FJA_HTML: &str = r#"
    <table>
      <tr><th>Post Date</th><th>Recruitment Board</th><th>Job Title</th><th>Post Name</th>
          <th>Vacancies</th><th>Qualification</th><th>Advt No</th><th>Last Date</th>
          <th>More Information</th></tr>
      <tr><td>06/11/26 06/11/2026</td><td>ONGC</td>
          <td>ONGC Vacancy 2026 - 3047 Apprentice Posts</td>
          <td>Apprentice – 3047 Posts</td><td>3047 Posts</td><td>Diploma, ITI, 12TH, 10TH</td>
          <td>ONGC/APPR/1/2026</td><td>20-11-2026</td>
          <td><a href="https://www.freejobalert.com/articles/ongc-apprentice-recruitment-2026">Get Details</a></td></tr>
      <tr><td>17/11/26 17/11/2026</td><td>JMC</td>
          <td>JMC Vacancy 2026 - Staff Nurse</td>
          <td>Staff Nurse – 31 Posts</td><td>31 Posts</td><td>Graduate</td>
          <td>–</td><td>17-11-2026</td>
          <td><a href="https://www.freejobalert.com/articles/jmc-recruitment-2026">Get Details</a></td></tr>
    </table>
    <table><tr><th>Nothing</th></tr><tr><td>navigation</td></tr></table>"#;

    const FJA_ARTICLE_HTML: &str = r#"
    <table class="fja-table">
      <tr><th>Post Name</th><th>Details</th></tr>
      <tr><td>Job Location</td><td>Surat</td></tr>
      <tr><td>Last Date</td><td>20-11-2026</td></tr>
    </table>
    <div class="widget"><h3>JOBS BY LOCATION</h3><a href="/surat-jobs">Surat jobs</a></div>"#;

    /// The real article shape, verified against a live ESIC Ahmedabad page: each fact is its
    /// own two-cell row, and pay is labelled `Pay` rather than `Salary`.
    const FJA_FULL_ARTICLE: &str = r#"
    <table>
      <tr><td>Walk-in Date</td><td>27 November 2026</td></tr>
      <tr><td>Organisation</td><td>ESIC Medical College Ahmedabad</td></tr>
      <tr><td>Job Location</td><td>Gujarat</td></tr>
      <tr><td>Job Type</td><td>Contract</td></tr>
      <tr><td>Pay</td><td>Rs. 67,700 to Rs. 1,18,500, depending on the post</td></tr>
      <tr><td>Age Limit</td><td>18 to 38 years</td></tr>
      <tr><td>Qualification</td><td>MBBS / MD / MS / DNB</td></tr>
    </table>"#;

    #[test]
    fn ojas_parses_org_title_deadline_and_absolute_link() {
        let jobs = ojas_home(OJAS_HTML, "https://ojas.gujarat.gov.in/", TODAY);
        // The dateless notice and the non-AdvtDetails link are not advertisements.
        assert_eq!(jobs.len(), 2);
        let first = &jobs[0];
        assert_eq!(first.title, "Food Safety Officer");
        assert_eq!(first.department, ORGANISATIONS[0].1);
        assert_eq!(first.deadline, "2026-11-10");
        assert_eq!(
            first.source_link,
            "https://ojas.gujarat.gov.in/AdvtDetails.aspx?sid=K3J&yr=iNS&ano=0Ci"
        );
    }

    #[test]
    fn ojas_keeps_gujarati_titles() {
        let jobs = ojas_home(OJAS_HTML, "https://ojas.gujarat.gov.in/", TODAY);
        assert_eq!(jobs[1].title, "ગાયનેકોલોજીસ્ટ - 202627");
        assert_eq!(jobs[1].deadline, "2026-11-17");
    }

    #[test]
    fn gpsc_parses_table_rows() {
        let jobs = gpsc_open(GPSC_HTML, "https://gpsc.gujarat.gov.in/RecruitmentOpen", TODAY);
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Lecturer (Selection Scale) (Advt. 41/2026-27)");
        assert_eq!(jobs[0].department, ORGANISATIONS[1].1);
        assert_eq!(jobs[0].deadline, "2026-11-20");
    }

    #[test]
    fn gpsc_ignores_tables_without_advertisement_headers() {
        let html = "<table><tr><th>Name</th></tr><tr><td>x</td></tr></table>";
        assert!(gpsc_open(html, "https://gpsc.gujarat.gov.in/", TODAY).is_empty());
    }

    #[test]
    fn freejobalert_extracts_vacancies_and_advertisement_number() {
        let jobs = freejobalert_gujarat(FJA_HTML, "https://www.freejobalert.com/gujarat-government-jobs/", TODAY);
        assert_eq!(jobs.len(), 2);
        let first = &jobs[0];
        assert_eq!(first.title, "Apprentice");
        assert_eq!(first.department, "ONGC");
        assert_eq!(first.deadline, "2026-11-20");
        assert_eq!(first.vacancies, Some(3047));
        assert_eq!(first.qualification.as_deref(), Some("Diploma, ITI, 12TH, 10TH"));
        assert_eq!(first.advertisement_no.as_deref(), Some("ONGC/APPR/1/2026"));
    }

    #[test]
    fn freejobalert_treats_dash_as_missing() {
        let jobs = freejobalert_gujarat(FJA_HTML, "https://www.freejobalert.com/gujarat-government-jobs/", TODAY);
        assert_eq!(jobs[1].advertisement_no, None);
        assert_eq!(jobs[1].vacancies, Some(31));
    }

    #[test]
    fn freejobalert_reads_pay_from_the_article_page() {
        assert_eq!(
            freejobalert_salary(FJA_FULL_ARTICLE).as_deref(),
            Some("Rs. 67,700 to Rs. 1,18,500, depending on the post")
        );
    }

    #[test]
    fn freejobalert_reads_location_and_age_from_the_same_page() {
        assert_eq!(freejobalert_location(FJA_FULL_ARTICLE).as_deref(), Some("Gujarat"));
        assert_eq!(freejobalert_age_limit(FJA_FULL_ARTICLE).as_deref(), Some("18 to 38 years"));
    }

    #[test]
    fn freejobalert_accepts_salary_label_as_well_as_pay() {
        let html = "<table><tr><td>Salary</td><td>Rs. 25,500</td></tr></table>";
        assert_eq!(freejobalert_salary(html).as_deref(), Some("Rs. 25,500"));
    }

    /// A prefix match must be anchored: `Age` cannot match a `Language` row, and a `Pay` row
    /// cannot match `Pay Scale` text from a neighbouring cell.
    #[test]
    fn freejobalert_field_match_is_anchored_at_the_label() {
        let html = "<table><tr><td>Language</td><td>Gujarati</td></tr>\
                    <tr><td>Payment Mode</td><td>Online</td></tr></table>";
        assert_eq!(freejobalert_age_limit(html), None);
        assert_eq!(freejobalert_salary(html), None);
    }

    #[test]
    fn decodes_html_entities_in_notice_text() {
        assert_eq!(
            clean("Bachelor&rsquo;s degree &amp; diploma"),
            "Bachelor’s degree & diploma"
        );
        assert_eq!(clean("A &#39;quoted&#39; word &#x2014; dash"), "A 'quoted' word — dash");
        assert_eq!(clean("Unknown &bogus; stays"), "Unknown &bogus; stays");
        assert_eq!(clean("5 &lt; 10 &gt; 2"), "5 < 10 > 2");
    }

    #[test]
    fn article_qualification_is_read_as_plain_text() {
        let html = "<table><tr><td>Qualification</td>\
                    <td>Bachelor&rsquo;s degree in Fire &amp; Safety</td></tr></table>";
        assert_eq!(
            freejobalert_qualification(html).as_deref(),
            Some("Bachelor’s degree in Fire & Safety")
        );
    }

    #[test]
    fn freejobalert_salary_ignores_a_dash_placeholder() {
        let html = "<table><tr><td>Pay</td><td>–</td></tr></table>";
        assert_eq!(freejobalert_salary(html), None);
    }

    #[test]
    fn location_only_article_still_yields_no_salary() {
        assert_eq!(freejobalert_location(FJA_ARTICLE_HTML).as_deref(), Some("Surat"));
        assert_eq!(freejobalert_salary(FJA_ARTICLE_HTML), None);
    }

    /// The real section shape, verified against a live SMC article: an `h2` followed by a `ul`
    /// of documents, then another heading that must stop the scan.
    const FJA_DOCS_ARTICLE: &str = r#"
    <div class="entry-content">
      <h2>How to Apply Online</h2>
      <ul><li>Open the official website</li></ul>
      <h2>Documents Required</h2>
      <ul>
        <li>Proof of age: birth certificate, school leaving certificate</li>
        <li>Educational qualification: mark sheets and degree certificate</li>
        <li>Experience certificate on the institution's letterhead</li>
      </ul>
      <h2>Application Fee</h2>
      <ul><li>Rs. 100 for General</li></ul>
    </div>"#;

    #[test]
    fn reads_the_documents_required_list() {
        let docs = freejobalert_documents(FJA_DOCS_ARTICLE);
        assert_eq!(docs.len(), 3);
        assert!(docs[0].starts_with("Proof of age"));
        assert!(docs[1].starts_with("Educational qualification"));
    }

    #[test]
    fn stops_the_document_list_at_the_next_heading() {
        // The fee section that follows must not leak into the document list.
        let docs = freejobalert_documents(FJA_DOCS_ARTICLE);
        assert!(!docs.iter().any(|d| d.contains("Rs. 100")));
    }

    #[test]
    fn an_article_without_a_document_section_yields_nothing() {
        assert!(freejobalert_documents(FJA_ARTICLE_HTML).is_empty());
        assert!(freejobalert_documents("<p>no lists here</p>").is_empty());
    }

    #[test]
    fn document_items_are_trimmed_and_capped() {
        let long = "x".repeat(500);
        let html = format!(
            "<div><h2>Documents Required</h2><ul><li>  {long}  </li></ul></div>"
        );
        let docs = freejobalert_documents(&html);
        assert_eq!(docs.len(), 1);
        // A single long paragraph must not become a screen-filling row.
        assert_eq!(docs[0].chars().count(), 300);
    }

    #[test]
    fn freejobalert_ignores_navigation_tables() {
        let html = "<table><tr><th>Nothing</th></tr><tr><td>x</td></tr></table>";
        assert!(freejobalert_gujarat(html, "https://www.freejobalert.com/", TODAY).is_empty());
    }

    #[test]
    fn freejobalert_reads_the_job_location_row_only() {
        assert_eq!(freejobalert_location(FJA_ARTICLE_HTML).as_deref(), Some("Surat"));

        let no_location = "<table><tr><td>Job Location</td><td>–</td></tr></table>";
        assert_eq!(freejobalert_location(no_location), None);
        assert_eq!(freejobalert_location("<p>No table here</p>"), None);
    }

    #[test]
    fn department_maps_known_codes_only() {
        assert_eq!(department("GSSSB"), ORGANISATIONS[0].1);
        assert_eq!(department("  smc "), "Surat Municipal Corporation (SMC)");
        assert_eq!(department("Some University"), "Some University");
    }

    #[test]
    fn splits_ojas_link_on_last_parenthesis() {
        let parsed = split_ojas_link("GSSSB - Post (Group A) ( Last Date 10-November-2026 )");
        assert_eq!(parsed, Some(("GSSSB".into(), "Post (Group A)".into(), "10-November-2026".into())));
        assert_eq!(split_ojas_link("no parenthesis here"), None);
    }

    #[test]
    fn strips_trailing_post_count() {
        assert_eq!(strip_post_count("Staff Nurse – 31 Posts"), "Staff Nurse");
        assert_eq!(strip_post_count("Chief Engineer – 1 Posts"), "Chief Engineer");
        assert_eq!(strip_post_count("No Count Here"), "No Count Here");
    }
}
