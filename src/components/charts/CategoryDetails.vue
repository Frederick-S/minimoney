<template>
  <v-card elevation="1" v-if="categoryData && categoryData.length > 0">
    <v-card-title class="pb-2">
      <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
      分类明细
    </v-card-title>
    <v-card-text class="pa-0">
      <v-list>
        <v-list-item
          v-for="categoryItem in categoryData"
          :key="categoryItem.category"
          class="px-4"
        >
          <template v-slot:prepend>
            <v-avatar
              :color="getCategoryColor(categoryItem.category as CategoryKey)"
              size="small"
              class="mr-3"
            >
              <span class="text-white text-caption font-weight-bold">
                {{ Math.round(categoryItem.percentage) }}%
              </span>
            </v-avatar>
          </template>
          
          <v-list-item-title class="font-weight-medium">
            {{ getCategoryName(categoryItem.category as CategoryKey) }}
          </v-list-item-title>
          
          <template v-slot:append>
            <div class="text-right">
              <div class="font-weight-bold">{{ formatAmount(categoryItem.amount) }}</div>
              <div class="text-caption text-medium-emphasis">{{ categoryItem.count }} 笔</div>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCategories, type CategoryKey } from '../../composables/useCategories'
import { type CategoryBreakdownData } from '../../types'

interface Props {
  categoryData?: CategoryBreakdownData[]
}

const props = withDefaults(defineProps<Props>(), {
  categoryData: () => []
})

const { getCategoryName, getCategoryColor } = useCategories()

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}
</script>
