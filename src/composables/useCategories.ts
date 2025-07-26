import { computed } from 'vue'

// Category configuration
export const CATEGORIES = {
  Food: '餐饮',
  Transport: '交通', 
  Shopping: '购物',
  Entertainment: '娱乐',
  Other: '其他'
} as const

export type CategoryKey = keyof typeof CATEGORIES

// Category options for form inputs
export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, text]) => ({
  text,
  value: value as CategoryKey
}))

// Category colors for UI
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  Food: 'orange',
  Transport: 'blue', 
  Shopping: 'pink',
  Entertainment: 'purple',
  Other: 'grey'
}

// Chart.js color mapping
export const CHART_COLORS: Record<CategoryKey, string> = {
  Food: '#FF9800',
  Transport: '#2196F3',
  Shopping: '#E91E63', 
  Entertainment: '#9C27B0',
  Other: '#757575'
}

/**
 * Composable for category-related functionality
 */
export function useCategories() {
  
  /**
   * Get the display name for a category
   */
  const getCategoryName = (category: CategoryKey): string => {
    return CATEGORIES[category] || category
  }

  /**
   * Get the color for a category
   */
  const getCategoryColor = (category: CategoryKey): string => {
    return CATEGORY_COLORS[category] || 'grey'
  }

  /**
   * Get the chart color for a category
   */
  const getCategoryChartColor = (category: CategoryKey): string => {
    return CHART_COLORS[category] || '#757575'
  }

  return {
    CATEGORIES,
    CATEGORY_OPTIONS,
    CATEGORY_COLORS,
    CHART_COLORS,
    getCategoryName,
    getCategoryColor,
    getCategoryChartColor
  }
}
