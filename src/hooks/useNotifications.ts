/**
 * useNotifications
 *
 * Central hook for the notification system.
 *
 * Uses React Query (useQuery + useMutation) instead of raw useState/useEffect.
 *
 * ─── Architecture ───────────────────────────────────────────────────────────
 *
 *   NotificationScreen / NotificationBell (any consumer)
 *     → useNotifications() hook
 *       → useQuery / useMutation
 *         → notificationService (Supabase-backed)
 *
 * After every successful mutation, both the notification list query AND the
 * home screen badge queries are invalidated so that:
 *   • NotificationScreen refreshes its list automatically
 *   • Home screen (GreetingHeader → NotificationBell) refreshes its badge
 *
 * @module hooks/useNotifications
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import * as notificationService from '../services/notificationService';
import { homeKeys } from './home/queryKeys';
import type {
  Notification,
  NotificationFilter,
  NotificationType,
  NotificationSectionKey,
  NotificationGroup,
  FetchNotificationsResponse,
} from '../types/notification';

// ═════════════════════════════════════════════════════════════════
//  Constants
// ═════════════════════════════════════════════════════════════════

/** All supported filter chip types including 'all' and 'unread'. */
export const FILTER_TYPES: (NotificationType | 'all' | 'unread')[] = [
  'all',
  'unread',
  'mock-test',
  'result',
  'live-class',
  'course',
  'announcement',
  'payment',
  'reminder',
  'system',
];

export const FILTER_LABELS: Record<NotificationType | 'all' | 'unread', string> = {
  all: 'All',
  unread: 'Unread',
  'mock-test': 'Mock Tests',
  result: 'Results',
  'live-class': 'Live Classes',
  course: 'Courses',
  announcement: 'Announcements',
  payment: 'Payments',
  reminder: 'Reminders',
  system: 'System',
};

// ═════════════════════════════════════════════════════════════════
//  React Query Keys
// ═════════════════════════════════════════════════════════════════
//
// 'notifications' root prefix is deliberately distinct from homeKeys
// ('home.notifications') so that invalidation can target one or both.

const notificationKeys = {
  /** Root for all NotificationScreen queries. */
  all: ['notifications'] as const,
  /** Keyed by the service-level type param ('all' | NotificationType). */
  list: (serviceType: string) => ['notifications', 'list', serviceType] as const,
};

// ═════════════════════════════════════════════════════════════════
//  Grouping Helpers
// ═════════════════════════════════════════════════════════════════

/**
 * Determine which section a notification belongs to based on its
 * creation date relative to the current time.
 */
function getSectionKey(createdAt: string): NotificationSectionKey {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffHours = diffMs / 3_600_000;

  if (diffHours < 24) return 'today';
  if (diffHours < 48) return 'yesterday';
  return 'earlier';
}

const SECTION_LABELS: Record<NotificationSectionKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

/** Group a flat notification list into ordered sections. */
function groupBySection(notifications: Notification[]): NotificationGroup[] {
  const groups: Record<NotificationSectionKey, Notification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const n of notifications) {
    const key = getSectionKey(n.createdAt);
    groups[key].push(n);
  }

  const result: NotificationGroup[] = [];
  const order: NotificationSectionKey[] = ['today', 'yesterday', 'earlier'];

  for (const key of order) {
    if (groups[key].length > 0) {
      result.push({
        section: key,
        label: SECTION_LABELS[key],
        data: groups[key],
      });
    }
  }

  return result;
}

// ═════════════════════════════════════════════════════════════════
//  Supabase Realtime Subscription
// ═════════════════════════════════════════════════════════════════
//
// Subscribes to changes on `notification_recipients` for the
// currently authenticated user. On INSERT / UPDATE / DELETE,
// invalidates both the NotificationScreen list and the Home
// badge caches so that both screens update automatically.
//
// This is safe to call from multiple components — each hook
// instance gets its own channel subscription and cleans up on
// unmount. Supabase's client handles duplicate channels at the
// WebSocket level.

const NOTIFICATION_REALTIME_CHANNEL = 'notifications-realtime';

/**
 * Subscribe to realtime changes on `notification_recipients`.
 *
 * When a relevant event arrives:
 *   1. Invalidate `notificationKeys.all` → refreshes NotificationScreen
 *   2. Invalidate `homeKeys.notifications.all()` → refreshes Home badge
 *
 * @example
 * // Inside any component or hook that needs live notification updates:
 * useNotificationRealtime();
 */
export function useNotificationRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Guard against async session resolution completing after unmount
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Resolve the current user's ID — needed for the Realtime filter
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If the component unmounted while we were resolving the session,
      // bail out to prevent creating an orphaned subscription.
      if (cancelled) {
        console.warn(
          '[NOTIFICATION_REALTIME] Session resolved after unmount — skipping',
        );
        return;
      }

      const userId = session?.user?.id;
      if (!userId) {
        console.warn(
          '[NOTIFICATION_REALTIME] No authenticated user — skipping subscription',
        );
        return;
      }

      console.log('[NOTIFICATION_REALTIME_CONNECTED]', {
        channel: NOTIFICATION_REALTIME_CHANNEL,
        userId,
        table: 'notification_recipients',
        events: 'INSERT, UPDATE, DELETE',
      });

      channel = supabase
        .channel(NOTIFICATION_REALTIME_CHANNEL)
        .on<Record<string, unknown>>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification_recipients',
            filter: `profile_id=eq.${userId}`,
          },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            console.log('[NOTIFICATION_REALTIME_EVENT]', {
              eventType: payload.eventType,
              schema: payload.schema,
              table: payload.table,
              new: payload.new,
              old: payload.old,
              timestamp: new Date().toISOString(),
            });

            console.log('[NOTIFICATION_REALTIME_INVALIDATE]', {
              invalidatedKeys: [
                notificationKeys.all,
                homeKeys.notifications.all(),
              ],
              timestamp: new Date().toISOString(),
            });

            // Invalidate both caches so NotificationScreen + Home badge refresh
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            queryClient.invalidateQueries({
              queryKey: homeKeys.notifications.all(),
            });
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) {
        console.log('[NOTIFICATION_REALTIME_DISCONNECTED]', {
          channel: NOTIFICATION_REALTIME_CHANNEL,
          timestamp: new Date().toISOString(),
        });
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [queryClient]);
}

// ═════════════════════════════════════════════════════════════════
//  Hook
// ═════════════════════════════════════════════════════════════════

export interface UseNotificationsReturn {
  /** Current notification list (sorted + grouped for FlatList). */
  groups: NotificationGroup[];
  /** All notifications as a flat array (unfiltered). */
  allNotifications: Notification[];
  /** Current active filter. */
  filter: NotificationFilter;
  /** Update the active filter type. */
  setFilterType: (type: NotificationType | 'all' | 'unread') => void;
  /** Mark a single notification as read. */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all visible notifications as read. */
  markAllAsRead: () => Promise<void>;
  /** Delete a single notification. */
  deleteNotification: (notificationId: string) => Promise<void>;
  /** Delete all read notifications. */
  deleteAllRead: () => Promise<void>;
  /** Refresh the notification list. */
  refresh: () => Promise<void>;
  /** Total unread count across all types. */
  unreadCount: number;
  /** Whether the initial load is in progress. */
  isLoading: boolean;
  /** Whether a refresh is in progress. */
  isRefreshing: boolean;
  /** Error message, if any. */
  error: string | null;
}

export function useNotifications(): UseNotificationsReturn {
  const queryClient = useQueryClient();
  const [filter, setFilterState] = useState<NotificationFilter>({
    activeType: 'all',
  });

  // ── Realtime subscription (live updates) ───────────────────────
  useNotificationRealtime();

  // ══════════════════════════════════════════════════════════════
  //  Query — Fetch notifications
  // ══════════════════════════════════════════════════════════════
  //
  // When the filter is 'unread', we fetch ALL types and filter
  // client-side (the service layer has no 'unread' param).

  const serviceType: NotificationType | 'all' =
    filter.activeType === 'unread' ? 'all' : filter.activeType;

  const {
    data: response,
    isLoading,
    isRefetching,
    error: queryError,
    refetch,
  } = useQuery<FetchNotificationsResponse>({
    queryKey: notificationKeys.list(serviceType),
    queryFn: () => notificationService.getNotifications({ type: serviceType }),
    staleTime: 60 * 1000, // 1 minute — notifications change frequently
    placeholderData: { data: [], totalCount: 0, unreadCount: 0, hasMore: false },
  });

  // ══════════════════════════════════════════════════════════════
  //  Mutations
  // ══════════════════════════════════════════════════════════════
  //
  // After every mutation, invalidate both:
  //   1. notificationKeys.all  → refreshes the NotificationScreen list
  //   2. homeKeys.notifications.all() → refreshes the Home badge

  /** Invalidate both notification screen + home badge queries. */
  const invalidateNotificationCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    queryClient.invalidateQueries({ queryKey: homeKeys.notifications.all() });
  }, [queryClient]);

  // ── Mark as read ─────────────────────────────────────────────

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markAsRead({ notificationId }),
    onSuccess: () => {
      invalidateNotificationCaches();
    },
  });

  // ── Mark all as read ─────────────────────────────────────────

  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      const type =
        filter.activeType === 'unread'
          ? undefined
          : filter.activeType === 'all'
            ? undefined
            : filter.activeType;
      return notificationService.markAllAsRead(
        type ? { type: type as NotificationType } : {},
      );
    },
    onSuccess: () => {
      invalidateNotificationCaches();
    },
  });

  // ── Delete single ────────────────────────────────────────────

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.deleteNotification({ notificationId }),
    onSuccess: () => {
      invalidateNotificationCaches();
    },
  });

  // ── Delete all read ──────────────────────────────────────────

  const deleteAllReadMutation = useMutation({
    mutationFn: () => notificationService.deleteAllRead(),
    onSuccess: () => {
      invalidateNotificationCaches();
    },
  });

  // ══════════════════════════════════════════════════════════════
  //  Process data
  // ══════════════════════════════════════════════════════════════
  //
  // Client-side filtering for the 'unread' chip.

  const processedResponse = useMemo((): FetchNotificationsResponse => {
    const safe = response ?? {
      data: [],
      totalCount: 0,
      unreadCount: 0,
      hasMore: false,
    };
    if (filter.activeType === 'unread') {
      return {
        ...safe,
        data: safe.data.filter((n) => !n.isRead),
      };
    }
    return safe;
  }, [response, filter.activeType]);

  // ══════════════════════════════════════════════════════════════
  //  Callbacks
  // ══════════════════════════════════════════════════════════════

  const setFilterType = useCallback(
    (type: NotificationType | 'all' | 'unread') => {
      setFilterState({ activeType: type });
    },
    [],
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await markAsReadMutation.mutateAsync(notificationId);
    },
    [markAsReadMutation],
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const deleteSingle = useCallback(
    async (notificationId: string) => {
      await deleteNotificationMutation.mutateAsync(notificationId);
    },
    [deleteNotificationMutation],
  );

  const deleteAllReadFn = useCallback(async () => {
    await deleteAllReadMutation.mutateAsync();
  }, [deleteAllReadMutation]);

  /** Refetch the notification list (pull-to-refresh). */
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // ══════════════════════════════════════════════════════════════
  //  Derived values
  // ══════════════════════════════════════════════════════════════

  const allNotifications = useMemo(
    () => processedResponse.data,
    [processedResponse],
  );

  const unreadCount = useMemo(
    () => processedResponse.unreadCount,
    [processedResponse],
  );

  const error = useMemo(
    () =>
      queryError
        ? 'Failed to load notifications. Pull down to retry.'
        : null,
    [queryError],
  );

  const groups = useMemo(
    () => groupBySection(allNotifications),
    [allNotifications],
  );

  return {
    groups,
    allNotifications,
    filter,
    setFilterType,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteSingle,
    deleteAllRead: deleteAllReadFn,
    refresh,
    unreadCount,
    isLoading,
    isRefreshing: isRefetching,
    error,
  };
}
