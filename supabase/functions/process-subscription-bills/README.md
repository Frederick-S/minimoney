# Process Subscription Bills Edge Function

This Supabase Edge Function automatically processes subscription billing events by creating expense records for subscriptions that are due for billing.

## Features

- **Timezone-aware processing**: Handles subscriptions in each user's timezone
- **Automatic expense creation**: Creates expense records for due subscriptions
- **Next billing date updates**: Automatically calculates and updates next billing dates
- **End date handling**: Respects subscription end dates and auto-renew settings
- **Error handling**: Implements retry logic with exponential backoff
- **Execution logging**: Logs all executions to `subscription_billing_logs` table
- **Health check endpoint**: Provides a health check endpoint for monitoring
- **Dry-run mode**: Test processing without creating actual expenses

## Prerequisites

1. Supabase project with the following tables:
   - `subscriptions`
   - `expenses`
   - `categories`
   - `user_preferences`
   - `subscription_billing_logs`

2. Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

## Deployment

### 1. Deploy the Edge Function

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy process-subscription-bills
```

### 2. Set Environment Variables

The function requires the following environment variables (automatically available in Supabase Edge Functions):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (has admin access)

These are automatically injected by Supabase when the function runs.

### 3. Set Up Cron Job

Create a cron job in your Supabase database to run the function hourly:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Edge Function to run hourly
SELECT cron.schedule(
  'process-subscription-bills-hourly',
  '0 * * * *',  -- Every hour at :00
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

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key (from Settings > API)

### 4. Verify Cron Job

Check that the cron job is registered:

```sql
SELECT * FROM cron.job;
```

## Usage

### Manual Trigger

You can manually trigger the function for testing:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Dry Run Mode

Test what would be processed without creating expenses:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### Health Check

Check if the function is running:

```bash
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health
```

## Monitoring

### View Execution Logs

Query the `subscription_billing_logs` table:

```sql
-- Recent executions
SELECT 
  execution_start,
  execution_end,
  status,
  processed_count,
  success_count,
  failed_count,
  EXTRACT(EPOCH FROM (execution_end - execution_start)) as duration_seconds
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '24 hours'
ORDER BY execution_start DESC;
```

### Success Rate

```sql
-- Success rate over last 7 days
SELECT 
  DATE(execution_start) as date,
  COUNT(*) as total_executions,
  SUM(processed_count) as total_processed,
  SUM(success_count) as total_success,
  SUM(failed_count) as total_failed,
  ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) as success_rate_percent
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY DATE(execution_start)
ORDER BY date DESC;
```

### Failed Subscriptions

```sql
-- Get subscriptions that failed in recent executions
SELECT 
  l.execution_start,
  e->>'subscriptionId' as subscription_id,
  e->>'subscriptionName' as subscription_name,
  e->>'error' as error_message
FROM subscription_billing_logs l,
     jsonb_array_elements(l.error_details->'errors') e
WHERE l.execution_start > NOW() - INTERVAL '24 hours'
  AND l.failed_count > 0
ORDER BY l.execution_start DESC;
```

### View Function Logs

In Supabase Dashboard:
1. Go to Edge Functions
2. Select `process-subscription-bills`
3. Click on "Logs" tab
4. Filter by time range and log level

## How It Works

1. **Fetch Subscriptions**: Retrieves all active subscriptions with user timezone preferences
2. **Timezone Conversion**: Converts current UTC time to each user's local timezone
3. **Date Comparison**: Compares subscription's `next_billing_date` with current date in user's timezone
4. **Expense Creation**: Creates expense record for matching subscriptions
5. **Next Billing Date Update**: Calculates and updates next billing date based on frequency
6. **End Date Check**: Skips update if next billing date would exceed end date
7. **Error Handling**: Retries failed operations up to 3 times with exponential backoff
8. **Logging**: Records execution results in `subscription_billing_logs` table

## Error Handling

The function implements robust error handling:

- **Retry Logic**: Failed operations are retried up to 3 times with exponential backoff (1s, 2s, 4s)
- **Error Isolation**: Errors in one subscription don't affect others
- **Detailed Logging**: All errors are logged with subscription details
- **Graceful Degradation**: Function continues processing even if some subscriptions fail

## Troubleshooting

### Subscription Not Processed

1. Check user's timezone preference:
   ```sql
   SELECT value FROM user_preferences 
   WHERE user_id = 'USER_ID' 
   AND category = 'general' 
   AND key = 'timezone';
   ```

2. Verify next_billing_date:
   ```sql
   SELECT id, name, next_billing_date, end_date 
   FROM subscriptions 
   WHERE user_id = 'USER_ID';
   ```

3. Check execution logs for errors:
   ```sql
   SELECT * FROM subscription_billing_logs 
   WHERE error_details IS NOT NULL 
   ORDER BY execution_start DESC 
   LIMIT 10;
   ```

### Duplicate Expenses

If duplicate expenses are created, add a unique constraint:

```sql
ALTER TABLE expenses 
ADD CONSTRAINT expenses_subscription_date_unique 
UNIQUE (subscription_id, date);
```

### Function Not Running

1. Verify cron job is active:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-subscription-bills-hourly';
   ```

2. Check cron job history:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-bills-hourly')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

3. Manually trigger the function to test

## Performance

- **Expected execution time**: < 30 seconds for < 1000 subscriptions
- **Recommended frequency**: Hourly (ensures max 1-hour delay for any timezone)
- **Scalability**: Can handle up to 10,000 subscriptions per execution

## Security

- Uses service role key (bypasses RLS)
- Validates user_id before creating expenses
- All database operations are parameterized to prevent SQL injection
- Logs are sanitized to prevent sensitive data exposure

## Version History

- **1.0.0** (2024-12-21): Initial release
  - Timezone-aware processing
  - Automatic expense creation
  - Retry logic with exponential backoff
  - Execution logging
  - Health check endpoint
  - Dry-run mode
