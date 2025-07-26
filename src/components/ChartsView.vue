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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import CategoryChart from './charts/CategoryChart.vue'
import TrendChart from './charts/TrendChart.vue'
import CategoryDetails from './charts/CategoryDetails.vue'
import PeriodFilter from './charts/PeriodFilter.vue'
import SummaryStats from './charts/SummaryStats.vue'
import EmptyState from './charts/EmptyState.vue'
import { useExpenseManagement } from '../composables/useExpenseManagement'
import { type Expense } from '../types'

const props = withDefaults(defineProps<{ 
  refreshTrigger?: number
}>(), {
  refreshTrigger: 0
})

const route = useRoute()
const { loadAllExpenses } = useExpenseManagement()

const expenses = ref<Expense[]>([])
const loadingExpenses = ref(false)
const selectedPeriodType = ref<'month' | 'year'>('month')
const selectedMonth = ref('')
const selectedYear = ref('')

// Load all expenses for charts
const loadExpensesData = async () => {
  loadingExpenses.value = true
  try {
    const data = await loadAllExpenses()
    expenses.value = data
  } finally {
    loadingExpenses.value = false
  }
}

// Initialize period selection
onMounted(async () => {
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  selectedYear.value = now.getFullYear().toString()
  
  // Load data when component mounts
  await loadExpensesData()
})

// Watch for route changes to reload data
watch(() => route.name, async (newRouteName) => {
  if (newRouteName === 'Charts') {
    await loadExpensesData()
  }
})

// Watch for refresh trigger
watch(() => props.refreshTrigger, async () => {
  await loadExpensesData()
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