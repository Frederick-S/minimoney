<template>
  <v-card elevation="1" v-if="expenses.length > 0">
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

const categoryNames: Record<string, string> = {
  Food: '餐饮',
  Transport: '交通',
  Shopping: '购物',
  Entertainment: '娱乐',
  Other: '其他'
}

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

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const categoryBreakdown = computed(() => {
  const breakdown: Record<string, { amount: number; count: number; percentage: number }> = {}
  
  props.expenses.forEach(expense => {
    if (!breakdown[expense.category]) {
      breakdown[expense.category] = { amount: 0, count: 0, percentage: 0 }
    }
    breakdown[expense.category].amount += expense.amount
    breakdown[expense.category].count += 1
  })
  
  const total = props.expenses.reduce((sum, exp) => sum + exp.amount, 0)
  Object.keys(breakdown).forEach(category => {
    breakdown[category].percentage = total > 0 ? (breakdown[category].amount / total) * 100 : 0
  })
  
  const sortedBreakdown: Record<string, any> = {}
  Object.entries(breakdown)
    .sort(([,a], [,b]) => b.amount - a.amount)
    .forEach(([category, data]) => {
      sortedBreakdown[category] = data
    })
  
  return sortedBreakdown
})
</script>
