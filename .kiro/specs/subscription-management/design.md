# Design Document: Subscription Management

## Overview

The Subscription Management feature extends the existing expense tracking application to support recurring subscription tracking. Users can manage subscriptions with different billing frequencies (monthly/yearly), handle multiple currencies with automatic conversion to a main display currency, and track subscription lifecycle including end dates and auto-renewal status.

The feature integrates seamlessly into the existing Vue 3 + Vuetify + Supabase architecture, following established patterns for data management, composables, and UI components. A new "Subscriptions" tab will be added to the bottom navigation alongside Home and Charts.

## Architecture

### High-Level Architecture

The subscription management feature follows the existing application architecture:

1. **Database Layer**: Supabase PostgreSQL with RLS policies
2. **Data Access Layer**: Composables for subscription operations and currency conversion
3. **State Management**: Vue 3 Composition API with reactive refs
4. **UI Layer**: Vue 3 components with Vuetify
5. **Routing**: Vue Router with new subscription routes

### Component Structure

```
src/
├── components/
│   ├── SubscriptionsView.vue          # Main subscriptions tab view
│   ├── SubscriptionList.vue           # List of subscriptions
│   ├── SubscriptionForm.vue           # Add/Edit subscription form
│   ├── SubscriptionCard.vue           # Individual subscription display
│   ├── SubscriptionSummary.vue        # Total cost summary
│   └── CurrencySettings.vue           # Main currency selector
├── composables/
│   ├── useSubscriptions.ts            # Subscription CRUD operations
│   ├── useCurrency.ts                 # Currency conversion logic
│   └── useSubscriptionCalculations.ts # Cost calculations
└── types.ts                           # Type definitions
```

## Components and Interfaces

### Data Models

#### Subscription Interface

```typescript
export interface Subscription {
  id: string
  userId: string
  name: string
  amount: number
  currency: string
  billingFrequency: 'monthly' | 'yearly'
  isAutoRenew: boolean
  endDate?: string  // ISO date string, null if auto-renew
  nextBillingDate: string  // ISO date string
  createdAt: string
  updatedAt: string
}
```

#### Currency Interface

```typescript
export interface Currency {
  code: string  // ISO 4217 currency code (USD, CNY, EUR, etc.)
  symbol: string
  name: string
}

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdated: string
}

export interface UserPreference {
  id: string
  userId: string
  category: string
  key: string
  value: string
  createdAt: string
  updatedAt: string
}
```

#### Display Models

```typescript
export interface SubscriptionDisplay extends Subscription {
  displayAmount: number  // Amount in main currency
  displayCurrency: string  // Main currency code
  originalAmount: number  // Original amount
  originalCurrency: string  // Original currency
  isExpired: boolean
  isEndingSoon: boolean  // Within 30 days of end date
  daysUntilEnd?: number
}

export interface SubscriptionSummary {
  totalMonthly: number
  totalYearly: number
  activeCount: number
  expiredCount: number
  currency: string
}
```

### Database Schema

#### subscriptions table

```sql
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('monthly', 'yearly')),
    is_auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    end_date DATE,
    next_billing_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    CHECK (
        (is_auto_renew = TRUE AND end_date IS NULL) OR
        (is_auto_renew = FALSE AND end_date IS NOT NULL)
    )
);

CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX subscriptions_next_billing_date_idx ON subscriptions(next_billing_date);
CREATE INDEX subscriptions_end_date_idx ON subscriptions(end_date);
```

#### user_preferences table

```sql
CREATE TABLE user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(user_id, category, key)
);

CREATE INDEX user_preferences_user_id_idx ON user_preferences(user_id);
CREATE INDEX user_preferences_category_idx ON user_preferences(user_id, category);
```

**Usage Examples:**
- Currency preference: `category='currency', key='main_currency', value='CNY'`
- Future settings: `category='notifications', key='email_enabled', value='true'`
- Future settings: `category='display', key='theme', value='dark'`



### RLS Policies

```sql
-- Subscriptions policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- User preferences policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);


```

### Composables

#### useSubscriptions.ts

Handles CRUD operations for subscriptions:

```typescript
export function useSubscriptions() {
  const subscriptions = ref<Subscription[]>([])
  const loading = ref(false)
  
  const loadSubscriptions = async (): Promise<Subscription[]>
  const createSubscription = async (subscription: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Subscription>
  const updateSubscription = async (subscription: Subscription): Promise<Subscription>
  const deleteSubscription = async (id: string): Promise<void>
  const calculateNextBillingDate = (startDate: Date, frequency: 'monthly' | 'yearly'): Date
  
  return {
    subscriptions,
    loading,
    loadSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    calculateNextBillingDate
  }
}
```

#### useCurrency.ts

Handles currency conversion and preferences using a public exchange rate API:

```typescript
export function useCurrency() {
  const mainCurrency = ref<string>('CNY')
  const exchangeRates = ref<Map<string, ExchangeRate>>()
  const supportedCurrencies = ref<Currency[]>([])
  const ratesLastUpdated = ref<string | null>(null)
  
  const loadUserCurrencyPreference = async (): Promise<string>
  const setMainCurrency = async (currency: string): Promise<void>
  const fetchExchangeRates = async (baseCurrency?: string): Promise<void>
  const loadCachedRates = (): boolean  // Load from localStorage
  const cacheRates = (rates: Map<string, ExchangeRate>): void  // Save to localStorage
  const isCacheValid = (): boolean  // Check if cache is less than 24 hours old
  const convert = (amount: number, from: string, to: string): number
  const getExchangeRate = (from: string, to: string): number
  
  return {
    mainCurrency,
    exchangeRates,
    supportedCurrencies,
    ratesLastUpdated,
    loadUserCurrencyPreference,
    setMainCurrency,
    fetchExchangeRates,
    loadCachedRates,
    cacheRates,
    isCacheValid,
    convert,
    getExchangeRate
  }
}
```

**Exchange Rate API Integration:**
- Use **exchangerate-api.com** free tier (1,500 requests/month)
- API endpoint: `https://api.exchangerate-api.com/v4/latest/{base_currency}`
- **CORS Support**: This API supports CORS and can be called directly from the browser
- Cache rates in localStorage with 24-hour validity
- Check cache before making API calls
- Rates are updated daily by the API provider
- Fallback: If API fails, use cached rates if available, otherwise display amounts in original currency only

**Alternative Option (if CORS issues arise):**
- Use **exchangerate.host** API which also has CORS enabled
- Endpoint: `https://api.exchangerate.host/latest?base={base_currency}`
- Free tier with no API key required

**Note**: This composable will use the generic `user_preferences` table with `category='currency'` and `key='main_currency'` to store and retrieve the user's main currency preference.

#### useSubscriptionCalculations.ts

Handles subscription cost calculations:

```typescript
export function useSubscriptionCalculations() {
  const calculateMonthlyEquivalent = (amount: number, frequency: 'monthly' | 'yearly'): number
  const calculateYearlyEquivalent = (amount: number, frequency: 'monthly' | 'yearly'): number
  const isExpired = (subscription: Subscription): boolean
  const isEndingSoon = (subscription: Subscription, daysThreshold: number = 30): boolean
  const getDaysUntilEnd = (subscription: Subscription): number | null
  const calculateTotalCosts = (subscriptions: SubscriptionDisplay[]): SubscriptionSummary
  
  return {
    calculateMonthlyEquivalent,
    calculateYearlyEquivalent,
    isExpired,
    isEndingSoon,
    getDaysUntilEnd,
    calculateTotalCosts
  }
}
```

### UI Components

#### SubscriptionsView.vue

Main container component for the subscriptions tab. Manages state and coordinates child components.

**Responsibilities:**
- Load subscriptions and currency preferences on mount
- Manage subscription form dialog state
- Handle subscription CRUD operations
- Display subscription list and summary

#### SubscriptionList.vue

Displays list of subscriptions grouped by status (active/expired).

**Props:**
- `subscriptions: SubscriptionDisplay[]`
- `loading: boolean`

**Emits:**
- `edit(subscription: Subscription)`
- `delete(id: string)`

#### SubscriptionForm.vue

Form for creating and editing subscriptions.

**Props:**
- `modelValue: boolean` (dialog visibility)
- `subscription?: Subscription | null` (for editing)
- `mainCurrency: string`

**Emits:**
- `update:modelValue(value: boolean)`
- `save(subscription: Omit<Subscription, 'id'>)`
- `update(subscription: Subscription)`

**Fields:**
- Name (text input, required)
- Amount (number input, required, > 0)
- Currency (select, required)
- Billing Frequency (radio: monthly/yearly, required)
- Renewal Type (radio: auto-renew/fixed end date, required)
- End Date (date picker, required if fixed end date)

**Validation:**
- All required fields must be filled
- Amount must be positive
- End date must be in the future if specified
- End date required when not auto-renew

#### SubscriptionCard.vue

Displays individual subscription information.

**Props:**
- `subscription: SubscriptionDisplay`

**Display:**
- Subscription name
- Display amount in main currency
- Original amount and currency (if different)
- Billing frequency badge
- Renewal status (auto-renew icon or end date)
- Warning indicator if ending soon
- Expired badge if past end date
- Next billing date

#### SubscriptionSummary.vue

Displays aggregate subscription costs.

**Props:**
- `summary: SubscriptionSummary`

**Display:**
- Total monthly cost
- Total yearly cost
- Active subscription count
- Currency indicator

#### CurrencySettings.vue

Allows user to select main display currency.

**Props:**
- `modelValue: string` (current main currency)
- `currencies: Currency[]`

**Emits:**
- `update:modelValue(currency: string)`

### Routing

Add new route to `src/router/index.ts`:

```typescript
{
  path: '/subscriptions',
  name: 'Subscriptions',
  component: () => import('../components/SubscriptionsView.vue'),
  meta: { requiresAuth: true }
}
```

Update `BottomNavigation.vue` to include subscriptions tab:

```vue
<v-btn value="subscriptions" @click="() => $router.push('/subscriptions')">
  <v-icon>mdi-sync</v-icon>
  <span>订阅</span>
</v-btn>
```

## Correctne
ss Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Properties 1.4 and 2.4 both test persistence and can be combined into a single "CRUD operations persist immediately" property
- Properties 4.1, 4.3, and 4.4 all relate to currency conversion and can be combined into a comprehensive conversion property
- Properties 7.3 and 7.4 are both about frequency conversion and can be combined
- Properties 7.5 and 7.6 are both about expired subscription handling in totals and can be combined

### Core Properties

**Property 1: Subscription creation with valid data**
*For any* valid subscription data (with name, amount, currency, and billing frequency), creating the subscription should result in the subscription appearing in both the database and the user's subscription list
**Validates: Requirements 1.1, 1.4**

**Property 2: Required field validation**
*For any* subscription data missing one or more required fields (name, amount, currency, billing frequency), attempting to create the subscription should be rejected with validation errors
**Validates: Requirements 1.2**

**Property 3: Billing frequency validation**
*For any* subscription, the billing frequency should only accept 'monthly' or 'yearly' as valid values
**Validates: Requirements 1.3**

**Property 4: End date and auto-renew relationship**
*For any* subscription with an end date specified, the auto-renew flag should be false, and for any subscription with auto-renew true, the end date should be null
**Validates: Requirements 1.5**

**Property 5: Subscription update persistence**
*For any* existing subscription and any valid modifications to its fields, updating the subscription should result in the changes being persisted to the database and reflected in the subscription list
**Validates: Requirements 2.1, 2.4**

**Property 6: Auto-renew to fixed end date transition**
*For any* subscription being changed from auto-renew to fixed end date, an end date must be specified or the update should be rejected
**Validates: Requirements 2.2**

**Property 7: Fixed end date to auto-renew transition**
*For any* subscription being changed from fixed end date to auto-renew, the end date should be cleared (set to null)
**Validates: Requirements 2.3**

**Property 8: Currency change recalculation**
*For any* subscription, when the original currency is changed, the display amount in main currency should be recalculated using the current exchange rate
**Validates: Requirements 2.5**

**Property 9: Subscription deletion**
*For any* subscription, after deletion is confirmed, the subscription should no longer exist in the database or the displayed subscription list
**Validates: Requirements 3.1, 3.3**

**Property 10: Currency conversion accuracy**
*For any* subscription in a currency different from the main currency, the display amount should equal the original amount multiplied by the exchange rate from original currency to main currency
**Validates: Requirements 4.1, 4.3, 4.4**

**Property 11: Dual currency display**
*For any* subscription where the original currency differs from the main currency, both the original amount with currency and the converted amount in main currency should be present in the display data
**Validates: Requirements 4.2**

**Property 12: Same currency display**
*For any* subscription where the original currency matches the main currency, the display should show the amount without conversion notation
**Validates: Requirements 4.5**

**Property 13: Subscription list completeness**
*For any* user with subscriptions, navigating to the subscriptions tab should display all of the user's subscriptions
**Validates: Requirements 5.1**

**Property 14: Subscription display information**
*For any* subscription in the list, the display should include the subscription name, amount in main currency, billing frequency, and renewal status
**Validates: Requirements 5.3**

**Property 15: State persistence across navigation**
*For any* loaded subscription data, switching to another tab and back to subscriptions should maintain the data without reloading from the database
**Validates: Requirements 5.5**

**Property 16: Auto-renew indicator**
*For any* subscription with auto-renew set to true, the display should include an indicator showing automatic renewal
**Validates: Requirements 6.1**

**Property 17: End date display**
*For any* subscription with an end date, the display should prominently show the end date
**Validates: Requirements 6.2**

**Property 18: Ending soon detection**
*For any* subscription with an end date within 30 days of the current date, the subscription should be marked as ending soon
**Validates: Requirements 6.3**

**Property 19: Expiration detection**
*For any* subscription with an end date in the past, the subscription should be marked as expired
**Validates: Requirements 6.4**

**Property 20: Next billing date calculation**
*For any* active (non-expired) subscription, the display should include a calculated next billing date based on the billing frequency
**Validates: Requirements 6.5**

**Property 21: Monthly total calculation**
*For any* set of active subscriptions, the total monthly cost should equal the sum of all monthly subscriptions plus yearly subscriptions divided by 12, all converted to main currency
**Validates: Requirements 7.1, 7.3**

**Property 22: Yearly total calculation**
*For any* set of active subscriptions, the total yearly cost should equal the sum of all yearly subscriptions plus monthly subscriptions multiplied by 12, all converted to main currency
**Validates: Requirements 7.2, 7.4**

**Property 23: Expired subscription exclusion from totals**
*For any* subscription with an end date in the past, it should be excluded from total cost calculations, while subscriptions with future end dates or auto-renew should be included
**Validates: Requirements 7.5, 7.6**

## Error Handling

### Validation Errors

1. **Missing Required Fields**: Display field-specific error messages when required fields are empty
2. **Invalid Amount**: Show error when amount is zero, negative, or not a valid number
3. **Invalid Date**: Show error when end date is in the past or invalid format
4. **Invalid Currency**: Show error when currency code is not supported
5. **Invalid Billing Frequency**: Show error when frequency is not 'monthly' or 'yearly'

### Database Errors

1. **Connection Failures**: Display user-friendly message and retry option
2. **Permission Errors**: Show authentication error and redirect to login if needed
3. **Constraint Violations**: Display specific error based on constraint (e.g., "End date required when auto-renew is disabled")

### Currency Conversion Errors

1. **API Failures**: Display subscriptions in original currencies only with warning message
2. **Network Errors**: Show user-friendly error and option to retry
3. **Unsupported Currency**: Fall back to displaying original currency only
4. **Stale Rates**: Display last updated timestamp if rates are older than 24 hours

### User Experience

- All errors should display in Chinese (matching the existing app language)
- Use Vuetify's snackbar/toast for non-blocking notifications
- Use inline validation errors in forms
- Provide clear action items for resolving errors
- Log detailed errors to console for debugging

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

1. **Subscription CRUD Operations**
   - Create subscription with valid data
   - Update subscription fields
   - Delete subscription
   - Handle missing required fields

2. **Currency Conversion**
   - Convert between specific currency pairs
   - Handle same currency (no conversion)
   - Handle missing exchange rates

3. **Date Calculations**
   - Calculate next billing date for monthly subscriptions
   - Calculate next billing date for yearly subscriptions
   - Detect expired subscriptions
   - Detect subscriptions ending soon

4. **Cost Calculations**
   - Calculate monthly total with mixed frequencies
   - Calculate yearly total with mixed frequencies
   - Exclude expired subscriptions from totals

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript/TypeScript property testing library):

1. **Configuration**: Each property test should run a minimum of 100 iterations
2. **Tagging**: Each property-based test must include a comment tag in this format:
   ```typescript
   // Feature: subscription-management, Property 1: Subscription creation with valid data
   ```

3. **Property Test Coverage**:
   - All 23 correctness properties defined above must be implemented as property-based tests
   - Each property test should generate random valid/invalid inputs as appropriate
   - Tests should verify the property holds across all generated inputs

4. **Generators**:
   - Create smart generators for subscriptions with valid/invalid data
   - Generate random currencies, amounts, dates, and billing frequencies
   - Generate edge cases like boundary dates, very large amounts, etc.

5. **Integration with Unit Tests**:
   - Property tests verify general correctness across many inputs
   - Unit tests verify specific examples and integration points
   - Together they provide comprehensive coverage

### Integration Testing

1. **Component Integration**: Test interaction between SubscriptionsView, SubscriptionList, and SubscriptionForm
2. **Database Integration**: Test actual Supabase operations with test database
3. **Navigation Integration**: Test routing and tab switching behavior
4. **Currency Integration**: Test currency preference changes affecting all subscriptions

### Manual Testing Checklist

1. Create subscriptions with various currencies and frequencies
2. Edit subscriptions and verify changes persist
3. Delete subscriptions and verify removal
4. Change main currency and verify all amounts update
5. Test subscriptions approaching end date show warnings
6. Test expired subscriptions are marked correctly
7. Verify totals calculate correctly with mixed subscriptions
8. Test navigation between tabs maintains state
9. Test form validation for all required fields
10. Test responsive design on mobile devices

## Implementation Notes

### Currency Exchange Rates

Exchange rates are fetched from **exchangerate-api.com** public API:

**API Details:**
- Free tier: 1,500 requests/month (sufficient for typical usage)
- Endpoint: `https://api.exchangerate-api.com/v4/latest/{base_currency}`
- Returns rates for all supported currencies relative to base currency
- Rates updated daily by provider
- **CORS enabled**: Can be called directly from browser without proxy
- No API key required for basic tier

**Caching Strategy:**
1. Cache rates in localStorage with timestamp
2. On app load, check if cached rates exist and are less than 24 hours old
3. If cache is valid, use cached rates; otherwise fetch fresh rates from API
4. Store rates in both localStorage (persistent) and memory (Vue ref for performance)
5. This minimizes API calls to ~1 per day per user

**Error Handling:**
- If API call fails, display subscriptions in original currencies only
- Show warning message about currency conversion unavailable
- Log error for debugging

**Supported Currencies:**
- CNY (Chinese Yuan) - default
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- HKD (Hong Kong Dollar)
- Additional currencies can be easily added as the API supports 160+ currencies

### Next Billing Date Calculation

- **Monthly subscriptions**: Add 1 month to the last billing date
- **Yearly subscriptions**: Add 1 year to the last billing date
- Handle edge cases like February 29th, month-end dates
- Use date-fns or similar library for reliable date arithmetic

### Performance Considerations

1. **Caching**: Cache exchange rates in localStorage with 24-hour validity to minimize API calls (~1 call per day per user)
2. **Batch Loading**: Load all user subscriptions in a single query
3. **Computed Properties**: Use Vue computed properties for derived values (totals, display amounts)
4. **Indexes**: Database indexes on user_id, end_date, next_billing_date for efficient queries
5. **API Rate Limiting**: Check localStorage cache before making API calls; only fetch when cache is invalid or missing

### Accessibility

1. Use semantic HTML elements
2. Provide ARIA labels for icon-only buttons
3. Ensure keyboard navigation works for all interactive elements
4. Use sufficient color contrast for status indicators
5. Provide text alternatives for visual indicators

### Future Enhancements

1. **Notifications**: Remind users before subscriptions renew or expire
2. **Categories**: Group subscriptions by category (entertainment, utilities, etc.)
3. **Payment Methods**: Track which payment method is used for each subscription
4. **History**: Track subscription price changes over time
5. **Analytics**: Show spending trends and insights
6. **Export**: Export subscription data to CSV/PDF
7. **Sharing**: Share subscription costs with family members
8. **Multi-currency Totals**: Show totals in multiple currencies simultaneously
