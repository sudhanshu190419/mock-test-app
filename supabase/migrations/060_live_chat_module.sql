-- ============================================================================
-- Migration: 060 — Live Chat Module
--
-- PostgreSQL 16 | Supabase Compatible | Production Ready
--
-- Tables: conversations · messages
--
-- Depends on: Domain 01 (profiles, teacher_details, student_details)
--             Domain 04 (live_classes)
--             Existing helper functions (set_updated_at, is_admin, is_teacher,
--               is_student, get_my_teacher_id, get_my_student_id)
--             Supabase realtime infrastructure
--
-- Order:
--   1. Tables (parent → child: conversations → messages)
--   2. Indexes (after all tables exist)
--   3. Triggers (after all tables exist; set_updated_at already exists from
--      Domain 01 — do not recreate)
--   4. Enable RLS + Create policies
--   5. Realtime publication
--   6. Comments
--
-- Chat Architecture:
--   • One private Teacher ↔ Student conversation per Live Class per Student.
--   • Students can only view and write to their own conversation.
--   • Teachers can view and reply to every student's conversation for their
--     own live classes.
--   • No group chat. No student-to-student messaging. No media attachments.
--     Plain text only.
--   • Realtime enabled on messages for live in-class chat updates.
--
-- Reference: Live Chat MVP Specification v1.0
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — CREATE TABLE Statements
-- ════════════════════════════════════════════════════════════════════════════
-- Chat hierarchy:
--   live_classes (1) ── conversations (M) ── messages (M)
--                       teacher_id (FK)
--                       student_id (FK)

-- 1a. Table: conversations
-- Represents one private chat channel between a teacher and a student for a
-- specific live class. The UNIQUE (class_id, student_id) constraint guarantees
-- exactly one conversation per class-student pair. conversation_id is the
-- stable reference used by the messages table and by Realtime subscriptions.
create table public.conversations (
  conversation_id  uuid          not null  default gen_random_uuid(),
  class_id         uuid          not null,
  teacher_id       uuid          not null,
  student_id       uuid          not null,
  created_at       timestamptz   not null  default now(),
  updated_at       timestamptz   not null  default now(),

  -- Primary Key
  constraint pk_conversations primary key (conversation_id),

  -- Foreign Keys
  constraint fk_conversations_class
    foreign key (class_id) references public.live_classes (class_id)
    on delete restrict
    on update restrict,

  constraint fk_conversations_teacher
    foreign key (teacher_id) references public.teacher_details (teacher_id)
    on delete restrict
    on update restrict,

  constraint fk_conversations_student
    foreign key (student_id) references public.student_details (student_id)
    on delete restrict
    on update restrict,

  -- Unique Constraints
  constraint uq_conversations_class_student unique (class_id, student_id)
);

-- 1b. Table: messages
-- The actual chat messages within a conversation. CASCADE delete ensures
-- messages are removed when a parent conversation is deleted (admin cleanup).
-- sender_profile_id references profiles (not student/teacher details) so
-- either role can be the sender uniformly. Only plain text is stored — no
-- file uploads, images, or voice messages. Read receipts will be added in
-- a future iteration.
create table public.messages (
  message_id         uuid          not null  default gen_random_uuid(),
  conversation_id    uuid          not null,
  sender_profile_id  uuid          not null,
  message            text          not null,
  created_at         timestamptz   not null  default now(),

  -- Primary Key
  constraint pk_messages primary key (message_id),

  -- Foreign Keys
  constraint fk_messages_conversation
    foreign key (conversation_id) references public.conversations (conversation_id)
    on delete cascade
    on update restrict,

  constraint fk_messages_sender
    foreign key (sender_profile_id) references public.profiles (profile_id)
    on delete restrict
    on update restrict,

  -- CHECK Constraints
  constraint ck_messages_message_not_empty check (char_length(trim(message)) >= 1)
);

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — Indexes
-- ════════════════════════════════════════════════════════════════════════════
-- All indexes are created after their respective tables exist.
-- No duplicate indexes on columns already covered by UNIQUE constraints.

-- 2a. conversations indexes
-- Teacher dashboard: load all conversations across their classes, newest first
create index if not exists idx_conversations_teacher_updated
  on public.conversations (teacher_id, updated_at desc);

-- Student dashboard: load their conversations across classes, newest first
create index if not exists idx_conversations_student_updated
  on public.conversations (student_id, updated_at desc);

-- Per-class teacher view: fetch every conversation for a live class
create index if not exists idx_conversations_class_teacher
  on public.conversations (class_id, teacher_id);

-- Note: uq_conversations_class_student covers (class_id, student_id) lookups.

-- 2b. messages indexes
-- Chronological message fetch for a conversation (Realtime + initial load)
create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at asc);

-- Lookup all messages sent by a specific profile
create index if not exists idx_messages_sender_profile
  on public.messages (sender_profile_id, created_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — CREATE TRIGGER Statements
-- ════════════════════════════════════════════════════════════════════════════
-- set_updated_at() already exists from Domain 01 — do not recreate.
-- messages has no updated_at column (append-only — immutable after insert).

-- 3a. conversations triggers
create trigger trg_conversations_set_updated_at
  before update on public.conversations
  for each row
  execute function public.set_updated_at();

-- 3b. Auto-update conversations.updated_at when a new message is inserted
-- Ensures the conversation's updated_at always reflects the latest activity
-- without relying on the application layer to touch both tables. This enables
-- efficient "recent conversations" ordering for both teacher and student.
create or replace function public.trgfn_conversations_touch_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
     set updated_at = now()
   where conversation_id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_conversations_touch_on_message
  after insert on public.messages
  for each row
  execute function public.trgfn_conversations_touch_on_message();

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 3B — SECURITY DEFINER Functions (RPC)
-- ════════════════════════════════════════════════════════════════════════════
-- Called by the client-side service layer (liveChatService.ts) when a
-- student opens chat for a class. Bypasses RLS to INSERT a conversation
-- since the student INSERT policy has been intentionally removed (client
-- should not create conversations directly).

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
  -- 1. Resolve the calling user's student_id
  select sd.student_id into v_student_id
    from public.student_details sd
   where sd.profile_id = auth.uid();

  if not found then
    raise exception 'Only students can create conversations.'
      using hint = 'The current user does not have a student_details record.';
  end if;

  -- 2. Resolve the teacher_id for this live class
  select lc.teacher_id into v_teacher_id
    from public.live_classes lc
   where lc.class_id = p_class_id;

  if not found then
    raise exception 'Live class not found.'
      using hint = 'The provided class_id does not exist.';
  end if;

  -- 3. Upsert: return existing conversation or create a new one
  insert into public.conversations (class_id, teacher_id, student_id)
  values (p_class_id, v_teacher_id, v_student_id)
  on conflict on constraint uq_conversations_class_student
    do nothing;

  select * into v_result
    from public.conversations
   where class_id = p_class_id
     and student_id = v_student_id;

  return v_result;
end;
$$;

comment on function public.get_or_create_conversation is
  'SECURITY DEFINER RPC — resolves the calling student -> class teacher, then '
  'upserts a conversation row. Uses ON CONFLICT DO NOTHING to guarantee '
  'at most one conversation per class+student. Returns the conversation.';

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — Row Level Security
-- ═════════════════════════──────────────────────────────────────────────────

-- 4a. Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 4A — Conversations Policies
-- ════════════════════════════════════════════════════════════════════════════

-- Students: SELECT their own conversation only
create policy "Students can select their own conversations"
  on public.conversations
  for select
  to authenticated
  using (student_id = public.get_my_student_id());

-- Teachers: SELECT conversations for their own live classes
-- Uses EXISTS because the teacher is authenticated via teacher_details and the
-- conversation's class_id must belong to that teacher.
create policy "Teachers can select conversations for their classes"
  on public.conversations
  for select
  to authenticated
  using (exists (
    select 1 from public.live_classes lc
    where lc.class_id = conversations.class_id
    and lc.teacher_id = public.get_my_teacher_id()
  ));

-- Teachers: INSERT conversations for their own live classes
-- The teacher_id column on conversations must match the teacher's own ID,
-- and the class_id must belong to that teacher.
create policy "Teachers can insert conversations for their classes"
  on public.conversations
  for insert
  to authenticated
  with check (
    teacher_id = public.get_my_teacher_id()
    and exists (
      select 1 from public.live_classes lc
      where lc.class_id = conversations.class_id
      and lc.teacher_id = public.get_my_teacher_id()
    )
  );

-- Admins: full access to conversations
create policy "Admins have full access to conversations"
  on public.conversations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 4B — Messages Policies
-- ════════════════════════════════════════════════════════════════════════════

-- Students: SELECT messages in their own conversations
-- Joins through conversations to verify ownership via student_id.
create policy "Students can select messages in their own conversations"
  on public.messages
  for select
  to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.conversation_id = messages.conversation_id
    and c.student_id = public.get_my_student_id()
  ));

-- Students: INSERT messages into their own conversations only
-- The sender must be the student's profile, and the conversation must belong
-- to that student. This prevents a student from sending messages into another
-- student's conversation.
create policy "Students can insert messages into their own conversations"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_profile_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.conversation_id = messages.conversation_id
      and c.student_id = public.get_my_student_id()
    )
  );

-- Teachers: SELECT messages in conversations for their own live classes
-- Joins through conversations → live_classes to verify teacher ownership.
create policy "Teachers can select messages for their class conversations"
  on public.messages
  for select
  to authenticated
  using (exists (
    select 1 from public.conversations c
    join public.live_classes lc on lc.class_id = c.class_id
    where c.conversation_id = messages.conversation_id
    and lc.teacher_id = public.get_my_teacher_id()
  ));

-- Teachers: INSERT messages into conversations for their own live classes
-- The sender must be the teacher's profile, and the conversation must belong
-- to a class the teacher owns. This gives the teacher the ability to reply
-- to every student while maintaining isolation.
create policy "Teachers can insert messages into their class conversations"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_profile_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.live_classes lc on lc.class_id = c.class_id
      where c.conversation_id = messages.conversation_id
      and lc.teacher_id = public.get_my_teacher_id()
    )
  );

-- Admins: full access to messages
create policy "Admins have full access to messages"
  on public.messages
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 5 — Realtime Configuration
-- ════════════════════════════════════════════════════════════════════════════
-- Enable logical replication for the messages table so that Supabase Realtime
-- can broadcast new messages to connected clients (students and teachers).
-- The messages table's REPLICA IDENTITY defaults to PRIMARY KEY (message_id),
-- which is correct for Realtime's change data capture.

-- 5a. Add messages table to the default Supabase Realtime publication
-- The publication is created automatically by Supabase during project setup.
-- This ALTER statement is idempotent — it will silently succeed if the table
-- is already part of the publication.
alter publication supabase_realtime add table public.messages;

-- Note: conversations is intentionally NOT added to the Realtime publication.
-- Clients subscribe to messages via conversation_id, and the conversation's
-- updated_at is updated by the trigger. Subscribing to the conversations table
-- directly is unnecessary and would add overhead.

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 6 — COMMENT Statements
-- ════════════════════════════════════════════════════════════════════════════

-- 6a. Table comments
comment on table public.conversations is
  'One private Teacher ↔ Student chat channel per Live Class. The UNIQUE '
  '(class_id, student_id) constraint guarantees at most one conversation per '
  'class-student pair. Students can only see their own conversation; teachers '
  'can see all conversations for their classes. updated_at is auto-maintained '
  'by a trigger when new messages arrive, enabling efficient conversation list '
  'ordering.';

comment on table public.messages is
  'Individual chat messages within a conversation. CASCADE delete removes '
  'messages when the parent conversation is deleted. sender_profile_id '
  'references profiles (not student/teacher details) for uniform sender '
  'handling across roles. Only plain text is stored — no attachments. '
  'Realtime is enabled on this table for live in-class chat updates.';

-- 6b. Column comments — conversations
comment on column public.conversations.class_id is
  'FK to live_classes. The live class this conversation belongs to. '
  'Conversations are scoped per class — when the class ends, the chat '
  'becomes read-only (enforced at the application layer).';

comment on column public.conversations.teacher_id is
  'FK to teacher_details. The teacher participating in this conversation. '
  'Denormalized for efficient RLS filtering — teachers can see all '
  'conversations WHERE teacher_id = their own.';

comment on column public.conversations.student_id is
  'FK to student_details. The student participating in this conversation. '
  'Used for RLS isolation — students can only access conversations WHERE '
  'student_id = their own.';

comment on column public.conversations.created_at is
  'UTC timestamp when the conversation was first created (first time the '
  'student opened chat for this class).';

comment on column public.conversations.updated_at is
  'UTC timestamp of the most recent message in this conversation. '
  'Auto-updated by trg_conversations_touch_on_message trigger on every '
  'new message insert. Enables efficient "recent conversations first" '
  'ordering for both teacher and student dashboards.';

-- 6c. Column comments — messages
comment on column public.messages.conversation_id is
  'FK to conversations with ON DELETE CASCADE. When a conversation is '
  'deleted (admin cleanup), all its messages are automatically removed.';

comment on column public.messages.sender_profile_id is
  'FK to profiles. The profile who sent this message — can be either a '
  'student or a teacher. Uses profile_id (not student/teacher details) '
  'so the sender column works uniformly regardless of the sender role.';

comment on column public.messages.message is
  'The plain text content of the message. Must be at least 1 non-whitespace '
  'character (validated via trim()). No file uploads, images, voice messages, '
  'or rich formatting — only plain text as per the MVP specification.';

comment on column public.messages.created_at is
  'UTC immutable timestamp of when the message was sent. Set once at '
  'insert and never changed — messages are append-only. Used for '
  'chronological ordering in the chat UI.';

-- 6d. Constraint comments
comment on constraint uq_conversations_class_student on public.conversations is
  'Enforces the business rule: one conversation per Live Class per Student. '
  'Prevents duplicate conversation rows from race conditions when both '
  'student and teacher open chat simultaneously.';

comment on constraint ck_messages_message_not_empty on public.messages is
  'Message body must contain at least 1 non-whitespace character (validated '
  'via char_length(trim(message)) >= 1). Prevents empty and whitespace-only '
  'messages from being inserted by buggy clients or API calls.';

-- 6e. Trigger comments
comment on trigger trg_conversations_touch_on_message on public.messages is
  'Auto-updates public.conversations.updated_at to now() whenever a new '
  'message is inserted. Eliminates the need for the application layer to '
  'manually update the conversation timestamp on every message send.';

-- ════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION — 060 Live Chat Module
-- ════════════════════════════════════════════════════════════════════════════
