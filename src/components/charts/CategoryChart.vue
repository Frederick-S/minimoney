<template>
  <v-card class="mb-6" elevation="1" v-if="categoryData && categoryData.length > 0">
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
import { type CategoryBreakdownData } from '../../types'

Chart.register(ArcElement, Title, Tooltip, Legend, DoughnutController)

interface Props {
  categoryData?: CategoryBreakdownData[]
}

const props = withDefaults(defineProps<Props>(), {
  categoryData: () => []
})

const chartRef = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const categoryBreakdown = computed(() => {
  if (!props.categoryData) return {}
  
  const breakdown: Record<string, { amount: number; count: number; percentage: number }> = {}
  
  props.categoryData.forEach(item => {
    breakdown[item.categoryId] = {
      amount: item.amount,
      count: item.count,
      percentage: item.percentage
    }
  })
  
  return breakdown
})

const total = computed(() => {
  if (!props.categoryData) return 0
  return props.categoryData.reduce((sum, item) => sum + item.amount, 0)
})

const createChart = () => {
  if (!chartRef.value || !props.categoryData || props.categoryData.length === 0) return
  
  const categoryNames = props.categoryData.map(item => item.categoryDisplayName || item.categoryName)
  const amounts = props.categoryData.map(item => item.amount)
  const colors = props.categoryData.map(item => item.categoryColor)
  
  // Don't create chart if no data
  if (categoryNames.length === 0 || amounts.every(amount => amount === 0)) {
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
      labels: categoryNames,
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
