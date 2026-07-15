/**
 * Student Dashboard Summary Hook
 *
 * React Query hook wrapping the `getStudentDashboardSummary()` service call.
 *
 * The RPC internally resolves the student_id from the authenticated session
 * via `get_my_student_id()`, so this hook takes no parameters.
 *
 * Provides cached dashboard data with automatic background refetching.
 *
 * @module hooks/dashboard/useStudentDashboardSummary
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardKeys } from './queryKeys';
import { getStudentDashboardSummary } from '../../services/dashboard/dashboardService';
import type { StudentDashboardSummary } from '../../types/dashboard';

/**
 * Fetch the student dashboard summary via the `get_student_dashboard_summary()`
 * PostgreSQL RPC.
 *
 * The RPC resolves the student_id from the authenticated session — no
 * parameters are required.  All analytics are computed server-side.
 *
 * The query runs automatically when the React Query client is mounted.
 *
 * @example
 * const { data, isLoading, error } = useStudentDashboardSummary();
 *
 * if (isLoading) return <LoadingSkeleton />;
 * if (error) return <ErrorState />;
 * if (data) {
 *   console.log(data.testsAttempted); // 42
 *   console.log(data.overallAccuracy); // 82.5
 * }
 */
export function useStudentDashboardSummary(enabled: boolean = true) {
  return useQuery<StudentDashboardSummary>({
    queryKey: dashboardKeys.summary.dashboard(),
    queryFn: async () => {
      const result = await getStudentDashboardSummary();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch student dashboard summary.');
      }
      return result.data!;
    },
    enabled,
    staleTime: 30_000, // 30 seconds — dashboard data is near-real-time
    retry: 1,
  });
}
