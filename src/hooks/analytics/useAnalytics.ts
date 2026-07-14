/**
 * Student Analytics Hooks
 *
 * React Query hooks wrapping the four analytics RPC service calls.
 *
 * Each RPC internally resolves the student_id from the authenticated session
 * via `get_my_student_id()`, so these hooks take no parameters.
 *
 * Provides cached analytics data with automatic background refetching.
 *
 * @module hooks/analytics/useAnalytics
 */

import { useQuery } from '@tanstack/react-query';
import { analyticsKeys } from './queryKeys';
import {
  getStudentSubjectAnalytics,
  getStudentChapterAnalytics,
  getStudentWeakChapters,
  getStudentStrongChapters,
  getStudentScoreTrend,
} from '../../services/analytics/analyticsService';
import type {
  SubjectAnalyticsItem,
  ChapterAnalyticsItem,
  ChapterWeakStrongItem,
  ScoreTrendPoint,
} from '../../types/analytics';

// ═════════════════════════════════════════════════════════════════════════════
//  useStudentSubjectAnalytics
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch subject-wise analytics via the `get_student_subject_analytics()`
 * PostgreSQL RPC.
 *
 * The RPC resolves the student_id from the authenticated session — no
 * parameters are required. All analytics are computed server-side.
 *
 * @example
 * const { data, isLoading, error } = useStudentSubjectAnalytics();
 *
 * if (isLoading) return <LoadingSkeleton />;
 * if (error) return <ErrorState />;
 * if (data) {
 *   data.forEach(s => console.log(s.subjectName, s.accuracy));
 * }
 */
export function useStudentSubjectAnalytics() {
  return useQuery<SubjectAnalyticsItem[]>({
    queryKey: analyticsKeys.subject.list(),
    queryFn: async () => {
      const result = await getStudentSubjectAnalytics();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch subject analytics.');
      }
      return result.data!;
    },
    staleTime: 60_000, // 1 minute — analytics change less frequently than dashboard
    retry: 1,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  useStudentChapterAnalytics
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch chapter-wise analytics via the `get_student_chapter_analytics()`
 * PostgreSQL RPC.
 *
 * The RPC resolves the student_id from the authenticated session — no
 * parameters are required. All analytics are computed server-side.
 *
 * @example
 * const { data, isLoading, error } = useStudentChapterAnalytics();
 *
 * if (isLoading) return <LoadingSkeleton />;
 * if (error) return <ErrorState />;
 * if (data) {
 *   data.forEach(c => console.log(c.chapterName, c.accuracy));
 * }
 */
export function useStudentChapterAnalytics() {
  return useQuery<ChapterAnalyticsItem[]>({
    queryKey: analyticsKeys.chapter.list(),
    queryFn: async () => {
      const result = await getStudentChapterAnalytics();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch chapter analytics.');
      }
      return result.data!;
    },
    staleTime: 60_000,
    retry: 1,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  useStudentWeakChapters
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch the weakest chapters via the `get_student_weak_chapters()`
 * PostgreSQL RPC.
 *
 * The RPC resolves the student_id from the authenticated session — no
 * parameters are required. The returned array is ordered by the RPC —
 * the mobile app must NOT re-sort.
 *
 * @example
 * const { data, isLoading, error } = useStudentWeakChapters();
 *
 * if (isLoading) return <LoadingSkeleton />;
 * if (error) return <ErrorState />;
 * if (data) {
 *   data.forEach(c => console.log(c.chapterName, c.accuracy));
 * }
 */
export function useStudentWeakChapters() {
  const query = useQuery<ChapterWeakStrongItem[]>({
    queryKey: analyticsKeys.weak.list(),
    queryFn: async () => {
      const result = await getStudentWeakChapters();
      console.group('WEAK_CHAPTERS_HOOK');
      console.log('query enabled:', true);
      console.log('fetched data:', result.data);
      console.log('success:', result.success);
      console.log('error:', result.error);
      console.groupEnd();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch weak chapters.');
      }
      return result.data!;
    },
    staleTime: 60_000,
    retry: 1,
  });

  console.log('WEAK_CHAPTERS_HOOK', {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
  });

  return query;
}

// ═════════════════════════════════════════════════════════════════════════════
//  useStudentStrongChapters
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch the strongest chapters via the `get_student_strong_chapters()`
 * PostgreSQL RPC.
 *
 * The RPC resolves the student_id from the authenticated session — no
 * parameters are required. The returned array is ordered by the RPC —
 * the mobile app must NOT re-sort.
 *
 * @example
 * const { data, isLoading, error } = useStudentStrongChapters();
 *
 * if (isLoading) return <LoadingSkeleton />;
 * if (error) return <ErrorState />;
 * if (data) {
 *   data.forEach(c => console.log(c.chapterName, c.accuracy));
 * }
 */
export function useStudentStrongChapters() {
  const query = useQuery<ChapterWeakStrongItem[]>({
    queryKey: analyticsKeys.strong.list(),
    queryFn: async () => {
      const result = await getStudentStrongChapters();
      console.group('STRONG_CHAPTERS_HOOK');
      console.log('query enabled:', true);
      console.log('fetched data:', result.data);
      console.log('success:', result.success);
      console.log('error:', result.error);
      console.groupEnd();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch strong chapters.');
      }
      return result.data!;
    },
    staleTime: 60_000,
    retry: 1,
  });

  console.log('STRONG_CHAPTERS_HOOK', {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
  });

  return query;
}

// ═════════════════════════════════════════════════════════════════════════════
//  useStudentScoreTrend
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch the student's score trend via the `get_student_score_trend()`
 * PostgreSQL RPC.
 *
 * Returns an array of `ScoreTrendPoint` ordered chronologically by
 * attempt date (oldest first) — perfect for rendering a line chart.
 *
 * The RPC resolves the student_id from the authenticated session — no
 * parameters are required. All analytics are computed server-side.
 *
 * @example
 * const { data, isLoading, error } = useStudentScoreTrend();
 *
 * if (isLoading) return <LoadingSkeleton />;
 * if (error) return <ErrorState />;
 * if (data) {
 *   data.forEach(p => console.log(p.testName, p.score));
 * }
 */
export function useStudentScoreTrend() {
  return useQuery<ScoreTrendPoint[]>({
    queryKey: analyticsKeys.scoreTrend.list(),
    queryFn: async () => {
      const result = await getStudentScoreTrend();
      if (!result.success) {
        console.log('[SCORE_TREND_HOOK] RPC error:', result.error);
        throw new Error(result.error ?? 'Failed to fetch score trend.');
      }
      console.log('[SCORE_TREND_HOOK] success, points:', result.data?.length);
      return result.data!;
    },
    staleTime: 60_000, // 1 minute — trend data changes only after new results are released
    retry: 1,
  });
}
