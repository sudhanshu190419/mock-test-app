/**
 * Student Dashboard Types
 *
 * Foundation types for the student dashboard — the single entry point for
 * everything assigned to the student's batch.
 *
 * ## Architecture
 *
 * The dashboard resolves the student's active batch once and exposes it
 * via a shared context. All future features (courses, live classes, study
 * material, mock tests) consume this context instead of re-resolving the
 * batch independently.
 *
 * ## Future Expansion
 *
 * This file will grow to include types for:
 * - `DashboardLiveClass` — live classes assigned via live_class_batch
 * - `DashboardMaterial`  — study material for the batch's stream
 * - `DashboardMockTest`  — mock tests assigned via (future) mock_test_batches
 *
 * @module types/studentDashboard
 */

import type { Batch } from './academic';
import type { UserProfile } from './auth';

// ═════════════════════════════════════════════════════════════════════════════
//  Student Batch — Resolved Batch Context
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A resolved batch that the student is actively enrolled in.
 *
 * Augments the core `Batch` type with the resolved stream name so that
 * downstream consumers don't need to join again.
 *
 * `null` when the student has no active batch membership.
 */
export interface StudentBatch {
  /** Core batch record from the `batches` table. */
  batch: Batch;
  /** Denormalized stream display name (resolved via batches.stream_id). */
  streamName: string;
  /** The student_id from student_details (used for subsequent queries). */
  studentId: string;
  /** The profile_id from auth.users (used for notification targeting). */
  profileId: string;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Assigned Course — A course assigned to the student's batch
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A course that has been assigned to the student's batch via the
 * `course_batches` junction table.
 *
 * These are courses the institute has assigned — the student does not
 * need to purchase them separately. The `isEnrolled` flag indicates
 * whether the student has an active enrollment record for this course
 * (e.g., if they also purchased it or were admin-enrolled).
 */
export interface AssignedCourse {
  /** Unique course identifier (UUID from `courses.course_id`). */
  courseId: string;
  /** Course title. */
  title: string;
  /** Short description / tagline (from `courses.short_description`). */
  shortDescription: string | null;
  /** Full description (from `courses.description`). */
  description: string | null;
  /** Stream / category display name (from `streams.name`). */
  category: string;
  /** Instructor display name (resolved via teacher_details → profiles). */
  instructorName: string | null;
  /** Course thumbnail URL (constructed from `courses.thumbnail_bucket/path`). */
  imageUrl: string | null;
  /**
   * Number of content modules available for this course — resolved from
   * `batch_contents` across all batches assigned to this course.
   * Previously counted from `course_content` (legacy).
   */
  moduleCount: number;
  /** Whether the student has an active enrollment record. */
  isEnrolled: boolean;
  /** Course duration in days (from `courses.duration`). */
  duration: number | null;
  /** Language of instruction (from `courses.language`). */
  language: string | null;
  /** Difficulty level (from `courses.difficulty_level`). */
  difficultyLevel: string | null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Subject Batch — A subject within a batch's stream for a course
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A subject within a course's batch stream — represents a learning track
 * within an assigned course.
 *
 * Each "Subject Batch" is a discipline (e.g. Physics, Chemistry, Biology)
 * under the academic stream associated with the student's batch. Students
 * enter a subject to access its study material, live classes, mock tests,
 * and assignments.
 */
export interface SubjectBatch {
  /** Subject UUID from the `subjects` table. */
  subjectId: string;
  /** Display name (e.g. "Physics", "Chemistry"). */
  subjectName: string;
  /** Short code (e.g. "PHY", "CHEM"). */
  subjectCode: string;
  /** Instructor name resolved from batch/course teacher assignments. */
  teacherName: string | null;
  /** Number of active students in this batch. */
  studentCount: number;
  /** The batch UUID (student's active batch). */
  batchId: string;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Dashboard Aggregate — getStudentDashboard() response shape
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Aggregate dashboard data returned by `getStudentDashboard()`.
 *
 * Phase 1: `profile` + `batches`
 * Phase 2: adds `assignedCourses`
 * Phase 3: adds `subjectBatches` per course (via getSubjectBatchesForCourse)
 *
 * Multi-batch architecture: a student can have multiple active subject batches
 * (e.g. Physics Batch, Chemistry Batch, Biology Batch). Courses are fetched
 * for ALL batches and deduplicated by courseId.
 */
export interface StudentDashboardData {
  /** The authenticated user's profile. */
  profile: UserProfile;
  /**
   * All active batches the student is enrolled in.
   * Empty array when no active batch exists — the dashboard will show
   * a generic catalog view instead of batch-specific content.
   */
  batches: StudentBatch[];
  /**
   * Courses assigned across all active batches via `course_batches`.
   * Deduplicated by courseId — the same course assigned through multiple
   * batches appears only once.
   * Empty array when no batch exists or no courses are assigned.
   */
  assignedCourses: AssignedCourse[];
}

// ═════════════════════════════════════════════════════════════════════════════
//  Dashboard State — Context state shape
// ═════════════════════════════════════════════════════════════════════════════

/**
 * The loading / error / data state of the dashboard resolution.
 *
 * This is the shape stored in the DashboardContext. Consumers read
 * `batches` and `isLoading` to render appropriate UI.
 */
export interface DashboardState {
  /** The resolved dashboard aggregate data, or `null` before first fetch. */
  data: StudentDashboardData | null;
  /** True while the dashboard is being resolved for the first time. */
  isLoading: boolean;
  /** Human-readable error message, or `null` when no error occurred. */
  error: string | null;
  /** True when the initial fetch has completed (success or failure). */
  initialized: boolean;
}
