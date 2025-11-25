<template>
  <v-app>
    <v-main class="bg-grey-lighten-5">
      <!-- Loading Screen -->
      <div v-if="loading" class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate size="64" />
      </div>

      <!-- Main App -->
      <v-container v-else class="pa-0 max-w-md mx-auto d-flex flex-column" fluid style="min-height: 100vh;">
        <!-- Header (only show if user is authenticated and not on login/reset password page) -->
        <AppHeader 
          v-if="user && $route.name !== 'Login' && $route.name !== 'ResetPassword'" 
          :user="user" 
          @logout="handleLogout" 
          @change-password="showPasswordChange = true"
          @currency-settings="showCurrencySettings = true"
          @import="showImport = true"
          @export="showExport = true"
        />

        <!-- Main Content Area -->
        <div 
          class="content-area flex-grow-1" 
          :class="{
            'd-flex flex-column justify-center': $route.name === 'Login' || $route.name === 'ResetPassword',
            'overflow-auto': $route.name !== 'Login' && $route.name !== 'ResetPassword'
          }"
        >
          <router-view 
            ref="currentView"
            :refresh-trigger="refreshTrigger"
          />
        </div>

        <!-- Floating Action Button (only show on home and subscriptions tabs if authenticated) -->
        <div v-if="user && ($route.name === 'Home' || $route.name === 'Subscriptions')" class="fixed-fab">
          <v-fab
            location="bottom center"
            size="56"
            color="primary"
            icon="mdi-plus"
            @click="handleFabClick"
          />
        </div>

        <!-- Bottom Navigation (only show if authenticated and not on login/reset password page) -->
        <BottomNavigation v-if="user && $route.name !== 'Login' && $route.name !== 'ResetPassword'" />

        <!-- Expense Form Dialog (only show if authenticated) -->
        <ExpenseFormManager 
          v-if="user"
          v-model="showForm" 
          :expense="editingExpense"
        />

        <!-- Password Change Dialog (only show if authenticated) -->
        <PasswordChange 
          v-if="user"
          v-model="showPasswordChange" 
        />

        <!-- Import Expenses Dialog (only show if authenticated) -->
        <ImportExpenses
          v-if="user"
          v-model="showImport"
        />

        <!-- Export Expenses Dialog (only show if authenticated) -->
        <ExportExpenses
          v-if="user"
          v-model="showExport"
        />

        <!-- Currency Settings Dialog (only show if authenticated) -->
        <v-dialog
          v-if="user"
          v-model="showCurrencySettings"
          max-width="500"
          :fullscreen="$vuetify.display.mobile"
        >
          <v-card v-if="loadingCurrencySettings">
            <v-card-title class="text-h6 pa-4">
              货币设置
            </v-card-title>
            <v-card-text class="pa-4 d-flex justify-center align-center" style="min-height: 200px;">
              <v-progress-circular indeterminate size="64" />
            </v-card-text>
          </v-card>
          <CurrencySettings
            v-else
            ref="currencySettingsRef"
            v-model="tempCurrency"
            :currencies="supportedCurrencies"
            @save="handleCurrencySave"
            @cancel="handleCurrencyCancel"
          />
        </v-dialog>

        <!-- Toast Container for notifications -->
        <ToastContainer />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from './composables/useSupabase'
import { useExpenseForm } from './composables/useExpenseForm'
import { useExpenseManagement } from './composables/useExpenseManagement'
import { useCurrency } from './composables/useCurrency'
import { useToast } from './composables/useToast'
import AppHeader from './components/AppHeader.vue'
import ExpenseFormManager from './components/ExpenseFormManager.vue'
import ExportExpenses from './components/ExportExpenses.vue'
import BottomNavigation from './components/BottomNavigation.vue'
import PasswordChange from './components/PasswordChange.vue'
import ImportExpenses from './components/ImportExpenses.vue'
import CurrencySettings from './components/CurrencySettings.vue'
import ToastContainer from './components/ToastContainer.vue'
import { type Expense } from './types'

const { user, loading, signOut, initAuth, supabase } = useSupabase()
const { refreshTrigger } = useExpenseManagement()
const { showForm, editingExpense, openFormForNew, openFormForEdit } = useExpenseForm()
const { mainCurrency, supportedCurrencies, setMainCurrency, fetchExchangeRates } = useCurrency()
const { showSuccess, showError, showWarning } = useToast()
const router = useRouter()

const showPasswordChange = ref(false)
const showImport = ref(false)
const showExport = ref(false)
const showCurrencySettings = ref(false)
const currentView = ref<any>(null)
const currencySettingsRef = ref<any>(null)
const tempCurrency = ref(mainCurrency.value)
const loadingCurrencySettings = ref(false)

// Initialize auth on app load
onMounted(async () => {
  await initAuth()

  // Listen for password recovery event
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      router.push('/reset-password')
    }
  })
})

const handleLogout = async () => {
  await signOut()
  router.push('/login')
}

const handleFabClick = () => {
  if (router.currentRoute.value.name === 'Home') {
    openFormForNew()
  } else if (router.currentRoute.value.name === 'Subscriptions') {
    // Call handleAdd method on SubscriptionsView component
    if (currentView.value?.handleAdd) {
      currentView.value.handleAdd()
    }
  }
}

// Handle currency settings save
const handleCurrencySave = async () => {
  if (!currencySettingsRef.value) return
  
  try {
    currencySettingsRef.value.saving = true
    await setMainCurrency(tempCurrency.value)
    
    // Update main currency
    mainCurrency.value = tempCurrency.value
    
    // Fetch new exchange rates for the new currency
    try {
      await fetchExchangeRates(tempCurrency.value)
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
      showWarning('汇率更新失败')
    }
    
    // Close dialog after success
    showCurrencySettings.value = false
  } catch (error) {
    console.error('Error saving currency:', error)
    showError('保存货币设置失败')
  } finally {
    if (currencySettingsRef.value) {
      currencySettingsRef.value.saving = false
    }
  }
}

// Handle currency settings cancel
const handleCurrencyCancel = () => {
  tempCurrency.value = mainCurrency.value
  showCurrencySettings.value = false
}

// Watch for dialog open to sync temp currency and load preference
watch(showCurrencySettings, async (isOpen) => {
  if (isOpen) {
    try {
      loadingCurrencySettings.value = true
      // Load current currency preference from database
      const { loadUserCurrencyPreference } = useCurrency()
      const currentCurrency = await loadUserCurrencyPreference()
      mainCurrency.value = currentCurrency
      tempCurrency.value = currentCurrency
    } catch (error) {
      console.error('Error loading currency preference:', error)
      showError('加载货币设置失败')
    } finally {
      loadingCurrencySettings.value = false
    }
  }
})

// Also watch mainCurrency changes to keep tempCurrency in sync when dialog is closed
watch(mainCurrency, (newValue) => {
  if (!showCurrencySettings.value) {
    tempCurrency.value = newValue
  }
})

// Note: handleEditExpense is now handled through useExpenseForm composable
</script>

<style scoped>
.content-area {
  min-height: 0; /* Allow flex item to shrink */
}

/* For authenticated pages - normal scroll behavior */
.content-area.overflow-auto {
  padding-bottom: 120px; /* Extra space for floating button */
}

/* For login page - center content vertically */
.content-area.d-flex.justify-center {
  padding: 2rem;
}

.fixed-fab {
  position: fixed;
  bottom: 72px; /* 56px (bottom nav) + 16px spacing */
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}
</style>