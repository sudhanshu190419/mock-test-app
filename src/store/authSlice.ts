/**
 * Auth Slice
 *
 * Redux Toolkit slice managing authentication state.
 *
 * ## Responsibilities
 *
 * - Hold the current `UserProfile`, `SessionData`, and derived booleans
 * - Expose synchronous actions for the auth service layer to dispatch
 * - Provide memoized selectors for consumers
 *
 * ## Boundaries
 *
 * This slice is intentionally **pure state management**:
 * - ❌ No API calls (those belong in the service layer / async thunks)
 * - ❌ No business logic (e.g. role-checking logic lives in selectors or
 *      middleware)
 * - ❌ No side effects
 * - ❌ No UI code
 *
 * @module authSlice
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SessionData, UserProfile, UserRole } from '../types/auth';

// ─── State ──────────────────────────────────────────────────────────────────

/**
 * Root authentication state shape.
 *
 * Every field is explicitly serializable (strings, booleans, null).
 * No functions, no `undefined` — Redux DevTools and persistence
 * middleware will work without warnings.
 */
/**
 * Convenience type for the root state slice key.
 *
 * Consumers configure their store with `auth: authReducer`, then use
 * `useAppSelector` with selectors that reference this type:
 *
 * ```ts
 * const store = configureStore({ reducer: { auth: authReducer } });
 * type RootState = ReturnType<typeof store.getState>;
 * //             ^? { auth: AuthState }
 * ```
 *
 * If you mount the reducer under a different key, redefine this type.
 */
export type AuthRootState = { auth: AuthState };

export interface AuthState {
  /** The authenticated user profile, or `null` when signed out. */
  user: UserProfile | null;

  /** The current Supabase session data, or `null` when signed out. */
  session: SessionData | null;

  /**
   * Derived flag indicating whether a user is currently authenticated.
   * Mirrors `session.isAuthenticated` but kept in state so that
   * reducers can assert it directly without a selector indirection.
   */
  isAuthenticated: boolean;

  /**
   * True while an auth operation (sign-in, sign-up, session refresh)
   * is in flight.  Screens use this to show spinner / skeleton states.
   */
  loading: boolean;

  /**
   * True after the very first session check completes on app launch.
   * Screens use this to decide whether to show a splash/loading screen
   * or render the navigation tree.
   */
  initialized: boolean;

  /**
   * Human-readable error message from the last failed auth operation.
   * Reset to `null` by `clearError()` or on the next successful operation.
   */
  error: string | null;

  /**
   * True when the user has completed the onboarding flow.
   * Used to gate the onboarding screens on first app launch.
   */
  onboardingCompleted: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  loading: false,
  initialized: false,
  error: null,
  onboardingCompleted: false,
};

// ─── Slice ──────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ── User ──────────────────────────────────────────────────────────────

    /**
     * Replace the current user profile.
     *
     * Use this after fetching the user from the server (via `getUser()`)
     * or signing in / signing up.
     */
    setUser(state, action: PayloadAction<UserProfile | null>) {
      state.user = action.payload;
    },

    // ── Session ───────────────────────────────────────────────────────────

    /**
     * Replace the current session data.
     *
     * Automatically syncs `user` and `isAuthenticated` from the session
     * payload so that the three fields are never out of sync. Consumers
     * do not need to dispatch `setUser` separately after `setSession`.
     */
    setSession(state, action: PayloadAction<SessionData | null>) {
      state.session = action.payload;
      state.user = action.payload?.user ?? null;
      state.isAuthenticated = action.payload?.isAuthenticated ?? false;
    },

    // ── Flags ─────────────────────────────────────────────────────────────

    /**
     * Explicitly set the authentication flag.
     *
     * This exists as an escape hatch when you need to toggle the flag
     * independently of `setSession` (e.g. optimistically clearing auth
     * on a 401 response). Prefer `setSession` for normal flows.
     */
    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },

    /** Set or clear the loading flag. */
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },

    /** Mark that the initial auth check has completed. */
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },

    // ── Error ─────────────────────────────────────────────────────────────

    /**
     * Persist an auth error message in state.
     *
     * Consumers (screens, toasts) should subscribe to this field
     * rather than handling errors inline.
     */
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    /** Convenience action to clear the current error without a payload. */
    clearError(state) {
      state.error = null;
    },

    /**
     * Mark that the user has completed the onboarding flow.
     *
     * Once set to `true`, the onboarding screens will no longer be
     * shown on subsequent app launches.
     */
    setOnboardingCompleted(state, action: PayloadAction<boolean>) {
      state.onboardingCompleted = action.payload;
    },

    // ── Logout ────────────────────────────────────────────────────────────

    /**
     * Reset auth state back to defaults.
     *
     * Intentionally preserves `initialized = true` so the navigation
     * tree can react immediately without re-entering a splash screen.
     */
    logout(state) {
      state.user = null;
      state.session = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      // `initialized` is NOT reset — the app has already booted.
    },
  },
});

// ─── Named export ───────────────────────────────────────────────────────────

export const {
  setUser,
  setSession,
  setAuthenticated,
  setLoading,
  setInitialized,
  setError,
  clearError,
  setOnboardingCompleted,
  logout,
} = authSlice.actions;

// ─── Reducer ────────────────────────────────────────────────────────────────

export default authSlice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

/**
 * Return the current user profile, or `null`.
 */
export const selectUser = (state: AuthRootState): UserProfile | null =>
  state.auth.user;

/**
 * Return the current session data, or `null`.
 */
export const selectSession = (state: AuthRootState): SessionData | null =>
  state.auth.session;

/**
 * Return `true` when the user is authenticated.
 *
 * Prefer this over checking `state.auth.user !== null` — it is the
 * single source of truth for the auth gate.
 */
export const selectIsAuthenticated = (state: AuthRootState): boolean =>
  state.auth.isAuthenticated;

/**
 * Return `true` while an auth operation is in flight.
 */
export const selectIsLoading = (state: AuthRootState): boolean =>
  state.auth.loading;

/**
 * Return `true` after the very first session check completes.
 *
 * Usage in a root component:
 * ```ts
 * const initialized = useAppSelector(selectIsInitialized);
 * if (!initialized) return <SplashScreen />;
 * return <AppNavigator />;
 * ```
 */
export const selectIsInitialized = (state: AuthRootState): boolean =>
  state.auth.initialized;

/**
 * Return the current auth error message, or `null`.
 */
export const selectAuthError = (state: AuthRootState): string | null =>
  state.auth.error;

/**
 * Return the user's role, or `null` when not authenticated.
 *
 * RBAC-ready: consumers can switch on this value.
 * ```ts
 * const role = useAppSelector(selectUserRole);
 * if (role === 'admin') { ... }
 * ```
 */
export const selectUserRole = (state: AuthRootState): UserRole | null =>
  state.auth.user?.role ?? null;

/**
 * Return `true` when the user has an admin role.
 */
export const selectIsAdmin = (state: AuthRootState): boolean =>
  state.auth.user?.role === 'admin';

/**
 * Return `true` when the user has a teacher role.
 */
export const selectIsTeacher = (state: AuthRootState): boolean =>
  state.auth.user?.role === 'teacher';

/**
 * Return `true` when the user has at least a teacher-level role
 * (teacher or admin). Useful for features that should be available
 * to both teachers and admins but not students.
 */
export const selectIsStaff = (state: AuthRootState): boolean =>
  state.auth.user?.role === 'teacher' || state.auth.user?.role === 'admin';

/**
 * Return the user's email verification status.
 *
 * Consumers can use this to gate features that require a confirmed
 * email (e.g. creating classes, posting content).
 */
export const selectEmailVerified = (state: AuthRootState): boolean =>
  state.auth.user?.emailVerified ?? false;

/**
 * Return `true` when the user has completed the onboarding flow.
 *
 * Screens use this to decide whether to show onboarding or skip
 * directly to the auth flow.
 */
export const selectOnboardingCompleted = (state: AuthRootState): boolean =>
  state.auth.onboardingCompleted;
