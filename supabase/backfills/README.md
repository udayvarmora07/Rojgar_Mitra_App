# Data backfills

One-off data corrections that are too specific for a schema migration. Each file is idempotent
and records the exact rows written, so the hosted project can be audited or rebuilt.

| File | What it does |
|---|---|
| `2026-11-19-pdf-facts.sql` | Fills 14 missing salaries and inserts 15 eligibility rows extracted from official notification PDFs. |

The durable extraction path is `cd scraper-rs && cargo run --release -- --backfill-pdfs`, run
monthly by the `PDF Enrichment` workflow. This SQL is the validated snapshot of the first pass,
not a replacement for that command.
