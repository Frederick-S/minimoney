<template>
  <v-card elevation="2" class="mb-4">
    <v-card-title class="text-h6 font-weight-medium pa-4">
      订阅总览
    </v-card-title>
    <v-card-text class="pa-4">
      <!-- Total Monthly Cost -->
      <div class="summary-item">
        <div class="text-body-2 text-medium-emphasis mb-1">
          每月总费用
        </div>
        <div class="text-h6 font-weight-bold text-primary">
          {{ formatAmount(summary.totalMonthly, summary.currency) }}
        </div>
      </div>

      <!-- Total Yearly Cost -->
      <div class="summary-item">
        <div class="text-body-2 text-medium-emphasis mb-1">
          每年总费用
        </div>
        <div class="text-h6 font-weight-bold text-secondary">
          {{ formatAmount(summary.totalYearly, summary.currency) }}
        </div>
      </div>

      <!-- Active Subscription Count -->
      <div class="summary-item">
        <div class="text-body-2 text-medium-emphasis mb-1">
          活跃订阅数
        </div>
        <div class="text-h6 font-weight-bold">
          {{ summary.activeCount }}
        </div>
      </div>

      <!-- Currency Indicator -->
      <div class="summary-item">
        <div class="text-body-2 text-medium-emphasis mb-1">
          显示货币
        </div>
        <div class="text-h6 font-weight-bold">
          {{ getCurrencyName(summary.currency) }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { SubscriptionSummaryProps } from '../types'

const props = defineProps<SubscriptionSummaryProps>()

/**
 * Format amount with currency symbol
 */
const formatAmount = (amount: number, currency: string): string => {
  const currencySymbols: Record<string, string> = {
    'CNY': '¥',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'HKD': '$'
  }
  
  const symbol = currencySymbols[currency] || currency
  
  return new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace(/^/, symbol)
}

/**
 * Get currency display name
 */
const getCurrencyName = (currency: string): string => {
  const currencyNames: Record<string, string> = {
    'CNY': '人民币 (¥)',
    'USD': '美元 ($)',
    'EUR': '欧元 (€)',
    'GBP': '英镑 (£)',
    'JPY': '日元 (¥)',
    'HKD': '港币 ($)'
  }
  
  return currencyNames[currency] || currency
}
</script>

<style scoped>
.summary-item {
  padding: 12px 0;
}

.summary-item:first-child {
  padding-top: 0;
}

.summary-item:last-child {
  padding-bottom: 0;
}
</style>
