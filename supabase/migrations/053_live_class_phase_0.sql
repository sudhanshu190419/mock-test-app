-- ============================================================================
-- Migration: 053 — Live Class Phase 0: Schema additions
--
-- PostgreSQL 16 | Supabase Compatible | Production Ready
--
-- Adds columns required by the Live Class implementation:
--   1. room_name on live_classes — deterministic LiveKit room identifier
--   2. profile_id on session_participants — allows non-student participants
--      (teachers, admins, moderators) to be logged in the session event log
--
-- Depends on:
--   Migration 005 (Domain 04 — live_classes, session_participants tables)
--   Migration 021 (RLS policies for live tables)
--
-- Idempotent: All statements use IF NOT EXISTS / IF EXISTS guards.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Add room_name to live_classes
-- ════════════════════════════════════════════════════════════════════════════
--
-- Pattern: {institute_slug}-{teacher_id_short}-{class_id_short}
-- Example: iitphysics-tch_a3b-lc_x7k9
--
-- Rules (from Live Class SDD Section 6.1):
--   • Max 64 characters (LiveKit room name limit)
--   • Deterministic from class data (can be re-derived if needed)
--   • Lowercase alphanumeric + hyphens only
--   • No PII in room name
--   • Generated when class is scheduled (not when started)
--   • Never reused — even if a class is cancelled, its room name is retired
--
-- The UNIQUE constraint ensures no two classes share the same room,
-- even across institutes (room names must be globally unique in LiveKit).

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'live_classes'
      and column_name = 'room_name'
  ) then
    alter table public.live_classes
      add column room_name varchar(64) null;
  end if;
end $$;

-- UNIQUE constraint (nullable — only set when class is scheduled)
-- Use a partial index so multiple NULL rows don't violate uniqueness
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'live_classes'
      and indexname = 'uq_live_classes_room_name'
  ) then
    create unique index uq_live_classes_room_name
      on public.live_classes (room_name)
      where room_name is not null;
  end if;
end $$;

-- Index for looking up classes by room name (for webhook correlation)
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'live_classes'
      and indexname = 'idx_live_classes_room_name'
  ) then
    create index idx_live_classes_room_name
      on public.live_classes (room_name);
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — Add profile_id to session_participants
-- ════════════════════════════════════════════════════════════════════════════
--
-- session_participants currently uses student_id (FK → student_details) which
-- only supports student participants.  Adding a nullable profile_id (FK →
-- profiles) allows teachers, admins, and future moderator roles to be logged
-- in the session event log for attendance and audit purposes.
--
-- Relationship: profile_id is an ORM-style denormalisation that avoids a
-- separate "non-student participant" table.  At least one of student_id or
-- profile_id must be populated for any given row (enforced via CHECK).

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'session_participants'
      and column_name = 'profile_id'
  ) then
    alter table public.session_participants
      add column profile_id uuid null;

    -- FK constraint (nullable — student participants use student_id)
    alter table public.session_participants
      add constraint fk_session_participants_profile
        foreign key (profile_id) references public.profiles (profile_id)
        on delete restrict
        on update restrict;
  end if;
end $$;

-- Ensure at least one identifier is populated
do $$ begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'ck_session_participants_identifier'
  ) then
    alter table public.session_participants
      add constraint ck_session_participants_identifier
        check (student_id is not null or profile_id is not null);
  end if;
end $$;

-- Index for querying participants by profile_id
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'session_participants'
      and indexname = 'idx_session_participants_profile_id'
  ) then
    create index idx_session_participants_profile_id
      on public.session_participants (profile_id);
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — RLS policy for profile_id on session_participants
-- ════════════════════════════════════════════════════════════════════════════
--
-- Extends the existing RLS policies (migration 021, section 6e) to include
-- profile_id-based access for non-student participants (teachers, admins).
-- Students still use the existing student_id-based policy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'session_participants'
      and policyname = 'Participants can read their own session_participants via profile_id'
  ) then
    create policy "Participants can read their own session_participants via profile_id"
      on public.session_participants
      for select
      to authenticated
      using (profile_id = auth.uid());
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — Comments
-- ════════════════════════════════════════════════════════════════════════════

comment on column public.live_classes.room_name is
  'Deterministic LiveKit room name. Pattern: {institute_slug}-{teacher_short}-{class_short}. '
  'Set when class is scheduled. Never reused. Max 64 characters.';

comment on column public.session_participants.profile_id is
  'FK to profiles.profile_id. Alternative to student_id for non-student '
  'participants (teachers, admins, moderators). At least one of student_id '
  'or profile_id must be set.';

comment on index uq_live_classes_room_name is
  'Ensures room_name uniqueness across all rows where it is non-null. '
  'Partial index allows multiple NULL rows (unscheduled classes).';

-- ════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 053
-- ════════════════════════════════════════════════════════════════════════════
