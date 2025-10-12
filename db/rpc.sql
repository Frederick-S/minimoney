-- RPC (Remote Procedure Call) functions for MiniMoney expense tracking app
-- These functions provide server-side aggregation to reduce client-side calculations

-- 1. Get today's expenses sum for a specific user and date
CREATE OR REPLACE FUNCTION get_today_expenses_sum(
  p_user_id UUID,
  p_date DATE
) RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) 
     FROM expenses 
     WHERE user_id = p_user_id 
       AND date::date = p_date),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1b. Get daily totals for a list of dates
CREATE OR REPLACE FUNCTION get_daily_totals(
  p_user_id UUID,
  p_dates DATE[]
) RETURNS TABLE(
  date DATE,
  total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.date,
    COALESCE(SUM(e.amount), 0) as total
  FROM expenses e
  WHERE e.user_id = p_user_id 
    AND e.date = ANY(p_dates)
  GROUP BY e.date
  ORDER BY e.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get category breakdown for a specific period
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  category_id UUID,
  category_name TEXT,
  category_display_name TEXT,
  category_color TEXT,
  amount NUMERIC,
  count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_amount NUMERIC;
BEGIN
  -- Calculate total amount for percentage calculation
  SELECT COALESCE(SUM(e.amount), 0) INTO total_amount
  FROM expenses e
  WHERE e.user_id = p_user_id 
    AND e.date >= p_start_date 
    AND e.date <= p_end_date;

  -- Return category breakdown with percentage
  RETURN QUERY
  SELECT 
    c.id as category_id,
    c.name as category_name,
    c.display_name as category_display_name,
    c.chart_color as category_color,
    COALESCE(SUM(e.amount), 0) as amount,
    COUNT(*)::BIGINT as count,
    CASE 
      WHEN total_amount > 0 THEN 
        GREATEST(
          ROUND((COALESCE(SUM(e.amount), 0) / total_amount * 100), 2),
          CASE WHEN COALESCE(SUM(e.amount), 0) > 0 THEN 0.01 ELSE 0 END
        )
      ELSE 0
    END as percentage
  FROM expenses e
  JOIN categories c ON e.category_id = c.id
  WHERE e.user_id = p_user_id 
    AND e.date >= p_start_date 
    AND e.date <= p_end_date
    AND c.user_id = p_user_id
  GROUP BY c.id, c.name, c.display_name, c.chart_color
  ORDER BY SUM(e.amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get monthly trend data for a specific year
CREATE OR REPLACE FUNCTION get_monthly_trend(
  p_user_id UUID,
  p_year INTEGER
) RETURNS TABLE(
  month INTEGER,
  month_label TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      month_num,
      CASE month_num
        WHEN 1 THEN '1月'
        WHEN 2 THEN '2月'
        WHEN 3 THEN '3月'
        WHEN 4 THEN '4月'
        WHEN 5 THEN '5月'
        WHEN 6 THEN '6月'
        WHEN 7 THEN '7月'
        WHEN 8 THEN '8月'
        WHEN 9 THEN '9月'
        WHEN 10 THEN '10月'
        WHEN 11 THEN '11月'
        WHEN 12 THEN '12月'
      END as month_name
    FROM generate_series(1, 12) as month_num
  )
  SELECT 
    m.month_num as month,
    m.month_name as month_label,
    COALESCE(SUM(e.amount), 0) as amount
  FROM months m
  LEFT JOIN expenses e ON 
    e.user_id = p_user_id 
    AND EXTRACT(YEAR FROM e.date) = p_year
    AND EXTRACT(MONTH FROM e.date) = m.month_num
  GROUP BY m.month_num, m.month_name
  ORDER BY m.month_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get yearly trend data for all time
CREATE OR REPLACE FUNCTION get_yearly_trend(
  p_user_id UUID
) RETURNS TABLE(
  year INTEGER,
  year_label TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH year_range AS (
    SELECT 
      generate_series(
        COALESCE(
          (SELECT EXTRACT(YEAR FROM MIN(date))::INTEGER FROM expenses WHERE user_id = p_user_id),
          EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
        ),
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
      ) as year_num
  )
  SELECT 
    yr.year_num as year,
    yr.year_num || '年' as year_label,
    COALESCE(SUM(e.amount), 0) as amount
  FROM year_range yr
  LEFT JOIN expenses e ON 
    e.user_id = p_user_id 
    AND EXTRACT(YEAR FROM e.date) = yr.year_num
  GROUP BY yr.year_num
  ORDER BY yr.year_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get period summary (total amount and count)
CREATE OR REPLACE FUNCTION get_period_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  total_amount NUMERIC,
  expense_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*)::BIGINT as expense_count
  FROM expenses
  WHERE user_id = p_user_id 
    AND date >= p_start_date 
    AND date <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get expenses for a specific period (still needed for some components)
CREATE OR REPLACE FUNCTION get_period_expenses(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  id UUID,
  amount NUMERIC,
  category_id UUID,
  category_name TEXT,
  category_display_name TEXT,
  category_color TEXT,
  date DATE,
  note TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.amount,
    e.category_id,
    c.name as category_name,
    c.display_name as category_display_name,
    c.chart_color as category_color,
    e.date,
    e.note,
    e.user_id,
    e.created_at
  FROM expenses e
  JOIN categories c ON e.category_id = c.id
  WHERE e.user_id = p_user_id 
    AND e.date >= p_start_date 
    AND e.date <= p_end_date
    AND c.user_id = p_user_id
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Category Management Functions

-- Function to get hierarchical category breakdown (includes parent category totals)
CREATE OR REPLACE FUNCTION get_hierarchical_category_breakdown(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  category_id UUID,
  parent_id UUID,
  category_name TEXT,
  category_display_name TEXT,
  category_color TEXT,
  level INTEGER,
  amount NUMERIC,
  count BIGINT,
  percentage NUMERIC,
  has_children BOOLEAN
) AS $$
DECLARE
  total_amount NUMERIC;
BEGIN
  -- Calculate total amount for percentage calculation
  SELECT COALESCE(SUM(e.amount), 0) INTO total_amount
  FROM expenses e
  WHERE e.user_id = p_user_id 
    AND e.date >= p_start_date 
    AND e.date <= p_end_date;

  -- Return hierarchical category breakdown
  RETURN QUERY
  WITH RECURSIVE category_expenses AS (
    -- Get direct expenses for each category
    SELECT 
      c.id as category_id,
      c.parent_id,
      c.name as category_name,
      c.display_name as category_display_name,
      c.chart_color as category_color,
      c.level,
      COALESCE(SUM(e.amount), 0) as direct_amount,
      COUNT(e.id)::BIGINT as direct_count,
      EXISTS(SELECT 1 FROM categories child WHERE child.parent_id = c.id AND child.user_id = p_user_id) as has_children
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id 
      AND e.user_id = p_user_id 
      AND e.date >= p_start_date 
      AND e.date <= p_end_date
    WHERE c.user_id = p_user_id
    GROUP BY c.id, c.parent_id, c.name, c.display_name, c.chart_color, c.level
  ),
  category_totals AS (
    -- Calculate totals including child categories
    SELECT 
      ce.category_id,
      ce.parent_id,
      ce.category_name,
      ce.category_display_name,
      ce.category_color,
      ce.level,
      ce.has_children,
      -- For leaf categories, use direct amount; for parent categories, sum children
      CASE 
        WHEN ce.has_children THEN (
          SELECT COALESCE(SUM(child_ce.direct_amount), 0)
          FROM category_expenses child_ce
          WHERE child_ce.parent_id = ce.category_id
        ) + ce.direct_amount
        ELSE ce.direct_amount
      END as total_amount,
      -- Similar logic for count
      CASE 
        WHEN ce.has_children THEN (
          SELECT COALESCE(SUM(child_ce.direct_count), 0)
          FROM category_expenses child_ce
          WHERE child_ce.parent_id = ce.category_id
        ) + ce.direct_count
        ELSE ce.direct_count
      END as total_count
    FROM category_expenses ce
  )
  SELECT 
    ct.category_id,
    ct.parent_id,
    ct.category_name,
    ct.category_display_name,
    ct.category_color,
    ct.level,
    ct.total_amount as amount,
    ct.total_count as count,
    CASE 
      WHEN total_amount > 0 THEN 
        GREATEST(
          ROUND((ct.total_amount / total_amount * 100), 2),
          CASE WHEN ct.total_amount > 0 THEN 0.01 ELSE 0 END
        )
      ELSE 0
    END as percentage,
    ct.has_children
  FROM category_totals ct
  WHERE ct.total_amount > 0 OR ct.has_children
  ORDER BY ct.level, ct.total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to copy system categories to user categories
CREATE OR REPLACE FUNCTION copy_system_categories_to_user(
    user_uuid UUID,
    p_category_set TEXT DEFAULT 'default',
    p_locale TEXT DEFAULT 'zh_CN'
)
RETURNS VOID AS $$
DECLARE
    system_cat RECORD;
    new_category_id UUID;
    existing_count INTEGER;
BEGIN
    -- Check if user already has system categories from this set
    SELECT COUNT(*) INTO existing_count
    FROM categories c
    JOIN system_categories sc ON c.system_category_id = sc.id
    WHERE c.user_id = user_uuid 
      AND sc.category_set = p_category_set 
      AND sc.locale = p_locale;
    
    -- If user already has system categories from this set, skip
    IF existing_count > 0 THEN
        RAISE NOTICE 'User % already has % system categories from set "%" with locale "%". Skipping duplication.', 
                     user_uuid, existing_count, p_category_set, p_locale;
        RETURN;
    END IF;
    
    -- Insert parent categories first (level 0)
    FOR system_cat IN 
        SELECT * FROM system_categories 
        WHERE category_set = p_category_set 
        AND locale = p_locale
        AND level = 0
        ORDER BY sort_order
    LOOP
        INSERT INTO categories (
            user_id, parent_id, system_category_id, name, display_name, 
            color, chart_color, icon, is_default, sort_order
        ) VALUES (
            user_uuid, NULL, system_cat.id, system_cat.name, system_cat.display_name,
            system_cat.color, system_cat.chart_color, system_cat.icon, TRUE, system_cat.sort_order
        );
    END LOOP;
    
    -- Then insert child categories (level 1)
    FOR system_cat IN 
        SELECT sc.*, pc.id as parent_category_id
        FROM system_categories sc
        JOIN system_categories parent_sc ON sc.parent_id = parent_sc.id
        JOIN categories pc ON pc.system_category_id = parent_sc.id AND pc.user_id = user_uuid
        WHERE sc.category_set = p_category_set 
        AND sc.locale = p_locale
        AND sc.level = 1
        ORDER BY sc.sort_order
    LOOP
        INSERT INTO categories (
            user_id, parent_id, system_category_id, name, display_name, 
            color, chart_color, icon, is_default, sort_order
        ) VALUES (
            user_uuid, system_cat.parent_category_id, system_cat.id, system_cat.name, system_cat.display_name,
            system_cat.color, system_cat.chart_color, system_cat.icon, TRUE, system_cat.sort_order
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user categories from system template
CREATE OR REPLACE FUNCTION create_categories_for_new_user(
    user_uuid UUID,
    p_category_set TEXT DEFAULT 'default',
    p_locale TEXT DEFAULT 'zh_CN'
)
RETURNS VOID AS $$
BEGIN
    PERFORM copy_system_categories_to_user(user_uuid, p_category_set, p_locale);
END;
$$ LANGUAGE plpgsql;

-- Function to get category hierarchy tree
CREATE OR REPLACE FUNCTION get_category_tree(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    parent_id UUID,
    name TEXT,
    display_name TEXT,
    color TEXT,
    chart_color TEXT,
    icon TEXT,
    level INTEGER,
    path TEXT,
    sort_order INTEGER,
    has_children BOOLEAN,
    is_default BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE category_tree AS (
        -- Root categories
        SELECT 
            c.id, c.parent_id, c.name, c.display_name, c.color, c.chart_color, c.icon,
            c.level, c.path, c.sort_order, c.is_default,
            EXISTS(SELECT 1 FROM categories child WHERE child.parent_id = c.id) as has_children
        FROM categories c
        WHERE c.user_id = p_user_id AND c.parent_id IS NULL
        
        UNION ALL
        
        -- Child categories
        SELECT 
            c.id, c.parent_id, c.name, c.display_name, c.color, c.chart_color, c.icon,
            c.level, c.path, c.sort_order, c.is_default,
            EXISTS(SELECT 1 FROM categories child WHERE child.parent_id = c.id) as has_children
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.user_id = p_user_id
    )
    SELECT 
        ct.id, ct.parent_id, ct.name, ct.display_name, ct.color, ct.chart_color, ct.icon,
        ct.level, ct.path, ct.sort_order, ct.has_children, ct.is_default
    FROM category_tree ct
    ORDER BY level, sort_order;
END;
$$ LANGUAGE plpgsql;


