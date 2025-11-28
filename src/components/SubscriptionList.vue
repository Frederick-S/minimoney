<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
      <div class="text-body-1 text-medium-emphasis mt-4">
        加载订阅中...
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="subscriptions.length === 0" class="text-center py-12">
      <div class="text-h1 mb-4">📱</div>
      <v-card-title class="justify-center">还没有订阅记录</v-card-title>
      <v-card-subtitle class="text-center mb-6">
        点击底部中央的 + 按钮添加第一个订阅
      </v-card-subtitle>
    </div>

    <!-- Subscription List -->
    <div v-else>
      <!-- Active Subscriptions -->
      <div v-if="activeSubscriptions.length > 0" class="mb-6">
        <h3 class="text-subtitle-1 font-weight-medium text-medium-emphasis mb-3">
          活跃订阅 ({{ activeSubscriptions.length }})
        </h3>
        <SubscriptionCard
          v-for="subscription in activeSubscriptions"
          :key="subscription.id"
          :subscription="subscription"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>

      <!-- Expired Subscriptions -->
      <div v-if="expiredSubscriptions.length > 0">
        <h3 class="text-subtitle-1 font-weight-medium text-medium-emphasis mb-3">
          已过期订阅 ({{ expiredSubscriptions.length }})
        </h3>
        <SubscriptionCard
          v-for="subscription in expiredSubscriptions"
          :key="subscription.id"
          :subscription="subscription"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SubscriptionCard from './SubscriptionCard.vue'
import type { SubscriptionListProps, SubscriptionListEmits, Subscription } from '../types'

const props = defineProps<SubscriptionListProps>()
const emit = defineEmits<SubscriptionListEmits>()

/**
 * Group subscriptions into active and expired
 */
const activeSubscriptions = computed(() => 
  props.subscriptions.filter(sub => !sub.isExpired)
)

const expiredSubscriptions = computed(() => 
  props.subscriptions.filter(sub => sub.isExpired)
)

/**
 * Handle edit event from subscription card
 */
const handleEdit = (subscription: Subscription) => {
  emit('edit', subscription)
}

/**
 * Handle delete event from subscription card
 */
const handleDelete = (id: string) => {
  emit('delete', id)
}
</script>
