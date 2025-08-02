<template>
  <div class="category-tree-selector" ref="componentRef">
    <div class="d-flex align-center justify-space-between mb-2">
      <v-label class="text-subtitle-2">分类</v-label>
      <v-btn 
        v-if="modelValue && !isExpanded"
        icon
        size="small"
        variant="text"
        @click="toggleExpanded"
      >
        <v-icon>mdi-chevron-down</v-icon>
      </v-btn>
    </div>
    
    <!-- Selected Category Display (when collapsed) -->
    <v-card 
      v-if="modelValue && !isExpanded" 
      variant="outlined" 
      class="selected-category-card pa-3 mb-2"
      @click="toggleExpanded"
    >
      <div class="d-flex align-center">
        <v-icon 
          :icon="selectedCategoryIcon" 
          class="mr-3" 
          :color="selectedCategoryColor" 
        />
        <div class="flex-grow-1">
          <div class="text-subtitle-2">{{ selectedCategoryName }}</div>
          <div class="text-caption text-medium-emphasis">点击展开选择其他分类</div>
        </div>
        <v-btn icon size="small" variant="text">
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
      </div>
    </v-card>

    <!-- No Category Selected (clickable to expand) -->
    <v-card 
      v-if="!modelValue && !isExpanded" 
      variant="outlined" 
      class="selected-category-card pa-3 mb-2"
      @click="toggleExpanded"
      style="cursor: pointer;"
    >
      <div class="d-flex align-center">
        <v-icon 
          icon="mdi-tag-outline" 
          class="mr-3" 
          color="grey" 
        />
        <div class="flex-grow-1">
          <div class="text-subtitle-2 text-medium-emphasis">请选择分类</div>
          <div class="text-caption text-medium-emphasis">点击选择支出分类</div>
        </div>
        <v-btn icon size="small" variant="text">
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
      </div>
    </v-card>

    <!-- Full Category Tree (when expanded) -->

    <v-card 
      v-if="isExpanded"
      variant="outlined" 
      class="category-tree-card"
    >
      <v-list 
        density="compact" 
        class="pa-0" 
        :key="`list-${listKey}`"
      >
        <template v-for="parent in hierarchicalCategories" :key="parent.id">
          <!-- Parent Category with children -->
          <template v-if="parent.children && parent.children.length > 0">
            <!-- Parent Category Header (clickable to expand/collapse) -->
            <v-list-item 
              @click="toggleGroup(parent.id)"
              class="parent-category"
              :style="{ cursor: 'pointer' }"
            >
              <template #prepend>
                <v-icon :icon="parent.icon" class="mr-2" :color="parent.color" />
              </template>
              <v-list-item-title class="font-weight-medium">
                {{ parent.displayName }}
              </v-list-item-title>
              <template #append>
                <v-icon>
                  {{ openGroups.includes(parent.id) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
                </v-icon>

              </template>
            </v-list-item>
            
            <!-- Child Categories (shown when parent is expanded) -->

            <template v-if="openGroups.includes(parent.id)">
              <v-list-item
                v-for="child in parent.children"
                :key="child.id"
                :value="child.id"
                :active="modelValue === child.id"
                @click="selectCategory(child)"
                class="child-category"
                :class="{ 'selected-category': modelValue === child.id }"
                :data-category-id="child.id"
              >
                <template #prepend>
                  <div class="ml-4">
                    <v-icon :icon="child.icon" class="mr-2" size="small" :color="child.color" />
                  </div>
                </template>
                <v-list-item-title>
                  {{ child.displayName }}
                </v-list-item-title>
                <template #append v-if="modelValue === child.id">
                  <v-icon icon="mdi-check" color="primary" />
                </template>
              </v-list-item>
            </template>
          </template>
          
          <!-- Parent Category without children (selectable) -->
          <v-list-item
            v-else
            :value="parent.id"
            :active="modelValue === parent.id"
            @click="selectCategory(parent)"
            class="parent-category-selectable"
            :class="{ 'selected-category': modelValue === parent.id }"
          >
            <template #prepend>
              <v-icon :icon="parent.icon" class="mr-2" :color="parent.color" />
            </template>
            <v-list-item-title class="font-weight-medium">
              {{ parent.displayName }}
            </v-list-item-title>
            <template #append v-if="modelValue === parent.id">
              <v-icon icon="mdi-check" color="primary" />
            </template>
          </v-list-item>
        </template>
        
        <!-- Empty state -->
        <v-list-item v-if="hierarchicalCategories.length === 0">
          <v-list-item-title class="text-center text-medium-emphasis">
            暂无分类
          </v-list-item-title>
        </v-list-item>
      </v-list>
      
      <!-- Collapse Button -->
      <v-card-actions class="pa-2" v-if="modelValue">
        <v-spacer />
        <v-btn 
          size="small" 
          variant="text" 
          @click="toggleExpanded"
          class="text-caption"
        >
          收起
          <v-icon>mdi-chevron-up</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick, defineProps, defineEmits } from 'vue'
import { type Category } from '../types'

interface CategoryTreeItem extends Category {
  children?: CategoryTreeItem[]
}

interface Props {
  modelValue: string
  categories: Category[]
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'select', category: Category): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Track which groups are open (start with none open)
const openGroups = ref<string[]>([])



// Track if the entire tree is expanded or collapsed  
// Start collapsed for new expenses (no modelValue), expanded if editing (has modelValue)
const isExpanded = ref(!!props.modelValue)



// Force all groups to be closed initially
const forceCloseAllGroups = async () => {
  openGroups.value = []
  await nextTick()
  listKey.value++
  openGroupsKey.value++
}

// Reference to the component root element for click-outside detection
const componentRef = ref<HTMLElement | null>(null)



// Force list re-render key
const listKey = ref(0)

// Force groups re-render key
const openGroupsKey = ref(0)

// Build hierarchical structure from flat category list
const hierarchicalCategories = computed<CategoryTreeItem[]>(() => {
  if (!props.categories.length) return []
  
  // Separate parents and children
  const parents = props.categories.filter(cat => cat.level === 0)
  const children = props.categories.filter(cat => cat.level > 0)
  
  // Build tree structure
  return parents.map(parent => {
    const parentChildren = children
      .filter(child => child.parentId === parent.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    
    return {
      ...parent,
      children: parentChildren.length > 0 ? parentChildren : undefined
    }
  }).sort((a, b) => a.sortOrder - b.sortOrder)
})

const selectCategory = (category: Category) => {
  emit('update:modelValue', category.id)
  emit('select', category)
  
  // After selection, collapse all groups except the one containing the selected category
  const selectedParentId = category.parentId
  if (selectedParentId) {
    // Keep only the parent group of the selected category open
    openGroups.value = [selectedParentId]
  } else {
    // If it's a top-level category, close all groups
    openGroups.value = []
  }
  
  // Auto-collapse the tree after selection (with a small delay for smooth UX)
  setTimeout(() => {
    isExpanded.value = false
  }, 300)
}



// Toggle a group open/closed
const toggleGroup = (groupId: string) => {
  const index = openGroups.value.indexOf(groupId)
  if (index > -1) {
    // Group is open, close it
    openGroups.value.splice(index, 1)
  } else {
    // Group is closed, open it
    openGroups.value.push(groupId)
  }
}

// Toggle the expanded/collapsed state of the entire tree
const toggleExpanded = async () => {
  isExpanded.value = !isExpanded.value
  
  // If expanding and there's a selected category, open its parent group
  if (isExpanded.value && props.modelValue) {
    const selectedCategory = props.categories.find(cat => cat.id === props.modelValue)
    
    if (selectedCategory && selectedCategory.parentId) {
      // Force complete re-render by changing keys
      openGroups.value = []
      listKey.value++
      openGroupsKey.value++
      
      // Wait for DOM update then set the groups
      await new Promise(resolve => setTimeout(resolve, 50))
      
      openGroups.value = [selectedCategory.parentId]
      
      // Another forced update
      openGroupsKey.value++
      
      // Scroll to selected category after expansion
      setTimeout(() => {
        scrollToSelectedCategory()
      }, 150)
    }
  }
}

// Scroll the selected category into view
const scrollToSelectedCategory = () => {
  if (!props.modelValue || !componentRef.value) return
  
  // Try to find by data attribute first
  const selectedByData = componentRef.value.querySelector(`[data-category-id="${props.modelValue}"]`) as HTMLElement
  if (selectedByData) {
    selectedByData.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    })
    return
  }
  
  // Fallback: find by class
  const selectedByClass = componentRef.value.querySelector('.selected-category') as HTMLElement
  if (selectedByClass) {
    selectedByClass.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    })
  }
}

// Computed properties for selected category display
const selectedCategory = computed(() => {
  if (!props.modelValue) return null
  return props.categories.find(cat => cat.id === props.modelValue) || null
})

const selectedCategoryName = computed(() => {
  return selectedCategory.value?.displayName || '请选择分类'
})

const selectedCategoryIcon = computed(() => {
  return selectedCategory.value?.icon || 'mdi-tag'
})

const selectedCategoryColor = computed(() => {
  return selectedCategory.value?.color || '#757575'
})

// Watch for modelValue changes to manage expansion state
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    // If no category selected (new expense), keep collapsed
    isExpanded.value = false
    forceCloseAllGroups()
  }
}, { immediate: true })

// Watch for categories loading to ensure groups start closed
watch(() => props.categories, async (newCategories) => {
  if (newCategories.length > 0 && !props.modelValue) {
    // When categories load for new expense, ensure all groups are closed
    await nextTick()
    await forceCloseAllGroups()
  }
}, { immediate: false })

// Click outside handler to close the category tree
const handleClickOutside = (event: MouseEvent) => {
  if (componentRef.value && !componentRef.value.contains(event.target as Node)) {
    // Only close if expanded and a category is selected
    if (isExpanded.value && props.modelValue) {
      isExpanded.value = false
    }
  }
}

// Add/remove click outside listener
onMounted(async () => {
  document.addEventListener('click', handleClickOutside, true)
  
  // Ensure all groups start closed
  await nextTick()
  if (!props.modelValue) {
    await forceCloseAllGroups()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped>
.category-tree-selector {
  margin-bottom: 1rem;
}

.category-tree-card {
  max-height: 300px;
  overflow-y: auto;
  background-color: white !important;
  position: relative;
  z-index: 1;
}

.selected-category-card {
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white !important;
}

.selected-category-card:hover {
  background-color: #f5f5f5 !important;
}

.parent-category {
  background-color: #f5f5f5 !important;
  border-bottom: 1px solid #e0e0e0;
}

.parent-category-selectable {
  background-color: white !important;
}

.parent-category-selectable:hover,
.child-category:hover {
  background-color: #f0f0f0 !important;
}

.selected-category {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}

.child-category {
  border-left: 3px solid transparent;
  background-color: white !important;
}

.child-category.selected-category {
  border-left-color: #1976d2;
  background-color: #e3f2fd !important;
}

:deep(.v-list-group__items) {
  background-color: white !important;
}

:deep(.v-list-group__items .v-list-item) {
  padding-left: 0 !important;
  background-color: white !important;
}

:deep(.v-list-item) {
  background-color: white !important;
}

:deep(.v-list-item--active) {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}

/* Ensure dark theme compatibility */
:deep(.v-theme--dark .category-tree-card) {
  background-color: #2d2d2d !important;
}

:deep(.v-theme--dark .parent-category) {
  background-color: #404040 !important;
  border-bottom-color: #555;
}

:deep(.v-theme--dark .parent-category-selectable),
:deep(.v-theme--dark .child-category) {
  background-color: #2d2d2d !important;
}

:deep(.v-theme--dark .parent-category-selectable:hover),
:deep(.v-theme--dark .child-category:hover) {
  background-color: #404040 !important;
}

:deep(.v-theme--dark .selected-category) {
  background-color: #1565c0 !important;
  color: white !important;
}

:deep(.v-theme--dark .v-list-group__items) {
  background-color: #2d2d2d !important;
}

:deep(.v-theme--dark .v-list-group__items .v-list-item) {
  background-color: #2d2d2d !important;
}
</style>