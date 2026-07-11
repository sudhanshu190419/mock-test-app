# MockTestApp — API Integration Blueprint

> **Version:** 1.0  
> **Last Updated:** July 11, 2026  
> **Platform:** React Native (iOS + Android) — CLI (not Expo)  
> **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)  
> **State:** Redux Toolkit (auth) + TanStack React Query v5 (server state)  
> **Target:** Complete screen-by-screen integration guide for the mobile application.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Existing Service Layer Reference](#2-existing-service-layer-reference)
3. [Screen-by-Screen Integration Guide](#3-screen-by-screen-integration-guide)
4. [API Endpoint Reference (Complete)](#4-api-endpoint-reference-complete)
5. [Sequence Diagrams](#5-sequence-diagrams)
6. [Cache Strategy](#6-cache-strategy)
7. [Offline Architecture](#7-offline-architecture)
8. [Error & Retry Strategy](#8-error--retry-strategy)
9. [Priority Order for Implementation](#9-priority-order-for-implementation)
10. [Critical Blockers](#10-critical-blockers)
11. [Dependencies](#11-dependencies)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. Architecture Overview

### 1.1 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           UI Layer                                        │
│  Screen (e.g. MockTestsTabScreen)                                        │
│    ↓ consumes                                                            │
│  Custom Hook (e.g. useAssignedMockTests)                                 │
│    ↓ wraps                                                               │
│  React Query (useQuery / useMutation)                                    │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│                       Service Layer                                       │
│  Service function (e.g. getAssignedMockTests)                             │
│  - Validates inputs (UUID format, required fields)                        │
│  - Calls supabase.from('table').select()...                                │
│  - Maps snake_case DB rows → camelCase TS interfaces                      │
│  - Returns ApiResponse<T> (success | error shape)                         │
│  - Never exposes raw Supabase errors to consumers                         │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│                        Supabase Client                                     │
│  Config: src/config/supabase.ts                                            │
│  CreateClient(url, anonKey, { auth: { storage, persistSession } })        │
│  - anon key (public, RLS-enforced)                                        │
│  - No service_role key in client                                           │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│                     PostgreSQL + RLS                                       │
│  - Row-Level Security policies filter rows per user                       │
│  - auth.uid() determines current user                                     │
│  - auth.jwt()->>'institute_id' scopes admins                              │
│  - RLS policies for student, teacher, admin roles                         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Codebase Module Map

```
src/
├── screens/                   # UI screens (18 screens + 8 dev screens)
│   ├── auth/                  # Login, Register, OTP
│   ├── splash/                # SplashScreen
│   ├── onboarding/            # Onboarding (3 slides)
│   ├── home/                  # HomeScreen (dashboard)
│   ├── tabs/                  # MockTests, LiveClasses, Profile tabs
│   ├── tests/                 # TestDashboard, Instructions, Engine, Result, ExamPack, PYQ
│   ├── courses/               # CourseDetail, Courses
│   └── dev/                   # Developer test screens (8)
├── services/                  # Business logic — 16 service modules
│   ├── authService.ts         # Phone OTP auth
│   ├── testEngineService.ts   # Mock test engine
│   ├── resultService.ts       # Test results
│   ├── notificationService.ts # Notifications (mock)
│   ├── academic/              # Stream, Subject, Chapter, Topic, Batch CRUD
│   └── mockTest/              # Question, Option, Explanation, Image, MockTest, Publish
├── hooks/                     # React Query hooks (20+) + useAuth + useNotifications
│   ├── academic/              # useStreams, useSubjects, useBatches
│   ├── content/               # useContent, useApproval
│   └── mockTest/              # useQuestions, useMockTests, useMockTestQuestions
├── store/                     # Redux — only authSlice
├── types/                     # 7 type files (auth, academic, mockTest, testEngine, etc.)
├── theme/                     # Design system (colors, typography, spacing)
└── config/                    # supabase.ts, storage.ts
```

### 1.3 Existing Service Completion Status

| Service | Module | CRUD | Lifecycle/Workflow | Student-Facing Hooks | Status |
|---------|--------|------|-------------------|---------------------|--------|
| `authService` | Core | SignUp, SignIn, VerifyOtp, ResendOtp | Password reset, session restore | `useAuth.ts` | ✅ Complete |
| `streamService` | Academic | getStreams, create, update, delete | — | `useStreams.ts` | ✅ Complete |
| `subjectService` | Academic | getSubjects, create, update, delete | — | `useSubjects.ts` | ✅ Complete |
| `chapterService` | Academic | getChapters, create, update, delete | — | — | ✅ Complete |
| `topicService` | Academic | getTopics, create, update, delete | — | — | ✅ Complete |
| `batchService` | Academic | getBatches, create, update, delete | Soft delete | `useBatches.ts` | ✅ CRUD, ⏳ Assignment |
| `contentService` | Content | getContents, create, update, delete | draft→pending→approved→archived | `useContent.ts` | ✅ Complete |
| `tagService` | Content | getTags, create, update, delete | attach/detach/replace | — | ✅ Complete |
| `approvalService` | Content | getApprovalRequests, create | approve, reject, reopen, cancel | `useApproval.ts` | ✅ Complete |
| `questionService` | MockTest | getQuestions, create, update, delete | draft→pending→published→archived | `useQuestions.ts` | ✅ Complete |
| `questionOptionService` | MockTest | getOptions, create, update, delete | replace, reorder | — | ✅ Complete |
| `questionExplanationService` | MockTest | getExplanation, create, update, delete | upsert | — | ✅ Complete |
| `questionImageService` | MockTest | getImages, create, update, delete | replace, reorder + storage | — | ✅ Complete |
| `mockTestService` | MockTest | getMockTests, create, update, delete | draft→pending→published→archived | `useMockTests.ts` | ✅ Complete |
| `mockTestQuestionService` | MockTest | getQuestions, add, remove | replace, reorder | `useMockTestQuestions.ts` | ✅ Complete |
| `mockTestPublishService` | MockTest | — | validate, publish, unpublish | `useMockTestPublish.ts` | ✅ Complete |
| `testEngineService` | Core | — | createAttempt, saveAnswer, submitTest | Mock-only | ⏳ Mock data |
| `resultService` | Core | getTestResult, getQuestionAnalysis | share, download | Mock-only | ⏳ Mock data |
| `notificationService` | Core | getNotifications, markAsRead | delete, markAllRead | `useNotifications.ts` | ⏳ Mock data |
| `storageService` | Core | uploadFile, deleteFile, generateSignedUrl | replace, thumbnail | — | ✅ Complete |
| `classService` | Core | getClasses (example only) | — | — | ⏳ Placeholder |

---

## 2. Existing Service Layer Reference

### 2.1 ApiResponse Pattern

```typescript
type ApiResponse<T> =
  | { success: true; data: T; warning?: string }
  | { success: false; error: string; data?: undefined };
```

### 2.2 Pagination Pattern

```typescript
interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface PaginationParams {
  page?: number;     // default: 1
  pageSize?: number; // default: 20
}
```

### 2.3 Query Key Architecture

```
entityKeys.all             → ['academic']
entityKeys.<entity>.all()  → ['academic', 'streams']
entityKeys.<entity>.lists() → ['academic', 'streams', 'list']
entityKeys.<entity>.list(f,s,p) → ['academic', 'streams', 'list', filters, sort, pagination]
entityKeys.<entity>.details() → ['academic', 'streams', 'detail']
entityKeys.<entity>.detail(id) → ['academic', 'streams', 'detail', id]
```

### 2.4 Existing Query Key Factories

| Factory | File | Entities |
|---------|------|----------|
| `academicKeys` | `hooks/academic/queryKeys.ts` | streams, subjects, chapters, topics, batches |
| `contentKeys` | `hooks/content/queryKeys.ts` | contents, tags, approvals |
| `mockTestKeys` | `hooks/mockTest/queryKeys.ts` | questions, options, explanations, images, mockTests, mockTestQuestions, publish |

### 2.5 Existing Redux State

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

---

## 3. Screen-by-Screen Integration Guide

### 3.1 Authentication Module

---

#### 3.1.1 SplashScreen

**Purpose:** Animated launch screen shown while the app checks for an existing auth session.

**Backend Service:** `authService.getSession()`

**Hooks:** `useAuth` (via `useAppSelector(selectIsInitialized)`)

**Required APIs:**
- `getSession()` → returns `AuthResponse<SessionData>` — checks for cached session in AsyncStorage

**Supabase Tables:** `public.profiles`, `auth.users`

**Data Flow:**
```
App mounts → AuthProvider mounts → AuthProvider calls getSession()
→ If session found: dispatch(setSession) → isInitialized = true
→ If no session: dispatch(setInitialized) → isInitialized = true
→ SplashScreen reads selectIsInitialized — once true, navigates to auth or app
```

**Loading States:** `selectIsInitialized === false` → show splash. `true` → render navigation.

**Error States:** If `getSession()` fails (network error), treat as "no session" — navigate to login.

**Retry Strategy:** React Query default — but this is not a query, it's a startup check. No retry.

**Offline Behaviour:** If the device has a cached session in AsyncStorage but is offline:
- The session is restored from AsyncStorage (not verified with server).
- The user sees the app but cannot fetch fresh server data.
- API calls that require network will fail → handled by Retry Strategy.

**Caching Strategy:** Session tokens cached in AsyncStorage via Supabase client config.

**Navigation:** `SplashScreen` → `AuthNavigator` (if not authenticated) or `AppNavigator` (if authenticated).

**Security Checks:** None at this layer — session validation happens via Supabase JWT.

**Validation:** None.

**Edge Cases:**
- First launch (no cached session) → show splash briefly → navigate to onboarding/login.
- Corrupted AsyncStorage → `getSession()` returns null → navigate to login.
- Network timeout during startup → treat as "no session" (set initialized = true).

**Performance Notes:** Splash should be a lightweight animated component. No network call should block rendering — the session check is async.

---

#### 3.1.2 LoginScreen

**Purpose:** Phone number input screen. User enters Indian mobile number (+91), taps "Send OTP".

**Backend Service:** `authService.signUp()`

**Hooks:** `useAuth.register()`

**Required APIs:**
- `register(phone, password, name)` → `AuthResponse<{ phone, password }>` — sends OTP via MSG91 edge function

**Supabase Tables:** `auth.users` (via Supabase Auth), `public.profiles` (via trigger)

**Data Flow:**
```
User types 10-digit phone → app prepends +91
→ User taps "Send OTP" → register(phone, password, name)
→ authService validates input
→ supabase.auth.signUp({ phone, password, options: { data: { full_name } } })
→ Database trigger handle_new_user() creates profiles row
→ OTP sent to phone via MSG91 Edge Function
→ On success: navigate to OtpVerificationScreen with phone
```

**Loading States:** `loading` from `useAuth` — show spinner on button, disable input.

**Error States:**
- Invalid phone format → "Please enter a valid 10-digit mobile number"
- Network error → "Could not connect. Please check your internet connection."
- Account already exists → "This phone number is already registered. Please login."
- MSG91 failure → "Failed to send OTP. Please try again."

**Retry Strategy:** No retry on user action. User must tap "Resend OTP" on the OTP screen.

**Offline Behaviour:** Login requires network — show offline message if no connectivity.

**Caching Strategy:** None.

**Navigation:** `LoginScreen` → `OtpVerificationScreen` (passing phone + password as params).

**Security Checks:**
- Phone regex validation: `/^\+[1-9]\d{6,14}$/`
- Password minimum 6 characters.
- Role NOT sent from frontend — database trigger defaults to 'student'.

**Validation:**
- Phone: exactly 10 digits (India), only digits allowed
- Password: min 6 chars
- Name: non-empty

**Edge Cases:**
- Very fast double-tap on "Send OTP" → `pendingRef` guard in `useAuth` prevents concurrent ops.
- User has already registered → `signUp` returns error → guide to login flow.
- Phone format: stored without '+' prefix in Supabase Auth.

**Performance Notes:** No performance concerns.

---

#### 3.1.3 OtpVerificationScreen

**Purpose:** 4-digit OTP input screen. Verifies the SMS OTP sent to the user's phone.

**Backend Service:** `authService.verifyOtp()`

**Hooks:** `useAuth.verifyOtp()`

**Required APIs:**
- `verifyOtp({ phone, token })` → `AuthResponse<UserProfile>` — verifies OTP
- `resendOtp(phone)` → `AuthResponse<null>` — resends SMS OTP

**Supabase Tables:** `auth.users` (via Supabase Auth), `public.profiles`

**Data Flow:**
```
User enters 4-digit OTP → verifyOtp(phone, token)
→ authService validates
→ supabase.auth.verifyOtp({ phone, token, type: 'sms' })
→ On success: fetch profile from profiles table
→ Build UserProfile from auth user + profile
→ dispatch(setSession) → isAuthenticated = true → navigation auto-switches to App Stack
```

```
User taps "Resend OTP" → resendOtp(phone)
→ supabase.auth.signInWithOtp({ phone, shouldCreateUser: false })
→ New OTP sent to phone
```

**Loading States:** `loading` from `useAuth` — spinner on OTP input, auto-submit on 4 digits.

**Error States:**
- Invalid OTP → "Invalid OTP. Please try again."
- Expired OTP → "OTP has expired. Request a new one."
- Too many attempts → rate-limited by Supabase.

**Retry Strategy:** User taps "Resend OTP" explicitly.

**Offline Behaviour:** Requires network.

**Caching Strategy:** None.

**Navigation:** On success → automatic (AppNavigator renders MainTabNavigator). On "Resend" → stays on same screen.

**Security Checks:**
- OTP length: 4–8 characters.
- `suppressNextSessionSync()` used in forgot-password flow to prevent auto-navigation.

**Validation:**
- Token: exactly 4 digits (for SMS OTP) or 6 digits (for email).

**Edge Cases:**
- OTP auto-read from SMS (Android) — future enhancement.
- User navigates back → cancel ongoing verification.
- OTP expired between input and submission → show "expired" error.

**Performance Notes:** OTP input should auto-submit when all 4 digits entered.

---

#### 3.1.4 ForgotPasswordScreen

**Purpose:** Password reset flow via phone OTP.

**Backend Service:** `authService` (resendOtp, verifyOtp, updatePassword)

**Hooks:** `useAuth.resendOtp()`, `useAuth.verifyOtp()`, `useAuth.resetPassword()`

**Required APIs:**
1. `resendOtp(phone)` → sends OTP for password reset (uses `signInWithOtp` with `shouldCreateUser: false`)
2. `verifyOtp({ phone, token }, { updateSession: false })` — verifies OTP **without** updating session
3. `updatePassword(newPassword)` — sets new password via `supabase.auth.updateUser()`
4. `signOut()` — logs user out after password change

**Supabase Tables:** `auth.users`

**Data Flow:**
```
User enters phone → resendOtp(phone) → OTP sent
→ User enters OTP → verifyOtp(phone, token, { updateSession: false })
   → authService.suppressNextSessionSync() called first
   → OTP verified without triggering session update → navigation stays
→ User enters new password + confirm → resetPassword(newPassword)
   → supabase.auth.updateUser({ password })
   → On success: signOut() → dispatch(logout) → navigate to login
```

**Loading States:** Loading on each step (send OTP, verify OTP, set password).

**Error States:**
- Phone not registered → "No account found with this phone number"
- Weak password → "Password must be at least 6 characters"
- Passwords don't match → "Passwords do not match"
- Token expired → OTP expired

**Retry Strategy:** Resend OTP on user action.

**Offline Behaviour:** Requires network.

**Caching Strategy:** None.

**Navigation:** Start → LoginScreen. After password reset → LoginScreen (signed out).

**Security Checks:**
- `suppressNextSessionSync()` prevents session update during OTP verify.
- User is signed out after password change — must log in with new password.

**Validation:**
- New password: min 6 chars, non-empty.
- Confirm password: must match new password.

**Edge Cases:**
- User closes app during password reset → must restart flow.
- Session token refresh during reset flow → handled by suppression flag.

**Performance Notes:** None.

---

### 3.2 Onboarding Module

#### 3.2.1 OnboardingScreen (3-slide carousel)

**Purpose:** Welcome/feature slides shown on first app launch.

**Backend Service:** None (client-only state).

**Hooks:** `useAppSelector(selectOnboardingCompleted)`, `useAppDispatch(setOnboardingCompleted(true))`

**Required APIs:** None.

**Data Flow:**
```
App launches → selectOnboardingCompleted === false
→ Show OnboardingScreen (3 slides)
→ User swipes through slides → taps "Get Started"
→ dispatch(setOnboardingCompleted(true)) → state persists
→ Next launch: selectOnboardingCompleted === true → skip to auth stack
```

**Caching Strategy:** `onboardingCompleted` is in Redux state. Must be persisted in AsyncStorage for survival across app restarts.

> **⚠️ Critical Gap:** The current Redux store does NOT persist `onboardingCompleted` to AsyncStorage. On app restart, it resets to `false`, showing onboarding again. **Fix:** Add AsyncStorage persistence for the onboarding flag.

**Navigation:** `OnboardingScreen` → (on complete) → `AuthStack` (LoginScreen).

---

### 3.3 Home Module (Dashboard)

---

#### 3.3.1 HomeScreen (Main Dashboard)

**Purpose:** Primary landing screen after login. Shows greeting, hero banner, trending courses, PYQ practice sections, quick actions, features, popular exams, and CTA.

**Backend Services:** Multiple — see per-section below.

**Current Status:** 🔄 In Progress — UI built with hardcoded mock data. Needs complete backend integration.

**Supabase Tables:** Multiple — see per-section below.

**Data Flow (per section):**

```
HomeScreen (FlatList of 8 sections)
├── GreetingHeader     → selectUser (Redux) → { name, avatarUrl }
├── HeroBanner         → Static content OR GET /api/banners (future)
├── TrendingCourses    → GET /api/content?limit=8&sortBy=viewCount (from contentService)
├── PYQ Practice       → GET /api/pyq-packages?isActive=true (from new pyqService)
├── Quick Start        → Static data (home icons)
├── Why Choose         → Static data (feature list)
├── Popular Exams      → GET /api/streams?isActive=true (from streamService)
└── CTA Section        → Static data
```

---

#### 3.3.2 GreetingHeader

**Purpose:** Shows "Good morning, [Name]" with notification bell and profile avatar.

**Backend Service:** None (reads from Redux store).

**Hooks:** `useAppSelector(selectUser)`, `useAppSelector(selectIsLoading)`

**Required APIs:** None.

**Supabase Tables:** `public.profiles` (already loaded during auth)

**Data Flow:**
```
AuthProvider loads profile → stored in Redux authSlice.user
→ GreetingHeader reads user.name and constructs greeting
→ GreetingHeader reads user.avatarUrl for avatar
→ Notification bell shows unreadCount from useNotifications hook
```

**Loading States:** If `user` is null (not yet loaded), show skeleton greeting.

**Error States:** If profile fetch failed, show "Welcome, Learner".

**Retry Strategy:** N/A — profile is part of auth flow, retried on next app launch.

**Offline Behaviour:** If cached profile exists in AsyncStorage, show it. Otherwise show "Welcome, Learner".

**Caching Strategy:** User profile cached in Redux (persisted via AsyncStorage).

**Navigation:** Bell icon → `NotificationScreen`. Avatar → `ProfileTabScreen`.

**Security Checks:** None.

**Validation:** None.

**Edge Cases:**
- User has no name set → show "Learner".
- Notification count is 0 → no badge shown.
- Profile image missing → show fallback avatar (initials circle).

**Performance Notes:** GreetingHeader is at the top of the FlatList — keep it lightweight.

---

#### 3.3.3 HeroBanner

**Purpose:** Animated promotional banner carousel highlighting offers, new features, or upcoming exams.

**Backend Service:** New service needed: `bannerService`

**Hooks:** New hook needed: `useBanners`

**Required APIs:**
- `GET /api/banners` (or `supabase.from('content').select('*').eq('is_free_preview', true).limit(5)`)

**Supabase Tables:** `content` (filtered by `is_free_preview = true` and `content_type`), or dedicated `banners` table.

**Data Flow:**
```
Screen mounts → useQuery(['banners']) → fetches active banners
→ Renders carousel of BannerCard components
→ Auto-slides every 4 seconds
→ On press → navigates to relevant screen
```

**Loading States:** Show skeleton banner (gradient placeholder).

**Error States:** If banners fail to load, show static fallback banner with app branding.

**Retry Strategy:** 3 retries with exponential backoff (React Query default).

**Offline Behaviour:** Cached banners shown. If no cache, show static fallback.

**Caching Strategy:** `staleTime: 5 * 60 * 1000` (5 minutes) — banners change infrequently.

**Navigation:** Press → various screens based on banner type (test, course, announcement).

**Security Checks:** None (public content).

**Validation:** None.

**Edge Cases:**
- Zero banners available → hide section entirely.
- Image fails to load → show gradient fallback.

**Performance Notes:**
- Use `React.memo` on banner cards.
- Preload next/previous banner images.
- Use `FlatList` with `horizontal`, `pagingEnabled`.

---

#### 3.3.4 TrendingCoursesSection

**Purpose:** Horizontal carousel of trending/popular courses based on view count.

**Backend Service:** `contentService.getContents()`

**Hooks:** `useContent` (useQuery for approved content, sorted by viewCount)

**Required APIs:**
- `getContents({ status: 'approved', ids: [...] }, { sortBy: 'viewCount', sortDirection: 'desc' }, { pageSize: 8 })`

**Supabase Tables:** `content` (filtered by `status = 'approved'`, sorted by `view_count`)

**Data Flow:**
```
Screen mounts → useQuery(['content', 'trending']) → getContents({ status: 'approved' }, { sortBy: 'viewCount' })
→ Map response to TrendingCourseItem[]
→ Render horizontal FlatList
→ On course press → navigate to CourseDetailScreen
```

**Loading States:** `CardSkeleton` shimmer for each card in the carousel.

**Error States:** If fetch fails, show "Could not load courses" with retry button.

**Retry Strategy:** 3 retries (React Query default).

**Offline Behaviour:** Show cached courses. If no cache, hide section.

**Caching Strategy:** `staleTime: 2 * 60 * 1000` (2 minutes). Background refetch on focus.

**Navigation:** Course card → `CourseDetailScreen({ courseId })`.

**Security Checks:** Only `approved` content is visible (filtered in service).

**Validation:** None.

**Edge Cases:**
- No trending courses → hide section.
- Course thumbnail fails → show gradient placeholder.

**Performance Notes:**
- `React.memo` on each TrendingCourseCard.
- `windowSize: 3` for horizontal FlatList.
- Preload images for visible cards.

---

#### 3.3.5 PyqPracticeSection

**Purpose:** Auto-carousel of Previous Year Question (PYQ) packages available for purchase or practice.

**Backend Service:** New service needed: `pyqService` (wraps `pyq_packages` table)

**Hooks:** New hook needed: `usePyqPackages`

**Required APIs:**
- `GET /api/pyq-packages?isActive=true&pageSize=7`
- Future: `POST /api/pyq-purchases` (when purchase flow is built)

**Supabase Tables:** `pyq_packages`, `pyq_papers`, `pyq_question_mappings`

> **⚠️ Critical Gap:** No `pyqService` exists yet. Must be created. The `pyq_packages`, `pyq_papers`, etc. tables exist in migrations but have no service layer.

**Data Flow:**
```
Screen mounts → useQuery(['pyq', 'packages']) → fetch active PYQ packages
→ Map to PyqItem[] with descriptions
→ Render auto-carousel (horizontal, auto-scroll every 3 seconds)
→ On item press → navigate to ExamPackDetailScreen
→ On "Practice Now" → navigate to PyqPapersScreen
```

**Loading States:** PyqCardSkeleton shimmer for carousel.

**Error States:** If fetch fails, show "Could not load practice sets" with retry button.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Cache PYQ package list. If no cache, hide section.

**Caching Strategy:** `staleTime: 5 * 60 * 1000` (5 minutes). Background refetch.

**Navigation:** Card → `ExamPackDetailScreen`. "Practice Now" → `PyqPapersScreen`.

**Security Checks:** Only `is_active = true` packages visible to students.

**Validation:** None.

**Edge Cases:**
- No PYQ packages available → hide section.
- Price = 0 → show "Free" tag.

**Performance Notes:** Auto-carousel uses `useEffect` with interval — clean up on unmount.

---

#### 3.3.6 QuickStartSection

**Purpose:** Grid of quick action buttons (Practice Tests, Live Classes, Study Material, My Performance).

**Backend Service:** None (static data).

**Hooks:** None.

**Required APIs:** None — these are navigation shortcuts.

**Navigation:**
- "Practice Tests" → `MockTestsTabScreen`
- "Live Classes" → `LiveClassesTabScreen`
- "Study Material" → `CoursesScreen`
- "My Performance" → `ProfileTabScreen`

---

#### 3.3.7 FeaturesSection (Why Choose MockPrep?)

**Purpose:** Grid of feature cards (Expert Teachers, Comprehensive Content, Performance Analytics, etc.).

**Backend Service:** None (static data).

---

#### 3.3.8 PopularExamsSection

**Purpose:** Grid of popular exam cards with ratings, student counts, and pricing.

**Backend Service:** `streamService.getStreams()`

**Hooks:** `useStreams` (useQuery)

**Required APIs:**
- `getStreams({ isActive: true }, { sortBy: 'displayOrder', sortDirection: 'asc' })`

**Supabase Tables:** `streams` (filtered by `is_active = true`)

> **⚠️ Note:** The current UI renders static exam data (NEET, JEE, CUET, etc.) with hardcoded student counts, ratings, and prices. The `streams` table only has `name`, `code`, `description`, `displayOrder` — it does NOT have `rating`, `studentCount`, `price`, or `imageUrl`. **Gap:** Either extend `streams` table with these display columns, or create a separate `exam_packs` table with enriched metadata.

**Data Flow:**
```
Screen mounts → useQuery(['academic', 'streams', 'popular']) → getStreams({ isActive: true })
→ Map to PopularExamItem[] (with enriched metadata from streams or exam_packs table)
→ Render grid of PopularExamCard
→ On exam press → navigate to ExamPackDetailScreen
```

**Loading States:** PopularExamCardSkeleton for each card.

**Error States:** "Could not load exams" with retry.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Cache exam list. If no cache, show "Offline — tap to retry".

**Caching Strategy:** `staleTime: 10 * 60 * 1000` (10 minutes).

**Navigation:** Card → `ExamPackDetailScreen({ examId: streamId })`.

**Security Checks:** Only `is_active = true` streams visible to students.

**Validation:** None.

**Edge Cases:**
- No active streams → hide section.
- Stream has no description → show generic tagline.

**Performance Notes:** Grid items should be `React.memo`'d.

---

#### 3.3.9 CTASection

**Purpose:** Call-to-action banner encouraging users to start a free test.

**Backend Service:** None (static).

---

### 3.4 Profile Module

---

#### 3.4.1 ProfileTabScreen

**Purpose:** User profile screen showing avatar, name, role, stats (tests taken, accuracy, rank), settings, and logout.

**Backend Services:**
- `authService.signOut()`
- `resultService.getResults()` (for stats)

**Hooks:** `useAuth`, `useAppSelector(selectUser)`

**Required APIs:**
- `selectUser` (Redux) → user profile data
- `signOut()` → logout
- `getResults({ studentId, pageSize: 1 }, { sortBy: 'createdAt', sortDirection: 'desc' })` → latest result for stats

**Supabase Tables:** `public.profiles`, `mock_results`

**Data Flow:**
```
Screen mounts → reads user from Redux
→ Fetches latest result for stats display
→ User taps "Logout" → useAuth.logout() → dispatch(logout) → auto-navigate to auth stack
→ User taps settings → navigate to Settings screen
```

**Current Mock Data:**
```typescript
const USER = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  avatar: 'https://i.pravatar.cc/150?u=aarav',
  stats: { testsTaken: 47, avgAccuracy: 82, avgRank: 1243 },
};
```

**Loading States:** `ProfileSkeleton` shimmer for avatar + stats.

**Error States:** If stats fetch fails, show stats as "—".

**Retry Strategy:** 3 retries for stats fetch.

**Offline Behaviour:** Show cached user profile and cached stats.

**Caching Strategy:** User profile in Redux (persisted). Stats: `staleTime: 5 * 60 * 1000`.

**Navigation:**
- Settings → Settings screen
- Logout → Auth stack (automatic)

**Security Checks:** User can only see their own profile.

**Validation:** None.

**Edge Cases:**
- User has no profile image → show initials avatar.
- User has no stats → show all at zero.
- Logout fails (network) → clear local state anyway.

**Performance Notes:** Lightweight screen.

---

### 3.5 Streams Module

---

#### 3.5.1 ExamPackDetailScreen

**Purpose:** Detail view for an exam pack/stream. Shows description, features, pricing, and a "Start Practice" button.

**Backend Service:** `streamService.getStreamById()`

**Hooks:** `useStreams` (useQuery for single stream)

**Required APIs:**
- `getStreamById(streamId)` → `ApiResponse<Stream>`

**Supabase Tables:** `streams`

**Data Flow:**
```
Screen receives streamId via navigation params
→ useQuery(['academic', 'streams', 'detail', streamId]) → getStreamById(streamId)
→ Render exam details, features, pricing
→ "Start Practice" → navigate to PyqPapersScreen or MockTestsTabScreen
```

**Loading States:** ExamPackSkeleton (full-screen shimmer).

**Error States:** "Could not load exam details" with retry button.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Cache exam detail. If no cache, show error.

**Caching Strategy:** `staleTime: 10 * 60 * 1000`.

**Navigation:**
- "Start Practice" → `PyqPapersScreen`
- "View Mock Tests" → `TestDashboardScreen`

**Security Checks:** Only `is_active = true` streams accessible.

**Validation:** UUID validation for `streamId`.

**Edge Cases:**
- Stream not found (404) → show "Exam not found" screen.
- Stream is inactive → redirect back.

**Performance Notes:** None.

---

### 3.6 Subjects Module

---

#### 3.6.1 Subject Listing (within exam detail)

**Purpose:** Shows subjects within a stream (e.g., Physics, Chemistry, Biology for NEET).

**Backend Service:** `subjectService.getSubjects()`

**Hooks:** `useSubjects` (useQuery)

**Required APIs:**
- `getSubjects({ streamId, ids }, { sortBy: 'displayOrder' })` → `ApiResponse<PaginatedResponse<Subject>>`

**Supabase Tables:** `subjects`

**Data Flow:**
```
Screen mounts with streamId → useQuery(['academic', 'subjects', 'list', { streamId }])
→ getSubjects({ streamId }, { sortBy: 'displayOrder' })
→ Render subject list
→ On subject press → filter mock tests by subject
```

**Loading States:** ListItemSkeleton for each subject.

**Error States:** "Could not load subjects" with retry.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Cache subject list per stream.

**Caching Strategy:** `staleTime: 10 * 60 * 1000`.

**Navigation:** Subject press → filter tests/materials by subject.

**Security Checks:** None (all subjects in active streams are visible).

**Edge Cases:**
- Stream has no subjects → show empty state.
- Subject has no chapters → show empty state.

**Performance Notes:** Use FlatList with React.memo'd items.

---

### 3.7 Batches Module

---

#### 3.7.1 Assigned Mock Tests (Student View)

**Purpose:** Shows mock tests assigned to the student's batch(es).

**Backend Service:** New service needed: `studentTestService`

**Hooks:** New hook needed: `useAssignedMockTests`

**Required APIs:**
- `GET /api/students/{studentId}/assigned-tests` (or complex Supabase query joining through `batch_students` → `batches` → `mock_tests`)

**Supabase Tables:**
- `mock_tests` (status = 'published')
- `batches` (student's batch)
- `batch_students` (enrollment)
- `mock_test_batches` (junction — **MUST BE CREATED** — see blocker below)

> **⚠️ Critical Gap: No mock_test_batches table exists.** The schema has no junction table linking `mock_tests` to `batches`. This is a **critical blocker** for showing assigned tests. **Fix:** Create `mock_test_batches(test_id, batch_id, assigned_at, assigned_by)` table.

**Alternative (without junction table):** Filter `mock_tests` by `stream_id` matching the student's batch stream. This shows all published tests for that stream, not just assigned ones.

**Data Flow:**
```
Screen mounts → get student's batch(es) from batch_students
→ For each batch, get assigned mock tests (via mock_test_batches or stream_id filter)
→ Also get student's existing attempts (to show attempt count, status)
→ Render list of MockTestCard
```

**Loading States:** MockTestsSkeleton shimmer.

**Error States:** "Could not load tests" with retry.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Cache assigned tests list.

**Caching Strategy:** `staleTime: 1 * 60 * 1000` (1 minute — test availability changes).

**Navigation:** Card tap → `TestInstructionsScreen`.

**Security Checks:** Only `published` tests with `available_from <= now()` and (`available_until >= now()` OR `available_until IS NULL`).

**Validation:** Validate studentId UUID.

**Edge Cases:**
- Student not in any batch → show available stream tests or empty state.
- Test is available but attempt limit reached → show "Attempted" badge.
- Test is not yet available (`available_from > now()`) → show "Coming soon".

**Performance Notes:** Use `FlatList` with sections (by subject or batch).

---

#### 3.7.2 MockTestsTabScreen

**Purpose:** Tab showing available mock tests grouped by exam (JEE, NEET, etc.) with glassmorphism cards.

**Backend Service:** `mockTestService.getMockTests()` + new `studentTestService`

**Hooks:** `useMockTests` + new `useAssignedMockTests`

**Supabase Tables:** `mock_tests`, `streams`, `batch_students`, `mock_test_batches`

**Current Mock Data:**
```typescript
const EXAMS = [
  { id: 'jee-main', name: 'JEE Main', icon: 'atom', gradient: ['#7C3AED','#6D28D9'], tests: 24 },
  { id: 'neet', name: 'NEET UG', icon: 'stethoscope', gradient: ['#059669','#047857'], tests: 18 },
  // ...
];
```

**Data Flow:**
```
Screen mounts → fetch streams → fetch published mock tests
→ Group tests by stream
→ Render scrollable list of exam groups with glass cards
→ On exam tap → navigate to TestDashboardScreen(streamId)
```

---

### 3.8 Test Engine Module

---

#### 3.8.1 TestInstructionsScreen

**Purpose:** Pre-test instructions screen showing test rules, duration, marking scheme. Includes "Start Test" button.

**Backend Service:** `mockTestService.getMockTestById()` + `mockTestQuestionService.getMockTestQuestions()`

**Hooks:** New hook: `useTestInstructions`

**Required APIs:**
- `getMockTestById(testId)` → mock test config (duration, total marks, passing marks, negative marking, etc.)
- `getMockTestQuestions(testId)` → question count, sections

**Supabase Tables:** `mock_tests`, `mock_test_questions`

**Data Flow:**
```
Screen receives testId via params
→ Fetch mock test config
→ Fetch question count
→ Display instructions (duration, sections, marking scheme)
→ User checks "I agree" → taps "Start Test"
→ Create attempt → navigate to TestEngineScreen
```

**Loading States:** Full-screen skeleton.

**Error States:** "Could not load test information" with retry.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Pre-fetch instructions when user taps test card. Cache until attempt starts.

**Caching Strategy:** `staleTime: 0` (fresh on every visit — test config may change).

**Navigation:** "Start Test" → `TestEngineScreen` (after creating attempt).

**Security Checks:**
- User must be logged in.
- Test must be `published`.
- `available_from` ≤ now ≤ `available_until`.
- Attempt limit not exceeded.
- User must belong to an assigned batch (or test is open).

**Validation:** UUID validation for `testId`.

**Edge Cases:**
- Attempt limit reached → show "You have used all your attempts" button.
- Test window expired → show "Test is no longer available".
- No questions in test → show "Test is empty — contact support".

**Performance Notes:** Keep instructions screen lightweight — pre-fetch questions in background before navigation.

---

#### 3.8.2 TestEngineScreen (Question Screen)

**Purpose:** The main test-taking interface. Shows one question at a time with options, timer, question palette, and navigation controls.

**Backend Service:** `testEngineService` (needs real backend integration — currently mock data)

**Hooks:** `useTestTimer`, new `useTestAttempt`

**Required APIs:**
- `createAttempt(testId, studentId)` → `{ attemptId, timeRemaining }`
- `getAttemptQuestions(attemptId)` → `QuestionDisplay[]` (frozen from question_snapshot)
- `saveAnswer({ attemptId, questionId, optionIds[] })` (auto-save every 30s + on navigation)
- `markForReview(attemptId, questionId, isMarked)`
- `syncTimer(attemptId, timeRemainingSeconds)` (periodic sync)
- `submitTest(attemptId)` → submits final answers

**Supabase Tables:**
- `mock_attempts` (create)
- `mock_answers` (pre-populated on attempt creation + updated on save)
- `mock_answer_options` (selected options)
- `mock_test_questions` (question_snapshot for frozen questions)

**Data Flow:**
```
"Start Test" tap → createAttempt(testId, studentId)
→ Server pre-populates mock_answers (one per question, all isAnswered=false)
→ Fetch frozen questions from mock_test_questions.question_snapshot
→ Display QuestionScreen with timer
→ User selects options → auto-save every 30s (debounced)
→ User navigates questions → save on each navigation
→ Timer counts down → on expiry → auto-submit
→ User taps "Submit" → confirm dialog → submitTest(attemptId)
→ Navigate to TestResultScreen
```

**Loading States:** Full-screen shimmer while loading questions. Transition animation between questions.

**Error States:**
- Save failed → show warning toast ("Answer may not have been saved"), retry silently.
- Submit failed → show "Could not submit. Tap to retry." Keep timer paused.

**Retry Strategy:**
- Save answer: 3 retries with exponential backoff. If all fail, queue for background retry.
- Submit: 5 retries with exponential backoff. Critical operation.

**Offline Behaviour:**
- Queue unsaved answers locally in AsyncStorage.
- On reconnect, flush queue.
- If online goes down mid-test, continue with local state. Show "Offline — answers saved locally" banner.
- On reconnect, sync all pending saves.

**Caching Strategy:**
- Questions are loaded once and cached for the attempt's duration (not stale — they're frozen).
- Answers are buffered and flushed with debounce + periodic save.

**Navigation:**
- Question Navigation: next/previous buttons, palette jump.
- Submit → `TestResultScreen`.

**Security Checks:**
- Only the student who created the attempt can access it.
- No access to explanations during the attempt.
- Server validates submission timestamp vs. test duration.

**Validation:**
- `attemptId` UUID validation.
- `questionId` in payload must belong to this attempt's test.
- `optionId` must belong to the question.

**Edge Cases:**
- App crashes during test → resume attempt from last auto-save (timeRemainingSeconds).
- Timer reaches zero → auto-submit with whatever is saved.
- Device rotated → preserve state.
- Call comes in → app backgrounds → timer continues.
- Tab switch (web) → detection and warning.
- Duplicate answer save → upsert (idempotent).

**Performance Notes:**
- Use `FlatList` with `initialNumToRender: 1` for question carousel.
- Preload next/previous question content.
- `React.memo` on option buttons.
- Lazy-load images.
- Timer uses ref-based approach to avoid re-renders on every tick.
- Question palette uses `FlashList` for smooth scrolling with 200+ items.

---

#### 3.8.3 Timer

**Purpose:** Countdown timer displayed in the test header.

**Backend Service:** `testEngineService.syncTimer()`

**Hooks:** `useTestTimer(initialSeconds, onTimeUp)`

**Required APIs:**
- `syncTimer(attemptId, timeRemainingSeconds)` — syncs remaining time with server
- `pauseTest(attemptId)` / `resumeTest(attemptId)` — for test pause feature

**Data Flow:**
```
Attempt created → server returns total duration in seconds
→ useTestTimer(durationSeconds, onTimeUp) starts countdown
→ Every 30 seconds: syncTimer(attemptId, timeRemaining)
→ On question navigation: syncTimer(attemptId, timeRemaining)
→ On timeRemaining <= 0: submitTest(attemptId) (auto-submit)
```

**Loading States:** Timer always shows formatted time. During sync, show last synced value.

**Error States:** If timer sync fails, continue ticking locally. Show subtle warning.

**Retry Strategy:** Timer sync: 2 retries. Non-critical — timer continues locally.

**Offline Behaviour:** Timer continues locally. Syncs on reconnect.

**Caching Strategy:** Timer stored in local state + synced to `mock_attempts.time_remaining_seconds`.

**Security Checks:** Server validates `time_remaining_seconds` against actual elapsed time.

**Validation:** `time_remaining_seconds` must be >= 0 and <= total duration.

**Edge Cases:**
- System clock changed → timer uses local interval, not absolute time.
- App backgrounded → timer continues. Resume checks server for authoritative time.
- Multiple tabs (web) → server tracks most recent sync.

**Performance Notes:**
- Timer tick updates state once per second via `setInterval` ref, not causing re-renders of the entire screen.
- Formatted time display optimized with `useMemo`.
- Progress bar (circular or linear) derived from `timeRemaining / initialDuration`.

---

#### 3.8.4 Question Palette

**Purpose:** Grid/matrix showing all questions with color-coded status: Not Visited (grey), Answered (green), Marked for Review (purple), Current (blue).

**Backend Service:** None (derived from local test state).

**Hooks:** Local state in `TestEngineScreen`.

**Required APIs:** None — computed from `TestState`.

**Data Flow:**
```
Palette reads from TestState:
  visitedQuestions (Set<number>) → Not Visited vs. Answered/Visited
  selectedOption (Record<number, string | null>) → answered vs. unanswered
  markedForReview (Set<number>) → marked review
  currentQuestionIndex → current

On palette item tap:
  Save current answer → Navigate to selected question
```

**Navigation:** Palette item tap → jumps to that question index.

**Security Checks:** None.

**Edge Cases:**
- 200+ questions → palette scrolls vertically.
- Subject filtering — palette shows only questions in selected subject.
- All questions answered → show "All answered" indicator.

**Performance Notes:**
- Use `FlatList` or `FlashList` with `numColumns` for grid layout.
- Memoize palette items to prevent re-renders on answer change.

---

#### 3.8.5 Autosave

**Purpose:** Automatically saves the student's answer periodically and on navigation.

**Backend Service:** `testEngineService.saveAnswer()`

**Hooks:** New hook: `useAutoSave`

**Required APIs:**
- `saveAnswer({ attemptId, questionId, selectedOptionIds[], timeSpentSeconds, isMarkedForReview })`

**Data Flow:**
```
Student selects/deselects option:
→ Update local state immediately (optimistic)
→ Start debounce timer (2 seconds)
→ On debounce fire: queue save operation
→ Every 30 seconds: flush all queued saves
→ On question navigation: flush immediately
→ On app background: flush immediately
```

**Loading States:** None (background operation).

**Error States:**
- Save failed → keep in queue, retry with backoff.
- After 3 failures → show toast "Some answers may not have been saved".

**Retry Strategy:** 3 retries with exponential backoff (500ms, 1s, 2s).

**Offline Behaviour:** Queue answers in AsyncStorage. Flush on reconnect. Show "Saving offline" indicator.

**Caching Strategy:** Answers saved to `mock_answers` table. Client caches pending saves in AsyncStorage.

**Security Checks:** Server validates `questionId` belongs to the attempt's test.

**Validation:** 
- `selectedOptionIds` must be valid UUIDs belonging to the question.
- `timeSpentSeconds` must be >= 0.

**Edge Cases:**
- Rapid selection changes → debounce handles coalescing.
- App killed before flush → on resume, pending queue in AsyncStorage is flushed.
- Duplicate saves → idempotent (upsert on server).

**Performance Notes:**
- Debounce prevents excessive API calls during rapid selection.
- Batch saves when possible (future: batch endpoint).

---

#### 3.8.6 Resume Attempt

**Purpose:** If a student closes the app or navigates away during a test, allows them to resume from where they left off.

**Backend Service:** `testEngineService.getAttempt()` 

**Hooks:** New hook: `useResumeAttempt`

**Required APIs:**
- `getAttempt(attemptId)` → attempt status, time remaining, answers
- `getAttemptAnswers(attemptId)` → all saved answers

**Data Flow:**
```
Student opens test → check for existing in-progress attempt
→ If exists: show "Resume Attempt?" dialog
→ If confirmed: load attempt state (time remaining, answers, review flags)
→ Restore TestState from server
→ Resume timer from timeRemainingSeconds
→ Continue test
```

**Loading States:** Skeleton while loading attempt state.

**Error States:** If resume fails, offer "Start New Attempt" fallback.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** If cached attempt state exists locally, resume from local state. Sync on reconnect.

**Caching Strategy:** Attempt state cached locally after each auto-save.

**Navigation:** Resume flow → `TestEngineScreen` (restored state).

**Security Checks:** 
- Attempt must belong to the authenticated student.
- Attempt must be `in_progress` status.
- Test must still be available (not expired).

**Validation:** UUID validation for `attemptId`.

**Edge Cases:**
- Attempt was auto-submitted by timer expiry on server → show result instead.
- Attempt was abandoned by timeout job → show "Test was auto-submitted".
- Multiple resumable attempts → resume latest.

**Performance Notes:** Load attempt state + answers in parallel.

---

#### 3.8.7 Image Questions

**Purpose:** Questions with embedded images (diagrams, graphs, figures) in the stem, options, or explanation.

**Backend Service:** `storageService.generateSignedUrl()` + `questionImageService.getQuestionImages()`

**Hooks:** New hook: `useQuestionImages`

**Required APIs:**
- `getQuestionImages(questionId)` → `QuestionImage[]` with storage paths
- `generateSignedUrl({ bucket, storagePath, contentType })` → signed URL (short-lived)

**Supabase Tables:** `question_images`, Supabase Storage (bucket: `question-images`)

**Data Flow:**
```
Question loads → display question stem text
→ For each image in question_snapshot or question_images:
   → If image URL is a storage path:
      → generateSignedUrl({ bucket, storagePath, contentType: 'image' })
      → Display signed URL in Image component
→ On error: show alt text or placeholder
```

**Loading States:** Image placeholder shimmer while signed URL is generated.

**Error States:** If image fails to load → show alt text + "Tap to reload" button.

**Retry Strategy:** Signed URL generation: 2 retries. Image load: handled by `Image.onError` → retry.

**Offline Behaviour:** Signed URLs cannot be cached long-term (expire quickly). Show placeholder.

**Caching Strategy:** Signed URLs have short expiry (60s). Regenerate on demand. Do NOT cache URLs.

**Security Checks:** Image bucket has RLS — only authorized users (students in attempt) can access.

**Validation:** 
- `imageRole` must be valid (`stem`, `option_a`–`option_d`, `explanation`).
- `storagePath` must be valid.

**Edge Cases:**
- Image too large for screen → `resizeMode: 'contain'`.
- Multiple images in stem → horizontally scrollable.
- Image fails mid-load → show error state for that image only.

**Performance Notes:**
- Preload images for current + next question.
- Lazy-load images for questions not yet visited.
- Use `react-native-fast-image` for cached image loading.

---

#### 3.8.8 Question Navigation

**Purpose:** Navigation controls (Next, Previous, Question Palette) for moving between questions.

**Backend Service:** None (client-side navigation within the attempt).

**Required APIs:** None.

**Data Flow:**
```
User taps "Next" → save current answer → increment currentQuestionIndex
→ If currentQuestionIndex >= totalQuestions: show "Review & Submit" screen
→ Update question palette status
→ Display next question
```

**Keyboard shortcuts (future):** 
- `Ctrl+J` → Previous
- `Ctrl+K` → Next
- `Ctrl+P` → Palette

**Security Checks:** Cannot navigate beyond totalQuestions.

**Edge Cases:**
- Last question + "Next" → show "Review Questions" screen.
- First question + "Previous" → disabled.
- Subject filtering active → navigation wraps within subject.

**Performance Notes:** 
- Preload next question content for instant transition.
- Animate question transitions (slide from right/left).

---

#### 3.8.9 Submit

**Purpose:** Final confirmation and submission of the test.

**Backend Service:** `testEngineService.submitTest()`

**Hooks:** New hook: `useSubmitTest`

**Required APIs:**
- `submitTest(attemptId)` → `{ success, resultId }`

**Data Flow:**
```
User taps "Submit" → confirm dialog ("Are you sure?")
→ If confirmed: submitTest(attemptId)
   → Server marks attempt as 'submitted'
   → Server computes result (scoring)
   → Server returns resultId
→ Navigate to TestResultScreen(resultId)
```

**Auto-submit (timer expiry):**
```
timeRemaining <= 0 → submitTest(attemptId) with status = 'timed_out'
→ Navigate to TestResultScreen
```

**Loading States:** Full-screen overlay with spinner + "Submitting your answers..." during submission.

**Error States:**
- Submit failed → show "Could not submit. Tap to retry." with retry button.
- Partial submit → show warning.

**Retry Strategy:** 5 retries with exponential backoff. Critical — user must not lose answers.

**Offline Behaviour:** Queue submission. On reconnect, flush. Show "Waiting for network to submit."

**Caching Strategy:** None after submission (attempt is final).

**Security Checks:**
- Server validates no duplicate submission (idempotent).
- Server validates attempt is `in_progress`.
- Server validates time not exceeded.

**Validation:** `attemptId` UUID.

**Edge Cases:**
- Double-tap → idempotent on server (status already 'submitted' → return existing result).
- Network drops mid-submit → on reconnect, check if already submitted.
- Timer expires while user is on confirm dialog → force auto-submit.

**Performance Notes:** Async operation with UI overlay.

---

### 3.9 Results Module

---

#### 3.9.1 TestResultScreen

**Purpose:** Shows the student's test result: score, percentage, rank, accuracy, subject breakdown, question-level analysis.

**Backend Service:** `resultService.getTestResult()`

**Hooks:** New hook: `useTestResult`

**Required APIs:**
- `getTestResult(testId, attemptId)` → `TestResult` with score, percentage, rank, percentile, subject breakdowns, time analysis
- `getQuestionAnalysis(attemptId)` → `QuestionAnalysis[]` (per-question review)

**Supabase Tables:** `mock_results`

**Data Flow:**
```
Screen receives attemptId via params
→ Fetch TestResult (score, percentage, rank, etc.)
→ Fetch QuestionAnalysis (per-question details)
→ Render result dashboard:
   - Score card (score/maxScore + percentage)
   - Rank card (rank + percentile)
   - Accuracy card (correct/wrong/skipped)
   - Time card (time taken / total duration)
   - Subject breakdown bars
   - Per-question review list
→ "Share" button → share result
→ "View Solutions" → show explanations
```

**Current Mock Data:**
```typescript
MOCK_TEST_RESULT = {
  score: 245, maxScore: 360, percentage: 68.06,
  percentile: 98.2, rank: null,
  correctCount: 62, incorrectCount: 11, skippedCount: 2,
  subjectBreakdown: [
    { subjectName: 'Physics', score: 68, maxScore: 120, percentage: 56.7, ... },
    { subjectName: 'Chemistry', score: 88, maxScore: 120, percentage: 73.3, ... },
    { subjectName: 'Mathematics', score: 89, maxScore: 120, percentage: 74.2, ... },
  ],
}
```

**Loading States:** Full-screen shimmer result skeleton.

**Error States:** "Could not load results" with retry button.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Cache latest result. If no cache, show "Results unavailable offline".

**Caching Strategy:** 
- Result: `staleTime: 5 * 60 * 1000` (5 min — results don't change after generation).
- Question analysis: `staleTime: 10 * 60 * 1000`.

**Navigation:**
- "View Solutions" → per-question solution screen.
- "Share" → share sheet.
- "Back to Dashboard" → `HomeScreen`.

**Security Checks:** 
- Result must belong to the authenticated student.
- Result must be `isReleased = true` (or admin/teacher viewing).

**Validation:** UUID validation for `attemptId`.

**Edge Cases:**
- Result not yet released (resultReleaseMode = 'manual' or 'scheduled') → show "Results will be available on [date]".
- Score is negative (heavy negative marking) → show as 0 in progress bar.
- Rank is null (not yet computed) → show "Rank will be updated soon".
- Subject breakdown is null → single-subject test → show overall only.

**Performance Notes:** 
- Use `Animated` for score count-up animation.
- Subject breakdown uses horizontal bar charts (custom SVG or simple Views).
- `FlatList` for question review list with `React.memo`'d items.

---

#### 3.9.2 Rank

**Purpose:** Shows the student's rank within the test.

**Backend Service:** Derived from `mock_results.rank` and `mock_results.percentile`

**Required APIs:** Same as `getTestResult()`.

**Supabase Tables:** `mock_results`

**Data Flow:**
```
Result loaded → display rank card:
- Rank: #42 / 12,340 students
- Percentile: 99.6 (scored higher than 99.6% of students)
- Rank range: 38-46 (confidence interval)
```

**Edge Cases:**
- Rank not yet computed (test window not closed) → show percentile only.
- Only 1 student took test → rank = 1, percentile = 100.
- Tied ranks → same rank value.

---

#### 3.9.3 Leaderboard

**Purpose:** Shows top students for a given test or stream.

**Backend Service:** New service needed: `leaderboardService`

**Hooks:** New hook: `useLeaderboard`

**Required APIs:**
- `GET /api/tests/{testId}/leaderboard?page=1&pageSize=50`
- `GET /api/streams/{streamId}/leaderboard?period=weekly`

**Supabase Tables:** `mock_results` (joined with `profiles`, filtered by `test_id`)

**Data Flow:**
```
Screen mounts → useQuery(['leaderboard', testId])
→ Fetch top N results ordered by totalScore DESC
→ Highlight current user's row
→ Paginated FlatList
```

**Loading States:** Leaderboard skeleton.

**Error States:** "Could not load leaderboard" with retry.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Cache leaderboard. If no cache, offline state.

**Caching Strategy:** `staleTime: 5 * 60 * 1000` (5 minutes — ranks change slowly).

**Navigation:** User row tap → view their profile (restricted).

**Security Checks:** Only published tests with released results.

**Edge Cases:**
- Less than 50 students → no pagination needed.
- Current user not on first page → scroll to their position.
- Tied scores → same rank.

**Performance Notes:** 
- Use `FlatList` with `getItemLayout` for fixed-height rows.
- Show top 3 with trophy icons.

---

#### 3.9.4 Analytics (Test Analytics)

**Purpose:** Per-question and per-chapter performance analysis.

**Backend Service:** `resultService.getQuestionAnalysis()` + `resultService.getTopicAnalysis()`

**Hooks:** New hook: `useTestAnalytics`

**Required APIs:**
- `getQuestionAnalysis(attemptId)` → `QuestionAnalysis[]`
- `getTopicAnalysis(attemptId)` → `TopicAnalysis[]`

**Data Flow:**
```
Screen mounts → fetch QuestionAnalysis + TopicAnalysis
→ Render:
   - Accuracy by subject (pie chart or bar chart)
   - Time spent per question (bar chart)
   - Weak vs strong chapters (color-coded list)
   - Correct/Wrong/Skipped distribution
```

**Edge Cases:**
- No topic analysis available (not enabled for this test) → hide section.
- All questions correct → show perfect score badge.

---

### 3.10 Notifications Module

---

#### 3.10.1 NotificationScreen

**Purpose:** List of in-app notifications grouped by Today/Yesterday/Earlier, with filter chips and mark-as-read functionality.

**Backend Service:** `notificationService` (currently mock — needs Supabase integration)

**Hooks:** `useNotifications` (currently uses mock data)

**Required APIs:**
- `getNotifications({ page, pageSize, type })` → `FetchNotificationsResponse`
- `markAsRead({ notificationId })` → `{ success }`
- `markAllAsRead({ type })` → `{ success }`
- `deleteNotification({ notificationId })` → `{ success }`
- `deleteAllRead()` → `{ success }`

**Supabase Tables:** `notifications`, `notification_recipients`

**Data Flow:**
```
Screen mounts → useNotifications hook → fetch notifications
→ Group by section (today/yesterday/earlier based on createdAt)
→ Render SectionList with header labels
→ User taps → markAsRead + navigate via actionType/actionId
→ Filter chips → setFilterType → re-fetch
→ Swipe to delete → deleteNotification
→ Mark all read → markAllAsRead
```

**Current Mock:** 18 mock notifications across 8 notification types.

**Loading States:** 
- Initial load: `isLoading` → skeleton notifications.
- Pull-to-refresh: `isRefreshing` → subtle indicator.

**Error States:** "Failed to load notifications. Pull down to retry."

**Retry Strategy:** Pull-to-refresh triggers retry. 3 attempts on initial load.

**Offline Behaviour:** Cache last-loaded notifications. Show cached data with "Offline" banner.

**Caching Strategy:** `staleTime: 30 * 1000` (30 seconds — notifications arrive frequently).
- Infinite scroll pagination.

**Navigation:** Tap → `actionType` + `actionId` determines destination:
- `mockTestDetails` → `TestInstructionsScreen`
- `testResult` → `TestResultScreen`
- `liveClassDetails` → `LiveClassesTabScreen`
- `paymentDetails` → Profile
- `deepLink` → URL

**Security Checks:** RLS ensures students see only their own notifications (via `notification_recipients`).

**Validation:** UUID validation for notification IDs.

**Edge Cases:**
- Zero notifications → show empty state ("No notifications yet").
- Real-time notifications (future) → subscribe to Supabase Realtime for `notification_recipients` changes.
- Deep link to deleted/moved resource → show toast "Resource not available".

**Performance Notes:**
- Use `SectionList` for grouped notifications.
- `React.memo` on notification items.
- Swipe-to-delete uses `react-native-gesture-handler` (future).
- Filter chips should be horizontally scrollable.

---

### 3.11 Live Classes Module

---

#### 3.11.1 LiveClassesTabScreen

**Purpose:** Shows scheduled, live, and upcoming live classes. Placeholder currently.

**Backend Service:** `classService` (placeholder — not implemented)

**Hooks:** New hook: `useLiveClasses`

**Required APIs:**
- `GET /api/live-classes?batchId={batchIds}` → list of classes
- Realtime subscription for live class status changes

**Supabase Tables:** `live_classes`, `live_class_batch`, `live_sessions`, `attendance`

**Data Flow:**
```
Screen mounts → fetch student's batches
→ For each batch, fetch live_classes (scheduled, live, completed)
→ Group by status (Live Now, Upcoming, Past)
→ Render list with status badges
→ "Join" button → navigate to live class (Jitsi integration — future)
```

**Current Mock:** Placeholder screen with "coming soon" text.

**Loading States:** CardSkeleton for each class card.

**Error States:** "Could not load classes" with retry.

**Retry Strategy:** 3 retries.

**Offline Behaviour:** Cache class schedule. Show cached data offline.

**Caching Strategy:** `staleTime: 1 * 60 * 1000` (1 minute — class times are dynamic).

**Navigation:** 
- "Join" → opens live class (future: Jitsi SDK integration).
- Class card → class detail.

**Security Checks:** Student can only see batches they're enrolled in.

**Edge Cases:**
- No live classes → show "No upcoming classes" with CTA.
- Class cancelled → show "Cancelled" status.

**Performance Notes:** Use Realtime subscription for "Go Live" status changes.

---

### 3.12 Attendance Module

**Backend Service:** New service needed: `attendanceService`

**Required APIs:**
- `GET /api/attendance?studentId=X&batchId=Y` → attendance records
- `GET /api/attendance/summary?studentId=X` → attendance percentage

**Supabase Tables:** `attendance`

**Note:** Attendance is teacher/student-facing. Integration priority: MEDIUM.

---

### 3.13 Assignments Module

**Backend Service:** `contentService.getContents()` (filtered by `contentType = 'assignment'`)

**Required APIs:**
- `getContents({ contentType: 'assignment', chapterId }, { sortBy: 'createdAt' })`

**Supabase Tables:** `content`

**Note:** Assignments are a content type. Integration priority: LOW.

---

### 3.14 Doubts Module

**Backend Service:** New service needed: `doubtService`

**Required APIs:**
- `POST /api/doubts` → create a doubt question
- `GET /api/doubts?studentId=X` → list student's doubts
- `POST /api/doubts/{id}/replies` → add reply to doubt
- `PATCH /api/doubts/{id}` → resolve doubt

**Supabase Tables:** `student_doubts`, `doubt_replies`

**Note:** Doubts module is not yet implemented on the UI. Integration priority: LOW.

---

### 3.15 Purchases & Payments Module

**Backend Service:** New services needed: `orderService`, `paymentService`

**Required APIs:**
- `POST /api/orders` → create order
- `POST /api/payments` → initiate payment
- `POST /api/webhooks/payment` → payment gateway webhook
- `GET /api/orders?studentId=X` → order history

**Supabase Tables:** `orders`, `order_items`, `payments`, `invoices`

**Note:** Payments require payment gateway integration (Razorpay, Stripe, etc.). Integration priority: MEDIUM.

---

### 3.16 Settings Module

**Purpose:** App settings (theme, notifications, privacy, account management).

**Backend Service:** `authService` (for account-related changes)

**Hooks:** `useAuth`

**Required APIs:**
- `updatePassword(newPassword)` — change password
- `supabase.auth.updateUser({ data: { ... } })` — update profile metadata

**Supabase Tables:** `public.profiles` (for display name, avatar updates)

**Note:** Settings screen is not yet separated from ProfileTabScreen.

---

### 3.17 Progress Tracking Module

**Purpose:** Shows the student's performance over time across multiple tests.

**Backend Service:** New service needed: `progressService`

**Required APIs:**
- `GET /api/students/{studentId}/progress` → `ProgressHistory[]`
- `GET /api/students/{studentId}/performance` → `PerformanceReport`

**Supabase Tables:** `progress_history`, `performance_reports`, `subject_performances`, `chapter_performances`

**Note:** This is a future feature. Integration priority: LOW.

---

## 4. API Endpoint Reference (Complete)

### 4.1 Authentication APIs

#### `POST /auth/sign-up`
- **Request:** `{ phone: string, password: string, name: string }`
- **Response:** `{ success: true, data: { phone, password } }`
- **Errors:** Invalid phone format, weak password, duplicate account
- **Permissions:** Public
- **Required Indexes:** `profiles.phone`
- **Caching:** None
- **Pagination:** N/A
- **Realtime:** None
- **Offline:** Requires network
- **Retry:** No retry (user action required)

#### `POST /auth/verify-otp`
- **Request:** `{ phone: string, token: string }`
- **Response:** `{ success: true, data: UserProfile }`
- **Errors:** Invalid OTP, expired OTP, rate limited
- **Permissions:** Public (with valid OTP)
- **Caching:** None
- **Realtime:** None
- **Offline:** Requires network
- **Retry:** No retry

---

### 4.2 Academic APIs

#### `GET /streams`
- **Request:** `filters?` (instituteId, isActive, search, ids), `sort?`, `pagination?`
- **Response:** `PaginatedResponse<Stream>`
- **Errors:** Invalid UUID, unauthorized
- **Permissions:** Authenticated + RLS
- **Required Indexes:** `streams.institute_id`, `streams.is_active`
- **Caching:** `staleTime: 10 * 60 * 1000`
- **Pagination:** page=1, pageSize=20
- **Realtime:** None needed
- **Offline:** Cache-friendly (rarely changes)

#### `GET /subjects`
- **Request:** `filters?` (streamId, search, ids), `sort?`, `pagination?`
- **Response:** `PaginatedResponse<Subject>`
- **Permissions:** Authenticated + RLS
- **Required Indexes:** `subjects.stream_id`
- **Caching:** `staleTime: 10 * 60 * 1000`

#### `GET /batches`
- **Request:** `filters?` (instituteId, streamId, status, academicYear, search), `sort?`, `pagination?`
- **Response:** `PaginatedResponse<Batch>`
- **Permissions:** Student: only batches they're enrolled in. Teacher: assigned batches. Admin: all.
- **Required Indexes:** `batches.stream_id`, `batches.status`, `batches.deleted_at`

#### `GET /chapters`
- **Request:** `filters?` (subjectId, search, ids), `sort?`, `pagination?`
- **Response:** `PaginatedResponse<Chapter>`
- **Permissions:** Authenticated + RLS
- **Required Indexes:** `chapters.subject_id`

#### `GET /topics`
- **Request:** `filters?` (chapterId, search, ids), `sort?`, `pagination?`
- **Response:** `PaginatedResponse<Topic>`
- **Permissions:** Authenticated + RLS
- **Required Indexes:** `topics.chapter_id`

---

### 4.3 Mock Test APIs

#### `GET /mock-tests`
- **Request:** `filters?` (instituteId, streamId, subjectId, status, search), `sort?`, `pagination?`
- **Response:** `PaginatedResponse<MockTest>`
- **Errors:** Invalid UUID, unauthorized
- **Permissions:** Student: only `published` tests. Teacher: own tests. Admin: all.
- **Required Indexes:** `mock_tests.stream_id`, `mock_tests.status`, `mock_tests.teacher_id`
- **Caching:** `staleTime: 1 * 60 * 1000`
- **Pagination:** page=1, pageSize=20, sortBy=createdAt desc

#### `GET /mock-tests/{testId}`
- **Request:** `testId` (path param)
- **Response:** `MockTest`
- **Permissions:** Same as list

#### `POST /mock-tests`
- **Request:** `CreateMockTestInput`
- **Response:** `MockTest`
- **Permissions:** Teacher/Admin only

#### `POST /attempts`
- **Request:** `{ testId, studentId, instituteId }`
- **Response:** `{ attemptId, timeRemaining }`
- **Errors:** Test not available, attempt limit reached
- **Permissions:** Authenticated student
- **Required Indexes:** `mock_attempts.test_id_student_id_status_idx` (composite), `mock_attempts.test_id`
- **Caching:** None
- **Realtime:** Future: notify teacher on attempt start

#### `POST /attempts/{attemptId}/answers`
- **Request:** `{ questionId, selectedOptionIds[], numericalAnswer?, timeSpentSeconds, isMarkedForReview }`
- **Response:** `{ success }`
- **Errors:** Attempt not found, invalid question
- **Permissions:** Only the attempt owner
- **Required Indexes:** `mock_answers.attempt_id`, `mock_answer_options.answer_id`
- **Caching:** None
- **Realtime:** None
- **Offline:** Queue in AsyncStorage
- **Retry:** 3 retries with exponential backoff

#### `POST /attempts/{attemptId}/submit`
- **Request:** `{ }` (no body — uses saved answers)
- **Response:** `{ success, resultId }`
- **Errors:** Attempt already submitted, no answers
- **Permissions:** Only the attempt owner
- **Caching:** None
- **Realtime:** None
- **Offline:** Queue submission
- **Retry:** 5 retries — critical operation

---

### 4.4 Result APIs

#### `GET /attempts/{attemptId}/result`
- **Request:** `attemptId` (path param)
- **Response:** `TestResult`
- **Errors:** Result not yet released, attempt not found
- **Permissions:** Student (own), Teacher (assigned tests), Admin (all)
- **Required Indexes:** `mock_results.attempt_id` (unique)
- **Caching:** `staleTime: 5 * 60 * 1000`
- **Pagination:** N/A
- **Realtime:** None
- **Offline:** Cache result locally after fetching

#### `GET /attempts/{attemptId}/questions/analysis`
- **Request:** `attemptId` (path param)
- **Response:** `QuestionAnalysis[]`
- **Permissions:** Same as result
- **Caching:** `staleTime: 10 * 60 * 1000`

#### `GET /tests/{testId}/leaderboard`
- **Request:** `testId`, `pagination?`
- **Response:** `PaginatedResponse<{ rank, studentName, score, percentage }>`
- **Permissions:** Anyone with access to the test
- **Required Indexes:** `mock_results.test_id_score_idx` (composite)
- **Caching:** `staleTime: 5 * 60 * 1000`

---

### 4.5 Notification APIs

#### `GET /notifications`
- **Request:** `pagination?`, `type?` (filter by notification type)
- **Response:** `{ data: Notification[], totalCount, unreadCount, hasMore, nextPage }`
- **Permissions:** Student (own), Teacher (own), Admin (all institute)
- **Required Indexes:** `notification_recipients.profile_id`
- **Caching:** `staleTime: 30 * 1000` (30 seconds)
- **Pagination:** page=1, pageSize=50
- **Realtime:** Future: live-update on new notification via Supabase Realtime

#### `POST /notifications/{id}/read`
- **Request:** None (mark as read)
- **Response:** `{ success }`
- **Errors:** Not found
- **Permissions:** Only the recipient

#### `POST /notifications/read-all`
- **Request:** `{ type? }` (optional filter)
- **Response:** `{ success }`
- **Permissions:** Only the recipient

#### `DELETE /notifications/{id}`
- **Request:** None
- **Response:** `{ success }`
- **Permissions:** Only the recipient

---

### 4.6 Content APIs

#### `GET /content`
- **Request:** `filters?` (instituteId, chapterId, contentType, status, search), `sort?`, `pagination?`
- **Response:** `PaginatedResponse<Content>`
- **Permissions:** Student: only `approved` content
- **Required Indexes:** `content.chapter_id`, `content.content_type`, `content.status`, `content.view_count`
- **Caching:** `staleTime: 2 * 60 * 1000`

---

### 4.7 Storage APIs (via Supabase Storage)

#### `GET /storage/signed-url`
- **Request:** `{ bucket, storagePath, contentType, expiresIn? }`
- **Response:** `{ signedUrl, expiresAt }`
- **Permissions:** RLS on storage bucket
- **Caching:** Do NOT cache signed URLs
- **Offline:** Cannot view files offline

#### `POST /storage/upload`
- **Request:** `file` (multipart) + metadata
- **Response:** `{ bucket, storagePath, fileSize, mimeType }`
- **Permissions:** Authenticated + RLS on bucket
- **Retry:** 3 retries with exponential backoff (transient errors only)

---

### 4.8 New Services Needed

| Service | File | Priority | Reason |
|---------|------|----------|--------|
| `pyqService` | `services/pyqService.ts` | HIGH | No service exists for PYQ module |
| `studentTestService` | `services/studentTestService.ts` | CRITICAL | No way to get assigned tests |
| `leaderboardService` | `services/leaderboardService.ts` | MEDIUM | Leaderboard not yet built |
| `attendanceService` | `services/attendanceService.ts` | MEDIUM | Attendance view not yet built |
| `doubtService` | `services/doubtService.ts` | LOW | Doubts not yet built |
| `orderService` | `services/orderService.ts` | MEDIUM | Purchases not yet built |
| `paymentService` | `services/paymentService.ts` | MEDIUM | Payments not yet built |
| `progressService` | `services/progressService.ts` | LOW | Progress tracking not yet built |
| `bannerService` | `services/bannerService.ts` | LOW | Banner carousel enhancement |

---

## 5. Sequence Diagrams

### 5.1 Authentication Flow

```
┌─────────┐    ┌───────────────┐    ┌────────────────┐    ┌──────────────┐    ┌──────────────┐
│  User    │    │  LoginScreen  │    │  authService   │    │  Supabase    │    │  MSG91 Edge  │
│          │    │  (RN)         │    │  (RN)          │    │  Auth        │    │  Function    │
└────┬─────┘    └──────┬────────┘    └───────┬────────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                     │                   │                    │
     │ Enter phone     │                     │                   │                    │
     │ +91 9876543210  │                     │                   │                    │
     │ + "Send OTP"    │                     │                   │                    │
     │────────────────>│                     │                   │                    │
     │                 │ register(phone,     │                   │                    │
     │                 │         password,   │                   │                    │
     │                 │         name)       │                   │                    │
     │                 │────────────────────>│                   │                    │
     │                 │                     │ supabase.auth     │                    │
     │                 │                     │ .signUp({         │                    │
     │                 │                     │   phone,          │                    │
     │                 │                     │   password,       │────────────────────>│
     │                 │                     │   options.data    │                    │
     │                 │                     │ })                │                    │
     │                 │                     │                   │                    │
     │                 │                     │                   │            trigger  │
     │                 │                     │                   │            send-    │
     │                 │                     │                   │            msg91-otp│
     │                 │                     │                   │                    │
     │  OTP sent via   │                     │                   │                    │
     │  SMS            │                     │                   │                    │
     │<────────────────│<───────────────────│<──────────────────│<───────────────────│
     │                 │                     │                   │                    │
     │ Enter OTP       │                     │                   │                    │
     │ "1234"          │                     │                   │                    │
     │────────────────>│                     │                   │                    │
     │                 │ verifyOtp(phone,    │                   │                    │
     │                 │           token)    │                   │                    │
     │                 │────────────────────>│                   │                    │
     │                 │                     │ supabase.auth     │                    │
     │                 │                     │ .verifyOtp(       │────────────────────>│
     │                 │                     │   phone, token,   │                    │
     │                 │                     │   type: 'sms'     │                    │
     │                 │                     │ )                 │                    │
     │                 │                     │                   │                    │
     │                 │                     │ fetchProfile      │                    │
     │                 │                     │ (profiles table)  │────────────────────>│
     │                 │                     │<──────────────────│────────────────────│
     │                 │                     │                   │                    │
     │                 │                     │ buildUserProfile  │                    │
     │                 │                     │ dispatch(setSession)                   │
     │                 │                     │──────────────────>│                    │
     │                 │                     │                   │ (Redux)            │
     │                 │                     │                   │                    │
     │  Navigate to    │                     │                   │                    │
     │  Dashboard      │                     │                   │                    │
     │<────────────────│<───────────────────│<──────────────────│                    │
```

### 5.2 Test Attempt Flow

```
┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌─────────────┐    ┌──────────────┐
│ Student  │    │ Instructions│    │ TestEngine    │    │ Services    │    │  PostgreSQL  │
│          │    │ Screen       │    │ Screen        │    │ Layer       │    │              │
└────┬─────┘    └──────┬───────┘    └──────┬────────┘    └──────┬──────┘    └──────┬───────┘
     │                 │                    │                    │                   │
     │ Tap "Start"     │                    │                    │                   │
     │────────────────>│                    │                    │                   │
     │                 │ createAttempt      │                    │                   │
     │                 │ (testId, studentId)│                    │                   │
     │                 │───────────────────>│                    │                   │
     │                 │                    │  INSERT mock_attempts                  │
     │                 │                    │───────────────────>│──────────────────>│
     │                 │                    │                    │                   │
     │                 │                    │  INSERT mock_answers (1 per question)  │
     │                 │                    │───────────────────>│──────────────────>│
     │                 │                    │                    │                   │
     │                 │     { attemptId,   │                    │                   │
     │                 │       timeRemaining}│                    │                   │
     │                 │<───────────────────│                    │                   │
     │    Navigate     │                    │                    │                   │
     │<────────────────│                    │                    │                   │
     │                                      │                    │                   │
     │     Answer Q1   │                    │                    │                   │
     │─────────────────────────────────────>│                    │                   │
     │                                      │  auto-save (debounce 2s)              │
     │                                      │───────────────────>│──────────────────>│
     │                                      │                    │                   │
     │     Navigate Q2 │                    │                    │                   │
     │─────────────────────────────────────>│                    │                   │
     │                                      │  saveAnswer (immediate on nav)         │
     │                                      │───────────────────>│──────────────────>│
     │                                      │                    │                   │
     │     (every 30s) │                    │  timer sync        │                   │
     │                                      │───────────────────>│──────────────────>│
     │                                      │                    │                   │
     │     Tap "Submit"│                    │                    │                   │
     │─────────────────────────────────────>│                    │                   │
     │                                      │  Confirm dialog    │                   │
     │     Confirm      │                   │                    │                   │
     │<─────────────────────────────────────│                    │                   │
     │                                      │  submitTest        │                   │
     │                                      │───────────────────>│──────────────────>│
     │                                      │                    │ UPDATE status      │
     │                                      │                    │ = 'submitted'      │
     │                                      │                    │                   │
     │                                      │                    │ Compute result     │
     │                                      │                    │ INSERT mock_results│
     │                                      │                    │                   │
     │                                      │   { success,       │                   │
     │                                      │     resultId }     │                   │
     │                                      │<───────────────────│<──────────────────│
     │                                      │                    │                   │
     │     Navigate to   │                   │                    │                   │
     │     ResultScreen   │                  │                    │                   │
     │<─────────────────────────────────────│                    │                   │
```

### 5.3 Auto-Save Debounce Flow

```
┌────────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  TestEngine    │    │  useAutoSave │    │  Save Queue   │    │  Supabase    │
│  Screen        │    │  Hook        │    │  (AsyncStorage)│   │              │
└───────┬────────┘    └──────┬───────┘    └───────┬───────┘    └──────┬───────┘
        │                    │                    │                    │
        │ Select option A    │                    │                    │
        │───────────────────>│                    │                    │
        │                    │ Start debounce     │                    │
        │                    │ (2s timer)         │                    │
        │                    │                    │                    │
        │ Select option B    │                    │                    │
        │ (within 2s)        │                    │                    │
        │───────────────────>│                    │                    │
        │                    │ Debounce: reset    │                    │
        │                    │ timer to 2s        │                    │
        │                    │                    │                    │
        │   (2 seconds pass) │                    │                    │
        │                    │ Debounce fires     │                    │
        │                    │ Enqueue save       │                    │
        │                    │───────────────────>│                    │
        │                    │                    │ Flush every 30s    │
        │                    │                    │ or on navigation   │
        │                    │                    │───────────────────>│
        │                    │                    │                    │ POST /answers
        │                    │                    │                    │ (upsert)
        │                    │                    │<───────────────────│
        │                    │                    │                    │
        │                    │                    │ Clear from queue   │
        │                    │                    │                    │
```

### 5.4 Offline Queue Flush Flow

```
┌───────────────────┐    ┌───────────────┐    ┌──────────────┐    ┌──────────────┐
│  NetInfo Listener  │    │  Sync Manager │    │  Queue       │    │  Supabase    │
│  (EventEmitter)    │    │  (Background) │    │  (AsyncStorage│   │              │
└────────┬──────────┘    └──────┬────────┘    └──────┬───────┘    └──────┬───────┘
         │                      │                    │                    │
         │ Network restored     │                    │                    │
         │─────────────────────>│                    │                    │
         │                      │ Read pending queue │                    │
         │                      │───────────────────>│                    │
         │                      │<───────────────────│ [ { attemptId,    │
         │                      │                    │   questionId,     │
         │                      │                    │   selectedOptions,│
         │                      │                    │   timestamp } ]   │
         │                      │                    │                    │
         │                      │ For each item:     │                    │
         │                      │ POST /answers      │───────────────────>│
         │                      │<───────────────────│────────────────────│
         │                      │                    │                    │
         │                      │ If success: remove from queue            │
         │                      │───────────────────>│                    │
         │                      │                    │                    │
         │                      │ If fail: keep in   │                    │
         │                      │ queue, retry later │                    │
         │                      │                    │                    │
```

---

## 6. Cache Strategy

### 6.1 React Query Stale Times

| Data Type | `staleTime` | Reason |
|-----------|------------|--------|
| Streams | 10 min | Rarely changes |
| Subjects | 10 min | Rarely changes |
| Chapters | 10 min | Rarely changes |
| Topics | 10 min | Rarely changes |
| Batches | 5 min | Status changes occasionally |
| Mock Tests (list) | 1 min | Availability can change |
| Mock Test (detail) | 1 min | Config can be updated |
| Questions (bank) | 5 min | Slow-changing |
| Questions (attempt) | ∞ (never stale) | Frozen at publish |
| Result | 5 min | Won't change after computed |
| Leaderboard | 5 min | Ranks change slowly |
| Notifications | 30 sec | Frequent updates |
| Content | 2 min | Moderately frequent |
| Profile | ∞ (session) | Loaded at auth |
| PYQ Packages | 5 min | Rarely changes |

### 6.2 `gcTime` (Garbage Collection)

- Keep unused data for 30 minutes (default: 5 minutes).
- For frozen attempt data: keep for 24 hours after attempt ends.

### 6.3 Cache Invalidation Rules

| Mutation | Invalidates |
|----------|------------|
| Create stream | `['academic', 'streams', 'list']` |
| Update stream | `['academic', 'streams', 'list']` + `['academic', 'streams', 'detail', id]` |
| Delete stream | All stream caches |
| Create subject | `['academic', 'subjects', 'list']` |
| ... | ... (same pattern) |
| Submit attempt | `['attempts', 'detail', attemptId]` + `['results', attemptId]` |
| Mark notification read | Notification queries (no invalidation — optimistic update) |

### 6.4 Optimistic Updates

- Notification mark-as-read → immediate local update without waiting for server.
- Auto-save during test → immediate local state update.

---

## 7. Offline Architecture

### 7.1 Offline Capability per Module

| Module | Criticality | Offline Support | Strategy |
|--------|------------|----------------|----------|
| Auth | HIGH | Session restore | Cached in AsyncStorage |
| Dashboard | MEDIUM | Show cached data | React Query persistence |
| Test Engine (in-progress) | CRITICAL | Full offline support | Queue answers in AsyncStorage |
| Test Instructions | MEDIUM | Pre-fetched | Cache on tap |
| Results | MEDIUM | Cache latest | Store in AsyncStorage |
| Notifications | LOW | Show cached | Latest snapshot |
| Streams/Subjects | LOW | Cache | Rarely changes |

### 7.2 Offline Queue Architecture

```typescript
interface OfflineQueue {
  pendingSaves: QueuedSave[];    // Auto-save answers during test
  pendingSubmissions: QueuedSubmission[]; // Test submission
  pendingReadReceipts: string[]; // Mark-as-read acknowledgements
  createdAt: string;
  lastSyncedAt: string | null;
}

interface QueuedSave {
  attemptId: string;
  questionId: string;
  selectedOptionIds: string[];
  numericalAnswer: number | null;
  timeSpentSeconds: number;
  isMarkedForReview: boolean;
  queuedAt: string;
  retryCount: number;
}
```

### 7.3 Flush Strategy

- On every successful network request, check if queue has pending items.
- On app foreground, check and flush.
- Exponential backoff for retries (1s, 2s, 4s, 8s, max 30s).
- Max retries per item: 5. After that, mark as failed and notify user.

---

## 8. Error & Retry Strategy

### 8.1 Error Categories

| Category | Examples | UX Treatment |
|----------|----------|-------------|
| Validation | Invalid UUID, empty fields | Field-level error messages |
| Auth | Wrong OTP, expired session | Toast + redirect to login |
| Network | Timeout, no connection | Offline banner, silent retry |
| Server | 500 error, rate limit | Toast with retry button |
| Not Found | 404, PGRST116 | Empty state with message |
| Permission | 403, RLS policy violation | Toast "Access denied" |
| Conflict | Duplicate, FK violation | Specific error message |

### 8.2 Retry Policy

| Operation | Max Retries | Backoff | Notes |
|-----------|------------|---------|-------|
| Auto-save answer | 3 | 500ms, 1s, 2s | Non-critical |
| Submit test | 5 | 1s, 2s, 4s, 8s, 16s | Critical |
| Timer sync | 2 | 500ms, 1s | Non-critical |
| Load static data (streams, etc.) | 3 | Default React Query | Standard |
| Load attempt data | 3 | Default | Critical for resume |
| File upload | 3 | 1s, 2s, 4s | Transient errors only |
| Notification mark-as-read | 2 | 500ms, 1s | Low priority |

### 8.3 Global Error Handling

```
App.tsx
├── React Query default error handler → logs errors, shows toast
├── ErrorBoundary (future) → catches unhandled React errors
└── Toast system → transient error/success messages
```

---

## 9. Priority Order for Implementation

### Phase 1 — CRITICAL (Week 1-2)

These screens must work with real backend data before the app can be used:

| Order | Screen/Module | Effort | Dependencies | Notes |
|-------|--------------|--------|-------------|-------|
| 1.1 | Auth flow (Login, Register, OTP) | ✅ Done | — | Already integrated |
| 1.2 | Profile (name, avatar, logout) | ✅ Done | Auth | Redux already connected |
| 1.3 | **HomeScreen — backend integration** | 3 days | Streams, Content, PYQ services | Currently all mock data |
| 1.4 | **MockTestsTabScreen — assigned tests** | 2 days | `mock_test_batches` table, `studentTestService` | **BLOCKER: no junction table** |
| 1.5 | **TestInstructionsScreen** | 1 day | MockTest service | Straightforward integration |
| 1.6 | **TestEngineScreen — real backend** | 5 days | TestEngine service, mock_attempts, mock_answers | Currently all mock. Most complex screen |
| 1.7 | **TestResultScreen — real backend** | 2 days | Result service, mock_results | Currently mock data |
| 1.8 | **Notifications** | 2 days | Notification service (real) | Currently mock data |

### Phase 2 — HIGH (Week 3-4)

| Order | Screen/Module | Effort | Dependencies |
|-------|--------------|--------|-------------|
| 2.1 | Create `mock_test_batches` table | 1 day | Database migration |
| 2.2 | Resume Attempt | 2 days | TestEngine dependencies |
| 2.3 | Question Palette | 1 day | TestEngine (UI-only) |
| 2.4 | Autosave + Offline queue | 3 days | AsyncStorage, NetInfo |
| 2.5 | Image Questions (signed URLs) | 2 days | Storage service |
| 2.6 | Submit + Auto-submit on timer | 2 days | TestEngine + Edge Function |
| 2.7 | PYQ module (packages, papers) | 3 days | `pyqService` (new) |
| 2.8 | Courses screen | 2 days | Content service |

### Phase 3 — MEDIUM (Week 5-6)

| Order | Screen/Module | Effort | Dependencies |
|-------|--------------|--------|-------------|
| 3.1 | Leaderboard | 2 days | Result service |
| 3.2 | Exam analytics (per-question review) | 3 days | QuestionAnalysis API |
| 3.3 | Live classes (basic schedule view) | 3 days | `classService` (real) |
| 3.4 | Attendance view | 2 days | Attendance service |
| 3.5 | Purchases history | 2 days | Order service |
| 3.6 | Settings (profile update, password change) | 2 days | Auth service |

### Phase 4 — LOW (Week 7+)

| Order | Screen/Module | Effort | Dependencies |
|-------|--------------|--------|-------------|
| 4.1 | Doubts module | 4 days | Doubt service |
| 4.2 | Assignments | 2 days | Content service |
| 4.3 | Progress tracking (charts) | 5 days | Analytics service, chart library |
| 4.4 | Realtime notifications | 3 days | Supabase Realtime |
| 4.5 | Payments integration | 5 days | Razorpay/Stripe SDK |

---

## 10. Critical Blockers

### Blocker 1: No `mock_test_batches` junction table 🔴

**Issue:** The database schema has no table linking mock tests to batches. Without this, students cannot see which tests are assigned to them.

**Fix:** Create migration `026_mock_test_batches.sql`:

```sql
create table mock_test_batches (
  test_id    uuid not null references mock_tests(test_id) on delete cascade,
  batch_id   uuid not null references batches(batch_id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references profiles(profile_id),
  primary key (test_id, batch_id)
);

-- Index for fast lookup of tests by batch
create index idx_mock_test_batches_batch on mock_test_batches(batch_id);

-- RLS: admins and teachers can manage; students can read their batches
alter table mock_test_batches enable row level security;
```

**Impact:** Without this, the entire "Assigned Mock Tests" feature cannot work.

---

### Blocker 2: No PYQ Service 🔴

**Issue:** The PYQ module (`pyq_packages`, `pyq_papers`, `pyq_question_mappings`, `pyq_solutions`) has full database schema but zero service code. The HomeScreen currently hardcodes PYQ data.

**Fix:** Create `src/services/pyqService.ts` (CRUD for pyq_packages + pyq_papers + pyq_question_mappings + pyq_solutions).

**Impact:** HomeScreen PYQ section, ExamPackDetailScreen, and PyqPapersScreen all use mock data.

---

### Blocker 3: Test Engine uses mock data only 🔴

**Issue:** `testEngineService.ts` returns mock data. No real API calls exist.

**Fix:** Implement real Supabase queries for:
- `createAttempt()` → INSERT into `mock_attempts` + pre-populate `mock_answers`
- `saveAnswer()` → UPSERT into `mock_answers` + INSERT/DELETE `mock_answer_options`
- `submitTest()` → UPDATE `mock_attempts.status` → trigger result computation
- `syncTimer()` → UPDATE `mock_attempts.time_remaining_seconds`

**Impact:** The core feature of the app (taking mock tests) is non-functional with real data.

---

### Blocker 4: Result computation not implemented 🔴

**Issue:** When a student submits a test, there is no server-side logic to score the answers and generate a result.

**Fix:** Create a Supabase Edge Function that:
1. Receives `attemptId` as trigger (on `mock_attempts.status` change to `submitted` or `timed_out`)
2. Fetches all `mock_answers` + `mock_answer_options` for the attempt
3. Fetches `mock_test_questions.question_snapshot` for correct answers
4. Computes score, correct/wrong/skipped counts, subject breakdown, chapter breakdown
5. Inserts into `mock_results`
6. Updates `questions.times_attempted` and `questions.average_time_seconds`

**Impact:** Without this, `TestResultScreen` has no data to display.

---

### Blocker 5: Notification service uses mock data 🟡

**Issue:** `notificationService.ts` uses in-memory mock data instead of Supabase queries.

**Fix:** Implement real Supabase queries for notifications + notification_recipients tables.

**Impact:** NotificationScreen shows fake data.

---

### Blocker 6: Persist `onboardingCompleted` 🟡

**Issue:** `onboardingCompleted` flag in Redux is not persisted to AsyncStorage. The onboarding screen reappears on every app restart.

**Fix:** Add AsyncStorage persistence for the onboarding flag (or use React Native's `AsyncStorage` directly).

---

## 11. Dependencies

### 11.1 Implementation Dependency Graph

```
Auth ──────────────────────────────────────────────────────────────┐
   │                                                               │
   ▼                                                               │
HomeScreen ───► Streams ───► Subjects ───► Chapters ───► Topics    │
   │                                           │                   │
   │                                           ▼                   │
   │                                      Content                  │
   │                                         │                     │
   ▼                                         ▼                     │
MockTestTab ───► mock_test_batches ───► MockTests ────────────────┤
   │                                      │                       │
   │                                      ▼                       │
   │                               Questions ───► Options         │
   │                                      │                       │
   │                                      ▼                       │
   │                            TestInstructions                  │
   │                                      │                       │
   │                                      ▼                       │
   │                               TestEngine ◄── AutoSave        │
   │                                      │                       │
   │                                      ▼                       │
   │                            Result Computation                │
   │                                      │                       │
   │                                      ▼                       │
   │                               TestResult ◄── Rank/Leaderboard│
   │                                      │                       │
   │                                      ▼                       │
   │                            Analytics / Progress              │
   │                                                               │
   ▼                                                               │
Notifications ◄───────────────────────────────────────────────────┘
```

### 11.2 External Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Supabase JS SDK | Database + Auth + Storage | ✅ Installed |
| @tanstack/react-query v5 | Server state management | ✅ Installed |
| Redux Toolkit | Auth state | ✅ Installed |
| react-native-netinfo | Network connectivity detection | ⏳ Needs install |
| @react-native-async-storage/async-storage | Local persistence | ✅ Installed |
| react-native-reanimated | Animations | ✅ Installed |
| MSG91 | SMS OTP delivery | ✅ Configured (Edge Function) |
| Razorpay / Stripe | Payment gateway | ⏳ Future |
| Jitsi SDK | Live classes | ⏳ Future |
| react-native-fast-image | Optimized image loading | ⏳ Recommended |

---

## 12. Testing Checklist

### 12.1 Authentication

- [ ] Phone input accepts exactly 10 digits
- [ ] "Send OTP" calls `signUp` and returns success
- [ ] OTP input auto-submits on 4 digits
- [ ] OTP verification succeeds and navigates to dashboard
- [ ] Invalid OTP shows error message
- [ ] Resend OTP works
- [ ] Session restore works on app relaunch
- [ ] Logout clears session and navigates to login
- [ ] Forgot password flow works end-to-end
- [ ] Rate limiting handled gracefully

### 12.2 HomeScreen Dashboard

- [ ] Greeting shows correct user name
- [ ] Trending courses load from content service
- [ ] PYQ packages load from pyq service (after creation)
- [ ] Popular exams load from stream service
- [ ] Empty sections are hidden gracefully
- [ ] Skeleton loaders show during fetch
- [ ] Pull-to-refresh works
- [ ] Offline state shows cached data

### 12.3 Mock Tests

- [ ] Student can see assigned tests (after junction table created)
- [ ] Test card shows correct metadata (title, duration, marks)
- [ ] "Coming soon" badge for not-yet-available tests
- [ ] "Attempted" badge for completed tests
- [ ] "Attempt limit reached" state handled
- [ ] No tests → empty state shown

### 12.4 Test Engine

- [ ] Create attempt creates one mock_answer per question
- [ ] Question display loads from frozen snapshot
- [ ] Option selection works for MCQ (single select)
- [ ] Option selection works for MSQ (multi-select)
- [ ] Numerical answer input works
- [ ] Auto-save fires on option change + debounce
- [ ] Auto-save fires on navigation
- [ ] Timer counts down correctly
- [ ] Timer syncs with server periodically
- [ ] Auto-submit on timer expiry
- [ ] Manual submit confirmation dialog
- [ ] Submit succeeds with all answers preserved
- [ ] Resume attempt restores state correctly
- [ ] Question palette shows correct status colors
- [ ] Image questions display correctly
- [ ] Offline answer queue flushes on reconnect
- [ ] App crash → resume with answers preserved

### 12.5 Results

- [ ] Result loads with score, percentage, rank
- [ ] Subject breakdown renders correctly
- [ ] Per-question analysis loads
- [ ] "Not yet released" state handled
- [ ] Rank shows after computation
- [ ] Leaderboard shows top students
- [ ] Empty leaderboard handled

### 12.6 Notifications

- [ ] Notifications load with pagination
- [ ] Grouped by Today/Yesterday/Earlier
- [ ] Filter chips work (all, unread, by type)
- [ ] Mark as read updates optimistically
- [ ] Mark all as read works
- [ ] Tap navigates to correct screen
- [ ] Swipe to delete works
- [ ] Empty state shown when no notifications
- [ ] Pull-to-refresh works

### 12.7 Offline & Error Handling

- [ ] No network → onboarding/auth works from cache
- [ ] No network → dashboard shows cached data
- [ ] No network during test → answers queued locally
- [ ] Network restored → queued answers flushed
- [ ] API 401 → session refresh or redirect to login
- [ ] API 500 → retry with backoff, then show error
- [ ] Rate limited → show appropriate message

### 12.8 Performance

- [ ] FlatList virtualization works (no lag with 200+ items)
- [ ] React.memo prevents unnecessary re-renders
- [ ] Image preloading for question carousel
- [ ] Timer does not cause re-renders
- [ ] Query stale times prevent excessive refetches
- [ ] Dev screens removed from production build

---

## Appendix A: Required Database Migrations

| Migration # | Name | Purpose | Priority |
|------------|------|---------|----------|
| `026` | `mock_test_batches` | Junction table for test-batch assignment | 🔴 CRITICAL |
| `027` | `exam_packs` (optional) | Enriched exam metadata (rating, student count, price, image) | 🟡 MEDIUM |

---

## Appendix B: Required New Files

| File | Purpose | Priority |
|------|---------|----------|
| `src/services/pyqService.ts` | PYQ package + paper CRUD | 🔴 HIGH |
| `src/services/studentTestService.ts` | Student's assigned tests + attempts | 🔴 CRITICAL |
| `src/services/leaderboardService.ts` | Test leaderboard | 🟡 MEDIUM |
| `src/services/attendanceService.ts` | Attendance records | 🟡 MEDIUM |
| `src/services/doubtService.ts` | Doubt Q&A | 🟢 LOW |
| `src/services/progressService.ts` | Progress tracking | 🟢 LOW |
| `src/hooks/useAttempt.ts` | Test attempt queries + mutations | 🔴 CRITICAL |
| `src/hooks/useAutoSave.ts` | Debounced auto-save with offline queue | 🔴 HIGH |
| `src/hooks/useTestInstructions.ts` | Test instructions + validation | 🔴 HIGH |
| `src/hooks/useTestResult.ts` | Result + question analysis queries | 🔴 HIGH |
| `src/hooks/useAssignment.ts` | Assigned tests for student | 🔴 HIGH |
| `src/hooks/useLiveClasses.ts` | Live class list | 🟡 MEDIUM |
| `supabase/functions/compute-result/` | Edge Function for result computation | 🔴 CRITICAL |

---

*End of API Integration Blueprint — Last updated: July 11, 2026*
