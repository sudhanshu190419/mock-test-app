/**
 * Enrolled Courses Hook
 *
 * React Query hook to fetch the authenticated student's active enrolled courses
 * without modifying existing backend services or schemas.
 *
 * @module hooks/home/useEnrolledCourses
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';
import { getFeaturedCourses } from '../../services/home/courseService';
import type { TrendingCourse } from '../../types/home';

export function useEnrolledCourses(studentId: string | undefined | null) {
  return useQuery<TrendingCourse[]>({
    queryKey: ['courses', 'enrolled', studentId ?? ''],
    queryFn: async () => {
      if (!studentId) return [];

      const { data: enrolledRecords, error } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('is_active', true);

      if (error) {
        throw new Error(error.message || 'Failed to fetch course enrollments.');
      }

      const ids = (enrolledRecords ?? []).map((record) => record.course_id);
      if (ids.length === 0) return [];

      const result = await getFeaturedCourses(ids);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch enrolled course details.');
      }

      return result.data ?? [];
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
