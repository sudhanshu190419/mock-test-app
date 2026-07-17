-- ============================================================================
-- Migration: 048 — Atomic Mock Attempt Initialization RPC
--
-- Replaces the client-side N+1 INSERT pattern (createMockAttempt + N×
-- createMockAnswer) with a single atomic database function that:
--
--   1. Checks for an existing in_progress attempt for this student+test
--   2. If found and answers are fully initialised → reuses it
--   3. If found but answers are partially initialised → completes them
--   4. If not found → creates attempt + bulk-inserts all answers atomically
--   5. Uses pg_advisory_xact_lock to serialise concurrent init requests
--
-- The entire operation is one database transaction. If any step fails,
-- everything is rolled back. No orphaned rows, no partial answers.
--
-- Usage (from client):
--   const { data, error } = await supabase.rpc('initialize_mock_attempt', {
--     p_test_id:      'uuid',
--     p_student_id:   'uuid',
--     p_institute_id: 'uuid',
--     p_attempt_limit: integer | null,
--   });
--
-- Returns JSON:
--   On success: { success: true,  attempt_id: 'uuid', reused: bool }
--   On failure: { success: false, error: '...',       code: '...' }
--
-- No schema changes — only adds a function.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- FUNCTION: initialize_mock_attempt
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.initialize_mock_attempt(
  p_test_id       uuid,
  p_student_id    uuid,
  p_institute_id  uuid,
  p_attempt_limit integer default null
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_attempt_id          uuid;
  v_attempt_number      integer;
  v_existing_attempt_id  uuid;
  v_answer_count        integer;
  v_question_count      integer;
  v_in_progress_count   integer;
  v_result              jsonb;
begin
  -- ════════════════════════════════════════════════════════════════════════
  --  AUTHORISATION CHECK
  -- ════════════════════════════════════════════════════════════════════════
  -- Verify the authenticated user owns this student_id. This replaces the
  -- client-side re-resolution that the old createMockAttempt() performed.
  -- Without this check, a compromised client could start an attempt under
  -- another student's identity (SECURITY DEFINER bypasses RLS).
  if not exists (
    select 1
      from public.student_details sd
     where sd.student_id  = p_student_id
       and sd.profile_id  = auth.uid()
  ) then
    return jsonb_build_object(
      'success', false,
      'error',   'Unauthorized: cannot start an attempt for a different student.',
      'code',    'STUDENT_MISMATCH'
    );
  end if;

  -- ════════════════════════════════════════════════════════════════════════
  --  SERIALISATION LOCK
  -- ════════════════════════════════════════════════════════════════════════
  -- Acquire a transaction-level advisory lock keyed to (test_id, student_id).
  -- This serialises all concurrent initialize_mock_attempt calls for the
  -- same test+student pair. The lock is automatically released when the
  -- transaction commits or rolls back.
  perform pg_advisory_xact_lock(
    hashtext(
      coalesce(p_test_id::text, '') || '::' || coalesce(p_student_id::text, '')
    )
  );

  -- ════════════════════════════════════════════════════════════════════════
  --  STEP 1 — Check for existing in_progress attempt
  -- ════════════════════════════════════════════════════════════════════════
  -- 1a — Count how many in_progress attempts exist
  select count(*)
    into v_in_progress_count
    from public.mock_attempts ma
   where ma.test_id     = p_test_id
     and ma.student_id  = p_student_id
     and ma.status      = 'in_progress';

  -- 1b — Warn if multiple in_progress rows exist (should not happen in
  --      normal operation, but could occur from legacy data or manual edits)
  if v_in_progress_count > 1 then
    raise warning 'initialize_mock_attempt: found % in_progress attempts for student % on test %. Selecting the most recent.',
      v_in_progress_count, p_student_id, p_test_id;
  end if;

  -- 1c — Select the most recent attempt deterministically
  select ma.attempt_id
    into v_existing_attempt_id
    from public.mock_attempts ma
   where ma.test_id     = p_test_id
     and ma.student_id  = p_student_id
     and ma.status      = 'in_progress'
   order by ma.started_at desc, ma.attempt_number desc
   limit 1;

  if found then
    -- ── Step 1d — Count existing mock_answers vs expected count ─────────
    select count(*) into v_answer_count
      from public.mock_answers
     where attempt_id = v_existing_attempt_id;

    select count(*) into v_question_count
      from public.mock_test_questions
     where test_id = p_test_id;

    -- ── Step 1e — Complete partial initialisation if needed ─────────────
    if v_answer_count < v_question_count then
      insert into public.mock_answers (attempt_id, question_id, institute_id)
      select v_existing_attempt_id, mtq.question_id, p_institute_id
        from public.mock_test_questions mtq
       where mtq.test_id = p_test_id
         and not exists (
           select 1
             from public.mock_answers ma
            where ma.attempt_id   = v_existing_attempt_id
              and ma.question_id  = mtq.question_id
         );
    end if;

    -- ── Return existing attempt ─────────────────────────────────────────
    v_result := jsonb_build_object(
      'success',    true,
      'attempt_id', v_existing_attempt_id,
      'reused',     true
    );
    return v_result;
  end if;

  -- ════════════════════════════════════════════════════════════════════════
  --  STEP 2 — Compute attempt_number (safe under advisory lock)
  -- ════════════════════════════════════════════════════════════════════════
  select coalesce(max(ma.attempt_number), 0) + 1
    into v_attempt_number
    from public.mock_attempts ma
   where ma.test_id    = p_test_id
     and ma.student_id = p_student_id;

  -- ════════════════════════════════════════════════════════════════════════
  --  STEP 3 — Validate attempt limit
  -- ════════════════════════════════════════════════════════════════════════
  if p_attempt_limit is not null and v_attempt_number > p_attempt_limit then
    v_result := jsonb_build_object(
      'success', false,
      'error',   'You have used ' || (v_attempt_number - 1) || ' of ' ||
                 p_attempt_limit || ' allowed attempt(s) for this test.',
      'code',    'ATTEMPT_LIMIT_REACHED'
    );
    return v_result;
  end if;

  -- ════════════════════════════════════════════════════════════════════════
  --  STEP 4 — Insert the attempt row
  -- ════════════════════════════════════════════════════════════════════════
  insert into public.mock_attempts (
    test_id, student_id, institute_id, attempt_number, status
  ) values (
    p_test_id, p_student_id, p_institute_id, v_attempt_number, 'in_progress'
  )
  returning attempt_id into v_attempt_id;

  -- ════════════════════════════════════════════════════════════════════════
  --  STEP 5 — Bulk insert all mock_answer rows (single INSERT-SELECT)
  -- ════════════════════════════════════════════════════════════════════════
  insert into public.mock_answers (attempt_id, question_id, institute_id)
  select v_attempt_id, mtq.question_id, p_institute_id
    from public.mock_test_questions mtq
   where mtq.test_id = p_test_id;

  -- ════════════════════════════════════════════════════════════════════════
  --  STEP 6 — Return success
  -- ════════════════════════════════════════════════════════════════════════
  v_result := jsonb_build_object(
    'success',    true,
    'attempt_id', v_attempt_id,
    'reused',     false
  );
  return v_result;

exception
  when others then
    v_result := jsonb_build_object(
      'success', false,
      'error',   'Initialization failed: ' || sqlerrm,
      'code',    sqlstate
    );
    return v_result;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  GRANT EXECUTE
-- ════════════════════════════════════════════════════════════════════════════
-- The authenticated user (anon key role) must be able to call this function.
-- SECURITY DEFINER ensures the function runs with the owner's privileges,
-- bypassing RLS for the atomic INSERT operations while still validating
-- that the caller is authenticated.
grant execute on function public.initialize_mock_attempt(uuid, uuid, uuid, integer) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
--  COMMENT
-- ════════════════════════════════════════════════════════════════════════════
comment on function public.initialize_mock_attempt(uuid, uuid, uuid, integer) is
  'Atomic mock attempt initialisation: detects existing in_progress attempts, '
  'recovers partial initialisations, or creates a new attempt with bulk-'
  'inserted mock_answers in a single transaction. Uses pg_advisory_xact_lock '
  'to serialise concurrent calls for the same test+student.';

-- ============================================================================
-- END OF MIGRATION 048
-- ============================================================================
