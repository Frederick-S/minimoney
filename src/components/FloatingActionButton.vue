<template>
  <div 
    class="fixed bottom-6 right-6 z-50 transition-transform duration-200 hover:scale-105 active:scale-95"
  >
    <Button
      size="lg"
      @click="$emit('click')"
      class="
        h-14 w-14 rounded-full shadow-lg bg-accent hover:bg-accent/90 
        border-0 transition-all duration-200 hover:shadow-xl
      "
    >
      <Plus :size="24" class="text-accent-foreground" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button.vue"
import { Plus } from "@phosphor-icons/vue"

defineEmits<{
  click: []
}>()
</script>