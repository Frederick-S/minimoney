<template>
  <v-card class="mb-6" elevation="1" v-if="expenses.length > 0">
    <v-card-title class="pb-2">
      <v-icon class="mr-2">mdi-chart-donut</v-icon>
      分类支出占比
    </v-card-title>
    <v-card-text>
      <div style="position: relative; height: 300px;">
        <canvas ref="chartRef"></canvas>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import {
  Chart,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  DoughnutController
} from 'chart.js'
import { useCategories, type CategoryKey } from '../../composables/useCategories'
import { type Expense, type ChartProps } from '../../types'

Chart.register(ArcElement, Title, Tooltip, Legend, DoughnutController)

const props = defineProps<ChartProps>()
const chartRef = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const { getCategoryName, getCategoryChartColor } = useCategories()

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const categoryBreakdown = computed(() => {
  const breakdown: Record<CategoryKey, { amount: number; count: number; percentage: number }> = {} as any
  
  props.expenses.forEach(expense => {
    if (!breakdown[expense.category]) {
      breakdown[expense.category] = { amount: 0, count: 0, percentage: 0 }
    }
    breakdown[expense.category].amount += expense.amount
    breakdown[expense.category].count += 1
  })
  
  const total = props.expenses.reduce((sum, exp) => sum + exp.amount, 0)
  Object.keys(breakdown).forEach(category => {
    const cat = category as CategoryKey
    breakdown[cat].percentage = total > 0 ? (breakdown[cat].amount / total) * 100 : 0
  })
  
  // Sort by amount descending
  const sortedBreakdown: Record<CategoryKey, any> = {} as any
  Object.entries(breakdown)
    .sort(([,a], [,b]) => b.amount - a.amount)
    .forEach(([category, data]) => {
      sortedBreakdown[category as CategoryKey] = data
    })
  
  return sortedBreakdown
})

const total = computed(() => props.expenses.reduce((sum, exp) => sum + exp.amount, 0))

const createChart = () => {
  if (!chartRef.value) return
  
  const categories = Object.keys(categoryBreakdown.value) as CategoryKey[]
  const amounts = categories.map(cat => categoryBreakdown.value[cat].amount)
  const colors = categories.map(cat => getCategoryChartColor(cat))
  
  // Don't create chart if no data
  if (categories.length === 0 || amounts.every(amount => amount === 0)) {
    if (chart) {
      chart.destroy()
      chart = null
    }
    return
  }
  
  if (chart) {
    chart.destroy()
  }
  
  chart = new Chart(chartRef.value, {
    type: 'doughnut',
    data: {
      labels: categories.map(cat => getCategoryName(cat)),
      datasets: [{
        data: amounts,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed
              const percentage = ((value / total.value) * 100).toFixed(1)
              return `${context.label}: ${formatAmount(value)} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

watch([categoryBreakdown], () => {
  nextTick(() => {
    createChart()
  })
})

onMounted(() => {
  nextTick(() => {
    createChart()
  })
})
</script>
