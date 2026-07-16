/**
 * Notification Service
 *
 * Supabase-backed service layer for the notification system.
 *
 * Reads notifications from `notification_recipients` joined with `notifications`
 * using the existing schema (Domain 09 — Notifications).
 *
 * Query pattern reused from `src/services/home/notificationService.ts`:
 *   supabase.from('notification_recipients').select(`..., notifications!inner(...)`)
 *
 * ## Migration
 *
 * - Mock data (`src/mocks/notifications.ts`) has been removed.
 * - In-memory store and simulated delays have been removed.
 * - All methods now query Supabase directly.
 *
 * ## Important Notes
 *
 * - `priority`, `image`, `deepLink`, and `metadata` are not present in the
 *   current `notifications` table schema, so they default to sensible values
 *   ('normal', null, null, null). If these columns are added later, update
 *   the select query and mapping function.
 *
 * @module services/notificationService
 */

import { supabase } from '../config/supabase';
import { extractErrorMessage } from '../utils/supabase';
import type {
  Notification,
  FetchNotificationsParams,
  FetchNotificationsResponse,
  MarkAsReadParams,
  MarkAllAsReadParams,
  DeleteNotificationParams,
} from '../types/notification';

// ═════════════════════════════════════════════════════════════════
//  Mapping: DB event_type → UI NotificationType
// ═════════════════════════════════════════════════════════════════
//
// The `notifications.event_type` column uses the `notification_event_type` enum:
//   live_class_reminder, test_published, result_available,
//   content_approved, content_rejected, subscription_expiring,
//   subscription_expired, new_content_uploaded, batch_assigned,
//   announcement, custom

const DB_EVENT_TYPE_TO_UI: Record<string, Notification['type']> = {
  live_class_reminder: 'live-class',
  test_published: 'mock-test',
  result_available: 'result',
  content_approved: 'system',
  content_rejected: 'system',
  subscription_expiring: 'payment',
  subscription_expired: 'payment',
  new_content_uploaded: 'course',
  batch_assigned: 'course',
  announcement: 'announcement',
  custom: 'system',
  // ── Commerce ───────────────────────────────────────────────
  course_purchased: 'payment',
  course_enrolled: 'course',
  pyq_purchased: 'payment',
  pyq_access_granted: 'course',
};

/**
 * Reverse mapping: UI NotificationType → list of DB event_type values.
 * Used when filtering notifications by type in the Supabase query.
 */
const UI_TYPE_TO_DB_EVENT_TYPES: Record<string, string[]> = {
  'mock-test': ['test_published'],
  result: ['result_available'],
  'live-class': ['live_class_reminder'],
  course: [
    'new_content_uploaded',
    'batch_assigned',
    'course_enrolled',
    'pyq_access_granted',
  ],
  payment: [
    'subscription_expiring',
    'subscription_expired',
    'course_purchased',
    'pyq_purchased',
  ],
  announcement: ['announcement'],
  system: ['content_approved', 'content_rejected', 'custom'],
};

/**
 * Maps a DB `reference_type` value to a UI `NotificationActionType`.
 *
 * reference_type is free-text (not an enum) — the dispatcher writes values
 * like 'live_class', 'mock_test', 'test_result', 'order', etc.
 */
function mapReferenceType(refType: string | null): Notification['actionType'] {
  switch (refType) {
    case 'live_class':
      return 'liveClassDetails';
    case 'mock_test':
      return 'mockTestDetails';
    case 'test_result':
      return 'testResult';
    case 'course':
    case 'content':
      return 'courseDetails';
    case 'order':
    case 'payment':
      return 'paymentDetails';
    case 'announcement':
      return 'announcementDetails';
    case 'deep_link':
      return 'deepLink';
    case 'profile':
      return 'profile';
    default:
      return 'systemAlert';
  }
}

// ═════════════════════════════════════════════════════════════════
//  DB Row Shape (from join query)
// ═════════════════════════════════════════════════════════════════
//
// Matches the shape returned by:
//   supabase.from('notification_recipients')
//     .select(`..., notifications!inner(...)`)

interface DbNotificationJoin {
  is_read: boolean;
  received_at: string;
  notifications: {
    notification_id: string;
    title: string;
    body: string;
    event_type: string;
    reference_type: string | null;
    reference_id: string | null;
    created_at: string;
  } | null;
}

// ─── Mapping Helper ─────────────────────────────────────────────

function mapDbToNotification(db: DbNotificationJoin): Notification | null {
  if (!db.notifications) return null;
  const n = db.notifications;

  const type = DB_EVENT_TYPE_TO_UI[n.event_type];
  if (!type) {
    // Unknown event_type — skip silently (forward-compat with new enum values)
    return null;
  }

  return {
    id: n.notification_id,
    title: n.title,
    description: n.body,
    type,
    isRead: db.is_read,
    createdAt: n.created_at,
    actionType: mapReferenceType(n.reference_type),
    actionId: n.reference_id ?? undefined,
    image: null,
    priority: 'normal' as const,
    deepLink: null,
    metadata: null,
  };
}

// ═════════════════════════════════════════════════════════════════
//  Public API
// ═════════════════════════════════════════════════════════════════

/**
 * Fetch notifications for the currently authenticated user with optional
 * filtering by type and pagination.
 *
 * Queries `notification_recipients` joined with `notifications` via
 * Supabase's `!inner` syntax. Non-deleted notifications only
 * (notifications.is_deleted = FALSE is enforced by RLS / query filter).
 *
 * Returns an empty response if the user is not authenticated.
 */
export async function getNotifications(
  params: FetchNotificationsParams = {},
): Promise<FetchNotificationsResponse> {
  const { page = 1, pageSize = 50, type = 'all' } = params;

  // ── Resolve current user ─────────────────────────────────────
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.warn('[notificationService] No authenticated user — returning empty');
    return { data: [], totalCount: 0, unreadCount: 0, hasMore: false };
  }
  const userId = userData.user.id;

  // ── Build query ──────────────────────────────────────────────
  let query = supabase
    .from('notification_recipients')
    .select(
      `is_read,
       received_at,
       notifications!inner (
         notification_id,
         title,
         body,
         event_type,
         reference_type,
         reference_id,
         created_at
       )`,
      { count: 'exact' },
    )
    .eq('profile_id', userId)
    .order('received_at', { ascending: false });

  // ── Type filter ──────────────────────────────────────────────
  if (type !== 'all') {
    const eventTypes = UI_TYPE_TO_DB_EVENT_TYPES[type];
    if (eventTypes && eventTypes.length > 0) {
      query = query.in('notifications.event_type', eventTypes);
    }
  }

  // ── Pagination ───────────────────────────────────────────────
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('[notificationService] getNotifications error:', extractErrorMessage(error));
    return { data: [], totalCount: 0, unreadCount: 0, hasMore: false };
  }

  // ── Map DB rows → UI Notifications ───────────────────────────
  const notifications: Notification[] = (
    data as unknown as DbNotificationJoin[]
  )
    .map(mapDbToNotification)
    .filter((n): n is Notification => n !== null);

  // ── Compute unread count (lightweight separate query) ────────
  const { count: unreadCount, error: unreadError } = await supabase
    .from('notification_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .eq('is_read', false);

  const totalCount = count ?? notifications.length;
  const unread = unreadCount ?? notifications.filter((n) => !n.isRead).length;
  const hasMore = typeof count === 'number' && to < count - 1;

  return {
    data: notifications,
    totalCount,
    unreadCount: unread,
    hasMore,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

/**
 * Mark a single notification as read.
 *
 * Updates `is_read` and `read_at` on the matching
 * `notification_recipients` row for the current user.
 *
 * Uses `is_read = false` in the WHERE clause to make the update
 * a no-op if already read (avoiding unnecessary writes).
 */
export async function markAsRead(
  params: MarkAsReadParams,
): Promise<{ success: boolean }> {
  const { notificationId } = params;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false };

  const { error } = await supabase
    .from('notification_recipients')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('profile_id', userData.user.id)
    .eq('notification_id', notificationId)
    .eq('is_read', false);

  if (error) {
    console.error('[notificationService] markAsRead error:', extractErrorMessage(error));
  }

  return { success: !error };
}

/**
 * Mark all notifications (optionally by type) as read for the current user.
 *
 * When a `type` is specified, first resolves matching notification IDs
 * from the `notifications` table by event_type, then updates only those
 * recipient rows. When no type is specified, marks ALL unread as read.
 *
 * This approach avoids the need for cross-table joins in an UPDATE query,
 * which PostgREST does not support directly.
 */
export async function markAllAsRead(
  params: MarkAllAsReadParams = {},
): Promise<{ success: boolean }> {
  const { type } = params;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false };

  // ── Resolve notification IDs if filtering by type ────────────
  let notificationIds: string[] | undefined;

  if (type) {
    const eventTypes = UI_TYPE_TO_DB_EVENT_TYPES[type];
    if (eventTypes && eventTypes.length > 0) {
      const { data: matching } = await supabase
        .from('notifications')
        .select('notification_id')
        .in('event_type', eventTypes);

      if (matching && matching.length > 0) {
        notificationIds = matching.map((n) => n.notification_id);
      } else {
        // No notifications of this type exist — nothing to mark
        return { success: true };
      }
    }
  }

  // ── Build update query ───────────────────────────────────────
  let query = supabase
    .from('notification_recipients')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('profile_id', userData.user.id)
    .eq('is_read', false);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in('notification_id', notificationIds);
  }

  const { error } = await query;

  if (error) {
    console.error(
      '[notificationService] markAllAsRead error:',
      extractErrorMessage(error),
    );
  }

  return { success: !error };
}

/**
 * Delete a single notification for the current user.
 *
 * Removes the corresponding row from `notification_recipients`.
 * This operation requires an appropriate RLS DELETE policy on the
 * `notification_recipients` table for the `authenticated` role.
 */
export async function deleteNotification(
  params: DeleteNotificationParams,
): Promise<{ success: boolean }> {
  const { notificationId } = params;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false };

  const { error } = await supabase
    .from('notification_recipients')
    .delete()
    .eq('profile_id', userData.user.id)
    .eq('notification_id', notificationId);

  if (error) {
    console.error(
      '[notificationService] deleteNotification error:',
      extractErrorMessage(error),
    );
  }

  return { success: !error };
}

/**
 * Delete all read notifications for the current user.
 *
 * Removes all `notification_recipients` rows where is_read = true
 * for this user. Requires an appropriate RLS DELETE policy.
 */
export async function deleteAllRead(): Promise<{ success: boolean }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false };

  const { error } = await supabase
    .from('notification_recipients')
    .delete()
    .eq('profile_id', userData.user.id)
    .eq('is_read', true);

  if (error) {
    console.error(
      '[notificationService] deleteAllRead error:',
      extractErrorMessage(error),
    );
  }

  return { success: !error };
}
