-- ============================================================================
-- Migration: 046 — Add Courses Read Policy for 'user' Role
--
-- PostgreSQL 16 | Supabase Compatible | Production Ready
--
-- Adds a dedicated RLS policy on the `courses` table so that authenticated
-- users with `role = 'user'` can SELECT published courses in their institute.
--
-- This is the second step (after migration 045 which added the 'user' value
-- to the user_role enum) of supporting pre-onboarding user accounts that can
-- browse and purchase courses before being upgraded to 'student'.
--
-- Why a dedicated policy instead of modifying is_student()?
--   Modifying is_student() to also accept 'user' would grant student-level
--   read access across ALL tables that depend on is_student():
--     • mock_tests, questions, question_options, question_explanations
--     • content (free preview and approved content)
--     • pyq_packages, pyq_papers, pyq_question_mappings
--     • live_classes, recordings
--     • batch_students, attendance, attendance_events
--     • performance_reports, subject_performances, chapter_performances
--     • progress_history, orders, order_items, payments, invoices
--     • subscriptions, student_subscriptions, student_pyq_purchases
--     • session_participants, attendance_events
--     • student_bookmarks, student_downloads, student_doubts
--     • and more...
--   That is a large and unnecessary scope expansion. A dedicated policy
--   scoped to only the `courses` table is safer, more precise, and
--   self-documenting.
--
-- Dependencies:
--   Migration 045 (user_role enum now has 'user')
--   public.courses table (Domain 16 — Course Management Core)
--   public.get_my_institute_id() (Domain 01)
--
-- Safety:
--   Idempotent — the policy is created with a unique name, so DROP IF EXISTS
--   is used before CREATE to allow safe re-runs.
--
-- Reference: Phase 1B — Role Migration Impact Analysis
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- Add RLS Policy for 'user' Role on public.courses
-- ════════════════════════════════════════════════════════════════════════════
-- Grants SELECT access to published, non-deleted courses for authenticated
-- users whose profile role is 'user'. Follows the same pattern as the
-- existing "Students can read published courses" policy but uses a direct
-- role check for 'user' instead of the is_student() helper.

DROP POLICY IF EXISTS "Users can read published courses"
ON public.courses;

CREATE POLICY "Users can read published courses"
ON public.courses
FOR SELECT
TO authenticated
    using (
      status = 'published'::course_status
      and deleted_at is null
      and institute_id = public.get_my_institute_id()
      and exists (
        select 1 from public.profiles
        where profile_id = auth.uid()
          and role = 'user'::public.user_role
      )
    );


-- ════════════════════════════════════════════════════════════════════════════
-- Verification Query (for reference — run manually if needed)
-- ════════════════════════════════════════════════════════════════════════════
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'courses'
-- ORDER BY policyname;

-- ════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION — 046
-- ════════════════════════════════════════════════════════════════════════════
