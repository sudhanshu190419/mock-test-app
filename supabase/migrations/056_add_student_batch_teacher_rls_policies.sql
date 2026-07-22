-- ============================================================================
-- Migration: 056 — Add Student RLS Policies for Batch Teacher Visibility
--
-- Students need to see which teachers are assigned to their batches on the
-- "Select a Subject" screen. The current policies only allow teachers and
-- admins to read batch_teachers and teacher_details, so students always see
-- "Teacher not assigned".
--
-- This migration adds:
--   1. Student SELECT policy on batch_teachers
--   2. Broader student SELECT policy on profiles (to read teacher names)
--
-- Security:
--   - Students can only read batch_teachers for batches they are enrolled in
--   - Students can only read profiles of teachers assigned to their batches
--   - No UPDATE/DELETE access granted — read-only visibility
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. batch_teachers — Student read policy
-- ════════════════════════════════════════════════════════════════════════════
--
-- Students can read teacher assignments for batches they are actively
-- enrolled in. This allows the "Select a Subject" page to show which
-- teacher is assigned to each batch/subject.
create policy "Students can read batch_teachers for their batches"
  on public.batch_teachers
  for select
  to authenticated
  using (exists (
    select 1 from public.batch_students bs
    where bs.batch_id = batch_teachers.batch_id
      and bs.student_id = public.get_my_student_id()
  ));

comment on policy "Students can read batch_teachers for their batches"
  on public.batch_teachers is
  'Allows students to see which teachers are assigned to batches they belong to. '
  'Required for the student dashboard subject batch screen.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. profiles — Broader student read policy for teacher names
-- ════════════════════════════════════════════════════════════════════════════
--
-- Students can read name and avatar of teachers assigned to their batches.
-- This is needed to display teacher names on batch/subject cards.
-- Users can still only read their own email/phone/role via the existing policy.
--
-- Note: This only grants SELECT — no UPDATE or DELETE.
-- The existing "Users can view their own profile" policy remains for full
-- access to own profile.
create policy "Students can view profiles of teachers in their batches"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.batch_students bs
      join public.batch_teachers bt on bt.batch_id = bs.batch_id
      join public.teacher_details td on td.teacher_id = bt.teacher_id
      where bs.student_id = public.get_my_student_id()
        and bs.status = 'active'
        and td.profile_id = profiles.profile_id
    )
  );

comment on policy "Students can view profiles of teachers in their batches"
  on public.profiles is
  'Allows students to see name/avatar of teachers assigned to batches they '
  'belong to. Required for displaying teacher names on batch/subject cards.';
