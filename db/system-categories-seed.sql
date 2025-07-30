-- System Categories Seed Data
-- Run this once in Supabase console to populate the system_categories table
-- This provides the default category templates that users can copy to their personal categories

-- Clear existing data (optional - only run if you want to reset)
-- DELETE FROM system_categories WHERE category_set = 'default' AND locale = 'zh_CN';

-- Insert parent categories (level 0)
INSERT INTO system_categories (name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
('Food', '餐饮', 'orange', '#FF9800', 'mdi-food', 1, 0, 'default', 'zh_CN'),
('Transport', '交通', 'blue', '#2196F3', 'mdi-car', 2, 0, 'default', 'zh_CN'),
('Shopping', '购物', 'pink', '#E91E63', 'mdi-shopping', 3, 0, 'default', 'zh_CN'),
('Entertainment', '娱乐', 'purple', '#9C27B0', 'mdi-gamepad-variant', 4, 0, 'default', 'zh_CN'),
('Other', '其他', 'grey', '#757575', 'mdi-dots-horizontal', 5, 0, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Food
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Restaurant', '餐厅', 'orange', '#FF9800', 'mdi-silverware-fork-knife', 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Groceries', '杂货', 'orange', '#FF9800', 'mdi-cart', 2, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Takeout', '外卖', 'orange', '#FF9800', 'mdi-motorbike', 3, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Coffee', '咖啡', 'orange', '#FF9800', 'mdi-coffee', 4, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Transport
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'Gas', '汽油', 'blue', '#2196F3', 'mdi-gas-station', 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'PublicTransit', '公共交通', 'blue', '#2196F3', 'mdi-bus', 2, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'Taxi', '出租车', 'blue', '#2196F3', 'mdi-taxi', 3, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'Parking', '停车', 'blue', '#2196F3', 'mdi-parking', 4, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Shopping
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Shopping' AND category_set = 'default' AND locale = 'zh_CN'), 'Clothing', '服装', 'pink', '#E91E63', 'mdi-tshirt-crew', 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Shopping' AND category_set = 'default' AND locale = 'zh_CN'), 'Electronics', '电子产品', 'pink', '#E91E63', 'mdi-cellphone', 2, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Shopping' AND category_set = 'default' AND locale = 'zh_CN'), 'Home', '家居', 'pink', '#E91E63', 'mdi-home', 3, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Shopping' AND category_set = 'default' AND locale = 'zh_CN'), 'Books', '书籍', 'pink', '#E91E63', 'mdi-book', 4, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Entertainment
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Entertainment' AND category_set = 'default' AND locale = 'zh_CN'), 'Movies', '电影', 'purple', '#9C27B0', 'mdi-movie', 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Entertainment' AND category_set = 'default' AND locale = 'zh_CN'), 'Games', '游戏', 'purple', '#9C27B0', 'mdi-gamepad-variant', 2, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Entertainment' AND category_set = 'default' AND locale = 'zh_CN'), 'Sports', '体育', 'purple', '#9C27B0', 'mdi-basketball', 3, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Entertainment' AND category_set = 'default' AND locale = 'zh_CN'), 'Travel', '旅行', 'purple', '#9C27B0', 'mdi-airplane', 4, 'default', 'zh_CN');

-- Verify the data was inserted correctly
-- SELECT name, display_name, level, path FROM system_categories WHERE category_set = 'default' AND locale = 'zh_CN' ORDER BY level, sort_order;
