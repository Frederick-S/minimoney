import { type CategoryKey } from './composables/useCategories'

/**
 * Core expense interface used throughout the application
 */
export interface Expense {
  id: string
  amount: number
  category: CategoryKey
  date: string
  note?: string
  user_id?: string
}

/**
 * User interface for authentication
 */
export interface User {
  id: string
  email?: string
  user_metadata?: {
    [key: string]: any
  }
}

/**
 * Props for components that display expense lists
 */
export interface ExpenseListProps {
  expenses: Expense[]
}

/**
 * Props for expense form component
 */
export interface ExpenseFormProps {
  modelValue: boolean
  expense?: Expense | null
}

/**
 * Emits for expense form component
 */
export interface ExpenseFormEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', expense: Omit<Expense, 'id'>): void
  (e: 'update', expense: Expense): void
}

/**
 * Emits for expense list component
 */
export interface ExpenseListEmits {
  (e: 'edit', expense: Expense): void
}

/**
 * Props for chart components
 */
export interface ChartProps {
  expenses: Expense[]
}

/**
 * Props for period filter component
 */
export interface PeriodFilterProps {
  modelPeriodType: 'month' | 'year'
  modelMonth: string
  modelYear: string
}

/**
 * Emits for period filter component
 */
export interface PeriodFilterEmits {
  (e: 'update:modelPeriodType', value: 'month' | 'year'): void
  (e: 'update:modelMonth', value: string): void
  (e: 'update:modelYear', value: string): void
}

/**
 * Props for trend chart component
 */
export interface TrendChartProps extends ChartProps {
  year: string
  showChart: boolean
}

/**
 * Props for app header component
 */
export interface AppHeaderProps {
  user: User | null
}

/**
 * Emits for app header component
 */
export interface AppHeaderEmits {
  (e: 'logout'): void
  (e: 'change-password'): void
}

/**
 * Props for password change component
 */
export interface PasswordChangeProps {
  modelValue: boolean
}

/**
 * Emits for password change component
 */
export interface PasswordChangeEmits {
  (e: 'update:modelValue', value: boolean): void
}

/**
 * Props for bottom navigation component
 */
export interface BottomNavigationProps {
  modelValue: string
}

/**
 * Emits for bottom navigation component
 */
export interface BottomNavigationEmits {
  (e: 'update:modelValue', value: string): void
}

/**
 * Props for empty state component
 */
export interface EmptyStateProps {
  periodLabel: string
}

/**
 * Props for summary stats component
 */
export interface SummaryStatsProps {
  total: number
  count: number
  periodLabel: string
}

/**
 * Category breakdown data from RPC
 */
export interface CategoryBreakdownData {
  category: string
  amount: number
  count: number
  percentage: number
}

/**
 * Monthly trend data from RPC
 */
export interface MonthlyTrendData {
  month: number
  month_label: string
  amount: number
}

/**
 * Period summary data from RPC
 */
export interface PeriodSummaryData {
  total_amount: number
  expense_count: number
}

/**
 * Props for chart components that use aggregated data
 */
export interface AggregatedChartProps {
  categoryData?: CategoryBreakdownData[]
  trendData?: MonthlyTrendData[]
  summary?: PeriodSummaryData
  year?: string
  showChart?: boolean
}

/**
 * Props for home view component
 */
export interface HomeViewProps {
  refreshTrigger?: number
}

/**
 * Emits for home view component
 */
export interface HomeViewEmits {
  (e: 'edit', expense: Expense): void
}
