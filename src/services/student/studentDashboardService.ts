/**
 * Student Dashboard Service
 *
 * Foundation service for the student dashboard — the single entry point
 * for everything assigned to the student's batch.
 *
 * ## Execution Flow
 *
 * ```
 * auth.user
 *   ↓
 * profiles                    (via session)
 *   ↓
 * student_details             (via profile_id)
 *   ↓
 * batch_students              (via student_id, status='active')
 *   ↓
 * batches                     (via batch_id) + stream name (via stream_id)
 *   ↓
 * StudentBatch                (resolved result)
 * ```
 *
 * ## Architecture
 *
 * All future dashboard features (courses, live classes, study material,
 * mock tests) should consume the resolved `StudentBatch` from this service
 * rather than re-resolving the batch independently. The batch ID and
 * stream ID are the keys used to query batch-assigned content.
 *
 * ## Future Expansion
 *
 * This service will grow methods for:
 * - `getAssignedCourses(batchId)`     — via course_batches
 * - `getUpcomingLiveClasses(batchIds)` — via live_class_batch
 * - `getStudyMaterial(streamId)`       — via academic hierarchy
 * - `getAssignedMockTests(batchIds)`   — via (future) mock_test_batches
 *
 * @module services/student/studentDashboardService
 */

import { supabase } from '../../config/supabase';
import { extractErrorMessage } from '../../utils/supabase';
import { resolveCurrentStudentId } from '../mockTest/studentResolver';
import { fetchProfile } from '../authService';
import type { ApiResponse } from '../../types/academic';
import type { Batch } from '../../types/academic';
import type { UserProfile } from '../../types/auth';
import type {
  StudentBatch,
  StudentDashboardData,
  AssignedCourse,
  SubjectBatch,
} from '../../types/studentDashboard';

// ─── Database Row Shapes ────────────────────────────────────────────────────

/**
 * Raw snake_case shape of a `batches` row with the stream name joined.
 */
interface DbBatchWithStream {
  batch_id: string;
  institute_id: string;
  stream_id: string;
  name: string;
  batch_code: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  max_seats: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  /** Nested join result from `streams` table. */
  stream: { name: string } | null;
}

/**
 * Raw snake_case shape of a `batch_students` row with the batch joined.
 */
interface DbBatchStudentWithBatch {
  batch_id: string;
  student_id: string;
  enrolled_on: string;
  status: string;
  /** Nested join result from `batches` table, with stream name. */
  batches: DbBatchWithStream;
}

// ═══════════════════════════════════════════════════════════════════════════
//  getAssignedCourses()
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Raw snake_case shape of a `courses` row joined with course_batches
 * and instructors. Module counts are now resolved separately from
 * `batch_contents` (see getAssignedCourses step 2).
 */
interface DbAssignedCourse {
  course_id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  duration: number | null;
  language: string | null;
  difficulty_level: string | null;
  stream: { name: string } | null;
  /** Course teachers with nested profile (first instructor only). */
  course_teachers: Array<{
    teacher: {
      profile: { name: string } | null;
    } | null;
  }>;
}

/**
 * Fetch all published, non-deleted courses assigned across the given batches,
 * with module counts resolved from `batch_contents` instead of the legacy
 * `course_content` table.
 *
 * Execution flow:
 *   batch_ids → course_batches → courses (published, non-deleted)
 *   batch_ids → batch_contents → content_id (deduplicated per course)
 *
 * Content visibility is now batch-driven: a student sees content assigned to
 * their batches via `batch_contents`, not content assigned to the course
 * directly via `course_content`.
 *
 * Results are NOT deduplicated here — the caller (getStudentDashboard)
 * handles deduplication after merging results from all batches.
 *
 * Returns an empty array when no courses are assigned to any of the batches.
 *
 * @param batchIds - Array of batch UUIDs to fetch courses for.
 *
 * @example
 * const courses = await getAssignedCourses(['batch-uuid-1', 'batch-uuid-2']);
 */
export async function getAssignedCourses(
  batchIds: string[],
): Promise<AssignedCourse[]> {
  if (batchIds.length === 0) return [];

  try {
    // ── 1. Fetch assigned courses ──────────────────────────────────────
    const { data, error } = await supabase
      .from('course_batches')
      .select(
        `
        course_id,
        courses!inner (
          course_id,
          title,
          short_description,
          description,
          thumbnail_bucket,
          thumbnail_path,
          duration,
          language,
          difficulty_level,
          stream:stream_id(name),
          course_teachers (
            teacher:teacher_id (
              profile:profile_id (name)
            )
          )
        )
      `,
      )
      .in('batch_id', batchIds)
      .eq('courses.status', 'published')
      .is('courses.deleted_at', null);

    if (error) {
      console.error(
        '[StudentDashboard] Error fetching assigned courses:',
        error.code,
        error.message,
      );
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // ── 2. Resolve module counts from batch_contents ───────────────────
    //    Content is now assigned to batches (not courses). We need to count
    //    distinct content_ids per course by going through the course→batch
    //    →batch_contents relationship.

    // 2a. Get course-to-batch mapping (which batches belong to which courses)
    const { data: courseBatchRows } = await supabase
      .from('course_batches')
      .select('course_id, batch_id')
      .in('batch_id', batchIds);

    // 2b. Get all content_ids from batch_contents for these batches
    const { data: batchContentRows } = await supabase
      .from('batch_contents')
      .select('batch_id, content_id')
      .in('batch_id', batchIds);

    // 2c. Build a map: course_id → Set<content_id>
    const courseContentIds = new Map<string, Set<string>>();

    // First, index batches by course
    const batchToCourses = new Map<string, string[]>();
    for (const cb of courseBatchRows ?? []) {
      const existing = batchToCourses.get(cb.batch_id) ?? [];
      existing.push(cb.course_id);
      batchToCourses.set(cb.batch_id, existing);
    }

    // Then, for each batch_content, add its content_id to each linked course
    for (const bc of batchContentRows ?? []) {
      const linkedCourseIds = batchToCourses.get(bc.batch_id) ?? [];
      for (const courseId of linkedCourseIds) {
        if (!courseContentIds.has(courseId)) {
          courseContentIds.set(courseId, new Set());
        }
        courseContentIds.get(courseId)!.add(bc.content_id);
      }
    }

    // ── 3. Map raw DB rows to AssignedCourse interface ─────────────────
    const courses: AssignedCourse[] = data.map((row: any) => {
      const c = row.courses;
      const streamName = c.stream?.name ?? '';
      const firstTeacher = c.course_teachers?.[0];
      const instructorName =
        firstTeacher?.teacher?.profile?.name ?? null;
      const moduleCount = courseContentIds.get(c.course_id)?.size ?? 0;
      const imageUrl =
        c.thumbnail_bucket && c.thumbnail_path
          ? `${c.thumbnail_bucket}/${c.thumbnail_path}`
          : null;

      return {
        courseId: c.course_id,
        title: c.title,
        shortDescription: c.short_description ?? null,
        description: c.description ?? null,
        category: streamName,
        instructorName,
        imageUrl,
        moduleCount,
        isEnrolled: false,
        duration: c.duration ?? null,
        language: c.language ?? null,
        difficultyLevel: c.difficulty_level ?? null,
      };
    });

    return courses;
  } catch (err) {
    console.error('[StudentDashboard] Unexpected error fetching assigned courses:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  getCourseBatches() — get actual batches assigned to a course
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all batches assigned to a course via `course_batches`.
 *
 * Each batch is treated as a "subject batch" — e.g. "Physics Batch",
 * "Chemistry Batch". Returns batch name, teacher assigned to that batch,
 * and student count.
 *
 * Execution flow:
 *   course_id → course_batches → batches + streams
 *     + batch_teachers (teacher names per batch)
 *     + batch_students (active student counts)
 *
 * @param courseId - The UUID of the course.
 *
 * @returns An array of `SubjectBatch` items (one per assigned batch).
 *
 * @example
 * const batches = await getCourseBatches('course-uuid');
 * batches.forEach(b => console.log(b.subjectName)); // "Physics Batch"
 */
// ═══════════════════════════════════════════════════════════════════════════
//  getAssignedMockTests()
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A mock test assigned to a batch, as displayed in the student dashboard.
 */
export interface AssignedMockTestItem {
  assignmentId: string;
  testId: string;
  title: string;
  description: string | null;
  testType: string;
  subjectId: string | null;
  durationMin: number;
  totalMarks: number;
  passingMarks: number | null;
  negativeMarking: number;
  status: string;
  attemptLimit: number | null;
  availableFrom: string | null;
  availableUntil: string | null;
  publishedAt: string | null;
  assignedAt: string;
  /** Number of questions in this test. Fetched from mock_test_questions. */
  questionCount: number;
}

/**
 * Fetch all published mock tests assigned to a specific batch,
 * including the number of questions per test.
 *
 * Execution flow:
 *   batch_id → batch_mock_tests → mock_tests (published)
 *   test_ids → mock_test_questions (counts)
 *
 * Only returns `published` mock tests that are assigned to the batch.
 * Returns an empty array when no tests are assigned.
 *
 * @param batchId - The UUID of the batch (subject batch).
 *
 * @example
 * const tests = await getAssignedMockTests('batch-uuid');
 * tests.forEach(t => console.log(t.title, t.questionCount));
 */
export async function getAssignedMockTests(
  batchId: string,
): Promise<AssignedMockTestItem[]> {
  try {
    // 1. Fetch assigned mock tests
    const { data, error } = await supabase
      .from('batch_mock_tests')
      .select(
        `
        assignment_id,
        test_id,
        assigned_at,
        available_from,
        available_until,
        attempt_limit,
        mock_tests!inner (
          test_id,
          title,
          description,
          test_type,
          subject_id,
          duration_min,
          total_marks,
          passing_marks,
          negative_marking,
          status,
          attempt_limit,
          available_from,
          available_until,
          published_at
        )
      `,
      )
      .eq('batch_id', batchId)
      .eq('mock_tests.status', 'published')
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error(
        '[StudentDashboard] Error fetching assigned mock tests:',
        error.code,
        error.message,
      );
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 2. Collect test IDs to fetch question counts
    const testIds = data.map((row: any) =>
      row.mock_tests?.test_id ?? row.test_id,
    );

    // 3. Fetch question counts per test from mock_test_questions
    let questionCountMap = new Map<string, number>();
    try {
      const { data: qcGroup } = await supabase
        .from('mock_test_questions')
        .select('test_id')
        .in('test_id', testIds);

      if (qcGroup) {
        const countMap = new Map<string, number>();
        for (const row of qcGroup as any[]) {
          const tid = row.test_id;
          countMap.set(tid, (countMap.get(tid) ?? 0) + 1);
        }
        questionCountMap = countMap;
      }
    } catch (qcErr) {
      console.warn(
        '[StudentDashboard] Could not fetch question counts:',
        qcErr,
      );
      // Non-fatal — proceed without counts
    }

    // 4. Map to AssignedMockTestItem
    const tests: AssignedMockTestItem[] = data.map((row: any) => {
      const mt = row.mock_tests ?? {};
      const testId = mt.test_id ?? row.test_id;
      return {
        assignmentId: row.assignment_id,
        testId,
        title: mt.title ?? 'Unknown Test',
        description: mt.description ?? null,
        testType: mt.test_type ?? 'practice',
        subjectId: mt.subject_id ?? null,
        durationMin: mt.duration_min ?? 0,
        totalMarks: mt.total_marks ?? 0,
        passingMarks: mt.passing_marks ?? null,
        negativeMarking: mt.negative_marking ?? 0,
        status: mt.status ?? 'draft',
        attemptLimit: row.attempt_limit ?? mt.attempt_limit ?? null,
        availableFrom: row.available_from ?? mt.available_from ?? null,
        availableUntil: row.available_until ?? mt.available_until ?? null,
        publishedAt: mt.published_at ?? null,
        assignedAt: row.assigned_at ?? row.created_at ?? '',
        questionCount: questionCountMap.get(testId) ?? 0,
      };
    });

    return tests;
  } catch (err) {
    console.error(
      '[StudentDashboard] Unexpected error fetching assigned mock tests:',
      err,
    );
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  getBatchContent() — fetch content assigned to a batch
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A content item assigned to a batch, as displayed in the student dashboard.
 */
export interface BatchContentItem {
  contentId: string;
  title: string;
  description: string | null;
  contentType: 'pdf' | 'video' | 'notes' | 'assignment';
  /** Supabase Storage bucket (e.g. 'content-pdfs'). Used to generate signed URLs. */
  storageBucket: string;
  /** Full storage path within the bucket. Used to generate signed URLs. */
  storagePath: string;
  /** IANA media type (e.g. 'application/pdf'). */
  mimeType: string;
  durationSeconds: number | null;
  pageCount: number | null;
  fileSizeBytes: number | null;
  thumbnailBucket: string | null;
  thumbnailPath: string | null;
  publishedAt: string | null;
  orderSequence: number;
  sectionName: string | null;
  isOptional: boolean;
  assignedAt: string;
}

/**
 * Fetch all approved content items assigned to a specific batch.
 *
 * Execution flow:
 *   batch_id → batch_contents → content (only 'approved' status)
 *
 * Results are ordered by `order_sequence` (curriculum order).
 * Only returns content with `status = 'approved'` — draft or rejected
 * content is invisible to students.
 *
 * Returns an empty array when no content is assigned to the batch.
 *
 * @param batchId - The UUID of the batch (subject batch).
 *
 * @example
 * const items = await getBatchContent('batch-uuid');
 * items.forEach(c => console.log(c.title, c.contentType));
 */
export async function getBatchContent(
  batchId: string,
): Promise<BatchContentItem[]> {
  try {
    const { data, error } = await supabase
      .from('batch_contents')
      .select(
        `
        order_sequence,
        section_name,
        is_optional,
        assigned_at,
        content!inner (
          content_id,
          title,
          description,
          content_type,
          storage_bucket,
          storage_path,
          mime_type,
          duration_seconds,
          page_count,
          thumbnail_bucket,
          thumbnail_path,
          file_size_bytes,
          published_at
        )
      `,
      )
      .eq('batch_id', batchId)
      .eq('content.status', 'approved')
      .order('order_sequence', { ascending: true });

    if (error) {
      console.error(
        '[StudentDashboard] Error fetching batch content:',
        error.code,
        error.message,
      );
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const items: BatchContentItem[] = data.map((row: any) => {
      const c = row.content ?? {};
      return {
        contentId: c.content_id ?? row.content_id,
        title: c.title ?? 'Untitled Content',
        description: c.description ?? null,
        contentType: c.content_type ?? 'notes',
        storageBucket: c.storage_bucket ?? '',
        storagePath: c.storage_path ?? '',
        mimeType: c.mime_type ?? 'application/pdf',
        durationSeconds: c.duration_seconds ?? null,
        pageCount: c.page_count ?? null,
        fileSizeBytes: c.file_size_bytes ?? null,
        thumbnailBucket: c.thumbnail_bucket ?? null,
        thumbnailPath: c.thumbnail_path ?? null,
        publishedAt: c.published_at ?? null,
        orderSequence: row.order_sequence ?? 1,
        sectionName: row.section_name ?? null,
        isOptional: row.is_optional ?? false,
        assignedAt: row.assigned_at ?? '',
      };
    });

    // ── [DIAGNOSTIC] Log every content item returned from API ────────
    for (const item of items) {
      console.log('[DIAGNOSTIC:API] Content item:', {
        contentId: item.contentId,
        title: item.title,
        contentType: item.contentType,
        storageBucket: item.storageBucket,
        storagePath: item.storagePath,
        mimeType: item.mimeType,
      });
    }

    return items;
  } catch (err) {
    console.error(
      '[StudentDashboard] Unexpected error fetching batch content:',
      err,
    );
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  getCourseBatches() — get actual batches assigned to a course
// ═══════════════════════════════════════════════════════════════════════════

export async function getCourseBatches(
  courseId: string,
): Promise<SubjectBatch[]> {
  try {
    // 1. Get all batches assigned to this course via course_batches
    const { data: courseBatchRows, error: cbErr } = await supabase
      .from('course_batches')
      .select(
        `
        batch_id,
        batches!inner (
          batch_id,
          name,
          batch_code,
          academic_year,
          stream_id,
          status,
          streams!left (name)
        )
      `,
      )
      .eq('course_id', courseId)
      .order('assigned_at', { ascending: true });

    if (cbErr) {
      console.error(
        '[StudentDashboard] Error fetching course batches:',
        cbErr.code,
        cbErr.message,
      );
      return [];
    }

    if (!courseBatchRows || courseBatchRows.length === 0) {
      return [];
    }

    // 2. Collect batch IDs to fetch teachers and student counts
    const batchIds = courseBatchRows.map((row: any) =>
      row.batches?.batch_id ?? row.batch_id,
    );

    // 3. Fetch teachers and student counts in parallel
    const [teachersRes, countsRes] = await Promise.allSettled([
      // Teachers per batch
      supabase
        .from('batch_teachers')
        .select(
          `
          batch_id,
          teacher_details!inner (
            profiles!inner (name)
          )
        `,
        )
        .in('batch_id', batchIds),

      // Active student counts per batch
      supabase
        .from('batch_students')
        .select('batch_id, count:student_id')
        .in('batch_id', batchIds)
        .eq('status', 'active'),
    ]);

    // Build teacher name map: batch_id → first teacher name
    const teacherMap = new Map<string, string>();
    if (teachersRes.status === 'fulfilled' && teachersRes.value.data) {
      for (const t of teachersRes.value.data as any[]) {
        const name = t.teacher_details?.profiles?.name;
        if (name && !teacherMap.has(t.batch_id)) {
          teacherMap.set(t.batch_id, name);
        }
      }
    }

    // Build student count map
    const countMap = new Map<string, number>();
    if (countsRes.status === 'fulfilled' && countsRes.value.data) {
      for (const c of countsRes.value.data as any[]) {
        countMap.set(c.batch_id, c.count ?? 0);
      }
    }

    // 4. Map to SubjectBatch interface (batches ARE the subjects)
    const batches: SubjectBatch[] = courseBatchRows.map((row: any) => {
      const b = row.batches ?? {};
      const batchId = b.batch_id ?? row.batch_id;
      const batchName = b.name ?? 'Unknown Batch';
      // Extract subject-like name from batch name
      // e.g. "Physics Batch" → subjectName = "Physics", or keep full name
      return {
        subjectId: batchId,       // Use batch_id as the subject identifier
        subjectName: batchName,    // Keep original batch name, e.g. "Physics Batch"
        subjectCode: batchName,    // e.g. "Physics Batch" — emoji helper parses this
        teacherName: teacherMap.get(batchId) ?? null,
        studentCount: countMap.get(batchId) ?? 0,
        batchId,
      };
    });

    return batches;
  } catch (err) {
    console.error(
      '[StudentDashboard] Unexpected error fetching course batches:',
      err,
    );
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  getCourseBatchNames() — lightweight batch names for course cards
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lightweight fetch of batch names for a course (for subject chips on
 * MyCoursesScreen course cards).
 *
 * Returns `{ batchId, batchName }[]` for all batches assigned to a course.
 * Used to show "3 Subject Batches" chips on each course card.
 *
 * @param courseId - The UUID of the course.
 *
 * @example
 * const names = await getCourseBatchNames('course-uuid');
 * // [{ batchId: '...', batchName: 'Physics Batch' }, ...]
 */
export async function getCourseBatchNames(
  courseId: string,
): Promise<Array<{ batchId: string; batchName: string }>> {
  try {
    const { data, error } = await supabase
      .from('course_batches')
      .select(
        `
        batch_id,
        batches!inner (name)
      `,
      )
      .eq('course_id', courseId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      batchId: row.batches?.batch_id ?? row.batch_id,
      batchName: row.batches?.name ?? 'Unknown',
    }));
  } catch {
    return [];
  }
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

/**
 * Maps a raw `DbBatchStudentWithBatch` row to a `StudentBatch` interface.
 */
function mapToStudentBatch(
  db: DbBatchStudentWithBatch,
  studentId: string,
  profileId: string,
): StudentBatch {
  const b = db.batches;
  return {
    batch: {
      batchId: b.batch_id,
      instituteId: b.institute_id,
      streamId: b.stream_id,
      name: b.name,
      batchCode: b.batch_code,
      academicYear: b.academic_year,
      startDate: b.start_date,
      endDate: b.end_date,
      maxSeats: b.max_seats,
      status: b.status as Batch['status'],
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      createdBy: b.created_by,
      updatedBy: b.updated_by,
      deletedAt: b.deleted_at,
    },
    streamName: b.stream?.name ?? '',
    studentId,
    profileId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve all active batches for the currently authenticated student.
 *
 * Execution flow:
 *   auth.user → session → student_details → batch_students (status='active')
 *   → batches (with stream name)
 *
 * Returns an empty array when:
 * - No authenticated session exists
 * - No `student_details` record exists for the user
 * - No active `batch_students` rows exist
 *
 * Supports multiple active batches (e.g. Physics Batch + Chemistry Batch).
 * Database errors are logged and gracefully return `[]`.
 *
 * @returns An array of `StudentBatch` with resolved batches and stream names.
 *
 * @example
 * const batches = await getStudentBatches();
 * batches.forEach(b => console.log(b.batch.name));
 * // "Physics Batch"
 * // "Chemistry Batch"
 */
export async function getStudentBatches(): Promise<StudentBatch[]> {
  // 1. Resolve the authenticated student's profile_id → student_id
  const resolved = await resolveCurrentStudentId();
  if (!resolved) {
    console.log('[StudentDashboard] Student not resolved — no authenticated session or missing student_details');
    return [];
  }

  const { profileId, studentId } = resolved;  // 2. Query batch_students for all active batches (status = 'active')
    //    Join with batches table to get the full batch record,
    //    and nested join with streams to get the stream name.
    const { data, error } = await supabase
      .from('batch_students')
      .select(
        `
      batch_id,
      student_id,
      enrolled_on,
      status,
      batches!inner (
        batch_id,
        institute_id,
        stream_id,
        name,
        batch_code,
        academic_year,
        start_date,
        end_date,
        max_seats,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by,
        deleted_at,
        stream:stream_id(name)
      )
    `,
      )
      .eq('student_id', studentId)
      .eq('status', 'active');

    if (error) {
      console.error(
        '[StudentDashboard] Database error fetching batches:',
        error.code,
        error.message,
        error.details,
      );
      return [];
    }

    const rows = data as unknown as DbBatchStudentWithBatch[] | null;

    if (!rows || rows.length === 0) {
      console.log('[StudentDashboard] No active batches found for student:', studentId);
      return [];
    }

    console.log(
      '[StudentDashboard] Active batches resolved:',
      rows.map((r) => `${r.batches.name} (${r.batches.stream?.name ?? 'unknown'})`).join(', '),
    );
    return rows.map((row) => mapToStudentBatch(row, studentId, profileId));
}

/**
 * Fetch the full student dashboard aggregate.
 *
 * Phase 1 returns only:
 * - `profile` (the student's UserProfile — provided by caller or fetched
 *   from the `profiles` table)
 * - `currentBatch` (the student's active batch, or `null`)
 *
 * Future phases will extend the response with:
 * - `assignedCourses`
 * - `upcomingLiveClasses`
 * - `studyMaterial`
 * - `assignedMockTests`
 *
 * @param existingProfile - Optional pre-resolved profile from Redux. When
 *                          provided, avoids an extra DB round-trip. When
 *                          omitted, the profile is fetched from the
 *                          `profiles` table.
 *
 * @returns A `StudentDashboardData` containing the profile and resolved
 *          current batch.
 */
export async function getStudentDashboard(
  existingProfile?: UserProfile | null,
): Promise<
  ApiResponse<StudentDashboardData>
> {
  try {
    // 1. Resolve student identity (gets student_id from session)
    const resolved = await resolveCurrentStudentId();
    if (!resolved) {
      return {
        success: false,
        error:
          'No student profile found. Please complete your profile setup.',
      };
    }

    // 2. Resolve the authoritative profile
    //    Prefer the caller-provided profile (e.g. from Redux) to avoid
    //    a redundant DB round-trip. Fall back to fetching from `profiles`.
    let profile: UserProfile;

    if (existingProfile) {
      profile = existingProfile;
    } else {
      const dbProfile = await fetchProfile(resolved.profileId);
      if (!dbProfile) {
        return {
          success: false,
          error: 'User profile not found. Please contact support.',
        };
      }

      // Build a UserProfile from the DB profile + session data
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;

      profile = {
        id: resolved.profileId,
        email: authUser?.email ?? '',
        emailVerified: !!authUser?.email_confirmed_at,
        phoneVerified: !!authUser?.phone_confirmed_at,
        name: dbProfile.name,
        role: dbProfile.role,
        instituteId: dbProfile.institute_id,
        phone: dbProfile.phone,
        avatarUrl: dbProfile.avatar_url,
        createdAt: authUser?.created_at ?? new Date().toISOString(),
      };
    }

    // 3. Resolve all active batches
    const batches = await getStudentBatches();

    // 4. Fetch assigned courses across all batches and deduplicate
    let assignedCourses: AssignedCourse[] = [];
    if (batches.length > 0) {
      const batchIds = batches.map((b) => b.batch.batchId);
      const allCourses = await getAssignedCourses(batchIds);

      // Deduplicate by courseId — the same course may be assigned to
      // multiple batches (e.g. "NEET 2027" assigned to both Physics
      // and Chemistry batches).
      const seen = new Set<string>();
      for (const course of allCourses) {
        if (!seen.has(course.courseId)) {
          seen.add(course.courseId);
          assignedCourses.push(course);
        }
      }
    }

    // 5. Return the aggregate
    return {
      success: true,
      data: {
        profile,
        batches,
        assignedCourses,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: extractErrorMessage(err),
    };
  }
}
