/**
 * Notification Service
 *
 * Backend-ready service layer for the notification system.
 *
 * Currently backed by mock data. When connecting to Supabase or a
 * real API, replace each method's implementation with API calls
 * without changing any UI code.
 *
 * ## Migration path
 *
 * 1. Replace `getNotifications` → `GET /api/notifications`
 * 2. Replace `markAsRead`     → `POST /api/notifications/:id/read`
 * 3. Replace `markAllAsRead`  → `POST /api/notifications/read-all`
 * 4. Replace `deleteNotification` → `DELETE /api/notifications/:id`
 * 5. Replace `deleteAllRead`  → `DELETE /api/notifications/read`
 *
 * @module services/notificationService
 */

import { MOCK_NOTIFICATIONS } from '../mocks/notifications';
import type {
  Notification,
  FetchNotificationsParams,
  FetchNotificationsResponse,
  MarkAsReadParams,
  MarkAllAsReadParams,
  DeleteNotificationParams,
} from '../types/notification';

// ═════════════════════════════════════════════════════════════════
//  In-Memory Store (simulates backend state)
// ═════════════════════════════════════════════════════════════════

/** Clone the mock array so mutations don't pollute the source. */
let notifications: Notification[] = [...MOCK_NOTIFICATIONS];

/** Reset the store back to the original mock data (for testing). */
export function resetStore(): void {
  notifications = [...MOCK_NOTIFICATIONS];
}

// ═════════════════════════════════════════════════════════════════
//  In-Flight Request Cache
// ═════════════════════════════════════════════════════════════════

/**
 * Prevents duplicate in-flight requests when multiple consumers
 * (e.g. HomeScreen + NotificationScreen) call getNotifications
 * concurrently. The second caller gets the same promise.
 */
const inflightCache = new Map<string, Promise<FetchNotificationsResponse>>();

// ═════════════════════════════════════════════════════════════════
//  Public API
// ═════════════════════════════════════════════════════════════════

/**
 * Fetch notifications with optional filtering and pagination.
 *
 * Caches in-flight requests so duplicate concurrent calls (e.g. when
 * HomeScreen and NotificationScreen both mount) share one promise.
 *
 * ## Migration
 * Replace with: `GET /api/notifications?page={page}&pageSize={pageSize}&type={type}`
 * Remove the in-flight cache for production since real APIs deduplicate
 * at the network layer.
 */
export async function getNotifications(
  params: FetchNotificationsParams = {},
): Promise<FetchNotificationsResponse> {
  const cacheKey = JSON.stringify(params);

  // Return existing in-flight promise to prevent duplicate fetches
  const existing = inflightCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const { page = 1, pageSize = 50, type = 'all' } = params;

    // Simulate network latency
    await delay(200);

    // Filter by type
    let filtered = [...notifications];
    if (type !== 'all') {
      filtered = filtered.filter((n) => n.type === type);
    }

    // Sort by createdAt descending (newest first)
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totalCount = filtered.length;
    const unreadCount = filtered.filter((n) => !n.isRead).length;

    // Paginate
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = filtered.slice(start, end);
    const hasMore = end < totalCount;

    return {
      data,
      totalCount,
      unreadCount,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined,
    };
  })();

  inflightCache.set(cacheKey, promise);
  promise.finally(() => inflightCache.delete(cacheKey));

  return promise;
}

/**
 * Mark a single notification as read.
 *
 * ## Migration
 * Replace with: `POST /api/notifications/{notificationId}/read`
 */
export async function markAsRead(params: MarkAsReadParams): Promise<{ success: boolean }> {
  const { notificationId } = params;
  await delay(50);

  const idx = notifications.findIndex((n) => n.id === notificationId);
  if (idx !== -1) {
    notifications[idx] = { ...notifications[idx], isRead: true };
  }

  return { success: idx !== -1 };
}

/**
 * Mark all notifications (optionally by type) as read.
 *
 * ## Migration
 * Replace with: `POST /api/notifications/read-all?type={type}`
 */
export async function markAllAsRead(params: MarkAllAsReadParams = {}): Promise<{ success: boolean }> {
  const { type } = params;
  await delay(100);

  notifications = notifications.map((n) => {
    if (type && n.type !== type) return n;
    return { ...n, isRead: true };
  });

  return { success: true };
}

/**
 * Delete a single notification.
 *
 * ## Migration
 * Replace with: `DELETE /api/notifications/{notificationId}`
 */
export async function deleteNotification(
  params: DeleteNotificationParams,
): Promise<{ success: boolean }> {
  const { notificationId } = params;
  await delay(50);

  const idx = notifications.findIndex((n) => n.id === notificationId);
  if (idx !== -1) {
    notifications.splice(idx, 1);
  }

  return { success: idx !== -1 };
}

/**
 * Delete all read notifications.
 *
 * ## Migration
 * Replace with: `DELETE /api/notifications/read`
 */
export async function deleteAllRead(): Promise<{ success: boolean }> {
  await delay(100);
  notifications = notifications.filter((n) => !n.isRead);
  return { success: true };
}

// ═════════════════════════════════════════════════════════════════
//  Helpers
// ═════════════════════════════════════════════════════════════════

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
