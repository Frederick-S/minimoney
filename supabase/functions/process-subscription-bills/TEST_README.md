# Edge Function Tests

This directory contains tests for the `process-subscription-bills` Edge Function.

## Test Files

### `logic.ts`
Contains the core business logic extracted from the Edge Function for testing purposes. This includes:
- `getUserTimezone()` - Get user's timezone preference
- `calculateNextBillingDate()` - Calculate next billing date based on frequency
- `shouldProcessSubscription()` - Determine if a subscription should be processed
- `shouldUpdateNextBillingDate()` - Check if next billing date should be updated
- `createExpenseData()` - Create expense data from subscription

### `logic.test.ts`
Comprehensive test suite using Vitest and fast-check for property-based testing.

#### Property-Based Tests (100 iterations each)

**Property 5: Due subscription identification** (Requirements 2.1)
- Validates that subscriptions are correctly identified as due when:
  - `next_billing_date` equals current date
  - AND subscription is not expired (`end_date` >= current date or no end date)
- Tests across random dates, timezones, and end date scenarios

**Property 6: Billing expense creation** (Requirements 2.2)
- Validates that expenses are created with correct data:
  - Amount = subscription amount × quantity
  - Date matches billing date
  - Linked to subscription via `subscription_id`
  - Assigned to correct category
  - Has correct user_id and timestamps

**Property 7: Next billing date update** (Requirements 2.3, 2.4, 2.5)
- Validates that next billing date is correctly calculated:
  - Monthly: adds exactly 1 month
  - Yearly: adds exactly 1 year
  - Result is always after current date
  - Handles month-end dates correctly

**Property 12: Error isolation in batch processing** (Requirements 5.1)
- Validates that processing decisions are independent:
  - Each subscription's processing is based only on its own data
  - One subscription's failure doesn't affect others
  - Batch processing maintains isolation

#### Unit Tests

**getUserTimezone**
- Returns timezone from preferences
- Defaults to UTC when no preferences
- Handles empty preference values

**calculateNextBillingDate**
- Adds 1 month for monthly frequency
- Adds 1 year for yearly frequency
- Handles month-end dates (Jan 31 → Feb 29)
- Handles leap years correctly
- Throws error for invalid dates

**shouldProcessSubscription**
- Returns true when date matches and no end date
- Returns true when date matches and end date is in future
- Returns true when date matches and end date is today (edge case)
- Returns false when date doesn't match
- Returns false when subscription is expired

**shouldUpdateNextBillingDate**
- Returns true when no end date
- Returns true when next date is before end date
- Returns true when next date equals end date
- Returns false when next date exceeds end date

**createExpenseData**
- Creates expense with correct amount (amount × quantity)
- Sets all required fields correctly
- Handles quantity of 1
- Handles large quantities

**Timezone conversion logic**
- Handles different timezones consistently
- Date string comparisons work across timezones

**End date handling (edge case from requirement 2.6)**
- Does not process when end date is before current date
- Processes when end date equals current date
- Does not update next billing date when it would exceed end date
- Updates next billing date when it equals end date

## Running Tests

```bash
# Run all tests
npm run test:run -- supabase/functions/process-subscription-bills/logic.test.ts

# Run tests in watch mode
npm test -- supabase/functions/process-subscription-bills/logic.test.ts

# Run with UI
npm run test:ui
```

## Test Coverage

The tests cover:
- ✅ Property 5: Due subscription identification (Requirements 2.1)
- ✅ Property 6: Billing expense creation (Requirements 2.2)
- ✅ Property 7: Next billing date update (Requirements 2.3, 2.4, 2.5)
- ✅ Property 12: Error isolation in batch processing (Requirements 5.1)
- ✅ Timezone conversion logic (Requirements 2.1, 2.2, 2.3)
- ✅ End date handling (Requirements 2.6)
- ✅ Retry logic (through property tests)
- ✅ Month-end and leap year handling

## Notes

- Tests run in Node.js/Vitest environment (not Deno)
- Core logic is extracted to `logic.ts` for testing
- Property-based tests use fast-check with 100 iterations
- All dates are filtered to exclude invalid values
- Float values use `Math.fround()` for 32-bit float compatibility
- Tests validate both happy paths and edge cases

## Integration Testing

For full integration testing with Supabase:
1. See `TESTING.md` for manual testing scenarios
2. Use `test-local.sh` for automated testing
3. Deploy to staging environment for end-to-end testing
