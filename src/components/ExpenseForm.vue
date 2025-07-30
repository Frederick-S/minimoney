<template>
  <v-dialog 
    v-model="showForm" 
    max-width="400" 
    persistent
    :fullscreen="$vuetify.display.mobile"
  >
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>{{ props.expense ? '编辑支出' : '添加支出' }}</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="closeForm">
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
          
          <v-select
            v-model="category"
            :items="categoryOptions"
            item-title="text"
            item-value="value"
            label="分类"
            variant="outlined"
            class="mb-4"
            :loading="!categoriesLoaded"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
                <template #prepend>
                  <v-icon :icon="item.raw.icon" class="mr-2" />
                </template>
                <v-list-item-title>
                  {{ item.raw.level > 0 ? '　'.repeat(item.raw.level) + item.raw.text : item.raw.text }}
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-select>
          
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
import { type Expense, type ExpenseFormProps, type ExpenseFormEmits } from '../types'

const props = defineProps<ExpenseFormProps>()
const emit = defineEmits<ExpenseFormEmits>()

const { supabase } = useSupabase()
const { 
  categories, 
  categoriesLoaded, 
  categoryOptions, 
  loadCategories, 
  initializeUserCategories 
} = useCategories()

const showForm = ref(props.modelValue)
const amount = ref('')
const category = ref<string>('')
const date = ref('')
const note = ref('')

// Helper function to format date for input (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0]
}

// Load categories when component mounts
onMounted(async () => {
  if (categories.value.length === 0) {
    const loadedCategories = await loadCategories()
    // If no categories exist, initialize them for the user
    if (loadedCategories.length === 0) {
      await initializeUserCategories()
    }
  }
  
  // Set default category if none selected
  if (!category.value && categoryOptions.value.length > 0) {
    category.value = categoryOptions.value[0].value
  }
  
  // Set default date to today for new expenses
  if (!props.expense && !date.value) {
    date.value = getTodayDate()
  }
})

watch(() => props.modelValue, (newValue) => {
  showForm.value = newValue
  if (newValue && props.expense) {
    // Populate form with existing expense data
    amount.value = props.expense.amount.toString()
    category.value = props.expense.categoryId
    date.value = formatDateForInput(props.expense.date)
    note.value = props.expense.note || ''
  } else if (newValue && !props.expense) {
    // Set default date for new expense
    date.value = getTodayDate()
  }
})

watch(() => props.expense, (newExpense) => {
  if (newExpense) {
    amount.value = newExpense.amount.toString()
    category.value = newExpense.categoryId
    date.value = formatDateForInput(newExpense.date)
    note.value = newExpense.note || ''
  }
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
  // Reset to first available category
  if (categoryOptions.value.length > 0) {
    category.value = categoryOptions.value[0].value
  }
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