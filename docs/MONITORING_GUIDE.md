# Subscription Expense Persistence - Monitoring and Troubleshooting Guide

This guide provides comprehensive instructions for monitoring the subscription billing automation system, accessing logs, running diagnostic queries, and troubleshooting common issues.

## Table of Contents

1. [Overview](#overview)
2. [Accessing Logs](#accessing-logs)
3. [Monitoring Queries](#monitoring-queries)
4. [Key Metrics and Alerts](#key-metrics-and-alerts)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [Debugging Tools](#debugging-tools)
7. [Performance Monitoring](#performance-monitoring)
8. [Alerting Setup](#alerting-setup)
9. [Emergency Procedures](#emergency-procedures)

---

## Overview

The subscription billing automation system consists of:

- **Supabase Edge Function**: `process-subscription-bills` - Processes due subscriptions
- **Cron Job**: Runs hourly via pg_cron to trigger the Edge Function
- **Database Tables**: 
  - `subscription_billing_logs` - Execution logs and statistics
  - `subscription_audit_log` - Subscription change history
  - `expenses` - Generated expense records
  - `subscriptions` - Subscription data

**Monitoring Goals**:
- Ensure cron job runs hourly without failures
- Verify subscriptions are processed correctly
- Detect and alert on errors quickly
- Track system performance and health

---

## Accessing Logs

### 1. Edge Function Logs

#### Via Supabase Dashboard

1. Navigate to **Edge Functions** in Supabase Dashboard
2. Select **process-subscription-bills**
3. Click **Logs** tab
4. Filter by:
   - Time range (last hour, 24 hours, 7 days)
   - Log level (INFO, WARN, ERROR)
   - Search text (subscription ID, user ID, error message)


#### Via Supabase CLI

```bash
# View real-time logs (follow mode)
supabase functions logs process-subscription-bills --follow

# View last 100 log entries
supabase functions logs process-subscription-bills --tail 100

# Filter by time range
supabase functions logs process-subscription-bills --since 1h

# Search for specific text
supabase functions logs process-subscription-bills | grep "ERROR"
```

#### Log Format

Edge Function logs use structured JSON format:

```json
{
  "level": "INFO|WARN|ERROR",
  "timestamp": "2024-01-26T12:00:00.000Z",
  "message": "Description of event",
  "data": {
    "subscriptionId": "uuid",
    "userId": "uuid",
    "subscriptionName": "Netflix",
    "error": "Error message (if applicable)"
  }
}
```

**Log Levels**:
- `INFO`: Normal execution flow (start, end, success)
- `WARN`: Recoverable issues (retry attempts, skipped subscriptions)
- `ERROR`: Failures (database errors, processing failures)

### 2. Database Execution Logs

Query the `subscription_billing_logs` table for execution history:

```sql
-- View recent executions (last 24 hours)
SELECT 
  id,
  execution_start,
  execution_end,
  status,
  processed_count,
  success_count,
  failed_count,
  EXTRACT(EPOCH FROM (execution_end - execution_start)) as duration_seconds,
  created_at
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '24 hours'
ORDER BY execution_start DESC;
```

**Status Values**:
- `running`: Execution in progress
- `completed`: Execution finished successfully
- `failed`: Execution failed with critical error

### 3. Cron Job Logs

Query pg_cron execution history:

```sql
-- View recent cron job executions
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  status,
  return_message,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'process-subscription-bills-hourly'
)
ORDER BY start_time DESC 
LIMIT 20;
```

**Status Values**:
- `succeeded`: Cron job triggered successfully
- `failed`: Cron job failed to trigger

**Note**: A successful cron job trigger doesn't mean the Edge Function succeeded. Check `subscription_billing_logs` for actual processing results.

### 4. Audit Logs

Track subscription changes:

```sql
-- View recent subscription changes
SELECT 
  sal.id,
  sal.subscription_id,
  sal.action,
  sal.old_values,
  sal.new_values,
  sal.changed_by,
  sal.created_at,
  s.name as subscription_name
FROM subscription_audit_log sal
LEFT JOIN subscriptions s ON sal.subscription_id = s.id
WHERE sal.created_at > NOW() - INTERVAL '7 days'
ORDER BY sal.created_at DESC
LIMIT 50;
```

---

## Monitoring Queries

### Execution Health Checks

#### 1. Recent Execution Summary

```sql
-- Summary of last 24 hours
SELECT 
  COUNT(*) as total_executions,
  SUM(processed_count) as total_processed,
  SUM(success_count) as total_success,
  SUM(failed_count) as total_failed,
  ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) as success_rate_percent,
  AVG(EXTRACT(EPOCH FROM (execution_end - execution_start))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (execution_end - execution_start))) as max_duration_seconds
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '24 hours'
  AND status = 'completed';
```

**Expected Values**:
- `total_executions`: ~24 (hourly execution)
- `success_rate_percent`: > 95%
- `avg_duration_seconds`: < 30 seconds
- `max_duration_seconds`: < 60 seconds

#### 2. Success Rate Trend (Last 7 Days)

```sql
-- Daily success rate over last 7 days
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

#### 3. Failed Subscriptions

```sql
-- Get subscriptions that failed in recent executions
SELECT 
  l.execution_start,
  e->>'subscriptionId' as subscription_id,
  e->>'userId' as user_id,
  e->>'subscriptionName' as subscription_name,
  e->>'error' as error_message,
  e->>'timestamp' as error_timestamp
FROM subscription_billing_logs l,
     jsonb_array_elements(l.error_details->'errors') e
WHERE l.execution_start > NOW() - INTERVAL '24 hours'
  AND l.failed_count > 0
ORDER BY l.execution_start DESC;
```

#### 4. Execution Gaps (Missing Cron Runs)

```sql
-- Detect gaps in hourly execution (should run every hour)
WITH execution_times AS (
  SELECT 
    execution_start,
    LAG(execution_start) OVER (ORDER BY execution_start) as previous_execution,
    EXTRACT(EPOCH FROM (execution_start - LAG(execution_start) OVER (ORDER BY execution_start))) / 3600 as hours_gap
  FROM subscription_billing_logs
  WHERE execution_start > NOW() - INTERVAL '24 hours'
)
SELECT 
  previous_execution,
  execution_start,
  hours_gap
FROM execution_times
WHERE hours_gap > 1.5  -- Alert if gap > 1.5 hours
ORDER BY execution_start DESC;
```

### Subscription Health Checks

#### 5. Subscriptions Due for Processing

```sql
-- Check subscriptions that should be processed today
SELECT 
  s.id,
  s.user_id,
  s.name,
  s.amount,
  s.quantity,
  s.billing_frequency,
  s.next_billing_date,
  s.end_date,
  s.is_auto_renew,
  up.value as user_timezone,
  COUNT(e.id) as expense_count,
  MAX(e.date) as last_expense_date
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' 
  AND up.key = 'timezone'
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.next_billing_date <= CURRENT_DATE
  AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
GROUP BY s.id, s.user_id, s.name, s.amount, s.quantity, 
         s.billing_frequency, s.next_billing_date, s.end_date, 
         s.is_auto_renew, up.value
ORDER BY s.next_billing_date;
```

#### 6. Subscriptions with Missing Expenses

```sql
-- Find subscriptions that should have expenses but don't
SELECT 
  s.id,
  s.name,
  s.start_date,
  s.next_billing_date,
  s.billing_frequency,
  COUNT(e.id) as expense_count
FROM subscriptions s
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.start_date < CURRENT_DATE
  AND s.next_billing_date > s.start_date
GROUP BY s.id, s.name, s.start_date, s.next_billing_date, s.billing_frequency
HAVING COUNT(e.id) = 0
ORDER BY s.start_date;
```

#### 7. Duplicate Expenses Check

```sql
-- Detect duplicate expenses for same subscription and date
SELECT 
  subscription_id,
  date,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as expense_ids,
  ARRAY_AGG(amount) as amounts
FROM expenses
WHERE subscription_id IS NOT NULL
GROUP BY subscription_id, date
HAVING COUNT(*) > 1
ORDER BY date DESC;
```

### Performance Monitoring

#### 8. Database Query Performance

```sql
-- Monitor slow queries related to subscription billing
-- Requires pg_stat_statements extension
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements
WHERE query LIKE '%subscriptions%'
  OR query LIKE '%expenses%'
  OR query LIKE '%subscription_billing_logs%'
ORDER BY mean_time DESC
LIMIT 10;
```

#### 9. Index Usage Statistics

```sql
-- Verify indexes are being used efficiently
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('subscriptions', 'expenses', 'user_preferences', 'subscription_billing_logs')
ORDER BY tablename, idx_scan DESC;
```

**What to look for**:
- `idx_scan` should be > 0 for frequently used indexes
- Low scan counts may indicate unused indexes
- Compare index size vs usage to identify optimization opportunities

#### 10. Table Size and Growth

```sql
-- Monitor table sizes and row counts
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  n_live_tup as row_count,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE tablename IN ('subscriptions', 'expenses', 'subscription_billing_logs', 'subscription_audit_log')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Key Metrics and Alerts

### Critical Metrics

| Metric | Expected Value | Alert Threshold | Priority |
|--------|---------------|-----------------|----------|
| Cron execution frequency | 24 per day | < 20 in 24h | Critical |
| Success rate | > 95% | < 90% | Critical |
| Processing time | < 30s avg | > 60s | Warning |
| Failed subscriptions | < 5% | > 10% | Warning |
| Execution gaps | 0 | > 1.5 hours | Critical |
| Duplicate expenses | 0 | > 0 | Critical |

### Monitoring Dashboard Query

```sql
-- Single query for monitoring dashboard
SELECT 
  -- Execution metrics (last 24 hours)
  (SELECT COUNT(*) FROM subscription_billing_logs 
   WHERE execution_start > NOW() - INTERVAL '24 hours') as executions_24h,
  
  (SELECT SUM(processed_count) FROM subscription_billing_logs 
   WHERE execution_start > NOW() - INTERVAL '24 hours') as processed_24h,
  
  (SELECT SUM(success_count) FROM subscription_billing_logs 
   WHERE execution_start > NOW() - INTERVAL '24 hours') as success_24h,
  
  (SELECT SUM(failed_count) FROM subscription_billing_logs 
   WHERE execution_start > NOW() - INTERVAL '24 hours') as failed_24h,
  
  (SELECT ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2)
   FROM subscription_billing_logs 
   WHERE execution_start > NOW() - INTERVAL '24 hours') as success_rate_24h,
  
  -- Last execution
  (SELECT execution_start FROM subscription_billing_logs 
   ORDER BY execution_start DESC LIMIT 1) as last_execution,
  
  (SELECT status FROM subscription_billing_logs 
   ORDER BY execution_start DESC LIMIT 1) as last_status,
  
  -- Active subscriptions
  (SELECT COUNT(*) FROM subscriptions 
   WHERE end_date IS NULL OR end_date >= CURRENT_DATE) as active_subscriptions,
  
  -- Subscriptions due today
  (SELECT COUNT(*) FROM subscriptions 
   WHERE next_billing_date = CURRENT_DATE 
   AND (end_date IS NULL OR end_date >= CURRENT_DATE)) as due_today,
  
  -- Duplicate expenses
  (SELECT COUNT(*) FROM (
    SELECT subscription_id, date 
    FROM expenses 
    WHERE subscription_id IS NOT NULL 
    GROUP BY subscription_id, date 
    HAVING COUNT(*) > 1
  ) duplicates) as duplicate_expenses;
```

---

## Common Issues and Solutions

### Issue 1: Subscription Not Processed

**Symptoms**:
- Subscription's `next_billing_date` has passed
- No expense created for the billing date
- No errors in logs

**Diagnosis**:

```sql
-- Check subscription details
SELECT 
  s.*,
  up.value as user_timezone,
  COUNT(e.id) as expense_count
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' AND up.key = 'timezone'
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.id = 'SUBSCRIPTION_ID_HERE'
GROUP BY s.id, up.value;
```

**Common Causes and Solutions**:

1. **Timezone Mismatch**
   - **Cause**: User's timezone not set or incorrect
   - **Solution**: 
     ```sql
     -- Check user's timezone
     SELECT value FROM user_preferences 
     WHERE user_id = 'USER_ID' 
     AND category = 'general' AND key = 'timezone';
     
     -- Set correct timezone if missing
     INSERT INTO user_preferences (user_id, category, key, value)
     VALUES ('USER_ID', 'general', 'timezone', 'Asia/Shanghai')
     ON CONFLICT (user_id, category, key) 
     DO UPDATE SET value = 'Asia/Shanghai';
     ```

2. **Subscription Expired**
   - **Cause**: `end_date` is before current date
   - **Solution**: Update end date or remove it
     ```sql
     UPDATE subscriptions 
     SET end_date = NULL, updated_at = NOW()
     WHERE id = 'SUBSCRIPTION_ID';
     ```

3. **Cron Job Not Running**
   - **Cause**: Cron job disabled or failed
   - **Solution**: Check cron job status and re-enable
     ```sql
     -- Check if cron job is active
     SELECT * FROM cron.job 
     WHERE jobname = 'process-subscription-bills-hourly';
     
     -- Re-enable if disabled
     UPDATE cron.job 
     SET active = true 
     WHERE jobname = 'process-subscription-bills-hourly';
     ```

4. **Manual Processing**
   - **Solution**: Manually trigger Edge Function
     ```bash
     curl -X POST \
       https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
       -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
       -H "Content-Type: application/json" \
       -d '{}'
     ```

### Issue 2: Duplicate Expenses Created

**Symptoms**:
- Multiple expenses with same `subscription_id` and `date`
- User reports double-billing

**Diagnosis**:

```sql
-- Find duplicates
SELECT 
  subscription_id,
  date,
  COUNT(*) as count,
  ARRAY_AGG(id ORDER BY created_at) as expense_ids,
  ARRAY_AGG(created_at ORDER BY created_at) as created_times
FROM expenses
WHERE subscription_id = 'SUBSCRIPTION_ID_HERE'
GROUP BY subscription_id, date
HAVING COUNT(*) > 1;
```

**Solutions**:

1. **Delete Duplicate Expenses** (keep oldest)
   ```sql
   -- Delete duplicates, keeping the first created
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
   ```

2. **Prevent Future Duplicates**
   ```sql
   -- Add unique constraint (if not already present)
   CREATE UNIQUE INDEX expenses_subscription_date_unique 
   ON expenses(subscription_id, date) 
   WHERE subscription_id IS NOT NULL;
   ```

3. **Check Cron Job Execution**
   ```sql
   -- Look for duplicate cron executions
   SELECT 
     DATE_TRUNC('hour', execution_start) as hour,
     COUNT(*) as execution_count
   FROM subscription_billing_logs
   WHERE execution_start > NOW() - INTERVAL '7 days'
   GROUP BY DATE_TRUNC('hour', execution_start)
   HAVING COUNT(*) > 1
   ORDER BY hour DESC;
   ```

### Issue 3: Missing Expenses for Past Bills

**Symptoms**:
- Subscription created with historical start date
- User confirmed past bills creation
- Expenses not created

**Diagnosis**:

```sql
-- Check subscription and expenses
SELECT 
  s.id,
  s.name,
  s.start_date,
  s.next_billing_date,
  s.billing_frequency,
  s.created_at,
  COUNT(e.id) as expense_count,
  MIN(e.date) as first_expense,
  MAX(e.date) as last_expense
FROM subscriptions s
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.id = 'SUBSCRIPTION_ID_HERE'
GROUP BY s.id;
```

**Solutions**:

1. **Check Audit Log**
   ```sql
   -- See if expenses were created and deleted
   SELECT * FROM subscription_audit_log
   WHERE subscription_id = 'SUBSCRIPTION_ID_HERE'
   ORDER BY created_at DESC;
   ```

2. **Manually Generate Past Bills**
   - Use the frontend: Edit subscription, change start date to trigger regeneration
   - Or manually create expenses:
     ```sql
     -- Example: Create monthly expenses from start date to today
     INSERT INTO expenses (user_id, amount, category_id, date, subscription_id)
     SELECT 
       s.user_id,
       s.amount * s.quantity,
       c.id as category_id,
       generate_series(
         s.start_date::date,
         CURRENT_DATE,
         '1 month'::interval
       )::date as date,
       s.id
     FROM subscriptions s
     JOIN categories c ON c.user_id = s.user_id AND c.name = 'subscription'
     WHERE s.id = 'SUBSCRIPTION_ID_HERE'
     ON CONFLICT (subscription_id, date) DO NOTHING;
     ```

### Issue 4: Timezone Issues

**Symptoms**:
- Expenses created on wrong date
- Billing happens at unexpected times
- User in different timezone than expected

**Diagnosis**:

```sql
-- Check user's timezone and recent expenses
SELECT 
  s.id,
  s.name,
  s.next_billing_date,
  up.value as user_timezone,
  e.date as expense_date,
  e.created_at as expense_created
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' AND up.key = 'timezone'
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.id = 'SUBSCRIPTION_ID_HERE'
ORDER BY e.date DESC
LIMIT 5;
```

**Solutions**:

1. **Update User's Timezone**
   ```sql
   -- Set correct timezone
   INSERT INTO user_preferences (user_id, category, key, value)
   VALUES ('USER_ID', 'general', 'timezone', 'America/New_York')
   ON CONFLICT (user_id, category, key) 
   DO UPDATE SET value = 'America/New_York';
   ```

2. **Test Timezone Conversion**
   ```sql
   -- Test what date would be used for a timezone
   SELECT 
     NOW() as utc_now,
     NOW() AT TIME ZONE 'Asia/Shanghai' as shanghai_time,
     (NOW() AT TIME ZONE 'Asia/Shanghai')::date as shanghai_date,
     NOW() AT TIME ZONE 'America/New_York' as ny_time,
     (NOW() AT TIME ZONE 'America/New_York')::date as ny_date;
   ```

3. **Verify Edge Function Timezone Logic**
   - Check Edge Function logs for timezone information
   - Look for `userTimezone` and `currentDate` in log data

### Issue 5: Performance Degradation

**Symptoms**:
- Edge Function taking > 60 seconds
- Cron job timing out
- Database queries slow

**Diagnosis**:

```sql
-- Check execution times
SELECT 
  execution_start,
  EXTRACT(EPOCH FROM (execution_end - execution_start)) as duration_seconds,
  processed_count,
  success_count,
  failed_count
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
ORDER BY duration_seconds DESC
LIMIT 10;

-- Check active subscription count
SELECT COUNT(*) as active_subscriptions
FROM subscriptions
WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('subscriptions', 'expenses')
  AND idx_scan = 0;
```

**Solutions**:

1. **Verify Indexes Exist**
   ```sql
   -- Check critical indexes
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE tablename IN ('subscriptions', 'expenses')
   ORDER BY tablename, indexname;
   
   -- Create missing indexes if needed
   CREATE INDEX IF NOT EXISTS subscriptions_next_billing_date_idx 
   ON subscriptions(next_billing_date);
   
   CREATE INDEX IF NOT EXISTS expenses_subscription_id_idx 
   ON expenses(subscription_id);
   ```

2. **Analyze Query Plans**
   ```sql
   -- Analyze subscription query
   EXPLAIN ANALYZE
   SELECT * FROM subscriptions
   WHERE next_billing_date = CURRENT_DATE
     AND (end_date IS NULL OR end_date >= CURRENT_DATE);
   ```

3. **Optimize Large Datasets**
   - If processing > 10,000 subscriptions, consider batching
   - Archive old billing logs (keep last 90 days)
   ```sql
   -- Archive old logs
   DELETE FROM subscription_billing_logs
   WHERE execution_start < NOW() - INTERVAL '90 days';
   ```

### Issue 6: Edge Function Not Responding

**Symptoms**:
- Health check endpoint returns 500 or timeout
- Cron job fails to trigger function
- No logs in Edge Function dashboard

**Diagnosis**:

```bash
# Test health check
curl -v https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health

# Check Edge Function status in dashboard
# Navigate to: Edge Functions → process-subscription-bills
```

**Solutions**:

1. **Redeploy Edge Function**
   ```bash
   supabase functions deploy process-subscription-bills
   ```

2. **Verify Environment Variables**
   ```bash
   # Check secrets are set
   supabase secrets list
   
   # Reset if needed
   supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY
   ```

3. **Check Supabase Status**
   - Visit: https://status.supabase.com
   - Check for platform-wide issues

4. **Review Recent Deployments**
   - Check if recent code changes broke the function
   - Rollback if necessary

### Issue 7: High Failure Rate

**Symptoms**:
- Success rate < 90%
- Many errors in logs
- Multiple subscriptions failing

**Diagnosis**:

```sql
-- Get error details
SELECT 
  execution_start,
  failed_count,
  error_details->'errors' as errors
FROM subscription_billing_logs
WHERE failed_count > 0
  AND execution_start > NOW() - INTERVAL '24 hours'
ORDER BY execution_start DESC;

-- Group errors by type
SELECT 
  e->>'error' as error_type,
  COUNT(*) as occurrence_count
FROM subscription_billing_logs l,
     jsonb_array_elements(l.error_details->'errors') e
WHERE l.execution_start > NOW() - INTERVAL '7 days'
GROUP BY e->>'error'
ORDER BY occurrence_count DESC;
```

**Solutions**:

1. **Database Connection Issues**
   - Check Supabase database status
   - Verify connection limits not exceeded
   - Review RLS policies for service role

2. **Category Missing**
   ```sql
   -- Ensure subscription category exists for all users
   INSERT INTO categories (
     user_id, system_category_id, name, display_name, 
     color, chart_color, icon, is_default, level, path
   )
   SELECT 
     u.id, sc.id, sc.name, sc.display_name,
     sc.color, sc.chart_color, sc.icon, true, sc.level, sc.path
   FROM auth.users u
   CROSS JOIN system_categories sc
   WHERE sc.name = 'subscription'
     AND NOT EXISTS (
       SELECT 1 FROM categories c 
       WHERE c.user_id = u.id AND c.name = 'subscription'
     );
   ```

3. **Data Validation Issues**
   - Check for invalid dates, amounts, or currencies
   - Review subscription data quality
   ```sql
   -- Find subscriptions with invalid data
   SELECT * FROM subscriptions
   WHERE amount <= 0 
      OR quantity <= 0
      OR next_billing_date IS NULL
      OR start_date IS NULL;
   ```

---

## Debugging Tools

### 1. Dry Run Mode

Test what would be processed without creating actual expenses:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

**Response**:
```json
{
  "dryRun": true,
  "wouldProcess": 5,
  "subscriptions": [
    {
      "id": "uuid",
      "name": "Netflix",
      "nextBillingDate": "2024-01-26"
    }
  ]
}
```

### 2. Manual Execution

Manually trigger the Edge Function for testing:

```bash
# Full execution (creates expenses)
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response**:
```json
{
  "success": true,
  "processedCount": 10,
  "successCount": 9,
  "failedCount": 1,
  "errors": [
    {
      "subscriptionId": "uuid",
      "userId": "uuid",
      "subscriptionName": "Spotify",
      "error": "Failed to create expense: ...",
      "timestamp": "2024-01-26T12:00:00.000Z"
    }
  ],
  "executionStart": "2024-01-26T12:00:00.000Z",
  "executionEnd": "2024-01-26T12:00:05.000Z"
}
```

### 3. Subscription Status Check

Check detailed status of a specific subscription:

```sql
-- Comprehensive subscription check
SELECT 
  s.id,
  s.user_id,
  s.name,
  s.amount,
  s.quantity,
  s.currency,
  s.billing_frequency,
  s.is_auto_renew,
  s.start_date,
  s.end_date,
  s.next_billing_date,
  s.created_at,
  s.updated_at,
  up.value as user_timezone,
  c.id as category_id,
  c.name as category_name,
  COUNT(e.id) as total_expenses,
  MIN(e.date) as first_expense_date,
  MAX(e.date) as last_expense_date,
  SUM(e.amount) as total_expense_amount,
  -- Calculate expected expense count
  CASE 
    WHEN s.billing_frequency = 'monthly' THEN
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.start_date::date)) * 12 +
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.start_date::date))
    WHEN s.billing_frequency = 'yearly' THEN
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.start_date::date))
  END as expected_expense_count
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' AND up.key = 'timezone'
LEFT JOIN categories c ON c.user_id = s.user_id AND c.name = 'subscription'
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.id = 'SUBSCRIPTION_ID_HERE'
GROUP BY s.id, up.value, c.id, c.name;
```

### 4. Timezone Testing

Test timezone conversions:

```sql
-- Test timezone conversion for current time
SELECT 
  NOW() as utc_now,
  NOW() AT TIME ZONE 'Asia/Shanghai' as shanghai_time,
  (NOW() AT TIME ZONE 'Asia/Shanghai')::date as shanghai_date,
  NOW() AT TIME ZONE 'America/New_York' as ny_time,
  (NOW() AT TIME ZONE 'America/New_York')::date as ny_date,
  NOW() AT TIME ZONE 'Europe/London' as london_time,
  (NOW() AT TIME ZONE 'Europe/London')::date as london_date;

-- Test for specific subscription
SELECT 
  s.id,
  s.name,
  s.next_billing_date,
  up.value as user_timezone,
  CURRENT_DATE as utc_date,
  (NOW() AT TIME ZONE COALESCE(up.value, 'UTC'))::date as user_local_date,
  CASE 
    WHEN s.next_billing_date = (NOW() AT TIME ZONE COALESCE(up.value, 'UTC'))::date::text
    THEN 'WOULD PROCESS'
    ELSE 'WOULD SKIP'
  END as processing_status
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' AND up.key = 'timezone'
WHERE s.id = 'SUBSCRIPTION_ID_HERE';
```

### 5. Expense Verification

Verify expenses were created correctly:

```sql
-- Check expenses for a subscription
SELECT 
  e.id,
  e.date,
  e.amount,
  e.subscription_id,
  e.category_id,
  e.created_at,
  s.name as subscription_name,
  s.amount as subscription_amount,
  s.quantity as subscription_quantity,
  s.amount * s.quantity as expected_amount,
  CASE 
    WHEN e.amount = s.amount * s.quantity THEN 'CORRECT'
    ELSE 'MISMATCH'
  END as amount_check
FROM expenses e
JOIN subscriptions s ON e.subscription_id = s.id
WHERE e.subscription_id = 'SUBSCRIPTION_ID_HERE'
ORDER BY e.date DESC;
```

### 6. Cron Job Testing

Test cron job configuration:

```sql
-- View cron job details
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobid
FROM cron.job
WHERE jobname = 'process-subscription-bills-hourly';

-- Manually trigger cron job (for testing)
-- Note: This executes the SQL command, which calls the Edge Function
SELECT cron.schedule(
  'test-subscription-bills-once',
  '* * * * *',  -- Run once in next minute
  $
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $
);

-- Remove test job after verification
SELECT cron.unschedule('test-subscription-bills-once');
```

### 7. Log Analysis Scripts

Analyze logs for patterns:

```sql
-- Error frequency by hour
SELECT 
  DATE_TRUNC('hour', execution_start) as hour,
  COUNT(*) as executions,
  SUM(failed_count) as total_failures,
  AVG(failed_count) as avg_failures_per_execution
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', execution_start)
HAVING SUM(failed_count) > 0
ORDER BY hour DESC;

-- Most problematic subscriptions
SELECT 
  e->>'subscriptionId' as subscription_id,
  e->>'subscriptionName' as subscription_name,
  COUNT(*) as failure_count,
  ARRAY_AGG(DISTINCT e->>'error') as error_types,
  MIN(l.execution_start) as first_failure,
  MAX(l.execution_start) as last_failure
FROM subscription_billing_logs l,
     jsonb_array_elements(l.error_details->'errors') e
WHERE l.execution_start > NOW() - INTERVAL '30 days'
GROUP BY e->>'subscriptionId', e->>'subscriptionName'
ORDER BY failure_count DESC
LIMIT 20;
```

---

## Performance Monitoring

### Database Performance

#### 1. Connection Pool Monitoring

```sql
-- Check active connections
SELECT 
  datname,
  usename,
  application_name,
  client_addr,
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connection_count DESC;
```

#### 2. Lock Monitoring

```sql
-- Check for locks that might slow processing
SELECT 
  l.locktype,
  l.relation::regclass,
  l.mode,
  l.granted,
  a.usename,
  a.query,
  a.query_start
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation IN (
  'subscriptions'::regclass,
  'expenses'::regclass,
  'subscription_billing_logs'::regclass
)
ORDER BY l.granted, a.query_start;
```

#### 3. Table Bloat Check

```sql
-- Check for table bloat (dead tuples)
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_percent,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE tablename IN ('subscriptions', 'expenses', 'subscription_billing_logs')
ORDER BY dead_tuple_percent DESC;

-- Manually vacuum if needed
VACUUM ANALYZE subscriptions;
VACUUM ANALYZE expenses;
VACUUM ANALYZE subscription_billing_logs;
```

### Edge Function Performance

#### 1. Execution Time Trends

```sql
-- Execution time trends over last 7 days
SELECT 
  DATE(execution_start) as date,
  COUNT(*) as executions,
  AVG(EXTRACT(EPOCH FROM (execution_end - execution_start))) as avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (execution_end - execution_start))) as min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (execution_end - execution_start))) as max_duration_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (execution_end - execution_start))) as p95_duration_seconds
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
  AND execution_end IS NOT NULL
GROUP BY DATE(execution_start)
ORDER BY date DESC;
```

#### 2. Processing Rate

```sql
-- Subscriptions processed per second
SELECT 
  execution_start,
  processed_count,
  EXTRACT(EPOCH FROM (execution_end - execution_start)) as duration_seconds,
  ROUND(processed_count / NULLIF(EXTRACT(EPOCH FROM (execution_end - execution_start)), 0), 2) as subscriptions_per_second
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '24 hours'
  AND execution_end IS NOT NULL
  AND processed_count > 0
ORDER BY execution_start DESC;
```

### Capacity Planning

```sql
-- Estimate future load
SELECT 
  COUNT(*) as current_active_subscriptions,
  COUNT(*) FILTER (WHERE billing_frequency = 'monthly') as monthly_subscriptions,
  COUNT(*) FILTER (WHERE billing_frequency = 'yearly') as yearly_subscriptions,
  -- Estimate daily processing load (monthly subs / 30 days)
  ROUND(COUNT(*) FILTER (WHERE billing_frequency = 'monthly') / 30.0) as estimated_daily_load,
  -- Estimate hourly processing load
  ROUND(COUNT(*) FILTER (WHERE billing_frequency = 'monthly') / 30.0 / 24.0) as estimated_hourly_load
FROM subscriptions
WHERE end_date IS NULL OR end_date >= CURRENT_DATE;
```

---

## Alerting Setup

### Alert Conditions

Configure alerts for the following conditions:

#### Critical Alerts (Immediate Response Required)

1. **Cron Job Not Running**
   ```sql
   -- Alert if no execution in last 2 hours
   SELECT COUNT(*) = 0 as alert
   FROM subscription_billing_logs
   WHERE execution_start > NOW() - INTERVAL '2 hours';
   ```

2. **High Failure Rate**
   ```sql
   -- Alert if success rate < 80% in last 3 executions
   SELECT 
     ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) < 80 as alert
   FROM (
     SELECT * FROM subscription_billing_logs
     WHERE status = 'completed'
     ORDER BY execution_start DESC
     LIMIT 3
   ) recent;
   ```

3. **Edge Function Down**
   ```bash
   # Health check returns non-200 status
   curl -f https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health || echo "ALERT: Edge Function down"
   ```

4. **Database Connection Failure**
   ```sql
   -- Alert if last execution failed with database error
   SELECT 
     status = 'failed' AND 
     error_details->>'errors' LIKE '%database%' as alert
   FROM subscription_billing_logs
   ORDER BY execution_start DESC
   LIMIT 1;
   ```

#### Warning Alerts (Review Within 24 Hours)

1. **Success Rate Degradation**
   ```sql
   -- Alert if success rate 80-90% in last 24 hours
   SELECT 
     ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) BETWEEN 80 AND 90 as alert
   FROM subscription_billing_logs
   WHERE execution_start > NOW() - INTERVAL '24 hours';
   ```

2. **Slow Execution**
   ```sql
   -- Alert if average execution time > 60 seconds
   SELECT 
     AVG(EXTRACT(EPOCH FROM (execution_end - execution_start))) > 60 as alert
   FROM subscription_billing_logs
   WHERE execution_start > NOW() - INTERVAL '24 hours'
     AND execution_end IS NOT NULL;
   ```

3. **Duplicate Expenses**
   ```sql
   -- Alert if any duplicates found
   SELECT COUNT(*) > 0 as alert
   FROM (
     SELECT subscription_id, date
     FROM expenses
     WHERE subscription_id IS NOT NULL
     GROUP BY subscription_id, date
     HAVING COUNT(*) > 1
   ) duplicates;
   ```

4. **Recurring Subscription Failures**
   ```sql
   -- Alert if same subscription fails 3+ times
   SELECT COUNT(*) > 0 as alert
   FROM (
     SELECT 
       e->>'subscriptionId' as subscription_id,
       COUNT(*) as failure_count
     FROM subscription_billing_logs l,
          jsonb_array_elements(l.error_details->'errors') e
     WHERE l.execution_start > NOW() - INTERVAL '7 days'
     GROUP BY e->>'subscriptionId'
     HAVING COUNT(*) >= 3
   ) recurring_failures;
   ```

### Alert Implementation Options

#### Option 1: Supabase Database Webhooks

Create a database function that sends webhooks on alert conditions:

```sql
-- Create function to send alert webhook
CREATE OR REPLACE FUNCTION send_alert_webhook(alert_type TEXT, alert_message TEXT)
RETURNS void AS $
BEGIN
  PERFORM net.http_post(
    url := 'https://your-webhook-url.com/alerts',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'alert_type', alert_type,
      'message', alert_message,
      'timestamp', NOW()
    )::text
  );
END;
$ LANGUAGE plpgsql;

-- Create trigger to check conditions after each execution
CREATE OR REPLACE FUNCTION check_billing_alerts()
RETURNS TRIGGER AS $
BEGIN
  -- Check success rate
  IF NEW.processed_count > 0 AND 
     (NEW.success_count::float / NEW.processed_count) < 0.8 THEN
    PERFORM send_alert_webhook(
      'high_failure_rate',
      format('Success rate: %s%% (processed: %s, failed: %s)',
        ROUND(100.0 * NEW.success_count / NEW.processed_count, 2),
        NEW.processed_count,
        NEW.failed_count
      )
    );
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER billing_alerts_trigger
AFTER INSERT ON subscription_billing_logs
FOR EACH ROW
EXECUTE FUNCTION check_billing_alerts();
```

#### Option 2: External Monitoring Service

Use services like:
- **Datadog**: Database monitoring and custom metrics
- **New Relic**: APM and database monitoring
- **Grafana + Prometheus**: Self-hosted monitoring
- **Supabase Monitoring**: Built-in platform monitoring

#### Option 3: Custom Monitoring Script

Run a periodic script to check conditions:

```bash
#!/bin/bash
# monitoring-check.sh

SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_KEY="YOUR_SERVICE_ROLE_KEY"
WEBHOOK_URL="https://your-webhook-url.com/alerts"

# Check health endpoint
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/functions/v1/process-subscription-bills/health")

if [ "$HEALTH" != "200" ]; then
  curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"alert\":\"Edge Function health check failed\",\"status\":$HEALTH}"
fi

# Add more checks as needed...
```

Schedule with cron:
```bash
# Run every 5 minutes
*/5 * * * * /path/to/monitoring-check.sh
```

### Alert Notification Channels

Configure notifications via:

1. **Email**: Direct email alerts
2. **Slack**: Webhook integration
3. **Discord**: Webhook integration
4. **PagerDuty**: For on-call rotations
5. **SMS**: For critical alerts

---

## Emergency Procedures

### Emergency Stop

If subscriptions are being incorrectly processed:

```sql
-- IMMEDIATELY disable cron job
UPDATE cron.job 
SET active = false 
WHERE jobname = 'process-subscription-bills-hourly';

-- Verify it's disabled
SELECT jobname, active FROM cron.job 
WHERE jobname = 'process-subscription-bills-hourly';
```

### Rollback Incorrect Expenses

If incorrect expenses were created:

```sql
-- 1. Identify the problematic execution
SELECT * FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '2 hours'
ORDER BY execution_start DESC;

-- 2. Delete expenses created during that execution
-- (Use execution_start and execution_end timestamps)
DELETE FROM expenses
WHERE subscription_id IS NOT NULL
  AND created_at BETWEEN 'EXECUTION_START_TIME' AND 'EXECUTION_END_TIME';

-- 3. Reset next_billing_date for affected subscriptions
-- (This requires manual review of each subscription)
```

### Database Recovery

If database corruption or major issues:

```bash
# 1. Stop all processing
psql $DATABASE_URL -c "UPDATE cron.job SET active = false WHERE jobname = 'process-subscription-bills-hourly';"

# 2. Create backup
supabase db dump -f emergency-backup-$(date +%Y%m%d-%H%M%S).sql

# 3. Assess damage and plan recovery
# 4. Restore from backup if needed
# 5. Re-enable after verification
```

### Contact Support

For critical issues beyond your control:

- **Supabase Support**: support@supabase.com
- **Dashboard**: https://supabase.com/dashboard/support
- **Status Page**: https://status.supabase.com
- **Community**: https://github.com/supabase/supabase/discussions

---

## Maintenance Tasks

### Daily

- [ ] Check dashboard metrics (executions, success rate)
- [ ] Review error logs for new issues
- [ ] Verify cron job is running

### Weekly

- [ ] Review success rate trends
- [ ] Check for duplicate expenses
- [ ] Analyze performance metrics
- [ ] Review failed subscriptions

### Monthly

- [ ] Archive old logs (> 90 days)
- [ ] Review capacity planning metrics
- [ ] Update documentation if needed
- [ ] Test disaster recovery procedures

### Quarterly

- [ ] Review and optimize database indexes
- [ ] Audit subscription data quality
- [ ] Review and update alert thresholds
- [ ] Performance tuning based on growth

---

## Additional Resources

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Initial setup and deployment
- [Design Document](../.kiro/specs/subscription-expense-persistence/design.md) - System architecture
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions) - Platform documentation
- [pg_cron Documentation](https://github.com/citusdata/pg_cron) - Cron job configuration

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0   | 2024-01-26 | Initial monitoring guide |

