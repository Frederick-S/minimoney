<template>
  <div v-bind="$attrs" :class="cn('flex flex-col space-y-2 text-center sm:text-left', $attrs.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from "@/lib/utils"
</script>