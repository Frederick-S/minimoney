<template>
  <v-card>
    <v-card-title class="text-h6 pa-4">
      货币设置
    </v-card-title>

    <v-card-text class="pa-4">
      <!-- Currency Selector -->
      <v-select
        v-model="selectedCurrency"
        :items="currencyItems"
        item-title="display"
        item-value="code"
        label="选择主货币"
        variant="outlined"
        density="comfortable"
        class="mb-4"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item
            v-bind="itemProps"
            :title="item.raw.display"
          />
        </template>
      </v-select>

      <!-- Help Text -->
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="text-body-2"
      >
        所有订阅金额将转换为所选货币显示
      </v-alert>
    </v-card-text>

    <v-card-actions class="pa-4">
      <v-spacer />
      <v-btn
        variant="text"
        @click="handleCancel"
      >
        取消
      </v-btn>
      <v-btn
        color="primary"
        :loading="saving"
        @click="handleSave"
      >
        保存
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CurrencySettingsProps, CurrencySettingsEmits } from '../types'

const props = defineProps<CurrencySettingsProps>()
const emit = defineEmits<CurrencySettingsEmits>()

const selectedCurrency = ref(props.modelValue)
const saving = ref(false)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  selectedCurrency.value = newValue
})

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
 * Handle save button click
 */
const handleSave = (): void => {
  saving.value = true
  emit('update:modelValue', selectedCurrency.value)
  emit('save')
}

/**
 * Handle cancel button click
 */
const handleCancel = (): void => {
  selectedCurrency.value = props.modelValue
  emit('cancel')
}

// Expose saving state for parent
defineExpose({
  saving
})
</script>

<style scoped>
/* Additional styling if needed */
</style>
