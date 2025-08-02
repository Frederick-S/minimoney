<template>
  <v-dialog 
    v-model="showForm" 
    max-width="400" 
    persistent
    :fullscreen="$vuetify.display.mobile"
  >
    <v-card>
      <v-toolbar color="primary" dark style="position: relative; z-index: 10;">
        <v-toolbar-title>{{ props.expense ? '编辑支出' : '添加支出' }}</v-toolbar-title>
        <v-spacer />
        <v-btn 
          icon 
          @click="closeForm"
          style="z-index: 11; position: relative;"
          data-testid="close-button"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-6">
        <v-form @submit.prevent="handleSave">
          <v-text-field
            v-model="amount"
            label="金额"
            type="number"
            step="0.01"
            min="0"
            prefix="¥"
            variant="outlined"
            :rules="[v => !!v || '请输入金额']"
            required
            class="mb-4"
          />
          
          <CategoryTreeSelector
            v-model="category"
            :categories="categories"
            :loading="!categoriesLoaded"
            @select="onCategorySelected"
          />
          
          <v-text-field
            v-model="date"
            label="日期"
            type="date"
            variant="outlined"
            class="mb-4"
            :rules="[v => !!v || '请选择日期']"
            required
          />
          
          <v-textarea
            v-model="note"
            label="备注"
            variant="outlined"
            rows="3"
            no-resize
            placeholder="添加备注信息..."
            class="mb-4"
          />
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn 
          variant="outlined" 
          @click="closeForm"
          class="mr-2"
          data-testid="cancel-button"
        >
          取消
        </v-btn>
        <v-btn 
          color="primary"
          variant="flat"
          @click="handleSave"
          :disabled="!amount || !category || !date"
        >
          {{ props.expense ? '更新' : '保存' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, onMounted } from 'vue'
import { useSupabase } from '../composables/useSupabase'
import { useCategories } from '../composables/useCategories'
import CategoryTreeSelector from './CategoryTreeSelector.vue'
import { type Expense, type ExpenseFormProps, type ExpenseFormEmits, type Category } from '../types'

const props = defineProps<ExpenseFormProps>()
const emit = defineEmits<ExpenseFormEmits>()

const { supabase } = useSupabase()
const { 
  categories, 
  categoriesLoaded, 
  loadCategories, 
  initializeUserCategories 
} = useCategories()

// Helper function to format date for input (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0]
}

const showForm = ref(props.modelValue)
const amount = ref('')
const category = ref<string>('')
const date = ref('')
const note = ref('')

// Initialize form data based on props
const initializeForm = () => {
  if (props.expense) {
    // Expense should now always have camelCase properties after conversion
    const categoryId = props.expense.categoryId
    
    amount.value = props.expense.amount?.toString() || ''
    category.value = categoryId || ''
    date.value = formatDateForInput(props.expense.date)
    note.value = props.expense.note || ''
    

  } else {
    // New expense - reset to defaults
    amount.value = ''
    category.value = ''
    date.value = getTodayDate()
    note.value = ''
    

  }
}

// Initialize on mount
initializeForm()



// Load categories when component mounts
onMounted(async () => {
  if (categories.value.length === 0) {
    const loadedCategories = await loadCategories()
    // If no categories exist, initialize them for the user
    if (loadedCategories.length === 0) {
      await initializeUserCategories()
    }
  }
  
  // Note: Category is now initialized directly from props.expense.categoryId
  
  // Set default date to today for new expenses
  if (!props.expense && !date.value) {
    date.value = getTodayDate()
  }
})

// Watch for form visibility changes
watch(() => props.modelValue, (newValue) => {
  showForm.value = newValue
  if (newValue) {
    // Re-initialize form data when dialog opens
    initializeForm()
  }
})

// Watch for expense changes (when editing different expenses)
watch(() => props.expense, () => {
  initializeForm()
})

watch(showForm, (newValue) => {
  emit('update:modelValue', newValue)
})

const closeForm = () => {
  showForm.value = false
  resetForm()
}

const resetForm = () => {
  amount.value = ''
  note.value = ''
  date.value = getTodayDate()
  // Clear category selection for new expenses
  category.value = ''
}

const onCategorySelected = (selectedCategory: Category) => {
  // Category is already set by v-model, but we can add additional logic here if needed
}

const handleSave = () => {
  if (!amount.value || !category.value || !date.value) return
  
  const expenseData = {
    amount: parseFloat(amount.value),
    categoryId: category.value,
    date: date.value + 'T00:00:00.000Z', // Convert YYYY-MM-DD to ISO string
    note: note.value.trim() || undefined
  }
  
  if (props.expense) {
    // Emit update event with the expense id
    emit('update', { ...expenseData, id: props.expense.id })
  } else {
    // Emit save event for new expense
    emit('save', expenseData)
  }
  
  closeForm()
}


</script>