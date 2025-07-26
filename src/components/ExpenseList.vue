<template>
  <div>
    <h2 class="text-h6 font-weight-medium mb-4 mt-6">最近支出</h2>
    
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
                  {{ getCategoryName(expense.category) }}
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCategories, type CategoryKey } from '../composables/useCategories'

interface Expense {
  id: string
  amount: number
  category: CategoryKey
  date: string
  note?: string
}

interface Props {
  expenses: Expense[]
}

interface Emits {
  (e: 'edit', expense: Expense): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getCategoryName, getCategoryColor } = useCategories()

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const sortedExpenses = computed(() => 
  [...props.expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10) // Show only last 10 expenses
)
</script>