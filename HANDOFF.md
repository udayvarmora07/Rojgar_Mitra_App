# Handoff — Rojgar Mitra

Written for a fresh session with no memory of prior work. Everything under **Verified** was run
and observed in the session that wrote this file. Everything under **Open** is genuinely open.

Read in this order: this file, then `PRODUCT.md` (brand direction), then `AGENTS.md` (standing
directives from the owner), then `PRD.md` (requirements).

---

## 1. What this project is

A Gujarat government-jobs app for farmers and rural youth with low technical literacy. It
aggregates job advertisements from official Gujarat sources, explains eligibility, tracks
required documents, and offers offline/AI practice tests. UI in **English, Gujarati and Hindi**.

Stack: Expo SDK 54, React Native 0.81.5, React 19.1.0, expo-router 6, NativeWind 4 (Tailwind
3.4 — **no** `StyleSheet`), i18next. Backend is Supabase (Postgres + PostgREST + Edge
Functions). Two scrapers: **Rust** (production, `scraper-rs/`) and Python (legacy parity,
`scraper/`).

---

## 2. Environment facts you will need

| Thing | Value |
|---|---|
| Node | 24.22.3 |
| Rust | 1.100.0 (cargo 1.100.0) |
| Java | 21 |
| Docker | 29.9.3, daemon running |
| `agent-browser` | 0.43.0 (Vercel Labs CLI) — used for E2E, screenshots, axe |
| `gh` | logged in as `udayvarmora07` |
| Android SDK | `~/Android/sdk` — build-tools 36, platform android-36, **no emulator binary, no system image** |
| Disk | ~8 GB free — tight; avoid large image pulls |

Subagent config was set in the previous session (user-wide, `~/.commandcode/settings.json`):
`feature-model:subagents = deepseek/deepseek-v4.1-flash`, `subagent-max-turns = 1000` (the
documented maximum). Verify with `cmd config get feature-model:subagents --json`.

---

## 3. Hosted Supabase is live (re-verified 2026-11-18)

`wiyryfopgjdzirndyxzp.supabase.co` resolves again and the project is `ACTIVE_HEALTHY`. The
NXDOMAIN observation from 2026-11-17 is stale, not a permanent constraint. Verified on
2026-11-18:

| Check | Evidence |
|---|---|
| REST + RLS | `/rest/v1/jobs` returns **94** rows with the publishable key; anon write → **401** |
| Migrations | 001–003 recorded; **004 applied** (the new columns return 200) |
| Practice pool | **180** questions, 10–12 per topic × language pair |
| Edge Function | `generate-test` deployed with `LLM_API_KEY`; 8–10 valid questions in 38–53 s |
| Web E2E | `e2e-web.sh` passes against the hosted project (live cards, tabs, axe) |
| Axe | four tabs, **0 critical, 0 serious** against the hosted build |

`.env` points at this project. The four GitHub Actions secrets
(`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) are set to it, so CI and the Android build use the same backend.

The local Supabase-equivalent stack on `127.0.0.1:54321` still exists for offline work and is
the scripts' fallback when `SUPABASE_URL` is unset. It is real Postgres 17 + PostgREST + Deno
Edge Runtime behind Kong, not a mock.

---

## 4. Start here: reproduce a green baseline

Run from the project root. Expected results are the numbers observed.

```bash
# 0. Hosted project (the default target). .env already points at it.
#    With these exported, verify/e2e target the hosted project; without them they use the
#    local stack below. Neither prints the key.
export SUPABASE_URL="$(grep '^EXPO_PUBLIC_SUPABASE_URL=' .env | cut -d= -f2)"
export SUPABASE_ANON_KEY="$(grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' .env | cut -d= -f2)"

# 1. Local backend (optional; Postgres + PostgREST + Edge Runtime + Kong gateway)
bash scripts/local-supabase.sh up        # prints SUPABASE_URL / keys / functions URL
bash scripts/local-supabase.sh status    # 4 containers: rm-local-{db,rest,edge,gateway}
bash scripts/local-supabase.sh env       # prints only the EXPO_PUBLIC_* pair

# 2. Data: 94 live job advertisements + 180 pooled practice questions (hosted).
#    Add SKIP_LLM=1 to skip the paid LLM call. If the target is empty the script seeds it
#    from the real scraper (needs SUPABASE_SERVICE_ROLE_KEY).
bash scripts/verify-live-data.sh

# 3. Gates (all must be green)
npm run typecheck                        # exit 0
npm run lint                             # exit 0, zero warnings
NODE_ENV=test npx jest                   # 8 suites, 73 tests
bash scripts/e2e-web.sh                  # exit 0 — builds, serves, drives browser, axe, live data
bash scripts/a11y-audit.sh               # exit 0 — four tabs, 0 critical, 0 serious
npm run codemod:test                     # 2 fixtures pass (Codemod jssg)

# 4. Scrapers
cd scraper-rs && cargo test --locked && cargo clippy --locked -- -D warnings && cd ..
scraper/venv/bin/python -m unittest discover -s scraper -p 'test_*.py'   # 14 tests
```

**Python gotcha:** `python3 -m unittest` with the *system* Python fails with
`ModuleNotFoundError: No module named 'bs4'`. Use `scraper/venv/bin/python` (bs4 4.14.3).

**Jest gotcha:** `jest.config.js` sets `process.env.NODE_ENV = 'test'` before exporting config.
React 19.1's production build does not export `act`; removing that line makes tests fail with
`actImplementation is not a function`. Do not remove it.

**Expo env gotcha:** `EXPO_PUBLIC_*` values are baked in at build time and `.env` alone was not
picked up reliably. Pass them explicitly when exporting:

```bash
ANON=$(node -e 'const c=require("crypto");const s="super-secret-jwt-token-with-at-least-32-characters-long";const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");const h=b({alg:"HS256",typ:"JWT"});const p=b({role:"anon",iss:"supabase-demo",iat:1700000000,exp:2000000000});process.stdout.write(h+"."+p+"."+c.createHmac("sha256",s).update(h+"."+p).digest("base64url"))')
EXPO_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON" \
  env -u NODE_ENV npx expo export --platform web --output-dir /tmp/preview --clear
```

**Timeout fix:** `jest.config.js` sets `testTimeout: 15000`. Suites run in parallel on a
memory-constrained machine, and render-heavy tests (job detail, screens) occasionally exceeded
Jest's 5 s default under that load while finishing in ~300 ms alone. The higher ceiling removes
that flake without hiding a real hang. Keep it.

---

## 5. Verified state (run and observed)

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0, zero warnings |
| Jest | `NODE_ENV=test npx jest` | 8 suites, **73 tests** |
| Web E2E + live data + axe | `bash scripts/e2e-web.sh` | exit 0, hosted project (94 live cards) |
| Four-tab axe | `bash scripts/a11y-audit.sh` | **0 critical, 0 serious** on Home/Jobs/Practice/Settings |
| Rust scraper | `cargo test --locked` | **19 tests**; clippy `-D warnings` clean |
| Python scraper (venv) | `unittest discover -s scraper` | **14 tests** |
| Codemod fixtures | `npm run codemod:test` | 2/2 pass |
| Live jobs | hosted PostgREST `/rest/v1/jobs` | **94 rows**, deadline-ordered |
| Practice pool | `get_practice_questions('gk','gu',10)` | **180 total**, 10–12 per topic × language |
| Edge function auth | POST with no `apikey` | **401** (correct) |
| AI generation | 10 Gujarati questions end to end | **8–10 questions in 38–53 s** |
| Web bundle | `expo export` | **2.1 MB** (was 6.1 MB) |
| Design scanner | `devibe_scan.py .` | vibe score **0**, **0 findings** (the one status pill is `unslop-ignore`d) |

### Fixes that matter (with evidence, so they are not undone)

1. **`generate-test` used to always fail.** One call asking for 10 questions exceeded the 55 s
   timeout every time (measured: HTTP 502 at exactly 55.00 s), so users always fell back to the
   offline bank. It now fans out to parallel 2-question batches with top-up rounds:
   **10 questions in ~48 s**.
2. **The practice pool was never read.** `practice_questions` + `get_practice_questions` existed
   but nothing called them. `loadPracticeTest` now goes pool → AI → cache → offline bank, so a
   normal test is instant and costs no LLM credit.
3. **Icon fonts cost 3.9 MB.** `import { Ionicons } from '@expo/vector-icons'` pulled all 19 font
   files into the bundle. Per-family imports (`@expo/vector-icons/Ionicons`) ship one.
   Web build **6.1 MB → 2.1 MB**.
4. **Contrast failures fixed.** accent `#059669` on white was 3.77:1 (fails AA) → `#047857` at
   5.48:1. Deadline pill `#DC2626` on `red-50` was 4.41:1 → `#8A1A16` on `#FFF8F8` at 8.94:1.
   Body text raised from 16px to 18px in 10 places.
5. **Scrapers wired into CI.** `daily-scraper.yml` runs the Rust scraper (cargo test, clippy,
   release build, run) with the Python parser tests kept as a non-blocking parity job.
6. **Three live sources instead of one.** OJAS + GPSC + FreeJobAlert (the last adds vacancies,
   qualification and advertisement number), 105 advertisements in total.

---

## 6. Files added or changed (this effort)

**Docs / config**
- `PRODUCT.md` — **new.** Brand direction with measured evidence: palette, type scale, radii,
  status surfaces, per-screen intent, non-negotiables. Read before any visual change.
- `AGENTS.md` — **new.** Owner's standing directives (use every tool/skill/MCP; research first;
  install what is needed; no AI-slop UI; gates stay green).
- `HANDOFF.md` — this file.
- `tailwind.config.js` — tokens gained status surfaces (`open-*`, `closing-*`, `closed-*`),
  `primary-dark`, `lineHeight.reading: 1.5`; the `pill` radius was removed (pills are status-only).
- `tsconfig.json`, `eslint.config.js` — exclude `codemods/` from app typecheck and lint (it runs
  in the Codemod runtime; fixtures are excluded from lint only).
- `jest.config.js` — `testTimeout: 15000` (parallel suites on a memory-constrained machine
  occasionally exceeded the 5 s default).
- `.gitignore` — `scraper-rs/target/`, `scraper-rs/scrape_report.json`, `.mcp.json`.
- `.autogit` — contains `no` (owner declined auto-git tracking, now and for future projects).
- `package.json` — added the `codemod:test` script.

**Backend**
- `supabase/migrations/004_job_extras.sql` — **new**: `vacancies`, `qualification`,
  `advertisement_no` columns + a non-negative check.
- `supabase/functions/generate-test/index.ts` — parallel batched generation with retry rounds.
- `supabase/local/kong.yml` — **new**: local gateway routes `/rest/v1` and `/functions/v1`.
- `supabase/migrations/001` and `003` — made re-runnable (`DROP POLICY IF EXISTS`,
  `DROP TRIGGER IF EXISTS`) so the local stack can start repeatedly.

**Scripts**
- `scripts/local-supabase.sh` — **new**: the lean real stack (static IPs; Kong cannot resolve
  Docker DNS). Subcommands `up` / `down` / `status` / `env` (the last prints only the
  `EXPO_PUBLIC_*` pair for CI).
- `scripts/verify-live-data.sh` — seeds, then asserts job list, job detail, RLS, pool RPC, Edge
  auth paths and real LLM generation. Targets the local stack by default, or a hosted project
  when `SUPABASE_URL` + `SUPABASE_ANON_KEY` are set.
- `scripts/a11y-audit.sh` — four-tab axe gate; taps tabs by route
  (`a[role=tab][href]`) because the labels carry icon glyphs.
- `scripts/e2e-web.sh` — builds against the selected target (hosted or local), serves it, and
  asserts the home list shows real job cards.
- `scripts/seed-fixtures.sh` — loads `supabase/seed/fixtures.sql`: 12 advertisements with
  run-relative deadlines and 10 English GK questions. Deterministic for offline/CI runs; the
  hosted project uses real scraped rows instead.

**Tests**
- `__tests__/homeTiles.test.tsx` — equal-width basis, the 114 px label box, the two-line slot in
  English and Gujarati.
- `__tests__/components.test.tsx` — FilterChips is not a pill; DeadlineBadge keeps the one
  intentional status pill and carries its state as text.

**Rust scraper** (`scraper-rs/`; deps `ureq 3`, `scraper 0.29`, `chrono`, `robotxt 0.7`,
`serde`, `url`)
- `src/main.rs` — CLI (`--dry-run` default, `--no-dry-run`), JSON run report.
- `src/dates.rs` — Indian day-first dates + **Gujarati/Devanagari digit normalisation**.
- `src/fetch.rs` — throttled fetch (robots.txt fetch is throttled too), retries with backoff.
- `src/parse.rs` — OJAS, GPSC and FreeJobAlert parsers; selectors taken from live HTML.
- `src/sources.rs` — registry + validation/dedupe (http link, future deadline, unique link).
- `src/db.rs` — PostgREST writes; chunked `in.(...)` lookup (a single URL with ~100 encoded
  links returns 414) plus a credentials gate with tests.

**Codemod** (`codemods/icon-barrel/`)
- `src/workflow.ts` — rewrites `@expo/vector-icons` barrel imports to per-family imports.
- `tests/barrel-to-families/` — input/expected fixtures (2 cases, passing).

**Design evidence** (`design/references/`)
- `ref-www-ux4g-gov-in.png` (Government of India design system), `ref-umang-gov-in.png`,
  `ref-www-freejobalert-com.png` (the anti-pattern we must beat), `ref-ojas-gujarat-gov-in.png`
  (CAPTCHA wall — unusable), `ref-naukri-com.png` (Access Denied), plus before/after app
  screenshots at a 390×844 viewport (`app-home-mobile.png`, `app-jobs-mobile.png`).

**Tests / E2E**
- `e2e/android/smoke.yaml` — updated to assert live job cards and open a real practice test.
  Selectors verified against app source (`text:` for the card label, not `id:`).

---

## 7. Live data sources (all verified to return rows)

| Source | What it gives | Parser |
|---|---|---|
| `https://ojas.gujarat.gov.in/` | 12 ads; link text carries org, post, last date | `parse::ojas_home` |
| `https://gpsc.gujarat.gov.in/RecruitmentOpen` | 6 ads from a real table | `parse::gpsc_open` |
| `https://www.freejobalert.com/gujarat-government-jobs/` | 87 ads **with vacancies, qualification, advt no** | `parse::freejobalert_gujarat` |

Researched and **rejected** (no last date in the HTML; would need PDF parsing): GPSSB, GSSSB,
GPRB, Gujarat High Court, SPIPA. GSSSB additionally needs a JS POST with an anti-forgery token.

---

## 8. Open items — state after the 2026-11-18 pass

1. **Visual pass — DONE.** `FilterChips` uses `rounded-control`; `DeadlineBadge` is the only pill
   and carries an `unslop-ignore` justification. Scanner: **0 findings, vibe score 0**. Axe:
   **0 critical / 0 serious** on all four tabs. Regression tests live in
   `__tests__/components.test.tsx`.
2. **Home tiles — DONE.** Equal `flex-1 basis-0 min-w-0`, 2 px inner padding leaves a 114 px label
   box ("Documents" measures 102.4 px at 18 px bold), and a fixed 54 px two-line slot keeps the
   icons on one baseline. Verified by screenshot at 390×844 in all three languages; tests in
   `__tests__/homeTiles.test.tsx`.
3. **CI real gates — DONE in the workflow.** `app-checks` runs typecheck, lint and Jest;
   `live-gates` runs `verify-live-data.sh` (SKIP_LLM=1), `e2e-web.sh` and `a11y-audit.sh` against
   the hosted project. Not yet observed on GitHub because nothing has been pushed.
4. **`android-e2e` — READY, NOT RUN.** It now builds against the hosted project through the
   `EXPO_PUBLIC_*` secrets (no local stack), and the pool has 10+ English GK questions for the
   Maestro flow. It still needs a **branch push**, which requires the owner's approval.
5. **`LLM_API_KEY` — DONE.** Set on `wiyryfopgjdzirndyxzp`; `generate-test` is deployed and real
   calls return 8–10 valid questions in 38–53 s. The key is never printed and never carries an
   `EXPO_PUBLIC_` prefix.
6. **No local Android emulator** (no binary, no system image; disk is tight). Native E2E must run
   on hosted CI unless `emulator` + `system-images;android-34;google_apis;x86_64` are installed.
7. **Revoke the setup token.** A 7-day full-access personal access token named
   `rojgar-mitra-setup` was created to link, migrate and deploy. Revoke it at
   **Account → Access Tokens** when it is no longer needed. It lives in the CLI's own config,
   outside the repo.
8. **Rotate the GitHub PAT** that was previously written into `.mcp.json` (it is now
   `${GITHUB_MCP_PAT}` and the file is gitignored, but rotation is still the right move).
9. **`opencli` browser extension is not connected** (`opencli doctor`); not needed for current
   work.

---

## 9. Conventions that keep review easy

- All output in **English** (the owner corrects drift immediately).
- **No git commits or pushes** without explicit approval; `.autogit` is `no`.
- Never print or commit secrets; `.env` and `.mcp.json` are gitignored.
- Gates must stay green on every change: typecheck, lint, Jest, web E2E, axe. State the numbers.
- Accessibility target: 0 critical / 0 serious on four tabs; the only tolerated finding is the
  moderate `region` from React Navigation's tab bar.
- Body text ≥ 18px, touch targets ≥ 48dp, contrast ≥ 4.5:1, and status always carries text.
- `agent-browser` CLI notes: `agent-browser set viewport 390 844` (there is no `resize` command);
  `screenshot [selector] [path] --full` takes positional arguments; `a11y --json` returns the
  axe report.
