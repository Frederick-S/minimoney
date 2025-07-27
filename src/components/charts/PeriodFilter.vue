<template>
  <v-card class="mb-4" elevation="1">
    <v-card-text>
      <div class="d-flex align-center justify-space-between mb-4">
        <h2 class="text-h6 font-weight-medium">统计期间</h2>
      </div>
      
      <v-chip-group
        v-model="periodType"
        selected-class="text-primary"
        mandatory
        class="mb-4"
      >
        <v-chip value="month" variant="outlined">月度</v-chip>
        <v-chip value="year" variant="outlined">年度</v-chip>
      </v-chip-group>

      <v-select
        v-if="periodType === 'month'"
        v-model="selectedMonth"
        :items="availableMonths"
        item-title="label"
        item-value="value"
        label="选择月份"
        variant="outlined"
        dense
      />
      
      <v-select
        v-if="periodType === 'year'"
        v-model="selectedYear"
        :items="availableYears"
        item-title="label"
        item-value="value"
        label="选择年份"
        variant="outlined"
        dense
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type PeriodFilterProps, type PeriodFilterEmits } from '../../types'

const props = defineProps<PeriodFilterProps>()
const emit = defineEmits<PeriodFilterEmits>()

const periodType = computed({
  get: () => props.modelPeriodType,
  set: (value) => emit('update:modelPeriodType', value)
})

const selectedMonth = computed({
  get: () => props.modelMonth,
  set: (value) => emit('update:modelMonth', value)
})

const selectedYear = computed({
  get: () => props.modelYear,
  set: (value) => emit('update:modelYear', value)
})

// Generate months for the last 2 years for selection
const availableMonths = computed(() => {
  const months: Array<{ value: string; label: string }> = []
  const now = new Date()
  const currentYear = now.getFullYear()
  
  // Generate months for current and previous year
  for (let year = currentYear; year >= currentYear - 1; year--) {
    for (let month = 12; month >= 1; month--) {
      // Don't include future months
      if (year === currentYear && month > now.getMonth() + 1) continue
      
      const monthKey = `${year}-${String(month).padStart(2, '0')}`
      const date = new Date(year, month - 1)
      months.push({
        value: monthKey,
        label: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
      })
    }
  }
  
  return months
})

// Generate years for the last 5 years for selection
const availableYears = computed(() => {
  const years: Array<{ value: string; label: string }> = []
  const currentYear = new Date().getFullYear()
  
  for (let year = currentYear; year >= currentYear - 4; year--) {
    years.push({
      value: year.toString(),
      label: `${year}年`
    })
  }
  
  return years
})
</script>
