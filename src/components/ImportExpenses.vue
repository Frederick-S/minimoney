<template>
  <v-dialog v-model="showDialog" max-width="800" persistent scrollable>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>导入支出记录</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-6">
        <!-- Step 1: File Upload -->
        <div v-if="step === 1">
          <h3 class="text-h6 mb-4">步骤 1: 选择 CSV 文件</h3>
          <v-file-input
            v-model="file"
            label="选择 CSV 文件"
            accept=".csv"
            prepend-icon="mdi-file-delimited"
            variant="outlined"
            @change="handleFileSelect"
          />
          <v-alert v-if="parseError" type="error" class="mt-4">
            {{ parseError }}
          </v-alert>
        </div>

        <!-- Step 2: Column Mapping -->
        <div v-if="step === 2">
          <h3 class="text-h6 mb-4">步骤 2: 列映射</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">
            请将 CSV 文件的列映射到系统字段
          </p>
          
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="columnMapping.date"
                :items="csvColumns"
                label="日期 *"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="columnMapping.amount"
                :items="csvColumns"
                label="金额 *"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="columnMapping.category"
                :items="csvColumns"
                label="类别"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="columnMapping.subcategory"
                :items="csvColumns"
                label="子类别"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="columnMapping.note"
                :items="csvColumns"
                label="备注"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
          </v-row>

          <v-alert type="info" class="mt-4">
            预览前 3 行数据以验证映射
          </v-alert>
          <v-table density="compact" class="mt-2">
            <thead>
              <tr>
                <th>日期</th>
                <th>金额</th>
                <th>类别</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in previewRows" :key="idx">
                <td>{{ row.date }}</td>
                <td>¥{{ row.amount }}</td>
                <td>{{ row.category }}</td>
                <td>{{ row.note }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Step 3: Category Mapping -->
        <div v-if="step === 3">
          <h3 class="text-h6 mb-4">步骤 3: 分类映射</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">
            系统已自动匹配分类，请确认或手动选择未匹配的分类
          </p>

          <v-progress-linear v-if="processingCategories" indeterminate />

          <div v-else>
            <!-- Summary -->
            <v-alert type="info" class="mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-information</v-icon>
                <div>
                  <div class="font-weight-bold">
                    {{ unmatchedCategories.length }} 个分类需要确认，
                    {{ matchedCategories.length }} 个已自动匹配
                  </div>
                </div>
              </div>
            </v-alert>

            <!-- Unmatched categories first -->
            <div v-if="unmatchedCategories.length > 0">
              <h4 class="text-subtitle-1 font-weight-bold mb-3 text-warning">
                <v-icon>mdi-alert</v-icon>
                需要确认的分类 ({{ unmatchedCategories.length }})
              </h4>
              <v-list class="mb-4">
                <v-list-item
                  v-for="csvCategory in unmatchedCategories"
                  :key="csvCategory"
                  class="mb-2 bg-warning-lighten-5"
                >
                  <template #prepend>
                    <v-chip
                      color="warning"
                      size="small"
                      class="mr-2"
                    >
                      需确认
                    </v-chip>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    CSV: {{ csvCategory }}
                  </v-list-item-title>

                  <template #append>
                    <v-select
                      v-model="categoryMappings[csvCategory].systemCategoryId"
                      :items="flatCategories"
                      item-title="displayName"
                      item-value="id"
                      variant="outlined"
                      density="compact"
                      style="min-width: 200px"
                      :hint="`匹配度: ${categoryMappings[csvCategory].confidence}%`"
                      persistent-hint
                      placeholder="请选择分类"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </div>

            <!-- Matched categories (collapsible) -->
            <div v-if="matchedCategories.length > 0">
              <v-expansion-panels>
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <h4 class="text-subtitle-1 font-weight-bold text-success">
                      <v-icon>mdi-check-circle</v-icon>
                      已自动匹配的分类 ({{ matchedCategories.length }})
                    </h4>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list>
                      <v-list-item
                        v-for="csvCategory in matchedCategories"
                        :key="csvCategory"
                        class="mb-2"
                      >
                        <template #prepend>
                          <v-chip
                            color="success"
                            size="small"
                            class="mr-2"
                          >
                            已匹配
                          </v-chip>
                        </template>

                        <v-list-item-title>
                          CSV: {{ csvCategory }}
                        </v-list-item-title>

                        <template #append>
                          <v-select
                            v-model="categoryMappings[csvCategory].systemCategoryId"
                            :items="flatCategories"
                            item-title="displayName"
                            item-value="id"
                            variant="outlined"
                            density="compact"
                            style="min-width: 200px"
                            :hint="`匹配度: ${categoryMappings[csvCategory].confidence}%`"
                            persistent-hint
                          />
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </div>
        </div>

        <!-- Step 4: Confirm Import -->
        <div v-if="step === 4">
          <h3 class="text-h6 mb-4">步骤 4: 确认导入</h3>
          
          <v-alert type="info" class="mb-4">
            <div class="font-weight-bold">准备导入 {{ validRows.length }} 条记录</div>
            <div v-if="skippedRows > 0" class="text-caption text-warning">
              {{ skippedRows }} 条记录将被跳过（缺少日期或金额）
            </div>
          </v-alert>

          <v-progress-linear
            v-if="importing"
            :model-value="importProgress"
            height="25"
            color="primary"
          >
            <template #default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>

          <div v-if="importComplete" class="text-center py-4">
            <v-icon size="64" color="success">mdi-check-circle</v-icon>
            <h3 class="text-h6 mt-4">导入完成！</h3>
            <p class="text-body-2">成功导入 {{ importedCount }} 条记录</p>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-btn
          v-if="step > 1 && !importing && !importComplete"
          variant="text"
          @click="previousStep"
        >
          上一步
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="closeDialog" :disabled="importing">
          {{ importComplete ? '关闭' : '取消' }}
        </v-btn>
        <v-btn
          v-if="step < 4"
          color="primary"
          variant="flat"
          @click="nextStep"
          :disabled="!canProceed"
        >
          下一步
        </v-btn>
        <v-btn
          v-if="step === 4 && !importing && !importComplete"
          color="primary"
          variant="flat"
          @click="startImport"
        >
          开始导入
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCategories } from '../composables/useCategories'
import { useExpenseManagement } from '../composables/useExpenseManagement'
import { useToast } from '../composables/useToast'
import type { Category } from '../types'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { categories, loadCategories } = useCategories()
const { batchSaveExpenses, triggerRefresh } = useExpenseManagement()
const { showSuccess, showError } = useToast()

const showDialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const step = ref(1)
const file = ref<File | null>(null)
const parseError = ref('')
const csvColumns = ref<string[]>([])
const csvData = ref<any[]>([])

const columnMapping = ref({
  date: '',
  amount: '',
  category: '',
  subcategory: '',
  note: ''
})

const categoryMappings = ref<Record<string, {
  systemCategoryId: string
  matched: boolean
  confidence: number
}>>({})

const processingCategories = ref(false)
const importing = ref(false)
const importProgress = ref(0)
const importComplete = ref(false)
const importedCount = ref(0)

// Parse CSV file
const handleFileSelect = async () => {
  if (!file.value) return

  try {
    const text = await file.value.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      parseError.value = 'CSV 文件至少需要包含标题行和一行数据'
      return
    }

    // Parse header
    csvColumns.value = lines[0].split(',').map(col => col.trim())
    
    // Parse data rows
    csvData.value = lines.slice(1).map(line => {
      const values = line.split(',').map(val => val.trim())
      const row: any = {}
      csvColumns.value.forEach((col, idx) => {
        row[col] = values[idx] || ''
      })
      return row
    })

    parseError.value = ''
    
    // Auto-detect columns
    autoDetectColumns()
  } catch (error) {
    parseError.value = '文件解析失败，请确保文件格式正确'
    console.error('CSV parse error:', error)
  }
}

// Auto-detect column mapping
const autoDetectColumns = () => {
  const dateKeywords = ['日期', 'date', '时间']
  const amountKeywords = ['金额', 'amount', '支出金额', '支出']
  const categoryKeywords = ['类别', 'category', '分类']
  const subcategoryKeywords = ['子类', 'subcategory', '子类别']
  const noteKeywords = ['备注', 'note', '说明', 'remark']

  csvColumns.value.forEach(col => {
    const lower = col.toLowerCase()
    if (dateKeywords.some(k => lower.includes(k))) columnMapping.value.date = col
    if (amountKeywords.some(k => lower.includes(k))) columnMapping.value.amount = col
    if (categoryKeywords.some(k => lower.includes(k))) columnMapping.value.category = col
    if (subcategoryKeywords.some(k => lower.includes(k))) columnMapping.value.subcategory = col
    if (noteKeywords.some(k => lower.includes(k))) columnMapping.value.note = col
  })
}

// Preview rows
const previewRows = computed(() => {
  return csvData.value.slice(0, 3).map(row => ({
    date: row[columnMapping.value.date] || '',
    amount: row[columnMapping.value.amount] || '',
    category: [row[columnMapping.value.category], row[columnMapping.value.subcategory]]
      .filter(Boolean).join(' - '),
    note: row[columnMapping.value.note] || ''
  }))
})

// Flatten categories for selection
const flatCategories = computed(() => {
  const result: Array<Category & { displayName: string }> = []
  
  categories.value.forEach(cat => {
    if (cat.level === 0) {
      result.push({ ...cat, displayName: cat.displayName })
      // Add children
      const children = categories.value.filter(c => c.parentId === cat.id)
      children.forEach(child => {
        result.push({ ...child, displayName: `${cat.displayName} - ${child.displayName}` })
      })
    }
  })
  
  return result
})

// Match categories
const matchCategories = async () => {
  processingCategories.value = true
  
  // Get unique categories from CSV
  const uniqueCategories = new Set<string>()
  csvData.value.forEach(row => {
    const cat = row[columnMapping.value.category]
    const subcat = row[columnMapping.value.subcategory]
    if (cat) uniqueCategories.add(cat)
    if (subcat) uniqueCategories.add(`${cat}-${subcat}`)
  })

  // Match each category
  for (const csvCat of uniqueCategories) {
    const match = findBestCategoryMatch(csvCat)
    categoryMappings.value[csvCat] = match
  }

  processingCategories.value = false
}

// Find best matching category
const findBestCategoryMatch = (csvCategory: string): {
  systemCategoryId: string
  matched: boolean
  confidence: number
} => {
  let bestMatch: Category | null = null
  let bestScore = 0

  const csvLower = csvCategory.toLowerCase()
  const parts = csvCategory.split('-').map(p => p.trim())

  categories.value.forEach(cat => {
    let score = 0
    
    // Exact match
    if (cat.displayName === csvCategory || cat.name === csvCategory) {
      score = 100
    }
    // Contains match
    else if (cat.displayName.includes(csvCategory) || csvCategory.includes(cat.displayName)) {
      score = 80
    }
    // Partial match
    else if (parts.some(part => cat.displayName.includes(part) || cat.name.includes(part))) {
      score = 60
    }
    // Fuzzy match
    else {
      const catLower = cat.displayName.toLowerCase()
      if (catLower.includes(csvLower) || csvLower.includes(catLower)) {
        score = 40
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = cat
    }
  })

  return {
    systemCategoryId: bestMatch?.id || '',
    matched: bestScore >= 60,
    confidence: bestScore
  }
}

// Valid rows for import
const validRows = computed(() => {
  return csvData.value.filter(row => {
    const date = row[columnMapping.value.date]
    const amount = row[columnMapping.value.amount]
    return date && amount && parseFloat(amount) > 0
  })
})

const skippedRows = computed(() => {
  return csvData.value.length - validRows.value.length
})

// Separate matched and unmatched categories
const unmatchedCategories = computed(() => {
  return Object.keys(categoryMappings.value)
    .filter(key => !categoryMappings.value[key].matched)
    .sort()
})

const matchedCategories = computed(() => {
  return Object.keys(categoryMappings.value)
    .filter(key => categoryMappings.value[key].matched)
    .sort((a, b) => {
      // Sort by confidence descending
      return categoryMappings.value[b].confidence - categoryMappings.value[a].confidence
    })
})

// Can proceed to next step
const canProceed = computed(() => {
  if (step.value === 1) return file.value && csvData.value.length > 0
  if (step.value === 2) return columnMapping.value.date && columnMapping.value.amount
  if (step.value === 3) {
    return Object.values(categoryMappings.value).every(m => m.systemCategoryId)
  }
  return true
})

// Navigation
const nextStep = async () => {
  if (step.value === 2) {
    await loadCategories()
    await matchCategories()
  }
  step.value++
}

const previousStep = () => {
  step.value--
}

// Import expenses
const startImport = async () => {
  importing.value = true
  importProgress.value = 0
  importedCount.value = 0

  const expensesToImport: Array<Omit<Expense, 'id'>> = []
  
  // Prepare all expenses
  for (const row of validRows.value) {
    const cat = row[columnMapping.value.category]
    const subcat = row[columnMapping.value.subcategory]
    const csvCat = subcat ? `${cat}-${subcat}` : cat
    
    const categoryId = categoryMappings.value[csvCat]?.systemCategoryId || 
                      categoryMappings.value[cat]?.systemCategoryId

    if (!categoryId) continue

    expensesToImport.push({
      amount: parseFloat(row[columnMapping.value.amount]),
      categoryId,
      date: row[columnMapping.value.date],
      note: row[columnMapping.value.note] || undefined
    })
  }

  // Import in batches of 100 (Supabase can handle this efficiently)
  const batchSize = 100
  const totalBatches = Math.ceil(expensesToImport.length / batchSize)
  
  for (let i = 0; i < expensesToImport.length; i += batchSize) {
    const batch = expensesToImport.slice(i, i + batchSize)
    const currentBatch = Math.floor(i / batchSize) + 1
    
    try {
      // Skip refresh for each batch
      const result = await batchSaveExpenses(batch, true)
      importedCount.value += result.success
      
      // Update progress
      importProgress.value = (currentBatch / totalBatches) * 100
    } catch (error) {
      console.error('Batch import error:', error)
    }
  }

  importing.value = false
  importComplete.value = true
  
  // Trigger single refresh after all batches are complete
  if (importedCount.value > 0) {
    triggerRefresh()
  }
  
  showSuccess(`成功导入 ${importedCount.value} 条记录`)
}

const closeDialog = () => {
  if (importing.value) return
  
  // Reset state
  step.value = 1
  file.value = null
  csvData.value = []
  csvColumns.value = []
  columnMapping.value = {
    date: '',
    amount: '',
    category: '',
    subcategory: '',
    note: ''
  }
  categoryMappings.value = {}
  importing.value = false
  importComplete.value = false
  importedCount.value = 0
  importProgress.value = 0
  
  showDialog.value = false
}

// Load categories when dialog opens
watch(showDialog, async (newValue) => {
  if (newValue) {
    await loadCategories()
  }
})
</script>
