#!/usr/bin/env bash
# Loads the deterministic fixtures in supabase/seed/fixtures.sql into the local stack.
#
# CI uses this instead of scraping the live government sites: the gates must not fail
# because a source site is slow, throttled or changed its HTML. Local development can still
# seed real advertisements with scripts/verify-live-data.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PG=rm-local-db

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; exit 1; }

docker inspect "$PG" >/dev/null 2>&1 || fail "local stack is not running; run scripts/local-supabase.sh up"

docker exec -i "$PG" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 \
  < "$ROOT/supabase/seed/fixtures.sql" >/dev/null || fail "fixture insert failed"

JOBS="$(docker exec "$PG" psql -U postgres -d postgres -tAc 'SELECT count(*) FROM public.jobs')"
QUESTIONS="$(docker exec "$PG" psql -U postgres -d postgres -tAc \
  "SELECT count(*) FROM public.practice_questions WHERE topic = 'gk' AND language = 'en'")"

[[ "$JOBS" -ge 1 ]] || fail "no job fixtures loaded"
[[ "$QUESTIONS" -ge 10 ]] || fail "practice pool has $QUESTIONS/10 English GK questions"

pass "fixtures loaded: $JOBS jobs, $QUESTIONS English GK questions"
