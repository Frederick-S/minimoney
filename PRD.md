# 记账 (Vue Expense Tracker) - Product Requirements Document

A minimalist mobile-first expense tracking application built with Vue 3 that helps users monitor their daily spending with beautiful, intuitive interactions.

**Experience Qualities**:
1. **Effortless** - Recording expenses should take seconds, not minutes
2. **Insightful** - Users immediately understand their spending patterns through clear visuals
3. **Trustworthy** - Data feels secure and reliable with smooth, responsive interactions

**Complexity Level**: Light Application (multiple features with basic state)
- Core functionality focuses on expense entry, categorization, and basic reporting
- Persistent data storage without requiring user accounts
- Mobile-optimized interface built with Vue 3 and Composition API
- Material design-inspired components with Tailwind CSS styling

## Essential Features

### Expense Entry
- **Functionality**: Quick expense recording with amount, category, and optional note
- **Purpose**: Primary user action - must be fast and frictionless
- **Trigger**: Floating action button prominently displayed
- **Progression**: Tap FAB → Enter amount → Select category → Add note (optional) → Save
- **Success criteria**: Expense appears in list immediately, form resets for next entry

### Category Management
- **Functionality**: Predefined categories (Food, Transport, Shopping, etc.) with custom icons
- **Purpose**: Organize expenses for better insights and reporting
- **Trigger**: Category selection during expense entry
- **Progression**: View categories → Select from grid → Return to expense form
- **Success criteria**: Selected category appears in expense entry, affects summary calculations

### Expense History
- **Functionality**: Chronological list of all expenses with edit/delete capabilities
- **Purpose**: Review past spending and make corrections
- **Trigger**: Main screen shows recent expenses automatically
- **Progression**: View list → Tap expense → Edit details → Save changes
- **Success criteria**: Changes reflect immediately, totals update correctly

### Summary Dashboard
- **Functionality**: Daily/weekly/monthly spending totals with category breakdown
- **Purpose**: Provide spending insights at a glance
- **Trigger**: Top section of main screen
- **Progression**: View summary → Tap period selector → See different timeframes
- **Success criteria**: Accurate calculations, smooth period transitions

## Edge Case Handling

- **Empty States**: Friendly onboarding messages when no expenses exist yet
- **Invalid Input**: Prevent negative amounts, handle decimal formatting gracefully
- **Data Loss**: All data persists using Spark KV storage
- **Network Issues**: App works completely offline
- **Touch Targets**: All interactive elements meet 44px minimum for accessibility

## Design Direction

The interface should feel modern, clean, and material-inspired with gentle shadows and purposeful motion that guides the user's attention without distraction.

## Color Selection

Material Design 3 inspired palette using analogous colors for harmony and trust.

- **Primary Color**: Deep Teal (oklch(0.45 0.12 180)) - Communicates stability and financial responsibility
- **Secondary Colors**: Soft Blue-Green (oklch(0.65 0.08 170)) for supporting elements
- **Accent Color**: Warm Orange (oklch(0.7 0.15 50)) for call-to-action elements like the FAB
- **Foreground/Background Pairings**:
  - Background (Pure White oklch(1 0 0)): Dark Gray text (oklch(0.2 0 0)) - Ratio 16.7:1 ✓
  - Card (Light Gray oklch(0.98 0 0)): Dark Gray text (oklch(0.2 0 0)) - Ratio 15.8:1 ✓
  - Primary (Deep Teal oklch(0.45 0.12 180)): White text (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Accent (Warm Orange oklch(0.7 0.15 50)): White text (oklch(1 0 0)) - Ratio 4.9:1 ✓

## Font Selection

Clean, readable typography that works well at small sizes on mobile devices using Inter for its excellent mobile legibility.

- **Typographic Hierarchy**:
  - H1 (Screen Titles): Inter Bold/24px/tight letter spacing
  - H2 (Section Headers): Inter SemiBold/18px/normal spacing
  - Body (Expense Items): Inter Regular/16px/relaxed line height
  - Caption (Dates, Notes): Inter Regular/14px/subtle color
  - Numbers (Amounts): Inter Medium/16px/tabular figures

## Animations

Subtle material-inspired motion that reinforces the physical metaphor of handling money with gentle spring animations and thoughtful transitions.

- **Purposeful Meaning**: FAB bounce on tap, card elevation on selection, gentle slide transitions between screens
- **Hierarchy of Movement**: Most important - expense entry interactions, Secondary - list updates, Subtle - navigation transitions

## Component Selection

- **Components**: 
  - Cards for expense items with subtle elevation
  - Floating Action Button for primary expense entry
  - Sheets/Dialogs for expense entry form
  - Tabs for different time periods
  - Badges for categories with custom colors
- **Customizations**: Material-inspired FAB with custom positioning, category icon grid layout
- **States**: Clear hover/pressed states for all interactive elements with subtle elevation changes
- **Icon Selection**: Phosphor icons for their clarity at small sizes - Plus for add, Wallet for categories, Calendar for dates
- **Spacing**: Consistent 16px base unit (4 in Tailwind) with 8px (2) for tight spacing, 24px (6) for generous spacing
- **Mobile**: Single column layout, large touch targets, bottom sheet for forms, sticky FAB positioning

## Technical Architecture

**Framework**: Vue 3 with Composition API
- **Reactivity**: Vue 3 reactivity system for component state management
- **Components**: Vue Single File Components (.vue) with TypeScript support
- **State Management**: Vue refs and computed properties for local state, custom useKV hook for persistence

**UI Components**: Custom Vue components inspired by shadcn/ui
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Design System**: Consistent component library built for Vue 3
- **Icons**: Phosphor Icons React (compatible with Vue)

**Data Persistence**: 
- **Local Storage**: Custom useKV composable wrapping spark.kv API
- **Type Safety**: Full TypeScript support with interface definitions
- **Reactive Updates**: Automatic UI updates when data changes

**Build System**:
- **Vite**: Fast development server and build tool optimized for Vue
- **TypeScript**: Full type checking with Vue-specific type definitions
- **Hot Module Replacement**: Instant updates during development