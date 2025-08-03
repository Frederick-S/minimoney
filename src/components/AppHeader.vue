<template>
  <v-app-bar 
    color="primary" 
    dark 
    elevation="1"
    class="mb-0"
  >
    <v-app-bar-title>
      <span class="text-h6">简账</span>
    </v-app-bar-title>

    <template #append>
      <v-menu>
        <template #activator="{ props }">
          <v-btn
            icon="mdi-account-circle"
            v-bind="props"
          />
        </template>
        <v-list>
          <v-list-item>
            <v-list-item-title>{{ user?.email }}</v-list-item-title>
          </v-list-item>
          <v-divider />
          <v-list-item @click="$emit('changePassword')">
            <v-list-item-title>
              <v-icon start>mdi-lock-reset</v-icon>
              修改密码
            </v-list-item-title>
          </v-list-item>
          <v-list-item @click="$emit('logout')">
            <v-list-item-title>
              <v-icon start>mdi-logout</v-icon>
              退出登录
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>
</template>

<script setup lang="ts">
import type { User } from '@supabase/supabase-js'

defineProps<{
  user: User | null
}>()

defineEmits<{
  logout: []
  changePassword: []
}>()
</script>