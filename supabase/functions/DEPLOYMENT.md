# Edge Function Deployment Guide

This guide walks you through deploying the `process-subscription-bills` Edge Function to your Supabase project.

## Prerequisites

1. **Supabase CLI**: Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. **Supabase Project**: You need an active Supabase project with:
   - Database tables created (subscriptions, expenses, categories, user_preferences, subscription_billing_logs)
   - Service role key (found in Settings > API)

3. **Database Setup**: Ensure all required tables exist. Run the schema migrations in the `db/` directory if needed.

## Step 1: Login to Supabase

```bash
supabase login
```

This will open a browser window for authentication.

## Step 2: Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual project reference (found in your Supabase project URL).

## Step 3: Deploy the Edge Function

```bash
cd supabase/functions
supabase functions deploy process-subscription-bills
```

The CLI will:
- Bundle the function code
- Upload it to Supabase
- Make it available at: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills`

## Step 4: Verify Deployment

Test the health check endpoint:

```bash
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-21T10:00:00.000Z",
  "version": "1.0.0"
}
```

## Step 5: Test Manual Execution

Before setting up the cron job, test the function manually:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key (Settings > API > service_role key).

Expected response:
```json
{
  "success": true,
  "processedCount": 5,
  "successCount": 5,
  "failedCount": 0,
  "errors": [],
  "executionStart": "2024-12-21T10:00:00.000Z",
  "executionEnd": "2024-12-21T10:00:02.000Z"
}
```

## Step 6: Test Dry Run Mode

Test what would be processed without creating expenses:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

Expected response:
```json
{
  "dryRun": true,
  "wouldProcess": 2,
  "subscriptions": [
    {
      "id": "uuid-1",
      "name": "Netflix",
      "nextBillingDate": "2024-12-21"
    },
    {
      "id": "uuid-2",
      "name": "Spotify",
      "nextBillingDate": "2024-12-21"
    }
  ]
}
```

## Step 7: Set Up Cron Job

### Option A: Using SQL Script

1. Open the `setup-cron.sql` file
2. Replace `YOUR_PROJECT_REF` with your project reference
3. Replace `YOUR_SERVICE_ROLE_KEY` with your service role key
4. Run the SQL script in your Supabase SQL Editor:
   - Go to Supabase Dashboard > SQL Editor
   - Paste the modified SQL
   - Click "Run"

### Option B: Manual SQL Execution

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Edge Function to run hourly
SELECT cron.schedule(
  'process-subscription-bills-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

## Step 8: Verify Cron Job

Check that the cron job is registered:

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname = 'process-subscription-bills-hourly';
```

Expected result:
```
jobid | jobname                            | schedule    | active | command
------|-----------------------------------|-------------|--------|----------
1     | process-subscription-bills-hourly | 0 * * * *   | true   | SELECT net.http_post(...)
```

## Step 9: Monitor First Execution

Wait for the next hour (when the cron job runs) and check the logs:

```sql
-- Check execution logs
SELECT * FROM subscription_billing_logs
ORDER BY execution_start DESC
LIMIT 5;

-- Check cron job run history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-bills-hourly')
ORDER BY start_time DESC 
LIMIT 10;
```

## Step 10: View Function Logs

In Supabase Dashboard:
1. Navigate to: Edge Functions > process-subscription-bills
2. Click on "Logs" tab
3. View real-time logs and filter by level (INFO, ERROR)

## Troubleshooting

### Function Not Deploying

**Error**: `Failed to deploy function`

**Solution**:
- Ensure you're logged in: `supabase login`
- Verify project link: `supabase link --project-ref YOUR_PROJECT_REF`
- Check your internet connection
- Try deploying again

### Cron Job Not Running

**Error**: No executions in `subscription_billing_logs`

**Solution**:
1. Verify cron job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-subscription-bills-hourly';
   ```

2. Check if pg_cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

3. Manually trigger the function to test:
   ```bash
   curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

### Function Returns 500 Error

**Error**: `{"success": false, "error": "..."}`

**Solution**:
1. Check function logs in Supabase Dashboard
2. Verify all required tables exist
3. Ensure subscription category exists:
   ```sql
   SELECT * FROM categories WHERE name = 'subscription';
   ```
4. Check for database connection issues

### No Subscriptions Processed

**Error**: `processedCount: 0`

**Solution**:
1. Verify subscriptions exist with today's billing date:
   ```sql
   SELECT * FROM subscriptions 
   WHERE next_billing_date = CURRENT_DATE;
   ```

2. Check user timezone preferences:
   ```sql
   SELECT * FROM user_preferences 
   WHERE category = 'general' AND key = 'timezone';
   ```

3. Use dry-run mode to see what would be processed

## Updating the Function

To update the function after making changes:

```bash
cd supabase/functions
supabase functions deploy process-subscription-bills
```

The new version will be deployed immediately.

## Unscheduling the Cron Job

If you need to stop the automatic processing:

```sql
SELECT cron.unschedule('process-subscription-bills-hourly');
```

To re-enable, run the setup-cron.sql script again.

## Environment Variables

The function automatically has access to:
- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

These are injected by Supabase and don't need to be configured manually.

## Security Notes

- The service role key has admin access - keep it secure
- Never commit the service role key to version control
- Use environment variables or Supabase secrets for sensitive data
- The function bypasses Row Level Security (RLS) - ensure proper validation

## Performance Optimization

For large numbers of subscriptions (>1000):
- Consider batching: Process subscriptions in chunks
- Add database indexes on frequently queried columns
- Monitor execution time and adjust cron frequency if needed

## Next Steps

1. Monitor the first few executions
2. Set up alerting for failures (see monitoring guide)
3. Review execution logs regularly
4. Adjust cron schedule if needed (e.g., every 30 minutes: `*/30 * * * *`)

## Support

For issues or questions:
- Check Supabase Edge Functions documentation: https://supabase.com/docs/guides/functions
- Review function logs in Supabase Dashboard
- Check `subscription_billing_logs` table for execution history
