<template>
  <v-dialog 
    v-model="showForm" 
    max-width="500" 
    persistent
    :fullscreen="$vuetify.display.mobile"
  >
    <v-card>
      <v-toolbar color="primary" dark style="position: relative; z-index: 10;">
        <v-toolbar-title>{{ props.subscription ? '编辑订阅' : '添加订阅' }}</v-toolbar-title>
        <v-spacer />
        <v-btn 
          icon 
          @click="closeForm"
          style="z-index: 11; position: relative;"
          data-testid="close-button"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-6">
        <v-form ref="formRef" @submit.prevent="handleSave">
          <v-text-field
            v-model="name"
            label="订阅名称"
            variant="outlined"
            :rules="nameRules"
            required
            class="mb-4"
            data-testid="name-field"
          />
          
          <v-text-field
            v-model="amount"
            label="金额"
            type="number"
            step="0.01"
            min="0.01"
            variant="outlined"
            :rules="amountRules"
            required
            class="mb-4"
            data-testid="amount-field"
          />
          
          <v-select
            v-model="currency"
            label="货币"
            :items="currencyItems"
            item-title="label"
            item-value="code"
            variant="outlined"
            :rules="currencyRules"
            required
            class="mb-4"
            data-testid="currency-field"
          />
          
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">账单周期</label>
            <v-radio-group
              v-model="billingFrequency"
              inline
              :rules="billingFrequencyRules"
              data-testid="billing-frequency-field"
            >
              <v-radio label="每月" value="monthly" />
              <v-radio label="每年" value="yearly" />
            </v-radio-group>
          </div>
          
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">续订类型</label>
            <v-radio-group
              v-model="renewalType"
              inline
              data-testid="renewal-type-field"
            >
              <v-radio label="自动续订" value="auto-renew" />
              <v-radio label="固定结束日期" value="fixed-end" />
            </v-radio-group>
          </div>
          
          <v-text-field
            v-if="renewalType === 'fixed-end'"
            v-model="endDate"
            label="结束日期"
            type="date"
            variant="outlined"
            :rules="endDateRules"
            required
            class="mb-4"
            data-testid="end-date-field"
          />
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn 
          variant="outlined" 
          @click="closeForm"
          class="mr-2"
          data-testid="cancel-button"
        >
          取消
        </v-btn>
        <v-btn 
          color="primary"
          variant="flat"
          @click="handleSave"
          :disabled="!isFormValid || saving"
          :loading="saving"
          data-testid="save-button"
        >
          {{ props.subscription ? '更新' : '保存' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useCurrency } from '../composables/useCurrency'
import type { Subscription, SubscriptionFormProps, SubscriptionFormEmits } from '../types'

const props = defineProps<SubscriptionFormProps>()
const emit = defineEmits<SubscriptionFormEmits>()

const { supportedCurrencies } = useCurrency()

const showForm = ref(props.modelValue)
const formRef = ref()
const saving = ref(false)

// Form fields
const name = ref('')
const amount = ref('')
const currency = ref(props.mainCurrency || 'CNY')
const billingFrequency = ref<'monthly' | 'yearly'>('monthly')
const renewalType = ref<'auto-renew' | 'fixed-end'>('auto-renew')
const endDate = ref('')

// Currency items for select dropdown
const currencyItems = computed(() => {
  return supportedCurrencies.value.map(c => ({
    code: c.code,
    label: `${c.symbol} ${c.code} - ${c.name}`
  }))
})

// Validation rules
const nameRules = [
  (v: string) => !!v || '请输入订阅名称',
  (v: string) => (v && v.trim().length > 0) || '订阅名称不能为空'
]

const amountRules = [
  (v: string) => !!v || '请输入金额',
  (v: string) => {
    const num = parseFloat(v)
    return (!isNaN(num) && num > 0) || '金额必须大于0'
  }
]

const currencyRules = [
  (v: string) => !!v || '请选择货币'
]

const billingFrequencyRules = [
  (v: string) => !!v || '请选择账单周期'
]

const endDateRules = computed(() => {
  if (renewalType.value === 'auto-renew') {
    return []
  }
  return [
    (v: string) => !!v || '请选择结束日期',
    (v: string) => {
      if (!v) return true
      const selectedDate = new Date(v)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate > today || '结束日期必须是未来的日期'
    }
  ]
})

// Check if form is valid
const isFormValid = computed(() => {
  const hasName = name.value.trim().length > 0
  const hasValidAmount = amount.value && parseFloat(amount.value) > 0
  const hasCurrency = !!currency.value
  const hasBillingFrequency = !!billingFrequency.value
  
  if (renewalType.value === 'fixed-end') {
    const hasEndDate = !!endDate.value
    const isEndDateFuture = endDate.value ? new Date(endDate.value) > new Date() : false
    return hasName && hasValidAmount && hasCurrency && hasBillingFrequency && hasEndDate && isEndDateFuture
  }
  
  return hasName && hasValidAmount && hasCurrency && hasBillingFrequency
})

// Initialize form data based on props
const initializeForm = () => {
  if (props.subscription) {
    name.value = props.subscription.name
    amount.value = props.subscription.amount.toString()
    currency.value = props.subscription.currency
    billingFrequency.value = props.subscription.billingFrequency
    renewalType.value = props.subscription.isAutoRenew ? 'auto-renew' : 'fixed-end'
    endDate.value = props.subscription.endDate || ''
  } else {
    // New subscription - reset to defaults
    name.value = ''
    amount.value = ''
    currency.value = props.mainCurrency || 'CNY'
    billingFrequency.value = 'monthly'
    renewalType.value = 'auto-renew'
    endDate.value = ''
  }
}

// Initialize on mount
initializeForm()

// Watch for form visibility changes
watch(() => props.modelValue, (newValue) => {
  showForm.value = newValue
  if (newValue) {
    initializeForm()
  }
})

// Watch for subscription changes (when editing different subscriptions)
watch(() => props.subscription, () => {
  initializeForm()
})

// Watch for main currency changes
watch(() => props.mainCurrency, (newValue) => {
  if (!props.subscription && newValue) {
    currency.value = newValue
  }
})

watch(showForm, (newValue) => {
  emit('update:modelValue', newValue)
})

const closeForm = () => {
  showForm.value = false
  resetForm()
}

const resetForm = () => {
  name.value = ''
  amount.value = ''
  currency.value = props.mainCurrency || 'CNY'
  billingFrequency.value = 'monthly'
  renewalType.value = 'auto-renew'
  endDate.value = ''
}

const calculateNextBillingDate = (): string => {
  const today = new Date()
  const nextBilling = new Date(today)
  
  if (billingFrequency.value === 'monthly') {
    nextBilling.setMonth(nextBilling.getMonth() + 1)
  } else {
    nextBilling.setFullYear(nextBilling.getFullYear() + 1)
  }
  
  return nextBilling.toISOString().split('T')[0]
}

const handleSave = async () => {
  // Validate form
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) {
      return
    }
  }
  
  if (!isFormValid.value) {
    return
  }
  
  try {
    const subscriptionData = {
      name: name.value.trim(),
      amount: parseFloat(amount.value),
      currency: currency.value,
      billingFrequency: billingFrequency.value,
      isAutoRenew: renewalType.value === 'auto-renew',
      endDate: renewalType.value === 'fixed-end' ? endDate.value : undefined,
      nextBillingDate: calculateNextBillingDate()
    }
    
    if (props.subscription) {
      // Emit update event with the subscription id
      emit('update', { ...subscriptionData, id: props.subscription.id, userId: props.subscription.userId, createdAt: props.subscription.createdAt, updatedAt: props.subscription.updatedAt })
    } else {
      // Emit save event for new subscription
      emit('save', subscriptionData)
    }
    
    // Note: Don't close form here - let parent handle it after successful save
    // This allows parent to show errors if save fails
  } catch (error) {
    console.error('Error preparing subscription data:', error)
    // Form validation should prevent this, but handle gracefully
  }
}
</script>
