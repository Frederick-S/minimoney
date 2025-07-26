<template>
  <div class="px-4">
    <!-- Loading State -->
    <div v-if="loadingExpenses" class="d-flex justify-center align-center py-8">
      <v-progress-circular indeterminate size="64" />
    </div>
    
    <template v-else>
      <!-- Time Period Filter -->
      <PeriodFilter
        :expenses="expenses"
        v-model:model-period-type="selectedPeriodType"
        v-model:model-month="selectedMonth"
        v-model:model-year="selectedYear"
      />

      <!-- Summary Stats -->
      <SummaryStats
        :total="periodTotal"
        :count="periodExpenses.length"
        :period-label="periodLabel"
      />

      <!-- Category Breakdown Chart -->
      <CategoryChart :expenses="periodExpenses" />

      <!-- Monthly Trend Chart (only show for year view) -->
      <TrendChart
        :expenses="periodExpenses"
        :year="selectedYear"
        :show-chart="selectedPeriodType === 'year'"
      />

      <!-- Category Details -->
      <CategoryDetails :expenses="periodExpenses" />

      <!-- Empty State -->
      <EmptyState
        v-if="periodExpenses.length === 0"
        :period-label="periodLabel"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CategoryChart from './charts/CategoryChart.vue'
import TrendChart from './charts/TrendChart.vue'
import CategoryDetails from './charts/CategoryDetails.vue'
import PeriodFilter from './charts/PeriodFilter.vue'
import SummaryStats from './charts/SummaryStats.vue'
import EmptyState from './charts/EmptyState.vue'
import { type Expense, type ChartProps } from '../types'

const props = withDefaults(defineProps<{ 
  allExpenses?: Expense[]
  loadingExpenses?: boolean 
}>(), {
  allExpenses: () => [],
  loadingExpenses: false
})

// Use allExpenses prop instead of expenses
const expenses = computed(() => props.allExpenses)

const selectedPeriodType = ref<'month' | 'year'>('month')
const selectedMonth = ref('')
const selectedYear = ref('')

// Initialize period selection
onMounted(() => {
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  selectedYear.value = now.getFullYear().toString()
})

// Filter expenses based on selected period
const periodExpenses = computed(() => {
  if (selectedPeriodType.value === 'month') {
    if (!selectedMonth.value) return []
    const [year, month] = selectedMonth.value.split('-')
    return expenses.value.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate.getFullYear() === parseInt(year) && 
             expenseDate.getMonth() === parseInt(month) - 1
    })
  } else {
    if (!selectedYear.value) return []
    return expenses.value.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate.getFullYear() === parseInt(selectedYear.value)
    })
  }
})

const periodTotal = computed(() => 
  periodExpenses.value.reduce((total, expense) => total + expense.amount, 0)
)

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