import { ref, computed } from 'vue'
import { useSupabase } from './useSupabase'
import { type Category } from '../types'

// Helper functions for camelCase conversion (same as in useExpenseManagement)
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

const convertKeysToCamelCase = <T extends Record<string, any>>(obj: any): T => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item)) as unknown as T
  }
  
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    result[camelKey] = convertKeysToCamelCase(value)
  }
  return result
}

// Global reactive state for categories
const categories = ref<Category[]>([])
const categoriesLoaded = ref(false)

/**
 * Composable for dynamic category management
 */
export function useCategories() {
  const { user, supabase } = useSupabase()

  /**
   * Load user categories from database
   */
  const loadCategories = async (): Promise<Category[]> => {
    if (!user.value) return []

    try {
      const { data, error } = await supabase.rpc('get_category_tree', {
        p_user_id: user.value.id
      })

      if (error) {
        console.error('Error loading categories:', error)
        throw new Error('加载分类失败')
      }

      const convertedCategories = convertKeysToCamelCase<Category[]>(data || [])
      categories.value = convertedCategories
      categoriesLoaded.value = true
      return convertedCategories
    } catch (error) {
      console.error('Error loading category breakdown:', error)
      throw new Error('加载分类统计失败')
    }
  }

  /**
   * Initialize categories for new user (copy from system templates)
   */
  const initializeUserCategories = async () => {
    if (!user.value) return

    try {
      const { error } = await supabase.rpc('create_categories_for_new_user', {
        user_uuid: user.value.id,
        p_category_set: 'default',
        p_locale: 'zh_CN'
      })

      if (error) {
        console.error('Error initializing user categories:', error)
        throw new Error('初始化用户分类失败')
      }

      // Load the newly created categories
      await loadCategories()
    } catch (error) {
      console.error('Error initializing user categories:', error)
      throw new Error('初始化用户分类失败')
    }
  }

  /**
   * Get category by ID
   */
  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.value.find(cat => cat.id === categoryId)
  }

  /**
   * Get the display name for a category
   */
  const getCategoryDisplayName = (categoryId: string): string => {
    const category = getCategoryById(categoryId)
    return category?.displayName || category?.name || 'Unknown'
  }

  /**
   * Get the color for a category
   */
  const getCategoryColor = (categoryId: string): string => {
    const category = getCategoryById(categoryId)
    return category?.color || '#757575'
  }

  /**
   * Get the chart color for a category
   */
  const getCategoryChartColor = (categoryId: string): string => {
    const category = getCategoryById(categoryId)
    return category?.chartColor || '#757575'
  }



  /**
   * Get top-level categories (level 0)
   */
  const topLevelCategories = computed(() => {
    return categories.value.filter(cat => cat.level === 0)
  })

  /**
   * Get subcategories for a parent category
   */
  const getSubcategories = (parentId: string): Category[] => {
    return categories.value.filter(cat => cat.parentId === parentId)
  }

  return {
    categories,
    categoriesLoaded,
    topLevelCategories,
    loadCategories,
    initializeUserCategories,
    getCategoryById,
    getCategoryDisplayName,
    getCategoryColor,
    getCategoryChartColor,
    getSubcategories
  }
}
