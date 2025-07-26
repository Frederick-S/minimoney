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

Chart.register(ArcElement, Title, Tooltip, Legend, DoughnutController)

interface Expense {
  id: string
  amount: number
  category: string
  date: string
  note?: string
}

interface Props {
  expenses: Expense[]
}

const props = defineProps<Props>()
const chartRef = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const categoryNames: Record<string, string> = {
  Food: '餐饮',
  Transport: '交通',
  Shopping: '购物',
  Entertainment: '娱乐',
  Other: '其他'
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const categoryBreakdown = computed(() => {
  const breakdown: Record<string, { amount: number; count: number; percentage: number }> = {}
  
  props.expenses.forEach(expense => {
    if (!breakdown[expense.category]) {
      breakdown[expense.category] = { amount: 0, count: 0, percentage: 0 }
    }
    breakdown[expense.category].amount += expense.amount
    breakdown[expense.category].count += 1
  })
  
  const total = props.expenses.reduce((sum, exp) => sum + exp.amount, 0)
  Object.keys(breakdown).forEach(category => {
    breakdown[category].percentage = total > 0 ? (breakdown[category].amount / total) * 100 : 0
  })
  
  const sortedBreakdown: Record<string, any> = {}
  Object.entries(breakdown)
    .sort(([,a], [,b]) => b.amount - a.amount)
    .forEach(([category, data]) => {
      sortedBreakdown[category] = data
    })
  
  return sortedBreakdown
})

const total = computed(() => props.expenses.reduce((sum, exp) => sum + exp.amount, 0))

const createChart = () => {
  if (!chartRef.value) return
  
  const categories = Object.keys(categoryBreakdown.value)
  const amounts = categories.map(cat => categoryBreakdown.value[cat].amount)
  const colors = categories.map(cat => {
    const colorMap: Record<string, string> = {
      Food: '#FF9800',
      Transport: '#2196F3', 
      Shopping: '#E91E63',
      Entertainment: '#9C27B0',
      Other: '#607D8B'
    }
    return colorMap[cat] || '#607D8B'
  })
  
  if (chart) {
    chart.destroy()
  }
  
  chart = new Chart(chartRef.value, {
    type: 'doughnut',
    data: {
      labels: categories.map(cat => categoryNames[cat]),
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
