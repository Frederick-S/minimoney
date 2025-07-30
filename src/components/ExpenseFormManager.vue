<template>
  <ExpenseForm 
    v-model="showForm" 
    :expense="editingExpense"
    @save="handleSave"
    @update="handleUpdate"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ExpenseForm from './ExpenseForm.vue'
import { useExpenseManagement } from '../composables/useExpenseManagement'
import { type Expense } from '../types'

interface Props {
  modelValue: boolean
  expense?: Expense | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { saveExpense, updateExpense, deleteExpense } = useExpenseManagement()

const showForm = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const editingExpense = computed(() => props.expense)

// Handle saving new expense
const handleSave = async (expense: Omit<Expense, 'id'>) => {
  try {
    await saveExpense(expense)
    showForm.value = false
  } catch (error) {
    console.error('Failed to save expense:', error)
  }
}

// Handle updating existing expense
const handleUpdate = async (expense: Expense) => {
  try {
    await updateExpense(expense)
    showForm.value = false
  } catch (error) {
    console.error('Failed to update expense:', error)
  }
}

// Handle deleting existing expense
const handleDelete = async (expenseId: string) => {
  try {
    await deleteExpense(expenseId)
    showForm.value = false
  } catch (error) {
    console.error('Failed to delete expense:', error)
  }
}
</script>
