<template>
  <Card class="p-6 mb-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
    <div class="space-y-4">
      <Tabs class="w-full">
        <TabsList class="grid grid-cols-3 w-full bg-background/50">
          <TabsTrigger 
            :is-active="selectedPeriod === 'day'"
            @click="$emit('periodChange', 'day')"
            class="text-sm"
          >
            今日
          </TabsTrigger>
          <TabsTrigger 
            :is-active="selectedPeriod === 'week'"
            @click="$emit('periodChange', 'week')"
            class="text-sm"
          >
            本周
          </TabsTrigger>
          <TabsTrigger 
            :is-active="selectedPeriod === 'month'"
            @click="$emit('periodChange', 'month')"
            class="text-sm"
          >
            本月
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div class="text-center py-4">
        <p class="text-sm text-muted-foreground mb-1">
          {{ periodLabels[selectedPeriod] }}支出
        </p>
        <p class="text-3xl font-bold text-foreground">
          {{ formatAmount(total) }}
        </p>
        <p class="text-sm text-muted-foreground mt-1">
          共 {{ filteredExpenses.length }} 笔记录
        </p>
      </div>

      <div v-if="sortedCategories.length > 0" class="space-y-2">
        <p class="text-sm font-medium text-muted-foreground">主要支出分类</p>
        <div class="flex flex-wrap gap-2">
          <Badge 
            v-for="[category, amount] in sortedCategories"
            :key="category" 
            variant="secondary" 
            class="bg-background/70 text-foreground"
          >
            {{ categoryNames[category as keyof typeof categoryNames] }} {{ formatAmount(amount) }}
          </Badge>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Card } from "@/components/ui/card.vue"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs-index"
import { Badge } from "@/components/ui/badge.vue"

interface Expense {
  id: string
  amount: number
  category: string
  note?: string
  date: string
}

interface Props {
  expenses: Expense[]
  selectedPeriod: 'day' | 'week' | 'month'
}

const props = defineProps<Props>()
defineEmits<{
  periodChange: [period: 'day' | 'week' | 'month']
}>()

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const getFilteredExpenses = () => {
  const now = new Date()
  let startDate: Date

  switch (props.selectedPeriod) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - now.getDay())
      startDate.setHours(0, 0, 0, 0)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default:
      startDate = new Date(0)
  }

  return props.expenses.filter(expense => new Date(expense.date) >= startDate)
}

const filteredExpenses = computed(() => getFilteredExpenses())
const total = computed(() => filteredExpenses.value.reduce((sum, expense) => sum + expense.amount, 0))

const categoryTotals = computed(() => {
  return filteredExpenses.value.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)
})

const sortedCategories = computed(() => {
  return Object.entries(categoryTotals.value)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
})

const categoryNames = {
  Food: "餐饮",
  Transport: "交通",
  Shopping: "购物",
  Entertainment: "娱乐",
  Health: "医疗",
  Bills: "账单",
  Other: "其他"
}

const periodLabels = {
  day: "今日",
  week: "本周", 
  month: "本月"
}
</script>