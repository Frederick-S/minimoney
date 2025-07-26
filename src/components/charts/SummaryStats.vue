<template>
  <v-card class="mb-6" elevation="2">
    <v-card-text>
      <div class="d-flex justify-space-between align-center mb-2">
        <span class="text-body-1">{{ periodLabel }}总支出</span>
      </div>
      <div class="text-h4 font-weight-bold text-primary">
        {{ formatAmount(total) }}
      </div>
      <div class="text-caption text-medium-emphasis mt-1">
        共 {{ count }} 笔支出
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { type SummaryStatsProps } from '../../types'

defineProps<SummaryStatsProps>()

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}
</script>
