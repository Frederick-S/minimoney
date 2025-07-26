<template>
  <v-dialog 
    v-model="showForm" 
    max-width="400" 
    persistent
    :fullscreen="$vuetify.display.mobile"
  >
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>添加支出</v-toolbar-title>
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
          :disabled="!amount"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Expense {
  id: string
  amount: number
  category: string
  date: string
  note?: string
}

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', expense: Omit<Expense, 'id'>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showForm = ref(props.modelValue)
const amount = ref('')
const category = ref('Food')
const note = ref('')

const categoryOptions = [
  { text: '餐饮', value: 'Food' },
  { text: '交通', value: 'Transport' },
  { text: '购物', value: 'Shopping' },
  { text: '娱乐', value: 'Entertainment' },
  { text: '其他', value: 'Other' }
]

watch(() => props.modelValue, (newValue) => {
  showForm.value = newValue
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
  category.value = 'Food'
}

const handleSave = () => {
  if (!amount.value) return
  
  const expenseData = {
    amount: parseFloat(amount.value),
    category: category.value,
    date: new Date().toISOString(),
    note: note.value.trim() || undefined
  }
  
  emit('save', expenseData)
  closeForm()
}
</script>