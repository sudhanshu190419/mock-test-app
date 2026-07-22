-- ============================================================================
-- Migration: 058 — Add Student Read Policy for teacher_details
--
-- PostgreSQL 16 | Supabase Compatible | Production Ready
--
-- Problem
-- -------
-- The student dashboard's CourseBatchDetail screen shows "Teacher not assigned"
-- even when a teacher IS assigned to the batch. The `getCourseBatches()`
-- service queries:
--
--   batch_teachers → teacher_details!inner → profiles!inner (name)
--
-- While batch_teachers and profiles now have student SELECT policies (via
-- migrations 056/057), teacher_details has NO student read policy. The
-- existing policies only allow:
--   - Teachers to read their own teacher_details
--   - Admins full access
--
-- The `!inner` join on teacher_details silently fails (returns null) when
-- the student has no SELECT permission, causing teacher names to appear
-- as null → "Teacher not assigned".
--
-- Solution
-- --------
-- 1. Create a SECURITY DEFINER helper function that checks if the current
--    student is enrolled in a batch taught by the given teacher.
-- 2. Add a student SELECT policy on teacher_details using this helper.
--
-- The helper runs as SECURITY DEFINER to bypass RLS on batch_students and
-- batch_teachers, preventing the same recursion that migration 057 fixed.
--
-- Security is preserved because:
--   - The function filters by get_my_student_id() (bound to auth.uid())
--   - Students can only see teachers in batches they are enrolled in
--   - No expanded access — same logical restriction
--   - Only SELECT is granted; UPDATE/DELETE remain restricted
--
-- Depends on:
--   Migration 021 (get_my_student_id, get_my_teacher_id)
--   Migration 057 (is_student_enrolled_in_batch, batch_teachers student
--                  policy — the batch_teachers query must succeed first)
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Create SECURITY DEFINER Helper Function
-- ════════════════════════════════════════════════════════════════════════════

-- Check if the current student is allowed to read a teacher_details record.
-- Returns TRUE when the student is enrolled in at least one batch that the
-- given teacher is assigned to.
--
-- Performs the batch_students → batch_teachers join entirely inside SECURITY
-- DEFINER context, bypassing RLS on both tables to prevent recursion.
create or replace function public.is_student_allowed_to_read_teacher(
  p_teacher_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.batch_students bs
    join public.batch_teachers bt on bt.batch_id = bs.batch_id
    where bs.student_id = public.get_my_student_id()
      and bt.teacher_id = p_teacher_id
      and bs.status = 'active'
  );
$$;

comment on function public.is_student_allowed_to_read_teacher(uuid) is
  'SECURITY DEFINER. Returns TRUE if the current student is enrolled in at '
  'least one batch to which the given teacher is assigned. Bypasses RLS on '
  'batch_students and batch_teachers to prevent recursion. Used by the '
  'student SELECT policy on teacher_details.';

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — Add Student SELECT Policy on teacher_details
-- ════════════════════════════════════════════════════════════════════════════
--
-- Students can read teacher_details for teachers assigned to any of their
-- batches. This allows the CourseBatchDetail screen to resolve teacher names
-- via the teacher_details!inner join.
--
-- Only SELECT is granted — no UPDATE or DELETE.
-- Existing policies for teachers and admins are unchanged.

create policy "Students can read teacher_details for their batches"
  on public.teacher_details
  for select
  to authenticated
  using (public.is_student_allowed_to_read_teacher(teacher_id));

comment on policy "Students can read teacher_details for their batches"
  on public.teacher_details is
  'Non-recursive. Calls is_student_allowed_to_read_teacher() SECURITY DEFINER '
  'helper. Students can only see details of teachers assigned to batches they '
  'are enrolled in. Only SELECT — no UPDATE or DELETE.';

-- ════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION — 058 Add Student Read Policy for teacher_details
-- ════════════════════════════════════════════════════════════════════════════
