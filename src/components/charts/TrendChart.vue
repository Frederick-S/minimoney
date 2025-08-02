<template>
  <v-card class="mb-6" elevation="1" v-if="showChart && trendData && trendData.length > 0">
    <v-card-title class="pb-2">
      <v-icon class="mr-2">mdi-chart-line</v-icon>
      {{ year }}年月度趋势
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
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  LineController,
  Filler
} from 'chart.js'
import { type MonthlyTrendData } from '../../types'

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, LineController, Filler)

interface Props {
  trendData?: MonthlyTrendData[]
  year?: string
  showChart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  trendData: () => [],
  year: '',
  showChart: false
})

const chartRef = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0
  }).format(amount)
}

const monthlyData = computed(() => {
  if (!props.trendData || props.trendData.length === 0) {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    const data: Record<string, number> = {}
    months.forEach(month => {
      data[month] = 0
    })
    return { months, data }
  }
  
  const months = props.trendData.map(item => item.monthLabel)
  const data: Record<string, number> = {}
  
  props.trendData.forEach(item => {
    data[item.monthLabel] = item.amount
  })
  
  return { months, data }
})

const createChart = () => {
  if (!chartRef.value || !props.showChart) return
  
  const { months, data } = monthlyData.value
  
  if (chart) {
    chart.destroy()
  }
  
  chart = new Chart(chartRef.value, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: '月支出',
        data: Object.values(data),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#2196F3',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${context.label}: ${formatAmount(context.parsed.y)}`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => {
              return formatAmount(value as number)
            }
          }
        }
      }
    }
  })
}

watch([monthlyData, () => props.showChart], () => {
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
