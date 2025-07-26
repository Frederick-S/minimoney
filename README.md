# 记账 (Vue Expense Tracker)

A modern, secure expense tracking application built with Vue 3, Vuetify (Material Design), and Supabase authentication.

## ✨ Features

- 🔐 **Secure Authentication** - Email/password login with Supabase Auth
- 💰 **Easy Expense Entry** - Quick expense recording with categories and notes
- 📊 **Visual Charts** - Monthly/yearly expense analysis with category breakdowns
- 📱 **Mobile-First Design** - Optimized for iPhone and mobile devices
- 🎨 **Material Design** - Beautiful, intuitive interface with Vuetify 3
- ☁️ **Cloud Sync** - Secure data storage with Supabase
- 🔒 **Data Privacy** - Row-level security ensures your data stays private

## 🚀 Quick Start

### Prerequisites

1. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
2. **Node.js** - Version 18+ recommended

### Setup

1. **Configure Supabase**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your Supabase credentials
   # Get these from your Supabase dashboard
   ```

2. **Create Database Schema**
   - Open your Supabase dashboard
   - Go to SQL Editor
   - Run the contents of `supabase-schema.sql`

3. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```

4. **Start Tracking!**
   - Register with your email
   - Confirm your email address
   - Start tracking expenses

## 🛠️ Tech Stack

- **Framework**: Vue 3 with Composition API
- **UI Library**: Vuetify 3 (Material Design)
- **Backend**: Supabase (Auth + Database)
- **Build Tool**: Vite
- **Charts**: Chart.js with vue-chartjs
- **Icons**: Material Design Icons

## 📋 Setup Details

For detailed setup instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## 🏗️ Architecture

- **Authentication**: Supabase Auth with Row Level Security
- **Database**: PostgreSQL with user-isolated expense data
- **Frontend**: Vue 3 Composition API with TypeScript
- **Styling**: Vuetify 3 Material Design components
- **Charts**: Chart.js for expense visualization

## 🔒 Security

- User authentication required for all data access
- Row Level Security ensures data isolation
- Environment variables for sensitive configuration
- No user data stored locally

## 📱 Mobile Optimization

- Responsive Material Design interface
- Touch-friendly interactions
- Optimized for iPhone 12 mini and similar devices
- Bottom navigation for easy thumb access

## 📄 License

MIT License - see LICENSE file for details