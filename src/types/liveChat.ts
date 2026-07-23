/**
 * Live Chat Types
 *
 * UI-layer type definitions for the Teacher ↔ Student Live Chat module.
 * Mirrors the PostgreSQL schema from migration 060 (conversations + messages)
 * and maps snake_case database columns to camelCase TypeScript properties.
 *
 * @module types/liveChat
 */

// ═════════════════════════════════════════════════════════════════
//  Main Models
// ═════════════════════════════════════════════════════════════════

/**
 * A private Teacher ↔ Student chat channel scoped to one Live Class.
 *
 * The UNIQUE (class_id, student_id) constraint guarantees at most one
 * conversation per class-student pair. updated_at is auto-maintained
 * by a trigger whenever a new message is inserted.
 */
export interface Conversation {
  /** Primary key. */
  conversationId: string;
  /** FK → live_classes. The live class this conversation belongs to. */
  classId: string;
  /** FK → teacher_details. The teacher participating in this conversation. */
  teacherId: string;
  /** FK → student_details. The student participating in this conversation. */
  studentId: string;
  /** UTC timestamp of creation. */
  createdAt: string;
  /** UTC timestamp of the most recent message. Auto-updated by trigger. */
  updatedAt: string;
}

/**
 * A single chat message within a conversation.
 *
 * Messages are append-only — no UPDATE or DELETE policies exist for
 * students or teachers. Only plain text is stored; read receipts will
 * be added in a future iteration.
 */
export interface Message {
  /** Primary key. */
  messageId: string;
  /** FK → conversations. ON DELETE CASCADE. */
  conversationId: string;
  /** FK → profiles. The sender — can be either a student or a teacher. */
  senderProfileId: string;
  /** The plain text content. Must be at least 1 non-whitespace character. */
  message: string;
  /** UTC immutable timestamp of when the message was sent. */
  createdAt: string;
}

// ═════════════════════════════════════════════════════════════════
//  Extended Models (with resolved relations)
// ═════════════════════════════════════════════════════════════════

/**
 * A conversation with resolved teacher and student profile names.
 *
 * Used by the teacher dashboard to display student names alongside
 * conversations, and by the student UI to show the teacher's name.
 */
export interface ConversationWithDetails extends Conversation {
  /** Resolved teacher display name from profiles. */
  teacherName: string;
  /** Resolved student display name from profiles. */
  studentName: string;
}

/**
 * A conversation item in the teacher's conversation list.
 *
 * Includes a preview of the last message for inline display,
 * sorted by latest activity (updated_at descending).
 */
export interface TeacherConversationItem {
  /** Conversation primary key. */
  conversationId: string;
  /** Student's display name (resolved via student_details → profiles). */
  studentName: string;
  /** Student's UUID (student_details.student_id). */
  studentId: string;
  /** Preview of the most recent message body. */
  lastMessage: string | null;
  /** ISO 8601 timestamp of the last message or conversation creation. */
  lastMessageAt: string;
  /** Total messages in this conversation. */
  messageCount: number;
}

// ═════════════════════════════════════════════════════════════════
//  Input Types
// ═════════════════════════════════════════════════════════════════

/**
 * Input for sending a new chat message.
 */
export interface SendMessageInput {
  /** The conversation to send the message to. */
  conversationId: string;
  /** The plain text message body. Trimmed before insert. */
  message: string;
}

// ═════════════════════════════════════════════════════════════════
//  Realtime Types
// ═════════════════════════════════════════════════════════════════

/**
 * Callback type for the Realtime message subscription.
 * Receives the new message payload whenever it is broadcast.
 */
export type MessageSubscriptionCallback = (message: Message) => void;

/**
 * Return type from the Realtime subscription function.
 * Call `unsubscribe()` to clean up the subscription and prevent
 * duplicate listeners.
 */
export interface MessageSubscription {
  /** Removes the Realtime channel listener. Call on component unmount. */
  unsubscribe: () => void;
}
