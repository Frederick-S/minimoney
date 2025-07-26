<template>
  <v-app>
    <v-main class="bg-grey-lighten-5">
      <v-container class="pa-0 max-w-md mx-auto" fluid>
        <!-- Header -->
        <AppHeader />

        <!-- Content Area with Bottom Padding for Tabs -->
        <div class="pa-4" style="padding-bottom: 88px;">
          <!-- 首页 Tab Content -->
          <div v-if="activeTab === 'home'">
            <TodaySummary :expenses="expenses" />
            <ExpenseList :expenses="expenses" />
          </div>

          <!-- 图表 Tab Content -->
          <div v-if="activeTab === 'charts'">
            <ChartsView :expenses="expenses" />
          </div>
        </div>

        <!-- Floating Action Button (only show on home tab) -->
        <v-fab
          v-if="activeTab === 'home'"
          icon="mdi-plus"
          location="bottom end"
          color="primary"
          size="large"
          app
          style="bottom: 72px;"
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
import { useKV } from './hooks/useKV'
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
  note?: string
}

const [expenses, setExpenses] = useKV<Expense[]>("expenses", [])
const showForm = ref(false)
const activeTab = ref('home')

const saveExpense = (expenseData: Omit<Expense, 'id'>) => {
  const newExpense: Expense = {
    id: Date.now().toString(),
    ...expenseData
  }
  
  setExpenses((currentExpenses: Expense[]) => [newExpense, ...currentExpenses])
}
</script>