/**
 * useMyResults
 *
 * React Query hook to fetch all released results for the currently
 * authenticated student. Supports pull-to-refresh via `refetch()`.
 *
 * @module hooks/mockTest/useMyResults
 */

import { useQuery } from '@tanstack/react-query';
import { getStudentReleasedResults } from '../../services/resultService';
import type { StudentResultItem } from '../../services/resultService';

// ─── Query Keys ────────────────────────────────────────────────────────────

const myResultsKeys = {
  all: ['my-results'] as const,
};

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Fetch all released results for the current student.
 *
 * Returns a sorted list (newest first) of released results with
 * test title, score, percentage, and timestamps.
 *
 * Supports pull-to-refresh via the `refetch()` function.
 *
 * @example
 * const { data, isLoading, refetch, isRefetching } = useMyResults();
 * if (data) {
 *   data.forEach(r => console.log(r.testTitle, r.score, r.percentage));
 * }
 */
export function useMyResults() {
  return useQuery<StudentResultItem[]>({
    queryKey: myResultsKeys.all,
    queryFn: async () => {
      return getStudentReleasedResults();
    },
    staleTime: 30 * 1000, // 30 seconds — results may be released while app is open
    retry: 1,
  });
}
