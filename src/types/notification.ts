/**
 * Notification Types
 *
 * UI-layer type definitions for the in-app notification system.
 * Designed to map cleanly to a Supabase notifications table — replace
 * the mock service later without changing any type imports.
 *
 * @module types/notification
 */

// ═════════════════════════════════════════════════════════════════
//  Enums & Unions
// ═════════════════════════════════════════════════════════════════

/** Supported notification categories. */
export type NotificationType =
  | 'mock-test'
  | 'result'
  | 'live-class'
  | 'course'
  | 'payment'
  | 'announcement'
  | 'reminder'
  | 'system';

/** Priority level for a notification. */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/** Action type — determines navigation destination when tapped. */
export type NotificationActionType =
  | 'mockTestDetails'
  | 'testResult'
  | 'courseDetails'
  | 'liveClassDetails'
  | 'paymentDetails'
  | 'announcementDetails'
  | 'profile'
  | 'systemAlert'
  | 'deepLink';

/** Time-based section grouping. */
export type NotificationSectionKey = 'today' | 'yesterday' | 'earlier';

// ═════════════════════════════════════════════════════════════════
//  Main Model
// ═════════════════════════════════════════════════════════════════

/**
 * A single notification item.
 *
 * Every field is optional-only where a sensible default can be inferred,
 * making it easy to map from a Supabase row without null-check boilerplate.
 */
export interface Notification {
  /** Unique notification identifier. */
  id: string;
  /** Notification title (bold heading). */
  title: string;
  /** Notification body / description text. */
  description: string;
  /** Category icon key. */
  type: NotificationType;
  /** Whether the user has read this notification. */
  isRead: boolean;
  /** ISO-8601 timestamp of when the notification was created. */
  createdAt: string;
  /** Determines navigation destination on tap. */
  actionType: NotificationActionType;
  /** Resource ID to pass to the destination screen. */
  actionId?: string;
  /** Optional image / thumbnail URL. */
  image?: string | null;
  /** Priority level. Defaults to 'normal'. */
  priority?: NotificationPriority;
  /** Deep-link URL for external or custom linking. */
  deepLink?: string | null;
  /** Flexible metadata bag for future fields (Supabase JSONB). */
  metadata?: Record<string, unknown> | null;
}

// ═════════════════════════════════════════════════════════════════
//  Filter & Group Helpers
// ═════════════════════════════════════════════════════════════════

/** Filter state used by the notification screen and hook. */
export interface NotificationFilter {
  /** Active chip label — 'all' shows everything. */
  activeType: NotificationType | 'all' | 'unread';
}

/** A group of notifications keyed by section. */
export interface NotificationGroup {
  section: NotificationSectionKey;
  label: string;
  data: Notification[];
}

// ═════════════════════════════════════════════════════════════════
//  Service Interfaces
// ═════════════════════════════════════════════════════════════════

/** Params for fetching notifications (future infinite pagination). */
export interface FetchNotificationsParams {
  page?: number;
  pageSize?: number;
  type?: NotificationType | 'all';
}

/** Response shape from the notification service. */
export interface FetchNotificationsResponse {
  data: Notification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
  nextPage?: number;
}

/** Params for marking a single notification as read. */
export interface MarkAsReadParams {
  notificationId: string;
}

/** Params for bulk mark-as-read (all or by type). */
export interface MarkAllAsReadParams {
  type?: NotificationType;
}

/** Params for deleting a notification. */
export interface DeleteNotificationParams {
  notificationId: string;
}
