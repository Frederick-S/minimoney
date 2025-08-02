-- System Categories Seed Data
-- Run this once in Supabase console to populate the system_categories table
-- This provides the default category templates that users can copy to their personal categories

-- Clear existing data (optional - only run if you want to reset)
-- DELETE FROM system_categories WHERE category_set = 'default' AND locale = 'zh_CN';

-- Insert parent categories (level 0)
INSERT INTO system_categories (name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
('Food', '餐饮', 'orange', '#FF9800', 'mdi-food', 1, 0, 'default', 'zh_CN'),
('SnacksAlcohol', '零食烟酒', 'amber', '#FFC107', 'mdi-glass-wine', 2, 0, 'default', 'zh_CN'),
('Shopping', '购物', 'purple', '#9C27B0', 'mdi-shopping', 3, 0, 'default', 'zh_CN'),
('Housing', '住房', 'brown', '#795548', 'mdi-home-city', 4, 0, 'default', 'zh_CN'),
('Transport', '交通', 'blue', '#2196F3', 'mdi-car', 5, 0, 'default', 'zh_CN'),
('Communication', '通讯', 'cyan', '#00BCD4', 'mdi-cellphone', 6, 0, 'default', 'zh_CN'),
('Childcare', '育儿', 'pink', '#E91E63', 'mdi-baby-face', 7, 0, 'default', 'zh_CN'),
('Education', '学习', 'indigo', '#3F51B5', 'mdi-school', 8, 0, 'default', 'zh_CN'),
('Healthcare', '医疗', 'red', '#F44336', 'mdi-medical-bag', 9, 0, 'default', 'zh_CN'),
('Travel', '旅行', 'teal', '#009688', 'mdi-airplane', 10, 0, 'default', 'zh_CN'),
('Automotive', '汽车', 'blue-grey', '#607D8B', 'mdi-car-cog', 11, 0, 'default', 'zh_CN'),
('Entertainment', '娱乐', 'deep-purple', '#673AB7', 'mdi-gamepad-variant', 12, 0, 'default', 'zh_CN'),
('Other', '其他', 'grey', '#757575', 'mdi-dots-horizontal', 13, 0, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Food
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Breakfast', '早餐', 'orange', '#FF9800', 'mdi-cup', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Lunch', '午餐', 'orange', '#FF9800', 'mdi-food', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Dinner', '晚餐', 'orange', '#FF9800', 'mdi-silverware-variant', 3, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Ingredients', '食材', 'orange', '#FF9800', 'mdi-carrot', 4, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Food' AND category_set = 'default' AND locale = 'zh_CN'), 'Seasonings', '油盐酱醋', 'orange', '#FF9800', 'mdi-bottle-tonic', 5, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Transport
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'PublicTransit', '公共交通', 'blue', '#2196F3', 'mdi-bus', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'Taxi', '出租车', 'blue', '#2196F3', 'mdi-taxi', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'HighSpeedRail', '高铁', 'blue', '#2196F3', 'mdi-train', 3, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'Airplane', '飞机', 'blue', '#2196F3', 'mdi-airplane', 4, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Transport' AND category_set = 'default' AND locale = 'zh_CN'), 'Parking', '停车', 'blue', '#2196F3', 'mdi-parking', 5, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Shopping
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Shopping' AND category_set = 'default' AND locale = 'zh_CN'), 'Clothing', '服装', 'purple', '#9C27B0', 'mdi-tshirt-crew', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Shopping' AND category_set = 'default' AND locale = 'zh_CN'), 'Electronics', '电子产品', 'purple', '#9C27B0', 'mdi-cellphone', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Shopping' AND category_set = 'default' AND locale = 'zh_CN'), 'Home', '家居', 'purple', '#9C27B0', 'mdi-home', 3, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Shopping' AND category_set = 'default' AND locale = 'zh_CN'), 'DailyNecessities', '日用品', 'purple', '#9C27B0', 'mdi-basket', 4, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Entertainment
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Entertainment' AND category_set = 'default' AND locale = 'zh_CN'), 'Movies', '电影', 'deep-purple', '#673AB7', 'mdi-movie', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Entertainment' AND category_set = 'default' AND locale = 'zh_CN'), 'Games', '游戏', 'deep-purple', '#673AB7', 'mdi-gamepad-variant', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Entertainment' AND category_set = 'default' AND locale = 'zh_CN'), 'Sports', '体育', 'deep-purple', '#673AB7', 'mdi-basketball', 3, 1, 'default', 'zh_CN');

-- Note: Travel moved to its own parent category

-- Insert subcategories (level 1) - SnacksAlcohol
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'SnacksAlcohol' AND category_set = 'default' AND locale = 'zh_CN'), 'Snacks', '零食', 'amber', '#FFC107', 'mdi-cookie', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'SnacksAlcohol' AND category_set = 'default' AND locale = 'zh_CN'), 'Fruits', '水果', 'amber', '#FFC107', 'mdi-food-apple', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'SnacksAlcohol' AND category_set = 'default' AND locale = 'zh_CN'), 'Desserts', '甜点', 'amber', '#FFC107', 'mdi-cupcake', 3, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'SnacksAlcohol' AND category_set = 'default' AND locale = 'zh_CN'), 'Beverages', '茶水', 'amber', '#FFC107', 'mdi-tea', 4, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'SnacksAlcohol' AND category_set = 'default' AND locale = 'zh_CN'), 'Alcohol', '酒类', 'amber', '#FFC107', 'mdi-glass-wine', 5, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'SnacksAlcohol' AND category_set = 'default' AND locale = 'zh_CN'), 'Cigarettes', '烟草', 'amber', '#FFC107', 'mdi-smoking', 6, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Housing
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Housing' AND category_set = 'default' AND locale = 'zh_CN'), 'Rent', '房租', 'brown', '#795548', 'mdi-home', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Housing' AND category_set = 'default' AND locale = 'zh_CN'), 'Utilities', '水电费', 'brown', '#795548', 'mdi-flash', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Housing' AND category_set = 'default' AND locale = 'zh_CN'), 'Gas', '燃气费', 'brown', '#795548', 'mdi-fire', 3, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Housing' AND category_set = 'default' AND locale = 'zh_CN'), 'HouseMaintenance', '房屋维修', 'brown', '#795548', 'mdi-wrench', 4, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Communication
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Communication' AND category_set = 'default' AND locale = 'zh_CN'), 'Phone', '电话费', 'cyan', '#00BCD4', 'mdi-phone', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Communication' AND category_set = 'default' AND locale = 'zh_CN'), 'Internet', '网费', 'cyan', '#00BCD4', 'mdi-wifi', 2, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Childcare
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Childcare' AND category_set = 'default' AND locale = 'zh_CN'), 'BabySupplies', '婴儿用品', 'pink', '#E91E63', 'mdi-baby-bottle', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Childcare' AND category_set = 'default' AND locale = 'zh_CN'), 'Toys', '玩具', 'pink', '#E91E63', 'mdi-toy-brick', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Childcare' AND category_set = 'default' AND locale = 'zh_CN'), 'ChildClothing', '儿童服装', 'pink', '#E91E63', 'mdi-tshirt-crew-outline', 3, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Education
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Education' AND category_set = 'default' AND locale = 'zh_CN'), 'Textbooks', '教材', 'indigo', '#3F51B5', 'mdi-book-open', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Education' AND category_set = 'default' AND locale = 'zh_CN'), 'Books', '书籍', 'indigo', '#3F51B5', 'mdi-book', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Education' AND category_set = 'default' AND locale = 'zh_CN'), 'Supplies', '学习用品', 'indigo', '#3F51B5', 'mdi-pencil', 3, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Healthcare
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Healthcare' AND category_set = 'default' AND locale = 'zh_CN'), 'Doctor', '看病', 'red', '#F44336', 'mdi-doctor', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Healthcare' AND category_set = 'default' AND locale = 'zh_CN'), 'Pharmacy', '药品', 'red', '#F44336', 'mdi-pill', 2, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Travel
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Travel' AND category_set = 'default' AND locale = 'zh_CN'), 'Flight', '机票', 'teal', '#009688', 'mdi-airplane', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Travel' AND category_set = 'default' AND locale = 'zh_CN'), 'Hotel', '酒店', 'teal', '#009688', 'mdi-bed', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Travel' AND category_set = 'default' AND locale = 'zh_CN'), 'Tickets', '门票', 'teal', '#009688', 'mdi-ticket', 3, 1, 'default', 'zh_CN');

-- Insert subcategories (level 1) - Automotive
INSERT INTO system_categories (parent_id, name, display_name, color, chart_color, icon, sort_order, level, category_set, locale) VALUES
((SELECT id FROM system_categories WHERE name = 'Automotive' AND category_set = 'default' AND locale = 'zh_CN'), 'Insurance', '车险', 'blue-grey', '#607D8B', 'mdi-shield-car', 1, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Automotive' AND category_set = 'default' AND locale = 'zh_CN'), 'CarMaintenance', '汽车保养', 'blue-grey', '#607D8B', 'mdi-car-wrench', 2, 1, 'default', 'zh_CN'),
((SELECT id FROM system_categories WHERE name = 'Automotive' AND category_set = 'default' AND locale = 'zh_CN'), 'Registration', '车辆年检', 'blue-grey', '#607D8B', 'mdi-card-account-details', 3, 1, 'default', 'zh_CN');

-- Verify the data was inserted correctly
-- SELECT name, display_name, level, path FROM system_categories WHERE category_set = 'default' AND locale = 'zh_CN' ORDER BY level, sort_order;
