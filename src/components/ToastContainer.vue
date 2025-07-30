<template>
  <div class="toast-container">
    <v-snackbar
      v-for="toast in toasts"
      :key="toast.id"
      :model-value="true"
      :color="getToastColor(toast.type)"
      :timeout="toast.timeout"
      location="top right"
      :multi-line="toast.message.length > 50"
      class="mb-2"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">
          {{ getToastIcon(toast.type) }}
        </v-icon>
        <span>{{ toast.message }}</span>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="removeToast(toast.id)"
        />
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()

const getToastColor = (type: string) => {
  switch (type) {
    case 'success': return 'success'
    case 'error': return 'error' 
    case 'warning': return 'warning'
    case 'info': return 'info'
    default: return 'primary'
  }
}

const getToastIcon = (type: string) => {
  switch (type) {
    case 'success': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    case 'warning': return 'mdi-alert'
    case 'info': return 'mdi-information'
    default: return 'mdi-information'
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 80px;
  right: 16px;
  z-index: 9999;
  pointer-events: none;
}

.toast-container :deep(.v-snackbar) {
  pointer-events: auto;
  position: relative !important;
  margin-bottom: 8px;
}
</style>
