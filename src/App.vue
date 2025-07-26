<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-md mx-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-background/95 backdrop-blur-sm z-40 border-b border-border/50">
        <div class="px-4 py-6">
          <h1 class="text-2xl font-bold text-foreground">记账</h1>
          <p class="text-sm text-muted-foreground">简单记录每一笔支出</p>
        </div>
      </div>

      <!-- Content -->
      <div class="px-4 pb-24">
        <!-- Summary Dashboard -->
        <div class="py-4">
          <div class="bg-card rounded-xl p-4 shadow-sm border">
            <h2 class="text-lg font-semibold mb-2">今日支出</h2>
            <p class="text-2xl font-bold text-foreground">{{ formatAmount(todayTotal) }}</p>
          </div>
        </div>

        <!-- Recent Expenses -->
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-foreground mb-4">
            最近支出
          </h2>
          
          <div v-if="sortedExpenses.length === 0" class="text-center py-12">
            <div class="text-6xl mb-4">💸</div>
            <h3 class="text-lg font-medium text-foreground mb-2">
              还没有支出记录
            </h3>
            <p class="text-sm text-muted-foreground mb-6">
              点击右下角的 + 按钮添加第一笔支出
            </p>
          </div>
          
          <div v-else class="space-y-2">
            <div 
              v-for="expense in sortedExpenses" 
              :key="expense.id"
              class="bg-card rounded-lg p-4 border shadow-sm"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium">
                      {{ categoryNames[expense.category] }}
                    </span>
                    <span class="text-sm text-muted-foreground">
                      {{ new Date(expense.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) }}
                    </span>
                  </div>
                  <p class="text-lg font-semibold text-foreground">
                    {{ formatAmount(expense.amount) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Action Button -->
      <div class="fixed bottom-6 right-6">
        <button 
          class="bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          @click="showForm = true"
        >
          <span class="text-2xl">+</span>
        </button>
      </div>

      <!-- Simple Form Modal -->
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50" @click="showForm = false">
        <div 
          class="w-full max-w-md bg-background rounded-t-3xl p-6 h-[80vh] flex flex-col"
          @click.stop
        >
          <div class="pb-6">
            <h2 class="text-xl font-semibold">添加支出</h2>
          </div>

          <div class="space-y-6 flex-1">
            <div class="space-y-2">
              <label class="text-base font-medium">金额 *</label>
              <input 
                type="number" 
                v-model="amount"
                class="w-full border border-input rounded-md px-3 py-2 bg-background"
                placeholder="0.00"
              />
            </div>
            
            <div class="space-y-2">
              <label class="text-base font-medium">分类</label>
              <select 
                v-model="category"
                class="w-full border border-input rounded-md px-3 py-2 bg-background"
              >
                <option value="Food">餐饮</option>
                <option value="Transport">交通</option>
                <option value="Shopping">购物</option>
                <option value="Entertainment">娱乐</option>
                <option value="Other">其他</option>
              </select>
            </div>
          </div>

          <div class="flex gap-3 pt-6">
            <button 
              @click="showForm = false"
              class="flex-1 py-3 px-4 border border-input rounded-md text-foreground hover:bg-muted"
            >
              取消
            </button>
            <button 
              @click="saveExpense"
              class="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKV } from './hooks/useKV'

interface Expense {
  id: string
  amount: number
  category: string
  date: string
}

const [expenses, setExpenses] = useKV<Expense[]>("expenses", [])
const showForm = ref(false)
const amount = ref('')
const category = ref('Food')

const saveExpense = () => {
  if (!amount.value) return
  
  const newExpense: Expense = {
    id: Date.now().toString(),
    amount: parseFloat(amount.value),
    category: category.value,
    date: new Date().toISOString()
  }
  
  setExpenses((currentExpenses: Expense[]) => [newExpense, ...currentExpenses])
  
  showForm.value = false
  amount.value = ''
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

const sortedExpenses = computed(() => 
  [...expenses.value].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10) // Show only last 10 expenses
)
</script>