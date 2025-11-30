-- Database Cleanup Script
-- This script drops all tables, functions, and triggers related to the minimoney application
-- Run this in Supabase console when you need to completely reset the database

-- WARNING: This will delete all data! Use with caution.

-- Drop triggers first (to avoid dependency issues)
DROP TRIGGER IF EXISTS update_categories_hierarchy ON categories;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_system_categories_hierarchy ON system_categories;
DROP TRIGGER IF EXISTS update_system_categories_updated_at ON system_categories;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

-- Drop RPC functions
DROP FUNCTION IF EXISTS create_categories_for_new_user(uuid, text, text);
DROP FUNCTION IF EXISTS copy_system_categories_to_user(uuid, text, text);
DROP FUNCTION IF EXISTS get_today_expenses_sum(uuid, date);
DROP FUNCTION IF EXISTS get_daily_totals(uuid, date[]);
DROP FUNCTION IF EXISTS get_category_breakdown(uuid, date, date);
DROP FUNCTION IF EXISTS get_monthly_trend(uuid, integer);
DROP FUNCTION IF EXISTS get_yearly_trend(uuid);
DROP FUNCTION IF EXISTS get_period_summary(uuid, date, date);
DROP FUNCTION IF EXISTS get_period_expenses(uuid, date, date);
DROP FUNCTION IF EXISTS get_hierarchical_category_breakdown(uuid, date, date);
DROP FUNCTION IF EXISTS get_category_tree(uuid);

-- Drop subscription expense management functions
DROP FUNCTION IF EXISTS ensure_subscription_category(uuid);
DROP FUNCTION IF EXISTS create_subscription_category_for_all_users();
DROP FUNCTION IF EXISTS get_subscription_category_id(uuid);
DROP FUNCTION IF EXISTS get_subscription_expenses(uuid);
DROP FUNCTION IF EXISTS count_subscription_expenses(uuid);

-- Drop helper functions
DROP FUNCTION IF EXISTS update_category_hierarchy();
DROP FUNCTION IF EXISTS update_system_category_hierarchy();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse dependency order)
-- Drop subscription-related tables first
DROP TABLE IF EXISTS subscription_audit_log CASCADE;
DROP TABLE IF EXISTS subscription_billing_logs CASCADE;

-- Expenses depends on categories and subscriptions, so drop it next
DROP TABLE IF EXISTS expenses CASCADE;

-- Drop subscriptions table
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Drop user preferences
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Categories depends on system_categories, so drop it next
DROP TABLE IF EXISTS categories CASCADE;

-- System categories has self-references only, so drop it last
DROP TABLE IF EXISTS system_categories CASCADE;

-- Note: Policies and indexes are automatically dropped with CASCADE above

-- Verify cleanup (uncomment to see what remains)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
--   AND (tablename LIKE '%categories%' OR tablename = 'expenses' OR tablename LIKE '%subscription%' OR tablename = 'user_preferences');
-- SELECT proname FROM pg_proc WHERE proname LIKE '%categor%' OR proname LIKE '%expense%' OR proname LIKE '%subscription%';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup completed. All minimoney tables, functions, and related objects have been dropped.';
END $$;

-- Additional cleanup verification
-- Run this to confirm all tables are dropped:
-- SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' 
--   AND tablename IN ('system_categories', 'categories', 'expenses', 'subscriptions', 
--                     'user_preferences', 'subscription_billing_logs', 'subscription_audit_log');
-- Expected result: 0
