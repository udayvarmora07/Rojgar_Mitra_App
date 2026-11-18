#!/bin/bash
# Push the local migrations and regenerate the typed Supabase client from the schema that
# the app actually talks to. The project ref comes from supabase/config.toml.
set -euo pipefail
cd "$(dirname "$0")/.."

REF="$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)"
if [[ -z "$REF" ]]; then
  echo "supabase/config.toml has no project_id" >&2
  exit 1
fi

npx supabase db push
{
  echo '// Generated from the Supabase schema. Do not edit by hand.'
  echo "// Regenerate: supabase gen types typescript --remote=$REF --schema public > lib/database.types.ts"
  echo
  npx supabase gen types typescript --remote="$REF" --schema public
} > lib/database.types.ts

echo "Types regenerated from $REF"
