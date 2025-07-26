# 记账 (Vue Expense Tracker) - Product Requirements Document

A minimalist mobile-first expense tracking application built with Vue 3, Material Design UI, and Supabase authentication that helps users securely monitor their daily spending with beautiful, intuitive interactions.

**Experience Qualities**:
1. **Effortless** - Recording expenses should take seconds, not minutes
2. **Insightful** - Users immediately understand their spending patterns through clear visuals
3. **Trustworthy** - Data feels secure and reliable with user authentication and smooth, responsive interactions

**Complexity Level**: Light Application (multiple features with user accounts and cloud storage)
- Core functionality focuses on expense entry, categorization, and basic reporting
- User authentication and secure cloud data storage with Supabase
- Mobile-optimized interface built with Vue 3 and Vuetify (Material Design)
- Modern Material Design 3 components with proper theming

## Essential Features

### User Authentication
- **Functionality**: Secure user registration and login with email/password using Supabase Auth
- **Purpose**: Protect user data and enable personal expense tracking across devices
- **Components**: Authentication form with Material Design text fields and validation
- **Flow**: Register → Email confirmation → Login → Access expense tracker
- **Success criteria**: Smooth auth flow, secure data isolation, persistent login sessions

### Expense Entry
- **Functionality**: Quick expense recording with amount, category, and optional note
- **Purpose**: Primary user action - must be fast and frictionless
- **Trigger**: Material Design Floating Action Button prominently displayed
- **Progression**: Tap FAB → Enter amount → Select category → Add note (optional) → Save to Supabase
- **Success criteria**: Expense appears in list immediately, syncs to cloud, form resets for next entry

### Category Management
- **Functionality**: Predefined categories (Food, Transport, Shopping, etc.) with Material Design chips
- **Purpose**: Organize expenses for better insights and reporting
- **Trigger**: Category selection during expense entry with v-select component
- **Progression**: View categories → Select from dropdown → Return to expense form
- **Success criteria**: Selected category appears as colored chip, affects summary calculations

### Bottom Navigation
- **Functionality**: Material Design bottom navigation with two tabs: 首页 (Home) and 图表 (Charts)
- **Purpose**: Organize core functionality into logical sections for better user experience
- **Trigger**: Always visible at bottom of screen with v-bottom-navigation component
- **Progression**: Tap tab → Switch content view → Access different features
- **Success criteria**: Smooth tab transitions, clear active state, proper Material Design styling

### 首页 (Home Tab)
- **Functionality**: Contains expense entry, history, and daily summary in organized Material Design layout
- **Purpose**: Primary workspace for recording and reviewing recent expenses
- **Components**: Summary card, expense history list, floating action button for new entries
- **Layout**: Expense summary at top, recent expenses list below, FAB positioned for easy access
- **Success criteria**: All core expense tracking features accessible, clean visual hierarchy

### 图表 (Charts Tab)
- **Functionality**: Placeholder for future analytics and visualizations
- **Purpose**: Reserved space for expense analysis, trends, and category breakdowns
- **Components**: Placeholder content with Material Design icons and descriptive text
- **Content**: Preview of future features including monthly trends, category pie charts, and comparative analysis
- **Success criteria**: Clear indication of upcoming features, professional placeholder design

### Expense History (within 首页)
- **Functionality**: Material Design card-based list of user's expenses with Material icons, loaded from Supabase
- **Purpose**: Review past spending in an elegant, scannable format with real-time sync
- **Trigger**: Main content area of 首页 tab showing recent expenses in v-card components
- **Progression**: View list → Scroll through cards → Read details easily
- **Success criteria**: Clean card layout, proper typography hierarchy, real-time data sync

### Summary Dashboard (within 首页)
- **Functionality**: Daily spending totals with Material Design elevation and typography, calculated from user's Supabase data
- **Purpose**: Provide spending insights at a glance using Material Design principles
- **Trigger**: Top section of 首页 tab in elevated v-card
- **Progression**: View summary → See clear financial information
- **Success criteria**: Accurate calculations, proper Material Design styling, real-time updates

### User Profile & Logout
- **Functionality**: User profile menu in app header with logout option
- **Purpose**: Display current user and provide secure logout functionality
- **Components**: Material Design menu with user email display and logout button
- **Flow**: Tap profile icon → View user info → Logout option
- **Success criteria**: Clear user identification, secure logout, data cleanup on logout

## Edge Case Handling

- **Empty States**: Material Design empty state with appropriate illustration and guidance
- **Invalid Input**: Material text field validation with proper error states
- **Data Loss**: All data persists using Spark KV storage
- **Network Issues**: App works completely offline
- **Touch Targets**: All Material components meet accessibility standards
- **Form Validation**: Material Design form validation with proper error messaging

## Design Direction

The interface follows Google's Material Design 3 guidelines with proper elevation, typography, and color usage. Components feel native to Material Design with appropriate shadows, animations, and interactions.

## Color Selection

Material Design 3 color system using Material You principles:

- **Primary Color**: Material Blue (#2196F3) - Standard Material primary for trust and reliability
- **Secondary Colors**: Material Amber (#FFC107) for supporting elements and accents
- **Surface Colors**: Material Design surface variations with proper contrast
- **State Colors**: Standard Material success, warning, error, and info colors
- **Category Colors**: Distinct Material colors for each expense category (orange, blue, pink, purple, grey)

## Font Selection

Material Design typography using Roboto font family for consistency with Material guidelines:

- **Typographic Hierarchy**:
  - H1 (App Bar): Roboto Medium/20px Material Design headline styles
  - H2 (Section Headers): Roboto Medium/16px Material subtitle styles
  - Body (Expense Items): Roboto Regular/14px Material body styles
  - Caption (Dates, Notes): Roboto Regular/12px Material caption styles
  - Numbers (Amounts): Roboto Medium/16px for emphasis

## Component Selection

Using Vuetify 3 Material Design components:

- **v-app**: Main application container with Material theming
- **v-app-bar**: Material Design app bar with proper elevation  
- **v-bottom-navigation**: Material Design bottom navigation for tab switching
- **v-card**: Material Design cards for expense items and summary
- **v-fab**: Material Design Floating Action Button for primary action (positioned above bottom nav)
- **v-dialog**: Material Design dialogs for expense entry form
- **v-text-field**: Material Design text inputs with proper validation
- **v-select**: Material Design dropdown for category selection
- **v-textarea**: Material Design text area for notes
- **v-chip**: Material Design chips for category display
- **v-btn**: Material Design buttons with proper states
- **v-container/v-row/v-col**: Material Design responsive grid system
- **v-icon**: Material Design Icons for navigation and placeholder content

## Technical Architecture

**Framework**: Vue 3 with Composition API and Vuetify 3
- **UI Library**: Vuetify 3.x (Material Design 3 components for Vue)
- **Icons**: Material Design Icons (MDI) for consistency
- **Theming**: Vuetify's built-in Material Design theming system
- **Responsive**: Vuetify's responsive grid and breakpoint system
- **Components**: Native Material Design components with proper a11y support

**Data Persistence**: 
- **Cloud Storage**: Supabase PostgreSQL database with Row Level Security
- **Authentication**: Supabase Auth with email/password authentication
- **Real-time Sync**: Automatic data synchronization across devices
- **Type Safety**: Full TypeScript support with Supabase type definitions
- **Reactive Updates**: Vue 3 reactivity with real-time database updates
- **Security**: Row Level Security ensures users only access their own data

**Build System**:
- **Vite**: Fast development server optimized for Vue and Vuetify
- **TypeScript**: Full type checking with Vuetify type definitions
- **Material Design**: Vuetify's complete Material Design implementation