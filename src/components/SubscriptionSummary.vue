<template>
  <v-card elevation="2" class="mb-4">
    <v-card-title class="text-h6 font-weight-medium pa-4">
      订阅总览
    </v-card-title>
    <v-card-text class="pa-4">
      <!-- Total Monthly Cost -->
      <div class="summary-item">
        <div class="d-flex align-center ga-1 mb-1">
          <span class="text-body-2 text-medium-emphasis">每月总费用</span>
          <v-btn
            icon="mdi-information-outline"
            size="x-small"
            variant="text"
            @click="showMonthlyInfo = true"
          />
        </div>
        <div class="text-h6 font-weight-bold text-primary">
          {{ formatAmount(summary.totalMonthly, summary.currency) }}
        </div>
      </div>

      <!-- Total Yearly Cost -->
      <div class="summary-item">
        <div class="d-flex align-center ga-1 mb-1">
          <span class="text-body-2 text-medium-emphasis">每年总费用</span>
          <v-btn
            icon="mdi-information-outline"
            size="x-small"
            variant="text"
            @click="showYearlyInfo = true"
          />
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

    <!-- Monthly Calculation Info Dialog -->
    <v-dialog v-model="showMonthlyInfo" max-width="500">
      <v-card>
        <v-card-title class="text-h6 d-flex align-center pa-4">
          <v-icon class="mr-2" color="primary">mdi-calculator</v-icon>
          每月总费用明细
        </v-card-title>
        <v-card-text class="pa-4">
          <div v-if="activeSubscriptions.length === 0" class="text-center text-medium-emphasis py-4">
            暂无活跃订阅
          </div>
          <div v-else>
            <div v-for="sub in activeSubscriptions" :key="sub.id" class="mb-3 pb-3" style="border-bottom: 1px solid #e0e0e0;">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="font-weight-medium">{{ sub.name }}</span>
                <v-chip size="x-small" :color="sub.billingFrequency === 'monthly' ? 'blue' : 'purple'" variant="flat">
                  {{ sub.billingFrequency === 'monthly' ? '每月' : '每年' }}
                </v-chip>
              </div>
              <div class="d-flex justify-space-between align-center text-body-2">
                <span class="text-medium-emphasis">
                  {{ sub.billingFrequency === 'monthly' ? '月费' : '年费 ÷ 12' }}
                </span>
                <span class="font-weight-medium">
                  {{ formatAmount(getMonthlyAmount(sub), summary.currency) }}
                </span>
              </div>
            </div>
            <div class="d-flex justify-space-between align-center pt-2 mt-2" style="border-top: 2px solid #1976d2;">
              <span class="font-weight-bold">总计</span>
              <span class="font-weight-bold text-primary text-h6">
                {{ formatAmount(summary.totalMonthly, summary.currency) }}
              </span>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showMonthlyInfo = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Yearly Calculation Info Dialog -->
    <v-dialog v-model="showYearlyInfo" max-width="500">
      <v-card>
        <v-card-title class="text-h6 d-flex align-center pa-4">
          <v-icon class="mr-2" color="secondary">mdi-calculator</v-icon>
          每年总费用明细
        </v-card-title>
        <v-card-text class="pa-4">
          <div v-if="activeSubscriptions.length === 0" class="text-center text-medium-emphasis py-4">
            暂无活跃订阅
          </div>
          <div v-else>
            <div v-for="sub in activeSubscriptions" :key="sub.id" class="mb-3 pb-3" style="border-bottom: 1px solid #e0e0e0;">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="font-weight-medium">{{ sub.name }}</span>
                <v-chip size="x-small" :color="sub.billingFrequency === 'monthly' ? 'blue' : 'purple'" variant="flat">
                  {{ sub.billingFrequency === 'monthly' ? '每月' : '每年' }}
                </v-chip>
              </div>
              <div class="d-flex justify-space-between align-center text-body-2">
                <span class="text-medium-emphasis">
                  {{ sub.billingFrequency === 'yearly' ? '年费' : '月费 × 12' }}
                </span>
                <span class="font-weight-medium">
                  {{ formatAmount(getYearlyAmount(sub), summary.currency) }}
                </span>
              </div>
            </div>
            <div class="d-flex justify-space-between align-center pt-2 mt-2" style="border-top: 2px solid #9c27b0;">
              <span class="font-weight-bold">总计</span>
              <span class="font-weight-bold text-secondary text-h6">
                {{ formatAmount(summary.totalYearly, summary.currency) }}
              </span>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showYearlyInfo = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SubscriptionSummaryProps, SubscriptionDisplay } from '../types'

const props = defineProps<SubscriptionSummaryProps>()

// Dialog state
const showMonthlyInfo = ref(false)
const showYearlyInfo = ref(false)

// Get active (non-expired) subscriptions
const activeSubscriptions = computed(() => {
  return props.subscriptions.filter(sub => !sub.isExpired)
})

// Calculate monthly amount for a subscription
const getMonthlyAmount = (sub: SubscriptionDisplay): number => {
  if (sub.billingFrequency === 'monthly') {
    return sub.displayAmount
  } else {
    return sub.displayAmount / 12
  }
}

// Calculate yearly amount for a subscription
const getYearlyAmount = (sub: SubscriptionDisplay): number => {
  if (sub.billingFrequency === 'yearly') {
    return sub.displayAmount
  } else {
    return sub.displayAmount * 12
  }
}

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
