<template>
  <v-app>
    <v-main class="bg-grey-lighten-5">
      <v-container class="pa-0 max-w-md mx-auto" fluid>
        <!-- Header -->
        <v-app-bar 
          color="primary" 
          dark 
          elevation="1"
          class="mb-0"
        >
          <v-app-bar-title>
            <div class="d-flex flex-column">
              <span class="text-h6">记账</span>
              <span class="text-caption opacity-75">简单记录每一笔支出</span>
            </div>
          </v-app-bar-title>
        </v-app-bar>

        <!-- Content Area with Bottom Padding for Tabs -->
        <div class="pa-4" style="padding-bottom: 88px;">
          <!-- 首页 Tab Content -->
          <div v-if="activeTab === 'home'">
            <!-- Summary Dashboard -->
            <v-card class="mb-6" elevation="2">
              <v-card-text>
                <v-card-title class="pa-0 text-h6 mb-2">今日支出</v-card-title>
                <div class="text-h4 font-weight-bold text-primary">
                  {{ formatAmount(todayTotal) }}
                </div>
              </v-card-text>
            </v-card>

            <!-- Recent Expenses -->
            <div>
              <h2 class="text-h6 font-weight-medium mb-4">最近支出</h2>
              
              <div v-if="sortedExpenses.length === 0" class="text-center py-12">
                <div class="text-h1 mb-4">💸</div>
                <v-card-title class="justify-center">还没有支出记录</v-card-title>
                <v-card-subtitle class="text-center mb-6">
                  点击右下角的 + 按钮添加第一笔支出
                </v-card-subtitle>
              </div>
              
              <div v-else>
                <v-card 
                  v-for="expense in sortedExpenses" 
                  :key="expense.id"
                  class="mb-3"
                  elevation="1"
                >
                  <v-card-text>
                    <div class="d-flex justify-space-between align-start">
                      <div class="flex-grow-1">
                        <div class="d-flex align-center ga-3 mb-2">
                          <v-chip 
                            :color="getCategoryColor(expense.category)"
                            size="small"
                            variant="flat"
                          >
                            {{ categoryNames[expense.category] }}
                          </v-chip>
                          <span class="text-caption text-medium-emphasis">
                            {{ new Date(expense.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) }}
                          </span>
                        </div>
                        <div class="text-h6 font-weight-medium text-primary">
                          {{ formatAmount(expense.amount) }}
                        </div>
                        <div v-if="expense.note" class="text-body-2 text-medium-emphasis mt-1">
                          {{ expense.note }}
                        </div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </div>

          <!-- 图表 Tab Content -->
          <div v-if="activeTab === 'charts'">
            <!-- Time Period Filter -->
            <v-card class="mb-4" elevation="1">
              <v-card-text>
                <div class="d-flex align-center justify-space-between mb-4">
                  <h2 class="text-h6 font-weight-medium">统计期间</h2>
                </div>
                
                <v-chip-group
                  v-model="selectedPeriodType"
                  selected-class="text-primary"
                  mandatory
                  class="mb-4"
                >
                  <v-chip value="month" variant="outlined">月度</v-chip>
                  <v-chip value="year" variant="outlined">年度</v-chip>
                </v-chip-group>

                <v-select
                  v-if="selectedPeriodType === 'month'"
                  v-model="selectedMonth"
                  :items="availableMonths"
                  item-title="label"
                  item-value="value"
                  label="选择月份"
                  variant="outlined"
                  dense
                />
                
                <v-select
                  v-if="selectedPeriodType === 'year'"
                  v-model="selectedYear"
                  :items="availableYears"
                  item-title="label"
                  item-value="value"
                  label="选择年份"
                  variant="outlined"
                  dense
                />
              </v-card-text>
            </v-card>

            <!-- Summary Stats -->
            <v-card class="mb-6" elevation="2">
              <v-card-text>
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-body-1">{{ periodLabel }}总支出</span>
                </div>
                <div class="text-h4 font-weight-bold text-primary">
                  {{ formatAmount(periodTotal) }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  共 {{ periodExpenses.length }} 笔支出
                </div>
              </v-card-text>
            </v-card>

            <!-- Category Breakdown Chart -->
            <v-card class="mb-6" elevation="1" v-if="periodExpenses.length > 0">
              <v-card-title class="pb-2">
                <v-icon class="mr-2">mdi-chart-donut</v-icon>
                分类支出占比
              </v-card-title>
              <v-card-text>
                <div style="position: relative; height: 300px;">
                  <canvas ref="categoryChartRef"></canvas>
                </div>
              </v-card-text>
            </v-card>

            <!-- Monthly Trend Chart (only show for year view) -->
            <v-card class="mb-6" elevation="1" v-if="selectedPeriodType === 'year' && periodExpenses.length > 0">
              <v-card-title class="pb-2">
                <v-icon class="mr-2">mdi-chart-line</v-icon>
                {{ selectedYear }}年月度趋势
              </v-card-title>
              <v-card-text>
                <div style="position: relative; height: 300px;">
                  <canvas ref="trendChartRef"></canvas>
                </div>
              </v-card-text>
            </v-card>

            <!-- Category Details -->
            <v-card elevation="1" v-if="periodExpenses.length > 0">
              <v-card-title class="pb-2">
                <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
                分类明细
              </v-card-title>
              <v-card-text class="pa-0">
                <v-list>
                  <v-list-item
                    v-for="(categoryData, category) in categoryBreakdown"
                    :key="category"
                    class="px-4"
                  >
                    <template v-slot:prepend>
                      <v-avatar
                        :color="getCategoryColor(category)"
                        size="small"
                        class="mr-3"
                      >
                        <span class="text-white text-caption font-weight-bold">
                          {{ Math.round(categoryData.percentage) }}%
                        </span>
                      </v-avatar>
                    </template>
                    
                    <v-list-item-title class="font-weight-medium">
                      {{ categoryNames[category] }}
                    </v-list-item-title>
                    
                    <template v-slot:append>
                      <div class="text-right">
                        <div class="font-weight-bold">{{ formatAmount(categoryData.amount) }}</div>
                        <div class="text-caption text-medium-emphasis">{{ categoryData.count }} 笔</div>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>

            <!-- Empty State -->
            <div v-if="periodExpenses.length === 0" class="text-center py-16">
              <v-icon size="80" color="grey-lighten-1" class="mb-6">
                mdi-chart-pie
              </v-icon>
              <v-card-title class="justify-center mb-3">暂无数据</v-card-title>
              <v-card-subtitle class="text-center">
                {{ periodLabel }}还没有支出记录
              </v-card-subtitle>
            </div>
          </div>
        </div>

        <!-- Floating Action Button (only show on home tab) -->
        <v-fab
          v-if="activeTab === 'home'"
          icon="mdi-plus"
          location="bottom end"
          color="primary"
          size="large"
          app
          style="bottom: 72px;"
          @click="showForm = true"
        />

        <!-- Bottom Navigation -->
        <v-bottom-navigation 
          v-model="activeTab" 
          color="primary"
          grow
          class="elevation-8"
          fixed
          app
        >
          <v-btn value="home">
            <v-icon>mdi-home</v-icon>
            <span>首页</span>
          </v-btn>
          
          <v-btn value="charts">
            <v-icon>mdi-chart-pie</v-icon>
            <span>图表</span>
          </v-btn>
        </v-bottom-navigation>

        <!-- Material Design Form Dialog -->
        <v-dialog 
          v-model="showForm" 
          max-width="400" 
          persistent
          :fullscreen="$vuetify.display.mobile"
        >
          <v-card>
            <v-toolbar color="primary" dark>
              <v-toolbar-title>添加支出</v-toolbar-title>
              <v-spacer />
              <v-btn icon @click="showForm = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-toolbar>

            <v-card-text class="pa-6">
              <v-form @submit.prevent="saveExpense">
                <v-text-field
                  v-model="amount"
                  label="金额"
                  type="number"
                  step="0.01"
                  min="0"
                  prefix="¥"
                  variant="outlined"
                  :rules="[v => !!v || '请输入金额']"
                  required
                  class="mb-4"
                />
                
                <v-select
                  v-model="category"
                  :items="categoryOptions"
                  item-title="text"
                  item-value="value"
                  label="分类"
                  variant="outlined"
                  class="mb-4"
                />
                
                <v-textarea
                  v-model="note"
                  label="备注"
                  variant="outlined"
                  rows="3"
                  no-resize
                  placeholder="添加备注信息..."
                  class="mb-4"
                />
              </v-form>
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn 
                variant="outlined" 
                @click="showForm = false"
                class="mr-2"
              >
                取消
              </v-btn>
              <v-btn 
                color="primary"
                variant="flat"
                @click="saveExpense"
                :disabled="!amount"
              >
                保存
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useKV } from './hooks/useKV'
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

interface Expense {
  id: string
  amount: number
  category: string
  date: string
  note?: string
}

const [expenses, setExpenses] = useKV<Expense[]>("expenses", [])
const showForm = ref(false)
const amount = ref('')
const category = ref('Food')
const note = ref('')
const activeTab = ref('home')

// Chart-related refs and state
const categoryChartRef = ref<HTMLCanvasElement>()
const trendChartRef = ref<HTMLCanvasElement>()
const selectedPeriodType = ref<'month' | 'year'>('month')
const selectedMonth = ref('')
const selectedYear = ref('')

// Chart instances
let categoryChart: Chart | null = null
let trendChart: Chart | null = null

const saveExpense = () => {
  if (!amount.value) return
  
  const newExpense: Expense = {
    id: Date.now().toString(),
    amount: parseFloat(amount.value),
    category: category.value,
    date: new Date().toISOString(),
    note: note.value.trim() || undefined
  }
  
  setExpenses((currentExpenses: Expense[]) => [newExpense, ...currentExpenses])
  
  showForm.value = false
  amount.value = ''
  note.value = ''
}

const todayTotal = computed(() => {
  const today = new Date().toDateString()
  return expenses.value
    .filter(expense => new Date(expense.date).toDateString() === today)
    .reduce((total, expense) => total + expense.amount, 0)
})

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const categoryNames: Record<string, string> = {
  Food: '餐饮',
  Transport: '交通',
  Shopping: '购物',
  Entertainment: '娱乐',
  Other: '其他'
}

const categoryOptions = [
  { text: '餐饮', value: 'Food' },
  { text: '交通', value: 'Transport' },
  { text: '购物', value: 'Shopping' },
  { text: '娱乐', value: 'Entertainment' },
  { text: '其他', value: 'Other' }
]

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Food: 'orange',
    Transport: 'blue',
    Shopping: 'pink',
    Entertainment: 'purple',
    Other: 'grey'
  }
  return colors[category] || 'grey'
}

const sortedExpenses = computed(() => 
  [...expenses.value].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10) // Show only last 10 expenses
)

// Initialize period selection
onMounted(() => {
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  selectedYear.value = now.getFullYear().toString()
})

// Available months and years based on expense data
const availableMonths = computed(() => {
  const months = new Set<string>()
  expenses.value.forEach(expense => {
    const date = new Date(expense.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    months.add(monthKey)
  })
  
  // Add current month if no expenses exist
  if (months.size === 0) {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    months.add(currentMonth)
  }
  
  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map(month => {
      const [year, monthNum] = month.split('-')
      const date = new Date(parseInt(year), parseInt(monthNum) - 1)
      return {
        value: month,
        label: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
      }
    })
})

const availableYears = computed(() => {
  const years = new Set<string>()
  expenses.value.forEach(expense => {
    const year = new Date(expense.date).getFullYear().toString()
    years.add(year)
  })
  
  // Add current year if no expenses exist
  if (years.size === 0) {
    years.add(new Date().getFullYear().toString())
  }
  
  return Array.from(years)
    .sort((a, b) => b.localeCompare(a))
    .map(year => ({
      value: year,
      label: `${year}年`
    }))
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
    const monthData = availableMonths.value.find(m => m.value === selectedMonth.value)
    return monthData?.label || '本月'
  } else {
    return `${selectedYear.value}年`
  }
})

// Category breakdown for the selected period
const categoryBreakdown = computed(() => {
  const breakdown: Record<string, { amount: number; count: number; percentage: number }> = {}
  
  periodExpenses.value.forEach(expense => {
    if (!breakdown[expense.category]) {
      breakdown[expense.category] = { amount: 0, count: 0, percentage: 0 }
    }
    breakdown[expense.category].amount += expense.amount
    breakdown[expense.category].count += 1
  })
  
  // Calculate percentages
  const total = periodTotal.value
  Object.keys(breakdown).forEach(category => {
    breakdown[category].percentage = total > 0 ? (breakdown[category].amount / total) * 100 : 0
  })
  
  // Sort by amount descending
  const sortedBreakdown: Record<string, any> = {}
  Object.entries(breakdown)
    .sort(([,a], [,b]) => b.amount - a.amount)
    .forEach(([category, data]) => {
      sortedBreakdown[category] = data
    })
  
  return sortedBreakdown
})

// Chart creation and update functions
const createCategoryChart = () => {
  if (!categoryChartRef.value) return
  
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
  
  if (categoryChart) {
    categoryChart.destroy()
  }
  
  categoryChart = new Chart(categoryChartRef.value, {
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
              const percentage = ((value / periodTotal.value) * 100).toFixed(1)
              return `${context.label}: ${formatAmount(value)} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

const createTrendChart = () => {
  if (!trendChartRef.value || selectedPeriodType.value !== 'year') return
  
  // Group expenses by month for the selected year
  const monthlyData: Record<string, number> = {}
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  
  // Initialize all months with 0
  months.forEach((month, index) => {
    monthlyData[month] = 0
  })
  
  // Aggregate expenses by month
  periodExpenses.value.forEach(expense => {
    const month = new Date(expense.date).getMonth()
    const monthLabel = months[month]
    monthlyData[monthLabel] += expense.amount
  })
  
  if (trendChart) {
    trendChart.destroy()
  }
  
  trendChart = new Chart(trendChartRef.value, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: '月支出',
        data: Object.values(monthlyData),
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
              return new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: 'CNY',
                minimumFractionDigits: 0
              }).format(value as number)
            }
          }
        }
      }
    }
  })
}

// Watch for changes that require chart updates
watch([activeTab, categoryBreakdown], () => {
  if (activeTab.value === 'charts') {
    nextTick(() => {
      createCategoryChart()
      createTrendChart()
    })
  }
})

watch([selectedPeriodType, selectedMonth, selectedYear], () => {
  if (activeTab.value === 'charts') {
    nextTick(() => {
      createCategoryChart()
      createTrendChart()
    })
  }
})

const saveExpense = () => {
  if (!amount.value) return
  
  const newExpense: Expense = {
    id: Date.now().toString(),
    amount: parseFloat(amount.value),
    category: category.value,
    date: new Date().toISOString(),
    note: note.value.trim() || undefined
  }
  
  setExpenses((currentExpenses: Expense[]) => [newExpense, ...currentExpenses])
  
  showForm.value = false
  amount.value = ''
  note.value = ''
}

const todayTotal = computed(() => {
  const today = new Date().toDateString()
  return expenses.value
    .filter(expense => new Date(expense.date).toDateString() === today)
    .reduce((total, expense) => total + expense.amount, 0)
})

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const categoryNames: Record<string, string> = {
  Food: '餐饮',
  Transport: '交通',
  Shopping: '购物',
  Entertainment: '娱乐',
  Other: '其他'
}

const categoryOptions = [
  { text: '餐饮', value: 'Food' },
  { text: '交通', value: 'Transport' },
  { text: '购物', value: 'Shopping' },
  { text: '娱乐', value: 'Entertainment' },
  { text: '其他', value: 'Other' }
]

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Food: 'orange',
    Transport: 'blue',
    Shopping: 'pink',
    Entertainment: 'purple',
    Other: 'grey'
  }
  return colors[category] || 'grey'
}
</script></script>