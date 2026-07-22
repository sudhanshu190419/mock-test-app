-- ============================================================================
-- Migration: 057 — Fix RLS Infinite Recursion
--
-- PostgreSQL 16 | Supabase Compatible | Production Ready
--
-- Problem
-- -------
-- Migration 056 added a student SELECT policy on batch_teachers that queries
-- batch_students. This created a mutual recursion with the existing teacher
-- SELECT policy on batch_students (from migration 021) that queries
-- batch_teachers.
--
--   batch_teachers student policy → SELECT FROM batch_students
--       ↓ (triggers RLS on batch_students)
--   batch_students teacher policy → SELECT FROM batch_teachers
--       ↓ (triggers RLS on batch_teachers)
--   INFINITE RECURSION
--
-- The profiles student policy from 056 also joins both tables, amplifying the
-- same cycle.
--
-- Solution
-- --------
-- 1. Create SECURITY DEFINER helper functions that directly query the
--    underlying tables WITHOUT triggering RLS re-evaluation.
-- 2. Drop the 3 recursive policies.
-- 3. Recreate them using the helper functions.
--
-- SECURITY DEFINER causes the function to run with the privileges of the
-- function owner (typically supabase_admin), bypassing RLS on the tables
-- queried inside the function. This is the standard PostgreSQL pattern for
-- breaking RLS recursion.
--
-- Security is preserved because:
--   - The functions still filter by get_my_student_id() / get_my_teacher_id()
--     (which are themselves SECURITY DEFINER and bound to auth.uid())
--   - Students can only see teachers in THEIR OWN batches
--   - Teachers can only see students in THEIR OWN batches
--   - No expanded access — same logic, non-recursive execution
--
-- Depends on:
--   Migration 021 (existing helper functions get_my_student_id,
--                  get_my_teacher_id, is_admin, is_teacher, is_student)
--   Migration 056 (the recursive policies we are replacing)
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Drop Recursive Policies
-- ════════════════════════════════════════════════════════════════════════════
-- Drop all policies that create the recursion cycle. They will be recreated
-- in Section 3 using SECURITY DEFINER helper functions.

drop policy if exists "Students can read batch_teachers for their batches"
  on public.batch_teachers;

drop policy if exists "Teachers can read batch_students for their batches"
  on public.batch_students;

drop policy if exists "Students can view profiles of teachers in their batches"
  on public.profiles;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — Create SECURITY DEFINER Helper Functions
-- ════════════════════════════════════════════════════════════════════════════
-- Each function:
--   - Is SECURITY DEFINER (runs as owner, bypasses RLS)
--   - Has SET search_path = '' (prevents search-path hijacking)
--   - Is marked STABLE (read-only, safe for RLS policy USING clauses)
--   - Accepts the row-level identifier as a parameter
--   - Returns a boolean that the policy can evaluate directly

-- 2a. Check if the current authenticated user is a teacher assigned to a
--     specific batch. Bypasses RLS on batch_teachers to prevent recursion
--     when used in the batch_students teacher policy.
create or replace function public.is_teacher_assigned_to_batch(p_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.batch_teachers bt
    where bt.batch_id = p_batch_id
      and bt.teacher_id = public.get_my_teacher_id()
  );
$$;

comment on function public.is_teacher_assigned_to_batch(uuid) is
  'SECURITY DEFINER. Returns TRUE if the current user is a teacher assigned '
  'to the given batch. Bypasses RLS on batch_teachers to prevent recursion '
  'when used in policies on batch_students.';

-- 2b. Check if the current authenticated user is a student enrolled in a
--     specific batch. Bypasses RLS on batch_students to prevent recursion
--     when used in the batch_teachers student policy.
create or replace function public.is_student_enrolled_in_batch(p_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.batch_students bs
    where bs.batch_id = p_batch_id
      and bs.student_id = public.get_my_student_id()
  );
$$;

comment on function public.is_student_enrolled_in_batch(uuid) is
  'SECURITY DEFINER. Returns TRUE if the current user is a student enrolled '
  'in the given batch. Bypasses RLS on batch_students to prevent recursion '
  'when used in policies on batch_teachers.';

-- 2c. Check if the current student is allowed to read a specific profile
--     because it belongs to a teacher in one of their active batches.
--     Performs the full join chain (batch_students → batch_teachers →
--     teacher_details) entirely inside SECURITY DEFINER context, bypassing
--     RLS on all three tables.
create or replace function public.is_student_allowed_to_read_teacher_profile(
  p_profile_id uuid
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
    join public.teacher_details td on td.teacher_id = bt.teacher_id
    where bs.student_id = public.get_my_student_id()
      and bs.status = 'active'
      and td.profile_id = p_profile_id
  );
$$;

comment on function public.is_student_allowed_to_read_teacher_profile(uuid) is
  'SECURITY DEFINER. Returns TRUE if the given profile_id belongs to a '
  'teacher assigned to one of the current student''s active batches. '
  'Performs the full batch_students → batch_teachers → teacher_details join '
  'chain inside SECURITY DEFINER context, bypassing RLS on all three tables '
  'to prevent recursion.';

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — Recreate Policies Using SECURITY DEFINER Helpers
-- ════════════════════════════════════════════════════════════════════════════
-- The USING clause evaluates the helper function for each row. Because the
-- function runs as SECURITY DEFINER, the inner table queries do NOT trigger
-- RLS re-evaluation, breaking the recursion cycle.

-- 3a. batch_teachers — Student read policy
--     Students can see which teachers are assigned to batches they belong to.
--     Used by the "Select a Subject" (CourseBatchDetail) screen.
create policy "Students can read batch_teachers for their batches"
  on public.batch_teachers
  for select
  to authenticated
  using (public.is_student_enrolled_in_batch(batch_id));

comment on policy "Students can read batch_teachers for their batches"
  on public.batch_teachers is
  'Non-recursive. Calls is_student_enrolled_in_batch() SECURITY DEFINER '
  'helper instead of querying batch_students directly.';

-- 3b. batch_students — Teacher read policy
--     Teachers can see students enrolled in batches they teach.
--     Used by the teacher dashboard.
create policy "Teachers can read batch_students for their batches"
  on public.batch_students
  for select
  to authenticated
  using (public.is_teacher_assigned_to_batch(batch_id));

comment on policy "Teachers can read batch_students for their batches"
  on public.batch_students is
  'Non-recursive. Calls is_teacher_assigned_to_batch() SECURITY DEFINER '
  'helper instead of querying batch_teachers directly.';

-- 3c. profiles — Student read policy for teacher names
--     Students can see the name and avatar of teachers assigned to their
--     active batches. Used by batch/subject cards on the dashboard.
create policy "Students can view profiles of teachers in their batches"
  on public.profiles
  for select
  to authenticated
  using (public.is_student_allowed_to_read_teacher_profile(profile_id));

comment on policy "Students can view profiles of teachers in their batches"
  on public.profiles is
  'Non-recursive. Calls is_student_allowed_to_read_teacher_profile() SECURITY '
  'DEFINER helper instead of querying batch_students/batch_teachers directly.';

-- ════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION — 057 Fix RLS Recursion
-- ════════════════════════════════════════════════════════════════════════════
