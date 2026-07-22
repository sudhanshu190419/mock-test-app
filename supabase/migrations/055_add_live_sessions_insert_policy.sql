-- ============================================================================
-- Migration: 055 — Add Teacher INSERT Policy on live_sessions
--
-- Root cause:
--   live_sessions has only two policies:
--     1. Teachers can SELECT live_sessions for their classes
--     2. Admins have FULL access (SELECT + INSERT + UPDATE + DELETE)
--
--   When a teacher (non-admin) tries to INSERT a new live session,
--   neither policy grants INSERT permission:
--     - Policy 1 is FOR SELECT only
--     - Policy 2 covers INSERT but requires is_admin() = true
--
--   Result: "new row violates row-level security policy for table 'live_sessions'"
--
-- Fix:
--   Add a FOR INSERT WITH CHECK policy that mirrors the existing SELECT policy.
--   A teacher may insert a live_sessions row only if the referenced
--   live_classes.teacher_id equals get_my_teacher_id().
-- ============================================================================

create policy "Teachers can insert live_sessions for their classes"
  on public.live_sessions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.live_classes lc
      where lc.class_id = live_sessions.class_id
        and lc.teacher_id = public.get_my_teacher_id()
    )
  );

-- ============================================================================
-- Verification (run after applying migration in Supabase SQL Editor):
--
--   -- As a non-admin teacher:
--   set local "request.jwt.claim.sub" to '<teacher-profile-uuid>';
--   insert into public.live_sessions (class_id, institute_id, provider, status, started_at)
--   values ('<own-class-id>', '<institute-id>', 'livekit', 'live', now());
--   -- Expected: insert succeeds (1 row)
--
--   -- As a non-admin teacher trying to insert for another teacher's class:
--   set local "request.jwt.claim.sub" to '<teacher-profile-uuid>';
--   insert into public.live_sessions (class_id, institute_id, provider, status, started_at)
--   values ('<other-teachers-class-id>', '<institute-id>', 'livekit', 'live', now());
--   -- Expected: insert denied by RLS
-- ============================================================================
