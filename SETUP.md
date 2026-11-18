# Rojgar Mitra — Setup Guide

**Rojgar Mitra** (રોજગાર મિત્ર) is a Gujarat government-jobs app for farmers and rural youth with
low technical literacy. English, Gujarati and Hindi; large type, high contrast, tap-only UI; works
offline.

For current state and open work, read `HANDOFF.md`. For visual rules, read `PRODUCT.md`.

## Tech stack

| Part | Technology |
|---|---|
| App | React Native, Expo SDK 54, Expo Router v6 (file-based routing) |
| Styling | NativeWind v4 (Tailwind) — no `StyleSheet` |
| Languages | i18next + react-i18next (`lib/locales/{en,gu,hi}.ts`) |
| Offline storage | AsyncStorage (jobs cache, checklists, test history, language) |
| Database | Supabase (PostgreSQL, public read-only RLS) |
| AI practice tests | Supabase Edge Function `generate-test` → Command Code API (DeepSeek V4.1 Flash) |
| Job scraper | **Rust** (`scraper-rs/`, production) + Python (`scraper/`, legacy parity) |
| Tests | Jest + React Native Testing Library; `cargo test`; Python `unittest` |

## 1. Install

```bash
npm install
```

## 2. Environment (`.env`, never committed)

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Only these two public values belong in the app. **Do not** add an LLM key or service-role key
here: every `EXPO_PUBLIC_*` value is bundled into the app and readable by anyone.

## 3. Database

Four migrations, applied in order:

1. `001_create_tables.sql` — tables, indexes, public read policies (re-runnable)
2. `002_unique_job_source_link.sql` — prevents duplicate advertisements
3. `003_practice_questions.sql` — the pre-generated question pool + `get_practice_questions`
4. `004_job_extras.sql` — `vacancies`, `qualification`, `advertisement_no`

Either paste them into the Supabase dashboard's SQL Editor, or use the CLI:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### Local backend (optional)

A hosted project is live (see `HANDOFF.md` §3). The local stack is still useful for offline work
and as the scripts' fallback. It is a real stack — Postgres 17, PostgREST, the Deno Edge Runtime
and a Kong gateway that serves the same `/rest/v1` and `/functions/v1` paths a hosted project
does:

```bash
bash scripts/local-supabase.sh up      # prints SUPABASE_URL, anon key, service key, functions URL
bash scripts/local-supabase.sh env     # prints only the EXPO_PUBLIC_* pair for a build
bash scripts/local-supabase.sh status
bash scripts/local-supabase.sh down
```

`bash scripts/verify-live-data.sh` boots it if needed, seeds advertisements by running the real
scraper when the table is empty, and then asserts the job list, job detail, RLS, pool RPC and Edge
auth paths. Pass `SKIP_LLM=1` to skip the paid LLM generation call.

`bash scripts/seed-fixtures.sh` loads `supabase/seed/fixtures.sql`: twelve advertisements with
deadlines relative to the run date and ten English GK questions. Use it when the target must be
deterministic; the hosted project uses real scraped rows instead.

### Hosted project (the default)

`.env` in this repo points at `https://wiyryfopgjdzirndyxzp.supabase.co`. The same scripts accept
any project through the environment — no script hard-codes localhost:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_ANON_KEY="<publishable or anon key>"
export SUPABASE_SERVICE_ROLE_KEY="<secret key>"   # only needed when seeding

SKIP_LLM=1 bash scripts/verify-live-data.sh
bash scripts/e2e-web.sh          # builds the bundle against the same URL/key
bash scripts/a11y-audit.sh       # uses EXPO_PUBLIC_* from .env
```

`e2e-web.sh` and `verify-live-data.sh` read `SUPABASE_URL` / `SUPABASE_ANON_KEY` and fall back to
the local stack when they are unset.

### Deploy the migrations and Edge Function to a hosted project

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push                    # fresh project only
npx supabase secrets set LLM_API_KEY=<your Command Code key>
npx supabase functions deploy generate-test --use-api --no-verify-jwt
```

On the existing project the migration history uses timestamped versions (`20261105163609`), while
the files are numbered `001`–`004`, so `db push` would treat them all as new. Apply individual
migrations without the database password instead:

```bash
npx supabase db query --remote=<project-ref> -f supabase/migrations/004_job_extras.sql --yes
```

`supabase/config.toml` already sets `verify_jwt = false` for `generate-test`: the app sends a
non-JWT publishable key, and the function checks the `apikey` header itself.

## 4. AI practice tests (Edge Function)

```bash
npx supabase secrets set LLM_API_KEY=<your Command Code key>
npx supabase functions deploy generate-test
```

Optional secrets: `LLM_MODEL` (default `deepseek/deepseek-v4.1-flash`), `LLM_BASE_URL` (default
`https://api.commandcode.ai/provider/v1`). Any OpenAI-compatible provider works.

Without the function the app still works. `loadPracticeTest` falls back in order: the pre-generated
pool → the Edge Function → the last downloaded test → the built-in offline bank
(`constants/questionBank.ts`).

## 5. Fill the question pool

The app reads pooled questions first, which is instant and costs no LLM credit:

```bash
LLM_API_KEY=<key> SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  scraper/venv/bin/python generator/generate_questions.py --batches 45 --per-batch 3 --workers 6
```

## 6. Run

```bash
npx expo start -c       # or ./scripts/start-clean.sh
npm run web             # browser
npm run android         # Android emulator / device
```

## 7. Checks (run before finishing any task)

```bash
npm run typecheck                # tsc --noEmit
npm run lint                     # ESLint (expo config), zero warnings
NODE_ENV=test npx jest           # Jest
bash scripts/e2e-web.sh          # web E2E + axe + live data (needs Docker)
bash scripts/a11y-audit.sh       # four-tab axe gate
npm run codemod:test             # Codemod jssg fixtures

cd scraper-rs && cargo test --locked && cargo clippy --locked -- -D warnings && cd ..
scraper/venv/bin/python -m unittest discover -s scraper -p 'test_*.py'
```

## Project layout

```
app/
  _layout.tsx                 Root stack: CSS, i18n, restores saved language
  (tabs)/                     Bottom tabs: index (Home), jobs, practice, settings
  job/[id].tsx                Job details
  eligibility/[jobId].tsx     4-question eligibility checker
  documents/index.tsx         Checklist overview (application / exam)
  documents/[phase].tsx       Checklist with Ready / Not Ready, saved per job
  practice/test/[category].tsx  Test: optional 15-min timer, review, history
components/ui | jobs | practice  Shared NativeWind components
constants/                    Languages, document lists, test topics, offline question bank
hooks/                        useJobs (offline cache), useChecklist, useCountdown, useLanguage
lib/                          supabase client, i18n, storage, deadline/eligibility/filter logic
utils/aiGenerator.ts          pool → Edge function client, JSON validation, offline fallback
supabase/migrations/          SQL schema (4 migrations)
supabase/functions/generate-test/  LLM proxy (Deno), parallel batched generation
supabase/local/kong.yml       Local gateway routing
scraper-rs/                   Rust scraper (production) + unit tests
scraper/                      Python scraper (legacy parity) + tests
codemods/icon-barrel/         Codemod that keeps icon imports per-family
design/references/            Captured design evidence (PNG)
scripts/                      Local stack, live-data, E2E and axe gates
__tests__/                    Jest tests
e2e/android/smoke.yaml        Maestro flow
```

## Scraper

Three sources, all server-rendered:

| Source | Gives |
|---|---|
| OJAS home | 12 ads; link text carries organisation, post and last date |
| GPSC "Apply Online" | 6 ads from a real table |
| FreeJobAlert Gujarat | 87 ads with vacancies, qualification and advertisement number |

It honours `robots.txt`, spaces requests politely, retries with backoff, drops ads with no
parseable last date, and exits non-zero when no source returns anything (a sign the layout
changed).

```bash
cd scraper-rs
cargo run -- --dry-run        # print what would be inserted (default)
cargo run -- --no-dry-run     # write; needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
```

The Python implementation is kept for parity checks only:

```bash
bash scripts/test-scraper.sh
scraper/venv/bin/python scraper/scraper.py --no-dry-run   # needs scraper/.env
```

GitHub secrets are listed in `.github/SECRETS.md`.

## Troubleshooting

| Problem | Fix |
|---|---|
| Styles missing / "module not found" | `./scripts/start-clean.sh` |
| "Could not load jobs" in the app | Start the stack (`bash scripts/local-supabase.sh up`) and rebuild with the matching `EXPO_PUBLIC_*` values |
| Jobs list is empty but the stack is up | Run `bash scripts/verify-live-data.sh` to seed it |
| Practice tests always "offline" | Fill the pool (step 5); the LLM path needs `LLM_API_KEY` |
| `ModuleNotFoundError: No module named 'bs4'` | Use `scraper/venv/bin/python`, not system Python |
| Typed-route errors from `tsc` | Start `npx expo start` once to regenerate `.expo/types` |
| Web E2E can't start the stack | It needs Docker running |
