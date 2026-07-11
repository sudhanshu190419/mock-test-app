/**
 * Home Notification Service
 *
 * Clean-architecture service layer for the Home Screen's notification data.
 *
 * Responsibilities:
 * - Unread notification count (for the greeting header badge)
 * - Latest notification preview (for the greeting header)
 *
 * ═══ SCHEMA NOTES ═══
 *
 *   The `notifications` table (Domain 09) stores the notification content
 *   (title, body, event_type, etc.) but does NOT have `user_id` or `is_read`.
 *
 *   User targeting and read-state tracking live on `notification_recipients`:
 *     - profile_id   → the recipient user
 *     - is_read      → read/unread flag
 *     - read_at      → when the notification was read
 *     - received_at  → when the notification was delivered
 *
 *   The correct pattern is to query `notification_recipients` and join
 *   `notifications` for the content.
 *
 *   Previous code queried:
 *     supabase.from('notifications').eq('user_id', userId).eq('is_read', false)
 *   This would have thrown a PostgREST error because those columns don't exist.
 *
 * This is a lightweight, read-only service scoped to the Home Screen.
 * Full notification CRUD lives in `src/services/notificationService.ts`.
 *
 * Every public method returns a standardised `ApiResponse<T>` shape.
 *
 * @module services/home/notificationService
 */

import { supabase } from '../../config/supabase';
import { extractErrorMessage } from '../../utils/supabase';
import type { ApiResponse } from '../../types/academic';
import type {
  NotificationSummary,
  LatestNotification,
} from '../../types/home';

// ─── Database Row Shape ────────────────────────────────────────────────────

/**
 * Raw shape returned when joining `notification_recipients` → `notifications`
 * via Supabase's `!inner` join syntax.
 */
interface DbRecipientWithNotification {
  is_read: boolean;
  received_at: string;
  notifications: {
    notification_id: string;
    title: string;
    body: string;
    event_type: string;
    created_at: string;
  } | null;
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

function mapLatestNotification(
  db: DbRecipientWithNotification,
): LatestNotification | null {
  if (!db.notifications) return null;

  return {
    id: db.notifications.notification_id,
    title: db.notifications.title,
    description: db.notifications.body,
    type: db.notifications.event_type,
    createdAt: db.notifications.created_at,
    isRead: db.is_read,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch the notification summary for the Home Screen greeting header.
 *
 * Returns the unread count and the single most recent notification
 * by querying `notification_recipients` joined with `notifications`.
 *
 * @param userId - The authenticated user's UUID (maps to profile_id).
 *
 * @example
 * const result = await getNotificationSummary('user-uuid');
 * if (result.success) {
 *   console.log(result.data.unreadCount);       // 3
 *   console.log(result.data.latestNotification); // { id, title, ... }
 * }
 */
export async function getNotificationSummary(
  userId: string,
): Promise<ApiResponse<NotificationSummary>> {
  try {
    // ── Fetch unread count from notification_recipients ──────────────────
    const { count: unreadCount, error: countError } = await supabase
      .from('notification_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('is_read', false);

    if (countError) {
      return { success: false, error: extractErrorMessage(countError) };
    }

    // ── Fetch the single most recent notification via join ───────────────
    const { data: latest, error: latestError } = await supabase
      .from('notification_recipients')
      .select(
        `is_read, received_at, notifications!inner(notification_id, title, body, event_type, created_at)`,
      )
      .eq('profile_id', userId)
      .order('received_at', { ascending: false })
      .limit(1);

    if (latestError) {
      return { success: false, error: extractErrorMessage(latestError) };
    }

    return {
      success: true,
      data: {
        unreadCount: unreadCount ?? 0,
        latestNotification:
          latest && latest.length > 0
            ? mapLatestNotification(latest[0] as unknown as DbRecipientWithNotification)
            : null,
      },
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch only the unread notification count.
 *
 * Lightweight alternative to `getNotificationSummary` when only the
 * badge count is needed (e.g. for polling or push notification updates).
 *
 * Queries `notification_recipients` directly for efficiency.
 *
 * @param userId - The authenticated user's UUID (maps to profile_id).
 *
 * @example
 * const result = await getUnreadCount('user-uuid');
 * if (result.success) {
 *   console.log(result.data);  // 3
 * }
 */
export async function getUnreadCount(
  userId: string,
): Promise<ApiResponse<number>> {
  try {
    const { count, error } = await supabase
      .from('notification_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: count ?? 0 };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}
