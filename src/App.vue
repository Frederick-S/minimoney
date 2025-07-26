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
          <SummaryDashboard 
            :expenses="expenses"
            :selected-period="selectedPeriod"
            @period-change="setSelectedPeriod"
          />
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
          
          <TransitionGroup v-else name="expense" tag="div" class="space-y-2">
            <ExpenseCard
              v-for="expense in sortedExpenses"
              :key="expense.id"
              :expense="expense"
              @edit="handleEditExpense"
              @delete="handleDeleteExpense"
            />
          </TransitionGroup>
        </div>
      </div>

      <!-- Floating Action Button -->
      <FloatingActionButton @click="handleOpenForm" />

      <!-- Expense Form -->
      <ExpenseForm
        :is-open="isFormOpen"
        :editing-expense="editingExpense"
        @close="handleCloseForm"
        @save="handleSaveExpense"
      />
    </div>
    
    <!-- Toast Notifications -->
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKV } from './hooks/useKV'
import { toast } from 'vue-sonner'
import { Toaster } from 'vue-sonner'
import ExpenseCard from './components/ExpenseCard.vue'
import ExpenseForm from './components/ExpenseForm.vue'
import SummaryDashboard from './components/SummaryDashboard.vue'
import FloatingActionButton from './components/FloatingActionButton.vue'

interface Expense {
  id: string
  amount: number
  category: string
  note?: string
  date: string
}

const [expenses, setExpenses] = useKV<Expense[]>("expenses", [])
const isFormOpen = ref(false)
const editingExpense = ref<Expense | null>(null)
const selectedPeriod = ref<'day' | 'week' | 'month'>('day')

const handleSaveExpense = (expenseData: Omit<Expense, 'id'>) => {
  if (editingExpense.value) {
    setExpenses((currentExpenses: Expense[]) => 
      currentExpenses.map(expense => 
        expense.id === editingExpense.value!.id 
          ? { ...expenseData, id: editingExpense.value!.id }
          : expense
      )
    )
    toast.success("支出已更新")
    editingExpense.value = null
  } else {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString()
    }
    setExpenses((currentExpenses: Expense[]) => [newExpense, ...currentExpenses])
    toast.success("支出已添加")
  }
  isFormOpen.value = false
}

const handleEditExpense = (expense: Expense) => {
  editingExpense.value = expense
  isFormOpen.value = true
}

const handleDeleteExpense = (id: string) => {
  setExpenses((currentExpenses: Expense[]) => 
    currentExpenses.filter(expense => expense.id !== id)
  )
  toast.success("支出已删除")
}

const handleOpenForm = () => {
  editingExpense.value = null
  isFormOpen.value = true
}

const handleCloseForm = () => {
  isFormOpen.value = false
  editingExpense.value = null
}

const setSelectedPeriod = (period: 'day' | 'week' | 'month') => {
  selectedPeriod.value = period
}

const sortedExpenses = computed(() => 
  [...expenses.value].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
)
</script>

<style scoped>
.expense-move,
.expense-enter-active,
.expense-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.expense-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.expense-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.expense-leave-active {
  position: absolute;
  right: 16px;
  left: 16px;
}
</style>