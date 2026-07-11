# Home Screen Frontend Overview — Developer Handoff

> **Document Type:** Technical Reference / Backend Integration Guide  
> **Target Audience:** Senior Developer (or AI Assistant) integrating backend APIs  
> **Status:** Frontend UI complete; all data is static/mocked  
> **Last Updated:** July 11, 2026

---

## Table of Contents

1. [Screen Overview](#1-screen-overview)
2. [Screen Hierarchy](#2-screen-hierarchy)
3. [UI Sections](#3-ui-sections)
4. [Components Used](#4-components-used)
5. [Current Static Data](#5-current-static-data)
6. [State Management](#6-state-management)
7. [Navigation](#7-navigation)
8. [Assets](#8-assets)
9. [Styling](#9-styling)
10. [Performance](#10-performance)
11. [Backend Integration Readiness](#11-backend-integration-readiness)
12. [Integration Priority](#12-integration-priority)
13. [Potential Issues](#13-potential-issues)
14. [Reusable Logic](#14-reusable-logic)
15. [Overall Readiness](#15-overall-readiness)

---

## 1. Screen Overview

### Purpose

`HomeScreen` is the **primary landing screen** of the MockPrep application. It is designed for first-time and returning users who may not have purchased any course, mock test, or subscription yet. Its role is to:

- **Greet and onboard** the user with a personalised greeting
- **Drive engagement** via a hero banner, trending courses, and PYQ (Previous Year Questions) carousels
- **Surface key actions** (take a mock test, explore courses, join live classes, view plans)
- **Build trust** with feature highlights and popular exam listings
- **Convert** through a premium call-to-action section
- **Navigate** the app via a five-tab bottom navigation bar

### User Experience

The screen is a single vertically scrolling `FlatList` with 8 discrete sections. Two sections (Trending Courses, PYQ Practice) contain auto-playing horizontal carousels with a 3.5-second interval. All interactive elements (cards, buttons, tabs) have `TouchableOpacity` wrappers with `activeOpacity` feedback.

> **Important:** Every navigation callback in the current implementation is an **empty stub** (`() => {}`). Tapping any element produces no visible action.

### Design Philosophy

| Principle | Implementation |
|---|---|
| **Component isolation** | Each UI section is a separate `React.memo` component in `src/components/home/` |
| **Declarative data flow** | All data is defined in `HomeScreen.tsx` and passed down as props — no child components fetch their own data |
| **Theme-driven styling** | Every colour, spacing, and typography value comes from `src/theme/` — no hardcoded values |
| **Performance first** | `FlatList`-based scrolling, `React.memo` on all components, `useCallback`/`useMemo` throughout |
| **Accessibility** | `accessibilityRole`, `accessibilityLabel`, `accessibilityState` on interactive elements |

### Current Completion Status

| Aspect | Status |
|---|---|
| UI layout | ✅ Complete |
| Visual design | ✅ Complete (gradients, shadows, illustrations) |
| Component architecture | ✅ Complete |
| Data flow | ✅ Complete (static data architecture) |
| Navigation wiring | ❌ All callbacks are empty stubs |
| API integration | ❌ Not started |
| Loading states | ❌ Not implemented |
| Error states | ❌ Not implemented |
| Empty states | ❌ Not implemented |
| Skeleton loaders | ❌ Not implemented |
| Pull-to-refresh | ❌ Not implemented |
| Offline handling | ❌ Not implemented |

---

## 2. Screen Hierarchy

```
HomeScreen (export default)
│
├── <View style={screen}>
│   │
│   ├── FlatList (vertical, single column)
│   │   │
│   │   ├── Section: "greeting" ──────────────────→ GreetingHeader
│   │   │   userName, onNotificationPress, onProfilePress, hasUnreadNotifications
│   │   │
│   │   ├── Section: "hero" ──────────────────────→ HeroBanner
│   │   │   onExplorePress
│   │   │
│   │   ├── Section: "trending-courses" ──────────→ TrendingCoursesSection
│   │   │   ├── SectionHeader (title="Trending Courses", actionLabel="View All")
│   │   │   ├── FlatList (horizontal, paging, auto-scroll)
│   │   │   │   └── CarouselCard → TrendingCourseCard
│   │   │   │       title, category, description, instructor, rating,
│   │   │   │       totalStudents, price, originalPrice, isBestSeller,
│   │   │   │       gradientColors, illustration, onPress, onExplorePress,
│   │   │   │       onEnrollPress, onBookmarkPress
│   │   │   └── Dots (static page indicators)
│   │   │
│   │   ├── Section: "pyq-practice" ──────────────→ PyqPracticeSection
│   │   │   ├── SectionHeader (title="Practice with PYQs", actionLabel="View All")
│   │   │   ├── FlatList (horizontal, paging, auto-scroll)
│   │   │   │   └── CarouselCard → PyqPracticeCard
│   │   │   │       title, category, features, rating, totalStudents,
│   │   │   │       price, originalPrice, badgeLabel, gradientColors,
│   │   │   │       illustration, onPress, onPreviewPress, onStartPracticePress
│   │   │   └── Dots (static page indicators)
│   │   │
│   │   ├── Section: "quick-start" ───────────────→ SectionHeader("Quick Start") + Grid
│   │   │   └── QuickActionCard (×4, 2×2 grid)
│   │   │       iconName, iconBg, iconColor, title, subtitle, onPress
│   │   │
│   │   ├── Section: "why-choose" ────────────────→ SectionHeader("Why Choose MockPrep?") + Grid
│   │   │   └── FeatureCard (×4, 2×2 grid)
│   │   │       iconName, iconBg, iconColor, title, description
│   │   │
│   │   ├── Section: "popular-exams" ─────────────→ SectionHeader("Popular Exams", "View All") + Grid
│   │   │   └── PopularExamCard (×4, 2×2 grid)
│   │   │       iconName, iconBg, iconColor, title, description, onPress
│   │   │
│   │   └── Section: "cta" ───────────────────────→ CTASection
│   │       onStartFreeTest
│   │
│   └── BottomNav (absolute at bottom)
│       onTabPress
│       └── NavTab (×5)
│           iconName, label, isActive, onPress
```

### Component Ownership

```
src/
├── screens/
│   └── home/
│       └── HomeScreen.tsx          ← Orchestrator: renders sections, holds all data & callbacks
│
├── components/
│   └── home/
│       ├── types.ts                ← Shared interfaces (QuickActionItem, FeatureItem, etc.)
│       ├── Icons.tsx               ← SVG icon component (38 icon names)
│       ├── GreetingHeader.tsx       ← Top greeting section
│       ├── HeroBanner.tsx           ← Hero card with illustration + CTA
│       ├── TrendingCoursesSection.tsx ← Carousel section wrapper
│       ├── TrendingCourseCard.tsx    ← Individual course card (full-bleed image)
│       ├── PyqPracticeSection.tsx    ← Carousel section wrapper
│       ├── PyqPracticeCard.tsx       ← Individual PYQ card (full-bleed image)
│       ├── QuickActionCard.tsx       ← 2×2 grid card for quick actions
│       ├── SectionHeader.tsx         ← Reusable section title with optional action link
│       ├── FeatureCard.tsx           ← 2×2 grid card for features
│       ├── PopularExamCard.tsx       ← 2×2 grid card for exam listings
│       ├── CTASection.tsx            ← "New Here?" call-to-action card
│       └── BottomNav.tsx             ← Five-tab bottom navigation bar
│
└── components/
    └── notification/
        └── NotificationBell.tsx     ← Animated bell icon with unread badge
```

---

## 3. UI Sections

### 3.1 Greeting Header

| Property | Value |
|---|---|
| **File** | `src/components/home/GreetingHeader.tsx` |
| **Purpose** | Welcome the user with a personalised greeting, notification bell, and profile avatar |
| **Visual layout** | Row layout: left column (👋 emoji + "Good Morning!" + userName + subtitle) + right column (NotificationBell + profile avatar circle) |
| **Reusable components** | `Icon` (from `./Icons`), `NotificationBell` (from `../notification/NotificationBell`) |
| **Spacing** | `spacing[12]` top padding, `spacing[20]` horizontal, `spacing[12]` bottom |
| **Styling approach** | Theme tokens (`colors.text.primary`, `typography.title`, `shadows.small`) |
| **Current data source** | `userName` from Redux `selectUser` → `user?.name ?? 'Learner'` |
| **Static or dynamic** | Partially dynamic (user name from Redux); greeting time-of-day ("Good Morning!") is hardcoded |
| **Expected backend data** | User profile (name, avatar URL, unread notification count) |

### 3.2 Hero Banner

| Property | Value |
|---|---|
| **File** | `src/components/home/HeroBanner.tsx` |
| **Purpose** | Premium hero card with headline, illustration, and primary CTA |
| **Visual layout** | Row: left text content (headline + description + "Explore PYQ's" button) + right illustration image. Background is a `LinearGradient` (white → lavender `#F7F5FF`). |
| **Reusable components** | `Icon` (arrow-right), `LinearGradient` from `react-native-linear-gradient` |
| **Spacing** | `spacing[16]` margin horizontal, `spacing[20]` internal padding |
| **Styling approach** | Custom `HERO_PRIMARY` colour (`#4A3AFF`), theme `typography.title` and `typography.body`, shadow style |
| **Current data source** | Hardcoded headline, description, and CTA text |
| **Static or dynamic** | Fully static |
| **Expected backend data** | Hero banner content (headline, description, CTA label, background image, link) — likely from CMS |

### 3.3 Trending Courses Section

| Property | Value |
|---|---|
| **File** | `src/components/home/TrendingCoursesSection.tsx` |
| **Purpose** | Premium auto-scrolling carousel of featured course cards (Netflix/Unacademy style) |
| **Visual layout** | Section header ("Trending Courses" + subtitle + "View All" button) → paging horizontal FlatList (full-width items) → dot indicators. Auto-scrolls every 3.5s with infinite loop. |
| **Reusable components** | `TrendingCourseCard` (from `./TrendingCourseCard`), `Icon`, `SectionHeader` (integrated inline) |
| **Spacing** | `spacing[20]` top margin, `spacing[16]` horizontal padding for header |
| **Styling approach** | 20px tall rounded dots, `colors.secondary` for active dot, `colors.disabled` for inactive |
| **Current data source** | `TRENDING_COURSES` constant in `HomeScreen.tsx` — 8 hardcoded items |
| **Static or dynamic** | Fully static |
| **Expected backend data** | Array of trending/promoted courses from a `courses` table with fields: id, title, category, description, instructor, rating, studentCount, price, originalPrice, isBestSeller, imageUrl |

### 3.4 PYQ Practice Section

| Property | Value |
|---|---|
| **File** | `src/components/home/PyqPracticeSection.tsx` |
| **Purpose** | Auto-scrolling carousel of Previous Year Question practice packs |
| **Visual layout** | Section header ("Practice with PYQs" + subtitle + "View All" button) → paging horizontal FlatList (full-width items) → dot indicators. Auto-scrolls every 3.5s. |
| **Reusable components** | `PyqPracticeCard` (from `./PyqPracticeCard`), `Icon`, `SectionHeader` (integrated inline) |
| **Spacing** | Same as TrendingCoursesSection — `spacing[20]` top margin |
| **Styling approach** | Green-tinted gradient cards with educational background decorations (?, ⏱, 📊 glyphs) |
| **Current data source** | `PYQ_ITEMS` constant in `HomeScreen.tsx` — 7 hardcoded items |
| **Static or dynamic** | Fully static |
| **Expected backend data** | Array of PYQ packs from a `pyq_packs` or `mock_test_packs` table: id, title, category, features[], rating, studentCount, price, originalPrice, badgeLabel, imageUrl |

### 3.5 Quick Start Grid

| Property | Value |
|---|---|
| **File** | Inline in `src/screens/home/HomeScreen.tsx` (renders 4 `QuickActionCard` components) |
| **Purpose** | 2×2 grid of quick-action cards: Mock Test, Courses, Live Classes, Plans |
| **Visual layout** | Section header "Quick Start" → `flexWrap: 'wrap'` grid with `gap: spacing[12]`. Each card: icon circle, title, subtitle, arrow button. |
| **Reusable components** | `SectionHeader`, `QuickActionCard` |
| **Spacing** | `spacing[16]` padding horizontal, `spacing[20]` top margin, `spacing[12]` gap |
| **Styling approach** | White surface cards with `radius.xl` border, `shadows.small`, tinted icon circles |
| **Current data source** | `QUICK_ACTIONS` constant in `HomeScreen.tsx` — 4 hardcoded items |
| **Static or dynamic** | Fully static |
| **Expected backend data** | Quick action links/features — likely static from CMS or local config (may remain static) |

### 3.6 Why Choose Us (Features) Grid

| Property | Value |
|---|---|
| **File** | Inline in `src/screens/home/HomeScreen.tsx` (renders 4 `FeatureCard` components) |
| **Purpose** | 2×2 grid of trust-building feature highlights |
| **Visual layout** | Section header "Why Choose MockPrep?" → vertically centred cards with large circular icons, title, description |
| **Reusable components** | `SectionHeader`, `FeatureCard` |
| **Spacing** | Same grid layout as Quick Start |
| **Styling approach** | Icon-only cards (no card border/shadow) — centred text alignment |
| **Current data source** | `FEATURES` constant in `HomeScreen.tsx` — 4 hardcoded items |
| **Static or dynamic** | Fully static |
| **Expected backend data** | Likely remains static/marketing content — could come from CMS if editable |

### 3.7 Popular Exams Grid

| Property | Value |
|---|---|
| **File** | Inline in `src/screens/home/HomeScreen.tsx` (renders 4 `PopularExamCard` components) |
| **Purpose** | 2×2 grid of popular exam shortcuts for quick navigation |
| **Visual layout** | Section header "Popular Exams" with "View All" action → card grid. Each card: icon circle, exam name, description, arrow. |
| **Reusable components** | `SectionHeader`, `PopularExamCard` |
| **Spacing** | Same grid layout as Quick Start |
| **Styling approach** | Same card style as QuickActionCard (white surface, border, shadow) |
| **Current data source** | `POPULAR_EXAMS` constant in `HomeScreen.tsx` — 4 hardcoded items |
| **Static or dynamic** | Fully static |
| **Expected backend data** | Array of exams from an `exams` table: id, name, description, icon, link |

### 3.8 CTA Section

| Property | Value |
|---|---|
| **File** | `src/components/home/CTASection.tsx` |
| **Purpose** | Conversion-focused "New Here?" card with "Start Free Test" button |
| **Visual layout** | Row layout: left text ("New Here?" + subtitle + amber CTA button) + right illustration image. Warm golden background `#FFF8E7`. |
| **Reusable components** | `Icon` (arrow-right), `Image` (welcome.png illustration) |
| **Spacing** | `spacing[16]` margin horizontal, `spacing[20]` internal padding |
| **Styling approach** | `colors.warning` (`#F59E0B`) for CTA button, `radius.xl` corners, `shadows.small` |
| **Current data source** | Hardcoded static text and illustration |
| **Static or dynamic** | Fully static |
| **Expected backend data** | CTA content (headline, subtitle, button label, link) — static or CMS-driven |

### 3.9 Bottom Navigation

| Property | Value |
|---|---|
| **File** | `src/components/home/BottomNav.tsx` |
| **Purpose** | Five-tab bottom navigation bar (Home, Courses, Mock Tests, Live Classes, Profile) |
| **Visual layout** | Row of 5 tabs with icons + labels. Home tab highlighted with `colors.secondary` colour. |
| **Reusable components** | `Icon` |
| **Spacing** | `spacing[8]` horizontal padding, `spacing[12]` vertical padding |
| **Styling approach** | Surface background with `colors.border` top border |
| **Current data source** | `TABS` constant — 5 hardcoded tab definitions |
| **Static or dynamic** | Static (tab structure is fixed) |
| **Expected backend data** | None — tabs are fixed UI structure |

> **Note:** The actual tab navigation is handled by `MainTabNavigator` (`src/navigation/MainTabNavigator.tsx`) which wraps `HomeScreen`. The `BottomNav` component is a **visual duplicate** that sits within the HomeScreen layout. When the user taps a tab on `BottomNav`, the callback is an empty stub — the real tab switching happens via React Navigation's `BottomTabNavigator`. This creates a **dual-navigation** architecture that needs resolution.

---

## 4. Components Used

### 4.1 GreetingHeader

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `userName` | `string` | No | `'Sudhanshu'` | User's display name |
| `onNotificationPress` | `() => void` | No | — | Callback for notification bell |
| `onProfilePress` | `() => void` | No | — | Callback for profile avatar |
| `hasUnreadNotifications` | `boolean` | No | `false` | Show notification dot/badge |
| `unreadCount` | `number` | No | `0` | Badge count for notifications |

- **State:** None (stateless, memoised)
- **Reusability:** Dedicated to HomeScreen only
- **Used elsewhere:** Only in HomeScreen

### 4.2 HeroBanner

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `onExplorePress` | `() => void` | No | — | Callback for "Explore PYQ's" button |

- **State:** None (stateless, memoised)
- **Reusability:** Could be reused on other marketing screens
- **Used elsewhere:** Only in HomeScreen

### 4.3 SectionHeader

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | Yes | — | Section title text |
| `actionLabel` | `string` | No | — | Optional action text (e.g. "View All") |
| `onActionPress` | `() => void` | No | — | Callback for action tap |

- **State:** None (stateless, memoised)
- **Reusability:** Highly reusable — used in Quick Start, Why Choose, Popular Exams, Trending Courses, PYQ sections
- **Used elsewhere:** Also used in **CoursesScreen**, **Profile Screen**, and potentially any sectioned list

### 4.4 QuickActionCard

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `iconName` | `IconName` | Yes | — | SVG icon identifier |
| `iconBg` | `string` | Yes | — | Background colour for icon circle |
| `iconColor` | `string` | Yes | — | Icon fill colour |
| `title` | `string` | Yes | — | Card title |
| `subtitle` | `string` | Yes | — | Card subtitle |
| `accessibilityLabel` | `string` | Yes | — | Screen reader label |
| `onPress` | `() => void` | No | — | Card press callback |

- **State:** None (stateless, memoised)
- **Reusability:** Dedicated to HomeScreen
- **Used elsewhere:** Only in HomeScreen

### 4.5 FeatureCard

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `iconName` | `IconName` | Yes | — | SVG icon identifier |
| `iconBg` | `string` | Yes | — | Background colour for icon circle |
| `iconColor` | `string` | Yes | — | Icon fill colour |
| `title` | `string` | Yes | — | Feature title |
| `description` | `string` | Yes | — | Feature description |

- **State:** None (stateless, memoised)
- **Reusability:** Could be reused on landing/marketing pages
- **Used elsewhere:** Only in HomeScreen

### 4.6 PopularExamCard

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `iconName` | `IconName` | Yes | — | SVG icon identifier |
| `iconBg` | `string` | Yes | — | Background colour for icon circle |
| `iconColor` | `string` | Yes | — | Icon fill colour |
| `title` | `string` | Yes | — | Exam short name |
| `description` | `string` | Yes | — | Exam full description |
| `accessibilityLabel` | `string` | Yes | — | Screen reader label |
| `onPress` | `() => void` | No | — | Card press callback |

- **State:** None (stateless, memoised)
- **Reusability:** Dedicated to HomeScreen
- **Used elsewhere:** Only in HomeScreen

### 4.7 TrendingCourseCard

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | Yes | — | Course title |
| `category` | `string` | Yes | — | Category chip label |
| `description` | `string` | Yes | — | Course description |
| `instructor` | `string` | Yes | — | Instructor name |
| `rating` | `number` | Yes | — | Rating (0–5) |
| `totalStudents` | `number` | Yes | — | Enrolled students |
| `price` | `number` | Yes | — | Current price in ₹ |
| `originalPrice` | `number` | No | — | Original price for strikethrough |
| `isBestSeller` | `boolean` | Yes | — | Best seller badge flag |
| `gradientColors` | `[string, string, ...string[]]` | Yes | — | Background gradient |
| `illustration` | `string` | Yes | — | Emoji/icon placeholder |
| `onPress` | `() => void` | No | — | Card press callback |
| `onExplorePress` | `() => void` | No | — | "Explore" button callback |
| `onEnrollPress` | `() => void` | No | — | "Enroll Now" button callback |
| `onBookmarkPress` | `() => void` | No | — | Bookmark icon callback |

- **State:** None (stateless, memoised)
- **Reusability:** Could be reused on Courses screen or search results
- **Used elsewhere:** Only in TrendingCoursesSection

### 4.8 PyqPracticeCard

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | Yes | — | PYQ title |
| `category` | `string` | Yes | — | Exam category chip |
| `features` | `PyqFeature[]` | Yes | — | Feature rows (icon + text) |
| `rating` | `number` | Yes | — | Rating (0–5) |
| `totalStudents` | `number` | Yes | — | Student count |
| `price` | `number` | Yes | — | Current price in ₹ |
| `originalPrice` | `number` | No | — | Original price for strikethrough |
| `badgeLabel` | `string` | Yes | — | Badge text (e.g. "🔥 Most Attempted") |
| `gradientColors` | `[string, string, ...string[]]` | Yes | — | Background gradient |
| `illustration` | `string` | Yes | — | Emoji placeholder |
| `onPress` | `() => void` | No | — | Card press callback |
| `onPreviewPress` | `() => void` | No | — | "Preview" button callback |
| `onStartPracticePress` | `() => void` | No | — | "Start Practice" button callback |

- **State:** None (stateless, memoised)
- **Reusability:** Could be reused on PYQ listing screen
- **Used elsewhere:** Only in PyqPracticeSection

### 4.9 CTASection

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `onStartFreeTest` | `() => void` | No | — | "Start Free Test" button callback |

- **State:** None (stateless, memoised)
- **Reusability:** Dedicated to HomeScreen
- **Used elsewhere:** Only in HomeScreen

### 4.10 BottomNav

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `onTabPress` | `(tabKey: string) => void` | No | — | Tab press callback |

- **State:** None (stateless, memoised)
- **Reusability:** Dedicated to HomeScreen (visual-only)
- **Used elsewhere:** Only in HomeScreen

### 4.11 NotificationBell (External Dependency)

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `unreadCount` | `number` | Yes | — | Badge count |
| `onPress` | `() => void` | Yes | — | Press callback |
| `color` | `string` | No | `colors.text.primary` | Icon colour |
| `size` | `number` | No | `24` | Icon size |

- **State:** Animated (pulse using `react-native-reanimated`)
- **Reusability:** Highly reusable across all screens with headers
- **Used elsewhere:** NotificationScreen, various header bars

### 4.12 Icon (Shared Dependency)

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `IconName` | Yes | — | Icon identifier (38 options) |
| `color` | `string` | No | `'currentColor'` | SVG fill colour |
| `width` | `number` | No | `24` | Viewbox width |
| `height` | `number` | No | `24` | Viewbox height |

- **State:** None (stateless, memoised)
- **Reusability:** **Highly reusable** — used across the entire app (HomeScreen, CoursesScreen, TestEngine, Profile, Notifications, etc.)
- **Used elsewhere:** At least 15+ screens and components

---

## 5. Current Static Data

### 5.1 Quick Actions

| File | Variable | Items | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/screens/home/HomeScreen.tsx` | `QUICK_ACTIONS` | 4 items (mock-test, courses, live-classes, plans) | Local config / CMS (may remain static) | Low |

### 5.2 Features (Why Choose Us)

| File | Variable | Items | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/screens/home/HomeScreen.tsx` | `FEATURES` | 4 items (quality, analysis, trusted, support) | Likely static (marketing content) | Low |

### 5.3 Popular Exams

| File | Variable | Items | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/screens/home/HomeScreen.tsx` | `POPULAR_EXAMS` | 4 items (NEET, JEE, Class 12, Class 11) | `exams` database table | Medium |

### 5.4 PYQ Items

| File | Variable | Items | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/screens/home/HomeScreen.tsx` | `PYQ_ITEMS` | 7 items (NEET, JEE, Class 12, UPSC, CUET, SSC, NEET-UG) | `mock_test_packs` or `pyq_packs` database table | High |

### 5.5 Trending Courses

| File | Variable | Items | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/screens/home/HomeScreen.tsx` | `TRENDING_COURSES` | 8 items (NEET crash, JEE Main, Class 12, CUET, UPSC, SSC, Banking, CAT) | `courses` database table | High |

### 5.6 Hero Banner

| File | Location | Content | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/screens/home/HeroBanner.tsx` | Hardcoded in component | Headline: "Ready to achieve your goals?", CTA: "Explore PYQ's" | CMS or config | Medium |

### 5.7 CTA Section

| File | Location | Content | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/components/home/CTASection.tsx` | Hardcoded in component | Headline: "New Here?", CTA: "Start Free Test" | CMS or config | Low |

### 5.8 Bottom Nav Tabs

| File | Variable | Items | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/components/home/BottomNav.tsx` | `TABS` | 5 tabs (Home, Courses, Mock Tests, Live Classes, Profile) | Fixed UI (no backend needed) | None |

### 5.9 Greeting Text

| File | Location | Content | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/components/home/GreetingHeader.tsx` | Hardcoded | "Good Morning!" (time-insensitive) | User profile + time-of-day logic | Medium |

### 5.10 Unread Notifications

| File | Location | Content | Expected Backend Source | Priority |
|---|---|---|---|---|
| `src/screens/home/HomeScreen.tsx` | `hasUnreadNotifications={false}` | Hardcoded `false` | `notifications` table via Supabase | High |

### Complete Static Data Summary

```
┌────────────────────────────────────────────────────────────────────┐
│                  ALL DATA IS CURRENTLY STATIC                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  TRENDING_COURSES  ──── 8 items ────── High Priority              │
│  PYQ_ITEMS         ──── 7 items ────── High Priority              │
│  QUICK_ACTIONS     ──── 4 items ────── Low Priority               │
│  FEATURES          ──── 4 items ────── Low Priority               │
│  POPULAR_EXAMS     ──── 4 items ────── Medium Priority            │
│  Hero Banner       ──── Static text ─── Medium Priority           │
│  CTA Section       ──── Static text ─── Low Priority              │
│  Greeting          ──── Static emoji ── Medium Priority            │
│  Notifications     ──── false ───────── High Priority             │
│  BottomNav         ──── Fixed tabs ──── No backend needed         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 6. State Management

### 6.1 Redux Store

**Store Configuration:** `src/store/store.ts`

| Slice | Reducer | File | Data Used |
|---|---|---|---|
| `auth` | `authReducer` | `src/store/authSlice.ts` | `user` (name, profile) |

**Consumed by HomeScreen:**
```typescript
const user = useAppSelector(selectUser);
// Extracts: user?.name → passed to GreetingHeader as userName
```

**Auth State Shape:**
```typescript
interface AuthState {
  user: UserProfile | null;
  session: SessionData | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  onboardingCompleted: boolean;
}
```

### 6.2 Local State

| Component | State | Type | Purpose |
|---|---|---|---|
| `TrendingCoursesSection` | `activeDotIndex` | `number` | Track current carousel slide |
| `PyqPracticeSection` | `activeDotIndex` | `number` | Track current carousel slide |

Both carousels also use `useRef` for:
- `flatListRef` — reference to the FlatList
- `isInteracting` — flag to pause auto-scroll during user interaction
- `resumeTimer` — timeout reference to resume auto-scroll after 3s of inactivity
- `scrollIndexRef` — mutable ref to track current index (avoids stale closures)

### 6.3 React Query

Not used. The project currently has no data fetching library installed.

### 6.4 Memoization

| Technique | Location | Purpose |
|---|---|---|
| `React.memo` | All 10+ home components | Prevent re-renders when props haven't changed |
| `useCallback` | All handlers (16 callbacks) | Stable function references for child components |
| `useCallback` | `renderSection` | Stable render function for FlatList |
| `useMemo` | `quickActions`, `features`, `popularExams`, `trendingCourses`, `pyqItems` | Stable data references |
| `useMemo` | `loopedCourses`, `loopedItems` | Duplicate data for infinite carousel loop |

---

## 7. Navigation

### 7.1 Current State

**Every navigation callback in HomeScreen is an empty stub:**
```typescript
const handleExplorePress = useCallback(() => {}, []);
const handleNotificationPress = useCallback(() => {}, []);
const handleProfilePress = useCallback(() => {}, []);
const handleActionPress = useCallback((_key: string) => {}, []);
const handleExamPress = useCallback((_key: string) => {}, []);
const handleStartFreeTest = useCallback(() => {}, []);
const handleViewAllExams = useCallback(() => {}, []);
const handleTabPress = useCallback((_tabKey: string) => {}, []);
// ... and more
```

**No navigation wiring exists.** Tapping any interactive element on the HomeScreen does nothing.

### 7.2 Navigation Architecture (Existing)

```
AuthNavigator                   ← Root navigator (src/navigation/AuthNavigator.tsx)
│
├── SplashScreen (while initializing)
├── OnboardingScreen (if not completed)
├── Auth Stack (if not authenticated)
│   ├── LoginScreen
│   ├── RegisterScreen
│   ├── ForgotPasswordScreen
│   └── OtpVerificationScreen
│
└── AppNavigator                ← Authenticated stack (src/navigation/AppNavigator.tsx)
    │
    ├── MainTabs                ← Bottom tab navigator (src/navigation/MainTabNavigator.tsx)
    │   ├── HomeScreen          ← THIS SCREEN
    │   ├── CoursesScreen
    │   ├── MockTestsTabScreen
    │   ├── LiveClassesTabScreen
    │   └── ProfileTabScreen
    │
    ├── Notification            ← NotificationScreen
    ├── TestDashboard           ← TestDashboardScreen
    ├── CourseDetail            ← CourseDetailScreen (params: { courseId })
    ├── PyqPapers               ← PyqPapersScreen (params: defined in screen)
    ├── ExamPackDetail          ← ExamPackDetailScreen (params: defined in screen)
    ├── TestInstructions        ← TestInstructionsScreen (params: defined in screen)
    ├── TestEngine              ← TestEngineScreen (params: defined in screen)
    ├── TestResult              ← TestResultScreen (params: defined in screen)
    └── DevHub                  ← DevNavigator (DEV ONLY)
```

### 7.3 Navigation Targets Mapped to UI Elements

| UI Element | Current Handler | Intended Navigation Target | Params |
|---|---|---|---|
| Greeting notification bell | `handleNotificationPress` | `Notification` | `undefined` |
| Greeting profile avatar | `handleProfilePress` | Tab: Profile (index 4) | — |
| Hero banner "Explore PYQ's" | `handleExplorePress` | `PyqPapers` | TBD |
| Trending course card | `handleCoursePress(key)` | `CourseDetail` | `{ courseId: key }` |
| Trending "Explore" button | `handleHeroExplorePress(key)` | `CourseDetail` or preview | `{ courseId: key }` |
| Trending "Enroll Now" button | `handleHeroEnrollPress(key)` | Checkout / Enroll flow | `{ courseId: key }` |
| Trending "View All" | `handleViewAllTrending` | `CoursesScreen` (tab) | — |
| PYQ card | `handlePyqItemPress(key)` | `ExamPackDetail` | `{ packId: key }` |
| PYQ "Preview" | `handlePyqPreviewPress(key)` | `ExamPackDetail` | `{ packId: key }` |
| PYQ "Start Practice" | `handlePyqStartPracticePress(key)` | `TestInstructions` | `{ testId: key }` |
| PYQ "View All" | `handleViewAllPyq` | `PyqPapers` | TBD |
| Quick Action: Mock Test | `handleActionPress('mock-test')` | Tab: Mock Tests or `TestDashboard` | — |
| Quick Action: Courses | `handleActionPress('courses')` | Tab: Courses | — |
| Quick Action: Live Classes | `handleActionPress('live-classes')` | Tab: Live Classes | — |
| Quick Action: Plans | `handleActionPress('plans')` | Plans/Pricing screen | — |
| Popular Exam card | `handleExamPress(key)` | `TestDashboard` or filtered list | `{ examId: key }` |
| Popular Exams "View All" | `handleViewAllExams` | `TestDashboard` | — |
| CTA "Start Free Test" | `handleStartFreeTest` | `TestInstructions` | `{ testId: 'free-test' }` |
| Bottom nav tabs | `handleTabPress(key)` | Should delegate to tab navigator | — |

### 7.4 Dual Navigation Issue

The HomeScreen has two navigation mechanisms:

1. **React Navigation Bottom Tab Navigator** (`MainTabNavigator`) — handles tab switching at the navigator level
2. **Custom BottomNav component** — visually duplicates the tabs within the screen

When a user taps a tab on the `BottomNav`, the `onTabPress` callback fires — but it's an empty stub. The actual tab switching must happen at the navigator level. **This dual approach needs to be resolved** — either remove the custom `BottomNav` and rely solely on the tab navigator, or wire `onTabPress` to `navigation.navigate()`.

---

## 8. Assets

### 8.1 Image Assets

| Asset | Path | Used In | Type | Dimensions |
|---|---|---|---|---|
| `hero-banner.png` | `assets/hero-banner.png` | `HeroBanner.tsx` | Static PNG, `resizeMode="contain"` | 140px height |
| `neet.png` | `assets/neet.png` | `TrendingCourseCard.tsx` | `ImageBackground`, full-bleed | Full card width |
| `pyq.png` | `assets/pyq.png` | `PyqPracticeCard.tsx` | `ImageBackground`, full-bleed | Full card width |
| `welcome.png` | `assets/images/onboarding/welcome.png` | `CTASection.tsx` | Static PNG, `resizeMode="contain"` | 100px height |

> **Note:** The actual file paths reference `../../../assets/` from within `src/components/home/`. These resolve to `<project_root>/assets/`. Verify that these files exist in the project.

### 8.2 Icon System

| Property | Value |
|---|---|
| **File** | `src/components/home/Icons.tsx` |
| **Library** | `react-native-svg` |
| **Total icons** | 38 named icons |
| **Style** | Feather-style, 24×24 viewBox |
| **Rendering** | `<Svg>` with `<Path>`, `<Circle>`, `<Rect>`, `<G>` elements |

**Complete Icon List:**
```
arrow-left, arrow-right, architecture, atom, badge-check, balance,
bar-chart-2, bell, book, bookmark, book-open, calendar, chevron-right,
clipboard-list, description, download, eye, filter, graduation-cap,
headphones, home, layers, log-out, menu, menu-book, monitor,
more-vertical, play-circle, school, science, search, shield-check,
star, stethoscope, timer, trophy, user, users, video
```

### 8.3 Emoji & Glyph Placeholders

Several components use emoji characters as image placeholders:
- `TrendingCourseCard`: `🔬`, `⚛️`, `📚`, `🎯`, `🏛️`, `📊`, `🏦`, `🎓` (type-specific icons)
- `PyqPracticeCard`: `📄` (document placeholder)
- `GreetingHeader`: `👋` (greeting wave)
- `CTASection`: gift-box illustration (actual image, not emoji)

### 8.4 Fonts

| Font | Status | Notes |
|---|---|---|
| Inter | Not verified | Configured in `typography.ts` as `Platform.select({ ios: 'Inter', android: 'Inter' })`. If not bundled in the app, falls back to system font (SF Pro / Roboto). |

### 8.5 Linear Gradients

The project uses `react-native-linear-gradient` for:
- Hero card subtle gradient (white → lavender)
- Trending course card scrim (dark → transparent)
- PYQ card background decorations (circles, glyphs)
- Course/PYQ card backgrounds (via `gradientColors` prop — not currently using `LinearGradient` in the cards, but `ImageBackground` instead)

### 8.6 Animations

| Library | Used In | Purpose |
|---|---|---|
| `react-native-reanimated` | `NotificationBell.tsx` | Pulse animation on bell icon when unread count > 0 |

---

## 9. Styling

### 9.1 Theme System

**Location:** `src/theme/`
**Entry point:** `src/theme/index.ts`

```
src/theme/
├── index.ts          ← Re-exports all tokens
├── colors.ts         ← Brand palette + semantic tokens
├── typography.ts     ← Font scale (10–44px)
├── spacing.ts        ← 8-point spacing system (0–64)
├── radius.ts         ← Border radii (8–32)
├── shadows.ts        ← Cross-platform shadow presets
├── sizes.ts          ← Avatar, icon, button, badge sizes
├── icons.ts          ← Icon size alias (re-exports from sizes)
├── components.ts     ← Pre-built component styles
└── utils.ts          ← StyleSheet factory helper
```

### 9.2 Colors

```typescript
// Brand (raw)
green:  '#155215'
blue:   '#194080'
successBlue: '#092F6E'

// Semantic
primary:    '#155215'     // Success, progress
secondary:  '#194080'     // CTAs, links, navigation
background: '#F8FAFC'     // Page background
surface:    '#FFFFFF'     // Cards, sheets, modals
text.primary:   '#1E293B'
text.secondary: '#64748B'
text.inverse:   '#FFFFFF'
success:    '#092F6E'
error:      '#DC2626'
warning:    '#F59E0B'     // Also used for CTA button
info:       '#194080'
disabled:   '#CBD5E1'
border:     '#E2E8F0'
divider:    '#F1F5F9'
scrim:      'rgba(0, 0, 0, 0.4)'
highlight:  'rgba(25, 64, 128, 0.08)'

// Component-specific overrides (hardcoded within components)
HeroBanner:      HERO_BG = '#F7F5FF', HERO_PRIMARY = '#4A3AFF'
CTASection:      CTA_BG = '#FFF8E7', CTA_ACCENT = colors.warning
QuickActionCard: Per-card colors (e.g. '#E8F5E9', '#22C55E')
FeatureCard:     Per-card colors (e.g. '#E3F2FD', '#3B82F6')
PopularExamCard: Per-card colors (e.g. '#E8F5E9', '#22C55E')
TrendingCourseCard: White text on dark scrim + amber accents
PyqPracticeCard: White text on dark green scrim + green accents
```

### 9.3 Typography

| Style | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `display` | 44 | 800 | 52.8 | Splash screens, hero |
| `heading1` | 36 | 800 | 44 | Screen titles |
| `heading2` | 28 | 700 | 36 | Card/panel titles |
| `heading3` | 24 | 700 | 32 | Group headings |
| `title` | 20 | 700 | 28 | Card titles |
| `subtitle` | 16 | 600 | 24 | Card subheadings |
| `bodyLarge` | 16 | 400 | 26 | Paragraphs |
| `body` | 14 | 400 | 22 | Default body text |
| `bodySmall` | 12 | 400 | 18 | Secondary info |
| `caption` | 10 | 500 | 14 | Timestamps, metadata |
| `button` | 16 | 700 | 22 | Primary buttons |
| `buttonSmall` | 14 | 700 | 20 | Compact buttons |
| `label` | 14 | 700 | 20 | Input labels |
| `labelSmall` | 12 | 600 | 16 | Tab/chip labels |

### 9.4 Spacing System

8-point grid: `[0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64]`

Key spacings used on HomeScreen:
- `spacing[16]` — card padding, screen horizontal padding
- `spacing[20]` — section margins, internal card padding
- `spacing[12]` — component gaps, section bottom margins
- `spacing[8]` — tight gaps, small padding

### 9.5 Responsive Layout

- **No responsive breakpoints.** The layout uses percentage-based widths (`width: '48%'` for grid items, `width: '65%'` for text columns) and `Dimensions.get('window').width` for carousel items.
- **Safe area:** `useSafeAreaInsets()` provides bottom padding via `insets.bottom + spacing[8]`.
- **Orientation:** Not handled. All layouts assume portrait mode.

### 9.6 Dark Mode Support

**Not implemented.** The theme system has no dark mode tokens. All components hardcode light colours (`#FFFFFF` surfaces, `#F8FAFC` background). Adding dark mode would require:
1. Creating a dark colour palette
2. Building a theme context/switch
3. Updating all component styles

---

## 10. Performance

### 10.1 FlatList Optimizations

| Parameter | HomeScreen (Vertical) | TrendingCoursesSection (Horizontal) | PyqPracticeSection (Horizontal) |
|---|---|---|---|
| `removeClippedSubviews` | ✅ | ✅ | ✅ |
| `initialNumToRender` | 4 | 2 | 2 |
| `maxToRenderPerBatch` | 6 | 3 | 3 |
| `windowSize` | 3 | 3 | 3 |
| `bounces` | (default) | `false` | `false` |
| `getItemLayout` | ❌ | ✅ | ✅ |

### 10.2 Memoized Components

Every component in the home screen tree uses `React.memo`:
- `GreetingHeader` ✅
- `HeroBanner` ✅
- `TrendingCoursesSection` ✅ + `CarouselCard` ✅ + `Dot` ✅ + `RatingStars` ✅
- `PyqPracticeSection` ✅ + `CarouselCard` ✅ + `Dot` ✅ + `BackgroundDecorations` ✅ + `PremiumFeatureRow` ✅
- `QuickActionCard` ✅
- `SectionHeader` ✅
- `FeatureCard` ✅
- `PopularExamCard` ✅
- `CTASection` ✅
- `BottomNav` ✅ + `NavTab` ✅
- `TrendingCourseCard` ✅
- `PyqPracticeCard` ✅

### 10.3 Lazy Loading

- **Tab screens:** `MainTabNavigator` uses `lazy: true` and `freezeOnBlur: true` — only the active tab mounts its screen.
- **Section data:** No lazy loading — all sections render immediately. For 8 sections with small data sets, this is acceptable.
- **Carousel items:** `getItemLayout` on both carousels enables O(1) scroll-to-index without measuring.

### 10.4 Image Optimization

| Asset | Optimization Needed? |
|---|---|
| `hero-banner.png` | Static asset, no optimization applied |
| `neet.png` (card background) | Used as `ImageBackground` — should be optimized (WebP) |
| `pyq.png` (card background) | Used as `ImageBackground` — should be optimized (WebP) |
| `welcome.png` | Static asset, small — probably fine |

> **No lazy image loading library** (e.g. `react-native-fast-image`) is used. Images are loaded with React Native's built-in `Image` component.

### 10.5 Skeleton Loaders

**Not implemented.** The project has `src/components/SkeletonLoader.tsx` available, but it is not used on the HomeScreen. When integrating backend APIs, add skeleton loading states for:
- Trending Courses carousel (while courses load)
- PYQ carousel (while PYQ items load)
- Popular Exams grid (while exams load)
- Greeting Header (while user profile loads)

### 10.6 Animations

| Animation | Component | Library | Performance Impact |
|---|---|---|---|
| Notification bell pulse | `NotificationBell` | `react-native-reanimated` | Runs on UI thread (native) |
| Auto-scroll carousel | Both carousels | `setInterval` + `scrollToIndex` | JS-driven — acceptable for 3.5s frequency |

> The carousel auto-scroll uses `setInterval` on the JS thread. For smoother transitions, consider using `react-native-reanimated` with `useAnimatedScrollHandler`.

---

## 11. Backend Integration Readiness

For every UI section, the following table describes what is needed for full backend integration.

### 11.1 Greeting Header

| Aspect | Status / Details |
|---|---|
| **Current status** | Partially dynamic (user name from Redux); notification count hardcoded to `false` |
| **Backend API required** | `GET /auth/user` (via `authService.getSession()`) — already implemented |
| **Database table(s)** | `auth.users`, `public.profiles` |
| **Service to call** | `authService.getSession()` → returns `SessionData` with `user` |
| **React Query hook required** | Not needed — Redux already handles auth state |
| **Loading state** | ✅ Handled by Redux `loading` flag (already connected) |
| **Error state** | ✅ Handled by Redux `error` field |
| **Empty state** | Default: `userName = 'Learner'` when user is null |
| **Refresh behavior** | Auth state is always current via `AuthProvider` listener |
| **Offline behavior** | Redux retains last known user state; no special handling needed |
| **Caching strategy** | Redux store — persisted via AsyncStorage by Supabase client |

### 11.2 Hero Banner

| Aspect | Status / Details |
|---|---|
| **Current status** | Fully static — hardcoded text and image |
| **Backend API required** | `GET /api/banners` or CMS endpoint (e.g. from a `banners` table) |
| **Database table(s)** | `banners` (new table) or CMS integration |
| **Service to call** | New `bannerService.ts` |
| **React Query hook required** | `useQuery({ queryKey: ['hero-banner'], queryFn: bannerService.getHeroBanner })` |
| **Loading state** | Show skeleton or static fallback while loading |
| **Error state** | Show static fallback banner |
| **Empty state** | Hide section entirely if no active banner |
| **Refresh behavior** | Refetch on screen focus (staleTime: 5 min) |
| **Offline behavior** | Cache last successful banner response |
| **Caching strategy** | React Query with `staleTime: 300000` (5 min) |

### 11.3 Trending Courses Section

| Aspect | Status / Details |
|---|---|
| **Current status** | Fully static — 8 hardcoded items |
| **Backend API required** | `GET /api/courses?trending=true&limit=10` |
| **Database table(s)** | `courses` (with `is_trending` or `is_promoted` flag) |
| **Service to call** | `courseService.getTrendingCourses()` (to be created) |
| **React Query hook required** | `useQuery({ queryKey: ['trending-courses'], queryFn: courseService.getTrendingCourses })` |
| **Loading state** | Carousel skeleton (3 placeholder cards) |
| **Error state** | Section hidden with "Could not load courses" toast |
| **Empty state** | Section hidden if no trending courses |
| **Refresh behavior** | Pull-to-refresh on HomeScreen triggers refetch |
| **Offline behavior** | Show cached courses; show "Offline" indicator |
| **Caching strategy** | React Query with `staleTime: 60000` (1 min), `gcTime: 300000` (5 min) |

### 11.4 PYQ Practice Section

| Aspect | Status / Details |
|---|---|
| **Current status** | Fully static — 7 hardcoded items |
| **Backend API required** | `GET /api/pyq-packs?featured=true&limit=10` |
| **Database table(s)** | `pyq_packs` or `mock_test_packs` |
| **Service to call** | `mockTestService.getFeaturedPacks()` (to be created — see `src/services/mockTest/`) |
| **React Query hook required** | `useQuery({ queryKey: ['featured-pyq'], queryFn: mockTestService.getFeaturedPacks })` |
| **Loading state** | Carousel skeleton (3 placeholder cards) |
| **Error state** | Section hidden with error toast |
| **Empty state** | Section hidden if no PYQ packs |
| **Refresh behavior** | Pull-to-refresh triggers refetch |
| **Offline behavior** | Show cached packs; show "Offline" indicator |
| **Caching strategy** | React Query with `staleTime: 60000`, `gcTime: 300000` |

### 11.5 Quick Start Grid

| Aspect | Status / Details |
|---|---|
| **Current status** | Fully static — 4 hardcoded items |
| **Backend API required** | None — these are navigation shortcuts that can remain static |
| **Database table(s)** | None needed |
| **Service to call** | None |
| **React Query hook required** | None |
| **Loading state** | Always have data (static) |
| **Error state** | Not applicable |
| **Empty state** | Not applicable |
| **Refresh behavior** | Not applicable |
| **Offline behavior** | Always available (static) |
| **Caching strategy** | Static module-level constant |

### 11.6 Why Choose Us (Features) Grid

| Aspect | Status / Details |
|---|---|
| **Current status** | Fully static — 4 hardcoded items |
| **Backend API required** | None (marketing content — can remain static or come from CMS) |
| **Database table(s)** | None needed (or `cms_content` if editable) |
| **Service to call** | None |
| **React Query hook required** | None |
| **Loading state** | Always have data (static) |
| **Error state** | Not applicable |
| **Empty state** | Not applicable |
| **Refresh behavior** | Not applicable |
| **Offline behavior** | Always available |
| **Caching strategy** | Static constant |

### 11.7 Popular Exams Grid

| Aspect | Status / Details |
|---|---|
| **Current status** | Fully static — 4 hardcoded items |
| **Backend API required** | `GET /api/exams?popular=true&limit=8` |
| **Database table(s)** | `exams` |
| **Service to call** | `examService.getPopularExams()` (to be created) |
| **React Query hook required** | `useQuery({ queryKey: ['popular-exams'], queryFn: examService.getPopularExams })` |
| **Loading state** | Grid skeleton (4 placeholder cards) |
| **Error state** | Grid hidden with error toast |
| **Empty state** | Grid hidden |
| **Refresh behavior** | Pull-to-refresh triggers refetch |
| **Offline behavior** | Show cached exams |
| **Caching strategy** | React Query with `staleTime: 300000` (5 min) |

### 11.8 CTA Section

| Aspect | Status / Details |
|---|---|
| **Current status** | Fully static — hardcoded text and image |
| **Backend API required** | None — or CMS endpoint if content should be editable |
| **Database table(s)** | None (or `cms_content`) |
| **Service to call** | None |
| **React Query hook required** | None |
| **Loading state** | Always have data |
| **Error state** | Not applicable |
| **Empty state** | Not applicable |
| **Refresh behavior** | Not applicable |
| **Offline behavior** | Always available |
| **Caching strategy** | Static |

### 11.9 Bottom Navigation

| Aspect | Status / Details |
|---|---|
| **Current status** | Static — 5 fixed tabs |
| **Backend API required** | None |
| **Database table(s)** | None |
| **Service to call** | None |
| **React Query hook required** | None |
| **Loading state** | Always visible |
| **Error state** | Not applicable |
| **Empty state** | Not applicable |
| **Refresh behavior** | Not applicable |
| **Offline behavior** | Always available |
| **Caching strategy** | Static |

---

## 12. Integration Priority

### Priority Matrix

| Priority | Section | Rationale | Effort | Impact |
|---|---|---|---|---|
| **P0** | **Notifications (Greeting)** | Unread count is the most impactful real-time data point currently hardcoded to `false` | Low | High |
| **P1** | **Trending Courses** | Core revenue-driving content; currently 8 hardcoded items | Medium | High |
| **P1** | **PYQ Practice** | Core engagement content; currently 7 hardcoded items | Medium | High |
| **P2** | **Popular Exams** | Navigation accelerator; currently 4 hardcoded items | Medium | Medium |
| **P2** | **Hero Banner** | Marketing content; could be CMS-driven | Medium | Medium |
| **P3** | **Navigation Wiring** | All callbacks are empty stubs; without this nothing is clickable | Low | Critical |
| **P3** | **Greeting Time-of-Day** | Currently always "Good Morning!" — add time-aware greeting | Low | Low |
| **P4** | **CTA Section** | Static content; no backend needed unless CMS-driven | None | Low |
| **P4** | **Quick Start** | Static shortcuts; no backend needed | None | Low |
| **P4** | **Why Choose Us** | Static marketing; no backend needed | None | Low |

### Recommended Implementation Order

```
Phase 1 (Day 1)
├── Wire navigation callbacks (P3 — critical enabler)
│   └── Without navigation, no interactive element works
│
Phase 2 (Day 1–2)
├── Integrate notifications unread count (P0)
│   └── Simple API call, high user-perceptible impact
│
Phase 3 (Day 2–3)
├── Integrate Trending Courses (P1)
├── Integrate PYQ Practice (P1)
│   └── Both follow the same pattern: fetch → display → handle tap
│
Phase 4 (Day 3–4)
├── Integrate Popular Exams (P2)
├── Integrate Hero Banner (P2)
│
Phase 5 (Day 4–5)
├── Add loading states, error states, empty states
├── Add skeleton loaders
├── Add pull-to-refresh
├── Add offline caching
│
Phase 6 (Polish)
├── Add greeting time-of-day logic
├── Resolve dual-navigation issue
├── Add dark mode support (if in scope)
```

---

## 13. Potential Issues

### 13.1 Critical Issues

| Issue | Severity | Description | Resolution |
|---|---|---|---|
| **Empty navigation callbacks** | 🔴 Critical | All 16+ callbacks are `() => {}` stubs. Tapping any element does nothing. | Wire all callbacks to `navigation.navigate(...)` using the `useNavigation` hook. |
| **Dual bottom navigation** | 🔴 Critical | `BottomNav` inside HomeScreen visually duplicates `MainTabNavigator` tabs. User confusion — tapping a tab on `BottomNav` does nothing; tapping the OS-level tab bar works. | Either (a) remove `BottomNav` from HomeScreen and rely solely on `MainTabNavigator`, or (b) wire `BottomNav.onTabPress` to `navigation.navigate()`. |
| **No loading states** | 🟠 High | When APIs are integrated, sections will flash empty while data loads. | Add `ActivityIndicator` skeletons for carousels and grids using existing `SkeletonLoader` component. |
| **No error states** | 🟠 High | API failures would silently break sections. | Add error banners/toasts per section. |
| **No empty states** | 🟠 High | If API returns empty arrays, sections will render with blank headers. | Conditionally hide empty sections. |

### 13.2 Architectural Issues

| Issue | Severity | Description | Resolution |
|---|---|---|---|
| **Missing React Query** | 🟠 High | The project has no data-fetching library. Adding `@tanstack/react-query` is recommended for all API calls. | Install and wrap with `QueryClientProvider`. |
| **Data in HomeScreen.tsx** | 🟡 Medium | All data arrays are defined in `HomeScreen.tsx`. As more sections become dynamic, this file will grow. | Move API calls to custom hooks (`useTrendingCourses`, `useFeaturedPyq`, `usePopularExams`). |
| **No useNotifications on HomeScreen** | 🟡 Medium | `useNotifications` hook exists (`src/hooks/useNotifications.ts`) but is NOT used by HomeScreen. The greeting header hardcodes `hasUnreadNotifications={false}`. | Import and call `useNotifications()` to get `unreadCount`. |
| **Static greeting time** | 🟢 Low | "Good Morning!" is hardcoded. Does not respond to time of day. | Add simple `getGreeting()` utility. |
| **User avatar placeholder** | 🟢 Low | Profile avatar shows a generic `user` icon instead of actual avatar from profile. | Pass `avatarUrl` from `user?.avatarUrl` to `GreetingHeader`. |

### 13.3 Data Shape Inconsistencies

| Issue | Severity | Description | Resolution |
|---|---|---|---|
| **PyqItem.features vs description** | 🟡 Medium | The `PyqItem` type has both `features: PyqFeature[]` (icon+text rows) and `description: string`. In the current data, `features` is not populated (the description field contains the feature text with checkmarks). The `PyqPracticeCard` renders `features` but the static data uses `description` as a plain string. | Either (a) align static data with type definition and populate `features`, or (b) remove `features` from type and use `description` in `PyqPracticeCard`. |
| **TrendingCourse gradientColors prop** | 🟢 Low | `TrendingCourseItem` has `gradientColors: [string, string, ...string[]]` but `TrendingCourseCard` does NOT use a gradient — it uses `ImageBackground` with a `LinearGradient` scrim. The `gradientColors` property is defined in the type but unused in rendering. | Remove unused prop or use it. |

### 13.4 Image & Asset Issues

| Issue | Severity | Description | Resolution |
|---|---|---|---|
| **Missing image files** | 🟡 Medium | The code references `assets/hero-banner.png`, `assets/neet.png`, `assets/pyq.png`, and `assets/images/onboarding/welcome.png`. Verify these exist in the project. | Add placeholder images if missing. |
| **No image optimization** | 🟢 Low | Images loaded with built-in `Image` component — no caching, no progressive loading. | Consider `react-native-fast-image` for production. |

### 13.5 Performance Concerns

| Issue | Severity | Description | Resolution |
|---|---|---|---|
| **Carousel auto-scroll uses JS timer** | 🟡 Medium | `setInterval` in `useEffect` for auto-scroll. While screen is focused, this runs every 3.5s. | Acceptable for now. Consider native driver if jank observed. |
| **Large card components** | 🟢 Low | `TrendingCourseCard` and `PyqPracticeCard` are complex (nested Views, gradients, images, multiple buttons). | These are already `React.memo`'d. Monitor render performance. |

---

## 14. Reusable Logic

### 14.1 Business Logic That Can Be Shared

| Logic | HomeScreen | CourseScreen | TestEngine | Profile | Notifications | LiveClasses |
|---|---|---|---|---|---|---|
| **User greeting (time-of-day)** | ✅ Uses | Could use | — | Could use | — | — |
| **Unread notification count** | ✅ Uses | Could use | Could use | ✅ Uses | ✅ Uses | Could use |
| **Course card rendering** | ✅ Uses | ✅ Uses | — | — | — | ✅ Uses |
| **Price formatting (₹)** | ✅ Uses | ✅ Uses | ✅ Uses | — | — | ✅ Uses |
| **Rating stars rendering** | ✅ Uses | ✅ Uses | ✅ Uses | — | — | ✅ Uses |
| **Icon system (Icons.tsx)** | ✅ Uses | ✅ Uses | ✅ Uses | ✅ Uses | ✅ Uses | ✅ Uses |
| **Carousel auto-scroll** | ✅ Uses | Could use | — | — | — | Could use |
| **Exam card navigation** | ✅ Uses | ✅ Uses | — | — | — | — |

### 14.2 Hooks for Extraction

When integrating backend APIs, extract these custom hooks from `HomeScreen.tsx`:

```typescript
// Proposed hook structure
useTrendingCourses() → { courses, isLoading, error, refetch }
useFeaturedPyq() → { items, isLoading, error, refetch }
usePopularExams() → { exams, isLoading, error, refetch }
useGreeting() → { greeting: string, userName: string, avatarUrl: string | null }
useHomeScreenNavigation() → { navigateTo*, handle* }  // all nav callbacks
```

### 14.3 Services Already Available

The following services exist and could be repurposed for HomeScreen:

| Service | File | Status | Can be used for |
|---|---|---|---|
| `authService.getSession()` | `src/services/authService.ts` | ✅ Ready | User profile (name, avatar) |
| `notificationService.getNotifications()` | `src/services/notificationService.ts` | ✅ Ready (mocked) | Unread notification count |
| `resultService` | `src/services/resultService.ts` | ✅ Ready | User activity stats |

The following services would need to be created:

| Needed Service | For |
|---|---|
| `courseService.getTrendingCourses()` | Trending Courses carousel |
| `mockTestService.getFeaturedPacks()` | PYQ Practice carousel |
| `examService.getPopularExams()` | Popular Exams grid |
| `bannerService.getHeroBanner()` | Hero banner content |

---

## 15. Overall Readiness

### Completion Metrics

| Metric | Value |
|---|---|
| **Frontend UI completion** | 100% |
| **Backend integration readiness** | 0% |
| **Navigation wiring** | 0% |
| **Loading states** | 0% (not implemented) |
| **Error states** | 0% (not implemented) |
| **Empty states** | 0% (not implemented) |
| **Offline support** | 0% (not implemented) |
| **Data fetching** | 0% (all static) |

### Integration Complexity Assessment

| Aspect | Complexity | Notes |
|---|---|---|
| Architecture | 🟡 Medium | Component tree is clean; data flows top-down. Adding a data layer (React Query) is straightforward. |
| Data volume | 🟢 Low | 3 primary data sources (courses, PYQ packs, exams) — simple GET endpoints. |
| State management | 🟢 Low | Redux for auth only. React Query for data. No complex state interactions. |
| Navigation | 🟡 Medium | 16 callbacks to wire, but all map clearly to existing routes. |
| Loading/Error/Empty | 🟡 Medium | Need to add states for 3–4 sections. The existing `SkeletonLoader` component can be reused. |
| Testing | 🟢 Low | Components are pure and memoised — unit testing is straightforward. |
| **Overall** | **🟡 Medium** | Low complexity per section; medium complexity due to number of sections. |

### Recommended First API to Integrate

> **Start with notifications (`notificationService.getNotifications()`).**
> - Service already exists (mocked)
> - `useNotifications` hook already exists
> - Only needs `unreadCount` — a single number
> - High user-perceptible impact (red badge on bell)
> - Quickest path to a "live" data point on the screen

### Recommended Implementation Order

```
1.  Wire all navigation callbacks (enables testing)
2.  Connect notifications unread count (existing service)
3.  Integrate Trending Courses (new service + React Query)
4.  Integrate PYQ Practice (new service + React Query)
5.  Integrate Popular Exams (new service + React Query)
6.  Add skeleton loaders for all dynamic sections
7.  Add error states for all dynamic sections
8.  Add empty states for all dynamic sections
9.  Add pull-to-refresh
10. Add offline caching strategy
11. Resolve dual-navigation (BottomNav vs MainTabNavigator)
12. Polish: time-of-day greeting, avatar display
```

---

## Appendix A: File Index

| File | Path | Lines | Purpose |
|---|---|---|---|
| HomeScreen | `src/screens/home/HomeScreen.tsx` | ~600 | Main screen orchestrator |
| Types | `src/components/home/types.ts` | ~250 | Shared interfaces |
| Icons | `src/components/home/Icons.tsx` | ~450 | SVG icon definitions |
| GreetingHeader | `src/components/home/GreetingHeader.tsx` | ~150 | Top greeting section |
| HeroBanner | `src/components/home/HeroBanner.tsx` | ~180 | Hero card |
| TrendingCoursesSection | `src/components/home/TrendingCoursesSection.tsx` | ~360 | Course carousel wrapper |
| TrendingCourseCard | `src/components/home/TrendingCourseCard.tsx` | ~350 | Course card |
| PyqPracticeSection | `src/components/home/PyqPracticeSection.tsx` | ~355 | PYQ carousel wrapper |
| PyqPracticeCard | `src/components/home/PyqPracticeCard.tsx` | ~380 | PYQ card |
| QuickActionCard | `src/components/home/QuickActionCard.tsx` | ~140 | Quick action card |
| SectionHeader | `src/components/home/SectionHeader.tsx` | ~80 | Section title |
| FeatureCard | `src/components/home/FeatureCard.tsx` | ~90 | Feature card |
| PopularExamCard | `src/components/home/PopularExamCard.tsx` | ~135 | Exam card |
| CTASection | `src/components/home/CTASection.tsx` | ~150 | CTA section |
| BottomNav | `src/components/home/BottomNav.tsx` | ~140 | Bottom navigation bar |
| NotificationBell | `src/components/notification/NotificationBell.tsx` | ~120 | Animated bell icon |
| Auth Store | `src/store/authSlice.ts` | ~200 | Redux auth slice |
| MainTabNavigator | `src/navigation/MainTabNavigator.tsx` | ~180 | Tab navigation |
| AppNavigator | `src/navigation/AppNavigator.tsx` | ~120 | Stack navigation |

## Appendix B: Icon Quick Reference

```
Icon Names Used on HomeScreen
─────────────────────────────
arrow-right       → Hero CTA, QuickActionCard, PopularExamCard,
                    SectionHeader "View All", CTASection button
bell              → NotificationBell (via GreetingHeader)
user              → Profile avatar, BottomNav Profile tab
home              → BottomNav Home tab
book-open         → QuickAction "Courses", BottomNav Courses tab
clipboard-list    → QuickAction "Mock Test", BottomNav Mock Tests tab
play-circle       → QuickAction "Live Classes", BottomNav Live Classes tab
bar-chart-2       → QuickAction "Plans"
badge-check       → Feature "Quality"
trophy            → Feature "Analysis", TrendingCourse "Best Seller" badge
shield-check      → Feature "Trusted"
headphones        → Feature "Support"
stethoscope       → PopularExam "NEET"
atom              → PopularExam "JEE"
graduation-cap    → PopularExam "Class 12"
book              → PopularExam "Class 11"
eye               → TrendingCourse "Explore" button, PYQ "Preview" button
bookmark          → TrendingCourse bookmark icon
star              → Rating stars
```

## Appendix C: State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATE FLOW ARCHITECTURE                      │
│                                                                 │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────┐  │
│  │  Supabase DB │────▶│  AuthService     │────▶│  Redux     │  │
│  │  (profiles)  │     │  (getSession)    │     │  (auth)    │  │
│  └──────────────┘     └──────────────────┘     └─────┬──────┘  │
│                                                       │         │
│                                                       ▼         │
│  ┌──────────────┐                              ┌────────────┐  │
│  │  Future:      │     ┌──────────────────┐    │ HomeScreen │  │
│  │  Courses API  │────▶│  React Query     │───▶│            │  │
│  │  PYQ API      │     │  (to be added)   │    │ selectUser │  │
│  │  Exams API    │     └──────────────────┘    └─────┬──────┘  │
│  └──────────────┘                                    │         │
│                                                       ▼         │
│                                              ┌────────────────┐ │
│                                              │  Components    │ │
│                                              │  (via props)   │ │
│                                              └────────────────┘ │
│                                                                 │
│  ┌──────────────┐     ┌──────────────────┐                      │
│  │  Static Data │────▶│  Module-level    │──────────────────────│
│  │  (constants) │     │  QUICK_ACTIONS,  │                      │
│  └──────────────┘     │  FEATURES, etc.  │                      │
│                       └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

*End of document. This is a living reference — update as the backend integration progresses.*
