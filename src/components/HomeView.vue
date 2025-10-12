<template>
  <div class="px-4">
    <!-- Loading State for Initial Load -->
    <div v-if="initialLoading" class="d-flex justify-center align-center py-8">
      <v-progress-circular indeterminate size="64" />
    </div>
    
    <template v-else>
      <TodaySummary :expenses="expenses" />
      <ExpenseList :expenses="expenses" :daily-totals="dailyTotals" @edit="openFormForEdit" @delete="handleDelete" />
      
      <!-- Load More Button -->
      <div v-if="hasMoreExpenses" class="text-center py-4">
        <v-btn
          icon
          variant="outlined"
          color="primary"
          :loading="loadingMore"
          @click="loadMoreExpenses"
          size="large"
        >
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
      </div>
      
      <!-- No More Data Message -->
      <div v-else-if="expenses.length > 0" class="text-center py-4">
        <span class="text-grey-darken-1">已加载全部</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSupabase } from '../composables/useSupabase'
import { useExpenseManagement } from '../composables/useExpenseManagement'
import { useCategories } from '../composables/useCategories'
import { useExpenseForm } from '../composables/useExpenseForm'
import { useToast } from '../composables/useToast'
import TodaySummary from './TodaySummary.vue'
import ExpenseList from './ExpenseList.vue'
import { type Expense, type HomeViewProps, type HomeViewEmits } from '../types'

const props = withDefaults(defineProps<HomeViewProps>(), {
  refreshTrigger: 0
})
// Remove emit since we now use the composable directly
// const emit = defineEmits<HomeViewEmits>()

const { user, supabase } = useSupabase()
const { refreshTrigger: globalRefreshTrigger, convertKeysToCamelCase, deleteExpense } = useExpenseManagement()
const { loadCategories, initializeUserCategories } = useCategories()
const { openFormForEdit } = useExpenseForm()
const { showError } = useToast()

const expenses = ref<Expense[]>([])
const dailyTotals = ref<Record<string, number>>({})
const currentPage = ref(0)
const pageSize = 5
const hasMoreExpenses = ref(true)
const loadingMore = ref(false)
const initialLoading = ref(true)

// Load expenses from Supabase with pagination
const loadExpenses = async (reset = false) => {
  if (!user.value) return

  if (reset) {
    expenses.value = []
    currentPage.value = 0
    hasMoreExpenses.value = true
  }

  if (!hasMoreExpenses.value && !reset) return

  const pageToLoad = reset ? 0 : currentPage.value
  
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.value.id)
    .order('date', { ascending: false })
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(pageToLoad * pageSize, (pageToLoad + 1) * pageSize - 1)

  if (error) {
    console.error('Error loading expenses:', error)
    showError('加载支出记录失败')
  } else {
    // Convert database format (snake_case) to TypeScript interface format (camelCase)
    const convertedExpenses = convertKeysToCamelCase<Expense[]>(data || [])
    
    if (reset) {
      expenses.value = convertedExpenses
      currentPage.value = 1 // Set to 1 since we loaded page 0
    } else {
      expenses.value = [...expenses.value, ...convertedExpenses]
      currentPage.value++ // Increment for next load
    }
    
    // Check if we have more data to load
    if (!data || data.length < pageSize) {
      hasMoreExpenses.value = false
    }
  }
  
  // Set initial loading to false after first load
  if (reset) {
    initialLoading.value = false
  }
  
  // Load daily totals after loading expenses
  await loadDailyTotals()
}

// Load daily totals for the dates in the current expense list
const loadDailyTotals = async () => {
  if (!user.value || expenses.value.length === 0) return

  // Get unique dates from loaded expenses
  const uniqueDates = [...new Set(expenses.value.map(e => e.date))]
  
  try {
    const { data, error } = await supabase.rpc('get_daily_totals', {
      p_user_id: user.value.id,
      p_dates: uniqueDates
    })

    if (error) {
      console.error('Error loading daily totals:', error)
    } else {
      // Convert array to map for easy lookup
      const totalsMap: Record<string, number> = {}
      data?.forEach((item: any) => {
        totalsMap[item.date] = item.total
      })
      dailyTotals.value = totalsMap
    }
  } catch (err) {
    console.error('Error loading daily totals:', err)
  }
}

// Load more expenses
const loadMoreExpenses = async () => {
  if (loadingMore.value || !hasMoreExpenses.value) return
  
  loadingMore.value = true
  await loadExpenses()
  await loadDailyTotals()  // Refresh daily totals after loading more
  loadingMore.value = false
}

// Note: Edit handling is now done directly through useExpenseForm composable

// Initialize data
onMounted(async () => {
  if (user.value) {
    // Load categories first, then expenses
    try {
      const categories = await loadCategories()
      // If no categories exist, initialize them for the user
      if (categories.length === 0) {
        await initializeUserCategories()
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
    
    await loadExpenses(true)
  } else {
    initialLoading.value = false
  }
})

// Watch for user authentication changes
watch(user, async (newUser, oldUser) => {
  if (newUser && !oldUser) {
    // User just logged in, load categories first then expenses
    initialLoading.value = true
    currentPage.value = 0
    hasMoreExpenses.value = true
    
    try {
      const categories = await loadCategories()
      // If no categories exist, initialize them for the user
      if (categories.length === 0) {
        await initializeUserCategories()
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
    
    await loadExpenses(true)
  } else if (!newUser && oldUser) {
    // User just logged out, clear expenses and reset pagination
    expenses.value = []
    currentPage.value = 0
    hasMoreExpenses.value = true
    initialLoading.value = false
  }
})

// Handle expense deletion
const handleDelete = async (expenseId: string) => {
  try {
    await deleteExpense(expenseId)
    // Remove the deleted expense from the local state
    expenses.value = expenses.value.filter(expense => expense.id !== expenseId)
  } catch (error) {
    console.error('Failed to delete expense:', error)
    showError('删除支出失败')
  }
}

// Watch for expense changes (when new expense is added or updated)
watch([() => props.refreshTrigger, globalRefreshTrigger], async () => {
  if (user.value) {
    await loadExpenses(true)
  }
})

// Expose expenses for parent component
defineExpose({
  expenses,
  loadExpenses
})
</script>
