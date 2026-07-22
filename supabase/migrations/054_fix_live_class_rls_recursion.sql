-- ============================================================================
-- Migration: 054 — Fix Infinite RLS Recursion on live_classes
--
-- Root cause:
--   live_classes teacher policy   → direct comparison via SECURITY DEFINER
--   live_classes student policy   → subquery to live_class_batch
--   live_class_batch teacher policy → subquery to live_classes
--                                   → INFINITE LOOP
--
-- When a teacher queries live_classes, PostgreSQL evaluates ALL policies.
-- The student policy queries live_class_batch, which queries live_classes
-- again via its teacher policy → infinite recursion.
--
-- Fix:
--   Rewrite the live_class_batch teacher policy to use batch_teachers
--   instead of live_classes. A teacher who teaches a batch (batch_teachers)
--   should see which classes are assigned to that batch (live_class_batch).
--   This is semantically equivalent but breaks the recursion cycle because
--   batch_teachers has a simple direct-comparison policy
--   (teacher_id = public.get_my_teacher_id()) with no subquery.
-- ============================================================================

-- ── Drop the recursive teacher policy on live_class_batch ──────────────────
drop policy if exists "Teachers can read live_class_batch for their classes"
  on public.live_class_batch;

-- ── Create the fixed policy using batch_teachers instead of live_classes ──
-- New approach: instead of checking "does this class belong to me?"
--   by querying live_classes (which triggers RLS on live_classes),
--   check "does any batch I teach have this class assigned?"
--   by querying batch_teachers (which has a safe direct-comparison policy).
create policy "Teachers can read live_class_batch for their classes"
  on public.live_class_batch
  for select
  to authenticated
  using (exists (
    select 1 from public.batch_teachers bt
    where bt.batch_id = live_class_batch.batch_id
    and bt.teacher_id = public.get_my_teacher_id()
  ));

-- ============================================================================
-- Verification queries (run after applying migration):
--
-- Test that a teacher can SELECT from live_classes:
--   set local "request.jwt.claim.sub" to '<teacher-profile-uuid>';
--   select * from public.live_classes limit 1;
--
-- Test that no recursion occurs for live_class_batch:
--   set local "request.jwt.claim.sub" to '<teacher-profile-uuid>';
--   select * from public.live_class_batch limit 1;
--
-- Expected: both queries succeed without "infinite recursion" error.
-- ============================================================================
