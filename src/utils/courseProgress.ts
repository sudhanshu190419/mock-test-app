import { supabase } from '../config/supabase';

/**
 * Calculates a student's progress percentage for an enrolled course based on class attendance.
 * Falls back to 0 if there are no scheduled classes, or if the calculation fails.
 */
export async function getCourseProgress(studentId: string, courseId: string): Promise<number> {
  try {
    if (!studentId || !courseId) return 0;

    // 1. Fetch batch IDs associated with this course
    const { data: batches, error: batchError } = await supabase
      .from('course_batches')
      .select('batch_id')
      .eq('course_id', courseId);

    if (batchError || !batches || batches.length === 0) return 0;
    const batchIds = batches.map((b) => b.batch_id);

    // 2. Fetch class IDs associated with these batches
    const { data: classes, error: classError } = await supabase
      .from('live_class_batch')
      .select('class_id')
      .in('batch_id', batchIds);

    if (classError || !classes || classes.length === 0) return 0;
    const classIds = classes.map((c) => c.class_id);
    const totalClasses = classIds.length;

    // 3. Fetch count of attended classes for this student
    const { count, error: attendanceError } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('is_present', true)
      .in('class_id', classIds);

    if (attendanceError || count === null) return 0;

    return Math.round((count / totalClasses) * 100);
  } catch (err) {
    console.error('[courseProgress] Error calculating course progress:', err);
    return 0;
  }
}
