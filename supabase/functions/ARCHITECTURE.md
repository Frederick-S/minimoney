# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase Cloud                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    PostgreSQL Database                      │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │subscriptions │  │   expenses   │  │user_preferences  │ │ │
│  │  │              │  │              │  │                  │ │ │
│  │  │ - id         │  │ - id         │  │ - user_id       │ │ │
│  │  │ - user_id    │  │ - user_id    │  │ - category      │ │ │
│  │  │ - amount     │  │ - amount     │  │ - key           │ │ │
│  │  │ - frequency  │  │ - date       │  │ - value         │ │ │
│  │  │ - next_bill  │  │ - sub_id ────┼──┼─> (timezone)   │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │         subscription_billing_logs                     │  │ │
│  │  │  - execution_start                                    │  │ │
│  │  │  - execution_end                                      │  │ │
│  │  │  - status                                             │  │ │
│  │  │  - processed_count                                    │  │ │
│  │  │  - success_count                                      │  │ │
│  │  │  - failed_count                                       │  │ │
│  │  │  - error_details                                      │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │                    pg_cron                            │  │ │
│  │  │  Schedule: 0 * * * * (hourly)                        │  │ │
│  │  │  Job: process-subscription-bills-hourly              │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│                              │                                    │
│                              │ HTTP POST (hourly)                 │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Edge Function: process-subscription-bills     │ │
│  │                                                              │ │
│  │  1. Fetch subscriptions with timezone preferences          │ │
│  │  2. Convert current UTC time to user's timezone            │ │
│  │  3. Compare next_billing_date with current date            │ │
│  │  4. Create expense for matching subscriptions              │ │
│  │  5. Update next_billing_date                               │ │
│  │  6. Handle errors with retry logic                         │ │
│  │  7. Log execution results                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hourly Cron Trigger                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              1. Initialize Edge Function                         │
│  - Get current UTC time                                          │
│  - Initialize Supabase client with service role                  │
│  - Log execution start                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         2. Fetch Subscriptions & Timezone Preferences            │
│  - Query subscriptions with timezone JOIN                        │
│  - Query subscriptions without timezone (default UTC)            │
│  - Fetch subscription category ID                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              3. Process Each Subscription                        │
│                                                                   │
│  For each subscription:                                          │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ 3a. Get User Timezone                                 │    │
│    │  - From user_preferences or default to UTC           │    │
│    └────────────────────┬─────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ 3b. Convert Current Time to User's Timezone          │    │
│    │  - toZonedTime(now, userTimezone)                    │    │
│    │  - format(zonedNow, 'yyyy-MM-dd')                    │    │
│    └────────────────────┬─────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ 3c. Check if Should Process                          │    │
│    │  - next_billing_date == current_date?                │    │
│    │  - end_date not exceeded?                            │    │
│    └────────────────────┬─────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ 3d. Create Expense (with retry)                      │    │
│    │  - amount = subscription.amount * quantity           │    │
│    │  - date = current_date (in user's timezone)          │    │
│    │  - subscription_id = subscription.id                 │    │
│    │  - Retry up to 3 times on failure                    │    │
│    └────────────────────┬─────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ 3e. Calculate Next Billing Date                      │    │
│    │  - Monthly: addMonths(current, 1)                    │    │
│    │  - Yearly: addYears(current, 1)                      │    │
│    └────────────────────┬─────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ 3f. Update Subscription (with retry)                 │    │
│    │  - Set next_billing_date = calculated date           │    │
│    │  - Skip if next date exceeds end_date                │    │
│    │  - Retry up to 3 times on failure                    │    │
│    └────────────────────┬─────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ 3g. Handle Errors                                     │    │
│    │  - Catch and log errors                              │    │
│    │  - Add to errors array                               │    │
│    │  - Continue with next subscription                   │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              4. Log Execution Results                            │
│  - execution_end timestamp                                       │
│  - processed_count, success_count, failed_count                  │
│  - error_details (if any)                                        │
│  - Insert into subscription_billing_logs                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              5. Return Response                                  │
│  {                                                               │
│    "success": true,                                              │
│    "processedCount": 10,                                         │
│    "successCount": 9,                                            │
│    "failedCount": 1,                                             │
│    "errors": [...],                                              │
│    "executionStart": "...",                                      │
│    "executionEnd": "..."                                         │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Timezone Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                    Timezone Conversion Flow                      │
└─────────────────────────────────────────────────────────────────┘

Example: User in Asia/Shanghai (UTC+8)

Current UTC Time: 2024-12-21 16:00:00 UTC
                         │
                         │ toZonedTime(now, 'Asia/Shanghai')
                         ▼
User's Local Time: 2024-12-22 00:00:00 CST
                         │
                         │ format(zonedNow, 'yyyy-MM-dd')
                         ▼
User's Local Date: 2024-12-22
                         │
                         │ Compare with subscription.next_billing_date
                         ▼
Subscription next_billing_date: 2024-12-22
                         │
                         │ Match found!
                         ▼
Process Billing: Create expense for 2024-12-22
                         │
                         │ Calculate next billing date
                         ▼
New next_billing_date: 2025-01-22 (monthly)
                         │
                         │ Store as DATE (no timezone)
                         ▼
Database: next_billing_date = 2025-01-22
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Retry Logic with Backoff                      │
└─────────────────────────────────────────────────────────────────┘

Attempt 1: Execute operation
           │
           ├─ Success ──────────────────────────────────> Return
           │
           └─ Failure
              │
              │ Wait 1 second
              ▼
Attempt 2: Execute operation
           │
           ├─ Success ──────────────────────────────────> Return
           │
           └─ Failure
              │
              │ Wait 2 seconds
              ▼
Attempt 3: Execute operation
           │
           ├─ Success ──────────────────────────────────> Return
           │
           └─ Failure
              │
              │ Wait 4 seconds
              ▼
Final Attempt: Execute operation
           │
           ├─ Success ──────────────────────────────────> Return
           │
           └─ Failure ──────────────────────────────────> Throw Error
                                                           │
                                                           ▼
                                                    Log Error
                                                    Add to errors[]
                                                    Continue processing
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Subscription → Expense                        │
└─────────────────────────────────────────────────────────────────┘

Subscription Record:
┌──────────────────────────────────────────────────────────────┐
│ id: "uuid-123"                                                │
│ user_id: "user-456"                                           │
│ name: "Netflix"                                               │
│ amount: 15.99                                                 │
│ quantity: 1                                                   │
│ currency: "USD"                                               │
│ billing_frequency: "monthly"                                  │
│ next_billing_date: "2024-12-21"                              │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ Process Billing
                         ▼
Expense Record Created:
┌──────────────────────────────────────────────────────────────┐
│ id: "uuid-789" (auto-generated)                              │
│ user_id: "user-456" (from subscription)                      │
│ amount: 15.99 (amount * quantity)                            │
│ category_id: "cat-sub" (subscription category)               │
│ date: "2024-12-21" (current date in user's timezone)         │
│ subscription_id: "uuid-123" (link to subscription)           │
│ created_at: "2024-12-21T16:00:00Z"                           │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ Update Subscription
                         ▼
Subscription Updated:
┌──────────────────────────────────────────────────────────────┐
│ id: "uuid-123"                                                │
│ next_billing_date: "2025-01-21" (calculated)                 │
│ updated_at: "2024-12-21T16:00:00Z"                           │
└──────────────────────────────────────────────────────────────┘
```

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Monitoring & Logging                          │
└─────────────────────────────────────────────────────────────────┘

Edge Function Logs (Supabase Dashboard)
┌──────────────────────────────────────────────────────────────┐
│ [INFO] Starting subscription billing processing              │
│ [INFO] Successfully processed subscription uuid-123          │
│ [ERROR] Failed to process subscription uuid-456              │
│ [INFO] Completed subscription billing processing             │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ Structured JSON logs
                         ▼
Database Logs (subscription_billing_logs)
┌──────────────────────────────────────────────────────────────┐
│ execution_start: 2024-12-21 16:00:00                         │
│ execution_end: 2024-12-21 16:00:02                           │
│ status: completed                                             │
│ processed_count: 10                                           │
│ success_count: 9                                              │
│ failed_count: 1                                               │
│ error_details: { errors: [...] }                             │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ Query for monitoring
                         ▼
Monitoring Queries
┌──────────────────────────────────────────────────────────────┐
│ - Success rate over time                                      │
│ - Average execution time                                      │
│ - Failed subscriptions                                        │
│ - Error frequency                                             │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ Alerts
                         ▼
Alerting (Manual Setup)
┌──────────────────────────────────────────────────────────────┐
│ - Email notifications                                         │
│ - Slack/Discord webhooks                                      │
│ - Dashboard alerts                                            │
└──────────────────────────────────────────────────────────────┘
```

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Architecture                         │
└─────────────────────────────────────────────────────────────────┘

Supabase Service Role Key
         │
         │ Admin access (bypasses RLS)
         ▼
Edge Function
         │
         │ Validates user_id
         │ Parameterized queries
         │ Error sanitization
         ▼
Database Operations
         │
         ├─ Read: subscriptions, user_preferences, categories
         │
         ├─ Write: expenses (with user_id validation)
         │
         ├─ Update: subscriptions (with user_id validation)
         │
         └─ Log: subscription_billing_logs

Row Level Security (RLS) Bypassed
- Service role has admin access
- Function validates user_id before operations
- Ensures data integrity at application level
```

## Scalability Considerations

```
Current Design:
- Processes all subscriptions in single execution
- Suitable for < 10,000 subscriptions
- Execution time: < 30 seconds

Future Scaling (if needed):
┌──────────────────────────────────────────────────────────────┐
│ 1. Batch Processing                                           │
│    - Process subscriptions in chunks of 1000                 │
│    - Multiple Edge Function invocations                      │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ 2. Parallel Processing                                        │
│    - Partition by user_id or timezone                        │
│    - Multiple concurrent Edge Functions                      │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ 3. Database Optimization                                      │
│    - Add indexes on frequently queried columns               │
│    - Optimize queries with EXPLAIN ANALYZE                   │
└──────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
Development → Staging → Production

Local Testing:
- Use test-local.sh script
- Test with dry-run mode
- Verify with test data

Staging Deployment:
- Deploy to staging project
- Run comprehensive tests
- Monitor first few executions

Production Deployment:
- Deploy Edge Function
- Set up cron job
- Enable monitoring
- Set up alerting
- Document configuration
```
