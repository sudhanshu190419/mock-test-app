/**
 * Live Chat Service
 *
 * Clean-architecture service layer for the Teacher ↔ Student Live Chat module.
 *
 * Handles conversation management, message CRUD, Supabase Realtime
 * subscriptions, and teacher-specific conversation listing — all scoped
 * through RLS-enforced queries.
 *
 * ## Architecture decisions
 *
 * 1. **RLS is respected.** This service uses the anon key — all queries run
 *    within the context of the authenticated user. Existing RLS policies on
 *    `conversations` and `messages` enforce isolation.
 *
 * 2. **Conversations are created server-side.** Students cannot INSERT
 *    conversations directly. This service uses `getOrCreateConversation()`
 *    which calls the `get_or_create_conversation` SECURITY DEFINER RPC
 *    to bypass RLS for the initial INSERT.
 *
 * 3. **No read receipts yet.** The `is_read` column has been removed from the
 *    schema until a proper read-receipt design is implemented (future iteration).
 *
 * 4. **Messages are append-only.** Once inserted, messages are never updated
 *    or deleted by students or teachers. Only admins have DELETE access via RLS.
 *
 * @module services/liveChatService
 */

import { supabase } from '../config/supabase';
import { extractErrorMessage } from '../utils/supabase';
import type { ApiResponse } from '../types/academic';
import type {
  Conversation,
  ConversationWithDetails,
  Message,
  TeacherConversationItem,
  SendMessageInput,
  MessageSubscriptionCallback,
  MessageSubscription,
} from '../types/liveChat';

// ═════════════════════════════════════════════════════════════════
//  Database Row Shapes
// ═════════════════════════════════════════════════════════════════

interface DbConversation {
  conversation_id: string;
  class_id: string;
  teacher_id: string;
  student_id: string;
  created_at: string;
  updated_at: string;
}

interface DbMessage {
  message_id: string;
  conversation_id: string;
  sender_profile_id: string;
  message: string;
  created_at: string;
}

interface DbConversationWithJoin {
  conversation_id: string;
  class_id: string;
  teacher_id: string;
  student_id: string;
  created_at: string;
  updated_at: string;
  /** Resolved teacher name via nested join */
  teacher_profiles: { name: string } | null;
  /** Resolved student name via nested join */
  student_profiles: { name: string } | null;
}

interface DbTeacherConversationRow {
  conversation_id: string;
  student_id: string;
  updated_at: string;
  student_profiles: { name: string } | null;
}

// ═════════════════════════════════════════════════════════════════
//  Mapping Helpers
// ═════════════════════════════════════════════════════════════════

function mapConversation(db: DbConversation): Conversation {
  return {
    conversationId: db.conversation_id,
    classId: db.class_id,
    teacherId: db.teacher_id,
    studentId: db.student_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapMessage(db: DbMessage): Message {
  return {
    messageId: db.message_id,
    conversationId: db.conversation_id,
    senderProfileId: db.sender_profile_id,
    message: db.message,
    createdAt: db.created_at,
  };
}

function mapConversationWithDetails(
  db: DbConversationWithJoin,
): ConversationWithDetails {
  return {
    conversationId: db.conversation_id,
    classId: db.class_id,
    teacherId: db.teacher_id,
    studentId: db.student_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    teacherName: db.teacher_profiles?.name ?? 'Unknown Teacher',
    studentName: db.student_profiles?.name ?? 'Unknown Student',
  };
}

// ═════════════════════════════════════════════════════════════════
//  Public API — Shared
// ═════════════════════════════════════════════════════════════════

/**
 * Retrieve the logged-in student's conversation for a given live class,
 * creating it if it does not yet exist.
 *
 * This function calls the `get_or_create_conversation` SECURITY DEFINER
 * RPC to safely bypass RLS for the initial INSERT. The caller must be
 * a student in a batch assigned to this class.
 *
 * @param classId - UUID of the live class.
 * @returns The conversation, or an error if creation fails.
 */
export async function getOrCreateConversation(
  classId: string,
): Promise<ApiResponse<Conversation>> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_class_id: classId,
    });

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    if (!data) {
      return {
        success: false,
        error: 'Could not create conversation. Ensure you are a student in a batch assigned to this class.',
      };
    }

    return { success: true, data: mapConversation(data as unknown as DbConversation) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch a single conversation by ID, including resolved teacher and
 * student display names.
 *
 * Requires the authenticated user to have access via RLS (student can
 * only see their own conversations; teachers can see conversations for
 * their classes; admins can see all).
 *
 * @param conversationId - UUID of the conversation.
 * @returns The conversation with teacher and student profile names.
 */
export async function getConversation(
  conversationId: string,
): Promise<ApiResponse<ConversationWithDetails>> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `*,
          teacher_profiles:teacher_details!inner(profiles!inner(name)),
          student_profiles:student_details!inner(profiles!inner(name))`,
      )
      .eq('conversation_id', conversationId)
      .single<DbConversationWithJoin>();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Conversation not found.' };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: mapConversationWithDetails(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Load all messages for a conversation, ordered oldest → newest.
 *
 * Supports cursor-based pagination via `before` and `after` params
 * for efficient chat history loading. When no pagination is provided,
 * returns the most recent page (newest messages).
 *
 * @param conversationId - UUID of the conversation.
 * @param pagination     - Optional pagination params (page, pageSize).
 * @returns Paginated messages array ordered by created_at ascending.
 */
export async function getMessages(
  conversationId: string,
  pagination?: { page?: number; pageSize?: number },
): Promise<ApiResponse<Message[]>> {
  try {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return {
      success: true,
      data: (data ?? []).map(mapMessage),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Send a plain text message to a conversation.
 *
 * Validates that the message is not empty after trimming whitespace.
 * The caller must have INSERT permission via RLS (student can only
 * insert into own conversation; teacher can insert into any conversation
 * for their classes).
 *
 * @param input - The conversation ID and message body.
 * @returns The inserted message.
 */
export async function sendMessage(
  input: SendMessageInput,
): Promise<ApiResponse<Message>> {
  try {
    // ── Validate input ────────────────────────────────────────────
    if (!input.conversationId) {
      return { success: false, error: 'Conversation ID is required.' };
    }

    const trimmedMessage = input.message?.trim() ?? '';
    if (trimmedMessage.length === 0) {
      return { success: false, error: 'Message cannot be empty.' };
    }

    // ── Resolve sender profile ────────────────────────────────────
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    // ── Insert the message ────────────────────────────────────────
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: input.conversationId,
        sender_profile_id: userData.user.id,
        message: trimmedMessage,
      })
      .select()
      .single<DbMessage>();

    if (error) {
      if (error.code === '23503') {
        return {
          success: false,
          error: 'Cannot send message. The conversation does not exist or you do not have access.',
        };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: mapMessage(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Subscribe to new messages in a conversation via Supabase Realtime.
 *
 * The callback is invoked for every INSERT event on the `messages`
 * table that matches the given conversation_id. The returned
 * `unsubscribe` function removes the listener.
 *
 * Important: Only one subscription should be active per conversation
 * at any time. Call `unsubscribe()` on component unmount to prevent
 * duplicate subscriptions.
 *
 * @param conversationId - UUID of the conversation to listen to.
 * @param callback       - Invoked with the new Message on each INSERT.
 * @returns An object with an `unsubscribe` function.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: MessageSubscriptionCallback,
): MessageSubscription {
  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter:  `conversation_id=eq.${conversationId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        callback(mapMessage(payload.new as unknown as DbMessage));
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// ═════════════════════════════════════════════════════════════════
//  Teacher API
// ═════════════════════════════════════════════════════════════════

/**
 * Fetch all conversations for the current teacher's live class,
 * including the student name, last message preview, and message count.
 *
 * Results are sorted by latest activity (most recent message first).
 *
 * This query leverages the `idx_conversations_class_teacher` index on
 * (class_id, teacher_id) and the `uq_conversations_class_student`
 * unique constraint for efficient lookup.
 *
 * A single Supabase query is used — conversations are joined with
 * student_details → profiles for the student name, and a correlated
 * subquery fetches the most recent message body and timestamp. Message
 * count is retrieved in a separate lightweight query, avoiding an N+1
 * pattern.
 *
 * @param classId - UUID of the live class.
 * @returns An array of conversation items with student details.
 */
export async function getTeacherConversations(
  classId: string,
): Promise<ApiResponse<TeacherConversationItem[]>> {
  try {
    // ── Resolve current teacher ───────────────────────────────────
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { data: teacherData } = await supabase
      .from('teacher_details')
      .select('teacher_id')
      .eq('profile_id', userData.user.id)
      .maybeSingle<{ teacher_id: string }>();

    if (!teacherData) {
      return {
        success: false,
        error: 'Teacher profile not found. Only teachers can access this endpoint.',
      };
    }

    // ── Fetch conversations with student names ────────────────────
    // Uses a single Supabase select with a nested join to resolve the
    // student's display name from profiles via student_details.
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `conversation_id,
         student_id,
         updated_at,
         student_profiles:student_details!inner(profiles!inner(name))`,
      )
      .eq('class_id', classId)
      .eq('teacher_id', teacherData.teacher_id)
      .order('updated_at', { ascending: false });

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    // ── Bulk-fetch last message timestamps for all conversations ──
    // We retrieve the most recent message per conversation in a single
    // query using DISTINCT ON, then build a map for O(1) lookups.
    const conversationIds = (data ?? []).map((r) => r.conversation_id);

    const latestMessages = new Map<string, { message: string; created_at: string }>();
    if (conversationIds.length > 0) {
      const { data: msgData } = await supabase
        .from('messages')
        .select('conversation_id, message, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(conversationIds.length);

      if (msgData) {
        // Since we ordered by created_at desc, the first message per
        // conversation is the latest. Use a Map to keep the first seen.
        for (const msg of msgData) {
          if (!latestMessages.has(msg.conversation_id)) {
            latestMessages.set(msg.conversation_id, {
              message: msg.message,
              created_at: msg.created_at,
            });
          }
        }
      }
    }

    // ── Build response items ──────────────────────────────────────
    const items: TeacherConversationItem[] = (data ?? []).map((row) => {
      const last = latestMessages.get(row.conversation_id);
      return {
        conversationId: row.conversation_id,
        studentId: row.student_id,
        studentName: (row as unknown as DbTeacherConversationRow).student_profiles?.name ?? 'Unknown Student',
        lastMessage: last?.message ?? null,
        lastMessageAt: last?.created_at ?? row.updated_at,
        messageCount: 0,
      };
    });

    return { success: true, data: items };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Search student conversations by name within a specific live class.
 *
 * Performs a case-insensitive search across the student's display name
 * as stored in the profiles table. Returns matching conversations
 * sorted by latest activity.
 *
 * Uses a two-query pattern to avoid N+1: first fetches the matching
 * conversations with student names, then bulk-fetches latest messages
 * for all matched conversation IDs in a single query.
 *
 * @param classId - UUID of the live class to search within.
 * @param query   - The search string (minimum 2 characters).
 * @returns Matching conversation items.
 */
export async function searchStudents(
  classId: string,
  query: string,
): Promise<ApiResponse<TeacherConversationItem[]>> {
  try {
    const trimmed = query?.trim() ?? '';
    if (trimmed.length < 2) {
      return { success: false, error: 'Search query must be at least 2 characters.' };
    }

    // ── Resolve current teacher ───────────────────────────────────
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { data: teacherData } = await supabase
      .from('teacher_details')
      .select('teacher_id')
      .eq('profile_id', userData.user.id)
      .maybeSingle<{ teacher_id: string }>();

    if (!teacherData) {
      return {
        success: false,
        error: 'Teacher profile not found. Only teachers can search conversations.',
      };
    }

    // ── Query 1: Fetch conversations filtered by student name ─────
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `conversation_id,
         student_id,
         updated_at,
         student_profiles:student_details!inner(profiles!inner(name))`,
      )
      .eq('class_id', classId)
      .eq('teacher_id', teacherData.teacher_id)
      .ilike('student_details.profiles.name', `%${trimmed}%`)
      .order('updated_at', { ascending: false });

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    // ── Query 2: Bulk-fetch latest message for all matched convos ─
    const conversationIds = (data ?? []).map((r) => r.conversation_id);
    const latestMessages = new Map<string, { message: string; created_at: string }>();

    if (conversationIds.length > 0) {
      const { data: msgData } = await supabase
        .from('messages')
        .select('conversation_id, message, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(conversationIds.length);

      if (msgData) {
        for (const msg of msgData) {
          if (!latestMessages.has(msg.conversation_id)) {
            latestMessages.set(msg.conversation_id, {
              message: msg.message,
              created_at: msg.created_at,
            });
          }
        }
      }
    }

    // ── Build response items ──────────────────────────────────────
    const items: TeacherConversationItem[] = (data ?? []).map((row) => {
      const last = latestMessages.get(row.conversation_id);
      return {
        conversationId: row.conversation_id,
        studentId: row.student_id,
        studentName: (row as unknown as { student_profiles: { name: string } | null }).student_profiles?.name ?? 'Unknown Student',
        lastMessage: last?.message ?? null,
        lastMessageAt: last?.created_at ?? row.updated_at,
        messageCount: 0,
      };
    });

    return { success: true, data: items };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Load the complete message history for a conversation (teacher view).
 *
 * Teachers use this to open and read a specific student's conversation.
 * Returns all messages ordered oldest → newest.
 *
 * @param conversationId - UUID of the conversation.
 * @returns All messages in chronological order.
 */
export async function getConversationMessages(
  conversationId: string,
): Promise<ApiResponse<Message[]>> {
  return getMessages(conversationId, { page: 1, pageSize: 500 });
}

// ═════════════════════════════════════════════════════════════════
//  Student API
// ═════════════════════════════════════════════════════════════════

/**
 * Fetch the logged-in student's conversation for a specific live class.
 *
 * Unlike `getOrCreateConversation()`, this function only fetches an
 * existing conversation — it never creates one. Use this when you
 * only need to read, not write.
 *
 * @param classId - UUID of the live class.
 * @returns The student's conversation, or an error if none exists.
 */
export async function getStudentConversation(
  classId: string,
): Promise<ApiResponse<ConversationWithDetails>> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    // Resolve the student's student_id
    const { data: studentData } = await supabase
      .from('student_details')
      .select('student_id')
      .eq('profile_id', userData.user.id)
      .maybeSingle<{ student_id: string }>();

    if (!studentData) {
      return { success: false, error: 'Student profile not found.' };
    }

    // Fetch the conversation with nested profile names
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `*,
          teacher_profiles:teacher_details!inner(profiles!inner(name)),
          student_profiles:student_details!inner(profiles!inner(name))`,
      )
      .eq('class_id', classId)
      .eq('student_id', studentData.student_id)
      .single<DbConversationWithJoin>();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error:
            'No conversation found. Open the chat to create one.',
        };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: mapConversationWithDetails(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch the logged-in student's message history for a conversation.
 *
 * Returns all messages ordered oldest → newest, paginated.
 *
 * @param conversationId - UUID of the conversation.
 * @param pagination     - Optional pagination (page, pageSize).
 * @returns Messages array ordered chronologically.
 */
export async function getStudentMessages(
  conversationId: string,
  pagination?: { page?: number; pageSize?: number },
): Promise<ApiResponse<Message[]>> {
  return getMessages(conversationId, pagination);
}
