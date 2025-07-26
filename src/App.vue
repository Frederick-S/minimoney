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
            <div class="text-center py-16">
              <v-icon size="80" color="grey-lighten-1" class="mb-6">
                mdi-chart-pie
              </v-icon>
              <v-card-title class="justify-center mb-3">支出图表</v-card-title>
              <v-card-subtitle class="text-center">
                这里将显示您的支出统计和图表分析
              </v-card-subtitle>
              <v-card class="mt-8 pa-6" elevation="1">
                <div class="text-body-1 text-medium-emphasis text-center">
                  <v-icon class="mr-2">mdi-chart-line</v-icon>
                  月度支出趋势
                </div>
                <div class="text-body-1 text-medium-emphasis text-center mt-4">
                  <v-icon class="mr-2">mdi-chart-donut</v-icon>
                  分类支出占比
                </div>
                <div class="text-body-1 text-medium-emphasis text-center mt-4">
                  <v-icon class="mr-2">mdi-calendar-month</v-icon>
                  月度对比分析
                </div>
              </v-card>
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
import { ref, computed } from 'vue'
import { useKV } from './hooks/useKV'

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
</script>