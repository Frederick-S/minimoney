<template>
  <div :class="cn('flex flex-col gap-2', $attrs.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from "@/lib/utils"
</script>