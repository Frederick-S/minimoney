<template>
  <v-card elevation="2">
    <v-card-title class="text-h6 font-weight-medium">
      货币设置
    </v-card-title>
    <v-card-text>
      <v-row>
        <!-- Current Main Currency Display -->
        <v-col cols="12">
          <div class="mb-4">
            <div class="text-body-2 text-medium-emphasis mb-2">
              当前主货币
            </div>
            <div class="text-h6 font-weight-bold">
              {{ getCurrentCurrencyDisplay() }}
            </div>
          </div>
        </v-col>

        <!-- Currency Selector -->
        <v-col cols="12">
          <v-select
            :model-value="modelValue"
            :items="currencyItems"
            item-title="display"
            item-value="code"
            label="选择主货币"
            variant="outlined"
            density="comfortable"
            @update:model-value="handleCurrencyChange"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item
                v-bind="itemProps"
                :title="item.raw.display"
                :subtitle="item.raw.name"
              >
                <template #prepend>
                  <span class="text-h6 mr-2">{{ item.raw.symbol }}</span>
                </template>
              </v-list-item>
            </template>
          </v-select>
        </v-col>

        <!-- Help Text -->
        <v-col cols="12">
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="text-body-2"
          >
            所有订阅金额将转换为所选货币显示
          </v-alert>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CurrencySettingsProps, CurrencySettingsEmits } from '../types'

const props = defineProps<CurrencySettingsProps>()
const emit = defineEmits<CurrencySettingsEmits>()

/**
 * Prepare currency items for the select dropdown
 */
const currencyItems = computed(() => {
  return props.currencies.map(currency => ({
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
    display: `${currency.symbol} ${currency.code} - ${currency.name}`
  }))
})

/**
 * Get current currency display string
 */
const getCurrentCurrencyDisplay = (): string => {
  const current = props.currencies.find(c => c.code === props.modelValue)
  if (!current) return props.modelValue
  
  return `${current.symbol} ${current.code} - ${current.name}`
}

/**
 * Handle currency change event
 */
const handleCurrencyChange = (newCurrency: string): void => {
  emit('update:modelValue', newCurrency)
}
</script>

<style scoped>
/* Additional styling if needed */
</style>
