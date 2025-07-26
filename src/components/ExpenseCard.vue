<template>
  <Card class="p-4 mb-3 hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <Badge 
            variant="secondary" 
            :class="getCategoryColor(expense.category)"
          >
            {{ expense.category }}
          </Badge>
          <span class="text-sm text-muted-foreground">
            {{ formatDate(expense.date) }}
          </span>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="text-2xl font-semibold text-foreground">
              {{ formatAmount(expense.amount) }}
            </p>
            <p v-if="expense.note" class="text-sm text-muted-foreground mt-1">
              {{ expense.note }}
            </p>
          </div>
          
          <div class="flex gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              @click="$emit('edit', expense)"
              class="h-8 w-8 p-0"
            >
              <Edit :size="16" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="$emit('delete', expense.id)"
              class="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 :size="16" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import Card from "@/components/ui/card.vue"
import Badge from "@/components/ui/badge.vue"
import Button from "@/components/ui/button.vue"
import { Trash2, Edit } from "@phosphor-icons/vue"

interface Expense {
  id: string
  amount: number
  category: string
  note?: string
  date: string
}

interface Props {
  expense: Expense
}

defineProps<Props>()
defineEmits<{
  edit: [expense: Expense]
  delete: [id: string]
}>()

const categoryColors = {
  Food: "bg-red-100 text-red-800",
  Transport: "bg-blue-100 text-blue-800", 
  Shopping: "bg-purple-100 text-purple-800",
  Entertainment: "bg-green-100 text-green-800",
  Health: "bg-yellow-100 text-yellow-800",
  Bills: "bg-gray-100 text-gray-800",
  Other: "bg-slate-100 text-slate-800"
}

const getCategoryColor = (category: string) => {
  return categoryColors[category as keyof typeof categoryColors] || categoryColors.Other
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "今天"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "昨天"
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}
</script>