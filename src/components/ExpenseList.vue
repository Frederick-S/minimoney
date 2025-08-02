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
              <div class="ml-3">
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="emit('edit', expense)"
                />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
</script>