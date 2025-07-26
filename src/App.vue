<template>
  <v-app>
    <v-main class="bg-grey-lighten-5">
      <v-container class="pa-0 max-w-md mx-auto" fluid>
        <!-- Header -->
        <AppHeader />

        <!-- Main Content Area -->
        <div class="content-area pb-16">
          <!-- Home Tab Content -->
          <div v-if="activeTab === 'home'">
            <TodaySummary :expenses="expenses" />
            <ExpenseList :expenses="expenses" />
          </div>

          <!-- Charts Tab Content -->
          <div v-if="activeTab === 'charts'">
            <ChartsView :expenses="expenses" />
          </div>
        </div>

        <!-- Floating Action Button (only show on home tab) -->
        <v-fab
          v-if="activeTab === 'home'"
          location="bottom end"
          size="56"
          color="primary"
          icon="mdi-plus"
          class="mb-20 me-4"
          @click="showForm = true"
        />

        <!-- Bottom Navigation -->
        <BottomNavigation v-model="activeTab" />

        <!-- Expense Form Dialog -->
        <ExpenseForm 
          v-model="showForm" 
          @save="saveExpense"
        />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import TodaySummary from './components/TodaySummary.vue'
import ExpenseList from './components/ExpenseList.vue'
import ChartsView from './components/ChartsView.vue'
import BottomNavigation from './components/BottomNavigation.vue'
import ExpenseForm from './components/ExpenseForm.vue'

interface Expense {
  id: string
  amount: number
  category: string
  date: string
  note: string
}

const activeTab = ref('home')
const showForm = ref(false)
const expenses = ref<Expense[]>([
  {
    id: '1',
    amount: 25.50,
    category: '餐饮',
    date: '2024-01-15',
    note: '午餐 - 麦当劳'
  },
  {
    id: '2', 
    amount: 120.00,
    category: '交通',
    date: '2024-01-15',
    note: '地铁月卡'
  },
  {
    id: '3',
    amount: 68.90,
    category: '购物',
    date: '2024-01-14',
    note: '日用品采购'
  }
])

const saveExpense = (expense: Omit<Expense, 'id'>) => {
  const newExpense: Expense = {
    ...expense,
    id: Date.now().toString()
  }
  expenses.value.unshift(newExpense)
  showForm.value = false
}
</script>

<style scoped>
.content-area {
  min-height: calc(100vh - 64px - 56px); /* Subtract header and bottom nav height */
}
</style>