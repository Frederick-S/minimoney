# Implementation Plan

- [x] 1. Database schema updates and timezone preference setup
  - Add subscription_id column to expenses table with foreign key and index
  - Create subscription_billing_logs table for cron execution tracking
  - Create subscription_audit_log table for change tracking
  - Add unique constraint on expenses(subscription_id, date) to prevent duplicates
  - Ensure subscription category exists for all users
  - _Requirements: 1.7, 3.1, 5.2_

- [x] 2. Implement timezone preference management
  - [x] 2.1 Create useTimezone composable for timezone operations
    - Implement getUserTimezone() to get user's timezone from preferences or browser
    - Implement saveUserTimezone() to save timezone preference
    - Implement timezone conversion utilities using date-fns-tz
    - _Requirements: All date-related requirements_

  - [x] 2.2 Write property test for timezone composable
    - **Property 15: Timezone round trip**
    - **Validates: Requirements: All date-related requirements**

  - [x] 2.3 Add timezone selector to user settings UI
    - Create TimezoneSelector component with common timezone options
    - Display current timezone and UTC offset
    - Integrate with user preferences page
    - _Requirements: All date-related requirements_

- [x] 3. Implement billing event calculation logic
  - [x] 3.1 Create useSubscriptionExpenses composable
    - Implement calculateBillingEvents() with timezone support
    - Implement generatePastBillsPreview() for user confirmation
    - Implement createExpensesForBillingEvents() with batch creation
    - Implement getSubscriptionExpenses() to fetch linked expenses
    - Implement deleteSubscriptionExpenses() for cleanup
    - Handle month-end dates and leap years correctly
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 1.7, 1.8_

  - [x] 3.2 Write property test for billing event calculation
    - **Property 1: Billing event calculation accuracy**
    - **Validates: Requirements 1.1**

  - [x] 3.3 Write property test for preview data integrity
    - **Property 2: Preview data integrity**
    - **Validates: Requirements 1.2**

  - [x] 3.4 Write property test for expense creation completeness
    - **Property 3: Expense creation completeness**
    - **Validates: Requirements 1.4**

  - [x] 3.5 Write property test for expense data integrity
    - **Property 4: Expense data integrity**
    - **Validates: Requirements 1.6, 1.7, 1.8, 3.1**

  - [x] 3.6 Write unit tests for edge cases
    - Test month-end date handling (Jan 31 → Feb 28/29)
    - Test leap year handling
    - Test end date constraints
    - Test empty billing event arrays
    - _Requirements: 1.1, 1.6_

- [x] 4. Create past bills confirmation dialog
  - [x] 4.1 Implement PastBillsConfirmDialog component
    - Display billing event count, date range, and total amount
    - Show formatted preview of expenses to be created
    - Provide confirm and cancel actions
    - Handle loading states during expense creation
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 4.2 Write unit tests for dialog component
    - Test preview display with various billing event counts
    - Test confirm and cancel actions
    - Test loading states
    - _Requirements: 1.2, 1.3, 1.5_

- [x] 5. Enhance subscription form with expense generation
  - [x] 5.1 Update SubscriptionForm component
    - Integrate timezone from useTimezone composable
    - Calculate past bills when start date changes
    - Show PastBillsConfirmDialog when past bills exist
    - Handle user confirmation/cancellation
    - Call createSubscriptionWithExpenses with appropriate flags
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 5.2 Enhance useSubscriptions composable
    - Implement createSubscriptionWithExpenses() method
    - Integrate with useSubscriptionExpenses for expense generation
    - Handle transaction-like behavior (rollback on failure)
    - Implement deleteSubscriptionWithExpenses() with option dialog
    - _Requirements: 1.4, 1.5, 4.4_

  - [x] 5.3 Write integration tests for subscription creation flow
    - Test subscription creation with past bills confirmed
    - Test subscription creation with past bills declined
    - Test subscription creation with no past bills
    - Test error handling during expense creation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement subscription update handling
  - [x] 7.1 Add update logic for start date changes
    - Detect when start date moves earlier
    - Calculate new billing events for extended period
    - Generate expenses for new billing events
    - _Requirements: 4.1_

  - [x] 7.2 Write property test for start date update
    - **Property 9: Start date update expense generation**
    - **Validates: Requirements 4.1**

  - [x] 7.3 Add update logic for frequency changes
    - Recalculate next_billing_date based on new frequency
    - Update subscription record
    - _Requirements: 4.2_

  - [ ] 7.4 Write property test for frequency update
    - **Property 10: Frequency update recalculation**
    - **Validates: Requirements 4.2**

  - [ ] 7.5 Add update logic for amount changes
    - Verify existing expenses remain unchanged
    - Apply new amount to future billing only
    - _Requirements: 4.3_

  - [ ] 7.6 Write property test for amount update isolation
    - **Property 11: Amount update isolation**
    - **Validates: Requirements 4.3**

- [ ] 8. Enhance expense display with subscription indicators
  - [ ] 8.1 Update Expense interface and display components
    - Add subscriptionId field to Expense interface
    - Update ExpenseList to show subscription indicator icon
    - Add tooltip showing subscription name for linked expenses
    - Implement navigation to subscription from expense
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 8.2 Write property test for subscription display indication
    - **Property 8: Subscription display indication**
    - **Validates: Requirements 3.2**

  - [ ] 8.3 Write unit tests for expense display enhancements
    - Test subscription indicator visibility
    - Test navigation to subscription
    - Test display for non-subscription expenses
    - _Requirements: 3.2, 3.3_

- [ ] 9. Implement Supabase Edge Function for automated billing
  - [ ] 9.1 Create process-subscription-bills Edge Function
    - Set up Edge Function project structure
    - Implement main processing logic with timezone handling
    - Query subscriptions due for billing (in user's timezone)
    - Create expenses for due subscriptions
    - Update next_billing_date for processed subscriptions
    - Handle end dates and auto-renew logic
    - Implement error handling with retry logic (3 attempts)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.3_

  - [ ] 9.2 Write property test for due subscription identification
    - **Property 5: Due subscription identification**
    - **Validates: Requirements 2.1**

  - [ ] 9.3 Write property test for billing expense creation
    - **Property 6: Billing expense creation**
    - **Validates: Requirements 2.2**

  - [ ] 9.4 Write property test for next billing date update
    - **Property 7: Next billing date update**
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ] 9.5 Write property test for error isolation
    - **Property 12: Error isolation in batch processing**
    - **Validates: Requirements 5.1**

  - [ ] 9.6 Write unit tests for Edge Function
    - Test timezone conversion logic
    - Test end date handling (edge case from 2.6)
    - Test retry logic
    - Test logging functionality
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 5.1, 5.3_

- [ ] 10. Implement logging and monitoring infrastructure
  - [ ] 10.1 Add execution logging to Edge Function
    - Log execution start/end with timestamps
    - Log processed, success, and failed counts
    - Log individual errors with subscription details
    - Store logs in subscription_billing_logs table
    - _Requirements: 5.1, 5.2_

  - [ ] 10.2 Write property test for execution logging
    - **Property 13: Execution logging**
    - **Validates: Requirements 5.2**

  - [ ] 10.3 Write property test for update retry behavior
    - **Property 14: Update retry behavior**
    - **Validates: Requirements 5.3**

  - [ ] 10.4 Create monitoring dashboard queries
    - Implement SQL queries for recent executions
    - Implement SQL queries for success rate calculation
    - Implement SQL queries for failed subscriptions
    - Document query usage in monitoring guide
    - _Requirements: 5.2_

  - [ ] 10.5 Add health check endpoint to Edge Function
    - Implement GET /health endpoint
    - Return status, timestamp, and version
    - _Requirements: 5.2_

- [ ] 11. Set up cron job scheduling
  - [ ] 11.1 Create pg_cron schedule in database
    - Write SQL script to enable pg_cron extension
    - Create hourly cron job (0 * * * *)
    - Configure HTTP POST to Edge Function URL
    - Set up authentication with service role key
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 11.2 Test cron job execution
    - Manually trigger Edge Function to verify functionality
    - Verify cron job is registered in pg_cron
    - Monitor first few automatic executions
    - Verify logs are being created correctly
    - _Requirements: 2.1, 2.2, 5.2_

- [ ] 12. Implement audit trail for subscription changes
  - [ ] 12.1 Add audit logging to subscription operations
    - Log subscription creation with initial values
    - Log subscription updates with old and new values
    - Log subscription deletion
    - Store in subscription_audit_log table
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 12.2 Write unit tests for audit logging
    - Test audit log creation on subscription create
    - Test audit log creation on subscription update
    - Test audit log creation on subscription delete
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 13. Add subscription deletion with expense handling
  - [ ] 13.1 Create deletion confirmation dialog
    - Show option to keep or delete linked expenses
    - Display count of linked expenses
    - Warn about consequences of each option
    - _Requirements: 4.4_

  - [ ] 13.2 Implement deletion logic
    - Delete subscription record
    - Optionally delete linked expenses based on user choice
    - Handle partial deletion failures
    - _Requirements: 4.4_

  - [ ] 13.3 Write unit tests for deletion flow
    - Test deletion with expense retention
    - Test deletion with expense removal
    - Test error handling
    - _Requirements: 4.4_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Create deployment and monitoring documentation
  - [ ] 15.1 Write deployment guide
    - Document database migration steps
    - Document Edge Function deployment process
    - Document cron job setup
    - Document environment variable configuration
    - _Requirements: All_

  - [ ] 15.2 Write monitoring and troubleshooting guide
    - Document how to access logs
    - Document monitoring queries
    - Document common issues and solutions
    - Document alerting setup
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 15.3 Create user documentation
    - Document how to create subscriptions with past bills
    - Document timezone preference setting
    - Document how to view subscription-linked expenses
    - Document how to update and delete subscriptions
    - _Requirements: All_
