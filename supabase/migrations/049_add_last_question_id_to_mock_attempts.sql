-- ─────────────────────────────────────────────────────────────────────
-- Migration 049: Add last_question_id to mock_attempts
--
-- This column tracks the last question the student was viewing during
-- an active attempt.  On resume, the test engine can open the same
-- question instead of starting from question 1.
--
-- The column is set on every navigation event (Next, Previous, Jump,
-- Mark & Next, Save & Next) and read during resume.
-- ─────────────────────────────────────────────────────────────────────

alter table public.mock_attempts
  add column last_question_id uuid
  constraint fk_mock_attempts_last_question
    references public.mock_questions (question_id)
    on delete set null;

comment on column public.mock_attempts.last_question_id is
  'The last question the student viewed (set on every navigation). '
  'Used by the resume flow to restore the student''s position. '
  'Nullable because the attempt may have just been created with no '
  'navigation yet.';
