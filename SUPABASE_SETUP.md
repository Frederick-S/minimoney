# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Wait for the project to be provisioned

## 2. Configure Database

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the database setup in this order:
   a. Copy and paste the contents of `db/schema.sql` to create tables and functions
   b. Copy and paste the contents of `db/system-categories-seed.sql` to populate default categories
   c. Copy and paste the contents of `db/rpc.sql` to create RPC functions
4. Verify tables are created: `system_categories`, `categories`, and `expenses`

## 3. Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Go to Settings > API in your Supabase dashboard
3. Copy the Project URL and anon/public key
4. Update the values in `.env`

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Authentication Setup

The app is configured to use email/password authentication. Users will need to:
- Sign up with email and password
- Confirm their email (check Supabase email settings if needed)
- Sign in to access the expense tracking features

## 5. Row Level Security

The database is configured with Row Level Security (RLS) to ensure:
- Users can only see their own expenses
- Users can only modify their own data
- Data is properly isolated between users

## Features Included

- ✅ User registration and login with automatic category initialization
- ✅ Dynamic hierarchical category system with Chinese localization
- ✅ Secure expense storage per user with category relationships
- ✅ Real-time data sync with Supabase
- ✅ Toast notifications for user feedback
- ✅ Category management with Material Design icons
- ✅ Expense charts and analytics with dynamic categories
- ✅ Logout functionality
- ✅ User profile display in header

## Database Schema

The application uses a dynamic hierarchical category system. See the following files for complete schema details:

- **Schema Definition**: `db/schema.sql` - Complete table structures, triggers, and RLS policies
- **Category Seed Data**: `db/system-categories-seed.sql` - Default categories with Chinese localization
- **RPC Functions**: `db/rpc.sql` - Data processing and aggregation functions

### Key Features
- **Hierarchical Categories**: Up to 3 levels deep (Food → Restaurant → FastFood)
- **Auto-initialization**: New users get complete category set automatically
- **Localization**: Chinese display names with English internal identifiers
- **Material Design**: Consistent iconography with mdi- prefix
- **Color Coding**: Separate UI and chart colors for better visualization
- **Template System**: Admin-managed templates copied to user categories

## Development Reset (Optional)

If you need to reset the database during development:

1. **Clean Database**: Run `db/cleanup.sql` to drop all tables and functions
2. **Recreate Schema**: Run `db/schema.sql` to recreate tables and triggers
3. **Seed Categories**: Run `db/system-categories-seed.sql` to populate default categories
4. **Add RPC Functions**: Run `db/rpc.sql` to create data processing functions

**Warning**: The cleanup script will delete all data. Only use during development.