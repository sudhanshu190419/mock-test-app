/**
 * AuthProvider
 *
 * Bridges Supabase Auth lifecycle events to the Redux store.
 *
 * ## Responsibilities
 *
 * ### 1. Initial session hydration (on mount)
 *
 * Calls `getSession()` to check for an existing, cached session.  If one
 * exists, hydrates Redux with the full `SessionData` (including the user
 * profile fetched from the `profiles` table) so the app immediately knows
 * who the user is without waiting for the first listener callback.
 *
 * ### 2. Real-time auth event listener
 *
 * Subscribes to `supabase.auth.onAuthStateChange` and reacts to every
 * event by syncing Redux:
 *
 * | Event             | Action                                      |
 * |-------------------|---------------------------------------------|
 * | `SIGNED_IN`       | Re-fetches session + profile from DB        |
 * | `TOKEN_REFRESHED` | Re-fetches session + profile from DB        |
 * | `USER_UPDATED`    | Re-fetches session + profile from DB        |
 * | `SIGNED_OUT`      | Dispatches `logout()` (resets auth state)   |
 *
 * ### 3. Automatic lifecycle management
 *
 * The subscription is cleaned up on unmount to prevent memory leaks and
 * stale dispatches.
 *
 * ## Architecture
 *
 * This component does **not** create any React Context.  The Redux store
 * is the single source of truth for authentication state — all screens
 * and hooks read from it via `useAppSelector`.  The provider merely
 * bridges external events into the store.
 *
 * ## Usage
 *
 * Wrap your root component:
 *
 * ```tsx
 * import { Provider } from 'react-redux';
 * import { store } from './src/store/store';
 * import { AuthProvider } from './src/providers/AuthProvider';
 * import AppNavigator from './src/navigation/AppNavigator';
 *
 * export default function App() {
 *   return (
 *     <Provider store={store}>
 *       <AuthProvider>
 *         <AppNavigator />
 *       </AuthProvider>
 *     </Provider>
 *   );
 * }
 * ```
 *
 * Once mounted, the `initialized` flag in Redux will flip to `true` after
 * the first session check completes.  Use the `selectIsInitialized`
 * selector to gate your navigation tree:
 *
 * ```tsx
 * const initialized = useAppSelector(selectIsInitialized);
 * if (!initialized) return <SplashScreen />;
 * return <AppNavigator />;
 * ```
 *
 * @module AuthProvider
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { useAppDispatch } from '../store/hooks';
import {
  setSession,
  setLoading,
  setInitialized,
  logout,
} from '../store/authSlice';
import { getSession, consumeSuppressSessionSync } from '../services/authService';
import type { AuthChangeEvent } from '@supabase/supabase-js';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Auth events that indicate the user is still authenticated and the
 * session / tokens / profile may have changed.
 */
const AUTHENTICATED_EVENTS: readonly AuthChangeEvent[] = [
  'SIGNED_IN',
  'TOKEN_REFRESHED',
  'USER_UPDATED',
];

// ─── Provider ───────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch();

  // Guards the initial session check against racing with the very first
  // onAuthStateChange callback (which can fire synchronously during
  // subscription setup).
  const isInitialisedRef = useRef(false);

  useEffect(() => {
    // ── 1. Subscribe to auth state changes ───────────────────────────────
    //
    // This MUST be set up first so that any event that fires during the
    // initial getSession() call (e.g. TOKEN_REFRESHED) is captured rather
    // than lost.  The isInitialisedRef guard prevents the listener from
    // duplicating the work of the initial check.

    const handleAuthEvent = (event: AuthChangeEvent): void => {
      // Skip the very first authenticated event — the initial session
      // check below will populate the store with the authoritative
      // SessionData (including the DB-fetched profile).
      if (!isInitialisedRef.current && AUTHENTICATED_EVENTS.includes(event)) {
        return;
      }

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED': {
          // Check if the forgot-password flow is in progress — skip the
          // automatic session sync so the user stays on the OTP screen
          // to set a new password.
          if (consumeSuppressSessionSync()) {
            break;
          }

          // Kick off an async re-fetch of the session + profile.
          getSession()
            .then((result) => {
              if (result.success && result.data) {
                dispatch(setSession(result.data));
              }
            })
            // Swallow errors — the next successful event will re-sync.
            .catch(() => {});
          break;
        }

        case 'SIGNED_OUT': {
          dispatch(logout());
          break;
        }

        default:
          // No-op for unrecognised events (INITIAL_SESSION, MFA, etc.)
          break;
      }
    };

    const { data: authListener } =
      supabase.auth.onAuthStateChange(handleAuthEvent);

    // ── 2. Check for an existing session (app startup) ────────────────────
    //
    // Runs concurrently with the listener above.  The isInitialisedRef
    // guard prevents the listener from duplicating this work.

    dispatch(setLoading(true));

    getSession()
      .then((result) => {
        isInitialisedRef.current = true;

        if (result.success && result.data) {
          dispatch(setSession(result.data));
        }
      })
      .catch(() => {
        // A network error during startup should not prevent the app
        // from rendering — treat it as "no session".
        isInitialisedRef.current = true;
      })
      .finally(() => {
        dispatch(setInitialized(true));
        dispatch(setLoading(false));
      });

    // ── 3. Cleanup ───────────────────────────────────────────────────────
    return () => {
      authListener.subscription.unsubscribe();
    };
    // `dispatch` is stable for the lifetime of the store and is safe to
    // exclude from the dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
