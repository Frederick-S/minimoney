import { ref } from 'vue'
import { useSupabase } from './useSupabase'
import { type Expense, type CategoryBreakdownData, type MonthlyTrendData, type PeriodSummaryData } from '../types'

// Helper functions to convert between snake_case (database) and camelCase (TypeScript)
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

const convertKeysToCamelCase = <T extends Record<string, any>>(obj: any): T => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item)) as unknown as T
  }
  
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    result[camelKey] = convertKeysToCamelCase(value)
  }
  return result
}

const convertKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

// Global singleton state for expense management
const refreshTrigger = ref(0)

export function useExpenseManagement() {
  const { user, supabase } = useSupabase()

  // Save expense to Supabase
  const saveExpense = async (expense: Omit<Expense, 'id'>, skipRefresh = false) => {
    if (!user.value) return

    const now = new Date().toISOString()
    
    // Convert camelCase to snake_case for database
    const dbExpense = convertKeysToSnakeCase({
      ...expense,
      userId: user.value.id,
      createdAt: now,
      updatedAt: now
    })

    const { data, error } = await supabase
      .from('expenses')
      .insert([dbExpense])
      .select()
      .single()

    if (error) {
      console.error('Error saving expense:', error)
      throw new Error('保存支出失败，请重试')
    } else {
      // Trigger refresh in components (unless skipRefresh is true)
      if (!skipRefresh) {
        refreshTrigger.value++
      }
      return convertKeysToCamelCase<Expense>(data)
    }
  }

  // Batch save expenses without triggering refresh for each one
  const batchSaveExpenses = async (expenses: Array<Omit<Expense, 'id'>>) => {
    if (!user.value) return { success: 0, failed: 0 }

    let successCount = 0
    let failedCount = 0

    for (const expense of expenses) {
      try {
        await saveExpense(expense, true) // Skip refresh for each save
        successCount++
      } catch (error) {
        console.error('Batch save error:', error)
        failedCount++
      }
    }

    // Trigger refresh once at the end
    if (successCount > 0) {
      refreshTrigger.value++
    }

    return { success: successCount, failed: failedCount }
  }

  // Update existing expense in Supabase
  const updateExpense = async (expense: Expense) => {
    if (!user.value) return

    const now = new Date().toISOString()

    // Convert camelCase to snake_case for database
    const dbExpense = convertKeysToSnakeCase({
      amount: expense.amount,
      categoryId: expense.categoryId,
      note: expense.note,
      date: expense.date,
      updatedAt: now
    })

    const { data, error } = await supabase
      .from('expenses')
      .update(dbExpense)
      .eq('id', expense.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating expense:', error)
      throw new Error('更新支出失败，请重试')
    } else {
      // Trigger refresh in components
      refreshTrigger.value++
      return convertKeysToCamelCase<Expense>(data)
    }
  }

  // Load all expenses for charts view
  const loadAllExpenses = async (): Promise<Expense[]> => {
    if (!user.value) return []

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading all expenses:', error)
      throw new Error('加载支出数据失败')
    } else {
      return convertKeysToCamelCase<Expense[]>(data || [])
    }
  }

  // Get category breakdown using RPC
  const getCategoryBreakdown = async (startDate: string, endDate: string): Promise<CategoryBreakdownData[]> => {
    if (!user.value) return []

    const { data, error } = await supabase.rpc('get_category_breakdown', {
      p_user_id: user.value.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      console.error('Error getting category breakdown:', error)
      throw new Error('获取分类统计失败')
    } else {
      return convertKeysToCamelCase<CategoryBreakdownData[]>(data || [])
    }
  }

  // Get monthly trend data using RPC
  const getMonthlyTrend = async (year: number): Promise<MonthlyTrendData[]> => {
    if (!user.value) return []

    const { data, error } = await supabase.rpc('get_monthly_trend', {
      p_user_id: user.value.id,
      p_year: year
    })

    if (error) {
      console.error('Error getting monthly trend:', error)
      throw new Error('获取月度趋势失败')
    } else {
      return convertKeysToCamelCase<MonthlyTrendData[]>(data || [])
    }
  }

  // Get yearly trend data using RPC
  const getYearlyTrend = async (): Promise<MonthlyTrendData[]> => {
    if (!user.value) return []

    const { data, error } = await supabase.rpc('get_yearly_trend', {
      p_user_id: user.value.id
    })

    if (error) {
      console.error('Error getting yearly trend:', error)
      throw new Error('获取年度趋势失败')
    } else {
      // Map yearly data to match MonthlyTrendData interface
      const yearlyData = data || []
      return yearlyData.map((item: any) => ({
        month: item.year,
        monthLabel: item.year_label, // Map year_label to monthLabel for chart compatibility
        amount: item.amount
      }))
    }
  }

  // Get period summary using RPC
  const getPeriodSummary = async (startDate: string, endDate: string): Promise<PeriodSummaryData> => {
    if (!user.value) return { totalAmount: 0, expenseCount: 0 }

    const { data, error } = await supabase.rpc('get_period_summary', {
      p_user_id: user.value.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      console.error('Error getting period summary:', error)
      throw new Error('获取统计摘要失败')
    } else {
      const result = data?.[0] || { total_amount: 0, expense_count: 0 }
      return convertKeysToCamelCase<PeriodSummaryData>(result)
    }
  }

  // Get period expenses using RPC (still needed for some components)
  const getPeriodExpenses = async (startDate: string, endDate: string): Promise<Expense[]> => {
    if (!user.value) return []

    const { data, error } = await supabase.rpc('get_period_expenses', {
      p_user_id: user.value.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      console.error('Error getting period expenses:', error)
      throw new Error('获取期间支出失败')
    } else {
      return convertKeysToCamelCase<Expense[]>(data || [])
    }
  }

  // Delete expense from Supabase
  const deleteExpense = async (expenseId: string) => {
    if (!user.value) return

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', user.value.id) // Ensure user can only delete their own expenses

    if (error) {
      console.error('Error deleting expense:', error)
      throw new Error('删除支出失败，请重试')
    } else {
      // Trigger refresh in components
      refreshTrigger.value++
    }
  }

  return {
    refreshTrigger,
    saveExpense,
    batchSaveExpenses,
    updateExpense,
    deleteExpense,
    loadAllExpenses,
    getCategoryBreakdown,
    getMonthlyTrend,
    getYearlyTrend,
    getPeriodSummary,
    getPeriodExpenses,
    // Export conversion utilities
    convertKeysToCamelCase,
    convertKeysToSnakeCase
  }
}
