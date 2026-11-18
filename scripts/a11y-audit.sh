#!/usr/bin/env bash
# Four-tab accessibility gate (WCAG via axe-core, run by agent-browser).
#
# Builds the web bundle, serves it, then drives the real app: taps each tab in-app and
# audits the resulting DOM. Fails on any critical or serious finding.
#
# The only tolerated finding is the "region" moderate that React Navigation's tab bar
# causes on every screen: the tab bar renders outside a landmark. It is a library
# limitation, not content we can wrap.
#
#   bash scripts/a11y-audit.sh              # all four tabs
#   bash scripts/a11y-audit.sh jobs         # one tab
#   KEEP_BUILD=1 bash scripts/a11y-audit.sh # reuse an existing build in $OUT
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${A11Y_PORT:-8801}"
OUT="${A11Y_OUT:-/tmp/a11y-build}"
SESSION="a11y-$$"
SERVE_PID=""

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; exit 1; }

cleanup() {
  agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
  [[ -n "$SERVE_PID" ]] && kill "$SERVE_PID" 2>/dev/null || true
}
trap cleanup EXIT

if [[ "${KEEP_BUILD:-0}" != "1" || ! -d "$OUT" ]]; then
  echo "==> Building web bundle"
  env -u NODE_ENV npx expo export --platform web --output-dir "$OUT" >/dev/null 2>&1 \
    || fail "expo web export"
  pass "web export builds"
fi

python3 -m http.server "$PORT" --directory "$OUT" >/dev/null 2>&1 &
SERVE_PID=$!
for _ in $(seq 1 30); do
  curl -sf "http://localhost:$PORT/" >/dev/null && break
  sleep 0.5
done
curl -sf "http://localhost:$PORT/" >/dev/null || fail "preview server did not start"

BASE="http://localhost:$PORT"

# Counts critical+serious and prints any of them in full.
audit() {
  local label="$1"
  agent-browser --session "$SESSION" a11y --json 2>/dev/null | python3 -c '
import sys, json
label = sys.argv[1]
raw = sys.stdin.read()
try:
    payload = json.loads(raw)
except Exception:
    print(f"FAIL  {label}: axe returned no JSON"); raise SystemExit(1)
data = payload.get("data", payload)
violations = data.get("violations", [])
bad = [v for v in violations if v.get("impact") in ("critical", "serious")]
if bad:
    for v in bad:
        print("  " + str(v.get("impact")) + " | " + str(v.get("id")) + " | " + (v.get("help") or "")[:70])
        for node in (v.get("nodes") or [])[:3]:
            print("      " + (node.get("failureSummary") or "").replace(chr(10), " ")[:200])
    print("FAIL  " + label + ": " + str(len(bad)) + " critical/serious")
    raise SystemExit(1)
mods = [v for v in violations if v.get("impact") == "moderate"]
other = [v for v in mods if v.get("id") != "region"]
suffix = ""
if other:
    suffix = ", other moderate: " + ", ".join(str(v.get("id", "")) for v in other)
print("PASS  " + label + ": 0 critical, 0 serious" + suffix)
' "$label" || exit 1
}

echo "==> Auditing the four tabs as a user navigates them"
agent-browser --session "$SESSION" open "$BASE/" >/dev/null
sleep 3

TABS="${1:-}"
want() { [[ -z "$TABS" || "$TABS" == "$1" ]]; }

click_tab() {
  local name="$1" href="$2"
  # The tab label carries an icon glyph, so match the route instead of the text.
  agent-browser --session "$SESSION" eval "
    (() => {
      const el = document.querySelector('a[role=\"tab\"][href=\"$href\"]')
        || Array.from(document.querySelectorAll('[role=\"tab\"], a'))
             .find(n => (n.getAttribute('href') || '') === '$href');
      if (!el) return 'missing';
      el.click();
      return 'clicked';
    })();
  " 2>/dev/null | grep -q clicked || fail "could not tap the $name tab"
  sleep 2
}

# Home is the initial route.
want home && audit "Home"
want jobs && { click_tab "Jobs" "/jobs"; audit "Jobs"; }
want practice && { click_tab "Practice" "/practice"; audit "Practice"; }
want settings && { click_tab "Settings" "/settings"; audit "Settings"; }

echo
echo "All accessibility checks passed."
