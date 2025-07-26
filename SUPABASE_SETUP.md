# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Wait for the project to be provisioned

## 2. Configure Database

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL to create the expenses table and policies

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

- ✅ User registration and login
- ✅ Secure expense storage per user
- ✅ Real-time data sync with Supabase
- ✅ Logout functionality
- ✅ User profile display in header

## Database Schema

```sql
expenses:
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- amount (Decimal)
- category (Text)
- note (Text)
- date (Date)
- created_at (Timestamp)
```