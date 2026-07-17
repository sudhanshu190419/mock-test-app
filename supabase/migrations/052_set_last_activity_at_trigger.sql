-- ─────────────────────────────────────────────────────────────────────
-- Migration 052: Automatic last_activity_at trigger
--
-- Replaces the client-side `new Date().toISOString()` for last_activity_at
-- with a server-authoritative PostgreSQL trigger.
--
-- Previously, the timerSyncService sent both timeRemainingSeconds AND
-- lastActivityAt (from the client clock).  The client clock cannot be
-- trusted — a student could set their device clock forward to neutralise
-- the crash-timer correction.
--
-- Now the trigger function fires on every mock_attempts row update and
-- sets last_activity_at = now() (server time) whenever the
-- time_remaining_seconds column actually changes.  The client only needs
-- to send timeRemainingSeconds — the database handles the rest.
--
-- The initial value of last_activity_at is already set by the
-- initialize_mock_attempt RPC (migration 048/051) on attempt creation.
--
-- Migration 050 created the column.  This migration makes it
-- server-authoritative.
-- ─────────────────────────────────────────────────────────────────────

-- ═════════════════════════════════════════════════════════════════════
--  TRIGGER FUNCTION
-- ═════════════════════════════════════════════════════════════════════
-- Sets last_activity_at = now() when time_remaining_seconds changes.
-- Uses `is distinct from` to handle NULL correctly and avoid no-op writes.

create or replace function public.set_last_activity_at()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.time_remaining_seconds is distinct from old.time_remaining_seconds then
    new.last_activity_at = now();
  end if;
  return new;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════
--  TRIGGER
-- ═════════════════════════════════════════════════════════════════════
-- Fires on every UPDATE of mock_attempts.  Because the function checks
-- for an actual change in time_remaining_seconds, unrelated column
-- updates (status, submitted_at, last_question_id) will not modify
-- last_activity_at unnecessarily.

create trigger trg_mock_attempts_set_last_activity_at
  before update on public.mock_attempts
  for each row
  execute function public.set_last_activity_at();

-- ═════════════════════════════════════════════════════════════════════
--  COMMENTS
-- ═════════════════════════════════════════════════════════════════════

comment on function public.set_last_activity_at() is
  'Trigger function: sets mock_attempts.last_activity_at = now() whenever '
  'time_remaining_seconds changes. Uses is distinct from to correctly handle '
  'NULL → value and value → NULL transitions. Provides crash-safe timer '
  'recovery without trusting the client clock.';

comment on trigger trg_mock_attempts_set_last_activity_at
  on public.mock_attempts is
  'Automatically updates last_activity_at to server now() on every '
  'time_remaining_seconds change. The client only sends the remaining time; '
  'the database is the single source of truth for the activity timestamp.';
