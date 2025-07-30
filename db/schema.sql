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
    locale TEXT DEFAULT 'zh_CN',
    category_set TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(name, parent_id, category_set, locale),
    CHECK (level >= 0 AND level <= 3),
    CHECK (parent_id != id)
);

-- Categories table for dynamic category management
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    system_category_id UUID REFERENCES system_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'grey',
    chart_color TEXT NOT NULL DEFAULT '#757575',
    icon TEXT DEFAULT 'mdi-folder',
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure unique category names per user
    UNIQUE(user_id, name, parent_id),
    CHECK (level >= 0 AND level <= 3),
    CHECK (parent_id != id)
);

-- Create expenses table
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    note TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX system_categories_parent_id_idx ON system_categories(parent_id);
CREATE INDEX system_categories_set_locale_idx ON system_categories(category_set, locale);
CREATE INDEX categories_user_id_idx ON categories(user_id);
CREATE INDEX categories_parent_id_idx ON categories(parent_id);
CREATE INDEX categories_system_id_idx ON categories(system_category_id);
CREATE INDEX categories_path_idx ON categories(path);
CREATE INDEX categories_sort_order_idx ON categories(user_id, parent_id, sort_order);

-- Create index on user_id for better performance
CREATE INDEX expenses_user_id_idx ON expenses(user_id);

-- Create index on category_id for better performance
CREATE INDEX expenses_category_id_idx ON expenses(category_id);

-- Create index on date for better performance
CREATE INDEX expenses_date_idx ON expenses(date);

-- Create index on created_at for pagination performance
CREATE INDEX expenses_created_at_idx ON expenses(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_categories (Admin-only access)
CREATE POLICY "System categories are read-only for authenticated users" ON system_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- No INSERT, UPDATE, or DELETE policies for system_categories
-- This means only service_role (Supabase console/admin) can modify them

-- RLS Policies for categories
CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);

-- RLS Policies for expenses
CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update category path and level when parent changes
CREATE OR REPLACE FUNCTION update_category_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
    parent_level INTEGER;
BEGIN
    -- Update level and path based on parent
    IF NEW.parent_id IS NULL THEN
        NEW.level = 0;
        NEW.path = NEW.name;
    ELSE
        -- Get parent path and level
        SELECT level + 1, COALESCE(path, name) || '/' || NEW.name 
        INTO parent_level, parent_path
        FROM categories 
        WHERE id = NEW.parent_id AND user_id = NEW.user_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent category not found or belongs to different user';
        END IF;
        
        NEW.level = parent_level;
        NEW.path = parent_path;
        
        -- Prevent excessive nesting
        IF NEW.level > 3 THEN
            RAISE EXCEPTION 'Category hierarchy too deep (max 3 levels)';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update system category hierarchy
CREATE OR REPLACE FUNCTION update_system_category_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
    parent_level INTEGER;
BEGIN
    -- Update level and path based on parent
    IF NEW.parent_id IS NULL THEN
        NEW.level = 0;
        NEW.path = NEW.name;
    ELSE
        -- Get parent path and level
        SELECT level + 1, COALESCE(path, name) || '/' || NEW.name 
        INTO parent_level, parent_path
        FROM system_categories 
        WHERE id = NEW.parent_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent system category not found';
        END IF;
        
        NEW.level = parent_level;
        NEW.path = parent_path;
        
        -- Prevent excessive nesting
        IF NEW.level > 3 THEN
            RAISE EXCEPTION 'System category hierarchy too deep (max 3 levels)';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_system_categories_updated_at 
    BEFORE UPDATE ON system_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_categories_hierarchy 
    BEFORE INSERT OR UPDATE ON system_categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_system_category_hierarchy();

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_hierarchy 
    BEFORE INSERT OR UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_category_hierarchy();