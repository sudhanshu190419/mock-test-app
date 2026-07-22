/**
 * useDashboard
 *
 * Convenience hook that consumes the `DashboardContext` and returns the
 * resolved dashboard state (profile + current batch).
 *
 * ## Usage
 *
 * ```tsx
 * import { useDashboard } from '../../hooks/useDashboard';
 *
 * function MyComponent() {
 *   const { currentBatch, isLoading, error, refetch } = useDashboard();
 *
 *   if (isLoading) return <ActivityIndicator />;
 *   if (error) return <ErrorBanner message={error} />;
 *   if (!currentBatch) return <NoBatchMessage />;
 *
 *   return <BatchInfo batch={currentBatch} />;
 * }
 * ```
 *
 * ## Why not a Redux selector?
 *
 * The dashboard state is read-only, resolved once, and consumed by many
 * components. A React Context is simpler and has zero boilerplate compared
 * to a Redux slice for this use case.
 *
 * @module hooks/useDashboard
 */

import { useContext } from 'react';
import { DashboardContext } from '../providers/DashboardProvider';
import type { DashboardContextValue } from '../providers/DashboardProvider';

/**
 * Returns the current dashboard context value.
 *
 * @throws If used outside of a `DashboardProvider`.
 */
export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);

  if (context === null) {
    throw new Error(
      'useDashboard() must be used within a <DashboardProvider>. ' +
        'Wrap your component tree with <DashboardProvider> at the root.',
    );
  }

  return context;
}
