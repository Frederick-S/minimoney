<template>
  <v-card class="mb-3" elevation="1">
    <v-card-text>
      <div class="d-flex justify-space-between align-start">
        <div class="flex-grow-1">
          <!-- Subscription Name -->
          <div class="text-h6 font-weight-medium mb-2">
            {{ subscription.name }}
          </div>
          
          <!-- Amount Display -->
          <div class="d-flex align-center ga-2 mb-2">
            <div class="text-h5 font-weight-bold text-primary">
              {{ formatAmount(subscription.displayAmount, subscription.displayCurrency) }}
            </div>
            
            <!-- Billing Frequency Badge -->
            <v-chip 
              size="small"
              :color="subscription.billingFrequency === 'monthly' ? 'blue' : 'purple'"
              variant="flat"
            >
              {{ subscription.billingFrequency === 'monthly' ? '每月' : '每年' }}
            </v-chip>
          </div>
          
          <!-- Original Currency Display (if different) -->
          <div 
            v-if="subscription.originalCurrency !== subscription.displayCurrency"
            class="text-body-2 text-medium-emphasis mb-2"
          >
            原价: {{ formatAmount(subscription.originalAmount, subscription.originalCurrency) }}
          </div>
          
          <!-- Renewal Status and End Date -->
          <div class="d-flex align-center ga-2 mb-2">
            <!-- Auto-renew indicator -->
            <div v-if="subscription.isAutoRenew" class="d-flex align-center ga-1">
              <v-icon size="small" color="success">mdi-sync</v-icon>
              <span class="text-body-2 text-success">自动续订</span>
            </div>
            
            <!-- End date display -->
            <div v-else class="d-flex align-center ga-1">
              <v-icon size="small" color="warning">mdi-calendar-end</v-icon>
              <span class="text-body-2">
                结束日期: {{ formatDate(subscription.endDate!) }}
              </span>
            </div>
            
            <!-- Warning indicator for subscriptions ending soon -->
            <v-chip
              v-if="subscription.isEndingSoon && !subscription.isExpired"
              size="small"
              color="warning"
              variant="flat"
              prepend-icon="mdi-alert"
            >
              {{ subscription.daysUntilEnd }}天后到期
            </v-chip>
            
            <!-- Expired badge -->
            <v-chip
              v-if="subscription.isExpired"
              size="small"
              color="error"
              variant="flat"
              prepend-icon="mdi-close-circle"
            >
              已过期
            </v-chip>
          </div>
          
          <!-- Next Billing Date (for active subscriptions) -->
          <div 
            v-if="!subscription.isExpired"
            class="text-body-2 text-medium-emphasis"
          >
            下次扣费: {{ formatDate(subscription.nextBillingDate) }}
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="ml-3 d-flex ga-2">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            @click="handleEdit"
            aria-label="编辑订阅"
          />
          <v-btn
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            color="error"
            @click="handleDelete"
            aria-label="删除订阅"
          />
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { SubscriptionCardProps } from '../types'

const props = defineProps<SubscriptionCardProps>()

const emit = defineEmits<{
  edit: [subscription: typeof props.subscription]
  delete: [id: string]
}>()

/**
 * Format amount with currency symbol
 */
const formatAmount = (amount: number, currency: string): string => {
  try {
    // Validate inputs
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '¥0.00'
    }
    
    const currencySymbols: Record<string, string> = {
      'CNY': '¥',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'HKD': '$'
    }
    
    const symbol = currencySymbols[currency] || currency || '¥'
    
    const formatted = new Intl.NumberFormat('zh-CN', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
    
    return `${symbol}${formatted}`
  } catch (error) {
    console.error('Error formatting amount:', error)
    return `${currency || '¥'}${amount || 0}`
  }
}

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) {
      return '未知日期'
    }
    
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '无效日期'
    }
    
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return '日期格式错误'
  }
}

/**
 * Handle edit button click
 */
const handleEdit = () => {
  emit('edit', props.subscription)
}

/**
 * Handle delete button click
 */
const handleDelete = () => {
  emit('delete', props.subscription.id)
}
</script>
