# Secrets

Never paste secret keys into chat, code, issues or commits.

## GitHub Actions secrets

All four are set to the live project `wiyryfopgjdzirndyxzp`. Add or replace them in GitHub:
**Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Used by | Value | Secret? |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ci-cd.yml (web build, live-gates, android-e2e) | `https://<project-ref>.supabase.co` | No - public |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ci-cd.yml (web build, live-gates, android-e2e) | Publishable key (`sb_publishable_...`) | No - public by design |
| `SUPABASE_URL` | daily-scraper.yml, live-gates | Same project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | daily-scraper.yml | Secret key (`sb_secret_...` / service_role) | **Yes** - full DB write access |

`live-gates` runs `verify-live-data.sh` with `SKIP_LLM=1` against the hosted project, then
`e2e-web.sh` and `a11y-audit.sh`. `android-e2e` embeds only the two public `EXPO_PUBLIC_*` values.

## Supabase Edge Function secrets

Set in **Supabase Dashboard → Edge Functions → Secrets** (or `npx supabase secrets set NAME=value`).

| Secret | Required | Purpose |
|---|---|---|
| `LLM_API_KEY` | Yes | Command Code API key used by `generate-test` |
| `LLM_MODEL` | No | Defaults to `deepseek/deepseek-v4.1-flash` |
| `LLM_BASE_URL` | No | Defaults to `https://api.commandcode.ai/provider/v1` |

## Local `.env` (never committed)

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Only `EXPO_PUBLIC_*` values reach the app, and every one of them is readable by anyone who
downloads the app. That is why the LLM key lives in the Edge Function, and the service-role key
only in GitHub Actions.

For local scraper runs, put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `scraper/.env`
(git-ignored).
