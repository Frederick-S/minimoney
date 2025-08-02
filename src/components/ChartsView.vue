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

      <!-- Category Breakdown Chart -->
      <CategoryChart :category-data="categoryBreakdown" />

      <!-- Monthly Trend Chart (only show for year view) -->
      <TrendChart
        :trend-data="monthlyTrend"
        :year="selectedYear"
        :show-chart="selectedPeriodType === 'year'"
      />

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
const { getCategoryBreakdown, getMonthlyTrend, getPeriodSummary, refreshTrigger: globalRefreshTrigger } = useExpenseManagement()

const loadingExpenses = ref(false)
const selectedPeriodType = ref<'month' | 'year'>('month')
const selectedMonth = ref('')
const selectedYear = ref('')

// Aggregated data from RPC calls
const categoryBreakdown = ref<CategoryBreakdownData[]>([])
const monthlyTrend = ref<MonthlyTrendData[]>([])
const periodSummary = ref<PeriodSummaryData | null>(null)

// Calculate date range based on selected period
const dateRange = computed(() => {
  if (selectedPeriodType.value === 'month') {
    if (!selectedMonth.value) return null
    const [year, month] = selectedMonth.value.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
    return { startDate, endDate }
  } else {
    if (!selectedYear.value) return null
    const startDate = `${selectedYear.value}-01-01`
    const endDate = `${selectedYear.value}-12-31`
    return { startDate, endDate }
  }
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
        : Promise.resolve([])
    ])

    categoryBreakdown.value = categoryData
    periodSummary.value = summaryData
    monthlyTrend.value = trendData
    

  } finally {
    loadingExpenses.value = false
  }
}

// Initialize period selection
onMounted(async () => {
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  selectedYear.value = now.getFullYear().toString()
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
  } else {
    return `${selectedYear.value}年`
  }
})
</script>