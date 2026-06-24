# MockTestApp — Backend Integration Guide

> **Purpose:** This document provides a complete reference for frontend developers to integrate with the backend services in this React Native project. All backend logic uses **Supabase** for authentication and data storage, with **Redux Toolkit** for state management.

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Supabase Configuration](#2-supabase-configuration)
3. [Type Definitions (src/types/auth.ts)](#3-type-definitions)
4. [Auth Service API (src/services/authService.ts)](#4-auth-service-api)
5. [Class Service (src/services/classService.ts)](#5-class-service)
6. [useAuth Hook (src/hooks/useAuth.ts)](#6-useauth-hook)
7. [Redux Store (src/store/)](#7-redux-store)
8. [AuthProvider (src/providers/AuthProvider.tsx)](#8-authprovider)
9. [Navigation Structure](#9-navigation-structure)
10. [Supabase Database Schema & RLS Policies](#10-supabase-database-schema--rls-policies)
11. [Quick Integration Patterns](#11-quick-integration-patterns)
12. [Demo Mode](#12-demo-mode)

---

## 1. Tech Stack Overview

| Layer            | Technology                          | Purpose                              |
|------------------|-------------------------------------|--------------------------------------|
| Backend / BaaS   | **Supabase** (PostgreSQL + Auth)    | Auth, database, real-time            |
| State Management | **Redux Toolkit**                   | Global state (auth, user, session)   |
| Navigation       | **React Navigation** (native-stack) | Screen routing                       |
| Storage          | **AsyncStorage**                    | Session persistence for Supabase     |
| Form Validation  | Zod (available, not yet integrated) | Future input validation              |

**Key files for backend integration:**

| File | Purpose |
|------|---------|
| `src/config/supabase.ts` | Supabase client initialization |
| `src/types/auth.ts` | Shared TypeScript types for auth |
| `src/services/authService.ts` | All auth API operations |
| `src/services/classService.ts` | Data-fetching service example |
| `src/hooks/useAuth.ts` | React hook wrapping auth operations |
| `src/store/authSlice.ts` | Redux state slice for auth |
| `src/store/store.ts` | Redux store configuration |
| `src/providers/AuthProvider.tsx` | Bridges Supabase events to Redux |

---

## 2. Supabase Configuration

**File:** `src/config/supabase.ts`

```ts
import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ztxhiuxftoaxatfxviql.supabase.co';
const supabaseAnonKey = 'sb_publishable_iTehfjhGI-S-C8Ff0TRd5w_E6-quYlX';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,      // persist session to device
    persistSession: true,        // survive app restarts
    autoRefreshToken: true,      // automatic token refresh
    detectSessionInUrl: false,   // RN-specific (no URL redirects)
  },
});
```

**Integration note:** Import the `supabase` client directly from this module whenever you need to make raw Supabase queries:

```ts
import { supabase } from '../config/supabase';
```

> ⚠️ **Never share or commit the anon key publicly.** It is safe for client-side use (it's the public anon key with RLS protection), but treat it as an app credential.

---

## 3. Type Definitions

**File:** `src/types/auth.ts`

All auth-related types are centralized here. The most important ones:

### `AuthResponse<T>` — Standard response wrapper

Every service function returns this shape. **Never handle raw Supabase errors in your UI — always use this type.**

```ts
interface AuthResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;  // Non-fatal side-effect failures
}
```

### `UserRole` — RBAC-ready role enum

```ts
type UserRole = 'student' | 'teacher' | 'admin';
```

### `DbProfile` — Raw database row shape

```ts
interface DbProfile {
  id: string;          // matches auth.users.id
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}
```

### `UserProfile` — Public-facing user object (consumed by UI)

```ts
interface UserProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  role: UserRole;
  createdAt: string;
}
```

### `SessionData` — Full session info

```ts
interface SessionData {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
}
```

### Input DTOs

```ts
interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
}

interface SignInInput {
  email: string;
  password: string;
}
```

### `ValidationResult`

```ts
interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

---

## 4. Auth Service API

**File:** `src/services/authService.ts`

All public functions return `AuthResponse<T>`. **Import from this module to perform auth operations directly.**

### `signUp(input: SignUpInput): Promise<AuthResponse<UserProfile>>`

Registers a new user.

```ts
import { signUp } from '../services/authService';

const result = await signUp({
  email: 'alice@example.com',
  password: 'securePassword123',
  fullName: 'Alice Wonderland',
});

if (result.success) {
  // User created. data.emailVerified indicates if confirmation needed.
  console.log(result.data.fullName);
}
```

**Behavior:**
1. Validates input (email required, password ≥ 6 chars, name required)
2. Creates auth user via `supabase.auth.signUp()`
3. Attempts to create a `profiles` row (best-effort — may fail due to RLS)
4. If profile creation fails, returns `success: true` **with a `warning`** — the auth account is still created
5. Profile fallback: database trigger `on_auth_user_created` auto-creates the profile

### `signIn(input: SignInInput): Promise<AuthResponse<UserProfile>>`

Authenticates an existing user.

```ts
const result = await signIn({
  email: 'alice@example.com',
  password: 'securePassword123',
});

if (result.success) {
  // User is authenticated. Navigate to main app.
}
```

**Behavior:**
1. Validates input
2. Calls `supabase.auth.signInWithPassword()`
3. Fetches profile from `profiles` table (authoritative role source)
4. Returns merged `UserProfile` (auth + profile data)

### `signOut(): Promise<AuthResponse<null>>`

Clears the session.

```ts
const result = await signOut();
```

### `getCurrentUser(): Promise<AuthResponse<UserProfile>>`

Fetches user from server (network request — verifies JWT is valid).

```ts
const result = await getCurrentUser();
```

> Use for **security-critical** checks (e.g. app launch, accessing protected resources).

### `getSession(): Promise<AuthResponse<SessionData>>`

Reads session from local cache (fast, no network call).

```ts
const result = await getSession();
if (result.success && result.data?.isAuthenticated) {
  console.log(result.data.user.fullName);
}
```

> Use for **UI decisions** (e.g. "show loading spinner while we refresh"). Does NOT verify JWT validity.

### `refreshSession(): Promise<AuthResponse<SessionData>>`

Force-refreshes tokens after a 401 response.

```ts
const result = await refreshSession();
// On success: retry the failed request
// On failure: redirect to login
```

### Validation helpers (also exported)

```ts
import { validateSignUpInput, validateSignInInput } from '../services/authService';

validateSignUpInput({ email: '', password: '12', fullName: '' });
// => { valid: false, error: 'Email is required.' }

validateSignInInput({ email: 'a@b.com', password: '' });
// => { valid: false, error: 'Password is required.' }
```

---

## 5. Class Service

**File:** `src/services/classService.ts`

An example data-fetching service showing how to query Supabase tables:

```ts
import { supabase } from '../config/supabase';

export const getClasses = async () => {
  const { data, error } = await supabase
    .from('classes')
    .select('*');

  console.log('DATA:', data);
  console.log('ERROR:', error);

  return data || [];
};
```

**Pattern for new services:** Create new files in `src/services/` following this pattern:

```ts
import { supabase } from '../config/supabase';

export const getExams = async () => {
  const { data, error } = await supabase
    .from('exams')
    .select('*, questions(*)');  // eager-load relationships

  if (error) throw error;
  return data;
};
```

---

## 6. useAuth Hook

**File:** `src/hooks/useAuth.ts`

The **recommended way** for screens to interact with auth. It bridges `authService` calls to the Redux store and manages loading/error state.

### Usage

```tsx
import { useAuth } from '../../hooks/useAuth';

function LoginForm() {
  const { login, register, logout, refreshSession, user, loading, error, isAuthenticated } = useAuth();

  // Sign in
  const handleLogin = async () => {
    const result = await login('alice@example.com', 'password123');
    if (!result.success) {
      // Show result.error to user
    }
  };

  // Register
  const handleRegister = async () => {
    const result = await register('alice@example.com', 'password123', 'Alice');
    if (result.success) {
      // Account created — navigate to login or proceed
      if ('warning' in result && result.warning) {
        // Profile creation had a non-fatal issue
        console.warn(result.warning);
      }
    }
  };

  // Logout
  const handleLogout = async () => {
    await logout();  // Clears Redux state immediately
  };

  // Refresh session (e.g. after 401)
  const handleRefresh = async () => {
    const result = await refreshSession();
    if (!result.success) {
      // Force user to re-login
    }
  };
}
```

### Return value

| Property | Type | Description |
|----------|------|-------------|
| `user` | `UserProfile \| null` | Current user from Redux |
| `loading` | `boolean` | True during any auth operation |
| `error` | `string \| null` | Last auth error |
| `isAuthenticated` | `boolean` | Derived from Redux state |
| `login` | `(email, password) => Promise<AuthHookResult>` | Sign in |
| `register` | `(email, password, fullName) => Promise<AuthHookResult>` | Sign up |
| `logout` | `() => Promise<void>` | Sign out |
| `refreshSession` | `() => Promise<AuthHookResult>` | Refresh tokens |

### `AuthHookResult`

```ts
type AuthHookResult =
  | { success: true; warning?: string }
  | { success: false; error: string };
```

> **Note:** Navigation after login/register is **automatic** — the `AuthNavigator` component reacts to Redux state changes and switches between auth and app stacks.

---

## 7. Redux Store

### Store Configuration

**File:** `src/store/store.ts`

```ts
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  devTools: __DEV__,
});
```

### Auth Slice State Shape

**File:** `src/store/authSlice.ts`

```ts
interface AuthState {
  user: UserProfile | null;
  session: SessionData | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;  // true after first session check
  error: string | null;
}
```

### Redux Actions (dispatch these to update state)

```ts
import { useAppDispatch } from '../../store/hooks';
import {
  setUser,           // set user profile
  setSession,        // set session + user + isAuthenticated (preferred)
  setLoading,        // toggle loading flag
  setInitialized,    // mark initial check as done
  setError,          // set error message
  clearError,        // clear error
  logout,            // reset auth state (keeps initialized=true)
} from '../../store/authSlice';
```

### Selectors (read state)

```ts
import { useAppSelector } from '../../store/hooks';
import {
  selectUser,
  selectSession,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsInitialized,
  selectAuthError,
  selectUserRole,
  selectIsAdmin,
  selectIsTeacher,
  selectIsStaff,
  selectEmailVerified,
} from '../../store/authSlice';

// Example: gate content by role
const isStaff = useAppSelector(selectIsStaff);
if (isStaff) { /* show staff-only features */ }

// Example: show splash while initializing
const initialized = useAppSelector(selectIsInitialized);
if (!initialized) return <SplashScreen />;
```

### Typed Hooks

**File:** `src/store/hooks.ts`

Always use these instead of raw `useDispatch` / `useSelector`:

```ts
import { useAppDispatch, useAppSelector } from '../../store/hooks';
// Fully typed — no manual type annotations needed
```

---

## 8. AuthProvider

**File:** `src/providers/AuthProvider.tsx`

Bridges Supabase auth lifecycle events to Redux. Wraps the app in `App.tsx`:

```tsx
// App.tsx
export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AuthNavigator />
      </AuthProvider>
    </Provider>
  );
}
```

**What it does:**
1. **On mount:** Calls `getSession()` to check for existing session → hydrates Redux
2. **Listens for:** `SIGNED_IN`, `TOKEN_REFRESHED`, `USER_UPDATED`, `SIGNED_OUT` → syncs Redux accordingly
3. **On unmount:** Cleans up the subscription

> **You don't need to modify this file.** Just wrap your app with it as shown above.

---

## 9. Navigation Structure

### `AuthNavigator` (src/navigation/AuthNavigator.tsx)

The **root navigator**. Conditionally renders auth stack or app stack based on Redux state.

```
                    ┌──────────────────┐
                    │   SplashScreen   │  ← while initialized === false
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   initialized?   │
                    └──┬──────────┬────┘
                   No  │          │ Yes
              ┌────────▼──┐  ┌────▼──────────┐
              │ Auth Stack │  │   App Stack   │
              │  ────────  │  │   ────────    │
              │  Login     │  │   Home        │
              │  Register  │  └───────────────┘
              │  ForgotPwd │
              └────────────┘
```

### Auth Stack Routes

| Route | Screen | Purpose |
|-------|--------|---------|
| `Login` | `LoginScreen` | Sign in + demo mode |
| `Register` | `RegisterScreen` | Sign up |
| `ForgotPassword` | `ForgotPasswordScreen` | Placeholder (TODO) |

### App Stack Routes

| Route | Screen | Purpose |
|-------|--------|---------|
| `Home` | `HomeScreen` | Main screen after auth |
| `TestDashboard` | `TestDashboardScreen` | Backend testing utilities |

**To add a new screen:**
1. Create the screen file in `src/screens/`
2. Add it to the appropriate navigator
3. Add a route type to the param list type

---

## 10. Supabase Database Schema & RLS Policies

**Migration file:** `supabase/migrations/001_profiles_policies.sql`

### Profiles Table Schema

```sql
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text not null,
  full_name  text not null default '',
  role       text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now()
);
```

### RLS Policies

| Operation | Policy | Description |
|-----------|--------|-------------|
| **INSERT** | Users can insert their own profile | `(auth.uid()) = id` |
| **SELECT** | Users can view their own profile | `(auth.uid()) = id` |
| **UPDATE** | Users can update their own profile | `(auth.uid()) = id` |
| **DELETE** | Users can delete their own profile | `(auth.uid()) = id` |

### Database Trigger — Auto-Create Profile on Signup

The function `handle_new_user()` runs automatically when a new row is inserted into `auth.users`. It creates a corresponding `profiles` row:

```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'student'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

> ✅ This is the **production-recommended** approach. Even if the client-side profile creation fails, the database trigger guarantees a profile row exists.

---

## 11. Quick Integration Patterns

### Pattern A: Sign In a User

```tsx
import { useAuth } from '../../hooks/useAuth';

function MyLoginScreen() {
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    const result = await login(email, password);
    if (!result.success) {
      // Show error to user
    }
    // On success: navigation handled automatically
  };
}
```

### Pattern B: Protect a Screen by Role

```tsx
import { useAppSelector } from '../../store/hooks';
import { selectUserRole, selectIsStaff } from '../../store/authSlice';

function TeacherDashboard() {
  const role = useAppSelector(selectUserRole);
  const isStaff = useAppSelector(selectIsStaff);

  if (!isStaff) {
    return <Text>Access denied. Teachers and admins only.</Text>;
  }

  return <TeacherContent />;
}
```

### Pattern C: Fetch Data from a Supabase Table

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';

function ClassesList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*');

      if (!error) setClasses(data);
      setLoading(false);
    };
    fetchClasses();
  }, []);

  if (loading) return <Text>Loading...</Text>;
  return classes.map(c => <Text key={c.id}>{c.name}</Text>);
}
```

### Pattern D: Check Auth State on Any Screen

```tsx
import { useAppSelector } from '../../store/hooks';
import { selectUser, selectIsAuthenticated, selectAuthError } from '../../store/authSlice';

function MyScreen() {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const error = useAppSelector(selectAuthError);

  // useAuth() hook is an alternative that bundles all of the above
}
```

### Pattern E: Handle 401 / Expired Session

```tsx
import { useAuth } from '../../hooks/useAuth';

function ApiCaller() {
  const { refreshSession } = useAuth();

  const callApi = async () => {
    const response = await fetch('/some-protected-endpoint');

    if (response.status === 401) {
      const refreshResult = await refreshSession();
      if (!refreshResult.success) {
        // Session expired — redirect to login
        return;
      }
      // Retry the original request
    }
  };
}
```

---

## 12. Demo Mode

The `LoginScreen` includes a **Demo Mode** button that bypasses real authentication. It dispatches a mock admin session to Redux:

```ts
const DEMO_USER: UserProfile = {
  id: 'demo-user-000001',
  email: 'demo@mocktestapp.com',
  emailVerified: true,
  fullName: 'Demo Tester',
  role: 'admin',
  createdAt: new Date().toISOString(),
};
```

Use this for testing without needing real Supabase credentials or network access.

---

## Project Architecture Summary

```
App.tsx
 ├── <Provider store={store}>          ← Redux
 │    └── <AuthProvider>               ← Bridges Supabase events → Redux
 │         └── <AuthNavigator>         ← Root Navigator
 │              ├── <SplashScreen>     ← While booting
 │              ├── <AuthStack>        ← Not authenticated
 │              │    ├── LoginScreen   ← Sign in + Demo Mode
 │              │    ├── RegisterScreen
 │              │    └── ForgotPasswordScreen
 │              └── <AppStack>         ← Authenticated
 │                   ├── HomeScreen
 │                   └── TestDashboardScreen
 │
 └── Services Layer
      ├── src/services/authService.ts   ← Auth operations
      ├── src/services/classService.ts  ← Data example
      ├── src/config/supabase.ts       ← Supabase client
      └── src/types/auth.ts            ← Shared types
```

---

## Quick Start for Frontend Integration

1. **Import the supabase client** from `src/config/supabase` to query any table
2. **Use `useAuth()` hook** in screens for auth operations (login, register, logout)
3. **Read Redux state** with `useAppSelector` using the exported selectors from `authSlice`
4. **Create new services** in `src/services/` following the `classService.ts` pattern
5. **All auth responses** use the `AuthResponse<T>` wrapper — check `result.success` first
6. **Navigation** is handled automatically — just dispatch the right action
7. **For new screens:** create them in `src/screens/` and register in the appropriate navigator
8. **Add new Redux state:** create a new slice in `src/store/` and add it to `store.ts`

---

*Last updated: June 24, 2026*
