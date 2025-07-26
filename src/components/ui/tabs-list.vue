<template>
  <div
    :class="cn(
      'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
      $attrs.class
    )"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from "@/lib/utils"
</script>