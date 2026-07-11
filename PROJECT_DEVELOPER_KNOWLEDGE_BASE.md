# MockTestApp — Developer Knowledge Base

> **Generated:** July 11, 2026  
> **Platform:** React Native (iOS + Android)  
> **Framework:** React Native CLI (not Expo)  
> **Backend:** Supabase (PostgreSQL + Auth + Storage)  
> **Monorepo:** Single application; admin and student UIs are separate later targets.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [Folder Structure](#3-folder-structure)
4. [Application Architecture](#4-application-architecture)
5. [Authentication System](#5-authentication-system)
6. [Database Architecture](#6-database-architecture)
7. [Services](#7-services)
8. [React Query (TanStack Query)](#8-react-query-tanstack-query)
9. [Redux](#9-redux)
10. [React Native App Screens](#10-react-native-app-screens)
11. [Batch System](#11-batch-system)
12. [Question System](#12-question-system)
13. [Mock Test System](#13-mock-test-system)
14. [Student Exam Flow](#14-student-exam-flow)
15. [Error Handling](#15-error-handling)
16. [Security](#16-security)
17. [Important Architectural Decisions](#17-important-architectural-decisions)
18. [Known Issues & Future Improvements](#18-known-issues--future-improvements)
19. [Testing](#19-testing)
20. [Deployment Architecture](#20-deployment-architecture)
21. [Development Guidelines](#21-development-guidelines)
22. [Project Statistics](#22-project-statistics)

---

## 1. Project Overview

### What the application does

MockTestApp (branded as "MockPrep" / "EduMastery" in the UI) is a **mobile exam preparation platform** for Indian competitive exams. Students can:

- Practice **previous year questions (PYQs)** with timed mock tests
- Track **performance analytics** with per-subject breakdowns
- Access **courses and batch programs** with instructor-led learning
- Take **live classes** (planned)
- Receive **notifications** about results, new tests, announcements

### Target users

- **Students** (primary): JEE, NEET, CUET, CLAT, SSC, UPSC aspirants (Classes 8–12 and beyond)
- **Teachers** (planned): Create content, manage batches, view student performance
- **Admins** (planned): Manage institute structure, approve content, oversee operations

### User roles (database schema supports)

| Role | Description | Status |
|------|-------------|--------|
| `student` | Takes tests, views results, enrolls in batches | UI: Partial (screens exist but no real backend integration) |
| `teacher` | Creates content, manages batches | Schema + Services: Complete. UI: Not started |
| `admin` | Institute-level administration | Schema: Complete. Services: Partial. UI: Not started |
| `super_admin` | Cross-institute management | Schema: Complete. Services: Not started |

### Overall architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Native App                       │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Screens  │  │ Components│  │Navigation│               │
│  └────┬────┘  └────┬─────┘  └────┬─────┘               │
│       │             │             │                      │
│  ┌────▼─────────────▼─────────────▼─────┐               │
│  │           Custom Hooks                │               │
│  │   (React Query + useAuth + etc.)      │               │
│  └────────────────┬──────────────────────┘               │
│                   │                                      │
│  ┌────────────────▼──────────────────────┐               │
│  │            Service Layer               │               │
│  │    (Supabase anon key, no RLS bypass)  │               │
│  └────────────────┬──────────────────────┘               │
│                   │                                      │
│  ┌────────────────▼──────────────────────┐               │
│  │         Supabase Client                │               │
│  │   (Auth + Database + Storage)          │               │
│  └────────────────┬──────────────────────┘               │
└───────────────────┼──────────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────────┐
│                    Supabase Platform                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐           │
│  │PostgreSQL│  │    Auth      │  │ Storage  │           │
│  │ (RLS)    │  │ (Phone OTP)  │  │ (Images) │           │
│  └──────────┘  └──────────────┘  └──────────┘           │
└──────────────────────────────────────────────────────────┘
```

### High-level workflow

1. User installs app → sees splash → onboarding (3 screens) → login/register via phone OTP
2. After login, user sees home screen with greeting, hero banner, trending courses, PYQ practice sections
3. User can browse exams (JEE, NEET, CUET, etc.) and drill into exam pack details
4. User takes mock tests → views detailed results with per-subject breakdowns
5. User tracks progress via profile screen (stats, settings)

---

## 2. Complete Technology Stack

### Frontend (React Native)

| Technology | Version (approx.) | Purpose |
|------------|-------------------|---------|
| React Native | 0.76+ | Cross-platform mobile framework (CLI, not Expo) |
| TypeScript | ~5.x | Type safety across the entire codebase |
| React Navigation | ^7 | Screen routing (stack, tab, native stack) |
| @tanstack/react-query | ^5 | Server state management, caching, mutations |
| Redux Toolkit | ^2 | Client-only state (auth slice) |
| react-native-reanimated | ^3 | UI-thread animations (press feedback, toast, skeleton) |
| react-native-safe-area-context | ^4 | Safe area insets for notches and home indicators |
| react-native-linear-gradient | ^2 | Gradient backgrounds for glassmorphism cards |
| react-native-vector-icons | ^10 | Icon library |
| Charts | — | Not yet implemented (planned: Recharts/Chart.js for web admin panel) |
| Video / Live Classes | — | Not yet implemented (planned: Jitsi integration for live classes) |
| react-native-gesture-handler | ^2 | Gesture handling (required by navigation) |
| react-native-screens | ^4 | Native screen containers for performance |
| AsyncStorage | ^1 | Local persistence (auth tokens, preferences) |

### Backend (Supabase)

| Technology | Purpose |
|------------|---------|
| PostgreSQL 15 | Primary database with 15+ domain schemas |
| Supabase Auth | Phone-based OTP authentication via MSG91 |
| Supabase Storage | File/image uploads (question images, avatars) |
| Row-Level Security (RLS) | Fine-grained access control at database level |
| Supabase Edge Functions | Serverless functions (send-msg91-otp) |
| Deno | Edge Function runtime |

### Build & Development

| Tool | Purpose |
|------|---------|
| Metro Bundler | React Native JavaScript bundler |
| Babel | JavaScript transpilation |
| Jest | Unit testing framework |
| ESLint | Code linting (`.eslintrc.js`) |
| Prettier | Code formatting (`.prettierrc.js`) |
| Yarn / npm | Package management |
| CocoaPods | iOS dependency management |
| Gradle | Android build system |

### Authentication

| Service | Purpose |
|---------|---------|
| Supabase Auth | Core authentication provider |
| MSG91 (via Edge Function) | SMS OTP delivery for phone login |
| Custom phone-first auth flow | 4 SQL migrations adapting Supabase Auth for Indian phone numbers |

### Theme & UI

| Resource | Purpose |
|----------|---------|
| Custom theme system | `src/theme/` — colors, typography, spacing, radius, shadows, icons, component styles |
| Custom SVG Icon component | `src/components/home/Icons.tsx` — hand-crafted SVG icon set |
| Glassmorphism design language | Used in exam cards on MockTestsTabScreen |
| Shimmer skeletons | `src/components/SkeletonLoader.tsx` — premium animated loading states |

---

## 3. Folder Structure

```
MockTestApp/
├── App.tsx                          # Root component, wraps providers
├── index.js                         # Entry point (registers App)
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── babel.config.js                  # Babel config
├── metro.config.js                  # Metro bundler config
├── jest.config.js                   # Jest test config
├── Gemfile                          # Ruby deps (CocoaPods)
├── .eslintrc.js                     # ESLint rules
├── .prettierrc.js                   # Prettier formatting
│
├── src/
│   ├── components/                  # Shared/reusable UI components
│   │   ├── AnimatedPressable.tsx    # Reanimated press wrapper (scale + opacity)
│   │   ├── PhoneNumberInput.tsx     # India +91 phone input with validation
│   │   ├── SkeletonLoader.tsx       # Shimmer skeleton variants
│   │   ├── Toast.tsx                # Premium toast with context provider
│   │   └── home/                    # Home screen sub-components
│   │       ├── types.ts             # Shared types for home components
│   │       ├── GreetingHeader.tsx   # User greeting + notifications
│   │       ├── HeroBanner.tsx       # Promotional banner carousel
│   │       ├── QuickActionCard.tsx  # Quick action button card
│   │       ├── FeatureCard.tsx      # Why-choose-us feature card
│   │       ├── PopularExamCard.tsx  # Exam card with rating
│   │       ├── CTASection.tsx       # Bottom call-to-action
│   │       ├── SectionHeader.tsx    # Section title + optional action
│   │       ├── TrendingCourseCard.tsx / TrendingCoursesSection.tsx
│   │       ├── PyqPracticeCard.tsx / PyqPracticeSection.tsx
│   │       ├── BatchCard.tsx / BatchesSection.tsx
│   │       ├── BottomNav.tsx        # Bottom navigation tabs
│   │       └── Icons.tsx            # Custom SVG icon set
│   │
│   ├── config/                      # App configuration
│   │   ├── supabase.ts              # Supabase client initialization
│   │   └── storage.ts               # AsyncStorage key constants
│   │
│   ├── constants/                   # App-wide constants
│   │   └── notificationIcons.ts     # Notification type → icon/color mapping
│   │
│   ├── data/                        # Mock data for development
│   │   ├── mockTestEngine.ts        # 30 mock questions + test config
│   │   └── mockTestResult.ts        # Complete test result with breakdown
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts               # Auth state + helpers (wraps AuthProvider)
│   │   ├── useAnimations.tsx        # Reanimated press animation hook
│   │   ├── useNotifications.ts      # Notification state + unread count
│   │   ├── useStreams.ts            # React Query: streams
│   │   ├── useSubjects.ts           # React Query: subjects
│   │   ├── useTestTimer.ts          # Countdown timer for test engine
│   │   ├── academic/                # Academic module hooks
│   │   │   ├── queryKeys.ts         # Query key factory (streams, subjects, chapters, topics, batches)
│   │   │   ├── useStreams.ts        # Stream queries + mutations
│   │   │   ├── useSubjects.ts       # Subject queries + mutations
│   │   │   └── useBatches.ts        # Batch queries + mutations
│   │   ├── content/                 # Content module hooks
│   │   │   ├── queryKeys.ts         # Query key factory (contents, tags, approvals)
│   │   │   ├── useContent.ts        # Content CRUD hooks
│   │   │   └── useApproval.ts       # Approval workflow hooks
│   │   └── mockTest/                # Mock test module hooks
│   │       ├── queryKeys.ts         # Query key factory (questions, options, explanations, images, mock tests, publish)
│   │       ├── useQuestions.ts      # Question CRUD hooks
│   │       ├── useMockTests.ts      # Mock test CRUD hooks
│   │       ├── useMockTestQuestions.ts  # MT-Question assignment hooks
│   │       └── useMockTestPublish.ts    # Publish workflow hooks
│   │
│   ├── mocks/                       # Mock data files
│   │   └── notifications.ts         # 18 mock notifications across 8 types
│   │
│   ├── navigation/                  # React Navigation configuration
│   │   ├── AppNavigator.tsx         # Root stack navigator (auth vs main)
│   │   ├── AuthNavigator.tsx        # Auth flow stack (login, register, OTP)
│   │   ├── MainTabNavigator.tsx     # Bottom tab navigator (home, mock tests, live classes, profile)
│   │   └── DevNavigator.tsx         # Developer testing screens
│   │
│   ├── providers/                   # React context providers
│   │   └── AuthProvider.tsx         # Auth state context + session restore
│   │
│   ├── screens/                     # Screen components
│   │   ├── auth/                    # Authentication screens
│   │   │   ├── LoginScreen.tsx      # Phone number input
│   │   │   ├── RegisterScreen.tsx   # Registration form
│   │   │   └── OtpVerificationScreen.tsx  # OTP input
│   │   ├── splash/                  # Splash screen
│   │   │   └── SplashScreen.tsx
│   │   ├── onboarding/              # Onboarding screens
│   │   │   ├── OnboardingScreen.tsx         # Container with pagination
│   │   │   ├── OnboardingScreenOne.tsx      # Welcome slide
│   │   │   ├── OnboardingScreenTwo.tsx      # Features slide
│   │   │   └── OnboardingScreenThree.tsx    # Get started slide
│   │   ├── home/
│   │   │   └── HomeScreen.tsx       # Main dashboard (FlatList of sections)
│   │   ├── tabs/                    # Tab screen content
│   │   │   ├── MockTestsTabScreen.tsx   # Exam selection with glass cards
│   │   │   ├── LiveClassesTabScreen.tsx  # Live classes (placeholder)
│   │   │   └── ProfileTabScreen.tsx     # User profile + settings
│   │   ├── tests/                   # Test-related screens
│   │   │   ├── TestDashboardScreen.tsx
│   │   │   ├── TestInstructionsScreen.tsx
│   │   │   ├── TestEngineScreen.tsx
│   │   │   ├── TestResultScreen.tsx
│   │   │   ├── ExamPackDetailScreen.tsx
│   │   │   └── PyqPapersScreen.tsx
│   │   ├── courses/                 # Course screens
│   │   │   ├── CourseDetailScreen.tsx
│   │   │   └── CoursesScreen.tsx
│   │   ├── dev/                     # Developer testing screens
│   │   │   ├── index.ts            # Barrel export + screen configs
│   │   │   ├── StreamServiceTestScreen.tsx
│   │   │   ├── SubjectServiceTestScreen.tsx
│   │   │   ├── ChapterServiceTestScreen.tsx
│   │   │   ├── TopicServiceTestScreen.tsx
│   │   │   ├── ContentServiceTestScreen.tsx
│   │   │   ├── TagServiceTestScreen.tsx
│   │   │   ├── ApprovalServiceTestScreen.tsx
│   │   │   └── QuestionServiceTestScreen.tsx
│   │   └── NotificationScreen.tsx   # Notification list with filters
│   │
│   ├── services/                    # Business logic layer (Supabase clients)
│   │   ├── authService.ts           # Authentication API calls
│   │   ├── classService.ts          # Class/live session management
│   │   ├── notificationService.ts   # Notification CRUD
│   │   ├── resultService.ts         # Test result management
│   │   ├── testEngineService.ts     # Test engine operations
│   │   ├── academic/                # Academic structure services
│   │   │   ├── streamService.ts      # Stream CRUD
│   │   │   ├── subjectService.ts     # Subject CRUD
│   │   │   ├── chapterService.ts     # Chapter CRUD
│   │   │   ├── topicService.ts       # Topic CRUD
│   │   │   └── batchService.ts       # Batch CRUD + teacher/student assignment (placeholders)
│   │   ├── content/                 # Content management services
│   │   │   ├── contentService.ts     # Content CRUD
│   │   │   ├── approvalService.ts    # Approval workflow (submit, approve, reject)
│   │   │   └── tagService.ts         # Tag CRUD
│   │   ├── mockTest/                # Mock test services
│   │   │   ├── questionService.ts         # Question CRUD
│   │   │   ├── questionOptionService.ts   # Option CRUD
│   │   │   ├── questionExplanationService.ts  # Explanation CRUD
│   │   │   ├── questionImageService.ts    # Image CRUD
│   │   │   ├── mockTestService.ts         # Mock test CRUD
│   │   │   ├── mockTestQuestionService.ts # MT-Question assignment
│   │   │   └── mockTestPublishService.ts  # Publish workflow + validation
│   │   └── storage/                # Storage service
│   │       └── storageService.ts    # File upload/download from Supabase Storage
│   │
│   ├── store/                       # Redux Toolkit store
│   │   ├── store.ts                 # Store configuration (persist + middleware)
│   │   ├── hooks.ts                 # Typed useAppSelector/useAppDispatch hooks
│   │   └── authSlice.ts            # Auth slice (user, session, loading states)
│   │
│   ├── theme/                       # Design system
│   │   ├── index.ts                 # Barrel export
│   │   ├── colors.ts                # Color palette (primary, secondary, text, background, etc.)
│   │   ├── typography.ts            # Type scale (heading1, title, subtitle, body, caption, etc.)
│   │   ├── spacing.ts               # Spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64)
│   │   ├── sizes.ts                 # Component sizes
│   │   ├── radius.ts                # Border radius scale (sm, md, lg, xl, full)
│   │   ├── shadows.ts               # Shadow presets (small, medium, large)
│   │   ├── components.ts            # Component-specific style defaults
│   │   ├── icons.ts                 # Icon-related theme tokens
│   │   └── utils.ts                 # Theme utility functions
│   │
│   ├── types/                       # TypeScript type definitions
│   │   ├── academic.ts              # Stream, Subject, Chapter, Topic, Batch types
│   │   ├── auth.ts                  # Auth types (User, Session, Profile)
│   │   ├── content.ts               # Content, Tag, Approval types
│   │   ├── mockTest.ts              # Question, Option, Explanation, Image types
│   │   ├── testEngine.ts            # QuestionDisplay, TestConfig, SubjectSection
│   │   ├── testResult.ts            # TestResult, SubjectBreakdown
│   │   ├── notification.ts          # Notification types (8 variants)
│   │   └── courseDetail.ts          # Course detail types
│   │
│   └── utils/                       # Utility functions
│       ├── response.ts              # Paginated response builder
│       ├── storage.ts               # AsyncStorage wrapper (set, get, remove, clear)
│       └── supabase.ts              # Supabase helpers (UUID validation, error extraction, pagination)
│
├── supabase/                        # Supabase project configuration
│   ├── config.toml                  # Supabase project config
│   ├── migrations/                  # Database migrations (SQL files)
│   │   ├── 001_profiles_policies.sql
│   │   ├── 002_domain_01_foundation.sql
│   │   ├── 003_domain_02_academic_structure.sql
│   │   ├── ... (25 migration files total)
│   │   └── 025_phone_format_supabase.sql
│   └── functions/                   # Edge Functions
│       └── send-msg91-otp/          # MSG91 OTP sending function
│           ├── index.ts
│           ├── config.ts
│           ├── sms-provider.ts
│           └── deno.json
│
├── ios/                             # iOS native project (Xcode)
│   └── MockTestApp/
├── android/                         # Android native project
│   └── app/
│
├── Documentation/                   # Project documentation
│   ├── Database_Schema/             # Database schema docs (16 domain files)
│   ├── ERD_v3.md                    # Entity Relationship Diagram
│   ├── app_layer.docx               # Application layer documentation
│   ├── Admin_Dashboard_Functional_Specification.md
│   └── Teacher_Dashboard_Functional_Specification.md
│
└── __tests__/                       # Test files
    └── App.test.tsx                 # Basic app render test
```

### Key folder interactions

| Folder | Depends on | Provides to |
|--------|-----------|-------------|
| `screens/` | `components/`, `hooks/`, `services/`, `navigation/` | Renders UI |
| `components/` | `theme/`, `hooks/` | Reusable UI building blocks |
| `hooks/` | `services/`, `store/`, `types/` | Data-fetching + state logic |
| `services/` | `config/`, `types/`, `utils/` | Backend API abstraction |
| `store/` | `types/`, `config/storage.ts` | Client-side state management |
| `navigation/` | `screens/`, `providers/` | App routing |
| `theme/` | — | Design tokens used by all UI code |
| `types/` | — | Shared TypeScript interfaces |
| `utils/` | `types/` | Helper functions used by services |

---

## 4. Application Architecture

### Data flow

```
┌──────────────────────────────────────────────────────────────┐
│                        UI Layer                               │
│  Screen (e.g. HomeScreen)                                    │
│    ↓ uses                                                    │
│  Component (e.g. GreetingHeader)                             │
│    ↓ consumes                                                │
│  Custom Hook (e.g. useSubjects)                              │
│    ↓ wraps                                                   │
│  React Query (useQuery / useMutation)                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                     Service Layer                             │
│  Service function (e.g. getSubjects)                          │
│  - Validates inputs (UUID format, required fields)            │
│  - Calls supabase.from('table').select()...                   │
│  - Maps snake_case DB rows → camelCase TS interfaces          │
│  - Returns ApiResponse<T> (success | error shape)             │
│  - Never exposes raw Supabase errors to consumers             │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                     Supabase Client                            │
│  Config: src/config/supabase.ts                                │
│  - anon key (public, RLS-enforced)                             │
│  - No service_role key in client                               │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                     PostgreSQL + RLS                           │
│  - Row-Level Security policies filter rows per user           │
│  - Auth.uid() determines current user                         │
│  - Storage buckets have their own policies                    │
└──────────────────────────────────────────────────────────────┘
```

### Why this architecture?

1. **Clean separation of concerns**: UI never touches Supabase directly. Screens know nothing about API calls.
2. **Service layer as the single source of truth** for business logic: validation, mapping, error handling all happen once.
3. **React Query handles caching, deduplication, and background refetching** — no redundant API calls.
4. **Redux is minimal** — only client-only state (current user, session). Server state belongs in React Query.
5. **Snake-case to camel-case mapping** at the service boundary — the rest of the app uses JavaScript conventions.
6. **Standardized `ApiResponse<T>`** return type — every service call returns `{ success, data?, error? }`.

---

## 5. Authentication System

### Overview

Phone-based OTP authentication via Supabase Auth with MSG91 as the SMS provider. The app uses a custom phone-first authentication flow.

### How login works

```
┌──────────┐    ┌───────────────┐    ┌──────────────┐    ┌─────────────┐
│  User     │───>│ LoginScreen   │───>│ authService  │───>│ Supabase   │
│enters     │    │ PhoneNumber   │    │ signInWithOtp│    │ Auth       │
│phone      │    │ Input +91     │    │ +9188...     │    │            │
└──────────┘    └───────────────┘    └──────┬───────┘    └──────┬──────┘
                                            │                  │
                                            │     Edge Function│
                                            │     send-msg91-otp│
                                            │         ↓         │
                                            │     MSG91 API     │
                                            │     (SMS sent)    │
                                            │                  │
┌──────────┐    ┌──────────────────┐    ┌───▼───────┐         │
│  User     │───>│OtpVerification   │───>│authService│         │
│ enters   │    │Screen            │    │verifyOtp  │────────>│
│ OTP      │    │4-digit input     │    │           │         │
└──────────┘    └──────────────────┘    └───────────┘         │
                                                               │
                    ┌──────────────────────────────────────────┘
                    ▼
          ┌─────────────────────┐
          │ Session + Profile   │
          │ stored in Redux     │
          │ + AsyncStorage      │
          └─────────────────────┘
```

### How logout works

1. User taps "Logout" in settings (ProfileTabScreen)
2. `authService.signOut()` is called → calls `supabase.auth.signOut()`
3. On success, `clearAuth()` Redux action is dispatched:
   - Sets `user` → `null`
   - Sets `session` → `null`
   - Sets `isAuthenticated` → `false`
4. AsyncStorage tokens are cleared via `storageService.removeItem()`
5. Navigation resets to `AuthNavigator` (because `isAuthenticated` is now false)
6. `AppNavigator` conditionally renders the auth stack vs. main tab stack

### Key files

| File | Purpose |
|------|---------|
| `src/services/authService.ts` | `signInWithOtp()`, `verifyOtp()`, `signOut()`, `getSession()` |
| `src/providers/AuthProvider.tsx` | React context provider wrapping auth state |
| `src/hooks/useAuth.ts` | Convenience hook returning `{ user, session, isLoading, signOut }` |
| `src/store/authSlice.ts` | Redux slice for user/session persistence |
| `src/config/supabase.ts` | Supabase client initialization |

### Session restore flow

1. App starts → `AuthProvider` checks for existing session
2. If session exists in AsyncStorage → restore it → validate with Supabase
3. If valid → set user in Redux → navigate to main tabs
4. If invalid/expired → clear stored session → navigate to login

### Protected routes

- `AppNavigator.tsx` checks auth state to render either `AuthNavigator` or `MainTabNavigator`
- Navigation is conditional based on Redux `isAuthenticated` state

### Phone number format

Indian mobile numbers use the `+91` country code. The app:
1. Shows a fixed `+91` prefix (non-editable)
2. User types 10 digits only
3. Before API call, `toE164()` helper prepends `+91`
4. Database migration `025_phone_format_supabase.sql` handles phone format normalization

### Profile loading

On login/OTP verification:
1. `authService.signInWithOtp()` / `verifyOtp()` returns Supabase session
2. User profile is fetched from `public.profiles` table
3. Profile includes: `profile_id`, `phone`, `role` (student/teacher/admin), `name`
4. Stored in Redux `authSlice.user`
5. Role-specific data (student profile, teacher profile) is loaded lazily

---

## 6. Database Architecture

The database uses a **multi-schema design** within a single PostgreSQL database. There are **15 domain schemas** plus the standard `public` schema for profiles. Each domain schema isolates related tables.

> ⚠️ **Complete table definitions** are documented in `Documentation/Database_Schema/` with 16 files (one per domain). The `ERD_v3.md` file contains the entity-relationship diagram. Those files are the authoritative source for full column details, data types, defaults, and constraints. Below is a comprehensive listing of every table with its purpose and relationships.

### Schema overview

| # | Domain Schema | Purpose | Key Tables |
|---|--------------|---------|------------|
| 1 | Foundation | Core entities: institutes, study languages, academic terms | `institutes`, `countries`, `languages`, `academic_years` |
| 2 | Academic Structure | Educational hierarchy | `streams`, `subjects`, `chapters`, `topics` |
| 3 | Content Management | Study content, tags, approvals | `contents`, `content_tags`, `tags`, `approval_requests`, `approval_metadata` |
| 4 | Live Learning | Live classes, recordings, attendance | `live_classes`, `class_recordings`, `attendance` |
| 5 | Assessment | Questions, options, mock tests, attempts | `questions`, `question_options`, `mock_tests`, `mock_test_questions`, `test_attempts`, `test_responses` |
| 6 | PYQ (Previous Year Questions) | PYQ papers and mapping | `pyq_papers`, `pyq_paper_questions` |
| 7 | Commerce | Orders, payments, invoices | `orders`, `order_items`, `payments`, `invoices` |
| 8 | Analytics | Performance data, leaderboards | `student_performance`, `leaderboards`, `test_analytics` |
| 9 | Notifications | In-app notifications | `notifications`, `notification_preferences` |
| 10 | Administration | System config, audit logs | `audit_logs`, `system_config` |
| 11 | Subscription & Access Control | Plans, subscriptions, feature access | `subscription_plans`, `subscriptions`, `feature_access` |
| 12 | File & Media Management | Uploaded files, media metadata | `files`, `media_assets` |
| 13 | Teacher Management | Teacher profiles, qualifications, assignments | `teacher_profiles`, `teacher_qualifications`, `batch_teachers` |
| 14 | Student Services | Student profiles, enrollment, support | `student_profiles`, `enrollments`, `support_tickets` |
| 15 | Infrastructure | Cron jobs, background jobs, service health | `cron_jobs`, `background_jobs`, `service_health` |

### Complete table listing with relationships

Below is every production table with its primary purpose and foreign key relationships. See `Documentation/Database_Schema/` for full column definitions.

#### 6.1 Foundation Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `institutes` | Educational institutes (schools, coaching centers) | — |
| `countries` | Supported countries | — |
| `languages` | Study/interface languages | — |
| `academic_years` | Academic year definitions (e.g. "2025-26") | — |
| `institute_languages` | Languages supported per institute | institute_id → institutes, language_id → languages |
| `institute_branding` | Institute branding/config | institute_id → institutes |

#### 6.2 Academic Structure Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `streams` | Academic streams (NEET, JEE, CUET) | institute_id → institutes |
| `subjects` | Subjects within a stream (Physics, Chemistry) | stream_id → streams |
| `chapters` | Chapters within a subject | subject_id → subjects |
| `topics` | Topics within a chapter | chapter_id → chapters |
| `batches` | Student batches/cohorts | institute_id → institutes, stream_id → streams |

#### 6.3 Content Management Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `contents` | Study content items (notes, videos, documents) | subject_id → subjects, chapter_id → chapters, topic_id → topics, created_by → auth.users |
| `content_types` | Content type definitions (video, pdf, etc.) | — |
| `content_tags` | Junction: content-to-tag mapping | content_id → contents, tag_id → tags |
| `tags` | Content tags/labels | — |
| `approval_requests` | Content/question approval workflow | resource_id (polymorphic), requested_by → auth.users, reviewed_by → auth.users |
| `approval_metadata` | Approval audit trail | request_id → approval_requests, action_by → auth.users |

#### 6.4 Live Learning Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `live_classes` | Scheduled live class sessions | institute_id → institutes, batch_id → batches, teacher_id → teacher_profiles |
| `class_recordings` | Recorded class videos | class_id → live_classes |
| `attendance` | Student attendance in live classes | class_id → live_classes, student_id → student_profiles |
| `class_materials` | Materials shared during class | class_id → live_classes |

#### 6.5 Assessment Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `questions` | Question bank entries | subject_id → subjects, chapter_id → chapters, topic_id → topics, created_by → auth.users, approved_by → auth.users |
| `question_options` | Options for each question | question_id → questions |
| `question_explanations` | Solution explanations | question_id → questions |
| `question_images` | Images attached to questions | question_id → questions |
| `mock_tests` | Mock test definitions | institute_id → institutes, created_by → auth.users |
| `mock_test_questions` | Junction: questions in a mock test | test_id → mock_tests, question_id → questions |
| `test_attempts` | Student test attempts | test_id → mock_tests, student_id → student_profiles |
| `test_responses` | Individual question responses | attempt_id → test_attempts, question_id → questions, selected_option_id → question_options |
| `question_difficulty` | Difficulty ratings per question | question_id → questions |

#### 6.6 PYQ Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `pyq_papers` | Previous year question papers | subject_id → subjects, stream_id → streams |
| `pyq_paper_questions` | Questions in a PYQ paper | paper_id → pyq_papers, question_id → questions |
| `pyq_years` | Year definitions for PYQ tracking | — |

#### 6.7 Commerce Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `orders` | Customer orders | student_id → student_profiles |
| `order_items` | Line items within an order | order_id → orders, course_id → courses, batch_id → batches |
| `payments` | Payment transactions | order_id → orders |
| `invoices` | Generated invoices | order_id → orders |
| `refunds` | Refund records | payment_id → payments |
| `coupons` | Discount coupons | — |
| `coupon_usage` | Coupon redemption tracking | coupon_id → coupons, order_id → orders |
| `pricing_tiers` | Product pricing definitions | — |

#### 6.8 Analytics Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `student_performance` | Per-student performance aggregates | student_id → student_profiles |
| `leaderboards` | Exam/stream leaderboards | stream_id → streams, exam_id → exams |
| `test_analytics` | Per-test analytics | test_id → mock_tests |
| `performance_snapshots` | Periodic performance snapshots | student_id → student_profiles |
| `subject_performance` | Per-subject performance breakdown | student_id → student_profiles, subject_id → subjects |

#### 6.9 Notifications Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `notifications` | In-app notification records | user_id → auth.users |
| `notification_preferences` | User notification settings | user_id → auth.users |
| `notification_templates` | Reusable notification templates | — |
| `notification_delivery_log` | Delivery tracking | notification_id → notifications |

#### 6.10 Administration Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `audit_logs` | System audit trail | user_id → auth.users |
| `system_config` | System-wide configuration | — |
| `feature_flags` | Feature toggle management | — |
| `maintenance_windows` | Scheduled maintenance | — |
| `admin_roles` | Admin role definitions | institute_id → institutes |
| `admin_users` | Admin user assignments | institute_id → institutes, user_id → auth.users, role_id → admin_roles |

#### 6.11 Subscription & Access Control Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `subscription_plans` | Available subscription plans | — |
| `subscriptions` | Active user subscriptions | user_id → auth.users, plan_id → subscription_plans |
| `feature_access` | Features granted per plan | plan_id → subscription_plans |
| `subscription_invoices` | Subscription billing records | subscription_id → subscriptions |
| `plan_limits` | Usage limits per plan | plan_id → subscription_plans |

#### 6.12 File & Media Management Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `files` | Uploaded file metadata | uploaded_by → auth.users |
| `media_assets` | Processed media assets | file_id → files |
| `file_folders` | Folder organization | parent_folder_id → file_folders (self-ref) |
| `file_shares` | File sharing records | file_id → files, shared_with → auth.users |

#### 6.13 Teacher Management Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `teacher_profiles` | Extended teacher profile data | profile_id → profiles |
| `teacher_qualifications` | Teacher qualifications/certifications | teacher_id → teacher_profiles |
| `teacher_subjects` | Subjects a teacher can teach | teacher_id → teacher_profiles, subject_id → subjects |
| `batch_teachers` | Teacher assignment to batches | batch_id → batches, teacher_id → teacher_profiles |
| `teacher_availability` | Teacher availability slots | teacher_id → teacher_profiles |

#### 6.14 Student Services Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `student_profiles` | Extended student profile data | profile_id → profiles |
| `enrollments` | Student enrollments in batches | student_id → student_profiles, batch_id → batches |
| `support_tickets` | Student support requests | student_id → student_profiles, assigned_to → teacher_profiles |
| `ticket_messages` | Messages within a support ticket | ticket_id → support_tickets, sender_id → auth.users |
| `student_notes` | Student's personal notes | student_id → student_profiles |
| `student_goals` | Student target/goal tracking | student_id → student_profiles |

#### 6.15 Infrastructure Schema

| Table | Purpose | Foreign Keys |
|-------|---------|-------------|
| `cron_jobs` | Scheduled job definitions | — |
| `cron_job_logs` | Cron job execution logs | job_id → cron_jobs |
| `background_jobs` | Background task queue | — |
| `background_job_logs` | Background job execution logs | job_id → background_jobs |
| `service_health` | Service health check records | — |
| `api_rate_limits` | API rate limit configuration | — |

> **Total: ~65 production tables** across 15 domain schemas. The `public` schema contains the `profiles` table and supporting auth-related tables.

### Key production tables with column details

#### `institutes` (Foundation)
| Column | Type | Notes |
|--------|------|-------|
| `institute_id` | UUID | PK |
| `name` | VARCHAR(255) | |
| `code` | VARCHAR(50) | Unique, uppercased |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

#### `streams` (Academic Structure)
| Column | Type | Notes |
|--------|------|-------|
| `stream_id` | UUID | PK |
| `institute_id` | UUID | FK → institutes |
| `name` | VARCHAR(255) | e.g. "NEET", "JEE" |
| `code` | VARCHAR(50) | Uppercased constraint |
| `is_active` | BOOLEAN | |
| `display_order` | INTEGER | |
| `created_at` / `updated_at` | TIMESTAMPTZ | Audit timestamps |

#### `subjects` (Academic Structure)
| Column | Type | Notes |
|--------|------|-------|
| `subject_id` | UUID | PK |
| `stream_id` | UUID | FK → streams |
| `name` | VARCHAR(255) | e.g. "Physics" |
| `code` | VARCHAR(50) | |
| `display_order` | INTEGER | |

#### `chapters` (Academic Structure)
| Column | Type | Notes |
|--------|------|-------|
| `chapter_id` | UUID | PK |
| `subject_id` | UUID | FK → subjects |
| `name` | VARCHAR(255) | e.g. "Laws of Motion" |
| `display_order` | INTEGER | |

#### `topics` (Academic Structure)
| Column | Type | Notes |
|--------|------|-------|
| `topic_id` | UUID | PK |
| `chapter_id` | UUID | FK → chapters |
| `name` | VARCHAR(255) | |
| `display_order` | INTEGER | |

#### `batches` (Academic Structure)
| Column | Type | Notes |
|--------|------|-------|
| `batch_id` | UUID | PK |
| `institute_id` | UUID | FK → institutes |
| `stream_id` | UUID | FK → streams |
| `name` | VARCHAR(255) | |
| `batch_code` | VARCHAR(50) | Uppercased |
| `academic_year` | VARCHAR(20) | e.g. "2025-26" |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `max_seats` | INTEGER | Nullable (unlimited) |
| `status` | VARCHAR(20) | upcoming, active, completed, archived |
| `deleted_at` | TIMESTAMPTZ | Soft delete support |

#### `questions` (Assessment)
| Column | Type | Notes |
|--------|------|-------|
| `question_id` | UUID | PK |
| `subject_id` | UUID | FK → subjects |
| `chapter_id` | UUID | FK → chapters (nullable) |
| `topic_id` | UUID | FK → topics (nullable) |
| `question_text` | TEXT | HTML/Markdown supported |
| `question_type` | VARCHAR(50) | single_correct, multiple_correct, numerical, integer |
| `difficulty_level` | VARCHAR(20) | easy, medium, hard |
| `marks` | NUMERIC(5,2) | |
| `negative_marks` | NUMERIC(5,2) | |
| `status` | VARCHAR(20) | draft, pending_approval, approved, archived |
| `created_by` | UUID | FK → auth.users |
| `approved_by` | UUID | FK → auth.users (nullable) |
| `approved_at` | TIMESTAMPTZ | |
| `submitted_at` | TIMESTAMPTZ | When sent for approval |

#### `question_options` (Assessment)
| Column | Type | Notes |
|--------|------|-------|
| `option_id` | UUID | PK |
| `question_id` | UUID | FK → questions |
| `option_label` | VARCHAR(10) | A, B, C, D |
| `option_text` | TEXT | |
| `is_correct` | BOOLEAN | |
| `display_order` | INTEGER | |

#### `mock_tests` (Assessment)
| Column | Type | Notes |
|--------|------|-------|
| `test_id` | UUID | PK |
| `institute_id` | UUID | FK → institutes (nullable) |
| `title` | VARCHAR(255) | |
| `description` | TEXT | |
| `duration_minutes` | INTEGER | |
| `total_marks` | NUMERIC(8,2) | |
| `negative_marking` | NUMERIC(5,2) | Per wrong answer |
| `difficulty_level` | VARCHAR(20) | |
| `status` | VARCHAR(20) | draft, published, archived |
| `published_at` | TIMESTAMPTZ | |
| `archived_at` | TIMESTAMPTZ | |
| `created_by` | UUID | FK → auth.users |

#### `mock_test_questions` (Assessment)
| Column | Type | Notes |
|--------|------|-------|
| `test_id` | UUID | FK → mock_tests |
| `question_id` | UUID | FK → questions |
| `display_order` | INTEGER | |
| `marks` | NUMERIC(5,2) | Override question-level marks |
| Composite PK | (test_id, question_id) |

---

## 7. Services

Every service follows the same pattern:
- **Returns `ApiResponse<T>`**: `{ success: true, data: T }` or `{ success: false, error: string }`
- **Validates inputs** (UUID format, required fields)
- **Maps DB rows** from snake_case to camelCase via internal helper functions
- **Never exposes raw Supabase errors**
- **Respects RLS** — uses anon key, never service_role

### Service matrix

| Service | Module | File | Key Methods | Status |
|---------|--------|------|-------------|--------|
| `authService` | Core | `authService.ts` | `signInWithOtp`, `verifyOtp`, `signOut`, `getSession` | ✅ Complete |
| `streamService` | Academic | `academic/streamService.ts` | `getStreams`, `getStreamById`, `createStream`, `updateStream`, `deleteStream` | ✅ Complete |
| `subjectService` | Academic | `academic/subjectService.ts` | `getSubjects`, `getSubjectById`, `createSubject`, `updateSubject`, `deleteSubject` | ✅ Complete |
| `chapterService` | Academic | `academic/chapterService.ts` | `getChapters`, `getChapterById`, `createChapter`, `updateChapter`, `deleteChapter` | ✅ Complete |
| `topicService` | Academic | `academic/topicService.ts` | `getTopics`, `getTopicById`, `createTopic`, `updateTopic`, `deleteTopic` | ✅ Complete |
| `batchService` | Academic | `academic/batchService.ts` | CRUD + `assignTeacher`, `removeTeacher`, `assignStudents`, `removeStudents` (placeholders) | ✅ Core CRUD, ⏳ Assignment TBD |
| `contentService` | Content | `content/contentService.ts` | `getContents`, `getContentById`, `createContent`, `updateContent`, `deleteContent` | ✅ Complete |
| `tagService` | Content | `content/tagService.ts` | `getTags`, `getTagById`, `createTag`, `updateTag`, `deleteTag`, `attachTags`, `detachTags` | ✅ Complete |
| `approvalService` | Content | `content/approvalService.ts` | `submitForApproval`, `approveContent`, `rejectContent`, `getPendingApprovals` | ✅ Complete |
| `questionService` | Mock Test | `mockTest/questionService.ts` | `getQuestions`, `getQuestionById`, `createQuestion`, `updateQuestion`, `deleteQuestion` | ✅ Complete |
| `questionOptionService` | Mock Test | `mockTest/questionOptionService.ts` | `getOptions`, `getOptionById`, `createOption`, `updateOption`, `deleteOption` | ✅ Complete |
| `questionExplanationService` | Mock Test | `mockTest/questionExplanationService.ts` | `getExplanation`, `upsertExplanation`, `deleteExplanation` | ✅ Complete |
| `questionImageService` | Mock Test | `mockTest/questionImageService.ts` | `getImages`, `createImage`, `deleteImage` | ✅ Complete |
| `mockTestService` | Mock Test | `mockTest/mockTestService.ts` | `getMockTests`, `getMockTestById`, `createMockTest`, `updateMockTest`, `deleteMockTest` | ✅ Complete |
| `mockTestQuestionService` | Mock Test | `mockTest/mockTestQuestionService.ts` | `getQuestions`, `addQuestions`, `removeQuestion`, `reorderQuestions` | ✅ Complete |
| `mockTestPublishService` | Mock Test | `mockTest/mockTestPublishService.ts` | `validateForPublishing`, `publish`, `archive`, `restore`, `getPublishSummary` | ✅ Complete |
| `testEngineService` | Core | `testEngineService.ts` | `startAttempt`, `submitAnswer`, `autoSave`, `finishAttempt` | ✅ Complete |
| `resultService` | Core | `resultService.ts` | `getResult`, `getResults`, `getResultByAttempt` | ✅ Complete |
| `notificationService` | Core | `notificationService.ts` | `getNotifications`, `markAsRead`, `markAllAsRead` | ✅ Complete |
| `storageService` | Core | `storage/storageService.ts` | `uploadFile`, `getPublicUrl`, `deleteFile` | ✅ Complete |
| `classService` | Core | `classService.ts` | Live class operations (placeholder) | ⏳ TBD |

### Service implementation details

#### `ApiResponse<T>` pattern

```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; data?: undefined };

type PaginatedResponse<T> = {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
```

#### Pagination pattern (all list services)

All list methods accept:
- `filters?`: Entity-specific filter interface
- `sort?`: `{ sortBy?: string; sortDirection?: 'asc' | 'desc' }`
- `pagination?`: `{ page?: number; pageSize?: number }`

Defaults: page=1, pageSize=20, sortBy varies by entity.

#### Error handling pattern

Each service wraps every method in try-catch:
1. Validates UUIDs → returns `{ success: false, error }` immediately
2. Catches specific Supabase error codes:
   - `PGRST116` → "Item not found"
   - `23503` → Foreign key violation (human-readable message)
3. Generic Supabase errors → `extractErrorMessage()` utility
4. Thrown errors → caught and returned as `ApiResponse`

#### Mapping layer

Each service has an internal `mapEntity()` function:
```typescript
function mapStream(db: DbStream): Stream {
  return {
    streamId: db.stream_id,
    instituteId: db.institute_id,
    name: db.name,
    // ... etc
  };
}
```

This is dead code eliminated in production builds — no runtime cost.

---

## 8. React Query (TanStack Query)

### Query Key Architecture

All query keys follow a consistent **hierarchical factory pattern**:

```
entityKeys.all             → ['academic']
entityKeys.<entity>.all()  → ['academic', 'streams']
entityKeys.<entity>.lists() → ['academic', 'streams', 'list']
entityKeys.<entity>.list(f,s,p) → ['academic', 'streams', 'list', filters, sort, pagination]
entityKeys.<entity>.details() → ['academic', 'streams', 'detail']
entityKeys.<entity>.detail(id) → ['academic', 'streams', 'detail', id]
```

This allows **precise cache invalidation** — you can invalidate all lists without touching detail caches, or invalidate a single detail without touching anything else.

### Key factory modules

| Module | File | Entities |
|--------|------|----------|
| Academic | `hooks/academic/queryKeys.ts` | streams, subjects, chapters, topics, batches |
| Content | `hooks/content/queryKeys.ts` | contents, tags, approvals |
| Mock Test | `hooks/mockTest/queryKeys.ts` | questions, options, explanations, images, mockTests, mockTestQuestions, publish |

### Hook pattern

Every hook follows a consistent pattern:

```typescript
// Query hook
export function useStreams(filters?, sort?, pagination?) {
  return useQuery<PaginatedResponse<Stream>>({
    queryKey: academicKeys.streams.list(filters, sort, pagination),
    queryFn: async () => {
      const result = await getStreams(filters, sort, pagination);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
}

// Mutation hook
export function useCreateStream() {
  const queryClient = useQueryClient();
  return useMutation<Stream, Error, CreateStreamInput>({
    mutationFn: async (input) => {
      const result = await createStream(input);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academicKeys.streams.lists() });
    },
  });
}
```

### Cache invalidation strategy

| Mutation Type | Invalidates |
|--------------|-------------|
| Create | All lists for that entity |
| Update | Specific detail + all lists |
| Delete | Remove detail cache + all lists |
| Approval action | Approval lists + content detail |
| Publish action | Publish validation + summary + mock test detail |

### Retry policy

- Default React Query retries (3 attempts with exponential backoff)
- No custom retry logic implemented yet

### Stale time

- Not explicitly configured — uses React Query defaults (0 = refetch on mount)
- Future optimization: add `staleTime` for rarely-changing data (streams, subjects)

### Optimistic updates

- Not implemented yet
- Planned for high-frequency operations (test submission, auto-save)

---

## 9. Redux

### When to use Redux vs React Query

| State Type | Tool | Reasoning |
|-----------|------|-----------|
| Auth session, current user | **Redux** | Client-only, needs to persist across refreshes |
| API data (streams, questions, tests) | **React Query** | Server-managed, cached, auto-refetched |
| UI state (modals, toasts) | **React state / context** | Ephemeral, component-scoped |

### Redux slices

#### `authSlice` (`src/store/authSlice.ts`)

```typescript
interface AuthState {
  user: User | null;           // Current authenticated user profile
  session: Session | null;     // Supabase auth session
  isLoading: boolean;          // Initial session restore in progress
  isAuthenticated: boolean;    // Derived from user !== null
  error: string | null;        // Last auth error
}
```

**Reducers:**
- `setUser` — Sets user and derives isAuthenticated
- `setSession` — Stores Supabase session
- `setLoading` — Toggle loading state
- `setError` — Store error message
- `clearAuth` — Reset to initial state (logout)

### Persisted state

- **AsyncStorage** via `src/config/storage.ts`:
  - `AUTH_TOKEN_KEY` — Supabase access token
  - `AUTH_REFRESH_KEY` — Refresh token
  - `USER_PROFILE_KEY` — Cached user profile
- Persistence is manual (not Redux Persist middleware) — handled by `AuthProvider`

### Non-persisted state

- `isLoading`, `error` — derived from current operation

### Why Redux is only used for auth

The auth state needs to be available **everywhere** in the app (navigation guards, API headers, profile display) and must **persist** across app restarts. React Query is a better fit for server data because it handles caching, deduplication, and background refetching automatically.

---

## 10. Admin Panel

> **Status: ❌ Not yet implemented — planned for future development.**

The administrative web panel is in the planning phase. A detailed functional specification exists at `Documentation/Admin_Dashboard_Functional_Specification.md`.

The admin panel is intended to provide:

### Planned page structure

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/admin` | Overview of institute metrics (students, tests, revenue) |
| Institute Management | `/admin/institute` | Manage institute settings, branding, languages |
| Academic Structure | `/admin/academic` | Manage streams, subjects, chapters, topics |
| Batch Management | `/admin/batches` | CRUD batches, assign teachers/students, view capacity |
| Question Bank | `/admin/questions` | View, approve/reject, and manage questions |
| Mock Tests | `/admin/mock-tests` | Create, publish, archive mock tests |
| Content Library | `/admin/content` | Manage study content and tags |
| Student Management | `/admin/students` | View students, enrollments, performance |
| Teacher Management | `/admin/teachers` | Manage teacher profiles, qualifications, assignments |
| Subscription Plans | `/admin/subscriptions` | Configure plans and feature access |
| Orders & Payments | `/admin/commerce` | View orders, invoices, refunds |
| Notifications | `/admin/notifications` | Send bulk notifications, view templates |
| Analytics | `/admin/analytics` | Charts, reports, exports |
| Audit Logs | `/admin/audit` | System activity log |
| Settings | `/admin/settings` | System configuration, feature flags |

### Planned technology stack

- **Framework:** React (Next.js or Create React App)
- **UI Library:** Ant Design or Material UI
- **State:** React Query for server state
- **Charts:** Recharts or Chart.js
- **Auth:** Supabase Auth (same backend)

### Backend readiness

- All CRUD services for academic, content, and mock test modules are complete
- Commerce and analytics schemas exist but services are not implemented
- Teacher management and student services schemas exist with partial services
- RLS policies are defined for admin role

---

## 11. Student Web Panel

> **Status: ❌ Not yet implemented — planned for future development.**

The student web panel is in the planning phase. A detailed functional specification exists at `Documentation/Student_Dashboard_Functional_Specification.md`.

### Planned page structure

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/dashboard` | Test recommendations, progress overview |
| My Tests | `/tests` | Available and completed mock tests |
| Test Engine | `/test/:id` | Take a mock test (web version) |
| Results | `/results/:id` | Detailed test results and analysis |
| Performance | `/analytics` | Charts and graphs of performance over time |
| Courses | `/courses` | Browse enrolled courses |
| Profile | `/profile` | Manage profile, subscription, settings |
| Notifications | `/notifications` | View notification history |

### Backend readiness

- All test engine and result services are implemented
- Mock data exists for all screens
- The React Native app serves as the reference UI implementation

---

## 12. React Native App Screens

### Screen inventory

| Screen | Path | Status | Purpose |
|--------|------|--------|---------|
| SplashScreen | `screens/splash/SplashScreen.tsx` | ✅ Complete | Animated logo, auto-navigation |
| LoginScreen | `screens/auth/LoginScreen.tsx` | ✅ Complete | Phone number input + send OTP |
| RegisterScreen | `screens/auth/RegisterScreen.tsx` | ✅ Complete | Registration form (name, phone) |
| OtpVerificationScreen | `screens/auth/OtpVerificationScreen.tsx` | ✅ Complete | 4-digit OTP input + verify |
| OnboardingScreen | `screens/onboarding/OnboardingScreen.tsx` | ✅ Complete | 3-slide carousel with pagination |
| HomeScreen | `screens/home/HomeScreen.tsx` | 🔄 In Progress | FlatList-based dashboard with 8 sections |
| MockTestsTabScreen | `screens/tabs/MockTestsTabScreen.tsx` | ✅ Complete | Exam selection with glassmorphism cards |
| LiveClassesTabScreen | `screens/tabs/LiveClassesTabScreen.tsx` | ✅ Complete | Live classes placeholder |
| ProfileTabScreen | `screens/tabs/ProfileTabScreen.tsx` | ✅ Complete | User profile, stats, settings |
| TestDashboardScreen | `screens/tests/TestDashboardScreen.tsx` | ✅ Complete | Test overview |
| TestInstructionsScreen | `screens/tests/TestInstructionsScreen.tsx` | ✅ Complete | Pre-test instructions |
| TestEngineScreen | `screens/tests/TestEngineScreen.tsx` | ✅ Complete | Active test-taking interface |
| TestResultScreen | `screens/tests/TestResultScreen.tsx` | ✅ Complete | Post-test results and analytics |
| ExamPackDetailScreen | `screens/tests/ExamPackDetailScreen.tsx` | ✅ Complete | Exam pack details |
| PyqPapersScreen | `screens/tests/PyqPapersScreen.tsx` | ✅ Complete | PYQ paper listing |
| CourseDetailScreen | `screens/courses/CourseDetailScreen.tsx` | ✅ Complete | Course detail view |
| CoursesScreen | `screens/courses/CoursesScreen.tsx` | ✅ Complete | Course listing |
| NotificationScreen | `screens/NotificationScreen.tsx` | ✅ Complete | Notification list with filters |
| Dev screens (8) | `screens/dev/` | ✅ Complete | Developer testing (service layer) |

### Navigation architecture

```
AppNavigator (NativeStack)
├── SplashScreen
├── AuthNavigator (NativeStack)      [when not authenticated]
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── OtpVerificationScreen
├── OnboardingScreen                  [first launch only]
├── MainTabNavigator (BottomTab)     [when authenticated]
│   ├── HomeScreen
│   ├── MockTestsTabScreen
│   ├── LiveClassesTabScreen
│   └── ProfileTabScreen
├── TestDashboardScreen              [pushed from various places]
├── TestInstructionsScreen
├── TestEngineScreen
├── TestResultScreen
├── ExamPackDetailScreen
├── PyqPapersScreen
├── CourseDetailScreen
├── CoursesScreen
├── NotificationScreen
└── DevNavigator (NativeStack)       [dev mode only]
    └── (8 test screens)
```

### HomeScreen sections (FlatList)

The home screen is built as a `FlatList` of typed sections:

```typescript
type SectionId = 
  | 'greeting' | 'hero' | 'trending-courses' | 'pyq-practice'
  | 'quick-start' | 'why-choose' | 'popular-exams' | 'cta';
```

Each section renders a specific component via a `renderSection` callback. The FlatList uses:
- `removeClippedSubviews` for performance
- `initialNumToRender: 4`
- `maxToRenderPerBatch: 6`
- `windowSize: 3`

### Screen data flow

All screens use **mock data** for development. Backend integration is pending. The data flow is:

```
Screen → reads data from inline constants or mock files → renders UI
```

Screens that use mock data:
- HomeScreen: inline constants (`QUICK_ACTIONS`, `FEATURES`, `POPULAR_EXAMS`, etc.)
- MockTestsTabScreen: inline `EXAMS` array
- ProfileTabScreen: inline `USER` constant
- TestEngineScreen: `data/mockTestEngine.ts` (30 questions)
- TestResultScreen: `data/mockTestResult.ts` (complete result)
- NotificationScreen: `mocks/notifications.ts` (18 notifications)

Screens that are ready for backend integration:
- All dev screens (use real hooks → services → Supabase)
- NotificationScreen (has `useNotifications` hook ready)

---

## 11. Batch System

### Lifecycle

```
Draft → Upcoming → Active → Completed → Archived
                ↘ Deleted (soft, sets deleted_at)
```

### Status values

| Status | Meaning |
|--------|---------|
| `upcoming` | Created but not yet started |
| `active` | Currently running |
| `completed` | Finished, no further changes |
| `archived` | System-level archival |
| (soft-deleted) | `deleted_at` is set |

### Key relationships

```
institutes
    └── streams
            └── batches
                    ├── batch_teachers (teacher_id) → teacher_profiles
                    ├── batch_students (student_id) → student_profiles
                    └── batch_mock_tests (test_id) → mock_tests
```

### Business rules

1. **One teacher per batch** (currently — may expand to multiple)
2. **Many students per batch** (limited by `max_seats`)
3. **Many mock tests per batch** (via `batch_mock_tests` junction table)
4. **Start date must be before end date** (validated in service layer)
5. **Batch code is uppercased** automatically
6. **Soft delete** — `deleted_at` is set, not removed

### Implementation status

| Feature | Status |
|---------|--------|
| CRUD operations (create, read, update, soft-delete) | ✅ Complete |
| Date range validation | ✅ Complete |
| Partial date validation (update one date) | ✅ Complete |
| Teacher assignment | ⏳ Placeholder (not implemented) |
| Student assignment | ⏳ Placeholder (not implemented) |
| Batch close/archive | ⏳ Placeholder (not implemented) |
| Capacity checks | ⏳ Not implemented |

---

## 12. Question System

### Lifecycle

```
Draft → Pending Approval → Approved → Archived
  ↓                          ↑
  (revision)                 (rejected → back to draft)
```

### Business rules

1. **Question cannot be edited after approval** — must be rejected first
2. **Approval metadata is immutable** — `approved_by`, `approved_at` are set once
3. **Options must have at least one correct answer** (database constraint)
4. **Negative marks** are optional (nullable)
5. **Image storage** in Supabase Storage bucket `question-images`
6. **Explanations** are optional, one per question

### Approval workflow

```
Question created (status: 'draft')
    ↓
Teacher submits for approval (status: 'pending_approval', submitted_at set)
    ↓
Approver reviews:
    ├── Approve → status: 'approved', approved_by, approved_at set
    └── Reject  → status: 'draft', rejection_reason recorded
```

The `approval_metadata` table stores the approval history:
```typescript
interface ApprovalMetadata {
  requestId: string;
  resourceType: 'question' | 'content' | 'mock_test';
  resourceId: string;
  action: 'submitted' | 'approved' | 'rejected';
  actionBy: string;  // UUID of the user
  comments?: string;
  createdAt: string;
}
```

### File structure

| File | Purpose |
|------|---------|
| `questionService.ts` | Question CRUD + status transitions |
| `questionOptionService.ts` | Options CRUD (linked to question) |
| `questionExplanationService.ts` | Single explanation upsert per question |
| `questionImageService.ts` | Question images (URLs stored, files in Storage) |
| `src/types/mockTest.ts` | TypeScript interfaces for all question entities |

---

## 13. Mock Test System

### Lifecycle

```
Draft → Published → Archived
         ↑   ↓
         └── Restore (from archived)
```

### Key features

| Feature | Status |
|---------|--------|
| CRUD operations | ✅ Complete |
| Question assignment (add/remove/reorder) | ✅ Complete |
| Marks override per question | ✅ Complete |
| Publish validation (checks questions exist, etc.) | ✅ Complete |
| Publish (sets `published_at`, status → 'published') | ✅ Complete |
| Archive (sets `archived_at`, status → 'archived') | ✅ Complete |
| Restore (clears `archived_at`, status → 'draft') | ✅ Complete |
| Publish summary (question count, marks, subjects) | ✅ Complete |

### Publish validation rules

Before a mock test can be published, `validateForPublishing()` checks:
1. Test has at least one question assigned
2. Test title is not empty
3. Duration is positive
4. All assigned questions are in `approved` status

### Availability

- Published tests are visible to students based on:
  - Batch assignment (via `batch_mock_tests`)
  - Direct assignment
  - Date range (publish date, due date)

---

## 14. Student Exam Flow

### Complete intended flow

```
┌──────────┐
│  Login    │ (via phone OTP)
└────┬─────┘
     │
┌────▼──────┐
│ Dashboard  │ (HomeScreen — sees assigned tests, courses, PYQs)
└────┬──────┘
     │ User selects a mock test / PYQ paper
     │
┌────▼──────────────┐
│ Exam Pack Detail   │ (shows test info, stats, "Start" button)
└────┬──────────────┘
     │
┌────▼──────────────────┐
│ Test Instructions     │ (rules, duration, marking scheme)
└────┬──────────────────┘
     │ User accepts and starts
     │
┌────▼─────────┐
│  Attempt     │ (TestEngineScreen — 30 questions, timer, navigation)
│              │
│ Auto-save    │ (every 30 seconds, on question change)
│ every 30s    │
└────┬─────────┘
     │ User submits (or timer expires)
     │
┌────▼──────────┐
│  Evaluation   │ (server-side scoring)
└────┬──────────┘
     │
┌────▼──────────┐
│   Results     │ (TestResultScreen — score, accuracy, subject breakdown)
└────┬──────────┘
     │
┌────▼──────────┐
│  Analysis     │ (per-question review, time spent, answer comparison)
└───────────────┘
```

### Implementation status

| Step | Status | Notes |
|------|--------|-------|
| Login | ✅ Complete | Phone OTP with MSG91 |
| Dashboard | 🔄 In Progress | UI built with mock data, backend integration pending |
| Exam Pack Detail | ✅ Complete | Mock data |
| Test Instructions | ✅ Complete | Mock data |
| Attempt (TestEngine) | ✅ Complete | UI + mock data, auto-save not wired to backend |
| Auto Save | ⏳ Pending | Structure ready, needs backend integration |
| Submit | ⏳ Pending | Needs backend integration |
| Evaluation | ⏳ Pending | Server-side logic |
| Results | ✅ Complete | UI with mock data |
| Analysis | ⏳ Pending | Not yet built |

---

## 15. Error Handling

### Strategy

| Layer | Approach |
|-------|----------|
| **Services** | Try-catch wrapper → returns `ApiResponse` with error string |
| **Hooks** | Mutations throw errors → React Query `onError` |
| **UI** | Toast notifications for transient errors |
| **Global** | No global error boundary yet (React ErrorBoundary not implemented) |

### Toast system (`src/components/Toast.tsx`)

- Context-based `ToastProvider` wrapping the app
- Two variants: `success` (green) and `error` (red, with shake animation)
- Slide-down entrance, auto-dismiss (default 3s)
- Optional action button (e.g. "Undo")
- Uses Reanimated for UI-thread animations

### Loading states

- **Skeleton loaders** (`SkeletonLoader.tsx`) — shimmer effect for:
  - `CardSkeleton` — course cards
  - `ListItemSkeleton` — list rows
  - `ProfileSkeleton` — profile screen
  - `MockTestsSkeleton` — exam list
- React Query `isLoading` / `isFetching` states available via hooks

### Empty states

- Not yet implemented — screens assume data exists
- Future: add empty state components for lists with zero results

### Retry strategy

- React Query default: 3 retries with exponential backoff
- No custom retry logic (e.g., for network-specific errors)

---

## 16. Security

### Authentication

- **Supabase Auth** handles passwordless phone OTP
- **Session tokens** stored in AsyncStorage (secure on iOS Keychain, encrypted SharedPreferences on Android via react-native-encrypted-storage — future improvement)
- **Auth state** managed client-side via Redux

### Authorization

- **Row-Level Security (RLS)** is the primary authorization mechanism
- All database queries use the **anon key** with `auth.uid()` to determine the current user
- RLS policies control:
  - Users can only see their own profile
  - Teachers can see their assigned batches and students
  - Admins can see all data in their institute
  - Super admins can see across institutes

### RLS policy files

- `001_profiles_policies.sql` — Profile policies
- `021_rls_policies.sql` — Comprehensive RLS policies for all tables

### Validation

- **Service layer**: UUID format validation, required field checks, date range validation
- **Database constraints**: CHECK constraints (e.g., `ck_streams_code_format` for uppercase codes)
- **Foreign key constraints**: Prevent orphaned records
- **Input sanitization**: Trim strings, strip non-digit characters from phone numbers

### Secure storage

- AsyncStorage for auth tokens (current — consider upgrading to `react-native-encrypted-storage`)
- No sensitive data in Redux (passwords, full credit card numbers)

### Role-based access

- `profiles.role` determines user capabilities
- Three roles: `student`, `teacher`, `admin` (plus `super_admin` in schema)
- Role-based UI rendering planned but not yet implemented in screens

---

## 17. Important Architectural Decisions

### 1. Separate `profile_id` and `teacher_id`

**Decision:** Profiles use a single `profiles` table with `role` discriminator. Teacher-specific data lives in `teacher_profiles` with FK to `profiles.profile_id`.

**Why:** Avoids storing teacher-specific fields (qualifications, specialization) in the generic profiles table while maintaining a single auth identity.

### 2. Approval metadata as separate table

**Decision:** `approval_metadata` table tracks the entire history (submit → approve/reject) rather than simple boolean flags on the resource.

**Why:** Provides audit trail, supports re-approval workflows, and allows "rejected with comments" without modifying the resource.

### 3. Archive behavior (soft delete)

**Decision:** `batches` use soft delete (`deleted_at`), while questions and mock tests use explicit status transitions to `archived`.

**Why:** Batches need recovery and historical queries. Questions use a stricter lifecycle (draft → pending → approved → archived) with permission checks at each transition.

### 4. Published timestamp behavior

**Decision:** `published_at` is set only when `publish()` is called, and cleared on `archive()`. It is NOT the same as `created_at`.

**Why:** Separates creation from publication, supports scheduled publishing in the future.

### 5. One teacher per batch (current design)

**Decision:** The schema supports `batch_teachers` (many-to-many), but the current service layer limits to one teacher.

**Why:** Simplifies initial implementation. The schema already supports expansion to multiple teachers.

### 6. Many students per batch

**Decision:** Junction table `batch_students` with unlimited capacity (soft-limited by `max_seats`).

**Why:** Students enroll in batches; batches contain many students. `max_seats` is advisory, not enforced at DB level.

### 7. Service layer architecture

**Decision:** Full service layer between UI and Supabase — no direct Supabase calls from screens.

**Why:**
- Centralized error handling
- Centralized snake_case → camelCase mapping
- Easy to mock for testing
- Easy to swap backend provider in the future
- Business logic in one place

### 8. React Query architecture

**Decision:** Every entity gets its own query key factory with hierarchical keys.

**Why:** Precise cache invalidation — mutating one entity doesn't clear unrelated caches. The factory pattern ensures consistency.

### 9. No direct Supabase calls from UI

**Decision:** All Supabase calls go through the service layer first.

**Why:** Testability, maintainability, and the ability to add data transformation or validation without touching UI code.

### 10. Redux for auth only

**Decision:** Server state uses React Query; client state (auth) uses Redux.

**Why:** React Query handles caching, deduplication, and background sync that Redux would need to replicate. Auth is the only state that must be globally accessible and persistent.

### 11. Mock data for development

**Decision:** Screens use inline constants or mock data files instead of real API calls.

**Why:** Allows UI development to proceed in parallel with backend work. Mock data is clearly separated and documented for easy replacement.

### 12. Phone format normalization

**Decision:** Phone numbers are stored without the `+` prefix to match Supabase Auth's format. The service layer strips `+` before storage.

**Why:** Supabase Auth stores phone numbers without `+`. Consistent format avoids duplicate accounts and query issues.

---

## 18. Known Issues & Future Improvements

### Current limitations

| Issue | Severity | Notes |
|-------|----------|-------|
| No global error boundary | Medium | App crashes on uncaught errors |
| AsyncStorage for tokens | Medium | Not encrypted — use `react-native-encrypted-storage` |
| No offline support | High | App requires network for all operations |
| Mock data hardcoded | Medium | Screens inline constants — need to extract for testing |
| No staleTime in React Query | Low | Every query refetches on mount |
| No empty states | Low | Lists with zero results show nothing |
| No pagination in UI | Low | Lists don't handle large datasets yet |
| Batch assignment stubs | Medium | Teacher/student assignment not functional |
| No role-based UI gating | Low | All users see the same screens |

### Known bugs

1. HomeScreen `removeClippedSubviews` may cause blank areas on some Android devices
2. Test engine timer continuation on app background not handled
3. Notification deep links are stubs — no actual navigation on tap

### Temporary workarounds

- All screens use mock data — swap imports when backend is ready
- Auth flow works end-to-end (phone OTP + session restore)
- All service calls return real Supabase data (dev screens verify this)

### Future improvements

| Improvement | Effort | Impact |
|------------|--------|--------|
| Encrypted storage for tokens | 1 day | High — security |
| Offline-first with React Query persistence | 1 week | High — UX |
| Global error boundary | 1 day | Medium — stability |
| Empty state components | 2 days | Medium — UX |
| Paginated FlatLists | 3 days | Medium — performance |
| Role-based UI | 1 week | High — feature |
| Batch assignment UI | 2 weeks | High — feature |
| Optimistic updates for test submission | 3 days | Medium — UX |
| Push notifications | 1 week | High — feature |
| Jitsi live classes | 2 weeks | High — feature |
| Admin web panel | 1 month | High — feature |
| Teacher web panel | 3 weeks | High — feature |

---

## 19. Testing

### What has been tested

| Module | Test Type | Status |
|--------|-----------|--------|
| App render | Jest snapshot | ✅ `__tests__/App.test.tsx` |
| Service layer (dev screens) | Manual via dev screens | ✅ All CRUD operations verified |
| UI components | Visual inspection | ✅ Screens rendered with mock data |

### Production-ready modules

| Module | Confidence | Notes |
|--------|-----------|-------|
| Auth flow | High | End-to-end tested via dev screens |
| Academic CRUD (Stream, Subject, Chapter, Topic) | High | Tested via dev screens with real Supabase |
| Content, Tag, Approval CRUD | High | Tested via dev screens |
| Question bank CRUD | High | Tested via dev screens |
| Mock test CRUD + publish workflow | High | Tested via dev screens |
| UI screens (except HomeScreen) | Medium | Rendered with mock data, no backend integration tested |

### Modules requiring testing

| Module | Priority | Testing approach |
|--------|----------|------------------|
| HomeScreen backend integration | High | Connect to real data sources |
| Test engine submission | High | End-to-end test with real backend |
| Result calculation | High | Verify scoring logic |
| Notification system | Medium | Mark-as-read, pagination |
| Batch assignment | Medium | Pending implementation |
| Error states | Medium | Test network failures, empty states |

---

## 20. Deployment Architecture

### Current deployment

| Component | Platform | Status |
|-----------|----------|--------|
| Supabase (DB + Auth + Storage) | Supabase Cloud | ✅ Running |
| React Native app | Local development | 🔄 In Progress |
| Edge Functions | Supabase Edge Functions | ✅ `send-msg91-otp` deployed |

### Future deployment

| Component | Target | Notes |
|-----------|--------|-------|
| React Native (iOS) | Apple App Store | Requires Apple Developer account |
| React Native (Android) | Google Play Store | Requires Play Console account |
| Admin Web Panel | Vercel / Netlify | Not started |
| Teacher Web Panel | Vercel / Netlify | Not started |
| Live classes (Jitsi) | Self-hosted Jitsi or 8x8 | Not started |

### Supabase configuration

- **Project:** Linked via `supabase/.temp/linked-project.json`
- **Local development:** `supabase/config.toml` defines local setup
- **Migrations:** 25 SQL migration files in `supabase/migrations/`
- **Edge Functions:** `send-msg91-otp` function deployed to Supabase

### Storage

- **Bucket:** `question-images` for question images
- **Access:** Public URLs with RLS policies for write operations
- **Service:** `src/services/storage/storageService.ts` wraps upload/get/delete

### Monitoring

- Not yet configured
- Future: Supabase built-in monitoring, Sentry for crash reporting

### Scaling strategy

- **Database:** Supabase scales vertically; read replicas for analytics queries
- **Storage:** Supabase Storage with CDN
- **App:** React Native's native rendering is inherently scalable
- **Admin panel:** Standard web scaling (CDN + serverless functions)

---

## 21. Development Guidelines

### Coding standards

- **TypeScript strict mode** enabled in `tsconfig.json`
- **ESLint + Prettier** configured at project root
- **JSDoc comments** on all exported functions and components
- **Functional components** with hooks (no class components)
- **`React.memo`** on expensive components (exam cards, list items)
- **`useCallback`** for callbacks passed as props
- **Named exports** for hooks and services; default exports for screens

### Naming conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | `kebab-case.ts` | `authService.ts` |
| Folders | `kebab-case` | `src/services/academic/` |
| React components | PascalCase | `QuickActionCard` |
| Hooks | camelCase, `use` prefix | `useStreams` |
| Services | camelCase | `getStreams`, `createBatch` |
| Types & interfaces | PascalCase | `Stream`, `ApiResponse<T>` |
| Query key factories | camelCase | `academicKeys` |
| Redux slices | camelCase | `authSlice` |
| Constants | UPPER_SNAKE_CASE | `MAX_DIGITS`, `AVATAR_BG` |

### Folder conventions

- **Services** mirror the domain: `services/academic/`, `services/mockTest/`
- **Hooks** mirror the service structure: `hooks/academic/`, `hooks/mockTest/`
- **Query keys** in `hooks/<domain>/queryKeys.ts`
- **Types** are global in `src/types/` (one file per domain)
- **Components** are in `src/components/` with subdirectories for domain groups
- **Screens** in `src/screens/` with subdirectories for screen groups

### Service conventions

1. Every service function returns `ApiResponse<T>`
2. Input validation happens before DB calls
3. Raw DB rows are mapped to camelCase interfaces
4. Error messages are human-readable, never raw Postgres errors
5. Try-catch wraps all public methods

### Hook conventions

1. Query hooks: `use<Plural>`, mutation hooks: `useCreate<Entity>`, `useUpdate<Entity>`
2. Hooks call services, never Supabase directly
3. Hooks throw on service errors (caught by React Query)

### Component conventions

1. One component per file
2. Styles at the bottom of the file via `StyleSheet.create()`
3. `React.memo` for components in lists
4. Theme tokens from `src/theme/` (never hardcoded colors)
5. Accessibility labels on interactive elements

### Database conventions

- Tables use `snake_case` with UUID primary keys
- All tables have `created_at` and `updated_at`
- Foreign keys match: `table_name_singular_id`
- Audit fields: `created_by`, `updated_by` (nullable UUIDs)
- Soft delete via `deleted_at` where applicable
- CHECK constraints for code formatting rules

### How new features should be added

1. **Types first**: Define interfaces in `src/types/`
2. **Service layer**: Implement CRUD in `src/services/`
3. **Query keys**: Add to relevant `queryKeys.ts`
4. **Hooks**: Create React Query hooks wrapping services
5. **UI**: Build components and screens consuming hooks
6. **Navigation**: Add screens to navigator if new route
7. **Validation**: Add tests in `__tests__/`
8. **Dev screen**: Add to `screens/dev/` for manual verification

---

## 22. Project Statistics

### Codebase metrics

| Metric | Value |
|--------|-------|
| **TypeScript source files** | ~95 |
| **Screen components** | 18 |
| **Reusable components** | 20+ (including home sub-components) |
| **Service modules** | 16 |
| **React Query hooks** | 20+ |
| **Redux slices** | 1 (auth) |
| **Database tables** | 50+ across 15 domain schemas |
| **SQL migration files** | 25 |
| **Supabase Edge Functions** | 1 (send-msg91-otp) |
| **Type definition files** | 7 |
| **Theme files** | 9 |
| **Mock data files** | 4 |
| **Dev/test screens** | 8 |

### Module completion estimates

| Module | Completion | Notes |
|--------|-----------|-------|
| **Backend (Database)** | ~90% | All schemas defined, RLS policies written, seed data loaded |
| **Backend (Services)** | ~70% | Core CRUD complete; teacher/student assignment, analytics, commerce pending |
| **Backend (Edge Functions)** | ~30% | Only OTP function; need more (analytics, notifications, etc.) |
| **UI (Authentication)** | ~90% | Login, register, OTP, session restore work with real backend |
| **UI (Home/Dashboard)** | ~60% | Beautiful UI with mock data; backend integration pending |
| **UI (Mock Tests)** | ~80% | All screens built with mock data; backend integration pending |
| **UI (Profile)** | ~80% | Beautiful UI with mock data; backend integration pending |
| **UI (Courses)** | ~60% | Screens exist with mock data |
| **UI (Notifications)** | ~70% | UI complete with mock data; hooks ready for backend |
| **Admin Web Panel** | ~5% | Functional spec written, no code |
| **Teacher Web Panel** | ~5% | Functional spec written, no code |
| **Live Classes** | ~10% | Schema + placeholder screen only |
| **Commerce** | ~10% | Schema only |
| **Overall project** | ~50% | Strong backend foundation, beautiful UI mockups, integration remaining |
