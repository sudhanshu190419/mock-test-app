/**
 * useCourse
 *
 * React Query hook for fetching a single course by ID for the Course
 * Detail screen.
 *
 * The hook is disabled when no courseId is provided, so it works safely
 * while navigation params are being resolved.
 *
 * @module hooks/course/useCourse
 */

import { useQuery } from '@tanstack/react-query';
import { getCourseById } from '../../services/home/courseService';
import type { CourseDetail } from '../../types/courseDetail';

/** Query key prefix for course detail queries. */
const COURSE_DETAIL_KEY = 'courseDetail' as const;

/**
 * Fetch a single course by its UUID.
 *
 * @param courseId - The course UUID (from navigation params).
 *
 * @example
 * const { data: course, isLoading, error } = useCourse('uuid-here');
 * if (course) {
 *   console.log(course.title, course.price);
 * }
 */
export function useCourse(courseId: string | undefined) {
  return useQuery<CourseDetail>({
    queryKey: [COURSE_DETAIL_KEY, courseId],
    queryFn: async () => {
      console.log('[COURSE_HOOK] Loading course:', courseId);
      const result = await getCourseById(courseId!);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to load course details.');
      }
      console.log('[COURSE_HOOK] Course loaded:', result.data!.courseId, result.data!.title);
      return result.data!;
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // 10 minutes — course data rarely changes
    retry: 1,
  });
}
