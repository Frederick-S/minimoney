import { ref } from 'vue'

interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

// Global reactive state for toasts
const toasts = ref<ToastMessage[]>([])

export function useToast() {
  let toastId = 0

  const showToast = (message: string, type: ToastMessage['type'] = 'info', timeout = 5000) => {
    const id = `toast-${++toastId}`
    const toast: ToastMessage = {
      id,
      message,
      type,
      timeout
    }

    toasts.value.push(toast)

    // Auto-remove toast after timeout
    if (timeout > 0) {
      setTimeout(() => {
        removeToast(id)
      }, timeout)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const showSuccess = (message: string, timeout?: number) => {
    return showToast(message, 'success', timeout)
  }

  const showError = (message: string, timeout?: number) => {
    return showToast(message, 'error', timeout)
  }

  const showWarning = (message: string, timeout?: number) => {
    return showToast(message, 'warning', timeout)
  }

  const showInfo = (message: string, timeout?: number) => {
    return showToast(message, 'info', timeout)
  }

  const clearAll = () => {
    toasts.value = []
  }

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearAll
  }
}
