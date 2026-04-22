#!/bin/bash
echo "Pushing schema to Supabase and generating types..."
npx supabase db push
npx supabase gen types typescript --local > lib/database.types.ts