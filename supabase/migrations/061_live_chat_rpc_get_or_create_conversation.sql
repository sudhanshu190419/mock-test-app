-- ============================================================================
-- Migration: 061 — Live Chat RPC: get_or_create_conversation
--
-- PostgreSQL 16 | Supabase Compatible | Production Ready
--
-- Adds the SECURITY DEFINER RPC function that the client-side service layer
-- (liveChatService.ts) calls when a student opens chat for a live class.
--
-- Depends on: Migration 060 (conversations + messages tables already exist)
--             Domain 01 (profiles, student_details, teacher_details)
--             Domain 04 (live_classes)
--             Existing helper functions (auth.uid, etc.)
--
-- Why this is a separate migration:
--   060 was executed before this function was added. To avoid modifying an
--   already-applied migration, this function ships as a standalone addition.
--
-- Architecture:
--   • SECURITY DEFINER bypasses RLS on conversations (student INSERT policy
--     was intentionally omitted — client should not INSERT directly).
--   • ON CONFLICT DO NOTHING guarantees at most one conversation per class+student.
--   • Resolves student_id from auth.uid() → student_details, and teacher_id
--     from live_classes, so the client doesn't need to provide either.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — SECURITY DEFINER RPC Function
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.get_or_create_conversation(p_class_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id  uuid;
  v_teacher_id  uuid;
  v_result      public.conversations;
begin
  -- 1. Resolve the calling user's student_id from student_details
  select sd.student_id into v_student_id
    from public.student_details sd
   where sd.profile_id = auth.uid();

  if not found then
    raise exception 'Only students can create conversations. No student_details record found for the current user.'
      using hint = 'Ensure the user has a student_details row linked to their profile.';
  end if;

  -- 2. Resolve the teacher_id for this live class
  select lc.teacher_id into v_teacher_id
    from public.live_classes lc
   where lc.class_id = p_class_id;

  if not found then
    raise exception 'Live class not found.'
      using hint = 'The provided class_id does not exist in live_classes.';
  end if;

  -- 3. Upsert — insert if not exists, do nothing on conflict
  insert into public.conversations (class_id, teacher_id, student_id)
  values (p_class_id, v_teacher_id, v_student_id)
  on conflict on constraint uq_conversations_class_student
    do nothing;

  -- 4. Return the conversation (either newly created or pre-existing)
  select * into v_result
    from public.conversations
   where class_id = p_class_id
     and student_id = v_student_id;

  return v_result;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — COMMENT Statements
-- ════════════════════════════════════════════════════════════════════════════

comment on function public.get_or_create_conversation is
  'SECURITY DEFINER RPC — resolves the calling student -> class teacher, then '
  'upserts a conversation row. Uses ON CONFLICT DO NOTHING to guarantee '
  'at most one conversation per class+student. Returns the conversation. '
  'Called by liveChatService.ts when the student opens chat for a live class.';

-- ════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION — 061 Live Chat RPC: get_or_create_conversation
-- ════════════════════════════════════════════════════════════════════════════
