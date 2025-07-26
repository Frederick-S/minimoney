<template>
  <v-bottom-navigation 
    v-model="activeTab" 
    color="primary"
    grow
    class="elevation-8"
    fixed
    app
  >
    <v-btn value="home">
      <v-icon>mdi-home</v-icon>
      <span>首页</span>
    </v-btn>
    
    <v-btn value="charts">
      <v-icon>mdi-chart-pie</v-icon>
      <span>图表</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type BottomNavigationProps, type BottomNavigationEmits } from '../types'

const props = defineProps<BottomNavigationProps>()
const emit = defineEmits<BottomNavigationEmits>()

const activeTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>