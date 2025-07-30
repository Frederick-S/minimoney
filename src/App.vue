<template>
  <v-app>
    <v-main class="bg-grey-lighten-5">
      <!-- Loading Screen -->
      <div v-if="loading" class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate size="64" />
      </div>

      <!-- Main App -->
      <v-container v-else class="pa-0 max-w-md mx-auto d-flex flex-column" fluid style="min-height: 100vh;">
        <!-- Header (only show if user is authenticated and not on login page) -->
        <AppHeader 
          v-if="user && $route.name !== 'Login'" 
          :user="user" 
          @logout="handleLogout" 
          @change-password="showPasswordChange = true" 
        />

        <!-- Main Content Area -->
        <div 
          class="content-area flex-grow-1" 
          :class="{
            'd-flex flex-column justify-center': $route.name === 'Login',
            'overflow-auto': $route.name !== 'Login'
          }"
        >
          <router-view 
            :refresh-trigger="refreshTrigger"
            @edit="handleEditExpense"
          />
        </div>

        <!-- Floating Action Button (only show on home tab and if authenticated) -->
        <div v-if="user && $route.name === 'Home'" class="fixed-fab">
          <v-fab
            location="bottom center"
            size="56"
            color="primary"
            icon="mdi-plus"
            @click="() => { editingExpense = null; showForm = true }"
          />
        </div>

        <!-- Bottom Navigation (only show if authenticated and not on login page) -->
        <BottomNavigation v-if="user && $route.name !== 'Login'" />

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

        <!-- Toast Container for notifications -->
        <ToastContainer />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from './composables/useSupabase'
import { useExpenseManagement } from './composables/useExpenseManagement'
import AppHeader from './components/AppHeader.vue'
import ExpenseFormManager from './components/ExpenseFormManager.vue'
import BottomNavigation from './components/BottomNavigation.vue'
import PasswordChange from './components/PasswordChange.vue'
import ToastContainer from './components/ToastContainer.vue'
import { type Expense } from './types'

const { user, loading, signOut, initAuth } = useSupabase()
const { refreshTrigger } = useExpenseManagement()
const router = useRouter()

const showForm = ref(false)
const showPasswordChange = ref(false)
const editingExpense = ref<Expense | null>(null)

// Initialize auth on app load
onMounted(async () => {
  await initAuth()
})

const handleLogout = async () => {
  await signOut()
  router.push('/login')
}

// Handle editing an expense
const handleEditExpense = (expense: Expense) => {
  editingExpense.value = expense
  showForm.value = true
}
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