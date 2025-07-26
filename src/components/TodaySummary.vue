<template>
  <v-card class="mb-6" elevation="2">
    <v-card-text>
      <v-card-title class="pa-0 text-h6 mb-2">今日支出</v-card-title>
      <div class="text-h4 font-weight-bold text-primary">
        {{ formatAmount(todayTotal) }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const todayTotal = computed(() => {
  const today = new Date().toDateString()
  return props.expenses
    .filter(expense => new Date(expense.date).toDateString() === today)
    .reduce((total, expense) => total + expense.amount, 0)
})

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}
</script>