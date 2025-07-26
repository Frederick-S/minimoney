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
import { type CategoryKey } from '../../composables/useCategories'
import { type Expense, type PeriodFilterProps, type PeriodFilterEmits } from '../../types'

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

const availableMonths = computed(() => {
  const months = new Set<string>()
  props.expenses.forEach(expense => {
    const date = new Date(expense.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    months.add(monthKey)
  })
  
  if (months.size === 0) {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    months.add(currentMonth)
  }
  
  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map(month => {
      const [year, monthNum] = month.split('-')
      const date = new Date(parseInt(year), parseInt(monthNum) - 1)
      return {
        value: month,
        label: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
      }
    })
})

const availableYears = computed(() => {
  const years = new Set<string>()
  props.expenses.forEach(expense => {
    const year = new Date(expense.date).getFullYear().toString()
    years.add(year)
  })
  
  if (years.size === 0) {
    years.add(new Date().getFullYear().toString())
  }
  
  return Array.from(years)
    .sort((a, b) => b.localeCompare(a))
    .map(year => ({
      value: year,
      label: `${year}年`
    }))
})
</script>
