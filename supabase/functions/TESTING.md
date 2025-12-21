# Testing Guide for process-subscription-bills Edge Function

This guide covers various testing scenarios for the subscription billing Edge Function.

## Prerequisites

- Supabase project with test data
- Service role key (Settings > API)
- curl or Postman for API testing
- Access to Supabase SQL Editor

## Test Data Setup

Before testing, create some test subscriptions:

```sql
-- Create a test user (if needed)
-- Note: Replace with actual user_id from auth.users

-- Set user timezone preference
INSERT INTO user_preferences (user_id, category, key, value)
VALUES ('YOUR_USER_ID', 'general', 'timezone', 'America/New_York')
ON CONFLICT (user_id, category, key) DO UPDATE SET value = 'America/New_York';

-- Create test subscriptions with different scenarios

-- Scenario 1: Monthly subscription due today
INSERT INTO subscriptions (
  user_id, name, amount, quantity, currency, 
  billing_frequency, is_auto_renew, start_date, next_billing_date
) VALUES (
  'YOUR_USER_ID', 
  'Test Monthly - Due Today', 
  9.99, 
  1, 
  'USD',
  'monthly', 
  true, 
  '2024-01-01', 
  CURRENT_DATE  -- Due today
);

-- Scenario 2: Yearly subscription due today
INSERT INTO subscriptions (
  user_id, name, amount, quantity, currency, 
  billing_frequency, is_auto_renew, start_date, next_billing_date
) VALUES (
  'YOUR_USER_ID', 
  'Test Yearly - Due Today', 
  99.99, 
  1, 
  'USD',
  'yearly', 
  true, 
  '2023-01-01', 
  CURRENT_DATE  -- Due today
);

-- Scenario 3: Subscription due tomorrow (should not process)
INSERT INTO subscriptions (
  user_id, name, amount, quantity, currency, 
  billing_frequency, is_auto_renew, start_date, next_billing_date
) VALUES (
  'YOUR_USER_ID', 
  'Test Monthly - Due Tomorrow', 
  14.99, 
  1, 
  'USD',
  'monthly', 
  true, 
  '2024-01-01', 
  CURRENT_DATE + INTERVAL '1 day'  -- Due tomorrow
);

-- Scenario 4: Subscription with end date (last billing)
INSERT INTO subscriptions (
  user_id, name, amount, quantity, currency, 
  billing_frequency, is_auto_renew, start_date, end_date, next_billing_date
) VALUES (
  'YOUR_USER_ID', 
  'Test Monthly - Last Billing', 
  19.99, 
  1, 
  'USD',
  'monthly', 
  false, 
  '2024-01-01', 
  CURRENT_DATE,  -- Ends today
  CURRENT_DATE   -- Due today
);

-- Scenario 5: Expired subscription (should not process)
INSERT INTO subscriptions (
  user_id, name, amount, quantity, currency, 
  billing_frequency, is_auto_renew, start_date, end_date, next_billing_date
) VALUES (
  'YOUR_USER_ID', 
  'Test Monthly - Expired', 
  24.99, 
  1, 
  'USD',
  'monthly', 
  false, 
  '2024-01-01', 
  CURRENT_DATE - INTERVAL '1 day',  -- Ended yesterday
  CURRENT_DATE   -- Due today but expired
);
```

## Test Scenarios

### Test 1: Health Check

Verify the function is deployed and running:

```bash
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health
```

**Expected Result**:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-21T10:00:00.000Z",
  "version": "1.0.0"
}
```

**Pass Criteria**: HTTP 200, status is "healthy"

---

### Test 2: Dry Run Mode

Preview what would be processed without creating expenses:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

**Expected Result**:
```json
{
  "dryRun": true,
  "wouldProcess": 3,
  "subscriptions": [
    {
      "id": "uuid-1",
      "name": "Test Monthly - Due Today",
      "nextBillingDate": "2024-12-21"
    },
    {
      "id": "uuid-2",
      "name": "Test Yearly - Due Today",
      "nextBillingDate": "2024-12-21"
    },
    {
      "id": "uuid-3",
      "name": "Test Monthly - Last Billing",
      "nextBillingDate": "2024-12-21"
    }
  ]
}
```

**Pass Criteria**: 
- HTTP 200
- `wouldProcess` count matches subscriptions due today
- Does not include expired or future-dated subscriptions

---

### Test 3: Actual Execution

Process subscriptions and create expenses:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Result**:
```json
{
  "success": true,
  "processedCount": 5,
  "successCount": 3,
  "failedCount": 0,
  "errors": [],
  "executionStart": "2024-12-21T10:00:00.000Z",
  "executionEnd": "2024-12-21T10:00:02.000Z"
}
```

**Pass Criteria**:
- HTTP 200
- `success` is true
- `successCount` matches subscriptions due today
- `failedCount` is 0
- `errors` array is empty

**Verification**:
```sql
-- Check expenses were created
SELECT 
  e.id,
  e.amount,
  e.date,
  e.subscription_id,
  s.name as subscription_name
FROM expenses e
JOIN subscriptions s ON e.subscription_id = s.id
WHERE e.date = CURRENT_DATE
  AND e.subscription_id IS NOT NULL
ORDER BY e.created_at DESC;

-- Check next_billing_date was updated
SELECT 
  id,
  name,
  next_billing_date,
  billing_frequency
FROM subscriptions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY next_billing_date;

-- Check execution log
SELECT * FROM subscription_billing_logs
ORDER BY execution_start DESC
LIMIT 1;
```

---

### Test 4: Timezone Handling

Test with different timezones:

**Setup**:
```sql
-- Create user with Asia/Shanghai timezone
UPDATE user_preferences 
SET value = 'Asia/Shanghai'
WHERE user_id = 'YOUR_USER_ID' 
  AND category = 'general' 
  AND key = 'timezone';

-- Create subscription due "today" in Shanghai time
-- If it's 2024-12-21 16:00 UTC, it's 2024-12-22 00:00 in Shanghai
-- So set next_billing_date to 2024-12-22
INSERT INTO subscriptions (
  user_id, name, amount, quantity, currency, 
  billing_frequency, is_auto_renew, start_date, next_billing_date
) VALUES (
  'YOUR_USER_ID', 
  'Test Timezone - Shanghai', 
  29.99, 
  1, 
  'CNY',
  'monthly', 
  true, 
  '2024-01-01', 
  '2024-12-22'  -- Tomorrow in UTC, but today in Shanghai
);
```

**Execute**:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Pass Criteria**:
- Subscription is processed when current date in user's timezone matches next_billing_date
- Expense is created with correct date in user's timezone

---

### Test 5: End Date Handling

Test subscription that reaches end date:

**Setup**:
```sql
-- Create subscription with end date = today
INSERT INTO subscriptions (
  user_id, name, amount, quantity, currency, 
  billing_frequency, is_auto_renew, start_date, end_date, next_billing_date
) VALUES (
  'YOUR_USER_ID', 
  'Test End Date', 
  39.99, 
  1, 
  'USD',
  'monthly', 
  false, 
  '2024-01-01', 
  CURRENT_DATE,  -- Ends today
  CURRENT_DATE   -- Due today
);
```

**Execute and Verify**:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Verification**:
```sql
-- Check expense was created for today
SELECT * FROM expenses 
WHERE subscription_id = 'SUBSCRIPTION_ID'
  AND date = CURRENT_DATE;

-- Check next_billing_date was NOT updated (because end date reached)
SELECT next_billing_date, end_date 
FROM subscriptions 
WHERE id = 'SUBSCRIPTION_ID';
-- next_billing_date should still be CURRENT_DATE
```

**Pass Criteria**:
- Expense is created for the final billing
- next_billing_date is NOT updated (stays at end date)

---

### Test 6: Error Handling

Test error scenarios:

**Scenario A: Missing Category**
```sql
-- Temporarily rename subscription category
UPDATE categories 
SET name = 'subscription_backup' 
WHERE name = 'subscription';
```

**Execute**:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Result**:
```json
{
  "success": false,
  "error": "Subscription category not found"
}
```

**Restore**:
```sql
UPDATE categories 
SET name = 'subscription' 
WHERE name = 'subscription_backup';
```

**Scenario B: Individual Subscription Failure**

Test that one failure doesn't stop others from processing.

**Pass Criteria**:
- Function returns error details
- Other subscriptions continue to process
- Error is logged in subscription_billing_logs

---

### Test 7: Retry Logic

Test retry behavior with transient failures:

**Note**: This is difficult to test without mocking, but you can verify retry logic by:

1. Checking function logs for retry attempts
2. Temporarily causing database issues (not recommended in production)
3. Reviewing the code logic

**Verification**:
```sql
-- Check error logs for retry attempts
SELECT 
  error_details->'errors' as errors
FROM subscription_billing_logs
WHERE failed_count > 0
ORDER BY execution_start DESC
LIMIT 5;
```

---

### Test 8: Batch Processing

Test with multiple subscriptions:

**Setup**:
```sql
-- Create 10 test subscriptions all due today
DO $$
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO subscriptions (
      user_id, name, amount, quantity, currency, 
      billing_frequency, is_auto_renew, start_date, next_billing_date
    ) VALUES (
      'YOUR_USER_ID', 
      'Test Batch ' || i, 
      9.99 + i, 
      1, 
      'USD',
      'monthly', 
      true, 
      '2024-01-01', 
      CURRENT_DATE
    );
  END LOOP;
END $$;
```

**Execute and Verify**:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Pass Criteria**:
- All 10 subscriptions are processed
- All 10 expenses are created
- Execution completes in reasonable time (< 30 seconds)

---

### Test 9: Duplicate Prevention

Test that running twice doesn't create duplicates:

**Execute twice**:
```bash
# First execution
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Second execution (immediately after)
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Verification**:
```sql
-- Check for duplicate expenses
SELECT 
  subscription_id,
  date,
  COUNT(*) as count
FROM expenses
WHERE date = CURRENT_DATE
  AND subscription_id IS NOT NULL
GROUP BY subscription_id, date
HAVING COUNT(*) > 1;
```

**Pass Criteria**:
- Second execution processes 0 subscriptions (next_billing_date already updated)
- No duplicate expenses created

**Note**: If duplicates are found, add unique constraint:
```sql
ALTER TABLE expenses 
ADD CONSTRAINT expenses_subscription_date_unique 
UNIQUE (subscription_id, date);
```

---

## Automated Testing Script

Use the provided test script:

```bash
cd supabase/functions
./test-local.sh
```

This script will:
1. Check prerequisites
2. Run health check
3. Run dry-run mode
4. Optionally run actual execution
5. Display results

## Monitoring Tests

After deployment, monitor these metrics:

```sql
-- Success rate over time
SELECT 
  DATE(execution_start) as date,
  COUNT(*) as executions,
  AVG(success_count::float / NULLIF(processed_count, 0)) * 100 as success_rate
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
GROUP BY DATE(execution_start)
ORDER BY date DESC;

-- Average execution time
SELECT 
  AVG(EXTRACT(EPOCH FROM (execution_end - execution_start))) as avg_seconds,
  MAX(EXTRACT(EPOCH FROM (execution_end - execution_start))) as max_seconds
FROM subscription_billing_logs
WHERE execution_start > NOW() - INTERVAL '7 days'
  AND status = 'completed';

-- Error frequency
SELECT 
  COUNT(*) as total_errors,
  COUNT(DISTINCT (error_details->'errors'->0->>'subscriptionId')) as unique_subscriptions
FROM subscription_billing_logs
WHERE failed_count > 0
  AND execution_start > NOW() - INTERVAL '7 days';
```

## Cleanup Test Data

After testing, clean up test data:

```sql
-- Delete test expenses
DELETE FROM expenses 
WHERE subscription_id IN (
  SELECT id FROM subscriptions 
  WHERE name LIKE 'Test%'
);

-- Delete test subscriptions
DELETE FROM subscriptions 
WHERE name LIKE 'Test%';

-- Delete test execution logs (optional)
DELETE FROM subscription_billing_logs 
WHERE execution_start > NOW() - INTERVAL '1 hour';
```

## Troubleshooting Tests

### Test Fails: "Subscription category not found"

**Solution**:
```sql
-- Verify subscription category exists
SELECT * FROM categories WHERE name = 'subscription';

-- If missing, create it
INSERT INTO categories (user_id, name, display_name, color, chart_color, icon, is_default, sort_order, level)
VALUES ('YOUR_USER_ID', 'subscription', '订阅', '#9C27B0', '#9C27B0', 'mdi-sync', true, 0, 0);
```

### Test Fails: "User not found"

**Solution**:
```sql
-- Check if user exists
SELECT id, email FROM auth.users WHERE id = 'YOUR_USER_ID';

-- Use actual user ID from your auth.users table
```

### Test Fails: Timezone issues

**Solution**:
```sql
-- Check user timezone preference
SELECT * FROM user_preferences 
WHERE user_id = 'YOUR_USER_ID' 
  AND category = 'general' 
  AND key = 'timezone';

-- Set timezone if missing
INSERT INTO user_preferences (user_id, category, key, value)
VALUES ('YOUR_USER_ID', 'general', 'timezone', 'UTC')
ON CONFLICT (user_id, category, key) DO UPDATE SET value = 'UTC';
```

## Next Steps

After successful testing:
1. Deploy to production
2. Set up cron job
3. Monitor first few executions
4. Set up alerting for failures
5. Document any edge cases discovered
