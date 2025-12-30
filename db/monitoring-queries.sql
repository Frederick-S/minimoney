-- ============================================================================
-- Subscription Billing Monitoring Dashboard Queries
-- ============================================================================
-- This file contains SQL queries for monitoring the subscription billing
-- system's health, performance, and error tracking.
--
-- Requirements: 5.2 - Execution logging and monitoring
-- ============================================================================

-- ============================================================================
-- RECENT EXECUTIONS
-- ============================================================================

-- Query 1: Get last 24 hours of cron executions
-- Purpose: Monitor recent cron job activity and performance
-- Usage: Run this query to see all executions in the last 24 hours
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

-- Query 2: Get last N executions (configurable)
-- Purpose: View most recent executions regardless of time
-- Usage: Replace 10 with desired number of executions to view
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

-- Query 3: Get executions with errors only
-- Purpose: Quickly identify problematic executions
-- Usage: Run to see only executions that had failures
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

-- Query 4: Get currently running executions
-- Purpose: Check if any cron jobs are currently in progress
-- Usage: Run to see active executions (should be rare, as jobs are fast)
SELECT 
  id,
  execution_start,
  status,
  processed_count,
  success_count,
  failed_count,
  EXTRACT(EPOCH FROM (NOW() - execution_start)) as running_for_seconds
FROM subscription_billing_logs
WHERE status = 'running'
ORDER BY execution_start DESC;

-- ============================================================================
-- SUCCESS RATE CALCULATIONS
-- ============================================================================

-- Query 5: Calculate success rate over last 7 days (daily breakdown)
-- Purpose: Track system reliability over time
-- Usage: Run to see daily success rates for the past week
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

-- Query 6: Calculate overall success rate for last 24 hours
-- Purpose: Quick health check for recent system performance
-- Usage: Run for a single-number health metric
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

-- Query 7: Calculate success rate by hour of day (last 7 days)
-- Purpose: Identify if certain hours have more failures
-- Usage: Run to detect time-based patterns in failures
SELECT 
  EXTRACT(HOUR FROM execution_start) as hour_of_day,
  COUNT(*) as execution_count,
  SUM(processed_count) as total_processed,
  SUM(success_count) as total_success,
  SUM(failed_count) as total_failed,
  ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) as success_rate_percent
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY EXTRACT(HOUR FROM execution_start)
ORDER BY hour_of_day;

-- Query 8: Calculate success rate trend (last 30 days, weekly aggregation)
-- Purpose: Long-term trend analysis
-- Usage: Run to see if system reliability is improving or degrading
SELECT 
  DATE_TRUNC('week', execution_start) as week_start,
  COUNT(*) as total_executions,
  SUM(processed_count) as total_processed,
  SUM(success_count) as total_success,
  SUM(failed_count) as total_failed,
  ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) as success_rate_percent,
  ROUND(AVG(EXTRACT(EPOCH FROM (execution_end - execution_start)))::numeric, 2) as avg_duration_seconds
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '30 days'
  AND status = 'completed'
GROUP BY DATE_TRUNC('week', execution_start)
ORDER BY week_start DESC;

-- ============================================================================
-- FAILED SUBSCRIPTIONS
-- ============================================================================

-- Query 9: Get subscriptions that failed in recent executions (last 24 hours)
-- Purpose: Identify specific subscriptions having issues
-- Usage: Run to see which subscriptions need attention
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

-- Query 10: Get subscriptions with repeated failures
-- Purpose: Identify chronic problem subscriptions
-- Usage: Run to find subscriptions that fail consistently
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

-- Query 11: Get error types and their frequency
-- Purpose: Understand common failure patterns
-- Usage: Run to see what types of errors are most common
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

-- Query 12: Get detailed information about a specific failed subscription
-- Purpose: Deep dive into a specific subscription's failures
-- Usage: Replace 'SUBSCRIPTION_ID_HERE' with actual subscription ID
SELECT 
  l.execution_start,
  l.status,
  e->>'subscriptionId' as subscription_id,
  e->>'subscriptionName' as subscription_name,
  e->>'error' as error_message,
  e->>'timestamp' as error_timestamp,
  l.processed_count,
  l.success_count,
  l.failed_count
FROM subscription_billing_logs l,
     jsonb_array_elements(l.error_details->'errors') e
WHERE e->>'subscriptionId' = 'SUBSCRIPTION_ID_HERE'
ORDER BY l.execution_start DESC
LIMIT 20;

-- ============================================================================
-- SYSTEM HEALTH CHECKS
-- ============================================================================

-- Query 13: Check for missing cron executions (gaps > 2 hours)
-- Purpose: Detect if cron job stopped running
-- Usage: Run to verify cron job is executing regularly
SELECT 
  execution_start as current_execution,
  LAG(execution_start) OVER (ORDER BY execution_start DESC) as previous_execution,
  EXTRACT(EPOCH FROM (LAG(execution_start) OVER (ORDER BY execution_start DESC) - execution_start)) / 3600 as hours_gap
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
ORDER BY execution_start DESC
LIMIT 50;

-- Query 14: Check for long-running executions
-- Purpose: Identify performance issues
-- Usage: Run to find executions that took unusually long
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

-- Query 15: Overall system health summary
-- Purpose: Single query for dashboard overview
-- Usage: Run for a comprehensive health snapshot
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

-- ============================================================================
-- SUBSCRIPTION STATUS QUERIES
-- ============================================================================

-- Query 16: Check subscription processing status for a specific user
-- Purpose: Verify subscription billing is working for a user
-- Usage: Replace 'USER_ID_HERE' with actual user ID
SELECT 
  s.id,
  s.name,
  s.amount,
  s.billing_frequency,
  s.next_billing_date,
  s.is_auto_renew,
  s.end_date,
  up.value as user_timezone,
  COUNT(e.id) as expense_count,
  MAX(e.date) as last_expense_date,
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
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.user_id = 'USER_ID_HERE'
GROUP BY s.id, s.name, s.amount, s.billing_frequency, s.next_billing_date, 
         s.is_auto_renew, s.end_date, up.value
ORDER BY s.next_billing_date;

-- Query 17: Find subscriptions due for billing today
-- Purpose: Preview what the cron job will process
-- Usage: Run to see which subscriptions should be processed today
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

-- Query 18: Find subscriptions with missing expenses
-- Purpose: Detect subscriptions that should have expenses but don't
-- Usage: Run to find potential billing issues
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
