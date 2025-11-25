<template>
  <div class="px-4 pb-16">
    <!-- Loading State for Initial Load -->
    <div v-if="initialLoading" class="d-flex justify-center align-center py-8">
      <v-progress-circular indeterminate size="64" />
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="text-center py-8">
      <v-icon size="64" color="error" class="mb-4">
        mdi-alert-circle-outline
      </v-icon>
      <v-alert type="error" variant="tonal" class="mb-4">
        <div class="text-h6 mb-2">加载失败</div>
        <div class="text-body-1">{{ errorMessage }}</div>
      </v-alert>
      <v-btn 
        color="primary" 
        size="large"
        prepend-icon="mdi-refresh"
        @click="retryLoad"
      >
        重新加载
      </v-btn>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Subscription Summary -->
      <SubscriptionSummary :summary="summary" />

      <!-- Subscription List -->
      <SubscriptionList
        :subscriptions="displaySubscriptions"
        :loading="loading"
        @edit="handleEdit"
        @delete="handleDeleteRequest"
      />

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
import { ref, computed, onMounted, watch, defineExpose } from 'vue'
import { useSubscriptions } from '../composables/useSubscriptions'
import { useCurrency } from '../composables/useCurrency'
import { useSubscriptionCalculations } from '../composables/useSubscriptionCalculations'
import { useToast } from '../composables/useToast'
import SubscriptionList from './SubscriptionList.vue'
import SubscriptionForm from './SubscriptionForm.vue'
import SubscriptionSummary from './SubscriptionSummary.vue'
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
  loadUserCurrencyPreference,
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

    // Load currency preference first (this should not fail)
    await loadUserCurrencyPreference()

    // Try to load cached exchange rates
    const cacheLoaded = loadCachedRates()

    // If cache is not valid or doesn't exist, fetch fresh rates
    if (!cacheLoaded) {
      try {
        await fetchExchangeRates(mainCurrency.value)
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error)
        const errorMsg = error instanceof Error ? error.message : '无法获取汇率'
        showWarning(`${errorMsg}，将仅显示原始货币`)
      }
    }

    // Load subscriptions - this is critical, so we throw on failure
    try {
      await loadSubscriptions()
    } catch (error) {
      console.error('Failed to load subscriptions:', error)
      const errorMsg = error instanceof Error ? error.message : '加载订阅失败'
      throw new Error(errorMsg)
    }
  } catch (error) {
    console.error('Error initializing subscriptions view:', error)
    errorMessage.value = error instanceof Error ? error.message : '加载订阅数据失败，请重试'
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
    const errorMsg = error instanceof Error ? error.message : '创建订阅失败，请重试'
    showError(errorMsg)
    // Don't close form on error so user can retry
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
    const errorMsg = error instanceof Error ? error.message : '更新订阅失败，请重试'
    showError(errorMsg)
    // Don't close form on error so user can retry
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

// Expose handleAdd for parent component to call
defineExpose({
  handleAdd
})
</script>

<style scoped>
/* Styles if needed */
</style>
