/**
 * Home Course Hooks
 *
 * React Query hooks wrapping the home courseService API calls.
 * Provides cached queries for trending, latest, recommended,
 * and featured courses on the Home Screen.
 *
 * ## Exports
 *
 * | Hook                  | Type     | Description                          |
 * |-----------------------|----------|--------------------------------------|
 * | `useTrendingCourses`  | Query    | Trending courses (from `courses` table)|
 * | `useLatestCourses`    | Query    | Latest published courses              |
 * | `useRecommendedCourses`| Query   | Recommended courses (excludes enrolled)|
 * | `useFeaturedCourses`  | Query    | Featured courses by ID set           |
 *
 * @module hooks/home/useCourses
 */

import { useQuery } from '@tanstack/react-query';
import { homeKeys } from './queryKeys';
import {
  getTrendingCourses,
  getLatestCourses,
  getRecommendedCourses,
  getFeaturedCourses,
  getCoursesByStream,
  getPublishedCourses,
} from '../../services/home/courseService';
import type { TrendingCourse } from '../../types/home';
import type { PaginatedResponse, PaginationParams } from '../../types/academic';

// ─── Query Hooks ────────────────────────────────────────────────────────────

/**
 * Fetch trending courses for the Home Screen carousel.
 *
 * ✅ SCHEMA NOTE: Backed by `courses` table (Domain 16). Returns published
 * courses marked as trending, ordered by featured then published_at DESC.
 * Includes instructor name, stream name, and enrollment count via joins.
 *
 * @param pagination - Optional pagination parameters.
 *
 * @example
 * const { data, isLoading, error } = useTrendingCourses({ page: 1, pageSize: 8 });
 * if (data) {
 *   console.log(data.data);  // TrendingCourse[]
 * }
 */
export function useTrendingCourses(
  pagination?: PaginationParams,
  streamId?: string | null,
) {
  return useQuery<PaginatedResponse<TrendingCourse>>({
    queryKey: homeKeys.courses.trending(pagination, streamId),
    queryFn: async () => {
      const result = await getTrendingCourses(pagination, streamId);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch trending courses.');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch the latest published courses.
 *
 * ✅ SCHEMA NOTE: Backed by `courses` table. Sorted by publish date
 * descending — newest first. Excludes soft-deleted courses.
 *
 * @param limit - Maximum number of items. Defaults to 8.
 *
 * @example
 * const { data, isLoading } = useLatestCourses(6);
 */
export function useLatestCourses(limit: number = 8) {
  return useQuery<PaginatedResponse<TrendingCourse>>({
    queryKey: homeKeys.courses.latest(limit),
    queryFn: async () => {
      const result = await getLatestCourses(limit);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch latest courses.');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch recommended courses for the authenticated student.
 *
 * ✅ SCHEMA NOTE: Backed by `courses` table. When `studentId` is provided,
 * courses the student is already enrolled in are excluded via
 * `course_enrollments` lookup.
 *
 * The query is disabled when `studentId` is falsy.
 *
 * @param studentId - The authenticated student's UUID (from student_details).
 * @param limit     - Maximum number of items. Defaults to 8.
 *
 * @example
 * const { data, isLoading } = useRecommendedCourses(studentId, 6);
 */
export function useRecommendedCourses(
  studentId: string | undefined | null,
  limit: number = 8,
) {
  return useQuery<PaginatedResponse<TrendingCourse>>({
    queryKey: homeKeys.courses.recommended(studentId ?? ''),
    queryFn: async () => {
      const result = await getRecommendedCourses(studentId, limit);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch recommended courses.');
      }
      return result.data!;
    },
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch featured courses by a specific set of course IDs.
 *
 * ✅ SCHEMA NOTE: Backed by `courses` table. Useful when the backend or
 * CMS returns a curated list of course IDs for a "Featured Courses" section.
 *
 * @param ids - Array of course UUIDs to fetch.
 *
 * @example
 * const { data, isLoading } = useFeaturedCourses(['id-1', 'id-2']);
 */
export function useFeaturedCourses(ids: string[]) {
  return useQuery<TrendingCourse[]>({
    queryKey: homeKeys.courses.featured(ids),
    queryFn: async () => {
      const result = await getFeaturedCourses(ids);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch featured courses.');
      }
      return result.data!;
    },
    enabled: ids.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch all published courses filtered by a specific stream.
 *
 * @param streamId   - The target stream UUID to filter by.
 * @param pagination - Optional pagination parameters.
 */
export function useCoursesByStream(streamId: string, pagination?: PaginationParams) {
  return useQuery<PaginatedResponse<TrendingCourse>>({
    queryKey: homeKeys.courses.byStream(streamId, pagination),
    queryFn: async () => {
      const result = await getCoursesByStream(streamId, pagination);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch courses by stream.');
      }
      return result.data!;
    },
    enabled: !!streamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch all published courses for the Courses listing page.
 *
 * @param pagination - Optional pagination parameters.
 */
export function usePublishedCourses(pagination?: PaginationParams) {
  return useQuery<PaginatedResponse<TrendingCourse>>({
    queryKey: [...homeKeys.courses.all(), 'published', pagination],
    queryFn: async () => {
      const result = await getPublishedCourses(pagination);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch published courses.');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
