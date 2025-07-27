import { ref } from 'vue'
import { useSupabase } from './useSupabase'
import { type Expense } from '../types'

// Global singleton state for expense management
const refreshTrigger = ref(0)

export function useExpenseManagement() {
  const { user, supabase } = useSupabase()

  // Save expense to Supabase
  const saveExpense = async (expense: Omit<Expense, 'id'>) => {
    if (!user.value) return

    const newExpense = {
      ...expense,
      user_id: user.value.id
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([newExpense])
      .select()
      .single()

    if (error) {
      console.error('Error saving expense:', error)
      throw error
    } else {
      // Trigger refresh in components
      refreshTrigger.value++
      console.log('Expense saved, refreshTrigger:', refreshTrigger.value)
      return data
    }
  }

  // Update existing expense in Supabase
  const updateExpense = async (expense: Expense) => {
    if (!user.value) return

    const { data, error } = await supabase
      .from('expenses')
      .update({
        amount: expense.amount,
        category: expense.category,
        note: expense.note,
        date: expense.date
      })
      .eq('id', expense.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating expense:', error)
      throw error
    } else {
      // Trigger refresh in components
      refreshTrigger.value++
      console.log('Expense updated, refreshTrigger:', refreshTrigger.value)
      return data
    }
  }

  // Load all expenses for charts view
  const loadAllExpenses = async () => {
    if (!user.value) return []

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading all expenses:', error)
      return []
    } else {
      return data || []
    }
  }

  // Get category breakdown using RPC
  const getCategoryBreakdown = async (startDate: string, endDate: string) => {
    if (!user.value) return []

    const { data, error } = await supabase.rpc('get_category_breakdown', {
      p_user_id: user.value.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      console.error('Error getting category breakdown:', error)
      return []
    } else {
      return data || []
    }
  }

  // Get monthly trend data using RPC
  const getMonthlyTrend = async (year: number) => {
    if (!user.value) return []

    const { data, error } = await supabase.rpc('get_monthly_trend', {
      p_user_id: user.value.id,
      p_year: year
    })

    if (error) {
      console.error('Error getting monthly trend:', error)
      return []
    } else {
      return data || []
    }
  }

  // Get period summary using RPC
  const getPeriodSummary = async (startDate: string, endDate: string) => {
    if (!user.value) return { total_amount: 0, expense_count: 0 }

    const { data, error } = await supabase.rpc('get_period_summary', {
      p_user_id: user.value.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      console.error('Error getting period summary:', error)
      return { total_amount: 0, expense_count: 0 }
    } else {
      return data?.[0] || { total_amount: 0, expense_count: 0 }
    }
  }

  // Get period expenses using RPC (still needed for some components)
  const getPeriodExpenses = async (startDate: string, endDate: string) => {
    if (!user.value) return []

    const { data, error } = await supabase.rpc('get_period_expenses', {
      p_user_id: user.value.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      console.error('Error getting period expenses:', error)
      return []
    } else {
      return data || []
    }
  }

  return {
    refreshTrigger,
    saveExpense,
    updateExpense,
    loadAllExpenses,
    getCategoryBreakdown,
    getMonthlyTrend,
    getPeriodSummary,
    getPeriodExpenses
  }
}
