/**
 * Home Notification Hooks
 *
 * React Query hooks wrapping the home notificationService API calls.
 * Provides cached queries for the Home Screen's notification badge
 * and latest notification preview.
 *
 * ## Exports
 *
 * | Hook                    | Type     | Description                              |
 * |-------------------------|----------|------------------------------------------|
 * | `useNotificationSummary`| Query    | Unread count + latest notification       |
 * | `useUnreadCount`        | Query    | Unread notification count only           |
 *
 * @module hooks/home/useNotifications
 */

import { useQuery } from '@tanstack/react-query';
import { homeKeys } from './queryKeys';
import {
  getNotificationSummary,
  getUnreadCount,
} from '../../services/home/notificationService';
import type { NotificationSummary } from '../../types/home';

// ─── Query Hooks ────────────────────────────────────────────────────────────

/**
 * Fetch the notification summary for the Home Screen greeting header.
 *
 * Returns the unread count and the single most recent notification.
 * The query is disabled when `userId` is falsy.
 *
 * @param userId - The authenticated user's UUID.
 *
 * @example
 * const { data, isLoading } = useNotificationSummary(userId);
 * if (data) {
 *   console.log(data.unreadCount);  // 3
 *   console.log(data.latestNotification?.title); // "New Test Available"
 * }
 */
export function useNotificationSummary(userId: string | undefined | null) {
  return useQuery<NotificationSummary>({
    queryKey: homeKeys.notifications.summary(userId ?? ''),
    queryFn: async () => {
      const result = await getNotificationSummary(userId!);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch notification summary.');
      }
      return result.data!;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute — notifications should be relatively fresh
    refetchInterval: 5 * 60 * 1000, // Poll every 5 minutes for updates
  });
}

/**
 * Fetch only the unread notification count.
 *
 * Lightweight alternative to `useNotificationSummary` when only the
 * badge count is needed. Supports polling for near-real-time updates.
 *
 * @param userId - The authenticated user's UUID.
 *
 * @example
 * const { data: unreadCount } = useUnreadCount(userId);
 * // unreadCount is a number, defaults to 0
 */
export function useUnreadCount(userId: string | undefined | null) {
  return useQuery<number>({
    queryKey: homeKeys.notifications.unreadCount(userId ?? ''),
    queryFn: async () => {
      const result = await getUnreadCount(userId!);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch unread count.');
      }
      return result.data!;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Poll every 5 minutes
    placeholderData: 0, // Show 0 while loading
  });
}
