-- ============================================================================
-- Patch: 038 — Fix weak/strong chapters RPCs (column ca.percentage does not
--               exist — PG error 42703)
--
-- PostgreSQL 16 | Supabase Compatible | Idempotent (CREATE OR REPLACE)
--
-- Root cause: Both get_student_weak_chapters() and get_student_strong_chapters()
-- referenced `ca.percentage` in the ORDER BY clause inside json_agg(). However,
-- `percentage` is computed ONLY inside the json_build_object() call as a CASE
-- expression — it is NOT a column of the `chapter_agg` CTE. This caused
-- PostgreSQL error 42703 ("column ca.percentage does not exist").
--
-- Fix: Replaced `ca.percentage` with the identical CASE expression that
-- computes the percentage from `ca.total_score / ca.max_score`.
--
-- Fixed functions:
--   1. get_student_weak_chapters()   — ORDER BY percentage ASC  (weakest first)
--   2. get_student_strong_chapters() — ORDER BY percentage DESC (strongest first)
--
-- Verification after applying:
--   select public.get_student_weak_chapters();
--   select public.get_student_strong_chapters();
--   → Both should return a JSON array without errors.
--
-- @module patches/038
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- get_student_weak_chapters()
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.get_student_weak_chapters()
returns json
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_student_id uuid;
begin
  -- ── Resolve the caller's student_id from the auth session ────────────
  v_student_id := public.get_my_student_id();

  if v_student_id is null then
    return json_build_object(
      'error', 'Authenticated user is not a student or has no student_details row.'
    );
  end if;

  -- ── Return chapters ordered weakest → strongest ─────────────────────
  return (
    with
      student_attempts as (
        select a.attempt_id
        from public.mock_attempts a
        where a.student_id = v_student_id
          and a.status in ('submitted', 'timed_out')
      ),
      answer_details as (
        select
          ma.question_id,
          ma.is_correct,
          ma.is_answered,
          ma.marks_awarded,
          ma.time_spent_seconds,
          q.chapter_id,
          q.subject_id,
          mtq.marks as question_marks
        from public.mock_answers ma
        join public.mock_attempts a
          on a.attempt_id = ma.attempt_id
        join public.questions q
          on q.question_id = ma.question_id
        join public.mock_test_questions mtq
          on mtq.test_id = a.test_id
         and mtq.question_id = ma.question_id
        where a.attempt_id in (select attempt_id from student_attempts)
      ),
      chapter_agg as (
        select
          ad.chapter_id,
          ch.name as chapter_name,
          ad.subject_id,
          sub.name as subject_name,
          count(*) filter (where ad.is_answered = true)                  as questions_attempted,
          count(*) filter (where ad.is_correct = true)                   as correct_count,
          count(*) filter (where ad.is_correct = false and ad.is_answered = true) as wrong_count,
          count(*) filter (where ad.is_answered = false)                  as skipped_count,
          coalesce(sum(ad.marks_awarded) filter (where ad.is_answered = true), 0) as total_score,
          coalesce(sum(ad.question_marks) filter (where ad.is_answered = true), 0) as max_score,
          round(
            coalesce(
              avg(ad.time_spent_seconds) filter (where ad.is_answered = true),
              0
            ), 2
          )                                                               as avg_time_per_question
        from answer_details ad
        join public.chapters ch
          on ch.chapter_id = ad.chapter_id
        join public.subjects sub
          on sub.subject_id = ad.subject_id
        group by ad.chapter_id, ch.name, ad.subject_id, sub.name
      )
    select json_agg(
      json_build_object(
        'chapter_id',                           ca.chapter_id,
        'chapter_name',                         ca.chapter_name,
        'subject_id',                           ca.subject_id,
        'subject_name',                         ca.subject_name,
        'questions_attempted',                  ca.questions_attempted,
        'correct_count',                        ca.correct_count,
        'wrong_count',                          ca.wrong_count,
        'skipped_count',                        ca.skipped_count,
        'accuracy',                             case
          when (ca.correct_count + ca.wrong_count) > 0
          then round(
            (ca.correct_count::numeric / (ca.correct_count + ca.wrong_count)) * 100, 2
          )
          else null
        end,
        'total_score',                          ca.total_score,
        'max_score',                            ca.max_score,
        'percentage',                           case
          when ca.max_score > 0
          then round((ca.total_score / ca.max_score) * 100, 2)
          else 0
        end,
        'average_time_per_question_seconds',    case
          when ca.avg_time_per_question > 0 then ca.avg_time_per_question
          else null
        end
      )
      -- FIX: replaced ca.percentage (non-existent column) with the actual expression
      order by (case when ca.max_score > 0 then round((ca.total_score / ca.max_score) * 100, 2) else 0 end) asc nulls last
    )
    from chapter_agg ca
    where ca.questions_attempted > 0
  );
end;
$$;

comment on function public.get_student_weak_chapters() is
  'Returns a JSON array of chapters ordered from weakest to strongest based '
  'on total_score for the authenticated student. Only includes chapters with '
  'at least 1 attempted question. Each element has the same shape as '
  'get_student_chapter_analytics(). The student_id is resolved from the '
  'session via get_my_student_id(). SECURITY DEFINER ensures RLS bypass for '
  'aggregated reads, but the caller can only see their own data.';

-- ════════════════════════════════════════════════════════════════════════════
-- get_student_strong_chapters()
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.get_student_strong_chapters()
returns json
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_student_id uuid;
begin
  -- ── Resolve the caller's student_id from the auth session ────────────
  v_student_id := public.get_my_student_id();

  if v_student_id is null then
    return json_build_object(
      'error', 'Authenticated user is not a student or has no student_details row.'
    );
  end if;

  -- ── Return chapters ordered strongest → weakest ─────────────────────
  return (
    with
      student_attempts as (
        select a.attempt_id
        from public.mock_attempts a
        where a.student_id = v_student_id
          and a.status in ('submitted', 'timed_out')
      ),
      answer_details as (
        select
          ma.question_id,
          ma.is_correct,
          ma.is_answered,
          ma.marks_awarded,
          ma.time_spent_seconds,
          q.chapter_id,
          q.subject_id,
          mtq.marks as question_marks
        from public.mock_answers ma
        join public.mock_attempts a
          on a.attempt_id = ma.attempt_id
        join public.questions q
          on q.question_id = ma.question_id
        join public.mock_test_questions mtq
          on mtq.test_id = a.test_id
         and mtq.question_id = ma.question_id
        where a.attempt_id in (select attempt_id from student_attempts)
      ),
      chapter_agg as (
        select
          ad.chapter_id,
          ch.name as chapter_name,
          ad.subject_id,
          sub.name as subject_name,
          count(*) filter (where ad.is_answered = true)                  as questions_attempted,
          count(*) filter (where ad.is_correct = true)                   as correct_count,
          count(*) filter (where ad.is_correct = false and ad.is_answered = true) as wrong_count,
          count(*) filter (where ad.is_answered = false)                  as skipped_count,
          coalesce(sum(ad.marks_awarded) filter (where ad.is_answered = true), 0) as total_score,
          coalesce(sum(ad.question_marks) filter (where ad.is_answered = true), 0) as max_score,
          round(
            coalesce(
              avg(ad.time_spent_seconds) filter (where ad.is_answered = true),
              0
            ), 2
          )                                                               as avg_time_per_question
        from answer_details ad
        join public.chapters ch
          on ch.chapter_id = ad.chapter_id
        join public.subjects sub
          on sub.subject_id = ad.subject_id
        group by ad.chapter_id, ch.name, ad.subject_id, sub.name
      )
    select json_agg(
      json_build_object(
        'chapter_id',                           ca.chapter_id,
        'chapter_name',                         ca.chapter_name,
        'subject_id',                           ca.subject_id,
        'subject_name',                         ca.subject_name,
        'questions_attempted',                  ca.questions_attempted,
        'correct_count',                        ca.correct_count,
        'wrong_count',                          ca.wrong_count,
        'skipped_count',                        ca.skipped_count,
        'accuracy',                             case
          when (ca.correct_count + ca.wrong_count) > 0
          then round(
            (ca.correct_count::numeric / (ca.correct_count + ca.wrong_count)) * 100, 2
          )
          else null
        end,
        'total_score',                          ca.total_score,
        'max_score',                            ca.max_score,
        'percentage',                           case
          when ca.max_score > 0
          then round((ca.total_score / ca.max_score) * 100, 2)
          else 0
        end,
        'average_time_per_question_seconds',    case
          when ca.avg_time_per_question > 0 then ca.avg_time_per_question
          else null
        end
      )
      -- FIX: replaced ca.percentage (non-existent column) with the actual expression
      order by (case when ca.max_score > 0 then round((ca.total_score / ca.max_score) * 100, 2) else 0 end) desc nulls last
    )
    from chapter_agg ca
    where ca.questions_attempted > 0
  );
end;
$$;

comment on function public.get_student_strong_chapters() is
  'Returns a JSON array of chapters ordered from strongest to weakest based '
  'on total_score for the authenticated student. Only includes chapters with '
  'at least 1 attempted question. Each element has the same shape as '
  'get_student_chapter_analytics(). The student_id is resolved from the '
  'session via get_my_student_id(). SECURITY DEFINER ensures RLS bypass for '
  'aggregated reads, but the caller can only see their own data.';

-- ════════════════════════════════════════════════════════════════════════════
-- END OF PATCH — 038 Fix weak/strong chapters percentage
-- ════════════════════════════════════════════════════════════════════════════
