# Security policy

Rojgar Mitra is a read-only public notice board with no accounts and no server-side user data.
This file records what is protected, how, and what is deliberately not.

## Reporting a vulnerability

Open a private security advisory on GitHub:
`https://github.com/udayvarmora07/Rojgar_Mitra_App/security/advisories/new`

Do not open a public issue for a vulnerability, and do not include secrets, tokens or private
data in a report. A useful report names the screen or endpoint, the exact steps, and the result
you expected.

## Secrets

| Secret | Where it lives | Never |
|---|---|---|
| Supabase publishable key | `EXPO_PUBLIC_SUPABASE_ANON_KEY` — public by design | — |
| Supabase service-role key | Supabase project secrets and CI secrets | In the app, in the repo, in a log |
| LLM provider key | Supabase Edge Function secrets (`generate-test`) | Behind `EXPO_PUBLIC_`, in the repo |
| GitHub MCP token | The `gh` credential store, exported by the shell | In `.mcp.json` or the repo |
| Supabase CLI access token | The OS keyring (`Supabase CLI`) | In the repo |

`.env` and `.mcp.json` are gitignored. A scan of all history for `gh[pousr]_`, `github_pat_`
and `sbp_` finds nothing. If a token is exposed, rotate it at the provider; deleting the local
copy is not revocation.

The Supabase personal access token created for setup (`rojgar-mitra-setup`) cannot be revoked
through the Management API — it has no PAT endpoints — and `supabase logout` only deletes the
local copy. Revoke it at `https://supabase.com/dashboard/account/tokens` if it is ever
compromised or no longer needed.

## Data and access

- **Database**: RLS is on for every table; anonymous reads are public, anonymous writes are
  rejected with 401. The app uses PostgREST parameterized queries only.
- **Device**: checklists, test history, applied notices, reminders, the job cache and the
  language choice live in AsyncStorage. "Clear saved data" removes everything except the
  language choice. There is no account and nothing is synced.
- **Official links**: only `http(s)` URLs are opened (`lib/url.ts`). A scraped `javascript:`
  or malformed link is never handed to the browser.
- **Notification payloads**: only internal paths starting with `/` (and not `//`, a backslash
  or whitespace) are followed (`isInternalRoute` in `lib/reminders.ts`). A crafted payload
  cannot redirect the app.
- **Web**: the exported build is a static SPA. `vercel.json` and `public/_headers` set a
  content security policy, `nosniff`, a strict referrer policy, frame denial, a permissions
  policy that disables camera/microphone/geolocation/payment, and HSTS. `style-src` allows
  inline styles because React Native Web applies computed styles inline.
- **HTML in scraped text**: decoded as text, never rendered as markup; there is no
  `dangerouslySetInnerHTML` anywhere in the app.
- **Official notification PDFs**: only HTTP(S) notification links from the article are fetched,
  under the scraper's robots and spacing rules and a 25 MB body cap. The bytes must start with
  `%PDF-`; they are written to a unique temporary file, parsed by Poppler's
  `pdftotext -layout` (no PDF JavaScript or embedded files are executed), and deleted. Only the
  extracted age/pay/qualification strings are stored. Keep `poppler-utils` patched; the monthly
  workflow installs the Ubuntu package. Scanned, silent or robots-disallowed PDFs are skipped
  rather than guessed.

## Dependency advisories

`npm audit` reports advisories in transitive build tooling. After the non-breaking audit fix,
the critical advisory is gone; the remaining high/moderate items are fixed only by upgrading
to a newer Expo SDK (a breaking change) and are not part of the exported client bundle. Record
the state honestly rather than applying `npm audit fix --force`, which would move packages
outside the SDK 54 ranges.

## What is deliberately not protected

- The job data is public by design; there is nothing confidential to read.
- The web preview has no authentication. It is a preview of a public notice board.
- There is no anti-scraping defence on the app's own read path; the underlying sources are
  public government advertisements.
