<template>
  <v-app>
    <v-main class="bg-grey-lighten-5">
      <v-container class="pa-0 max-w-md mx-auto" fluid>
        <!-- Header -->
        <AppHeader />

        </div>

        <!-- Floating Action Button (only show on home tab) -->
        <v-fab
            <TodaySummary :expenses="expenses" />
            <ExpenseList :expenses="expenses" />
            <ChartsView :expenses="expenses" />        <BottomNavigation v-model="activeTab" />        <!-- Expense Form Dialog -->        <ExpenseForm           v-model="showForm"          @save="saveExpense"        />