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

/// Collapses runs of whitespace, which the portals scatter through their markup.
pub fn clean(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
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

fn text_of(el: &ElementRef) -> String {
    clean(&el.text().collect::<Vec<_>>().join(" "))
}

fn absolute(base: &str, href: &str) -> Option<String> {
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
        });
    }
    jobs
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
fn placeholder_to_none(text: &str) -> Option<String> {
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
    fn freejobalert_ignores_navigation_tables() {
        let html = "<table><tr><th>Nothing</th></tr><tr><td>x</td></tr></table>";
        assert!(freejobalert_gujarat(html, "https://www.freejobalert.com/", TODAY).is_empty());
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
