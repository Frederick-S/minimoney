import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Clear toasts before each test
    const { clearAll } = useToast()
    clearAll()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('showToast', () => {
    it('should add a toast message', () => {
      const { showToast, toasts } = useToast()
      
      showToast('Test message', 'info', 0)
      
      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0].message).toBe('Test message')
      expect(toasts.value[0].type).toBe('info')
    })

    it('should generate unique IDs for each toast', () => {
      const { showToast, toasts } = useToast()
      
      showToast('First', 'info', 0)
      showToast('Second', 'info', 0)
      
      expect(toasts.value).toHaveLength(2)
      expect(toasts.value[0].id).not.toBe(toasts.value[1].id)
    })

    it('should use default type "info" when not specified', () => {
      const { showToast, toasts } = useToast()
      
      showToast('Test message', undefined, 0)
      
      expect(toasts.value[0].type).toBe('info')
    })

    it('should use default timeout of 5000ms', () => {
      const { showToast, toasts, clearAll } = useToast()
      
      showToast('Test message', 'info')
      
      expect(toasts.value[0].timeout).toBe(5000)
      
      // Clean up to prevent auto-removal during other tests
      clearAll()
    })

    it('should use custom timeout when provided', () => {
      const { showToast, toasts } = useToast()
      
      showToast('Test message', 'info', 3000)
      
      expect(toasts.value[0].timeout).toBe(3000)
    })

    it('should auto-remove toast after timeout', () => {
      const { showToast, toasts } = useToast()
      
      showToast('Test message', 'info', 1000)
      expect(toasts.value).toHaveLength(1)
      
      vi.advanceTimersByTime(1000)
      
      expect(toasts.value).toHaveLength(0)
    })

    it('should not auto-remove toast when timeout is 0', () => {
      const { showToast, toasts, clearAll } = useToast()
      
      // Clear any pending timers from previous tests
      vi.clearAllTimers()
      clearAll()
      
      showToast('Test message', 'info', 0)
      expect(toasts.value).toHaveLength(1)
      
      vi.advanceTimersByTime(10000)
      
      expect(toasts.value).toHaveLength(1)
    })

    it('should return toast ID', () => {
      const { showToast } = useToast()
      
      const id = showToast('Test message', 'info', 0)
      
      expect(id).toMatch(/^toast-\d+$/)
    })
  })

  describe('removeToast', () => {
    it('should remove toast by ID', () => {
      const { showToast, removeToast, toasts } = useToast()
      
      const id = showToast('Test message', 'info', 0)
      expect(toasts.value).toHaveLength(1)
      
      removeToast(id)
      
      expect(toasts.value).toHaveLength(0)
    })

    it('should only remove the specified toast', () => {
      const { showToast, removeToast, toasts } = useToast()
      
      const id1 = showToast('First', 'info', 0)
      const id2 = showToast('Second', 'info', 0)
      const id3 = showToast('Third', 'info', 0)
      
      removeToast(id2)
      
      expect(toasts.value).toHaveLength(2)
      expect(toasts.value[0].id).toBe(id1)
      expect(toasts.value[1].id).toBe(id3)
    })

    it('should handle removing non-existent toast gracefully', () => {
      const { showToast, removeToast, toasts } = useToast()
      
      showToast('Test', 'info', 0)
      
      expect(() => removeToast('non-existent-id')).not.toThrow()
      expect(toasts.value).toHaveLength(1)
    })
  })

  describe('showSuccess', () => {
    it('should create success toast', () => {
      const { showSuccess, toasts, clearAll } = useToast()
      
      showSuccess('Success message')
      
      expect(toasts.value[0].type).toBe('success')
      expect(toasts.value[0].message).toBe('Success message')
      
      // Clean up to prevent auto-removal during other tests
      clearAll()
    })

    it('should use custom timeout', () => {
      const { showSuccess, toasts } = useToast()
      
      showSuccess('Success', 2000)
      
      expect(toasts.value[0].timeout).toBe(2000)
    })
  })

  describe('showError', () => {
    it('should create error toast', () => {
      const { showError, toasts, clearAll } = useToast()
      
      showError('Error message')
      
      expect(toasts.value[0].type).toBe('error')
      expect(toasts.value[0].message).toBe('Error message')
      
      // Clean up to prevent auto-removal during other tests
      clearAll()
    })

    it('should use custom timeout', () => {
      const { showError, toasts } = useToast()
      
      showError('Error', 3000)
      
      expect(toasts.value[0].timeout).toBe(3000)
    })
  })

  describe('showWarning', () => {
    it('should create warning toast', () => {
      const { showWarning, toasts, clearAll } = useToast()
      
      showWarning('Warning message')
      
      expect(toasts.value[0].type).toBe('warning')
      expect(toasts.value[0].message).toBe('Warning message')
      
      // Clean up to prevent auto-removal during other tests
      clearAll()
    })

    it('should use custom timeout', () => {
      const { showWarning, toasts } = useToast()
      
      showWarning('Warning', 4000)
      
      expect(toasts.value[0].timeout).toBe(4000)
    })
  })

  describe('showInfo', () => {
    it('should create info toast', () => {
      const { showInfo, toasts, clearAll } = useToast()
      
      showInfo('Info message')
      
      expect(toasts.value[0].type).toBe('info')
      expect(toasts.value[0].message).toBe('Info message')
      
      // Clean up to prevent auto-removal during other tests
      clearAll()
    })

    it('should use custom timeout', () => {
      const { showInfo, toasts } = useToast()
      
      showInfo('Info', 1500)
      
      expect(toasts.value[0].timeout).toBe(1500)
    })
  })

  describe('clearAll', () => {
    it('should remove all toasts', () => {
      const { showToast, clearAll, toasts } = useToast()
      
      showToast('First', 'info', 0)
      showToast('Second', 'error', 0)
      showToast('Third', 'success', 0)
      
      expect(toasts.value).toHaveLength(3)
      
      clearAll()
      
      expect(toasts.value).toHaveLength(0)
    })

    it('should handle clearing empty toast list', () => {
      const { clearAll, toasts } = useToast()
      
      expect(() => clearAll()).not.toThrow()
      expect(toasts.value).toHaveLength(0)
    })
  })

  describe('Multiple instances', () => {
    it('should share state between multiple useToast instances', () => {
      const instance1 = useToast()
      const instance2 = useToast()
      
      const id = instance1.showToast('Test', 'info', 0)
      
      expect(instance2.toasts.value).toHaveLength(1)
      expect(instance2.toasts.value[0].message).toBe('Test')
      
      // Clean up
      instance1.removeToast(id)
    })

    it('should allow different instances to modify shared state', () => {
      const instance1 = useToast()
      const instance2 = useToast()
      
      const id = instance1.showToast('Test', 'info', 0)
      instance2.removeToast(id)
      
      expect(instance1.toasts.value).toHaveLength(0)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle multiple toasts with different timeouts', () => {
      const { showToast, toasts } = useToast()
      
      showToast('First', 'info', 1000)
      showToast('Second', 'info', 2000)
      showToast('Third', 'info', 3000)
      
      expect(toasts.value).toHaveLength(3)
      
      vi.advanceTimersByTime(1000)
      expect(toasts.value).toHaveLength(2)
      
      vi.advanceTimersByTime(1000)
      expect(toasts.value).toHaveLength(1)
      
      vi.advanceTimersByTime(1000)
      expect(toasts.value).toHaveLength(0)
    })

    it('should handle adding toasts while others are timing out', () => {
      const { showToast, toasts } = useToast()
      
      showToast('First', 'info', 1000)
      
      vi.advanceTimersByTime(500)
      showToast('Second', 'info', 1000)
      
      vi.advanceTimersByTime(500)
      expect(toasts.value).toHaveLength(1)
      expect(toasts.value[0].message).toBe('Second')
      
      vi.advanceTimersByTime(500)
      expect(toasts.value).toHaveLength(0)
    })
  })
})
