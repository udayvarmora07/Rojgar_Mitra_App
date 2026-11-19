# Rojgar Mitra

A Gujarat government-jobs app for farmers and rural youth with low technical literacy. It
turns each official advertisement into a notice a reader can act on: what the post is, who may
apply, when it closes, which documents are needed, and whether they have applied.

Read `PRODUCT.md` for the audience and product truth, `DESIGN.md` for the visual system,
`PRD.md` for requirements, `HANDOFF.md` for current state, and `I18N.md` for the localization
contract.

---

## What is in the product

- **Notice ledger** — live advertisements from OJAS, GPSC and FreeJobAlert, sorted by last date,
  with the deadline, minimum education level, vacancies, pay and location on the card.
- **Eligibility from stored facts** — the notice's own age limit and qualification are shown
  beside the yes/no question that asks about them. Nothing is invented when the source is silent.
- **Application guide** — the official OJAS order, including the trap that a One-Time
  Registration is not an application, and the exact photo/signature upload limits.
- **Local application tracking** — mark a notice applied, keep the confirmation number, and see
  your own list after the deadline passes.
- **Per-notice deadline reminders** — one local notification at 09:00 three days before the last
  date (with a next-morning fallback), listed and removable from Settings. Tapping it opens the
  notice.
- **Two-phase document checklist** — applying and exam day, with one local reminder at 09:00
  while items are pending.
- **Practice tests** — six topics in English, Gujarati and Hindi. The stored pool is read first,
  AI generation second, cache third, an offline bank last.
- **Study material** — practice links, official PDFs, videos and official websites.
- **Offline-first reads** — the job list, every notice you have opened, and study material are
  cached on the device; the app says when the copy on screen was last checked.
- **Share a notice** — native share sheet, or a copied message on the web, carrying only facts
  already on the notice.
- **Official PDF enrichment** — when an article says `As Per the Advertisement` or omits the
  age, the linked GPSC/OJAS/GSSSB PDF is read for the qualification and age. The extraction
  never invents a fact; a scanned or silent PDF leaves the gap open.

The interface is deliberately plain: a navy masthead, dated stubs, rectangular status stamps,
ruled fields, mono numerals for measurements, no gradients, no shadows, no decorative motion.

---

## Screens

Captured at 390×844 from the running app and from the Android emulator, in
`design/references/`:

| Screen | File |
|---|---|
| Home | `app-home-redesign.png` |
| Jobs | `app-jobs-redesign.png` |
| Job detail | `app-detail-redesign.png` |
| Practice | `app-practice-redesign.png` |
| Test | `app-test-redesign.png` |
| Results | `app-results-redesign.png` |
| Documents | `app-documents-redesign.png` |
| Settings | `app-settings-redesign.png` |
| Application guide (native) | `app-guide-native.png` |
| Home (Gujarati QA) | `app-home-gu-qa.png` |
| Job detail (Gujarati QA) | `app-detail-gu-qa.png` |
| Deadline reminders (Gujarati QA) | `app-reminders-gu-qa.png` |
| Backfilled PDF facts (GPSC) | `app-detail-pdf-facts.png` |

---

## Data coverage

Measured against the hosted project on 19 Nov 2026, across 87 live notices:

| Fact | Before | Now |
|---|---|---|
| Eligibility row | 40 (46%) | **55 (63%)** |
| Numeric age + usable qualification | 35 (40%) | **50 (57%)** |
| Pay | 69 (79%) | **83 (95%)** |

The article summary is read first; the official notification PDF fills what it leaves out.
The remaining gaps are honest: project/contract posts with no age limit, scanned image PDFs,
Gujarati PDFs whose embedded fonts defeat text extraction, and PDFs that `robots.txt` excludes.
Nothing is inferred from silence.

Run the PDF pass in dry-run mode (needs Poppler's `pdftotext`):

```bash
cd scraper-rs
cargo run --release -- --backfill-pdfs --dry-run
# with write credentials: --backfill-pdfs --no-dry-run
```

The monthly `PDF Enrichment` workflow runs the same command against the hosted project.

---

## Stack

| Layer | Choice |
|---|---|
| App | Expo SDK 54, React Native 0.81, React 19.1, expo-router 6 |
| Styling | NativeWind 4 (Tailwind 3.4). No `StyleSheet` |
| Language | i18next — English, Gujarati, Hindi; compile-time key checking |
| Backend | Supabase — Postgres, PostgREST, Edge Functions (Deno) |
| Scrapers | Rust (production, `scraper-rs/`; PDF enrichment via Poppler) and Python (legacy parity, `scraper/`) |
| Tests | Jest + Testing Library, Rust `cargo test`, Python `unittest`, Maestro |
| Gates | typecheck, lint, Jest, Rust tests + clippy, web E2E, axe, live-data contract, native smoke |

---

## Quick start

```bash
npm install
cp .env.example .env          # set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start                # or: npx expo start --android / --web
```

All gates:

```bash
export SUPABASE_URL="$(grep '^EXPO_PUBLIC_SUPABASE_URL=' .env | cut -d= -f2)"
export SUPABASE_ANON_KEY="$(grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' .env | cut -d= -f2)"

npm run typecheck
npm run lint
NODE_ENV=test npx jest
bash scripts/e2e-web.sh
bash scripts/a11y-audit.sh
```

Scrapers:

```bash
cd scraper-rs && cargo test --locked && cargo clippy --locked -- -D warnings
scraper/venv/bin/python -m unittest discover -s scraper -p 'test_*.py'

# PDF enrichment needs Poppler; dry-run is the default.
sudo apt-get install -y poppler-utils   # Debian/Ubuntu
cargo run --release -- --backfill-pdfs --dry-run
```

The local Supabase-equivalent stack (Postgres + PostgREST + Edge Runtime behind Kong) is
`bash scripts/local-supabase.sh up`; the scripts fall back to it when `SUPABASE_URL` is unset.
See `SETUP.md` for the full environment notes.

---

## Web deployment

`npx expo export --platform web` produces a single-page build in `dist/`. Direct URLs need a
rewrite to `index.html`; the repository ships both:

- `vercel.json` — Vercel build command, output directory, rewrite, and production security
  headers (CSP, `nosniff`, referrer policy, frame denial, permissions policy, COOP, HSTS).
- `public/_redirects` and `public/_headers` — the Netlify-compatible equivalents, copied into
  `dist/` by the export.

The web build is a preview and the E2E surface. The Android app is the product. The threat
model, secret locations and the dependency position are in `SECURITY.md`.

---

## Repository map

```
app/                 Expo Router routes (tabs, job detail, practice, documents, guide, reminders)
components/ui/       Primitives: Masthead, Heading, Button, Card, Stamp, States, ErrorScreen
components/jobs/     JobCard, DateStub, DeadlineBadge, CategoryBoard, ApplyTracker
components/practice/ QuestionCard, OptionButton, Timer
lib/                 Data access, filtering, storage, i18n, share, freshness, applications
constants/           Theme tokens, education taxonomy, documents, guide, test topics
supabase/            Migrations, seed fixtures, Edge Function generate-test
scraper-rs/          Production scraper + official-PDF enrichment (Rust)
scraper/             Legacy Python scraper + parity tests
e2e/android/         Maestro smoke flow
scripts/             E2E, axe, live-data contract, local stack, DB sync
design/references/   Competitor and design-system evidence, app screenshots
```

---

## Accessibility

GIGW 3.0 is the reference standard. The gates are zero critical and zero serious axe findings on
Home, Jobs, Practice and Settings; body text never below 18px; touch targets at least 48dp;
contrast at least 4.5:1; every status is written in words, not colour alone. All three languages
are real translations, and the web document's `lang` follows the selected language.

---

## Data and privacy

There are no accounts and no server-side user data. Checklists, test history, applied notices,
reminders and the language choice live on the phone. The app reads public job data with the
publishable key; RLS is on and anonymous writes are rejected. Provider keys live in Supabase
secrets and never behind an `EXPO_PUBLIC_` prefix.

The web export ships a content security policy and the standard hardening headers; the full
threat model and how to report a vulnerability are in `SECURITY.md`.

Always check the official notice before applying. The app links out; it never submits an
application.
