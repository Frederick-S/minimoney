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
      <SubscriptionSummary :summary="summary" :subscriptions="displaySubscriptions" />

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
      <SubscriptionDeleteDialog
        v-model="showDeleteDialog"
        :subscription-name="deletingSubscription?.name || ''"
        :expense-count="deletingExpenseCount"
        :loading="deleting"
        :loading-expenses="loadingExpenseCount"
        @confirm="confirmDelete"
        @cancel="cancelDelete"
      />

      <!-- Floating Action Button for adding subscriptions -->
      <div class="fixed-fab">
        <v-fab
          location="bottom center"
          size="56"
          color="primary"
          icon="mdi-plus"
          @click="handleAdd"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, defineExpose } from 'vue'
import { useSubscriptions } from '../composables/useSubscriptions'
import { useSubscriptionExpenses } from '../composables/useSubscriptionExpenses'
import { useCurrency } from '../composables/useCurrency'
import { useTimezone } from '../composables/useTimezone'
import { useSubscriptionCalculations } from '../composables/useSubscriptionCalculations'
import { useToast } from '../composables/useToast'
import SubscriptionList from './SubscriptionList.vue'
import SubscriptionForm from './SubscriptionForm.vue'
import SubscriptionSummary from './SubscriptionSummary.vue'
import SubscriptionDeleteDialog from './SubscriptionDeleteDialog.vue'
import type { Subscription, SubscriptionDisplay } from '../types'

// Composables
const {
  subscriptions,
  loading,
  loadSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  deleteSubscriptionWithExpenses,
  updateSubscriptionWithFrequencyChange
} = useSubscriptions()

const { getSubscriptionExpenses } = useSubscriptionExpenses()

const {
  mainCurrency,
  loadUserCurrencyPreference,
  fetchExchangeRates,
  loadCachedRates,
  convert
} = useCurrency()

const { getUserTimezone } = useTimezone()

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
const deletingExpenseCount = ref(0)
const loadingExpenseCount = ref(false)

/**
 * Convert subscriptions to display format with currency conversion
 */
const displaySubscriptions = computed<SubscriptionDisplay[]>(() => {
  return subscriptions.value.map(subscription => {
    // Convert unit price to display currency
    const convertedUnitPrice = convert(
      subscription.amount,
      subscription.currency,
      mainCurrency.value
    )
    
    // displayAmount should include quantity
    const displayAmount = convertedUnitPrice * subscription.quantity

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
const handleSave = async (
  subscriptionData: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  generatePastExpenses: boolean,
  pastBillsPreview: any,
  userTimezone: string
) => {
  try {
    // For now, just create the subscription without expenses
    // Task 5.2 will implement createSubscriptionWithExpenses
    await createSubscription(subscriptionData)
    
    // TODO: Task 5.2 - Implement expense generation
    // if (generatePastExpenses && pastBillsPreview) {
    //   await createExpensesForBillingEvents(...)
    // }
    
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
    // Find the original subscription to detect changes
    const originalSubscription = subscriptions.value.find(s => s.id === subscription.id)
    
    if (!originalSubscription) {
      throw new Error('原订阅不存在')
    }
    
    // Check if billing frequency changed
    const frequencyChanged = originalSubscription.billingFrequency !== subscription.billingFrequency
    
    if (frequencyChanged) {
      // Use updateSubscriptionWithFrequencyChange to recalculate next billing date
      const userTimezone = await getUserTimezone()
      await updateSubscriptionWithFrequencyChange(
        subscription,
        originalSubscription.billingFrequency,
        userTimezone
      )
    } else {
      // Use regular update
      await updateSubscription(subscription)
    }
    
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
const handleDeleteRequest = async (id: string) => {
  const subscription = subscriptions.value.find(s => s.id === id)
  if (subscription) {
    deletingSubscription.value = subscription
    showDeleteDialog.value = true
    
    // Load expense count for this subscription
    loadingExpenseCount.value = true
    deletingExpenseCount.value = 0
    
    try {
      const expenses = await getSubscriptionExpenses(id)
      deletingExpenseCount.value = expenses.length
    } catch (error) {
      console.error('Error loading subscription expenses:', error)
      // Continue with deletion even if we can't load expense count
      // User will see 0 expenses
    } finally {
      loadingExpenseCount.value = false
    }
  }
}

/**
 * Cancel delete
 */
const cancelDelete = () => {
  showDeleteDialog.value = false
  deletingSubscription.value = null
  deletingExpenseCount.value = 0
}

/**
 * Confirm delete
 */
const confirmDelete = async (deleteExpenses: boolean) => {
  if (!deletingSubscription.value) return

  try {
    deleting.value = true
    
    // Use deleteSubscriptionWithExpenses to handle both subscription and expenses
    await deleteSubscriptionWithExpenses(deletingSubscription.value.id, deleteExpenses)
    
    showSuccess('订阅已删除')
    showDeleteDialog.value = false
    deletingSubscription.value = null
    deletingExpenseCount.value = 0
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
.fixed-fab {
  position: fixed;
  bottom: 72px; /* 56px (bottom nav) + 16px spacing */
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}
</style>
