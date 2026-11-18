//! Official study-material discovery.
//!
//! The learning-resources table used to have no producer. This module reads pages the
//! boards already publish - GSSSB downloads and GPSSB previous papers - and turns the
//! relevant PDF links into general resources. Parsing is pure and fixture-tested; the
//! caller handles fetching and insertion.
//!
//! Gujarat Police is deliberately not a source: its download page answers a non-browser
//! user agent with a CAPTCHA wall, and bypassing that is not something this scraper does.

use std::collections::HashSet;

use scraper::{Html, Selector};
use serde::Serialize;

use crate::parse::{absolute, clean, text_of};

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Resource {
    pub job_id: Option<String>,
    pub resource_type: String,
    pub link_or_content: String,
    pub title: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub topic: Option<String>,
    pub sort_order: i32,
}

pub struct Source {
    pub url: &'static str,
    pub label: &'static str,
    parser: fn(&str, &str) -> Vec<Resource>,
}

impl Source {
    pub fn parse(&self, html: &str, url: &str) -> Vec<Resource> {
        (self.parser)(html, url)
    }
}

pub fn all() -> Vec<Source> {
    vec![
        Source {
            url: "https://gsssb.gujarat.gov.in/Home/Downloads",
            label: "GSSSB downloads",
            parser: gsssb_downloads,
        },
        Source {
            url: "https://gpssb.gujarat.gov.in/previous-year-question-paper-with-answer.htm",
            label: "GPSSB previous papers",
            parser: gpssb_papers,
        },
    ]
}

fn keyword_match(title: &str, keywords: &[&str]) -> bool {
    let lower = title.to_lowercase();
    keywords.iter().any(|keyword| lower.contains(&keyword.to_lowercase()))
}

fn link_title(value: &scraper::element_ref::ElementRef, fallback: String) -> String {
    value
        .value()
        .attr("title")
        .map(clean)
        .filter(|title| !title.is_empty())
        .unwrap_or(fallback)
}

fn resource(title: String, url: String, description: &str, sort_order: i32) -> Resource {
    Resource {
        job_id: None,
        resource_type: "PDF".to_string(),
        link_or_content: url,
        title: title.chars().take(200).collect(),
        description: Some(description.to_string()),
        language: None,
        topic: None,
        sort_order,
    }
}

/// Rows on GSSSB's download table: number, title, file. Only syllabus/rules/exam rows are
/// study material; answer-key objection forms and certificate templates are not.
pub fn gsssb_downloads(html: &str, base: &str) -> Vec<Resource> {
    const KEYWORDS: &[&str] = &[
        "rules",
        "syllabus",
        "examination",
        "exam",
        "question",
        "paper",
        "અભ્યાસક્રમ",
        "પરીક્ષા",
        "પ્રશ્ન",
        "નિયમ",
    ];

    let document = Html::parse_document(html);
    let tr_sel = Selector::parse("tr").expect("static selector");
    let td_sel = Selector::parse("td").expect("static selector");
    let a_sel = Selector::parse("a[href]").expect("static selector");
    let mut seen = HashSet::new();
    let mut out = Vec::new();

    for row in document.select(&tr_sel) {
        let cells: Vec<_> = row.select(&td_sel).collect();
        if cells.len() < 2 {
            continue;
        }
        let title = text_of(&cells[1]);
        if !keyword_match(&title, KEYWORDS) {
            continue;
        }
        let Some(href) = cells
            .last()
            .and_then(|cell| cell.select(&a_sel).next())
            .and_then(|anchor| anchor.value().attr("href"))
        else {
            continue;
        };
        let Some(url) = absolute(base, href) else { continue };
        if seen.insert(url.clone()) {
            out.push(resource(title, url, "GSSSB official download", 30));
        }
    }
    out
}

/// GPSSB previous-year papers are ordinary PDF links on one page; the link text or title
/// attribute names the paper.
pub fn gpssb_papers(html: &str, base: &str) -> Vec<Resource> {
    const KEYWORDS: &[&str] = &[
        "paper",
        "question",
        "answer",
        "syllabus",
        "પ્રશ્ન",
        "જવાબ",
        "પેપર",
        "અભ્યાસક્રમ",
    ];

    let document = Html::parse_document(html);
    let a_sel = Selector::parse("a[href]").expect("static selector");
    let mut seen = HashSet::new();
    let mut out = Vec::new();

    for anchor in document.select(&a_sel) {
        let Some(href) = anchor.value().attr("href") else {
            continue;
        };
        let lower = href.to_lowercase();
        if !(lower.contains(".pdf") || lower.contains("writereaddata")) {
            continue;
        }
        let Some(url) = absolute(base, href) else { continue };
        let title = link_title(&anchor, text_of(&anchor));
        if title.is_empty() || !keyword_match(&title, KEYWORDS) {
            continue;
        }
        if seen.insert(url.clone()) {
            out.push(resource(title, url, "GPSSB official paper", 50));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gsssb_keeps_rules_but_not_forms() {
        let html = r#"
        <table>
          <tr><td>1</td><td>Provisional answer key objection format</td>
              <td><a class="pdfIcon" href="/ViewFile?fileName=form">PDF</a></td></tr>
          <tr><td>4</td><td>Gujarat Subordinate Services Class III CCE Rules, 2023</td>
              <td><a class="pdfIcon" href="/ViewFile?fileName=rules">PDF</a></td></tr>
        </table>"#;
        let out = gsssb_downloads(html, "https://gsssb.gujarat.gov.in/Home/Downloads");
        assert_eq!(out.len(), 1);
        assert!(out[0].title.contains("Rules"));
        assert_eq!(
            out[0].link_or_content,
            "https://gsssb.gujarat.gov.in/ViewFile?fileName=rules"
        );
        assert_eq!(out[0].resource_type, "PDF");
    }

    #[test]
    fn gpssb_keeps_paper_links_only() {
        let html = r#"
        <a href="download.htm">Download</a>
        <a href="/writereaddata/paper-2024.pdf" title="Talati previous question paper 2024">PDF</a>
        "#;
        let out = gpssb_papers(html, "https://gpssb.gujarat.gov.in/");
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].sort_order, 50);
        assert!(out[0].link_or_content.ends_with("paper-2024.pdf"));
    }
}
