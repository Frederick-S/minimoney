<template>
  <div class="px-4 pb-16">
    <!-- Loading State for Initial Load -->
    <div v-if="initialLoading" class="d-flex justify-center align-center py-8">
      <v-progress-circular indeterminate size="64" color="primary" />
      <div class="text-body-1 text-medium-emphasis ml-4">
        加载中...
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="text-center py-8">
      <v-alert type="error" variant="tonal" class="mb-4">
        {{ errorMessage }}
      </v-alert>
      <v-btn color="primary" @click="retryLoad">
        重试
      </v-btn>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Currency Settings (Collapsible) -->
      <v-expansion-panels v-model="settingsPanel" class="mb-4">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon class="mr-2">mdi-cog</v-icon>
            货币设置
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <CurrencySettings
              v-model="mainCurrency"
              :currencies="supportedCurrencies"
              @update:model-value="handleCurrencyChange"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Subscription Summary -->
      <SubscriptionSummary :summary="summary" />

      <!-- Subscription List -->
      <SubscriptionList
        :subscriptions="displaySubscriptions"
        :loading="loading"
        @edit="handleEdit"
        @delete="handleDeleteRequest"
      />

      <!-- Floating Action Button -->
      <v-btn
        color="primary"
        icon
        size="x-large"
        elevation="8"
        class="floating-action-button"
        @click="handleAdd"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>

      <!-- Subscription Form Dialog -->
      <SubscriptionForm
        v-model="showForm"
        :subscription="editingSubscription"
        :main-currency="mainCurrency"
        @save="handleSave"
        @update="handleUpdate"
      />

      <!-- Delete Confirmation Dialog -->
      <v-dialog v-model="showDeleteDialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">
            确认删除
          </v-card-title>
          <v-card-text>
            确定要删除订阅 "{{ deletingSubscription?.name }}" 吗？此操作无法撤销。
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="cancelDelete">
              取消
            </v-btn>
            <v-btn color="error" variant="flat" @click="confirmDelete" :loading="deleting">
              删除
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSubscriptions } from '../composables/useSubscriptions'
import { useCurrency } from '../composables/useCurrency'
import { useSubscriptionCalculations } from '../composables/useSubscriptionCalculations'
import { useToast } from '../composables/useToast'
import SubscriptionList from './SubscriptionList.vue'
import SubscriptionForm from './SubscriptionForm.vue'
import SubscriptionSummary from './SubscriptionSummary.vue'
import CurrencySettings from './CurrencySettings.vue'
import type { Subscription, SubscriptionDisplay } from '../types'

// Composables
const {
  subscriptions,
  loading,
  loadSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription
} = useSubscriptions()

const {
  mainCurrency,
  supportedCurrencies,
  loadUserCurrencyPreference,
  setMainCurrency,
  fetchExchangeRates,
  loadCachedRates,
  convert
} = useCurrency()

const {
  isExpired,
  isEndingSoon,
  getDaysUntilEnd,
  calculateTotalCosts
} = useSubscriptionCalculations()

const { showSuccess, showError, showWarning } = useToast()

// State
const initialLoading = ref(true)
const errorMessage = ref<string | null>(null)
const showForm = ref(false)
const editingSubscription = ref<Subscription | null>(null)
const showDeleteDialog = ref(false)
const deletingSubscription = ref<Subscription | null>(null)
const deleting = ref(false)
const settingsPanel = ref<number | undefined>(undefined)

/**
 * Convert subscriptions to display format with currency conversion
 */
const displaySubscriptions = computed<SubscriptionDisplay[]>(() => {
  return subscriptions.value.map(subscription => {
    const displayAmount = convert(
      subscription.amount,
      subscription.currency,
      mainCurrency.value
    )

    return {
      ...subscription,
      displayAmount,
      displayCurrency: mainCurrency.value,
      originalAmount: subscription.amount,
      originalCurrency: subscription.currency,
      isExpired: isExpired(subscription),
      isEndingSoon: isEndingSoon(subscription),
      daysUntilEnd: getDaysUntilEnd(subscription) ?? undefined
    }
  })
})

/**
 * Calculate summary data
 */
const summary = computed(() => {
  return calculateTotalCosts(displaySubscriptions.value)
})

/**
 * Initialize data on mount
 */
const initializeData = async () => {
  try {
    initialLoading.value = true
    errorMessage.value = null

    // Load currency preference first
    await loadUserCurrencyPreference()

    // Try to load cached exchange rates
    const cacheLoaded = loadCachedRates()

    // If cache is not valid or doesn't exist, fetch fresh rates
    if (!cacheLoaded) {
      try {
        await fetchExchangeRates(mainCurrency.value)
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error)
        showWarning('无法获取汇率，将仅显示原始货币')
      }
    }

    // Load subscriptions
    await loadSubscriptions()
  } catch (error) {
    console.error('Error initializing subscriptions view:', error)
    errorMessage.value = '加载订阅数据失败，请重试'
  } finally {
    initialLoading.value = false
  }
}

/**
 * Retry loading data
 */
const retryLoad = async () => {
  await initializeData()
}

/**
 * Handle currency change
 */
const handleCurrencyChange = async (newCurrency: string) => {
  try {
    await setMainCurrency(newCurrency)
    
    // Fetch new exchange rates for the new base currency
    try {
      await fetchExchangeRates(newCurrency)
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
      showWarning('无法获取汇率，将仅显示原始货币')
    }
    
    showSuccess('主货币已更新')
  } catch (error) {
    console.error('Error changing currency:', error)
    showError('更新货币设置失败')
  }
}

/**
 * Handle add subscription
 */
const handleAdd = () => {
  editingSubscription.value = null
  showForm.value = true
}

/**
 * Handle edit subscription
 */
const handleEdit = (subscription: Subscription) => {
  editingSubscription.value = subscription
  showForm.value = true
}

/**
 * Handle save new subscription
 */
const handleSave = async (subscriptionData: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
  try {
    await createSubscription(subscriptionData)
    showSuccess('订阅已添加')
    showForm.value = false
  } catch (error) {
    console.error('Error creating subscription:', error)
    showError(error instanceof Error ? error.message : '创建订阅失败')
  }
}

/**
 * Handle update subscription
 */
const handleUpdate = async (subscription: Subscription) => {
  try {
    await updateSubscription(subscription)
    showSuccess('订阅已更新')
    showForm.value = false
  } catch (error) {
    console.error('Error updating subscription:', error)
    showError(error instanceof Error ? error.message : '更新订阅失败')
  }
}

/**
 * Handle delete request (show confirmation dialog)
 */
const handleDeleteRequest = (id: string) => {
  const subscription = subscriptions.value.find(s => s.id === id)
  if (subscription) {
    deletingSubscription.value = subscription
    showDeleteDialog.value = true
  }
}

/**
 * Cancel delete
 */
const cancelDelete = () => {
  showDeleteDialog.value = false
  deletingSubscription.value = null
}

/**
 * Confirm delete
 */
const confirmDelete = async () => {
  if (!deletingSubscription.value) return

  try {
    deleting.value = true
    await deleteSubscription(deletingSubscription.value.id)
    showSuccess('订阅已删除')
    showDeleteDialog.value = false
    deletingSubscription.value = null
  } catch (error) {
    console.error('Error deleting subscription:', error)
    showError(error instanceof Error ? error.message : '删除订阅失败')
  } finally {
    deleting.value = false
  }
}

// Initialize on mount
onMounted(async () => {
  await initializeData()
})

// Watch for subscription changes to maintain state
watch(subscriptions, () => {
  // State is automatically maintained through reactive refs
  // No need to reload from database
}, { deep: true })
</script>

<style scoped>
.floating-action-button {
  position: fixed;
  bottom: 80px;
  right: 16px;
  z-index: 10;
}
</style>
