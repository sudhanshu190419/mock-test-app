/**
 * Practice Hooks
 *
 * Reusable React Query hooks for the PYQ Practice module.
 * BOTH the Home Screen and the Practice page consume the same hooks
 * from this single file — no duplicated business logic.
 *
 * ## Exports
 *
 * | Hook                   | Type     | Description                              |
 * |------------------------|----------|------------------------------------------|
 * | `useFeaturedPractice`  | Query    | Featured packages (Home Screen preview)  |
 * | `usePracticeList`      | Query    | Full paginated list (Practice page)      |
 * | `usePracticeDetail`    | Query    | Single package detail with papers        |
 * | `usePracticeFilters`   | Query    | Available filter options                 |
 *
 * @module hooks/practice/usePractice
 */

import { useQuery } from '@tanstack/react-query';
import { practiceKeys } from './queryKeys';
import {
  getFeaturedPractice,
  getPracticeList,
  getPracticeDetail,
  getPracticeFilters,
} from '../../services/practice/practiceService';
import type { PaginatedResponse, PaginationParams } from '../../types/academic';
import type {
  PracticePackage,
  PracticeDetail,
  PracticeFilters,
  PracticeSortOptions,
  PracticeFilterOptions,
} from '../../types/practice';

// ─── Query Hooks ────────────────────────────────────────────────────────────

/**
 * Fetch featured PYQ practice packages for the Home Screen.
 *
 * Returns a limited set of active, published packages ordered by
 * publish date descending. Perfect for the "Practice with PYQs" preview.
 *
 * @param limit - Maximum number of items. Defaults to 6.
 *
 * @example
 * // Home Screen usage:
 * const { data, isLoading } = useFeaturedPractice(5);
 * if (data) {
 *   console.log(data.data);  // PracticePackage[]
 * }
 */
export function useFeaturedPractice(limit: number = 6) {
  return useQuery<PaginatedResponse<PracticePackage>>({
    queryKey: practiceKeys.featured.list(limit),
    queryFn: async () => {
      const result = await getFeaturedPractice(limit);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch featured practice packages.');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a paginated, filtered, and sorted list of PYQ practice packages.
 *
 * Supports search, stream filter, and full pagination.
 * Used by the Practice page for the main listing.
 *
 * All parameters are optional. Sensible defaults are applied:
 * - page: 1
 * - pageSize: 20
 * - sortBy: publishedAt (descending)
 *
 * @param filters    - Optional filter criteria (streamId, search, isFree, ids).
 * @param sort       - Optional sort configuration (sortBy, sortDirection).
 * @param pagination - Optional pagination parameters (page, pageSize).
 *
 * @example
 * // Practice page usage:
 * const { data, isLoading } = usePracticeList(
 *   { streamId: selectedStream },
 *   { sortBy: 'yearFrom', sortDirection: 'desc' },
 *   { page: 1, pageSize: 20 },
 * );
 * if (data) {
 *   console.log(data.data);  // PracticePackage[]
 *   console.log(data.count); // total rows for pagination
 * }
 */
export function usePracticeList(
  filters?: PracticeFilters,
  sort?: PracticeSortOptions,
  pagination?: PaginationParams,
) {
  return useQuery<PaginatedResponse<PracticePackage>>({
    queryKey: practiceKeys.list.list(filters, sort, pagination),
    queryFn: async () => {
      const result = await getPracticeList(filters, sort, pagination);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch practice packages.');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch full package detail including all its papers.
 *
 * The query is disabled when `packageId` is falsy.
 *
 * @param packageId - The UUID of the PYQ package.
 *
 * @example
 * const { data, isLoading } = usePracticeDetail('uuid-here');
 * if (data) {
 *   console.log(data.package.name);  // string
 *   console.log(data.papers);        // PracticePaper[]
 * }
 */
export function usePracticeDetail(packageId: string | undefined | null) {
  return useQuery<PracticeDetail>({
    queryKey: practiceKeys.detail.detail(packageId ?? ''),
    queryFn: async () => {
      if (!packageId) {
        throw new Error('Package ID is required.');
      }
      const result = await getPracticeDetail(packageId);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch practice package detail.');
      }
      return result.data!;
    },
    enabled: !!packageId,
    staleTime: 10 * 60 * 1000, // 10 minutes — detail changes infrequently
  });
}

/**
 * Fetch available filter options for the Practice page.
 *
 * Returns streams, subjects, and chapters that have published
 * PYQ packages — useful for populating filter dropdowns.
 *
 * @example
 * const { data, isLoading } = usePracticeFilters();
 * if (data) {
 *   console.log(data.streams);   // [{ id, name }, ...]
 *   console.log(data.subjects);  // [{ id, name }, ...]
 * }
 */
export function usePracticeFilters() {
  return useQuery<PracticeFilterOptions>({
    queryKey: practiceKeys.filters.options(),
    queryFn: async () => {
      const result = await getPracticeFilters();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch practice filters.');
      }
      return result.data!;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — filters change rarely
  });
}
