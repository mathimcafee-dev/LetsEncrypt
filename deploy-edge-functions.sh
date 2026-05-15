#!/bin/bash
# SSLVault — Deploy Supabase Edge Functions
# Run this after ANY change to supabase/functions/
# Usage: SUPABASE_ACCESS_TOKEN=your_token bash deploy-edge-functions.sh

PROJECT_REF="frthcwkntciaakqsppss"

echo "Deploying edge functions to project $PROJECT_REF..."

npx supabase functions deploy gogetssl-issue --project-ref $PROJECT_REF
npx supabase functions deploy keylocker       --project-ref $PROJECT_REF
npx supabase functions deploy auto-renew-cron --project-ref $PROJECT_REF
npx supabase functions deploy send-renewal-email --project-ref $PROJECT_REF

echo "Done."
