#!/usr/bin/env bash
# Lean local Supabase-equivalent stack for verifying live-data paths.
#
# Runs the three real components the app talks to, no more:
#   * Postgres 17 (supabase/postgres image) with the project's migrations applied
#   * PostgREST   -> the /rest/v1 API the Supabase JS client uses
#   * Edge Runtime -> hosts supabase/functions/generate-test exactly as Supabase does
#
# The hosted project (wiyryfopgjdzirndyxzp) is NXDOMAIN, so this is the only way to
# exercise the real query paths. Everything is real: real Postgres, real PostgREST,
# real Deno runtime, real HTTP.
#
# Usage: bash scripts/local-supabase.sh up|down|status
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NET=rm-local-net
PG=rm-local-db
REST=rm-local-rest
EDGE=rm-local-edge
GATEWAY=rm-local-gateway
DB_PORT=54322
# The gateway listens on the same port a hosted project uses, so app code and
# supabase-js paths (/rest/v1, /functions/v1) work with no special-casing.
API_PORT=54321
EDGE_INTERNAL=9000

# Local-only demo JWT secret. Not a secret: this stack binds to 127.0.0.1 and holds
# generated fixtures, never production data.
JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long"
ANON_KEY="$(node -e '
const crypto=require("crypto");
const s="super-secret-jwt-token-with-at-least-32-characters-long";
const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const h=b({alg:"HS256",typ:"JWT"});
const p=b({role:"anon",iss:"supabase-demo",iat:1700000000,exp:2000000000});
const sig=crypto.createHmac("sha256",s).update(h+"."+p).digest("base64url");
process.stdout.write(h+"."+p+"."+sig);
')"
SERVICE_KEY="$(node -e '
const crypto=require("crypto");
const s="super-secret-jwt-token-with-at-least-32-characters-long";
const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const h=b({alg:"HS256",typ:"JWT"});
const p=b({role:"service_role",iss:"supabase-demo",iat:1700000000,exp:2000000000});
const sig=crypto.createHmac("sha256",s).update(h+"."+p).digest("base64url");
process.stdout.write(h+"."+p+"."+sig);
')"

# The LLM key is never committed. Prefer the caller's environment, else the Command Code
# CLI's own configuration (~/.commandcode/auth.json). The value is passed straight into the
# container and never echoed.
if [[ -z "${LLM_API_KEY:-}" ]] && [[ -f "$HOME/.commandcode/auth.json" ]]; then
  LLM_API_KEY="$(node -e '
const fs = require("fs"), path = require("path");
try {
  const j = JSON.parse(fs.readFileSync(path.join(process.env.HOME, ".commandcode", "auth.json"), "utf8"));
  process.stdout.write(typeof j.apiKey === "string" ? j.apiKey : "");
} catch { process.stdout.write(""); }
')"
fi
export LLM_API_KEY="${LLM_API_KEY:-}"

up() {
  # Kong's Lua DNS client cannot resolve Docker's embedded resolver reliably, so every
  # upstream gets a static address on the local network. Deterministic and DNS-free.
  if ! docker network inspect "$NET" >/dev/null 2>&1; then
    docker network create --subnet 172.31.250.0/24 "$NET" >/dev/null
  fi
  PG_IP=172.31.250.11
  REST_IP=172.31.250.12
  EDGE_IP=172.31.250.13
  GATEWAY_IP=172.31.250.10

  if ! docker inspect "$PG" >/dev/null 2>&1; then
    docker run -d --name "$PG" --network "$NET" --ip "$PG_IP" \
      -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres \
      -e JWT_SECRET="$JWT_SECRET" -e JWT_EXP=3600 \
      -p "127.0.0.1:$DB_PORT:5432" \
      public.ecr.aws/supabase/postgres:17.12.0.000 >/dev/null
  else
    docker start "$PG" >/dev/null
  fi

  echo "==> waiting for postgres"
  for _ in $(seq 1 60); do
    docker exec "$PG" pg_isready -U postgres -d postgres >/dev/null 2>&1 && break
    sleep 1
  done
  docker exec "$PG" pg_isready -U postgres -d postgres >/dev/null

  echo "==> applying migrations"
  for f in "$ROOT"/supabase/migrations/*.sql; do
    docker exec -i "$PG" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 <"$f" >/dev/null
    echo "    $(basename "$f")"
  done

  # PostgREST needs the anon / service_role roles to exist, exactly like a hosted project.
  # The image pre-creates "authenticator" as a reserved role, so only supabase_admin may set
  # its password, and pg_hba requires scram over the Docker network.
  docker exec -i "$PG" psql -U supabase_admin -d postgres -q -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
ALTER ROLE authenticator WITH LOGIN NOINHERIT PASSWORD 'postgres';
GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
SQL

  docker rm -f "$REST" >/dev/null 2>&1 || true
  # PostgREST stays internal: only the gateway publishes a port, exactly like Supabase.
  docker run -d --name "$REST" --network "$NET" --ip "$REST_IP" \
    -e PGRST_DB_URI="postgres://authenticator:postgres@$PG_IP:5432/postgres" \
    -e PGRST_DB_SCHEMAS=public \
    -e PGRST_DB_ANON_ROLE=anon \
    -e PGRST_JWT_SECRET="$JWT_SECRET" \
    -e PGRST_SERVER_PORT=3000 \
    -e PGRST_DB_USE_LEGACY_GUCS=false \
    public.ecr.aws/supabase/postgrest:v16.5 >/dev/null

  docker rm -f "$EDGE" >/dev/null 2>&1 || true
  docker run -d --name "$EDGE" --network "$NET" --ip "$EDGE_IP" \
    -e SUPABASE_URL="http://$GATEWAY_IP:8000" \
    -e SUPABASE_ANON_KEY="$ANON_KEY" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
    -e SUPABASE_PUBLISHABLE_KEYS="{\"default\":\"$ANON_KEY\"}" \
    -e LLM_API_KEY="${LLM_API_KEY:-}" \
    -e LLM_BASE_URL="${LLM_BASE_URL:-https://api.commandcode.ai/provider/v1}" \
    -e LLM_MODEL="${LLM_MODEL:-deepseek/deepseek-v4.1-flash}" \
    -e VERIFY_JWT=false \
    -v "$ROOT/supabase/functions:/home/deno/functions:ro" \
    public.ecr.aws/supabase/edge-runtime:v1.79.1 \
    start --main-service /home/deno/functions/generate-test >/dev/null

  # Kong publishes the hosted-project URL layout (/rest/v1, /functions/v1).
  docker rm -f "$GATEWAY" >/dev/null 2>&1 || true
  docker run -d --name "$GATEWAY" --network "$NET" --ip "$GATEWAY_IP" \
    -e KONG_DATABASE=off \
    -e KONG_DECLARATIVE_CONFIG=/home/kong/kong.yml \
    -e KONG_PROXY_LISTEN="0.0.0.0:8000" \
    -e KONG_ADMIN_LISTEN=off \
    -e KONG_LOG_LEVEL=error \
    -v "$ROOT/supabase/local/kong.yml:/home/kong/kong.yml:ro" \
    -p "127.0.0.1:$API_PORT:8000" \
    public.ecr.aws/supabase/kong:2.8.1 >/dev/null

  for _ in $(seq 1 60); do
    curl -sf "http://127.0.0.1:$API_PORT/rest/v1/" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -sf "http://127.0.0.1:$API_PORT/rest/v1/" >/dev/null || {
    echo "gateway did not come up; last logs:" >&2
    docker logs "$GATEWAY" 2>&1 | tail -20 >&2
    return 1
  }

  echo
  echo "SUPABASE_URL=http://127.0.0.1:$API_PORT"
  echo "SUPABASE_ANON_KEY=$ANON_KEY"
  echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY"
  echo "FUNCTIONS_URL=http://127.0.0.1:$API_PORT/functions/v1/generate-test"
}

down() {
  docker rm -f "$GATEWAY" "$EDGE" "$REST" "$PG" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  echo "local stack stopped"
}

status() {
  docker ps --filter "name=rm-local" --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
}

# Values Expo bakes into a build. Printed alone so a CI step can append them to $GITHUB_ENV.
env_out() {
  echo "EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:$API_PORT"
  echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  status) status ;;
  env) env_out ;;
  *) echo "usage: $0 up|down|status|env" >&2; exit 2 ;;
esac
