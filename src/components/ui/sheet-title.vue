<template>
  <DialogTitle v-bind="$attrs" :class="cn('text-lg font-semibold text-foreground', $attrs.class)">
    <slot />
  </DialogTitle>
</template>

<script setup lang="ts">
import { DialogTitle } from 'radix-vue'
import { cn } from "@/lib/utils"
</script>