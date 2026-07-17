-- ============================================================================
-- Migration: 051 — Server-Authoritative Timer Recovery
--
-- Updates the initialize_mock_attempt RPC to compute the effective remaining
-- time using server-side NOW() and the last_activity_at column.
--
-- Previously, the RPC returned { success, attempt_id, reused } and the client
-- independently read time_remaining_seconds from the DB.  After a crash, the
-- stored value was stale — the student could gain unlimited extra time.
--
-- Now the RPC:
--   1. Sets last_activity_at = now() when creating NEW attempts
--   2. When REUSING an existing attempt, computes:
--        effective_remaining_seconds := GREATEST(0,
--          time_remaining_seconds - EXTRACT(EPOCH FROM now() - last_activity_at))
--   3. Returns effective_remaining_seconds and is_expired alongside attempt_id
--
-- The client uses effective_remaining_seconds (not the raw stored value) to
-- restore the timer on resume, eliminating the crash-recovery vulnerability.
-- ============================================================================

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
  v_attempt_id                 uuid;
  v_attempt_number             integer;
  v_existing_attempt_id        uuid;
  v_answer_count               integer;
  v_question_count             integer;
  v_in_progress_count          integer;
  v_stored_remaining           integer;
  v_last_activity_at           timestamptz;
  v_effective_remaining        integer;
  v_is_expired                 boolean;
  v_remaining_attempts         integer;
  v_total_attempts             bigint;
  v_result                     jsonb;
begin
  -- ════════════════════════════════════════════════════════════════════════
  --  AUTHORISATION CHECK
  -- ════════════════════════════════════════════════════════════════════════
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

  -- 1b — Warn if multiple in_progress rows exist
  if v_in_progress_count > 1 then
    raise warning 'initialize_mock_attempt: found % in_progress attempts for student % on test %. Selecting the most recent.',
      v_in_progress_count, p_student_id, p_test_id;
  end if;

  -- 1c — Select the most recent attempt deterministically
  select ma.attempt_id,
         ma.time_remaining_seconds,
         ma.last_activity_at
    into v_existing_attempt_id,
         v_stored_remaining,
         v_last_activity_at
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

    -- ════════════════════════════════════════════════════════════════════
    --  STEP 1f — Compute effective remaining time (server-authoritative)
    -- ════════════════════════════════════════════════════════════════════
    --
    --   effective_remaining := stored_remaining - (now() - last_activity_at)
    --
    -- This is the CORE of the crash-recovery fix. If the student killed
    -- the app 30 minutes ago, the stored time_remaining_seconds is stale.
    -- We subtract the real wall-clock elapsed time since last_activity_at
    -- using server NOW(), which cannot be manipulated by the client.
    --
    -- Edge cases:
    --   - If last_activity_at is NULL (legacy data before migration 050),
    --     we trust the stored value and skip the correction.
    --   - If effective_remaining <= 0, the attempt is expired.
    --   - If effective_remaining > stored_remaining, we clamp to stored
    --     (this should never happen, but is a safe guard).
    --
    if v_last_activity_at is not null and v_stored_remaining is not null then
      v_effective_remaining := v_stored_remaining - (
        extract(epoch from now() - v_last_activity_at)
      )::integer;

      -- Clamp: never go below zero, never exceed stored value
      v_effective_remaining := greatest(0, least(v_stored_remaining, v_effective_remaining));
      v_is_expired := (v_effective_remaining <= 0);
    else
      -- No last_activity_at — trust stored value (legacy fallback)
      v_effective_remaining := v_stored_remaining;
      v_is_expired := false;
    end if;

    -- ════════════════════════════════════════════════════════════════════
    --  STEP 1g — Auto-close expired attempts
    -- ════════════════════════════════════════════════════════════════════
    -- If the timer has expired while the student was away, transition the
    -- attempt to 'timed_out' atomically within this transaction.  This
    -- eliminates the infinite "Test Time Expired" loop where the student
    -- can never start a new attempt because the expired attempt remains
    -- in_progress forever.
    --
    -- This is safe under the advisory lock acquired in Step 0 — no
    -- concurrent session can create a new attempt while we finalize this
    -- one.  On the next RPC call, this attempt will no longer match
    -- WHERE status = 'in_progress', so a new attempt will be created
    -- (or ATTEMPT_LIMIT_REACHED returned if the limit is exhausted).
    --
    -- The status 'timed_out' requires submitted_at IS NOT NULL
    -- (enforced by ck_mock_attempts_status_submitted).
    if v_is_expired then
      update public.mock_attempts
         set status               = 'timed_out',
             submitted_at         = now(),
             time_remaining_seconds = 0
       where attempt_id = v_existing_attempt_id;

      -- ════════════════════════════════════════════════════════════════════
      --  STEP 1h — Compute remaining attempts for the expired UI
      -- ════════════════════════════════════════════════════════════════════
      -- The client needs to know whether the student can start another
      -- attempt.  Compute remaining (including the one just closed, which
      -- still counts toward the limit).
      --   - NULL attempt_limit → unlimited (v_remaining_attempts = -1)
      --   - Otherwise          → max(0, limit - total_attempts)
      select count(*)
        into v_total_attempts
        from public.mock_attempts ma
       where ma.test_id    = p_test_id
         and ma.student_id = p_student_id;

      if p_attempt_limit is not null then
        v_remaining_attempts := greatest(0, p_attempt_limit - v_total_attempts::integer);
      else
        v_remaining_attempts := -1;  -- unlimited
      end if;
    end if;

    -- ── Return existing attempt with server-corrected timer ─────────────
    v_result := jsonb_build_object(
      'success',                   true,
      'attempt_id',                v_existing_attempt_id,
      'reused',                    true,
      'effective_remaining_seconds', v_effective_remaining,
      'is_expired',                v_is_expired
    );

    -- Add remaining_attempts only when expired (UI needs it)
    if v_is_expired then
      v_result := v_result || jsonb_build_object('remaining_attempts', v_remaining_attempts);
    end if;
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
  --  STEP 4 — Insert the attempt row (initialise last_activity_at = now())
  -- ════════════════════════════════════════════════════════════════════════
  insert into public.mock_attempts (
    test_id, student_id, institute_id, attempt_number, status,
    last_activity_at
  ) values (
    p_test_id, p_student_id, p_institute_id, v_attempt_number, 'in_progress',
    now()
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
  --  STEP 6 — Return success (new attempt, effective_remaining not applicable)
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
--  COMMENT
-- ════════════════════════════════════════════════════════════════════════════
comment on function public.initialize_mock_attempt(uuid, uuid, uuid, integer) is
  'Atomic mock attempt initialisation with server-authoritative timer recovery. '
  'Creates or reuses an in_progress attempt. When reusing, computes the effective '
  'remaining time as: stored_remaining - (now() - last_activity_at) to eliminate '
  'the crash-recovery timer vulnerability. Returns effective_remaining_seconds '
  'and is_expired alongside attempt_id and reused.';
