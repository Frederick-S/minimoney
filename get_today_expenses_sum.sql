-- Create RPC function for calculating today's expenses sum using SQL SUM
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
