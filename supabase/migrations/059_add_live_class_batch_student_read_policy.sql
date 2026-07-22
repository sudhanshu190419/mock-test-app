-- ============================================================================
-- Migration: 059 — Add Student Read Policy for live_class_batch
--
-- PostgreSQL 16 | Supabase Compatible | Production Ready
--
-- Problem
-- -------
-- The Student Live Classes Dashboard fails silently — the Upcoming tab shows
-- "No upcoming classes" even when a teacher has scheduled a class for a batch
-- the student belongs to.
--
-- Root cause: `live_class_batch` has only two SELECT policies:
--   1. Teachers can read rows for their own classes
--   2. Admins have full access
--
-- There is NO student SELECT policy. When `studentLiveClassService.ts` queries
-- `live_class_batch` with a student's session, RLS filters out ALL rows and
-- returns an empty array with no error, because no policy matches a student
-- user.
--
-- The `live_classes` table DOES have a student read policy (from migration
-- 021), but it queries `live_class_batch` internally — which also fails
-- silently due to the missing policy.
--
-- Solution
-- --------
-- Add a single SELECT policy on `live_class_batch` for students, reusing the
-- existing SECURITY DEFINER helper `is_student_enrolled_in_batch()` that was
-- created in migration 057.
--
-- The helper queries `batch_students` as SECURITY DEFINER (bypassing RLS),
-- so there is NO recursion risk — the policy evaluation call chain is a
-- straight line, not a cycle.
--
-- Security is preserved because:
--   - The helper filters by `get_my_student_id()` (bound to auth.uid())
--   - Students can only see batch-class mappings for batches they belong to
--   - Students cannot see mappings for other batches
--   - Only SELECT is granted; INSERT/UPDATE/DELETE remain restricted
--   - Teacher and admin policies are unchanged
--
-- Depends on:
--   Migration 021 (RLS enabled on live_class_batch, get_my_student_id helper)
--   Migration 057 (is_student_enrolled_in_batch SECURITY DEFINER helper)
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Add Student SELECT Policy on live_class_batch
-- ════════════════════════════════════════════════════════════════════════════
--
-- Students can read live_class_batch rows for any batch they are enrolled
-- in. This allows the Student Live Classes Dashboard to discover which live
-- classes are assigned to the student's batches.
--
-- Reuses the existing `is_student_enrolled_in_batch(batch_id)` SECURITY
-- DEFINER helper (created in migration 057) instead of querying
-- `batch_students` directly. This prevents potential RLS recursion since
-- the helper bypasses RLS on batch_students.
--
-- Only SELECT is granted. INSERT/UPDATE/DELETE are not permitted for
-- students. Existing teacher and admin policies remain unchanged.

create policy "Students can read live_class_batch for their batches"
  on public.live_class_batch
  for select
  to authenticated
  using (public.is_student_enrolled_in_batch(batch_id));

comment on policy "Students can read live_class_batch for their batches"
  on public.live_class_batch is
  'Non-recursive. Reuses is_student_enrolled_in_batch() SECURITY DEFINER '
  'helper from migration 057. Students can only see batch-class mappings '
  'for batches they are enrolled in. Only SELECT — no INSERT, UPDATE, '
  'or DELETE. Teacher and admin policies are unchanged.';

-- ════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION — 059 Add Student Read Policy for live_class_batch
-- ════════════════════════════════════════════════════════════════════════════
