#!/usr/bin/env bash
# Live-data verification: proves the app's real query paths and the generate-test Edge
# Function work against a real Postgres + PostgREST + Edge Runtime.
#
# Target selection:
#   * no SUPABASE_URL / SUPABASE_ANON_KEY  -> local stack (scripts/local-supabase.sh)
#   * SUPABASE_URL + SUPABASE_ANON_KEY set -> that hosted project
# Add SUPABASE_SERVICE_ROLE_KEY when the target is empty and must be seeded.
#
#   bash scripts/verify-live-data.sh            # local, full run
#   SKIP_LLM=1 bash scripts/verify-live-data.sh # local, skip the (slow, paid) LLM call
#   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=<key> \
#     SUPABASE_SERVICE_ROLE_KEY=<key> bash scripts/verify-live-data.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; exit 1; }

JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long"
make_key() {
  node -e '
const crypto = require("crypto");
const s = process.argv[1];
const role = process.argv[2];
const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const h = b({ alg: "HS256", typ: "JWT" });
const p = b({ role, iss: "supabase-demo", iat: 1700000000, exp: 2000000000 });
process.stdout.write(h + "." + p + "." + crypto.createHmac("sha256", s).update(h + "." + p).digest("base64url"));
' "$JWT_SECRET" "$1"
}

LOCAL_API="http://127.0.0.1:54321"
TARGET_URL="${SUPABASE_URL:-}"
TARGET_KEY="${SUPABASE_ANON_KEY:-}"

if [[ -n "$TARGET_URL" && -n "$TARGET_KEY" ]]; then
  MODE="hosted"
  API="${TARGET_URL%/}"
  ANON="$TARGET_KEY"
  SERVICE="${SUPABASE_SERVICE_ROLE_KEY:-}"
  TARGET_LABEL="hosted project $API"
else
  MODE="local"
  API="$LOCAL_API"
  ANON="$(make_key anon)"
  SERVICE="$(make_key service_role)"
  TARGET_LABEL="local stack"
fi

REST="$API/rest/v1"
EDGE="$API/functions/v1/generate-test"

# Legacy JWT keys travel in both headers. The new sb_publishable_ / sb_secret_ keys are not
# JWTs and belong on `apikey` only.
ANON_AUTH=(-H "apikey: $ANON")
[[ "$ANON" == eyJ* ]] && ANON_AUTH+=(-H "Authorization: Bearer $ANON")
SERVICE_AUTH=(-H "apikey: $SERVICE")
[[ "$SERVICE" == eyJ* ]] && SERVICE_AUTH+=(-H "Authorization: Bearer $SERVICE")

cleanup() { :; }
trap cleanup EXIT

echo "==> Target: $TARGET_LABEL"
if [[ "$MODE" == "local" ]]; then
  if ! curl -sf "$REST/" >/dev/null 2>&1; then
    bash scripts/local-supabase.sh up >/dev/null 2>&1 || fail "local stack failed to start"
  fi
fi
# Hosted PostgREST returns 401 on the API root even with a publishable key, so probe the
# jobs endpoint the app actually uses.
curl -sf "$REST/jobs?select=id&limit=1" "${ANON_AUTH[@]}" >/dev/null \
  || fail "PostgREST not reachable on $REST"
pass "Postgres + PostgREST reachable on $REST"

echo "==> Seeding jobs from the live government sites when the table is empty"
if curl -sf "$REST/jobs?select=id&limit=1" "${ANON_AUTH[@]}" | grep -q '"id"'; then
  pass "jobs table already seeded"
else
  [[ -n "$SERVICE" ]] || fail "jobs table is empty; set SUPABASE_SERVICE_ROLE_KEY or seed the target first"
  tmp="$(mktemp)"
  scratch_script="$(mktemp)"
  cat >"$scratch_script" <<'PY'
import json, sys
sys.path.insert(0, 'scraper')
from scraper import (build_session, PoliteFetcher, OJAS_HOME, GPSC_OPEN,
                     parse_ojas_home, parse_gpsc_open, select_insertable)
fetcher = PoliteFetcher(build_session())
jobs = []
for url, parser in [(OJAS_HOME, parse_ojas_home), (GPSC_OPEN, parse_gpsc_open)]:
    html = fetcher.get(url)
    if html:
        jobs.extend(parser(html, url))
valid, _ = select_insertable(jobs)
json.dump(valid, open(sys.argv[1], 'w'), ensure_ascii=False)
print(f"scraped {len(valid)} live advertisements")
PY
  if [[ -x scraper/venv/bin/python ]]; then
    scraper/venv/bin/python "$scratch_script" "$tmp" || fail "scraper failed"
  else
    python3 "$scratch_script" "$tmp" || fail "scraper failed"
  fi
  rm -f "$scratch_script"
  [[ -s "$tmp" ]] || fail "scraper returned no jobs (site layout changed?)"
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$REST/jobs" \
    "${SERVICE_AUTH[@]}" \
    -H 'Content-Type: application/json' -H 'Prefer: resolution=merge-duplicates,return=minimal' \
    --data-binary "@$tmp")"
  rm -f "$tmp"
  [[ "$code" == "201" || "$code" == "409" ]] || fail "job insert returned $code"
  pass "live-scraped jobs inserted through the service-role path"
fi

echo "==> getJobs(): list ordered by deadline"
COUNT="$(curl -sS "$REST/jobs?select=*&order=deadline.asc" "${ANON_AUTH[@]}" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const a=JSON.parse(d);if(!Array.isArray(a)||!a.length){console.error("no rows");process.exit(1)};const s=a.map(x=>x.deadline);if(s.join()!==[...s].sort().join()){console.error("not sorted");process.exit(1)};process.stdout.write(String(a.length))})')" \
  || fail "job list query"
[[ "$COUNT" -ge 1 ]] || fail "job list empty"
pass "job list returns $COUNT jobs, deadline-ordered"

echo "==> getJobById(): single row by UUID"
JOB_ID="$(curl -sS "$REST/jobs?select=id&order=deadline.asc&limit=1" "${ANON_AUTH[@]}" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(JSON.parse(d)[0].id))')"
TITLE="$(curl -sS "$REST/jobs?select=title,department,deadline&id=eq.$JOB_ID" \
  "${ANON_AUTH[@]}" -H 'Accept: application/vnd.pgrst.object+json' \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);if(!j.title)process.exit(1);process.stdout.write(j.title)})')" \
  || fail "job detail query"
[[ -n "$TITLE" ]] || fail "job detail returned no title"
pass "job detail returns \"${TITLE:0:48}\""

echo "==> RLS: anon cannot write"
code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$REST/jobs" \
  "${ANON_AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"title":"x","department":"y","post_date":"2026-01-01","deadline":"2026-12-31"}')"
[[ "$code" == "401" || "$code" == "403" ]] || fail "anon write was not blocked (got $code)"
pass "anon write rejected with $code"

echo "==> practice pool: get_practice_questions RPC"
POOL="$(curl -sS -X POST "$REST/rpc/get_practice_questions" \
  "${ANON_AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"p_topic":"gk","p_language":"gu","p_count":10}' \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const a=JSON.parse(d);if(!Array.isArray(a))process.exit(1);process.stdout.write(String(a.length))})')" \
  || fail "pool RPC query"
if [[ "$POOL" -ge 10 ]]; then
  pass "pool returns $POOL Gujarati GK questions instantly"
else
  echo "      pool has $POOL/10 - run generator/generate_questions.py to top it up" >&2
fi

echo "==> generate-test: validation paths"
code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$EDGE" -H 'Content-Type: application/json' \
  -d '{"topic":"gk","language":"en"}')"
[[ "$code" == "401" ]] || fail "missing apikey not rejected (got $code)"
pass "missing apikey -> 401"
code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$EDGE" -H 'Content-Type: application/json' \
  -H "apikey: $ANON" -d '{"topic":"bogus","language":"en"}')"
[[ "$code" == "400" ]] || fail "unknown topic not rejected (got $code)"
pass "unknown topic -> 400"

if [[ "${SKIP_LLM:-0}" != "1" ]]; then
  echo "==> generate-test: real LLM generation (full 10-question test)"
  out="$(mktemp)"
  start=$(date +%s)
  code="$(curl -sS -o "$out" -w '%{http_code}' --max-time 120 -X POST "$EDGE" \
    -H 'Content-Type: application/json' -H "apikey: $ANON" \
    -d '{"topic":"gk","language":"gu","count":10}')"
  elapsed=$(( $(date +%s) - start ))
  [[ "$code" == "200" ]] || { cat "$out" >&2; fail "generate-test returned $code"; }
  node -e '
const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
if (!Array.isArray(r.questions) || r.questions.length < 8) {
  console.error("only " + (r.questions?.length ?? 0) + " questions, expected a full test");
  process.exit(1);
}
for (const q of r.questions) {
  if (!["A","B","C","D"].includes(q.correct)) { console.error("bad correct key"); process.exit(1); }
  for (const k of ["A","B","C","D"]) if (!q.options?.[k]?.trim()) { console.error("missing option " + k); process.exit(1); }
}
if (!/[\u0A80-\u0AFF]/.test(r.questions[0].question)) { console.error("not Gujarati script"); process.exit(1); }
const answers = r.questions.map((q) => q.correct);
if (new Set(answers).size < 2) { console.error("correct answers not shuffled"); process.exit(1); }
' "$out" || fail "generated questions failed validation"
  N="$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).questions.length))' "$out")"
  rm -f "$out"
  pass "generated $N valid Gujarati questions in ${elapsed}s through the Edge Function"
fi

echo
echo "All live-data checks passed."
