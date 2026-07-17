-- ─────────────────────────────────────────────────────────────────────
-- Migration 050: Add last_activity_at to mock_attempts
--
-- Tracks the UTC timestamp of the last client timer sync. The
-- initialize_mock_attempt RPC uses this column to compute the effective
-- remaining time on resume after a crash:
--
--   effective_remaining = stored_remaining - (NOW() - last_activity_at)
--
-- Without this column, a student who kills the app and returns hours
-- later would receive the stale time_remaining_seconds value, gaining
-- unlimited extra exam time (the crash-recovery vulnerability).
--
-- The column is updated on every timer sync (every 30 seconds) and on
-- background/foreground transitions via the timerSyncService. It uses
-- client timestamps (ISO 8601 string → timestamptz cast) for simplicity;
-- the elapsed-time calculation in the RPC uses server-side NOW() which
-- is the authoritative clock.
-- ─────────────────────────────────────────────────────────────────────

alter table public.mock_attempts
  add column last_activity_at timestamptz;

comment on column public.mock_attempts.last_activity_at is
  'UTC timestamp of the last client timer sync. Used by the resume flow '
  'to compute the effective remaining time after a crash. Updated every '
  '30 seconds by the timer sync service. NULL for inactive/expired '
  'attempts or for attempts created before this column existed.';

-- ═════════════════════════════════════════════════════════════════════
-- Backfill: set last_activity_at to started_at for existing in_progress
-- attempts that have a non-null time_remaining_seconds.
-- ═════════════════════════════════════════════════════════════════════
update public.mock_attempts
   set last_activity_at = started_at
 where status = 'in_progress'
   and time_remaining_seconds is not null
   and last_activity_at is null;
