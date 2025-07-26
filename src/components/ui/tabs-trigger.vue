<template>
  <button
    :class="cn(
      'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50',
      isActive ? 'bg-background text-foreground shadow-sm' : 'text-foreground hover:bg-background/50',
      $attrs.class
    )"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { cn } from "@/lib/utils"

interface Props {
  isActive?: boolean
}

defineProps<Props>()
defineEmits<{
  click: []
}>()
</script>