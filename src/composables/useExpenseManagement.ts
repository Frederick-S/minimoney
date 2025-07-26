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

  return {
    refreshTrigger,
    saveExpense,
    updateExpense,
    loadAllExpenses
  }
}
