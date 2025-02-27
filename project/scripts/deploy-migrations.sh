#!/bin/bash

# This script applies Supabase migrations to update your database schema
# Usage: ./deploy-migrations.sh [environment]
# Where environment is 'local' or 'production' (defaults to 'production')

ENV=${1:-production}
echo "Deploying migrations to $ENV environment..."

if [ "$ENV" == "local" ]; then
  echo "Applying migrations to local development database..."
  npx supabase db reset
elif [ "$ENV" == "production" ]; then
  echo "Applying migrations to production database..."
  
  # Check if the required environment variables are set
  if [ -z "$SUPABASE_ACCESS_TOKEN" ] || [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "Error: Missing required environment variables"
    echo "Please set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_ID"
    exit 1
  fi
  
  npx supabase db push
else
  echo "Unknown environment: $ENV"
  echo "Usage: ./deploy-migrations.sh [environment]"
  echo "Where environment is 'local' or 'production'"
  exit 1
fi

echo "Migration completed successfully!"