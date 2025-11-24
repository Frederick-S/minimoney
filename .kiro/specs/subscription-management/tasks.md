# Implementation Plan

- [x] 1. Set up database schema and types
  - Create subscriptions table with RLS policies
  - Create user_preferences table with RLS policies
  - Add database triggers for updated_at timestamps
  - Define TypeScript interfaces for Subscription, UserPreference, Currency, ExchangeRate, and display models
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 4.1, 4.2_

- [x] 2. Implement currency management composable
- [x] 2.1 Create useCurrency composable with exchange rate API integration
  - Implement fetchExchangeRates function to call exchangerate-api.com
  - Implement localStorage caching with 24-hour validity
  - Implement loadCachedRates and cacheRates functions
  - Implement isCacheValid function to check cache age
  - Implement convert function for currency conversion
  - Implement getExchangeRate function
  - Implement loadUserCurrencyPreference to read from user_preferences table
  - Implement setMainCurrency to save to user_preferences table
  - Define supported currencies list (CNY, USD, EUR, GBP, JPY, HKD)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2.2 Write property test for currency conversion
  - **Property 10: Currency conversion accuracy**
  - **Validates: Requirements 4.1, 4.3, 4.4**

- [x] 2.3 Write property test for same currency display
  - **Property 12: Same currency display**
  - **Validates: Requirements 4.5**

- [x] 3. Implement subscription management composable
- [x] 3.1 Create useSubscriptions composable with CRUD operations
  - Implement loadSubscriptions function to fetch from database
  - Implement createSubscription function with validation
  - Implement updateSubscription function with validation
  - Implement deleteSubscription function
  - Implement calculateNextBillingDate function for monthly and yearly frequencies
  - Add snake_case to camelCase conversion utilities
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3_

- [x] 3.2 Write property test for subscription creation
  - **Property 1: Subscription creation with valid data**
  - **Validates: Requirements 1.1, 1.4**

- [x] 3.3 Write property test for required field validation
  - **Property 2: Required field validation**
  - **Validates: Requirements 1.2**

- [x] 3.4 Write property test for billing frequency validation
  - **Property 3: Billing frequency validation**
  - **Validates: Requirements 1.3**

- [x] 3.5 Write property test for end date and auto-renew relationship
  - **Property 4: End date and auto-renew relationship**
  - **Validates: Requirements 1.5**

- [x] 3.6 Write property test for subscription update persistence
  - **Property 5: Subscription update persistence**
  - **Validates: Requirements 2.1, 2.4**

- [x] 3.7 Write property test for auto-renew to fixed end date transition
  - **Property 6: Auto-renew to fixed end date transition**
  - **Validates: Requirements 2.2**

- [x] 3.8 Write property test for fixed end date to auto-renew transition
  - **Property 7: Fixed end date to auto-renew transition**
  - **Validates: Requirements 2.3**

- [x] 3.9 Write property test for currency change recalculation
  - **Property 8: Currency change recalculation**
  - **Validates: Requirements 2.5**

- [x] 3.10 Write property test for subscription deletion
  - **Property 9: Subscription deletion**
  - **Validates: Requirements 3.1, 3.3**

- [x] 4. Implement subscription calculations composable
- [x] 4.1 Create useSubscriptionCalculations composable
  - Implement calculateMonthlyEquivalent function
  - Implement calculateYearlyEquivalent function
  - Implement isExpired function to check if end date has passed
  - Implement isEndingSoon function with 30-day threshold
  - Implement getDaysUntilEnd function
  - Implement calculateTotalCosts function for monthly and yearly totals
  - _Requirements: 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 4.2 Write property test for expiration detection
  - **Property 19: Expiration detection**
  - **Validates: Requirements 6.4**

- [x] 4.3 Write property test for ending soon detection
  - **Property 18: Ending soon detection**
  - **Validates: Requirements 6.3**

- [x] 4.4 Write property test for monthly total calculation
  - **Property 21: Monthly total calculation**
  - **Validates: Requirements 7.1, 7.3**

- [x] 4.5 Write property test for yearly total calculation
  - **Property 22: Yearly total calculation**
  - **Validates: Requirements 7.2, 7.4**

- [x] 4.6 Write property test for expired subscription exclusion from totals
  - **Property 23: Expired subscription exclusion from totals**
  - **Validates: Requirements 7.5, 7.6**

- [x] 5. Create subscription form component
- [x] 5.1 Implement SubscriptionForm.vue component
  - Create form with fields: name, amount, currency, billing frequency, renewal type, end date
  - Implement form validation for required fields
  - Implement validation for positive amounts
  - Implement validation for future end dates
  - Implement conditional end date field based on renewal type
  - Add currency selector with supported currencies
  - Add billing frequency radio buttons (monthly/yearly)
  - Add renewal type radio buttons (auto-renew/fixed end date)
  - Emit save and update events
  - Handle both create and edit modes
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5_

- [x] 6. Create subscription display components
- [x] 6.1 Implement SubscriptionCard.vue component
  - Display subscription name
  - Display amount in main currency
  - Display original amount and currency if different
  - Display billing frequency badge
  - Display auto-renew icon or end date
  - Display warning indicator for subscriptions ending soon
  - Display expired badge for past end dates
  - Display next billing date
  - Add edit and delete action buttons
  - _Requirements: 4.2, 4.5, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.2 Write property test for dual currency display
  - **Property 11: Dual currency display**
  - **Validates: Requirements 4.2**

- [x] 6.3 Write property test for subscription display information
  - **Property 14: Subscription display information**
  - **Validates: Requirements 5.3**

- [x] 6.4 Write property test for auto-renew indicator
  - **Property 16: Auto-renew indicator**
  - **Validates: Requirements 6.1**

- [x] 6.5 Write property test for end date display
  - **Property 17: End date display**
  - **Validates: Requirements 6.2**

- [x] 6.6 Write property test for next billing date calculation
  - **Property 20: Next billing date calculation**
  - **Validates: Requirements 6.5**

- [x] 7. Create subscription list component
- [x] 7.1 Implement SubscriptionList.vue component
  - Display list of subscription cards
  - Group subscriptions by status (active/expired)
  - Show loading state
  - Show empty state when no subscriptions
  - Emit edit and delete events
  - _Requirements: 5.1, 5.3_

- [x] 7.2 Write property test for subscription list completeness
  - **Property 13: Subscription list completeness**
  - **Validates: Requirements 5.1**

- [x] 8. Create subscription summary component
- [x] 8.1 Implement SubscriptionSummary.vue component
  - Display total monthly cost
  - Display total yearly cost
  - Display active subscription count
  - Display currency indicator
  - Use card layout with clear labels
  - _Requirements: 7.1, 7.2_

- [x] 9. Create currency settings component
- [x] 9.1 Implement CurrencySettings.vue component
  - Display current main currency
  - Provide currency selector dropdown
  - Emit update event when currency changes
  - Show supported currencies with symbols
  - _Requirements: 4.1, 4.3_

- [x] 10. Create main subscriptions view
- [x] 10.1 Implement SubscriptionsView.vue component
  - Load subscriptions on mount
  - Load currency preferences on mount
  - Fetch exchange rates (check cache first)
  - Manage subscription form dialog state
  - Handle subscription create/update/delete operations
  - Convert subscriptions to display format with currency conversion
  - Calculate and pass summary data to SubscriptionSummary
  - Show currency settings option
  - Handle loading and error states
  - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 3.3, 4.1, 4.3, 5.1, 5.5_

- [x] 10.2 Write property test for state persistence across navigation
  - **Property 15: State persistence across navigation**
  - **Validates: Requirements 5.5**

- [x] 11. Add subscriptions tab to navigation
- [x] 11.1 Update BottomNavigation.vue to include subscriptions tab
  - Add subscriptions button with icon (mdi-sync)
  - Add Chinese label "订阅"
  - Update route mapping to handle subscriptions tab
  - _Requirements: 5.2, 5.4_

- [x] 11.2 Add subscriptions route to router
  - Create route for /subscriptions path
  - Set requiresAuth meta flag
  - Import SubscriptionsView component
  - _Requirements: 5.1, 5.2_

- [x] 12. Add database migration scripts
- [x] 12.1 Create SQL migration files
  - Create db/subscriptions-schema.sql with subscriptions table
  - Create db/user-preferences-schema.sql with user_preferences table
  - Add RLS policies for both tables
  - Add triggers for updated_at columns
  - Add indexes for performance
  - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 4.1_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Add confirmation dialog for subscription deletion
- [x] 14.1 Implement deletion confirmation in SubscriptionsView
  - Show Vuetify confirmation dialog before deletion
  - Display subscription name in confirmation message
  - Handle confirm and cancel actions
  - _Requirements: 3.2_

- [ ] 15. Final polish and error handling
- [ ] 15.1 Add comprehensive error handling
  - Add error handling for API failures
  - Add error handling for database operations
  - Add user-friendly error messages in Chinese
  - Add loading states for async operations
  - Add retry options for failed operations
  - _Requirements: All requirements_

- [ ] 15.2 Add accessibility improvements
  - Add ARIA labels for icon buttons
  - Ensure keyboard navigation works
  - Add sufficient color contrast
  - Add text alternatives for visual indicators
  - _Requirements: All requirements_

- [ ] 16. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
