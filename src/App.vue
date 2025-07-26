<template>
  <v-app>
    <v-main class="bg-grey-lighten-5">
      <!-- Loading Screen -->
      <div v-if="loading" class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate size="64" />
      </div>

      <!-- Authentication Screen -->
      <Auth v-else-if="!user" />

      <!-- Main App (Authenticated) -->
      <v-container v-else class="pa-0 max-w-md mx-auto" fluid>
        <!-- Header -->
        <AppHeader :user="user" @logout="handleLogout" @change-password="showPasswordChange = true" />

        <!-- Main Content Area -->
        <div class="content-area">
          <!-- Home Tab Content -->
          <div v-if="activeTab === 'home'">
            <HomeView 
              :refresh-trigger="refreshTrigger"
              @edit="handleEditExpense" 
              ref="homeViewRef"
            />
          </div>

          <!-- Charts Tab Content -->
          <div v-if="activeTab === 'charts'" class="px-4">
            <ChartsView :expenses="allExpenses" />
          </div>
        </div>

        <!-- Floating Action Button (only show on home tab) -->
        <div v-if="activeTab === 'home'" class="fixed-fab">
          <v-fab
            location="bottom center"
            size="56"
            color="primary"
            icon="mdi-plus"
            @click="() => { editingExpense = null; showForm = true }"
          />
        </div>

        <!-- Bottom Navigation -->
        <BottomNavigation v-model="activeTab" />

        <!-- Expense Form Dialog -->
        <ExpenseForm 
          v-model="showForm" 
          :expense="editingExpense"
          @save="saveExpense"
          @update="updateExpense"
        />

        <!-- Password Change Dialog -->
        <PasswordChange v-model="showPasswordChange" />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSupabase } from './composables/useSupabase'
import AppHeader from './components/AppHeader.vue'
import Auth from './components/Auth.vue'
import HomeView from './components/HomeView.vue'
import ExpenseForm from './components/ExpenseForm.vue'
import ChartsView from './components/ChartsView.vue'
import BottomNavigation from './components/BottomNavigation.vue'
import PasswordChange from './components/PasswordChange.vue'
import { type Expense } from './types'

const { user, loading, signOut, initAuth, supabase } = useSupabase()

const activeTab = ref('home')
const showForm = ref(false)
const showPasswordChange = ref(false)
const editingExpense = ref<Expense | null>(null)
const homeViewRef = ref()
const refreshTrigger = ref(0)

// Get all expenses for charts (we'll need to load all for charts)
const allExpenses = ref<Expense[]>([])

// Initialize auth on app load
onMounted(async () => {
  await initAuth()
  if (user.value) {
    await loadAllExpenses()
  }
})

// Load all expenses for charts view
const loadAllExpenses = async () => {
  if (!user.value) return

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.value.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading all expenses:', error)
  } else {
    allExpenses.value = data || []
  }
}

// Save expense to Supabase
const saveExpense = async (expense: Omit<Expense, 'id'>) => {
  if (!user.value) return

  const newExpense = {
    ...expense,
    user_id: user.value.id
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert([newExpense])
    .select()
    .single()

  if (error) {
    console.error('Error saving expense:', error)
  } else {
    // Refresh both views
    refreshTrigger.value++
    await loadAllExpenses()
    showForm.value = false
    editingExpense.value = null
  }
}

const handleLogout = async () => {
  await signOut()
  // Clear all data
  allExpenses.value = []
  refreshTrigger.value++
}

// Handle editing an expense
const handleEditExpense = (expense: Expense) => {
  editingExpense.value = expense
  showForm.value = true
}

// Update existing expense in Supabase
const updateExpense = async (expense: Expense) => {
  if (!user.value) return

  const { data, error } = await supabase
    .from('expenses')
    .update({
      amount: expense.amount,
      category: expense.category,
      note: expense.note,
      date: expense.date
    })
    .eq('id', expense.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating expense:', error)
  } else {
    // Refresh both views
    refreshTrigger.value++
    await loadAllExpenses()
    showForm.value = false
    editingExpense.value = null
  }
}
</script>

<style scoped>
.content-area {
  min-height: calc(100vh - 64px - 56px); /* Subtract header and bottom nav height */
  padding-bottom: 120px; /* Extra space for floating button */
}

.fixed-fab {
  position: fixed;
  bottom: 72px; /* 56px (bottom nav) + 16px spacing */
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}
</style>