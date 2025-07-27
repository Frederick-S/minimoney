-- RPC functions for chart aggregations to reduce client-side calculations

-- 1. Get category breakdown for a specific period
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  category TEXT,
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
    e.category,
    COALESCE(SUM(e.amount), 0) as amount,
    COUNT(*)::BIGINT as count,
    CASE 
      WHEN total_amount > 0 THEN ROUND((COALESCE(SUM(e.amount), 0) / total_amount * 100), 2)
      ELSE 0
    END as percentage
  FROM expenses e
  WHERE e.user_id = p_user_id 
    AND e.date >= p_start_date 
    AND e.date <= p_end_date
  GROUP BY e.category
  ORDER BY SUM(e.amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get monthly trend data for a specific year
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

-- 3. Get period summary (total amount and count)
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

-- 4. Get expenses for a specific period (still needed for some components)
CREATE OR REPLACE FUNCTION get_period_expenses(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  id UUID,
  amount NUMERIC,
  category TEXT,
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
    e.category,
    e.date,
    e.note,
    e.user_id,
    e.created_at
  FROM expenses e
  WHERE e.user_id = p_user_id 
    AND e.date >= p_start_date 
    AND e.date <= p_end_date
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
