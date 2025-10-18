<template>
  <div class="px-4">
    <!-- Loading State -->
    <div v-if="loadingExpenses" class="d-flex justify-center align-center py-8">
      <v-progress-circular indeterminate size="64" />
    </div>
    
    <template v-else>
      <!-- Time Period Filter -->
      <PeriodFilter
        v-model:model-period-type="selectedPeriodType"
        v-model:model-month="selectedMonth"
        v-model:model-year="selectedYear"
      />

      <!-- Summary Stats -->
      <SummaryStats
        :total="periodSummary?.totalAmount || 0"
        :count="periodSummary?.expenseCount || 0"
        :period-label="periodLabel"
      />

      <!-- Trend Chart (monthly for year view, yearly for all time view) -->
      <TrendChart
        :trend-data="monthlyTrend"
        :year="selectedPeriodType === 'all' ? '历年趋势' : selectedYear"
        :show-chart="selectedPeriodType === 'year' || selectedPeriodType === 'all'"
      />

      <!-- Category Breakdown Chart (Pie Chart) - Top Level Categories Only -->
      <CategoryChart :category-data="topLevelCategoryBreakdown" />

      <!-- Category Details -->
      <CategoryDetails :category-data="categoryBreakdown" />

      <!-- Empty State -->
      <EmptyState
        v-if="!categoryBreakdown || categoryBreakdown.length === 0"
        :period-label="periodLabel"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getTodayDate, getLastDayOfMonth, getCurrentMonth, getCurrentYear } from '../utils/dateUtils'
import { useCategories } from '../composables/useCategories'
import CategoryChart from './charts/CategoryChart.vue'
import TrendChart from './charts/TrendChart.vue'
import CategoryDetails from './charts/CategoryDetails.vue'
import PeriodFilter from './charts/PeriodFilter.vue'
import SummaryStats from './charts/SummaryStats.vue'
import EmptyState from './charts/EmptyState.vue'
import { useExpenseManagement } from '../composables/useExpenseManagement'
import { type CategoryBreakdownData, type MonthlyTrendData, type PeriodSummaryData } from '../types'

const props = withDefaults(defineProps<{ 
  refreshTrigger?: number
}>(), {
  refreshTrigger: 0
})

const route = useRoute()
const { getCategoryBreakdown, getMonthlyTrend, getYearlyTrend, getPeriodSummary, refreshTrigger: globalRefreshTrigger } = useExpenseManagement()

const loadingExpenses = ref(false)
const selectedPeriodType = ref<'month' | 'year' | 'all'>('month')
const selectedMonth = ref('')
const selectedYear = ref('')

// Aggregated data from RPC calls
const categoryBreakdown = ref<CategoryBreakdownData[]>([])
const topLevelCategoryBreakdown = ref<CategoryBreakdownData[]>([])
const monthlyTrend = ref<MonthlyTrendData[]>([])
const periodSummary = ref<PeriodSummaryData | null>(null)

// Calculate date range based on selected period
const dateRange = computed(() => {
  if (selectedPeriodType.value === 'month') {
    if (!selectedMonth.value) return null
    const [year, month] = selectedMonth.value.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = getLastDayOfMonth(parseInt(year), parseInt(month))
    return { startDate, endDate }
  } else if (selectedPeriodType.value === 'year') {
    if (!selectedYear.value) return null
    const startDate = `${selectedYear.value}-01-01`
    const endDate = `${selectedYear.value}-12-31`
    return { startDate, endDate }
  } else if (selectedPeriodType.value === 'all') {
    // For all time, use a very early start date and current date
    const startDate = '2020-01-01'  // Reasonable start date for expense tracking
    const endDate = getTodayDate()  // Get today's date in user's local timezone
    return { startDate, endDate }
  }
  return null
})

// Load aggregated data using RPC calls
const loadAggregatedData = async () => {
  loadingExpenses.value = true
  try {
    const range = dateRange.value
    if (!range) return

    // Load data in parallel
    const [categoryData, summaryData, trendData] = await Promise.all([
      getCategoryBreakdown(range.startDate, range.endDate),
      getPeriodSummary(range.startDate, range.endDate),
      selectedPeriodType.value === 'year' && selectedYear.value 
        ? getMonthlyTrend(parseInt(selectedYear.value))
        : selectedPeriodType.value === 'all'
        ? getYearlyTrend()
        : Promise.resolve([])
    ])

    categoryBreakdown.value = categoryData
    periodSummary.value = summaryData
    monthlyTrend.value = trendData

    // Aggregate subcategories into parent categories for pie chart
    aggregateTopLevelCategories(categoryData)

  } finally {
    loadingExpenses.value = false
  }
}

// Aggregate subcategories into their parent categories
const aggregateTopLevelCategories = async (categoryData: CategoryBreakdownData[]) => {
  const { categories } = useCategories()
  
  // Wait for categories to load if not already loaded
  if (categories.value.length === 0) {
    const { loadCategories } = useCategories()
    await loadCategories()
  }

  // Create a map of category totals by parent
  const parentTotals = new Map<string, {
    categoryId: string
    categoryName: string
    categoryDisplayName: string
    categoryColor: string
    amount: number
    count: number
  }>()

  categoryData.forEach(item => {
    // Find the category in our categories list
    const category = categories.value.find(c => c.id === item.categoryId)
    if (!category) return

    // If it's a top-level category (no parent), use it directly
    if (!category.parentId) {
      if (!parentTotals.has(category.id)) {
        parentTotals.set(category.id, {
          categoryId: category.id,
          categoryName: category.name,
          categoryDisplayName: category.displayName,
          categoryColor: category.chartColor,
          amount: 0,
          count: 0
        })
      }
      const parent = parentTotals.get(category.id)!
      parent.amount += item.amount
      parent.count += item.count
    } else {
      // It's a subcategory, add to parent
      const parentCategory = categories.value.find(c => c.id === category.parentId)
      if (!parentCategory) return

      if (!parentTotals.has(parentCategory.id)) {
        parentTotals.set(parentCategory.id, {
          categoryId: parentCategory.id,
          categoryName: parentCategory.name,
          categoryDisplayName: parentCategory.displayName,
          categoryColor: parentCategory.chartColor,
          amount: 0,
          count: 0
        })
      }
      const parent = parentTotals.get(parentCategory.id)!
      parent.amount += item.amount
      parent.count += item.count
    }
  })

  // Calculate percentages
  const total = Array.from(parentTotals.values()).reduce((sum, cat) => sum + cat.amount, 0)
  
  topLevelCategoryBreakdown.value = Array.from(parentTotals.values())
    .map(cat => ({
      ...cat,
      percentage: total > 0 ? (cat.amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount) // Sort by amount descending
}

// Initialize period selection
onMounted(async () => {
  selectedMonth.value = getCurrentMonth()
  selectedYear.value = getCurrentYear()
})

// Watch for period changes to reload data
watch([selectedPeriodType, selectedMonth, selectedYear], () => {
  loadAggregatedData()
}, { immediate: true })

// Watch for route changes to reload data
watch(() => route.name, async (newRouteName) => {
  if (newRouteName === 'Charts') {
    await loadAggregatedData()
  }
})

// Watch for refresh trigger
watch([() => props.refreshTrigger, globalRefreshTrigger], async () => {
  await loadAggregatedData()
})

const periodLabel = computed(() => {
  if (selectedPeriodType.value === 'month') {
    if (!selectedMonth.value) return '本月'
    const [year, month] = selectedMonth.value.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
  } else if (selectedPeriodType.value === 'year') {
    return `${selectedYear.value}年`
  } else if (selectedPeriodType.value === 'all') {
    return '全部时间'
  }
  return ''
})
</script>