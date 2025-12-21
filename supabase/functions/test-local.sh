#!/bin/bash

# Local Testing Script for process-subscription-bills Edge Function
# This script helps test the Edge Function locally before deployment

set -e

echo "🧪 Testing process-subscription-bills Edge Function"
echo "=================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI is installed"
echo ""

# Check if .env file exists
if [ ! -f "../../.env" ]; then
    echo "❌ .env file not found"
    echo "Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Load environment variables
source ../../.env

# Extract Supabase URL and project ref
SUPABASE_URL=${VITE_SUPABASE_URL}
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')

echo "📋 Configuration:"
echo "   Supabase URL: $SUPABASE_URL"
echo "   Project Ref: $PROJECT_REF"
echo ""

# Prompt for service role key
echo "🔑 Enter your Supabase Service Role Key:"
echo "   (Found in: Supabase Dashboard > Settings > API > service_role)"
read -s SERVICE_ROLE_KEY
echo ""

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Service role key is required"
    exit 1
fi

# Test 1: Health Check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH_URL="$SUPABASE_URL/functions/v1/process-subscription-bills/health"
echo "GET $HEALTH_URL"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$HEALTH_URL")
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed"
    echo "$RESPONSE_BODY" | jq '.'
else
    echo "❌ Health check failed (HTTP $HTTP_STATUS)"
    echo "$RESPONSE_BODY"
fi
echo ""

# Test 2: Dry Run
echo "Test 2: Dry Run (Preview)"
echo "-------------------------"
FUNCTION_URL="$SUPABASE_URL/functions/v1/process-subscription-bills"
echo "POST $FUNCTION_URL"
echo "Body: {\"dryRun\": true}"
echo ""

DRY_RUN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}')

HTTP_STATUS=$(echo "$DRY_RUN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DRY_RUN_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Dry run successful"
    echo "$RESPONSE_BODY" | jq '.'
else
    echo "❌ Dry run failed (HTTP $HTTP_STATUS)"
    echo "$RESPONSE_BODY"
fi
echo ""

# Test 3: Actual Execution (with confirmation)
echo "Test 3: Actual Execution"
echo "------------------------"
echo "⚠️  This will create actual expense records!"
echo "Do you want to proceed? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" = "yes" ]; then
    echo ""
    echo "POST $FUNCTION_URL"
    echo "Body: {}"
    echo ""
    
    EXEC_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X POST "$FUNCTION_URL" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d '{}')
    
    HTTP_STATUS=$(echo "$EXEC_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$EXEC_RESPONSE" | sed '/HTTP_STATUS/d')
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Execution successful"
        echo "$RESPONSE_BODY" | jq '.'
    else
        echo "❌ Execution failed (HTTP $HTTP_STATUS)"
        echo "$RESPONSE_BODY"
    fi
else
    echo "⏭️  Skipped actual execution"
fi
echo ""

echo "=================================================="
echo "✅ Testing complete!"
echo ""
echo "Next steps:"
echo "1. Review the results above"
echo "2. Check subscription_billing_logs table in your database"
echo "3. Verify expenses were created (if you ran actual execution)"
echo "4. Set up the cron job using setup-cron.sql"
