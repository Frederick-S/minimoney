<template>
  <v-card>
    <v-card-title class="text-h6 pa-4">
      时区设置
    </v-card-title>

    <v-card-text class="pa-4">
      <!-- Current Timezone Display -->
      <v-alert
        v-if="currentTimezone"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4 text-body-2"
      >
        <div class="d-flex flex-column">
          <div><strong>当前时区:</strong> {{ currentTimezone }}</div>
          <div class="text-caption mt-1">
            UTC偏移: {{ getUtcOffset(currentTimezone) }}
          </div>
        </div>
      </v-alert>

      <!-- Timezone Selector -->
      <v-select
        v-model="selectedTimezone"
        :items="timezoneItems"
        item-title="display"
        item-value="value"
        label="选择时区"
        variant="outlined"
        density="comfortable"
        class="mb-4"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item
            v-bind="itemProps"
            :title="item.raw.display"
            :subtitle="item.raw.offset"
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
        时区设置将影响订阅账单的生成时间和日期显示
      </v-alert>
    </v-card-text>

    <v-card-actions class="pa-4">
      <v-spacer />
      <v-btn
        variant="outlined"
        @click="handleCancel"
      >
        取消
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
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
import { formatInTimeZone } from 'date-fns-tz'

interface TimezoneSettingsProps {
  modelValue: string
  currentTimezone?: string
}

interface TimezoneSettingsEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
  (e: 'cancel'): void
}

const props = defineProps<TimezoneSettingsProps>()
const emit = defineEmits<TimezoneSettingsEmits>()

const selectedTimezone = ref(props.modelValue)
const saving = ref(false)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  selectedTimezone.value = newValue
})

/**
 * Common timezones grouped by region
 */
const commonTimezones = [
  // Asia
  { value: 'Asia/Shanghai', name: '中国标准时间 (北京)', region: 'Asia' },
  { value: 'Asia/Hong_Kong', name: '香港时间', region: 'Asia' },
  { value: 'Asia/Taipei', name: '台北时间', region: 'Asia' },
  { value: 'Asia/Tokyo', name: '日本标准时间 (东京)', region: 'Asia' },
  { value: 'Asia/Seoul', name: '韩国标准时间 (首尔)', region: 'Asia' },
  { value: 'Asia/Singapore', name: '新加坡时间', region: 'Asia' },
  { value: 'Asia/Bangkok', name: '曼谷时间', region: 'Asia' },
  { value: 'Asia/Dubai', name: '迪拜时间', region: 'Asia' },
  { value: 'Asia/Kolkata', name: '印度标准时间 (加尔各答)', region: 'Asia' },
  
  // Europe
  { value: 'Europe/London', name: '英国时间 (伦敦)', region: 'Europe' },
  { value: 'Europe/Paris', name: '中欧时间 (巴黎)', region: 'Europe' },
  { value: 'Europe/Berlin', name: '中欧时间 (柏林)', region: 'Europe' },
  { value: 'Europe/Rome', name: '中欧时间 (罗马)', region: 'Europe' },
  { value: 'Europe/Moscow', name: '莫斯科时间', region: 'Europe' },
  
  // Americas
  { value: 'America/New_York', name: '美国东部时间 (纽约)', region: 'Americas' },
  { value: 'America/Chicago', name: '美国中部时间 (芝加哥)', region: 'Americas' },
  { value: 'America/Denver', name: '美国山地时间 (丹佛)', region: 'Americas' },
  { value: 'America/Los_Angeles', name: '美国太平洋时间 (洛杉矶)', region: 'Americas' },
  { value: 'America/Toronto', name: '加拿大东部时间 (多伦多)', region: 'Americas' },
  { value: 'America/Vancouver', name: '加拿大太平洋时间 (温哥华)', region: 'Americas' },
  { value: 'America/Mexico_City', name: '墨西哥城时间', region: 'Americas' },
  { value: 'America/Sao_Paulo', name: '巴西时间 (圣保罗)', region: 'Americas' },
  
  // Pacific
  { value: 'Australia/Sydney', name: '澳大利亚东部时间 (悉尼)', region: 'Pacific' },
  { value: 'Australia/Melbourne', name: '澳大利亚东部时间 (墨尔本)', region: 'Pacific' },
  { value: 'Australia/Perth', name: '澳大利亚西部时间 (珀斯)', region: 'Pacific' },
  { value: 'Pacific/Auckland', name: '新西兰时间 (奥克兰)', region: 'Pacific' },
  
  // UTC
  { value: 'UTC', name: '协调世界时 (UTC)', region: 'UTC' },
]

/**
 * Get UTC offset for a timezone
 */
const getUtcOffset = (timezone: string): string => {
  try {
    const now = new Date()
    const formatted = formatInTimeZone(now, timezone, 'XXX')
    return formatted
  } catch (e) {
    console.error('Error getting UTC offset:', e)
    return 'N/A'
  }
}

/**
 * Prepare timezone items for the select dropdown with UTC offsets
 */
const timezoneItems = computed(() => {
  return commonTimezones.map(tz => {
    const offset = getUtcOffset(tz.value)
    return {
      value: tz.value,
      name: tz.name,
      region: tz.region,
      offset: `UTC${offset}`,
      display: `${tz.name} (UTC${offset})`
    }
  })
})

/**
 * Handle save button click
 */
const handleSave = (): void => {
  saving.value = true
  emit('update:modelValue', selectedTimezone.value)
  emit('save')
}

/**
 * Handle cancel button click
 */
const handleCancel = (): void => {
  selectedTimezone.value = props.modelValue
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
