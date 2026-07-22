/**
 * DashboardProvider
 *
 * React Context provider that resolves the student's dashboard state
 * (profile + current batch) once and shares it via context.
 *
 * ## Why a context instead of Redux?
 *
 * The dashboard is a **read-only, single-source-of-truth** aggregate.
 * It is resolved once when the user is authenticated and does not need
 * fine-grained Redux DevTools tracking or action-based updates (unlike
 * auth state, which changes frequently via lifecycle events).
 *
 * A plain React Context is simpler, has zero boilerplate, and is
 * perfectly suited for this read-once, share-everywhere pattern.
 *
 * ## Usage
 *
 * ```tsx
 * import { DashboardProvider } from './src/providers/DashboardProvider';
 * import { useDashboard } from './src/hooks/useDashboard';
 *
 * // Wrap your root component:
 * <DashboardProvider>
 *   <AppNavigator />
 * </DashboardProvider>
 *
 * // Consume in any screen:
 * function HomeScreen() {
 *   const { batches, isLoading } = useDashboard();
 *   if (isLoading) return <Skeleton />;
 *   if (batches.length > 0) return <BatchDashboard batches={batches} />;
 *   return <CatalogDashboard />;
 * }
 * ```
 *
 * ## Future Expansion
 *
 * As more sections are added (courses, live classes, etc.), the context
 * value can be extended with additional resolved data without changing
 * the provider architecture.
 *
 * @module providers/DashboardProvider
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser, selectIsAuthenticated } from '../store/authSlice';
import { getStudentDashboard } from '../services/student/studentDashboardService';
import type { DashboardState, StudentDashboardData, AssignedCourse, StudentBatch } from '../types/studentDashboard';

// ═════════════════════════════════════════════════════════════════════════════
//  Context
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Shape of the DashboardContext value.
 *
 * Exposes the resolved dashboard state plus convenient derived properties
 * and a `refetch` function for manual refresh.
 */
export interface DashboardContextValue extends DashboardState {
  /** Convenience accessor for assigned courses (empty array when none). */
  assignedCourses: AssignedCourse[];
  /** All active batches the student is enrolled in (empty when none). */
  batches: StudentBatch[];
  /** Manually re-fetch the dashboard data. */
  refetch: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ═════════════════════════════════════════════════════════════════════════════
//  Provider
// ═════════════════════════════════════════════════════════════════════════════

interface DashboardProviderProps {
  children: ReactNode;
}

/**
 * Provider component that resolves the student's dashboard once.
 *
 * Resolves the dashboard whenever:
 * 1. The user becomes authenticated (logged in)
 * 2. The user changes (different profile)
 * 3. `refetch()` is called manually
 *
 * Does NOT re-resolve on every navigation — the context value is stable
 * until the user changes or explicitly refreshes.
 */
export function DashboardProvider({ children }: DashboardProviderProps) {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [state, setState] = useState<DashboardState>({
    data: null,
    isLoading: false,
    error: null,
    initialized: false,
  });

  // Track the last user ID we resolved for, so we only re-resolve when
  // the user actually changes (not on every render).
  const lastUserIdRef = useRef<string | null>(null);

  const resolveDashboard = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setState({
        data: null,
        isLoading: false,
        error: null,
        initialized: true,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Pass the already-resolved Redux user profile to avoid a redundant
      // DB round-trip for profile data. The service uses the profile for
      // identity — the authoritative student_details resolution still happens.
      const result = await getStudentDashboard(user);

      if (result.success && result.data) {
        setState({
          data: result.data,
          isLoading: false,
          error: null,
          initialized: true,
        });
      } else {
        setState({
          data: null,
          isLoading: false,
          error: result.error ?? 'Failed to load dashboard.',
          initialized: true,
        });
      }
    } catch (err) {
      setState({
        data: null,
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while loading the dashboard.',
        initialized: true,
      });
    }
  }, [isAuthenticated, user?.id]);

  // Resolve on mount and whenever the authenticated user changes
  useEffect(() => {
    const currentUserId = user?.id ?? null;

    // Only re-resolve when the user actually changes identity
    if (lastUserIdRef.current !== currentUserId) {
      lastUserIdRef.current = currentUserId;
      resolveDashboard();
    }
  }, [user?.id, isAuthenticated, resolveDashboard]);

  return (
    <DashboardContext.Provider
      value={{
        data: state.data,
        assignedCourses: state.data?.assignedCourses ?? [],
        batches: state.data?.batches ?? [],
        isLoading: state.isLoading,
        error: state.error,
        initialized: state.initialized,
        refetch: resolveDashboard,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Exports
// ═════════════════════════════════════════════════════════════════════════════

export { DashboardContext };
