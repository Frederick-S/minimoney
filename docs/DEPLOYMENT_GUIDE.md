# Subscription Expense Persistence - Deployment Guide

This guide provides step-by-step instructions for deploying the subscription expense persistence feature, including database migrations, Edge Function deployment, cron job setup, and environment configuration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Migration](#database-migration)
3. [Edge Function Deployment](#edge-function-deployment)
4. [Cron Job Setup](#cron-job-setup)
5. [Environment Variables](#environment-variables)
6. [Frontend Deployment](#frontend-deployment)
7. [Verification](#verification)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

Before starting the deployment, ensure you have:

- **Supabase Project**: Active Supabase project with admin access
- **Supabase CLI**: Version 1.0.0 or higher installed
  ```bash
  # Install Supabase CLI
  npm install -g supabase
  
  # Verify installation
  supabase --version
  ```
- **Node.js**: Version 20.0.0 or higher
- **Database Access**: Admin credentials for your Supabase database
- **Service Role Key**: Available from Supabase Dashboard → Settings → API

---

## Database Migration

### Step 1: Review Migration Scripts

The database schema changes are defined in:
- `db/schema.sql` - Main schema with all tables and indexes
- `db/system-categories-seed.sql` - System categories including subscription category

### Step 2: Backup Existing Database

**CRITICAL**: Always backup your database before running migrations.

```bash
# Using Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# Or via Supabase Dashboard:
# Database → Backups → Create Backup
```

### Step 3: Run Database Migrations

#### Option A: Using Supabase Dashboard (Recommended for Production)

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Execute the following scripts in order:

**3.1. Run Schema Updates**
```sql
-- Copy and paste contents from db/schema.sql
-- This includes:
-- - subscription_id column on expenses table
-- - subscription_billing_logs table
-- - subscription_audit_log table
-- - All necessary indexes
-- - Row Level Security policies
```

**3.2. Verify Subscription Category**
```sql
-- Check if subscription category exists in system_categories
SELECT * FROM system_categories WHERE name = 'subscription';

-- If not present, insert it
INSERT INTO system_categories (
  name,
  display_name,
  color,
  chart_color,
  icon,
  level,
  path,
  locale,
  category_set
) VALUES (
  'subscription',
  '订阅',
  '#9C27B0',
  '#9C27B0',
  'mdi-sync',
  0,
  'subscription',
  'zh_CN',
  'default'
) ON CONFLICT (name, parent_id, category_set, locale) DO NOTHING;
```

**3.3. Create User Categories from System Template**
```sql
-- For each existing user, create subscription category
INSERT INTO categories (
  user_id,
  system_category_id,
  name,
  display_name,
  color,
  chart_color,
  icon,
  is_default,
  level,
  path
)
SELECT 
  u.id as user_id,
  sc.id as system_category_id,
  sc.name,
  sc.display_name,
  sc.color,
  sc.chart_color,
  sc.icon,
  true as is_default,
  sc.level,
  sc.path
FROM auth.users u
CROSS JOIN system_categories sc
WHERE sc.name = 'subscription'
  AND NOT EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.user_id = u.id AND c.name = 'subscription'
  );
```

#### Option B: Using Supabase CLI (For Development/Staging)

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Or run specific SQL file
psql $DATABASE_URL -f db/schema.sql
```

### Step 4: Verify Migration

```sql
-- Check expenses table has subscription_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses' AND column_name = 'subscription_id';

-- Check subscription_billing_logs table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'subscription_billing_logs';

-- Check subscription_audit_log table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'subscription_audit_log';

-- Verify indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('expenses', 'subscriptions', 'subscription_billing_logs')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('expenses', 'subscriptions', 'subscription_billing_logs', 'subscription_audit_log')
ORDER BY tablename, policyname;
```

---

## Edge Function Deployment

### Step 1: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
# Navigate to project root
cd /path/to/your/project

# Link to Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 4: Deploy Edge Function

```bash
# Deploy the process-subscription-bills function
supabase functions deploy process-subscription-bills

# Expected output:
# Deploying function process-subscription-bills...
# Function deployed successfully!
# Function URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills
```

### Step 5: Set Environment Variables for Edge Function

Edge Functions need access to Supabase URL and Service Role Key:

```bash
# Set secrets for the Edge Function
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Verify secrets are set
supabase secrets list
```

**Note**: These environment variables are automatically available in the Edge Function runtime.

### Step 6: Test Edge Function

#### Manual Test via curl

```bash
# Test health check endpoint
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health

# Expected response:
# {"status":"healthy","timestamp":"2024-01-26T12:00:00.000Z","version":"1.0.0"}

# Test dry-run mode (doesn't create expenses)
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Expected response:
# {"dryRun":true,"wouldProcess":5,"subscriptions":[...]}

# Test actual processing (creates expenses)
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response:
# {"success":true,"processedCount":10,"successCount":9,"failedCount":1,"errors":[...],"executionStart":"...","executionEnd":"..."}
```

#### Test via Supabase Dashboard

1. Navigate to **Edge Functions** in Supabase Dashboard
2. Select **process-subscription-bills**
3. Click **Invoke Function**
4. Use request body: `{}`
5. Review response and logs

### Step 7: Monitor Edge Function Logs

```bash
# View real-time logs
supabase functions logs process-subscription-bills --follow

# Or via Dashboard:
# Edge Functions → process-subscription-bills → Logs
```

---

## Cron Job Setup

### Step 1: Enable pg_cron Extension

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verify extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Step 2: Configure Cron Job

**Important**: Replace placeholders with actual values:
- `YOUR_PROJECT_REF`: Your Supabase project reference (e.g., `abcdefghijklmnop`)
- `YOUR_SERVICE_ROLE_KEY`: Your service role key from Dashboard → Settings → API

```sql
-- Schedule hourly execution at :00 minutes
SELECT cron.schedule(
  'process-subscription-bills-hourly',  -- Job name
  '0 * * * *',                          -- Cron expression: every hour at :00
  $
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $
);
```

**Cron Expression Explanation**:
- `0 * * * *` = Run at minute 0 of every hour (00:00, 01:00, 02:00, etc.)
- This ensures subscriptions are processed within 1 hour of their billing date in any timezone

### Step 3: Verify Cron Job Registration

```sql
-- Check if cron job is registered
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname = 'process-subscription-bills-hourly';

-- Expected output:
-- jobid | jobname                              | schedule    | active | command
-- ------|--------------------------------------|-------------|--------|----------
-- 1     | process-subscription-bills-hourly    | 0 * * * *   | t      | SELECT net.http_post(...)
```

### Step 4: Monitor Cron Job Execution

```sql
-- View recent cron job executions
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'process-subscription-bills-hourly'
)
ORDER BY start_time DESC 
LIMIT 10;

-- Check subscription_billing_logs for execution results
SELECT 
  execution_start,
  execution_end,
  status,
  processed_count,
  success_count,
  failed_count,
  EXTRACT(EPOCH FROM (execution_end - execution_start)) as duration_seconds
FROM subscription_billing_logs
ORDER BY execution_start DESC
LIMIT 10;
```

### Step 5: Cron Job Management Commands

```sql
-- Pause cron job (if needed)
UPDATE cron.job 
SET active = false 
WHERE jobname = 'process-subscription-bills-hourly';

-- Resume cron job
UPDATE cron.job 
SET active = true 
WHERE jobname = 'process-subscription-bills-hourly';

-- Delete cron job (if needed)
SELECT cron.unschedule('process-subscription-bills-hourly');

-- Manually trigger for testing (via Edge Function)
-- Use curl command from Edge Function section
```

---

## Environment Variables

### Frontend Environment Variables

Create or update `.env.local` file in project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Optional: Enable debug logging
VITE_DEBUG=false
```

**Where to find these values**:
- Supabase Dashboard → Settings → API
- `VITE_SUPABASE_URL`: Project URL
- `VITE_SUPABASE_ANON_KEY`: Project API keys → anon public

### Edge Function Environment Variables

Already set in [Edge Function Deployment](#step-5-set-environment-variables-for-edge-function):

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### Environment Variable Security

**CRITICAL SECURITY NOTES**:

1. **Never commit sensitive keys to version control**
   - Add `.env.local` to `.gitignore`
   - Use `.env.example` as template without real values

2. **Service Role Key Protection**
   - Service role key bypasses Row Level Security
   - Only use in Edge Functions and backend services
   - Never expose in frontend code
   - Rotate regularly (every 90 days recommended)

3. **Anon Key Usage**
   - Safe to use in frontend
   - Respects Row Level Security policies
   - Can be public

---

## Frontend Deployment

### Step 1: Install Dependencies

```bash
# Install all project dependencies
npm install
```

### Step 2: Run Tests

```bash
# Run all tests
npm run test:run

# Expected: All tests should pass
# If any tests fail, review and fix before deploying
```

### Step 3: Build Frontend

```bash
# Build for production
npm run build

# Expected output:
# vite v6.3.5 building for production...
# ✓ built in XXXms
# dist/index.html                   X.XX kB
# dist/assets/index-XXXXX.js        XXX.XX kB
```

### Step 4: Deploy Frontend

#### Option A: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard:
# Settings → Environment Variables
# Add: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

#### Option B: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify Dashboard:
# Site settings → Environment variables
# Add: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

#### Option C: Manual Deployment

```bash
# Build creates dist/ folder
npm run build

# Upload dist/ contents to your hosting provider
# Ensure environment variables are set in hosting platform
```

---

## Verification

### Step 1: Verify Database Schema

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'expenses', 
    'subscriptions', 
    'subscription_billing_logs', 
    'subscription_audit_log',
    'user_preferences'
  )
ORDER BY table_name;

-- Should return 5 rows
```

### Step 2: Verify Edge Function

```bash
# Health check
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health

# Should return: {"status":"healthy",...}
```

### Step 3: Verify Cron Job

```sql
-- Check cron job is active
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'process-subscription-bills-hourly';

-- Should return 1 row with active = true
```

### Step 4: End-to-End Test

1. **Create Test Subscription**:
   - Login to frontend
   - Navigate to Subscriptions
   - Create subscription with start date = today
   - Verify subscription is created

2. **Wait for Cron Execution** (or trigger manually):
   ```bash
   curl -X POST \
     https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. **Verify Expense Created**:
   ```sql
   -- Check expense was created
   SELECT 
     e.id,
     e.amount,
     e.date,
     e.subscription_id,
     s.name as subscription_name
   FROM expenses e
   JOIN subscriptions s ON e.subscription_id = s.id
   WHERE e.subscription_id IS NOT NULL
   ORDER BY e.created_at DESC
   LIMIT 5;
   ```

4. **Check Logs**:
   ```sql
   -- View execution logs
   SELECT * FROM subscription_billing_logs
   ORDER BY execution_start DESC
   LIMIT 1;
   ```

### Step 5: Verify Frontend Features

1. **Timezone Settings**:
   - Navigate to Settings
   - Verify timezone selector is visible
   - Change timezone and save
   - Verify preference is saved

2. **Subscription Creation with Past Bills**:
   - Create subscription with start date 3 months ago
   - Verify preview dialog shows correct count
   - Confirm creation
   - Verify expenses are created in Expenses view

3. **Subscription Indicators**:
   - Navigate to Expenses view
   - Verify subscription-linked expenses show indicator icon
   - Click indicator to navigate to subscription

4. **Subscription Deletion**:
   - Delete a subscription
   - Verify dialog asks about expense handling
   - Test both options (keep/delete expenses)

---

## Rollback Procedures

### If Edge Function Fails

```bash
# Disable cron job immediately
psql $DATABASE_URL -c "UPDATE cron.job SET active = false WHERE jobname = 'process-subscription-bills-hourly';"

# Review logs
supabase functions logs process-subscription-bills --tail 100

# Fix issues and redeploy
supabase functions deploy process-subscription-bills

# Re-enable cron job
psql $DATABASE_URL -c "UPDATE cron.job SET active = true WHERE jobname = 'process-subscription-bills-hourly';"
```

### If Database Migration Fails

```bash
# Restore from backup
psql $DATABASE_URL -f backup-YYYYMMDD-HHMMSS.sql

# Or via Supabase Dashboard:
# Database → Backups → Restore
```

### If Frontend Deployment Fails

```bash
# Revert to previous deployment
# Vercel:
vercel rollback

# Netlify:
netlify rollback

# Manual: Redeploy previous dist/ folder
```

### Emergency Procedures

**If subscriptions are being double-billed**:

```sql
-- Immediately disable cron job
UPDATE cron.job SET active = false 
WHERE jobname = 'process-subscription-bills-hourly';

-- Identify duplicate expenses
SELECT 
  subscription_id,
  date,
  COUNT(*) as duplicate_count
FROM expenses
WHERE subscription_id IS NOT NULL
GROUP BY subscription_id, date
HAVING COUNT(*) > 1;

-- Delete duplicates (keep oldest)
DELETE FROM expenses
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY subscription_id, date 
        ORDER BY created_at ASC
      ) as rn
    FROM expenses
    WHERE subscription_id IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Add unique constraint to prevent future duplicates
-- (Already in schema, but verify)
ALTER TABLE expenses 
ADD CONSTRAINT expenses_subscription_date_unique 
UNIQUE(subscription_id, date) 
WHERE subscription_id IS NOT NULL;
```

**If expenses are not being created**:

```sql
-- Check cron job status
SELECT * FROM cron.job WHERE jobname = 'process-subscription-bills-hourly';

-- Check recent execution logs
SELECT * FROM subscription_billing_logs 
ORDER BY execution_start DESC LIMIT 5;

-- Manually trigger processing
-- Use curl command from Edge Function section

-- Check for subscriptions that should have been processed
SELECT 
  s.id,
  s.name,
  s.next_billing_date,
  s.billing_frequency,
  up.value as timezone,
  COUNT(e.id) as expense_count
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' AND up.key = 'timezone'
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.next_billing_date <= CURRENT_DATE
GROUP BY s.id, s.name, s.next_billing_date, s.billing_frequency, up.value;
```

---

## Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] All tables and indexes created
- [ ] Subscription category exists for all users
- [ ] Edge Function deployed and accessible
- [ ] Edge Function environment variables set
- [ ] Health check endpoint returns 200
- [ ] Cron job registered and active
- [ ] Cron job executed at least once successfully
- [ ] Frontend deployed with correct environment variables
- [ ] End-to-end test passed (subscription → expense creation)
- [ ] Monitoring queries tested
- [ ] Backup created before deployment
- [ ] Rollback procedures documented and tested
- [ ] Team notified of deployment
- [ ] Monitoring alerts configured

---

## Support and Troubleshooting

For issues during deployment, refer to:
- [Monitoring Guide](./MONITORING_GUIDE.md) - For monitoring and troubleshooting
- [Supabase Documentation](https://supabase.com/docs) - For platform-specific issues
- [Edge Functions Logs](https://supabase.com/dashboard) - For function execution issues

Common issues and solutions are documented in the design document under the "Troubleshooting Guide" section.

---

## Deployment Timeline

Estimated deployment time: **2-3 hours**

- Database Migration: 30 minutes
- Edge Function Deployment: 30 minutes
- Cron Job Setup: 15 minutes
- Frontend Deployment: 30 minutes
- Verification: 45 minutes
- Buffer for issues: 30 minutes

**Recommended deployment window**: Low-traffic period (e.g., weekend or late evening)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0   | 2024-01-26 | Initial deployment guide |

