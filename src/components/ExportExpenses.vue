<template>
  <v-dialog v-model="dialogModel" max-width="500px" persistent>
    <v-card>
      <v-card-title class="text-h5 pa-4">
        导出账单
      </v-card-title>

      <v-card-text class="pb-0">
        <v-radio-group v-model="exportType" class="mb-4">
          <v-radio label="导出全部账单" value="all" />
          <v-radio label="按时间范围导出" value="range" />
        </v-radio-group>

        <div v-if="exportType === 'range'">
          <v-text-field
            v-model="startDate"
            label="开始日期"
            type="date"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-text-field
            v-model="endDate"
            label="结束日期"
            type="date"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
        </div>

        <v-alert v-if="errorMessage" type="error" class="mb-3">
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="handleClose"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          @click="handleExport"
        >
          导出 CSV
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useToast } from '@/composables/useToast'
import { getTodayDate } from '@/utils/dateUtils'
import type { Expense } from '@/types'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { supabase, user } = useSupabase()
const { showSuccess, showError } = useToast()

const exportType = ref<'all' | 'range'>('all')
const startDate = ref('')
const endDate = ref(getTodayDate())
const loading = ref(false)
const errorMessage = ref('')

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Reset form when dialog opens
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    exportType.value = 'all'
    startDate.value = ''
    endDate.value = getTodayDate()
    errorMessage.value = ''
  }
})

const handleClose = () => {
  dialogModel.value = false
}

const fetchExpenses = async (): Promise<Expense[]> => {
  if (!user.value) {
    throw new Error('用户未登录')
  }

  // Validate date range if needed
  if (exportType.value === 'range') {
    if (!startDate.value || !endDate.value) {
      throw new Error('请选择开始和结束日期')
    }

    if (startDate.value > endDate.value) {
      throw new Error('开始日期不能晚于结束日期')
    }
  }

  // First, get the total count
  let countQuery = supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.value.id)

  // Apply date range filter for count
  if (exportType.value === 'range') {
    countQuery = countQuery.gte('date', startDate.value).lte('date', endDate.value)
  }

  const { count, error: countError } = await countQuery

  if (countError) {
    console.error('Count error:', countError)
    throw new Error('获取账单数量失败：' + countError.message)
  }

  const totalCount = count || 0
  console.log('Total expenses to export:', totalCount)

  if (totalCount === 0) {
    return []
  }

  // Fetch all records using pagination
  const pageSize = 1000
  const totalPages = Math.ceil(totalCount / pageSize)
  const allExpenses: Expense[] = []

  for (let page = 0; page < totalPages; page++) {
    const from = page * pageSize
    const to = from + pageSize - 1

    console.log(`Fetching page ${page + 1}/${totalPages} (records ${from}-${to})`)

    // Build query with category join
    let query = supabase
      .from('expenses')
      .select(`
        id,
        amount,
        date,
        note,
        created_at,
        updated_at,
        category_id,
        categories (
          id,
          name,
          display_name,
          color
        )
      `)
      .eq('user_id', user.value.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    // Apply date range filter if needed
    if (exportType.value === 'range') {
      query = query.gte('date', startDate.value).lte('date', endDate.value)
    }

    const { data, error } = await query

    if (error) {
      console.error('Fetch expenses error:', error)
      throw new Error(`获取第 ${page + 1} 页数据失败：` + error.message)
    }

    // Transform and add to results
    const expenses = (data || []).map((item: any) => ({
      id: item.id,
      amount: item.amount,
      categoryId: item.category_id,
      categoryName: item.categories?.name || '',
      categoryDisplayName: item.categories?.display_name || '',
      categoryColor: item.categories?.color || '',
      date: item.date,
      note: item.note || '',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))

    allExpenses.push(...expenses)
  }

  console.log('Total expenses fetched:', allExpenses.length)
  return allExpenses
}

const convertToCSV = (expenses: Expense[]): string => {
  // CSV headers
  const headers = ['日期', '分类', '金额', '备注', '创建时间']
  
  // CSV rows
  const rows = expenses.map(expense => [
    expense.date,
    expense.categoryDisplayName || expense.categoryName || '',
    expense.amount.toString(),
    expense.note || '',
    expense.createdAt || ''
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

const downloadCSV = (csvContent: string, filename: string) => {
  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

const handleExport = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    // Validate date range if needed
    if (exportType.value === 'range') {
      if (!startDate.value || !endDate.value) {
        errorMessage.value = '请选择开始和结束日期'
        loading.value = false
        return
      }

      if (startDate.value > endDate.value) {
        errorMessage.value = '开始日期不能晚于结束日期'
        loading.value = false
        return
      }
    }

    // Fetch expenses
    const expenses = await fetchExpenses()

    if (expenses.length === 0) {
      showError('没有找到符合条件的账单')
      loading.value = false
      return
    }

    // Convert to CSV
    const csvContent = convertToCSV(expenses)

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    let filename = `账单导出_${timestamp}.csv`
    
    if (exportType.value === 'range') {
      filename = `账单导出_${startDate.value}_至_${endDate.value}.csv`
    }

    // Download
    downloadCSV(csvContent, filename)

    showSuccess(`成功导出 ${expenses.length} 条账单`)
    handleClose()
  } catch (error: any) {
    console.error('Export error:', error)
    errorMessage.value = error.message || '导出失败，请重试'
    showError(error.message || '导出失败')
  } finally {
    loading.value = false
  }
}
</script>
