import { describe, it, expect, beforeEach } from 'vitest'
import { useExpenseForm } from './useExpenseForm'
import type { Expense } from '../types'

describe('useExpenseForm', () => {
  beforeEach(() => {
    // Reset form state before each test
    const { closeForm } = useExpenseForm()
    closeForm()
  })

  describe('Initial state', () => {
    it('should have form closed initially', () => {
      const { showForm } = useExpenseForm()
      
      expect(showForm.value).toBe(false)
    })

    it('should have no editing expense initially', () => {
      const { editingExpense } = useExpenseForm()
      
      expect(editingExpense.value).toBeNull()
    })
  })

  describe('openFormForNew', () => {
    it('should open form', () => {
      const { openFormForNew, showForm } = useExpenseForm()
      
      openFormForNew()
      
      expect(showForm.value).toBe(true)
    })

    it('should clear editing expense', () => {
      const { openFormForNew, editingExpense } = useExpenseForm()
      
      openFormForNew()
      
      expect(editingExpense.value).toBeNull()
    })

    it('should clear previous editing expense when opening for new', () => {
      const { openFormForEdit, openFormForNew, editingExpense } = useExpenseForm()
      
      const expense: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        date: '2025-10-13',
        note: 'Test'
      }
      
      openFormForEdit(expense)
      expect(editingExpense.value).not.toBeNull()
      
      openFormForNew()
      expect(editingExpense.value).toBeNull()
    })
  })

  describe('openFormForEdit', () => {
    it('should open form', () => {
      const { openFormForEdit, showForm } = useExpenseForm()
      
      const expense: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        date: '2025-10-13'
      }
      
      openFormForEdit(expense)
      
      expect(showForm.value).toBe(true)
    })

    it('should set editing expense', () => {
      const { openFormForEdit, editingExpense } = useExpenseForm()
      
      const expense: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        date: '2025-10-13',
        note: 'Test expense'
      }
      
      openFormForEdit(expense)
      
      expect(editingExpense.value).toEqual(expense)
    })

    it('should handle expense with all optional fields', () => {
      const { openFormForEdit, editingExpense } = useExpenseForm()
      
      const expense: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        categoryName: 'Food',
        categoryDisplayName: '食物',
        categoryColor: 'red',
        date: '2025-10-13',
        note: 'Lunch',
        userId: 'user-1',
        createdAt: '2025-10-13T10:00:00Z',
        updatedAt: '2025-10-13T10:00:00Z'
      }
      
      openFormForEdit(expense)
      
      expect(editingExpense.value).toEqual(expense)
    })

    it('should replace previous editing expense', () => {
      const { openFormForEdit, editingExpense } = useExpenseForm()
      
      const expense1: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        date: '2025-10-13'
      }
      
      const expense2: Expense = {
        id: '456',
        amount: 200,
        categoryId: 'cat-2',
        date: '2025-10-14'
      }
      
      openFormForEdit(expense1)
      expect(editingExpense.value?.id).toBe('123')
      
      openFormForEdit(expense2)
      expect(editingExpense.value?.id).toBe('456')
    })
  })

  describe('closeForm', () => {
    it('should close form', () => {
      const { openFormForNew, closeForm, showForm } = useExpenseForm()
      
      openFormForNew()
      expect(showForm.value).toBe(true)
      
      closeForm()
      
      expect(showForm.value).toBe(false)
    })

    it('should clear editing expense', () => {
      const { openFormForEdit, closeForm, editingExpense } = useExpenseForm()
      
      const expense: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        date: '2025-10-13'
      }
      
      openFormForEdit(expense)
      expect(editingExpense.value).not.toBeNull()
      
      closeForm()
      
      expect(editingExpense.value).toBeNull()
    })

    it('should handle closing already closed form', () => {
      const { closeForm, showForm } = useExpenseForm()
      
      expect(() => closeForm()).not.toThrow()
      expect(showForm.value).toBe(false)
    })
  })

  describe('Multiple instances', () => {
    it('should share state between multiple instances', () => {
      const instance1 = useExpenseForm()
      const instance2 = useExpenseForm()
      
      instance1.openFormForNew()
      
      expect(instance2.showForm.value).toBe(true)
    })

    it('should share editing expense between instances', () => {
      const instance1 = useExpenseForm()
      const instance2 = useExpenseForm()
      
      const expense: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        date: '2025-10-13'
      }
      
      instance1.openFormForEdit(expense)
      
      expect(instance2.editingExpense.value).toEqual(expense)
    })

    it('should allow different instances to modify shared state', () => {
      const instance1 = useExpenseForm()
      const instance2 = useExpenseForm()
      
      instance1.openFormForNew()
      instance2.closeForm()
      
      expect(instance1.showForm.value).toBe(false)
    })
  })

  describe('Workflow scenarios', () => {
    it('should support create -> close workflow', () => {
      const { openFormForNew, closeForm, showForm, editingExpense } = useExpenseForm()
      
      openFormForNew()
      expect(showForm.value).toBe(true)
      expect(editingExpense.value).toBeNull()
      
      closeForm()
      expect(showForm.value).toBe(false)
      expect(editingExpense.value).toBeNull()
    })

    it('should support edit -> close workflow', () => {
      const { openFormForEdit, closeForm, showForm, editingExpense } = useExpenseForm()
      
      const expense: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        date: '2025-10-13'
      }
      
      openFormForEdit(expense)
      expect(showForm.value).toBe(true)
      expect(editingExpense.value).toEqual(expense)
      
      closeForm()
      expect(showForm.value).toBe(false)
      expect(editingExpense.value).toBeNull()
    })

    it('should support edit -> create workflow', () => {
      const { openFormForEdit, openFormForNew, showForm, editingExpense } = useExpenseForm()
      
      const expense: Expense = {
        id: '123',
        amount: 100,
        categoryId: 'cat-1',
        date: '2025-10-13'
      }
      
      openFormForEdit(expense)
      expect(editingExpense.value).not.toBeNull()
      
      openFormForNew()
      expect(showForm.value).toBe(true)
      expect(editingExpense.value).toBeNull()
    })

    it('should support multiple edit operations', () => {
      const { openFormForEdit, editingExpense } = useExpenseForm()
      
      const expenses: Expense[] = [
        { id: '1', amount: 100, categoryId: 'cat-1', date: '2025-10-13' },
        { id: '2', amount: 200, categoryId: 'cat-2', date: '2025-10-14' },
        { id: '3', amount: 300, categoryId: 'cat-3', date: '2025-10-15' }
      ]
      
      expenses.forEach(expense => {
        openFormForEdit(expense)
        expect(editingExpense.value).toEqual(expense)
      })
    })
  })
})
