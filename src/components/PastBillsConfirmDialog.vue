<template>
  <v-dialog 
    v-model="showDialog" 
    max-width="600" 
    persistent
    :fullscreen="$vuetify.display.mobile"
  >
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>确认创建历史账单</v-toolbar-title>
        <v-spacer />
        <v-btn 
          icon 
          @click="handleCancel"
          :disabled="props.loading"
          data-testid="close-button"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-6">
        <template v-if="props.preview">
          <!-- Summary Information -->
          <v-alert
            type="info"
            variant="tonal"
            class="mb-4"
            data-testid="summary-alert"
          >
            <div class="text-body-1 mb-2">
              将为此订阅创建 <strong>{{ props.preview.count }}</strong> 条历史支出记录
            </div>
            <div class="text-body-2 text-medium-emphasis">
              日期范围: {{ formatDate(props.preview.startDate) }} 至 {{ formatDate(props.preview.endDate) }}
            </div>
          </v-alert>

          <!-- Total Amount Display -->
          <v-card
            variant="outlined"
            class="mb-4"
            data-testid="total-amount-card"
          >
            <v-card-text class="text-center py-4">
              <div class="text-h4 font-weight-bold" data-testid="total-amount">
                {{ formatAmount(props.preview.totalAmount) }} {{ getCurrency() }}
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                总计金额
              </div>
            </v-card-text>
          </v-card>

          <!-- Expense Preview List -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">支出记录预览:</div>
            <v-card
              variant="outlined"
              class="expense-preview-container"
              data-testid="expense-preview-list"
            >
              <v-list density="compact" class="py-0">
                <v-list-item
                  v-for="(event, index) in displayEvents"
                  :key="index"
                  class="px-4"
                  :data-testid="`expense-preview-item-${index}`"
                >
                  <template v-slot:prepend>
                    <v-icon size="small" color="primary">mdi-calendar</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">
                    {{ formatDate(event.date) }}
                  </v-list-item-title>
                  <template v-slot:append>
                    <span class="text-body-2 font-weight-medium">
                      {{ formatAmount(event.amount) }} {{ event.currency }}
                    </span>
                  </template>
                </v-list-item>
              </v-list>
              
              <!-- Show more indicator if there are many events -->
              <div 
                v-if="props.preview.count > maxDisplayEvents"
                class="text-center py-2 text-caption text-medium-emphasis"
                data-testid="more-events-indicator"
              >
                还有 {{ props.preview.count - maxDisplayEvents }} 条记录...
              </div>
            </v-card>
          </div>

          <!-- Warning Message -->
          <v-alert
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-0"
            data-testid="warning-alert"
          >
            <div class="text-body-2">
              这些支出记录将被添加到您的支出历史中。您可以随时编辑或删除这些记录。
            </div>
          </v-alert>
        </template>

        <!-- Loading State -->
        <template v-else>
          <div class="text-center py-8">
            <v-progress-circular
              indeterminate
              color="primary"
              size="48"
            />
            <div class="text-body-2 text-medium-emphasis mt-4">
              正在计算历史账单...
            </div>
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn 
          variant="outlined" 
          @click="handleCancel"
          :disabled="props.loading"
          data-testid="cancel-button"
        >
          取消
        </v-btn>
        <v-btn 
          color="primary"
          variant="flat"
          @click="handleConfirm"
          :disabled="!props.preview || props.loading"
          :loading="props.loading"
          data-testid="confirm-button"
        >
          确认创建
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { PastBillsPreview } from '../composables/useSubscriptionExpenses'

interface PastBillsConfirmDialogProps {
  modelValue: boolean
  preview: PastBillsPreview | null
  loading: boolean
}

interface PastBillsConfirmDialogEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = defineProps<PastBillsConfirmDialogProps>()
const emit = defineEmits<PastBillsConfirmDialogEmits>()

const showDialog = ref(props.modelValue)
const maxDisplayEvents = 10  // Maximum number of events to display in preview

// Watch for modelValue changes
watch(() => props.modelValue, (newValue) => {
  showDialog.value = newValue
})

// Sync showDialog with modelValue
watch(showDialog, (newValue) => {
  emit('update:modelValue', newValue)
})

// Get events to display (limit to maxDisplayEvents)
const displayEvents = computed(() => {
  if (!props.preview) return []
  return props.preview.events.slice(0, maxDisplayEvents)
})

// Get currency from first event
const getCurrency = (): string => {
  if (!props.preview || props.preview.events.length === 0) {
    return 'CNY'
  }
  return props.preview.events[0].currency
}

// Format date for display (YYYY-MM-DD to localized format)
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr + 'T00:00:00')  // Add time to avoid timezone issues
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (e) {
    return dateStr
  }
}

// Format amount with 2 decimal places
const formatAmount = (amount: number): string => {
  return amount.toFixed(2)
}

// Handle confirm action
const handleConfirm = () => {
  if (!props.preview || props.loading) return
  emit('confirm')
}

// Handle cancel action
const handleCancel = () => {
  if (props.loading) return
  emit('cancel')
  showDialog.value = false
}
</script>

<style scoped>
.expense-preview-container {
  max-height: 300px;
  overflow-y: auto;
}

/* Smooth scrolling */
.expense-preview-container {
  scroll-behavior: smooth;
}

/* Custom scrollbar styling for webkit browsers */
.expense-preview-container::-webkit-scrollbar {
  width: 8px;
}

.expense-preview-container::-webkit-scrollbar-track {
  background: transparent;
}

.expense-preview-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.expense-preview-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
