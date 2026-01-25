<template>
  <v-dialog 
    v-model="showDialog" 
    max-width="600" 
    persistent
    :fullscreen="$vuetify.display.mobile"
  >
    <v-card>
      <v-toolbar color="error" dark>
        <v-toolbar-title>确认删除订阅</v-toolbar-title>
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
        <!-- Subscription Name -->
        <div class="text-h6 mb-4" data-testid="subscription-name">
          订阅: {{ props.subscriptionName }}
        </div>

        <!-- Loading State -->
        <template v-if="props.loadingExpenses">
          <div class="text-center py-8">
            <v-progress-circular
              indeterminate
              color="primary"
              size="48"
            />
            <div class="text-body-2 text-medium-emphasis mt-4">
              正在加载关联的支出记录...
            </div>
          </div>
        </template>

        <!-- Main Content -->
        <template v-else>
          <!-- Expense Count Info -->
          <v-alert
            :type="props.expenseCount > 0 ? 'warning' : 'info'"
            variant="tonal"
            class="mb-4"
            data-testid="expense-count-alert"
          >
            <div class="text-body-1 mb-2">
              <template v-if="props.expenseCount > 0">
                此订阅关联了 <strong>{{ props.expenseCount }}</strong> 条支出记录
              </template>
              <template v-else>
                此订阅没有关联的支出记录
              </template>
            </div>
          </v-alert>

          <!-- Delete Options (only show if there are expenses) -->
          <template v-if="props.expenseCount > 0">
            <div class="text-subtitle-2 mb-3">请选择如何处理关联的支出记录:</div>
            
            <v-radio-group 
              v-model="deleteExpensesOption" 
              class="mb-4"
              data-testid="delete-options"
            >
              <!-- Option 1: Keep expenses -->
              <v-card
                variant="outlined"
                class="mb-3 pa-4"
                :class="{ 'border-primary': deleteExpensesOption === 'keep' }"
                @click="deleteExpensesOption = 'keep'"
                style="cursor: pointer;"
                data-testid="keep-expenses-option"
              >
                <v-radio value="keep" color="primary">
                  <template v-slot:label>
                    <div>
                      <div class="text-body-1 font-weight-medium mb-1">
                        保留支出记录
                      </div>
                      <div class="text-body-2 text-medium-emphasis">
                        订阅将被删除，但关联的 {{ props.expenseCount }} 条支出记录将保留在您的支出历史中。这些记录将不再与订阅关联。
                      </div>
                    </div>
                  </template>
                </v-radio>
              </v-card>

              <!-- Option 2: Delete expenses -->
              <v-card
                variant="outlined"
                class="pa-4"
                :class="{ 'border-error': deleteExpensesOption === 'delete' }"
                @click="deleteExpensesOption = 'delete'"
                style="cursor: pointer;"
                data-testid="delete-expenses-option"
              >
                <v-radio value="delete" color="error">
                  <template v-slot:label>
                    <div>
                      <div class="text-body-1 font-weight-medium mb-1">
                        同时删除支出记录
                      </div>
                      <div class="text-body-2 text-medium-emphasis">
                        订阅和所有关联的 {{ props.expenseCount }} 条支出记录都将被永久删除。此操作无法撤销。
                      </div>
                    </div>
                  </template>
                </v-radio>
              </v-card>
            </v-radio-group>

            <!-- Warning for delete option -->
            <v-alert
              v-if="deleteExpensesOption === 'delete'"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-0"
              data-testid="delete-warning"
            >
              <div class="text-body-2">
                <v-icon size="small" class="mr-1">mdi-alert</v-icon>
                警告: 删除支出记录将影响您的支出统计和历史数据。此操作无法撤销。
              </div>
            </v-alert>
          </template>

          <!-- No expenses message -->
          <template v-else>
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              class="mb-0"
              data-testid="no-expenses-info"
            >
              <div class="text-body-2">
                删除此订阅不会影响任何支出记录。
              </div>
            </v-alert>
          </template>
        </template>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn 
          variant="outlined" 
          @click="handleCancel"
          :disabled="props.loading || props.loadingExpenses"
          data-testid="cancel-button"
        >
          取消
        </v-btn>
        <v-btn 
          color="error"
          variant="flat"
          @click="handleConfirm"
          :disabled="props.loadingExpenses"
          :loading="props.loading"
          data-testid="confirm-button"
        >
          确认删除
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface SubscriptionDeleteDialogProps {
  modelValue: boolean
  subscriptionName: string
  expenseCount: number
  loading: boolean
  loadingExpenses: boolean
}

interface SubscriptionDeleteDialogEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', deleteExpenses: boolean): void
  (e: 'cancel'): void
}

const props = defineProps<SubscriptionDeleteDialogProps>()
const emit = defineEmits<SubscriptionDeleteDialogEmits>()

const showDialog = ref(props.modelValue)
const deleteExpensesOption = ref<'keep' | 'delete'>('keep')

// Watch for modelValue changes
watch(() => props.modelValue, (newValue) => {
  showDialog.value = newValue
  // Reset option when dialog opens
  if (newValue) {
    deleteExpensesOption.value = 'keep'
  }
})

// Sync showDialog with modelValue
watch(showDialog, (newValue) => {
  emit('update:modelValue', newValue)
})

// Handle confirm action
const handleConfirm = () => {
  if (props.loadingExpenses) return
  
  const shouldDeleteExpenses = deleteExpensesOption.value === 'delete'
  emit('confirm', shouldDeleteExpenses)
}

// Handle cancel action
const handleCancel = () => {
  if (props.loading || props.loadingExpenses) return
  emit('cancel')
  showDialog.value = false
}
</script>

<style scoped>
.border-primary {
  border-color: rgb(var(--v-theme-primary)) !important;
  border-width: 2px !important;
}

.border-error {
  border-color: rgb(var(--v-theme-error)) !important;
  border-width: 2px !important;
}

/* Ensure radio button cards are interactive */
.v-card {
  transition: all 0.2s ease;
}

.v-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
