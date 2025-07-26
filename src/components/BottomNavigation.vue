<template>
  <v-bottom-navigation 
    v-model="activeTab" 
    color="primary"
    grow
    class="elevation-8"
    fixed
    app
  >
    <v-btn 
      value="home"
      @click="() => $router.push('/home')"
    >
      <v-icon>mdi-home</v-icon>
      <span>首页</span>
    </v-btn>
    
    <v-btn 
      value="charts"
      @click="() => $router.push('/charts')"
    >
      <v-icon>mdi-chart-pie</v-icon>
      <span>图表</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Map route names to tab values
const getTabFromRoute = (routeName: string | symbol | null | undefined) => {
  switch (routeName) {
    case 'Home':
      return 'home'
    case 'Charts':
      return 'charts'
    default:
      return 'home'
  }
}

const activeTab = computed({
  get: () => getTabFromRoute(route.name),
  set: () => {} // Router handles navigation
})
</script>