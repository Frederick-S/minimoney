# Dynamic Category Management System Design

## Current State Analysis

### Static Implementation
- **Categories**: 5 hardcoded categories (Food, Transport, Shopping, Entertainment, Other)
- **Structure**: English keys with Chinese display names
- **Colors**: Predefined UI colors and chart colors
- **Database**: Simple TEXT field in expenses table
- **Location**: `src/composables/useCategories.ts`

### Chart Integration
- **ChartsView.vue**: Uses RPC aggregation, period filtering
- **CategoryChart.vue**: Chart.js doughnut chart with static color mapping
- **CategoryDetails.vue**: List view with static category name resolution
- **Issue**: All components depend on static `CategoryKey` enum

## Proposed Dynamic System

### 1. Database Schema

#### Categories Table (with Hierarchical Support)
```sql
-- System-wide category templates (admin managed)
CREATE TABLE system_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES system_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'grey',
    chart_color TEXT NOT NULL DEFAULT '#757575',
    icon TEXT DEFAULT 'mdi-folder',
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    path TEXT,
    is_active BOOLEAN DEFAULT TRUE,         -- Enable/disable categories
    locale TEXT DEFAULT 'zh_CN',           -- Support multiple languages
    category_set TEXT DEFAULT 'default',   -- Different sets for different user types
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, parent_id, category_set),
    CHECK (level >= 0 AND level <= 3),
    CHECK (parent_id != id)
);

-- User-specific categories (copied from system + user customizations)
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    system_category_id UUID REFERENCES system_categories(id) ON DELETE SET NULL, -- Track origin
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'grey',
    chart_color TEXT NOT NULL DEFAULT '#757575',
    icon TEXT DEFAULT 'mdi-folder',
    is_default BOOLEAN DEFAULT FALSE,       -- Copied from system vs user-created
    is_system_managed BOOLEAN DEFAULT FALSE, -- Auto-update from system changes
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, name, parent_id),
    CHECK (level >= 0 AND level <= 3),
    CHECK (parent_id != id)
);
```

#### System Category Benefits
- **Template-driven**: Copy from `system_categories` to user `categories`
- **Admin control**: Update system templates without code deployment
- **Multi-locale**: Different category sets per language/region
- **Versioning**: Track system updates and offer to existing users
- **Flexibility**: Multiple category sets (basic, advanced, business, etc.)

#### Clean Schema Design
- Direct `category_id UUID` reference in expenses table
- No legacy `category TEXT` field needed
- Clean foreign key relationships from the start

### 2. UI Components

#### Category Management Interface
- **CategoryManager.vue**: Hierarchical CRUD interface
  - Tree view of categories with expand/collapse
  - Add subcategories under any parent
  - Drag-and-drop between hierarchy levels
  - Edit/Delete categories (with subcategory handling)
  - Color/icon inheritance from parent
  - Bulk operations with hierarchy awareness

#### Hierarchical Form Components
- **CategoryForm.vue**: Add/Edit with parent selection
- **CategoryTreePicker.vue**: Hierarchical category selector for expenses
- **CategoryTree.vue**: Reusable tree component with expand/collapse
- **ParentSelector.vue**: Parent category selection dropdown

### 3. Updated Composables

#### Enhanced useCategories.ts
```typescript
export function useCategories() {
  // Hierarchical category data
  const categories = ref<Category[]>([])
  const categoryTree = ref<CategoryNode[]>([])
  const loading = ref(false)
  
  // CRUD operations with hierarchy support
  const loadCategories = async () => { /* Load flat list */ }
  const loadCategoryTree = async () => { /* Load hierarchical tree */ }
  const createCategory = async (category: CreateCategoryData) => { /* Handle parent_id */ }
  const updateCategory = async (id: string, updates: UpdateCategoryData) => { /* Update with hierarchy */ }
  const deleteCategory = async (id: string, deleteChildren = false) => { /* Handle cascading */ }
  const moveCategory = async (id: string, newParentId: string | null) => { /* Change parent */ }
  const reorderCategories = async (categoryIds: string[], parentId?: string) => { /* Reorder within level */ }
  
  // Hierarchy helpers
  const getCategoryPath = (categoryId: string) => { /* Get full path */ }
  const getCategoryChildren = (parentId: string) => { /* Get direct children */ }
  const getCategoryDescendants = (parentId: string) => { /* Get all descendants */ }
  const getCategoryAncestors = (categoryId: string) => { /* Get parent chain */ }
  const buildCategoryTree = (categories: Category[]) => { /* Build tree structure */ }
  
  // Dynamic getters (with hierarchy awareness)
  const getCategoryById = (id: string) => { /* ... */ }
  const getCategoryColor = (id: string, inheritFromParent = true) => { /* ... */ }
  const getCategoryIcon = (id: string, inheritFromParent = true) => { /* ... */ }
  
  return {
    categories,
    categoryTree,
    loading,
    loadCategories,
    loadCategoryTree,
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    reorderCategories,
    getCategoryPath,
    getCategoryChildren,
    getCategoryDescendants,
    getCategoryAncestors,
    buildCategoryTree,
    getCategoryById,
    getCategoryColor,
    getCategoryIcon
  }
}

interface CategoryNode extends Category {
  children: CategoryNode[]
  depth: number
  hasChildren: boolean
}
```

### 4. Chart Component Updates

#### Enhanced CategoryBreakdownData (with Hierarchy)
```typescript
export interface CategoryBreakdownData {
  category_id: string           // UUID instead of string key
  category_name: string         // Internal name
  category_display_name: string // User-visible name  
  category_color: string        // UI color
  category_chart_color: string  // Chart hex color
  category_icon: string         // Icon identifier
  parent_id: string | null      // Parent category ID
  level: number                 // Hierarchy depth
  path: string                  // Full category path
  amount: number
  count: number
  percentage: number
}
```

#### Hierarchical Chart Options
- **Flat view**: All categories at same level (current behavior)
- **Grouped view**: Parent categories with subcategory breakdown
- **Drill-down**: Click parent to show subcategory details
- **Aggregated view**: Roll up subcategories into parent totals

#### Updated Chart Components
- **CategoryChart.vue**: Use dynamic color mapping from category data
- **CategoryDetails.vue**: Display dynamic category names and colors
- **TrendChart.vue**: Support dynamic category colors

### 5. RPC Function Updates

#### Enhanced Category Breakdown RPC (with Hierarchy)
```sql
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_include_subcategories BOOLEAN DEFAULT TRUE,
  p_group_by_parent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_display_name TEXT,
  category_color TEXT,
  category_chart_color TEXT,
  category_icon TEXT,
  parent_id UUID,
  level INTEGER,
  path TEXT,
  amount DECIMAL,
  count BIGINT,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_hierarchy AS (
    -- Get all categories for the user
    SELECT 
      c.id, c.name, c.display_name, c.color, c.chart_color, c.icon,
      c.parent_id, c.level, c.path, c.sort_order
    FROM categories c
    WHERE c.user_id = p_user_id
  ),
  expense_totals AS (
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.display_name as category_display_name,
      c.color as category_color,
      c.chart_color as category_chart_color,
      c.icon as category_icon,
      c.parent_id,
      c.level,
      c.path,
      COALESCE(SUM(e.amount), 0) as amount,
      COUNT(e.id) as count
    FROM category_hierarchy c
    LEFT JOIN expenses e ON e.category_id = c.id 
      AND e.user_id = p_user_id 
      AND e.date BETWEEN p_start_date AND p_end_date
    GROUP BY c.id, c.name, c.display_name, c.color, c.chart_color, c.icon, c.parent_id, c.level, c.path
  ),
  -- Optionally aggregate subcategories into parents
  aggregated_totals AS (
    SELECT 
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN et.parent_id
        ELSE et.category_id 
      END as category_id,
      -- Use parent info if grouping, otherwise use category info
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN 
          (SELECT name FROM category_hierarchy WHERE id = et.parent_id)
        ELSE et.category_name 
      END as category_name,
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN 
          (SELECT display_name FROM category_hierarchy WHERE id = et.parent_id)
        ELSE et.category_display_name 
      END as category_display_name,
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN 
          (SELECT color FROM category_hierarchy WHERE id = et.parent_id)
        ELSE et.category_color 
      END as category_color,
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN 
          (SELECT chart_color FROM category_hierarchy WHERE id = et.parent_id)
        ELSE et.category_chart_color 
      END as category_chart_color,
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN 
          (SELECT icon FROM category_hierarchy WHERE id = et.parent_id)
        ELSE et.category_icon 
      END as category_icon,
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN 
          (SELECT parent_id FROM category_hierarchy WHERE id = et.parent_id)
        ELSE et.parent_id 
      END as parent_id,
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN 
          (SELECT level FROM category_hierarchy WHERE id = et.parent_id)
        ELSE et.level 
      END as level,
      CASE 
        WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN 
          (SELECT path FROM category_hierarchy WHERE id = et.parent_id)
        ELSE et.path 
      END as path,
      SUM(et.amount) as amount,
      SUM(et.count) as count
    FROM expense_totals et
    GROUP BY 
      CASE WHEN p_group_by_parent AND et.parent_id IS NOT NULL THEN et.parent_id ELSE et.category_id END,
      category_name, category_display_name, category_color, category_chart_color, 
      category_icon, parent_id, level, path
  ),
  total_amount AS (
    SELECT COALESCE(SUM(amount), 0) as total FROM aggregated_totals WHERE amount > 0
  )
  SELECT 
    at.category_id,
    at.category_name,
    at.category_display_name,
    at.category_color,
    at.category_chart_color,
    at.category_icon,
    at.parent_id,
    at.level,
    at.path,
    at.amount,
    at.count,
    CASE 
      WHEN ta.total > 0 THEN ROUND((at.amount / ta.total * 100), 2)
      ELSE 0 
    END as percentage
  FROM aggregated_totals at, total_amount ta
  WHERE at.amount > 0
  ORDER BY at.amount DESC;
END;
$$ LANGUAGE plpgsql;
```

### 6. Clean Development Deployment

#### Simple Setup (No Migration Needed)
1. **Drop and recreate tables** - Fresh schema design
2. **Create new category and expenses tables** with proper relationships  
3. **Seed default categories** for existing users
4. **Update all components** to use new schema
5. **Deploy as single update** - no backward compatibility needed

#### Fresh Database Schema
```sql
-- Clean expenses table with category relationship
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL,
    note TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. User Experience Improvements

#### Hierarchical Default Categories
- **Parent categories**: Food, Transport, Shopping, Entertainment, Other
- **Example subcategories**:
  - Food → Restaurant, Groceries, Takeout, Coffee
  - Transport → Gas, Public Transit, Taxi/Uber, Parking
  - Shopping → Clothing, Electronics, Home, Books
  - Entertainment → Movies, Games, Sports, Travel
- **Inheritance**: Subcategories inherit parent colors unless customized

#### Advanced Hierarchy Features
- **Category breadcrumbs**: Show full path (Food > Restaurant > FastFood)
- **Expense rollup**: View expenses at any hierarchy level
- **Smart suggestions**: Suggest subcategories based on expense patterns
- **Bulk operations**: Move multiple subcategories between parents
- **Search & filter**: Find categories by name or path

#### Mobile Optimizations
- **Collapsible tree**: Tap to expand/collapse category groups
- **Swipe actions**: Quick add subcategory, edit, delete
- **Hierarchy navigation**: Breadcrumb navigation for deep structures
- **Quick parent selection**: Recently used parents for faster categorization

### 8. Technical Considerations

#### Performance
- Index category lookups by user_id
- Cache category data in frontend
- Batch category operations
- Optimize RPC queries

#### Security
- Row-level security for categories
- Validate category ownership
- Prevent unauthorized category access
- Audit category changes

## Implementation Priority

1. **High Priority**
   - Clean database schema (drop/recreate)
   - Updated RPC functions
   - Basic category CRUD operations
   - Chart component updates

2. **Medium Priority**
   - Category management UI
   - Enhanced expense forms
   - Category reordering
   - Color/icon customization

3. **Low Priority**
   - Advanced category features
   - Category analytics
   - Import/export functionality
   - Category groups/subcategories