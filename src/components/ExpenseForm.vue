<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50" @click="$emit('close')">
        <div 
          class="w-full max-w-md bg-background rounded-t-3xl p-6 h-[80vh] flex flex-col"
          @click.stop
        >
          <div class="pb-6">
            <h2 class="text-xl font-semibold">
              {{ editingExpense ? "编辑支出" : "添加支出" }}
            </h2>
          </div>

          <div class="space-y-6 flex-1">
            <div class="space-y-2">
              <Label for="amount" class="text-base font-medium">
                金额 *
              </Label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ¥
                </span>
                <Input
                  id="amount"
                  v-model="amount"
                  placeholder="0.00"
                  class="pl-8 text-lg h-12"
                  inputmode="decimal"
                  @input="handleAmountChange"
                />
              </div>
            </div>

            <div class="space-y-3">
              <Label class="text-base font-medium">分类 *</Label>
              <div class="grid grid-cols-2 gap-3">
                <div
                  v-for="cat in categories"
                  :key="cat.value"
                  class="transition-transform duration-100 active:scale-95"
                >
                  <Button
                    variant="ghost"
                    @click="category = cat.value"
                    :class="[
                      'h-12 w-full justify-center relative border-2 transition-all duration-200',
                      category === cat.value 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50',
                      getCategoryColor(cat.value)
                    ]"
                  >
                    {{ cat.name }}
                    <Check 
                      v-if="category === cat.value"
                      :size="16" 
                      class="absolute right-2 text-primary" 
                    />
                  </Button>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <Label for="note" class="text-base font-medium">
                备注
              </Label>
              <Textarea
                id="note"
                v-model="note"
                placeholder="可选备注..."
                class="min-h-20 resize-none"
              />
            </div>
          </div>

          <div class="pt-6">
            <div class="grid grid-cols-2 gap-3 w-full">
              <Button variant="outline" @click="$emit('close')" class="h-12">
                取消
              </Button>
              <Button 
                @click="handleSave" 
                :disabled="!amount || !category"
                class="h-12"
              >
                {{ editingExpense ? "更新" : "保存" }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from "@/components/ui/button.vue"
import Input from "@/components/ui/input.vue"
import Label from "@/components/ui/label.vue"
import Textarea from "@/components/ui/textarea.vue"
import { Check } from "@phosphor-icons/vue"

interface Expense {
  id: string
  amount: number
  category: string
  note?: string
  date: string
}

interface Props {
  isOpen: boolean
  editingExpense?: Expense | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  save: [expense: Omit<Expense, 'id'>]
}>()

const amount = ref("")
const category = ref("")
const note = ref("")

const categories = [
  { name: "餐饮", value: "Food" },
  { name: "交通", value: "Transport" },
  { name: "购物", value: "Shopping" },
  { name: "娱乐", value: "Entertainment" },
  { name: "医疗", value: "Health" },
  { name: "账单", value: "Bills" },
  { name: "其他", value: "Other" }
]

const categoryColors = {
  Food: "bg-red-100 text-red-800 hover:bg-red-200",
  Transport: "bg-blue-100 text-blue-800 hover:bg-blue-200", 
  Shopping: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  Entertainment: "bg-green-100 text-green-800 hover:bg-green-200",
  Health: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  Bills: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  Other: "bg-slate-100 text-slate-800 hover:bg-slate-200"
}

const getCategoryColor = (value: string) => {
  return categoryColors[value as keyof typeof categoryColors] || categoryColors.Other
}

watch([() => props.editingExpense, () => props.isOpen], () => {
  if (props.editingExpense) {
    amount.value = props.editingExpense.amount.toString()
    category.value = props.editingExpense.category
    note.value = props.editingExpense.note || ""
  } else {
    amount.value = ""
    category.value = ""
    note.value = ""
  }
})

const handleSave = () => {
  if (!amount.value || !category.value) return

  const expenseData = {
    amount: parseFloat(amount.value),
    category: category.value,
    note: note.value.trim() || undefined,
    date: props.editingExpense?.date || new Date().toISOString()
  }

  emit('save', expenseData)
  amount.value = ""
  category.value = ""
  note.value = ""
}

const handleAmountChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value
  
  // Only allow numbers and one decimal point
  const sanitized = value.replace(/[^\d.]/g, '')
  const parts = sanitized.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts[1]
  }
  if (parts[1] && parts[1].length > 2) {
    value = parts[0] + '.' + parts[1].substring(0, 2)
  }
  
  amount.value = value
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-background,
.modal-leave-active .bg-background {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-background {
  transform: translateY(100%);
}

.modal-leave-to .bg-background {
  transform: translateY(100%);
}
</style>