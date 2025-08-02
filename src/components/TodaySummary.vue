<template>
  <v-card class="mb-6" elevation="2">
    <v-card-text>
      <v-card-title class="pa-0 text-h6 mb-2">今日支出</v-card-title>
      <div class="text-h4 font-weight-bold text-primary">
        <v-progress-circular 
          v-if="loading" 
          indeterminate 
          size="24" 
          width="3"
        />
        <span v-else>{{ formatAmount(todayTotal) }}</span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSupabase } from '../composables/useSupabase'
import { useExpenseManagement } from '../composables/useExpenseManagement'
import { useToast } from '../composables/useToast'
import { type ExpenseListProps } from '../types'

const props = defineProps<ExpenseListProps>()

const { user, supabase } = useSupabase()
const { refreshTrigger } = useExpenseManagement()
const { showError } = useToast()

const todayTotal = ref(0)
const loading = ref(true)

// Load today's expenses using SQL SUM aggregation
const loadTodayTotal = async () => {
  if (!user.value || !user.value.id) {
    todayTotal.value = 0
    loading.value = false
    return
  }

  loading.value = true
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  try {
    // Use RPC function for SQL SUM aggregation
    const { data, error } = await supabase
      .rpc('get_today_expenses_sum', {
        p_user_id: user.value.id,
        p_date: todayStr
      })

    if (error) {
      console.error('RPC call failed:', error)
      showError('加载今日支出失败')
      todayTotal.value = 0
    } else {
      // RPC returns the sum directly
      todayTotal.value = data || 0
    }
  } catch (err) {
    console.error('Error calculating today\'s total:', err)
    showError('计算今日支出失败')
    todayTotal.value = 0
  } finally {
    loading.value = false
  }
}

// Initialize on mount
onMounted(() => {
  loadTodayTotal()
})

// Watch for user changes
watch(user, () => {
  loadTodayTotal()
})

// Watch for expense changes (refresh trigger)
watch(refreshTrigger, () => {
  loadTodayTotal()
})

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}
</script>