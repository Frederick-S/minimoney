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
          <router-view 
            :refresh-trigger="refreshTrigger"
            @edit="handleEditExpense"
          />
        </div>

        <!-- Floating Action Button (only show on home tab) -->
        <div v-if="$route.name === 'Home'" class="fixed-fab">
          <v-fab
            location="bottom center"
            size="56"
            color="primary"
            icon="mdi-plus"
            @click="() => { editingExpense = null; showForm = true }"
          />
        </div>

        <!-- Bottom Navigation -->
        <BottomNavigation />

        <!-- Expense Form Dialog -->
        <ExpenseFormManager 
          v-model="showForm" 
          :expense="editingExpense"
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
import { useExpenseManagement } from './composables/useExpenseManagement'
import AppHeader from './components/AppHeader.vue'
import Auth from './components/Auth.vue'
import ExpenseFormManager from './components/ExpenseFormManager.vue'
import BottomNavigation from './components/BottomNavigation.vue'
import PasswordChange from './components/PasswordChange.vue'
import { type Expense } from './types'

const { user, loading, signOut, initAuth } = useSupabase()
const { refreshTrigger } = useExpenseManagement()

const showForm = ref(false)
const showPasswordChange = ref(false)
const editingExpense = ref<Expense | null>(null)

// Initialize auth on app load
onMounted(async () => {
  await initAuth()
})

const handleLogout = async () => {
  await signOut()
}

// Handle editing an expense
const handleEditExpense = (expense: Expense) => {
  editingExpense.value = expense
  showForm.value = true
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