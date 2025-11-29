# Design Document

## Overview

This design implements automatic persistence of subscription billing events as expense records. The system will:

1. Calculate and preview past billing events when users create subscriptions with historical start dates
2. Require user confirmation before creating expense records for past bills
3. Automatically generate expense records for future billing dates using a Supabase Edge Function with scheduled execution
4. Link subscription records to their generated expenses for traceability
5. Handle subscription updates and deletions appropriately

The implementation leverages existing expense management infrastructure and extends the subscription system with expense generation capabilities.

## Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ SubscriptionForm.vue │  │ PastBillsConfirmDialog.vue   │ │
│  │  - Form validation   │  │  - Preview past bills        │ │
│  │  - Date selection    │  │  - User confirmation         │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ useSubscriptionExpenses.ts (New Composable)          │   │
│  │  - Calculate billing events                          │   │
│  │  - Generate expense records                          │   │
│  │  - Link subscriptions to expenses                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ useSubscriptions.ts (Enhanced)                       │   │
│  │  - Integrate expense generation on create/update     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Supabase Database                                    │   │
│  │  - subscriptions table (existing)                    │   │
│  │  - expenses table (enhanced with subscription_id)    │   │
│  │  - categories table (existing)                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Supabase Edge Function (New)                         │   │
│  │  - process-subscription-bills                        │   │
│  │  - Scheduled daily execution                         │   │
│  │  - Creates expenses for due subscriptions            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Creating a Subscription with Past Bills:**
1. User enters subscription details with start date < today (in their timezone)
2. System retrieves user's timezone preference (or uses browser timezone)
3. SubscriptionForm calculates billing events in user's timezone
4. PastBillsConfirmDialog displays preview (count, total amount, date range)
5. User confirms or declines
6. If confirmed: 
   - Create subscription (dates converted to UTC for storage)
   - Generate expense records (dates in user's timezone, stored as UTC)
   - Link records via subscription_id
7. If declined: Create subscription only (dates converted to UTC)

**Automated Future Billing:**
1. Supabase Cron triggers Edge Function hourly (every hour at :00)
2. Edge Function gets current UTC time
3. For each subscription:
   - Retrieve user's timezone preference
   - Convert current UTC time to user's local date
   - Convert subscription's next_billing_date to user's local date
   - Compare dates in user's timezone
4. For matching subscriptions:
   - Create expense with date in user's timezone (stored as UTC)
   - Calculate next billing date in user's timezone
   - Update subscription with new next_billing_date (converted to UTC)
5. Handle end dates and auto-renew logic (in user's timezone)
6. Log execution results with timezone information

## Components and Interfaces

### Database Schema Changes

**Expenses Table Enhancement:**
```sql
-- Add nullable subscription_id column to link expenses to subscriptions
-- NULL means the expense was manually created by the user
-- Non-NULL means the expense was auto-generated from a subscription
ALTER TABLE expenses ADD COLUMN subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
CREATE INDEX expenses_subscription_id_idx ON expenses(subscription_id);
```

**Subscription Category:**
- Create a default "订阅" (Subscriptions) category for all users
- All subscription-generated expenses will use this category

### New Composable: useSubscriptionExpenses

```typescript
interface BillingEvent {
  date: string  // ISO date string in user's timezone
  amount: number
  currency: string
}

interface PastBillsPreview {
  events: BillingEvent[]
  count: number
  totalAmount: number
  startDate: string
  endDate: string
}

interface SubscriptionExpenseOptions {
  subscriptionId: string
  categoryId: string  // Subscription category ID
  userTimezone: string  // User's timezone for date calculations
}

export function useSubscriptionExpenses() {
  /**
   * Calculate all billing events between start date and end date
   * Dates are interpreted in the user's timezone
   */
  const calculateBillingEvents = (
    startDate: string,
    endDate: string,
    amount: number,
    currency: string,
    frequency: 'monthly' | 'yearly',
    userTimezone: string
  ): BillingEvent[]

  /**
   * Generate preview of past bills for user confirmation
   * Uses user's timezone for date calculations
   */
  const generatePastBillsPreview = (
    startDate: string,
    amount: number,
    currency: string,
    frequency: 'monthly' | 'yearly',
    userTimezone: string
  ): PastBillsPreview

  /**
   * Create expense records for billing events
   * Converts dates from user timezone to UTC for storage
   */
  const createExpensesForBillingEvents = async (
    events: BillingEvent[],
    options: SubscriptionExpenseOptions
  ): Promise<{ success: number; failed: number }>

  /**
   * Get expenses linked to a subscription
   */
  const getSubscriptionExpenses = async (
    subscriptionId: string
  ): Promise<Expense[]>

  /**
   * Delete expenses linked to a subscription
   */
  const deleteSubscriptionExpenses = async (
    subscriptionId: string
  ): Promise<void>
}
```

### New Component: PastBillsConfirmDialog

```typescript
interface PastBillsConfirmDialogProps {
  modelValue: boolean
  preview: PastBillsPreview | null
  loading: boolean
}

interface PastBillsConfirmDialogEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}
```

Display format:
- Title: "确认创建历史账单"
- Content: "将为此订阅创建 {count} 条历史支出记录"
- Date range: "{startDate} 至 {endDate}"
- Total amount: "总计: {totalAmount} {currency}"
- Actions: "取消" / "确认创建"

### Enhanced useSubscriptions

Add methods:
```typescript
/**
 * Create subscription with optional expense generation
 */
const createSubscriptionWithExpenses = async (
  subscription: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  generatePastExpenses: boolean,
  subscriptionCategoryId: string,
  userTimezone: string
): Promise<Subscription>

/**
 * Delete subscription with option to delete linked expenses
 */
const deleteSubscriptionWithExpenses = async (
  id: string,
  deleteExpenses: boolean
): Promise<void>
```

### Supabase Edge Function: process-subscription-bills

**File:** `supabase/functions/process-subscription-bills/index.ts`

```typescript
interface ProcessingResult {
  processedCount: number
  successCount: number
  failedCount: number
  errors: Array<{ subscriptionId: string; error: string }>
}

async function processSubscriptionBills(): Promise<ProcessingResult>
```

**Scheduled Execution via pg_cron:**

Supabase uses PostgreSQL's pg_cron extension to schedule tasks. The cron job will be configured in the database:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Edge Function to run hourly
SELECT cron.schedule(
  'process-subscription-bills-hourly',  -- Job name
  '0 * * * *',                          -- Cron expression: every hour at :00
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

**How it works:**
1. pg_cron runs in the Supabase PostgreSQL database
2. Every hour at :00, pg_cron executes the scheduled SQL
3. The SQL makes an HTTP POST request to the Edge Function
4. The Edge Function processes subscriptions and returns results
5. Rationale: Hourly execution ensures users in all timezones get their subscription bills processed within 1 hour of their local midnight

**Alternative: Supabase Cron (if available):**
If your Supabase project has the newer Cron feature enabled, you can configure it directly in the Dashboard:
- Navigate to: Database → Cron Jobs
- Create new job: `process-subscription-bills-hourly`
- Schedule: `0 * * * *`
- HTTP Request to Edge Function URL

**Logic:**
1. Get current UTC time
2. Query all active subscriptions with their user's timezone preference
3. For each subscription:
   - Get user's timezone (default to UTC if not set)
   - Convert current UTC time to user's local time
   - Get user's local date (YYYY-MM-DD)
   - Convert next_billing_date (stored as UTC date) to user's timezone date
   - Check if next_billing_date in user's timezone equals current date in user's timezone
4. Filter out subscriptions where `end_date < current_date` in user's timezone (expired)
5. For each matching subscription:
   - Create expense record with subscription_id link (date in user's timezone)
   - Calculate new next_billing_date based on frequency (add 1 month/year in user's timezone)
   - Convert new next_billing_date to UTC for storage
   - Update subscription with new next_billing_date
   - Handle errors with retry logic (3 attempts)
6. Return processing summary

**Example:**
- User in Asia/Shanghai (UTC+8)
- Current UTC time: 2024-03-20 16:00:00 UTC
- User's local time: 2024-03-21 00:00:00 CST
- User's local date: 2024-03-21
- Subscription next_billing_date: 2024-03-21 (stored as UTC date)
- Match found → Process billing

## Data Models

### Enhanced Expense Interface

```typescript
export interface Expense {
  id: string
  amount: number
  categoryId: string
  categoryName?: string
  categoryDisplayName?: string
  categoryColor?: string
  date: string
  note?: string
  userId?: string
  subscriptionId?: string  // NEW: Link to subscription
  createdAt?: string
  updatedAt?: string
}
```

### Billing Event Calculation

**Monthly Frequency:**
```typescript
// Start: 2024-01-15, Today: 2024-03-20
// Events: 2024-01-15, 2024-02-15, 2024-03-15
// Count: 3
```

**Yearly Frequency:**
```typescript
// Start: 2022-06-01, Today: 2024-03-20
// Events: 2022-06-01, 2023-06-01
// Count: 2
```

**Edge Cases:**
- Month-end dates (e.g., Jan 31 → Feb 28/29)
- Leap years
- End date constraints

### Subscription Category

**Default Category:**
- Name: "subscription"
- Display Name: "订阅"
- Color: "#9C27B0" (purple)
- Chart Color: "#9C27B0"
- Icon: "mdi-sync"
- Level: 0 (top-level)
- Is Default: true

**Creation:**
- Created automatically for new users during category initialization
- Created on-demand if missing when first subscription is added

### User Timezone Preference

**Storage:**
- Table: `user_preferences`
- Category: `'general'`
- Key: `'timezone'`
- Value: IANA timezone string (e.g., `'Asia/Shanghai'`, `'America/New_York'`)

**Default Behavior:**
- If no preference set: Use browser's detected timezone
- Fallback: `'UTC'` if detection fails

**UI Enhancement:**
- Add timezone selector to user settings/preferences page
- Display current timezone
- Allow selection from common timezones
- Show timezone abbreviation and UTC offset

**Timezone Library:**
- Use `date-fns-tz` for timezone conversions
- Functions: `zonedTimeToUtc`, `utcToZonedTime`, `format`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Billing event calculation accuracy
*For any* subscription with a start date before today, the calculated billing events should have a count equal to the number of billing cycles that have occurred between the start date and today based on the billing frequency, and each event date should align with the billing cycle.
**Validates: Requirements 1.1**

### Property 2: Preview data integrity
*For any* set of calculated billing events, the preview should contain a count equal to the number of events and a total amount equal to the sum of all event amounts.
**Validates: Requirements 1.2**

### Property 3: Expense creation completeness
*For any* set of billing events that are confirmed for expense creation, the number of expenses successfully created should equal the number of billing events.
**Validates: Requirements 1.4**

### Property 4: Expense data integrity
*For any* expense created from a billing event, the expense should have the same amount, date, and currency as the billing event, should be assigned to the subscription category, and should have its subscription_id field set to the originating subscription's ID.
**Validates: Requirements 1.6, 1.7, 1.8, 3.1**

### Property 5: Due subscription identification
*For any* given date and set of subscriptions, the system should identify exactly those subscriptions whose next_billing_date equals that date and whose end_date (if present) is not before that date.
**Validates: Requirements 2.1**

### Property 6: Billing expense creation
*For any* subscription whose next_billing_date matches the current date, after processing, an expense should exist with the subscription's amount, the billing date, and linked to the subscription.
**Validates: Requirements 2.2**

### Property 7: Next billing date update
*For any* subscription after processing a billing event, the next_billing_date should be incremented by one month for monthly subscriptions or one year for yearly subscriptions from the previous next_billing_date.
**Validates: Requirements 2.3, 2.4, 2.5**

### Property 8: Subscription display indication
*For any* expense with a non-null subscription_id, the display representation should indicate that it was generated from a subscription.
**Validates: Requirements 3.2**

### Property 9: Start date update expense generation
*For any* subscription update that changes the start date to an earlier date, new billing events should be calculated for the period between the new start date and the old start date, and expenses should be created for those events.
**Validates: Requirements 4.1**

### Property 10: Frequency update recalculation
*For any* subscription where the billing frequency is updated, the next_billing_date should be recalculated based on the new frequency from the last billing date.
**Validates: Requirements 4.2**

### Property 11: Amount update isolation
*For any* subscription where the amount is updated, all existing expenses linked to that subscription should retain their original amounts.
**Validates: Requirements 4.3**

### Property 12: Error isolation in batch processing
*For any* batch of subscriptions being processed, if one subscription fails to create an expense, the remaining subscriptions should still be processed and the error should be logged with subscription details.
**Validates: Requirements 5.1**

### Property 13: Execution logging
*For any* cron job execution, after completion, there should exist a log record containing the execution timestamp, processed count, success count, and failed count.
**Validates: Requirements 5.2**

### Property 14: Update retry behavior
*For any* failed subscription update operation during cron job execution, the system should attempt the operation up to 3 times before recording it as a failure.
**Validates: Requirements 5.3**

## Error Handling

### User-Facing Errors

**Subscription Creation with Past Bills:**
- Network failure during expense creation: Show error, allow retry, subscription remains created
- Partial expense creation failure: Show count of successful/failed, allow retry for failed
- Category not found: Auto-create subscription category, retry expense creation

**Subscription Updates:**
- Invalid date changes: Validate before submission, show clear error messages
- Expense generation failure: Show error, subscription update succeeds, allow manual expense generation

**Subscription Deletion:**
- Expense deletion failure: Warn user, offer to retry or keep expenses
- Partial deletion: Show which expenses failed to delete

### System Errors (Cron Job)

**Database Errors:**
- Connection timeout: Exponential backoff (1s, 2s, 4s, 8s, 16s), max 5 attempts
- Query failure: Retry up to 3 times, log failure details
- Transaction rollback: Ensure atomic operations per subscription

**Processing Errors:**
- Invalid subscription data: Log error, skip subscription, continue processing
- Expense creation failure: Retry 3 times, log failure, continue processing
- Update failure: Retry 3 times, log failure, mark for manual review

**Logging:**
- All errors logged with: timestamp, subscription_id, error message, stack trace
- Summary statistics: total processed, successful, failed, error types
- Alert on high failure rate (>10%)

## Testing Strategy

### Unit Testing

**Framework:** Vitest (existing project framework)

**Test Coverage:**
- Billing event calculation logic (various date ranges, frequencies)
- Date arithmetic (month-end handling, leap years)
- Preview generation (count, total calculations)
- Expense data transformation
- Category lookup and creation
- Error handling paths

**Key Unit Tests:**
- `calculateBillingEvents` with various start dates and frequencies
- Month-end date handling (Jan 31 → Feb 28/29)
- Leap year handling
- End date constraints
- Currency conversion (if applicable)
- Category ID resolution

### Property-Based Testing

**Framework:** fast-check (JavaScript/TypeScript PBT library)

**Configuration:**
- Minimum 100 iterations per property test
- Custom generators for dates, subscriptions, billing events
- Shrinking enabled for minimal failing examples

**Generators:**
```typescript
// Generate random subscription data
const subscriptionArbitrary = fc.record({
  startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  amount: fc.float({ min: 0.01, max: 10000, noNaN: true }),
  currency: fc.constantFrom('CNY', 'USD', 'EUR'),
  frequency: fc.constantFrom('monthly', 'yearly'),
  endDate: fc.option(fc.date({ min: new Date(), max: new Date('2030-12-31') }))
})

// Generate random billing events
const billingEventArbitrary = fc.array(
  fc.record({
    date: fc.date(),
    amount: fc.float({ min: 0.01, max: 10000 }),
    currency: fc.constantFrom('CNY', 'USD', 'EUR')
  }),
  { minLength: 0, maxLength: 100 }
)
```

**Property Test Tags:**
Each property-based test must include a comment tag referencing the design document:
```typescript
// **Feature: subscription-expense-persistence, Property 1: Billing event calculation accuracy**
test('billing events calculated correctly for any subscription', () => { ... })
```

### Integration Testing

**Scope:**
- End-to-end subscription creation with expense generation
- Cron job execution simulation
- Database transaction integrity
- Error recovery scenarios

**Test Scenarios:**
- Create subscription → Verify expenses created → Verify links
- Update subscription → Verify expense changes
- Delete subscription → Verify expense handling
- Simulate cron job → Verify expense creation and date updates
- Network failure during expense creation → Verify rollback
- Partial batch failure → Verify error isolation

### Edge Function Testing

**Local Testing:**
- Use Supabase CLI to run function locally
- Mock database with test subscriptions
- Verify expense creation and updates
- Test error scenarios

**Staging Testing:**
- Deploy to staging environment
- Schedule test runs
- Monitor logs and results
- Verify production-like behavior

## Implementation Notes

### Date Handling

**Timezone Considerations:**
- All dates stored as DATE type in UTC in database (no time component)
- User timezone preference stored in user_preferences table (category: 'general', key: 'timezone')
- Cron job runs hourly and evaluates billing dates in each user's timezone
- Billing dates calculated in user's timezone to match user expectations
- When user creates subscription, dates are interpreted in their timezone
- When displaying dates, convert from UTC to user's timezone
- Default timezone: User's browser timezone if not set in preferences
- Hourly cron execution ensures max 1-hour delay for any timezone

**Month-End Handling:**
```typescript
// Example: Jan 31 → Feb 28 (non-leap) or Feb 29 (leap)
// Use date library (date-fns) for reliable date arithmetic
import { addMonths, addYears } from 'date-fns'

const nextBillingDate = frequency === 'monthly' 
  ? addMonths(currentDate, 1)
  : addYears(currentDate, 1)
```

### Performance Considerations

**Batch Operations:**
- Use `batchSaveExpenses` for creating multiple expenses
- Single database transaction per subscription in cron job
- Limit cron job to process max 1000 subscriptions per run

**Database Indexes:**
- Index on `subscriptions.next_billing_date` for cron job queries
- Index on `expenses.subscription_id` for lookups
- Composite index on `subscriptions(next_billing_date, end_date)` for filtering

### Security Considerations

**Row Level Security:**
- Expenses created by cron job must have correct user_id
- Edge Function uses service role key (bypasses RLS)
- Verify user_id from subscription before creating expense

**Input Validation:**
- Validate all date inputs
- Validate amount ranges
- Sanitize user inputs in notes/names
- Prevent SQL injection in dynamic queries

### Deployment Steps

1. **Database Migration:**
   - Add `subscription_id` column to expenses table
   - Create index on `subscription_id`
   - Create subscription category for existing users

2. **Code Deployment:**
   - Deploy new composables and components
   - Update subscription form with confirmation dialog
   - Deploy expense display enhancements

3. **Edge Function Deployment:**
   - Create Edge Function in Supabase
   - Deploy function: `supabase functions deploy process-subscription-bills`
   - Configure environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
   - Set up pg_cron schedule in database (run SQL script)
   - Test with staging data
   - Verify cron job is registered: `SELECT * FROM cron.job;`

4. **Monitoring and Auditing:**
   - Set up logging for cron job executions
   - Monitor error rates
   - Alert on failures
   - Track expense creation metrics
   - See detailed monitoring section below


## Monitoring and Auditing

### Cron Job Execution Logs

**Log Table Schema:**
```sql
CREATE TABLE IF NOT EXISTS subscription_billing_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_start TIMESTAMP WITH TIME ZONE NOT NULL,
    execution_end TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    processed_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX subscription_billing_logs_execution_start_idx ON subscription_billing_logs(execution_start DESC);
CREATE INDEX subscription_billing_logs_status_idx ON subscription_billing_logs(status);
```

**Log Entry Structure:**
```typescript
interface BillingLogEntry {
  id: string
  executionStart: string  // ISO timestamp
  executionEnd: string | null
  status: 'running' | 'completed' | 'failed'
  processedCount: number
  successCount: number
  failedCount: number
  errorDetails: {
    errors: Array<{
      subscriptionId: string
      userId: string
      subscriptionName: string
      error: string
      timestamp: string
    }>
  } | null
  createdAt: string
}
```

### Monitoring Dashboard Queries

**Recent Executions:**
```sql
-- Get last 24 hours of cron executions
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

**Success Rate:**
```sql
-- Calculate success rate over last 7 days
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

**Failed Subscriptions:**
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

### Edge Function Logging

**Log Levels:**
- `INFO`: Normal execution flow (start, end, counts)
- `WARN`: Recoverable errors (retry attempts, skipped subscriptions)
- `ERROR`: Unrecoverable errors (database failures, critical bugs)

**Log Format:**
```typescript
// Structured logging in Edge Function
console.log(JSON.stringify({
  level: 'INFO',
  timestamp: new Date().toISOString(),
  message: 'Processing subscription billing',
  data: {
    subscriptionId: subscription.id,
    userId: subscription.userId,
    nextBillingDate: subscription.nextBillingDate,
    userTimezone: userTimezone
  }
}))
```

**Accessing Logs:**
1. Supabase Dashboard → Edge Functions → process-subscription-bills → Logs
2. Filter by time range, log level
3. Search for specific subscription IDs or error messages
4. Export logs for analysis

### Monitoring Metrics

**Key Metrics to Track:**

1. **Execution Frequency:**
   - Expected: 24 executions per day (hourly)
   - Alert if: < 20 executions in 24 hours

2. **Processing Time:**
   - Expected: < 30 seconds for < 1000 subscriptions
   - Alert if: > 60 seconds

3. **Success Rate:**
   - Expected: > 95% success rate
   - Alert if: < 90% success rate

4. **Failed Subscriptions:**
   - Expected: < 5% failure rate
   - Alert if: Same subscription fails 3+ times consecutively

5. **Expense Creation Rate:**
   - Track: Number of expenses created per execution
   - Alert if: Sudden spike or drop (> 50% change)

### Alerting Strategy

**Critical Alerts (Immediate Action):**
- Cron job hasn't run in 2+ hours
- Success rate < 80% for 3+ consecutive executions
- Database connection failures
- Edge Function deployment failures

**Warning Alerts (Review Within 24h):**
- Success rate 80-90% for 2+ consecutive executions
- Individual subscription failing 3+ times
- Processing time > 60 seconds
- Unusual error patterns

**Alert Channels:**
- Email notifications
- Slack/Discord webhooks
- Supabase Dashboard notifications

### Audit Trail

**Subscription Changes:**
```sql
-- Track subscription modifications that affect billing
CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    old_values JSONB,
    new_values JSONB,
    changed_by TEXT,  -- 'user' or 'system'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX subscription_audit_log_subscription_id_idx ON subscription_audit_log(subscription_id);
CREATE INDEX subscription_audit_log_created_at_idx ON subscription_audit_log(created_at DESC);
```

**Expense Generation Audit:**
- Link expenses to subscription via `subscription_id`
- Track which cron execution created each expense (via log timestamp correlation)
- Enable tracing from expense → subscription → billing log

### Health Check Endpoint

**Edge Function Health Check:**
```typescript
// Add health check route to Edge Function
if (req.method === 'GET' && url.pathname === '/health') {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

**Monitoring Health:**
- External monitoring service pings health endpoint every 5 minutes
- Alert if health check fails 3+ consecutive times
- Verify Edge Function is deployed and responsive

### Debugging Tools

**Manual Execution:**
```bash
# Manually trigger Edge Function for testing
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Dry Run Mode:**
```typescript
// Add dry-run parameter to test without creating expenses
if (req.method === 'POST') {
  const { dryRun } = await req.json()
  
  if (dryRun) {
    // Calculate what would be processed but don't create expenses
    return new Response(JSON.stringify({
      dryRun: true,
      wouldProcess: subscriptions.length,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        name: s.name,
        nextBillingDate: s.nextBillingDate
      }))
    }))
  }
}
```

**Subscription Status Check:**
```sql
-- Check subscription processing status
SELECT 
  s.id,
  s.name,
  s.next_billing_date,
  s.billing_frequency,
  s.is_auto_renew,
  s.end_date,
  up.value as user_timezone,
  COUNT(e.id) as expense_count,
  MAX(e.date) as last_expense_date
FROM subscriptions s
LEFT JOIN user_preferences up ON s.user_id = up.user_id 
  AND up.category = 'general' 
  AND up.key = 'timezone'
LEFT JOIN expenses e ON s.id = e.subscription_id
WHERE s.user_id = 'USER_ID_HERE'
GROUP BY s.id, s.name, s.next_billing_date, s.billing_frequency, 
         s.is_auto_renew, s.end_date, up.value
ORDER BY s.next_billing_date;
```

### Performance Monitoring

**Database Query Performance:**
```sql
-- Monitor slow queries related to subscription billing
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

**Index Usage:**
```sql
-- Verify indexes are being used
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

### Troubleshooting Guide

**Common Issues:**

1. **Subscription not processed:**
   - Check user's timezone preference
   - Verify next_billing_date is correct
   - Check if subscription is expired (end_date < today)
   - Review error logs for that subscription_id

2. **Duplicate expenses created:**
   - Check cron job execution logs for duplicate runs
   - Verify next_billing_date was updated after expense creation
   - Add unique constraint if needed: `UNIQUE(subscription_id, date)`

3. **Missing expenses:**
   - Check if cron job ran during expected time
   - Verify subscription was active at billing time
   - Check error logs for failures
   - Manually trigger processing for affected subscriptions

4. **Timezone issues:**
   - Verify user's timezone preference is set correctly
   - Check date conversion logic in Edge Function
   - Compare expected vs actual billing dates in user's timezone
   - Test with different timezones

5. **Performance degradation:**
   - Check number of active subscriptions
   - Review query execution plans
   - Verify indexes are present and used
   - Consider batching if processing > 10,000 subscriptions
