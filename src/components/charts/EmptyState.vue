<template>
  <div class="text-center py-16">
    <v-icon size="80" color="grey-lighten-1" class="mb-6">
      mdi-chart-pie
    </v-icon>
    <v-card-title class="justify-center mb-3">暂无数据</v-card-title>
    <v-card-subtitle class="text-center">
      {{ periodLabel }}还没有支出记录
    </v-card-subtitle>
  </div>
</template>

<script setup lang="ts">
import { type EmptyStateProps } from '../../types'

defineProps<EmptyStateProps>()
</script>
