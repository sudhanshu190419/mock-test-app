/**
 * Purchased Practices Hook
 *
 * React Query hook to fetch the authenticated student's active purchased PYQs
 * without modifying existing backend services or schemas.
 *
 * @module hooks/practice/usePurchasedPractices
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';
import { getPracticeList } from '../../services/practice/practiceService';
import type { PracticePackage } from '../../types/practice';

export function usePurchasedPractices(studentId: string | undefined | null) {
  return useQuery<PracticePackage[]>({
    queryKey: ['practice', 'purchased', studentId ?? ''],
    queryFn: async () => {
      if (!studentId) return [];

      const { data: purchasedRecords, error } = await supabase
        .from('student_pyq_purchases')
        .select('package_id')
        .eq('student_id', studentId)
        .eq('is_active', true);

      if (error) {
        throw new Error(error.message || 'Failed to fetch PYQ purchases.');
      }

      const ids = (purchasedRecords ?? []).map((record) => record.package_id);
      if (ids.length === 0) return [];

      const result = await getPracticeList({ ids }, undefined, { page: 1, pageSize: 50 });
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch purchased practice packages.');
      }

      return result.data?.data ?? [];
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
