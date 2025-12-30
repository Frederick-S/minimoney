# Subscription Billing Monitoring Guide

This guide provides comprehensive instructions for monitoring the subscription billing system's health, performance, and troubleshooting common issues.

## Table of Contents

1. [Overview](#overview)
2. [Quick Health Check](#quick-health-check)
3. [Monitoring Dashboard Queries](#monitoring-dashboard-queries)
4. [Key Metrics](#key-metrics)
5. [Alerting Thresholds](#alerting-thresholds)
6. [Common Issues and Solutions](#common-issues-and-solutions)
7. [Performance Monitoring](#performance-monitoring)
8. [Accessing Logs](#accessing-logs)

## Overview

The subscription billing system uses a Supabase Edge Function (`process-subscription-bills`) that runs hourly via pg_cron to automatically create expense records for subscriptions that are due for billing. All executions are logged in the `subscription_billing_logs` table for monitoring and troubleshooting.

**Key Components:**
- **Edge Function**: `process-subscription-bills` (runs hourly)
- **Log Table**: `subscription_billing_logs` (tracks all executions)
- **Audit Table**: `subscription_audit_log` (tracks subscription changes)
- **Monitoring Queries**: `db/monitoring-queries.sql` (pre-built queries)

## Quick Health Check

Run this single query to get an immediate health overview:

```sql
-- Query 15: Overall system health summary
WITH recent_stats AS (
  SELECT 
    COUNT(*) as total_executions,
    SUM(processed_count) as total_processed,
    SUM(success_count) as total_success,
    SUM(failed_count) as total_failed,
    MAX(execution_start) as last_execution,
    AVG(EXTRACT(EPOCH FROM (execution_end - execution_start))) as avg_duration
  FROM subscription_billing_logs
  WHERE execution_start > NOW() - INTERVAL '24 hours'
    AND status = 'completed'
),
error_summary AS (
  SELECT 
    COUNT(DISTINCT e->>'subscriptionId') as unique_failed_subscriptions
  FROM subscription_billing_logs l,
       jsonb_array_elements(l.error_details->'errors') e
  WHERE l.execution_start > NOW() - INTERVAL '24 hours'
    AND l.failed_count > 0
)
SELECT 
  r.total_executions,
  r.total_processed,
  r.total_success,
  r.total_failed,
  ROUND(100.0 * r.total_success / NULLIF(r.total_processed, 0), 2) as success_rate_percent,
  ROUND(r.avg_duration::numeric, 2) as avg_duration_seconds,
  r.last_execution,
  EXTRACT(EPOCH FROM (NOW() - r.last_execution)) / 3600 as hours_since_last_execution,
  e.unique_failed_subscriptions,
  CASE 
    WHEN r.total_executions < 20 THEN '⚠ Low execution count'
    WHEN (100.0 * r.total_success / NULLIF(r.total_processed, 0)) < 90 THEN '⚠ Low success rate'
    WHEN EXTRACT(EPOCH FROM (NOW() - r.last_execution)) > 7200 THEN '⚠ No recent execution'
    ELSE '✓ Healthy'
  END as health_status
FROM recent_stats r, error_summary e;
```

**Expected Results:**
- `total_executions`: ~24 (one per hour)
- `success_rate_percent`: > 95%
- `hours_since_last_execution`: < 2
- `health_status`: '✓ Healthy'

## Monitoring Dashboard Queries

All queries are available in `db/monitoring-queries.sql`. Below are the most important ones for daily monitoring.

### Recent Executions

**Query 1: Last 24 Hours of Executions**
```sql
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

**Use Case**: Daily health check to verify cron job is running regularly.

**What to Look For**:
- Executions every hour (24 entries in 24 hours)
- `status = 'completed'` for all entries
- `failed_count = 0` or very low
- `duration_seconds < 30` for most executions

---

**Query 2: Last N Executions with Summary**
```sql
SELECT 
  id,
  execution_start,
  execution_end,
  status,
  processed_count,
  success_count,
  failed_count,
  ROUND(EXTRACT(EPOCH FROM (execution_end - execution_start))::numeric, 2) as duration_seconds,
  CASE 
    WHEN failed_count = 0 THEN '✓ All Success'
    WHEN failed_count > 0 AND success_count > 0 THEN '⚠ Partial Failure'
    ELSE '✗ All Failed'
  END as result_summary
FROM subscription_billing_logs
ORDER BY execution_start DESC
LIMIT 10;
```

**Use Case**: Quick overview of recent execution results.

---

**Query 3: Executions with Errors Only**
```sql
SELECT 
  id,
  execution_start,
  execution_end,
  status,
  processed_count,
  success_count,
  failed_count,
  ROUND((failed_count::float / NULLIF(processed_count, 0) * 100)::numeric, 2) as failure_rate_percent,
  error_details
FROM subscription_billing_logs
WHERE failed_count > 0
ORDER BY execution_start DESC
LIMIT 20;
```

**Use Case**: Identify problematic executions that need investigation.

### Success Rate Analysis

**Query 5: Daily Success Rate (Last 7 Days)**
```sql
SELECT 
  DATE(execution_start) as date,
  COUNT(*) as total_executions,
  SUM(processed_count) as total_processed,
  SUM(success_count) as total_success,
  SUM(failed_count) as total_failed,
  ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) as success_rate_percent,
  ROUND(AVG(EXTRACT(EPOCH FROM (execution_end - execution_start)))::numeric, 2) as avg_duration_seconds
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY DATE(execution_start)
ORDER BY date DESC;
```

**Use Case**: Track system reliability trends over time.

**What to Look For**:
- Success rate consistently > 95%
- No sudden drops in success rate
- Consistent execution counts (~24 per day)

---

**Query 6: 24-Hour Success Rate Summary**
```sql
SELECT 
  COUNT(*) as total_executions,
  SUM(processed_count) as total_subscriptions_processed,
  SUM(success_count) as total_successful,
  SUM(failed_count) as total_failed,
  ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) as success_rate_percent,
  ROUND(AVG(EXTRACT(EPOCH FROM (execution_end - execution_start)))::numeric, 2) as avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (execution_end - execution_start))) as min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (execution_end - execution_start))) as max_duration_seconds
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '24 hours'
  AND status = 'completed';
```

**Use Case**: Single-number health metric for dashboards.

### Failed Subscriptions

**Query 9: Recent Failed Subscriptions (Last 24 Hours)**
```sql
SELECT 
  l.execution_start,
  l.id as log_id,
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

**Use Case**: Identify specific subscriptions that failed recently.

**Action Items**:
- Investigate error messages
- Check subscription configuration
- Verify user's timezone settings
- Review subscription status (expired, invalid dates, etc.)

---

**Query 10: Subscriptions with Repeated Failures**
```sql
SELECT 
  e->>'subscriptionId' as subscription_id,
  e->>'subscriptionName' as subscription_name,
  e->>'userId' as user_id,
  COUNT(*) as failure_count,
  MAX(l.execution_start) as last_failure,
  MIN(l.execution_start) as first_failure,
  array_agg(DISTINCT e->>'error') as unique_errors
FROM subscription_billing_logs l,
     jsonb_array_elements(l.error_details->'errors') e
WHERE l.execution_start > NOW() - INTERVAL '7 days'
  AND l.failed_count > 0
GROUP BY e->>'subscriptionId', e->>'subscriptionName', e->>'userId'
HAVING COUNT(*) >= 3
ORDER BY failure_count DESC, last_failure DESC;
```

**Use Case**: Find chronic problem subscriptions that need manual intervention.

**Action Items**:
- Contact affected users
- Fix subscription configuration issues
- Consider disabling problematic subscriptions temporarily

---

**Query 11: Error Types and Frequency**
```sql
SELECT 
  e->>'error' as error_message,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT e->>'subscriptionId') as affected_subscriptions,
  MAX(l.execution_start) as last_occurrence
FROM subscription_billing_logs l,
     jsonb_array_elements(l.error_details->'errors') e
WHERE l.execution_start > NOW() - INTERVAL '7 days'
  AND l.failed_count > 0
GROUP BY e->>'error'
ORDER BY occurrence_count DESC;
```

**Use Case**: Understand common failure patterns and prioritize fixes.

### System Health Checks

**Query 13: Check for Missing Cron Executions**
```sql
SELECT 
  execution_start as current_execution,
  LAG(execution_start) OVER (ORDER BY execution_start DESC) as previous_execution,
  EXTRACT(EPOCH FROM (LAG(execution_start) OVER (ORDER BY execution_start DESC) - execution_start)) / 3600 as hours_gap
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
ORDER BY execution_start DESC
LIMIT 50;
```

**Use Case**: Detect if cron job stopped running.

**What to Look For**:
- `hours_gap` should be ~1 hour between executions
- Gaps > 2 hours indicate cron job issues

---

**Query 14: Long-Running Executions**
```sql
SELECT 
  id,
  execution_start,
  execution_end,
  processed_count,
  success_count,
  failed_count,
  ROUND(EXTRACT(EPOCH FROM (execution_end - execution_start))::numeric, 2) as duration_seconds
FROM subscription_billing_logs
WHERE execution_end IS NOT NULL
  AND EXTRACT(EPOCH FROM (execution_end - execution_start)) > 60
ORDER BY duration_seconds DESC
LIMIT 20;
```

**Use Case**: Identify performance issues.

**What to Look For**:
- Most executions should complete in < 30 seconds
- Executions > 60 seconds may indicate performance problems

### Subscription Status Queries

**Query 17: Subscriptions Due Today**
```sql
SELECT 
  s.id,
  s.user_id,
  s.name,
  s.amount,
  s.billing_frequency,
  s.next_billing_date,
  up.value as user_timezone,
  CASE 
    WHEN up.value IS NULL THEN 'UTC (default)'
    ELSE up.value
  END as timezone_display
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' 
  AND up.key = 'timezone'
WHERE s.next_billing_date = CURRENT_DATE
  AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
ORDER BY s.user_id, s.name;
```

**Use Case**: Preview what the cron job will process today.

---

**Query 18: Subscriptions with Missing Expenses**
```sql
SELECT 
  s.id,
  s.user_id,
  s.name,
  s.amount,
  s.start_date,
  s.next_billing_date,
  s.billing_frequency,
  COUNT(e.id) as expense_count,
  CASE 
    WHEN s.billing_frequency = 'monthly' THEN 
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.start_date)) * 12 + 
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.start_date))
    WHEN s.billing_frequency = 'yearly' THEN 
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.start_date))
  END as expected_expense_count
FROM subscriptions s
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.start_date < CURRENT_DATE
GROUP BY s.id, s.user_id, s.name, s.amount, s.start_date, 
         s.next_billing_date, s.billing_frequency
HAVING COUNT(e.id) < CASE 
  WHEN s.billing_frequency = 'monthly' THEN 
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.start_date)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.start_date))
  WHEN s.billing_frequency = 'yearly' THEN 
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.start_date))
END
ORDER BY expected_expense_count - COUNT(e.id) DESC
LIMIT 50;
```

**Use Case**: Detect subscriptions that should have expenses but don't.

**Action Items**:
- Investigate why expenses weren't created
- Check error logs for these subscription IDs
- Manually trigger billing if needed

## Key Metrics

### Critical Metrics (Monitor Daily)

| Metric | Expected Value | Alert Threshold | Action Required |
|--------|---------------|-----------------|-----------------|
| Executions per 24h | 24 | < 20 | Check cron job status |
| Success Rate | > 95% | < 90% | Investigate failures |
| Hours Since Last Execution | < 1.5 | > 2 | Check cron job and Edge Function |
| Average Duration | < 30s | > 60s | Investigate performance |
| Failed Subscriptions | < 5% | > 10% | Review error logs |

### Performance Metrics (Monitor Weekly)

| Metric | Expected Value | Alert Threshold |
|--------|---------------|-----------------|
| Max Execution Duration | < 60s | > 120s |
| Subscriptions Processed per Hour | Varies | Sudden 50%+ change |
| Unique Failed Subscriptions | < 10 | > 50 |
| Repeated Failures (3+ times) | 0 | > 5 |

## Alerting Thresholds

### Critical Alerts (Immediate Action Required)

1. **Cron Job Not Running**
   - Condition: No execution in last 2 hours
   - Query: Check Query 13 for gaps
   - Action: Verify pg_cron schedule, check Edge Function deployment

2. **High Failure Rate**
   - Condition: Success rate < 80% for 3+ consecutive executions
   - Query: Use Query 6 for current rate
   - Action: Review error logs (Query 9), check database connectivity

3. **Edge Function Down**
   - Condition: All executions failing
   - Query: Check Query 3 for error patterns
   - Action: Check Edge Function logs in Supabase Dashboard

### Warning Alerts (Review Within 24 Hours)

1. **Moderate Failure Rate**
   - Condition: Success rate 80-90% for 2+ consecutive executions
   - Query: Use Query 5 for trend analysis
   - Action: Investigate common error types (Query 11)

2. **Repeated Subscription Failures**
   - Condition: Same subscription failing 3+ times
   - Query: Use Query 10
   - Action: Contact user, fix subscription configuration

3. **Performance Degradation**
   - Condition: Average duration > 60 seconds
   - Query: Use Query 14
   - Action: Review database performance, check subscription count

4. **Missing Executions**
   - Condition: Gaps > 2 hours between executions
   - Query: Use Query 13
   - Action: Check cron job schedule, verify Edge Function is deployed

## Common Issues and Solutions

### Issue 1: Subscription Not Processed

**Symptoms**: Subscription's `next_billing_date` is today but no expense was created.

**Diagnosis Steps**:
1. Check if subscription is in "due today" list (Query 17)
2. Check error logs for this subscription (Query 12)
3. Verify user's timezone preference
4. Check if subscription is expired (`end_date < today`)

**Common Causes**:
- Timezone mismatch (user's timezone vs UTC)
- Subscription expired (end_date in the past)
- Error during expense creation (check logs)
- Cron job didn't run

**Solution**:
```sql
-- Manually check subscription status
SELECT 
  s.*,
  up.value as user_timezone,
  CASE 
    WHEN s.end_date IS NOT NULL AND s.end_date < CURRENT_DATE THEN 'Expired'
    WHEN s.next_billing_date = CURRENT_DATE THEN 'Due Today'
    WHEN s.next_billing_date < CURRENT_DATE THEN 'Overdue'
    ELSE 'Active'
  END as status
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' 
  AND up.key = 'timezone'
WHERE s.id = 'SUBSCRIPTION_ID_HERE';
```

### Issue 2: Duplicate Expenses Created

**Symptoms**: Multiple expenses with same `subscription_id` and `date`.

**Diagnosis Steps**:
1. Check for duplicate cron executions (Query 1)
2. Verify unique constraint exists on `expenses(subscription_id, date)`
3. Check if `next_billing_date` was updated after expense creation

**Common Causes**:
- Cron job ran multiple times in same hour
- Edge Function didn't update `next_billing_date`
- Database constraint missing

**Solution**:
```sql
-- Check for duplicate expenses
SELECT 
  subscription_id,
  date,
  COUNT(*) as duplicate_count
FROM expenses
WHERE subscription_id IS NOT NULL
GROUP BY subscription_id, date
HAVING COUNT(*) > 1;

-- Verify constraint exists
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conname = 'expenses_subscription_date_unique';
```

### Issue 3: Missing Expenses

**Symptoms**: Subscription has been active for months but has fewer expenses than expected.

**Diagnosis Steps**:
1. Run Query 18 to find subscriptions with missing expenses
2. Check error logs for this subscription (Query 12)
3. Verify subscription's `start_date` and `next_billing_date`

**Common Causes**:
- Cron job wasn't running during certain periods
- Subscription was created but past bills weren't generated
- Errors during expense creation

**Solution**:
```sql
-- Calculate expected vs actual expenses
SELECT 
  s.id,
  s.name,
  s.start_date,
  s.billing_frequency,
  COUNT(e.id) as actual_expenses,
  CASE 
    WHEN s.billing_frequency = 'monthly' THEN 
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.start_date)) * 12 + 
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.start_date))
    WHEN s.billing_frequency = 'yearly' THEN 
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.start_date))
  END as expected_expenses
FROM subscriptions s
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.id = 'SUBSCRIPTION_ID_HERE'
GROUP BY s.id, s.name, s.start_date, s.billing_frequency;
```

### Issue 4: Timezone Issues

**Symptoms**: Expenses created on wrong dates, or subscriptions processed at unexpected times.

**Diagnosis Steps**:
1. Check user's timezone preference
2. Verify timezone conversion in Edge Function
3. Compare expected vs actual billing dates

**Common Causes**:
- User's timezone not set (defaults to UTC)
- Timezone conversion logic error
- Daylight saving time transitions

**Solution**:
```sql
-- Check user's timezone setting
SELECT 
  user_id,
  value as timezone
FROM user_preferences
WHERE user_id = 'USER_ID_HERE'
  AND category = 'general'
  AND key = 'timezone';

-- If missing, user should set timezone in settings
```

### Issue 5: Performance Degradation

**Symptoms**: Cron job executions taking > 60 seconds.

**Diagnosis Steps**:
1. Check number of active subscriptions
2. Review query execution plans
3. Verify indexes are present and used (see Performance Monitoring section)

**Common Causes**:
- Large number of subscriptions (> 10,000)
- Missing or unused indexes
- Database resource constraints

**Solution**:
```sql
-- Check subscription count
SELECT COUNT(*) as total_subscriptions,
       COUNT(*) FILTER (WHERE next_billing_date <= CURRENT_DATE) as due_subscriptions
FROM subscriptions
WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- Verify indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('subscriptions', 'expenses', 'user_preferences')
ORDER BY tablename, indexname;
```

## Performance Monitoring

### Database Query Performance

Monitor slow queries related to subscription billing:

```sql
-- Requires pg_stat_statements extension
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%subscriptions%'
  OR query LIKE '%expenses%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Index Usage

Verify indexes are being used effectively:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('subscriptions', 'expenses', 'user_preferences')
ORDER BY idx_scan DESC;
```

**What to Look For**:
- `subscriptions_billing_lookup_idx` should have high `idx_scan` count
- `expenses_subscription_id_idx` should be used frequently
- Low `idx_scan` on an index may indicate it's not needed

## Accessing Logs

### Edge Function Logs

1. **Supabase Dashboard**:
   - Navigate to: Edge Functions → `process-subscription-bills` → Logs
   - Filter by time range and log level
   - Search for specific subscription IDs or error messages

2. **Structured Logging Format**:
   ```json
   {
     "level": "INFO",
     "timestamp": "2024-03-20T12:00:00.000Z",
     "message": "Processing subscription billing",
     "data": {
       "subscriptionId": "uuid",
       "userId": "uuid",
       "nextBillingDate": "2024-03-20",
       "userTimezone": "Asia/Shanghai"
     }
   }
   ```

### Database Logs

Query the `subscription_billing_logs` table directly:

```sql
-- Get detailed error information
SELECT 
  id,
  execution_start,
  status,
  processed_count,
  success_count,
  failed_count,
  error_details
FROM subscription_billing_logs
WHERE failed_count > 0
ORDER BY execution_start DESC
LIMIT 10;
```

### Audit Logs

Track subscription changes:

```sql
-- View recent subscription changes
SELECT 
  sa.created_at,
  sa.action,
  sa.changed_by,
  s.name as subscription_name,
  sa.old_values,
  sa.new_values
FROM subscription_audit_log sa
JOIN subscriptions s ON sa.subscription_id = s.id
WHERE sa.user_id = 'USER_ID_HERE'
ORDER BY sa.created_at DESC
LIMIT 20;
```

## Monitoring Best Practices

1. **Daily Health Check**: Run Query 15 every morning to verify system health
2. **Weekly Review**: Analyze Query 5 to track success rate trends
3. **Monthly Analysis**: Review Query 8 for long-term performance trends
4. **Set Up Alerts**: Configure automated alerts for critical thresholds
5. **Log Retention**: Keep logs for at least 30 days for trend analysis
6. **Document Incidents**: Record all issues and resolutions for future reference

## Support and Escalation

If issues persist after following this guide:

1. Check Edge Function deployment status in Supabase Dashboard
2. Verify pg_cron schedule is active: `SELECT * FROM cron.job;`
3. Review database resource usage and connection limits
4. Contact Supabase support for infrastructure issues
5. Review Edge Function code for logic errors

## Additional Resources

- **Design Document**: `.kiro/specs/subscription-expense-persistence/design.md`
- **Requirements**: `.kiro/specs/subscription-expense-persistence/requirements.md`
- **Edge Function Code**: `supabase/functions/process-subscription-bills/`
- **Database Schema**: `db/schema.sql`
- **Monitoring Queries**: `db/monitoring-queries.sql`
