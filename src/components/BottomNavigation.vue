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

interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>