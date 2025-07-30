-- Database Cleanup Script
-- This script drops all tables, functions, and triggers related to the minimoney application
-- Run this in Supabase console when you need to completely reset the database

-- WARNING: This will delete all data! Use with caution.

-- Drop triggers first (to avoid dependency issues)
DROP TRIGGER IF EXISTS update_categories_hierarchy ON categories;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_system_categories_hierarchy ON system_categories;
DROP TRIGGER IF EXISTS update_system_categories_updated_at ON system_categories;

-- Drop RPC functions
DROP FUNCTION IF EXISTS create_categories_for_new_user(uuid, text, text);
DROP FUNCTION IF EXISTS get_today_expenses_sum(uuid, date);
DROP FUNCTION IF EXISTS get_category_breakdown_data(uuid, date, date);
DROP FUNCTION IF EXISTS get_monthly_trend_data(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_period_summary_data(uuid, date, date);
DROP FUNCTION IF EXISTS get_period_expenses_data(uuid, date, date);

-- Drop helper functions
DROP FUNCTION IF EXISTS update_category_hierarchy();
DROP FUNCTION IF EXISTS update_system_category_hierarchy();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse dependency order)
-- Expenses depends on categories, so drop it first
DROP TABLE IF EXISTS expenses CASCADE;

-- Categories depends on system_categories, so drop it next
DROP TABLE IF EXISTS categories CASCADE;

-- System categories has self-references only, so drop it last
DROP TABLE IF EXISTS system_categories CASCADE;

-- Note: Policies and indexes are automatically dropped with CASCADE above

-- Verify cleanup (uncomment to see what remains)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%categories%' OR tablename = 'expenses';
-- SELECT proname FROM pg_proc WHERE proname LIKE '%categor%' OR proname LIKE '%expense%';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup completed. All minimoney tables, functions, and related objects have been dropped.';
END $$;
