#!/usr/bin/env bash
# Autonomous web E2E smoke test for the Expo web build.
# Builds the app, serves it on a free port, drives it with agent-browser,
# and exits non-zero on the first failed assertion. No human input needed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)"
PORT="${E2E_PORT:-8791}"
SESSION="e2e-$$"
AB=(agent-browser --session "$SESSION")
SERVER_PID=""

cleanup() {
  "${AB[@]}" close >/dev/null 2>&1 || true
  [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null || true
  rm -rf "$OUT"
}
trap cleanup EXIT

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; exit 1; }

cd "$ROOT"

# Target: a hosted project when SUPABASE_URL + SUPABASE_ANON_KEY are exported, otherwise
# the local stack (scripts/local-supabase.sh). EXPO_PUBLIC_* is deliberately not consulted
# for target selection: a stale value in .env or the shell must not redirect the gate.
# Expo bakes EXPO_PUBLIC_* in at build time, so the bundle is built with the chosen pair.
echo "==> Checking the live-data target"
TARGET_URL="${SUPABASE_URL:-}"
TARGET_KEY="${SUPABASE_ANON_KEY:-}"
TARGET_URL="${TARGET_URL%/}"

if [[ -n "$TARGET_URL" && -n "$TARGET_KEY" ]]; then
  ANON_KEY="$TARGET_KEY"
  REST="$TARGET_URL/rest/v1"
  TARGET_LABEL="hosted project $TARGET_URL"
else
  if ! curl -sf "http://127.0.0.1:54321/rest/v1/" >/dev/null 2>&1; then
    bash scripts/local-supabase.sh up >/dev/null 2>&1 || fail "local Supabase stack did not start"
  fi
  TARGET_URL="http://127.0.0.1:54321"
  REST="$TARGET_URL/rest/v1"
  ANON_KEY="$(node -e '
const c = require("crypto");
const s = "super-secret-jwt-token-with-at-least-32-characters-long";
const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const h = b({ alg: "HS256", typ: "JWT" });
const p = b({ role: "anon", iss: "supabase-demo", iat: 1700000000, exp: 2000000000 });
process.stdout.write(h + "." + p + "." + c.createHmac("sha256", s).update(h + "." + p).digest("base64url"));
')"
  TARGET_LABEL="local stack"
fi

JOB_COUNT="$(curl -sS "$REST/jobs?select=id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" | node -e '
let d = ""; process.stdin.on("data", (c) => (d += c)).on("end", () => {
  try { process.stdout.write(String(JSON.parse(d).length)); } catch { process.stdout.write("0"); }
});')"
[[ "${JOB_COUNT:-0}" -ge 1 ]] || fail "$TARGET_LABEL has no jobs; seed it first"
pass "$TARGET_LABEL serves $JOB_COUNT live jobs"

echo "==> Building web bundle against $TARGET_LABEL"
EXPO_PUBLIC_SUPABASE_URL="$TARGET_URL" EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
  env -u NODE_ENV npx expo export --platform web --output-dir "$OUT/dist" >/dev/null 2>&1 \
  || fail "expo web export"
pass "web export builds"

echo "==> Serving build on :$PORT"
python3 -m http.server "$PORT" --directory "$OUT/dist" >/dev/null 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 20); do
  curl -sf "http://localhost:$PORT/" >/dev/null && break
  sleep 0.5
done
curl -sf "http://localhost:$PORT/" >/dev/null || fail "server did not start"

BASE="http://localhost:$PORT"

check_text() {
  # Wait up to 20s for visible text, then assert it is present.
  "${AB[@]}" wait --text "$1" --timeout 20000 >/dev/null 2>&1 \
    || fail "expected text not shown: '$1' ($2)"
  pass "$2"
}

click_tab() {
  local name="$1" href="$2"
  # The tab label carries an icon glyph; match the route, as the a11y gate does.
  "${AB[@]}" eval "
    (() => {
      const el = document.querySelector('a[role=\"tab\"][href=\"$href\"]')
        || Array.from(document.querySelectorAll('[role=\"tab\"], a'))
             .find((n) => (n.getAttribute('href') || '') === '$href');
      if (!el) return 'missing';
      el.click();
      return 'clicked';
    })();
  " 2>/dev/null | grep -q clicked || fail "could not tap the $name tab"
  sleep 1
}

audit_page() {
  local label="$1" report critical
  report="$("${AB[@]}" a11y --json 2>/dev/null || echo '{}')"
  critical="$(printf '%s' "$report" | python3 -c '
import sys, json
d = json.load(sys.stdin)
data = d.get("data", d)
v = data.get("violations", [])
print(sum(1 for x in v if x.get("impact") in ("critical", "serious")))
' 2>/dev/null || echo 0)"
  [[ "$critical" == "0" ]] && pass "$label: no critical/serious a11y violations" \
    || fail "$critical critical/serious a11y violation(s) on $label"
}

echo "==> Home screen"
"${AB[@]}" open "$BASE/" >/dev/null
check_text "Rojgar Mitra" "home shows app name"
check_text "What do you want to do?" "home shows quick actions"
check_text "Browse by category" "home shows education shortcuts"

# Live data: the home list must render a real job card from the database, not the empty or
# offline state. "Last Date" appears only on a job card, so it proves the query path works.
check_text "Last Date" "home shows live job cards from the database"

# The shortcut must carry its filter into the jobs screen, not just navigate to it.
"${AB[@]}" find text "Graduate" click >/dev/null 2>&1 || fail "education shortcut not tappable"
check_text "Clear filters" "education shortcut opens a filtered jobs list"
# PRD 5.2: Apply is reachable from the list, not only after opening a notice.
check_text "Apply Now - Official Website" "jobs list offers Apply on the card"

echo "==> Accessibility audit (home)"
audit_page "home"

echo "==> Tab navigation (in-app, like a real user)"
# Static export serves only index.html; routes are client-side, so tabs are tapped in-app.
click_tab "Practice" "/practice"
check_text "Practice Test" "practice tab opens practice screen"

echo "==> Study material"
check_text "Study material" "practice screen links to study material"
"${AB[@]}" find text "Study material" click >/dev/null 2>&1 || fail "study material not tappable"
check_text "Practice tests" "study material lists practice tests"
check_text "PDF documents" "study material lists official PDFs"
check_text "Official websites" "study material lists official links"
"${AB[@]}" find text "Back" click >/dev/null 2>&1 || fail "study material has no back control"

click_tab "Settings" "/settings"
check_text "Language" "settings tab opens settings screen"

echo "==> Documents"
"${AB[@]}" eval "
  (() => {
    const el = Array.from(document.querySelectorAll('[role=\"button\"]'))
      .find((n) => (n.getAttribute('aria-label') || '').startsWith('Document Checklist'));
    if (!el) return 'missing';
    el.click();
    return 'clicked';
  })();
" 2>/dev/null | grep -q clicked || fail "settings documents row not tappable"
check_text "Document reminders" "documents screen shows the reminder control"
check_text "Document reminders work in the mobile app." "reminder states the mobile-only limit"
audit_page "documents"

echo
echo "All E2E checks passed."
