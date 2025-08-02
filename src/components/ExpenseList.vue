<template>
  <div>
    <h2 class="text-h6 font-weight-medium mb-4 mt-6">支出记录</h2>
    
    <div v-if="sortedExpenses.length === 0" class="text-center py-12">
      <div class="text-h1 mb-4">💸</div>
      <v-card-title class="justify-center">还没有支出记录</v-card-title>
      <v-card-subtitle class="text-center mb-6">
        点击右下角的 + 按钮添加第一笔支出
      </v-card-subtitle>
    </div>
    
    <div v-else>
      <div v-for="group in groupedExpenses" :key="group.date" class="mb-6">
        <!-- Date Header -->
        <div class="d-flex align-center justify-space-between mb-3">
          <h3 class="text-subtitle-1 font-weight-medium text-medium-emphasis">
            {{ group.dateLabel }}
          </h3>
          <div class="d-flex align-center">
            <span class="text-body-2 text-medium-emphasis mr-3">
              {{ formatAmount(group.total) }}
            </span>
            <v-divider />
          </div>
        </div>
        
        <!-- Expenses for this date -->
        <v-card 
          v-for="expense in group.expenses" 
          :key="expense.id"
          class="mb-3"
          elevation="1"
        >
          <v-card-text>
            <div class="d-flex justify-space-between align-start">
              <div class="flex-grow-1">
                <div class="d-flex align-center ga-3 mb-2">
                  <v-chip 
                    :color="getCategoryColor(expense.categoryId)"
                    size="small"
                    variant="flat"
                  >
                    {{ getCategoryDisplayName(expense.categoryId) }}
                  </v-chip>
                </div>
                <div class="text-h6 font-weight-medium text-primary">
                  {{ formatAmount(expense.amount) }}
                </div>
                <div v-if="expense.note" class="text-body-2 text-medium-emphasis mt-1">
                  {{ expense.note }}
                </div>
              </div>
              <div class="ml-3 d-flex ga-2">
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="emit('edit', expense)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  color="error"
                  @click="handleDelete(expense)"
                />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h6 font-weight-medium">
          <v-icon color="error" class="mr-2">mdi-alert-circle-outline</v-icon>
          确认删除
        </v-card-title>
        
        <v-card-text v-if="expenseToDelete" class="pb-2">
          <p class="mb-3">确定要删除这笔支出吗？</p>
          
          <v-card class="bg-grey-lighten-5 pa-3 mb-3" elevation="0">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2 text-medium-emphasis">金额</span>
              <span class="text-h6 font-weight-medium text-error">
                {{ formatAmount(expenseToDelete.amount) }}
              </span>
            </div>
            
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2 text-medium-emphasis">分类</span>
              <v-chip 
                :color="getCategoryColor(expenseToDelete.categoryId)"
                size="small"
                variant="flat"
              >
                {{ getCategoryDisplayName(expenseToDelete.categoryId) }}
              </v-chip>
            </div>
            
            <div v-if="expenseToDelete.note" class="d-flex justify-space-between align-start">
              <span class="text-body-2 text-medium-emphasis">备注</span>
              <span class="text-body-2 text-right flex-shrink-1">
                {{ expenseToDelete.note }}
              </span>
            </div>
          </v-card>
          
          <p class="text-body-2 text-error mb-0">
            <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
            此操作不可撤销
          </p>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="text"
            @click="cancelDelete"
            color="primary"
          >
            取消
          </v-btn>
          <v-btn
            variant="flat"
            color="error"
            @click="confirmDelete"
            class="ml-2"
          >
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCategories } from '../composables/useCategories'
import { type Expense, type ExpenseListProps, type ExpenseListEmits } from '../types'

const props = defineProps<ExpenseListProps>()
const emit = defineEmits<ExpenseListEmits>()

const { getCategoryDisplayName, getCategoryColor } = useCategories()

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const sortedExpenses = computed(() => 
  // Data is already sorted from database, just limit to 10 items
  props.expenses.slice(0, 10)
)

// Format date for display
const formatDateLabel = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  
  // Reset time to compare only dates
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const compareYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
  
  if (compareDate.getTime() === compareToday.getTime()) {
    return '今天'
  } else if (compareDate.getTime() === compareYesterday.getTime()) {
    return '昨天'  
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  }
}

// Group expenses by date
const groupedExpenses = computed(() => {
  const groups = new Map<string, { date: string; dateLabel: string; expenses: typeof sortedExpenses.value; total: number }>()
  
  sortedExpenses.value.forEach(expense => {
    const dateKey = expense.date
    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: dateKey,
        dateLabel: formatDateLabel(dateKey),
        expenses: [],
        total: 0
      })
    }
    const group = groups.get(dateKey)!
    group.expenses.push(expense)
    group.total += expense.amount
  })
  
  // Convert Map to Array and maintain date order (already sorted from database)
  return Array.from(groups.values())
})

// Delete confirmation dialog state
const showDeleteDialog = ref(false)
const expenseToDelete = ref<Expense | null>(null)

// Handle delete button click - show confirmation dialog
const handleDelete = (expense: Expense) => {
  expenseToDelete.value = expense
  showDeleteDialog.value = true
}

// Confirm deletion
const confirmDelete = () => {
  if (expenseToDelete.value) {
    emit('delete', expenseToDelete.value.id)
    showDeleteDialog.value = false
    expenseToDelete.value = null
  }
}

// Cancel deletion
const cancelDelete = () => {
  showDeleteDialog.value = false
  expenseToDelete.value = null
}
</script>