import { ref } from 'vue'
import type { Expense } from '../types'

// Global state for expense form management
const showForm = ref(false)
const editingExpense = ref<Expense | null>(null)

export function useExpenseForm() {
  const openFormForNew = () => {
    editingExpense.value = null
    showForm.value = true
  }

  const openFormForEdit = (expense: Expense) => {

    editingExpense.value = expense
    showForm.value = true
  }

  const closeForm = () => {
    showForm.value = false
    editingExpense.value = null
  }

  return {
    showForm,
    editingExpense,
    openFormForNew,
    openFormForEdit,
    closeForm
  }
}