/**
 * useNotifications
 *
 * Central hook for the notification system.
 *
 * Manages:
 * - Fetching notifications from the service layer
 * - Filtering by type
 * - Grouping into Today / Yesterday / Earlier sections
 * - Mark as read / delete operations
 * - Loading, empty, and error states
 *
 * No UI code — completely replaceable with a real API later.
 *
 * @module hooks/useNotifications
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as notificationService from '../services/notificationService';
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
//  Grouping Helper
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
  const [response, setResponse] = useState<FetchNotificationsResponse | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>({ activeType: 'all' });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // ── Fetch ────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (type: NotificationType | 'all' | 'unread') => {
    try {
      setError(null);
      const serviceType = type === 'unread' ? 'all' : type;
      const result = await notificationService.getNotifications({ type: serviceType });
      if (!mountedRef.current) return;

      // If filtering by 'unread', filter client-side
      if (type === 'unread') {
        result.data = result.data.filter((n) => !n.isRead);
      }

      setResponse(result);
    } catch (err) {
      if (!mountedRef.current) return;
      setError('Failed to load notifications. Pull down to retry.');
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    fetchNotifications('all').finally(() => {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, [fetchNotifications]);

  // ── Refresh ──────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications(filter.activeType);
    if (mountedRef.current) {
      setIsRefreshing(false);
    }
  }, [fetchNotifications, filter.activeType]);

  // ── Set filter type ──────────────────────────────────────────

  const setFilterType = useCallback(
    (type: NotificationType | 'all' | 'unread') => {
      setFilter({ activeType: type });
      fetchNotifications(type);
    },
    [fetchNotifications],
  );

  // ── Mark as read ─────────────────────────────────────────────

  const markAsRead = useCallback(async (notificationId: string) => {
    await notificationService.markAsRead({ notificationId });
    // Optimistically update local state
    setResponse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      };
    });
  }, []);

  // ── Mark all as read ─────────────────────────────────────────

  const markAllAsRead = useCallback(async () => {
    const type = filter.activeType === 'unread' ? undefined
      : filter.activeType === 'all' ? undefined
      : filter.activeType;
    await notificationService.markAllAsRead(
      type ? { type: type as NotificationType } : {},
    );
    // Optimistically update
    setResponse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      };
    });
  }, [filter.activeType]);

  // ── Delete single ────────────────────────────────────────────

  const deleteSingle = useCallback(async (notificationId: string) => {
    await notificationService.deleteNotification({ notificationId });
    setResponse((prev) => {
      if (!prev) return prev;
      const filtered = prev.data.filter((n) => n.id !== notificationId);
      return {
        ...prev,
        data: filtered,
        totalCount: Math.max(0, prev.totalCount - 1),
        unreadCount: prev.unreadCount - (prev.data.find((n) => n.id === notificationId)?.isRead ? 0 : 1),
      };
    });
  }, []);

  // ── Delete all read ──────────────────────────────────────────

  const deleteAllRead = useCallback(async () => {
    await notificationService.deleteAllRead();
    setResponse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.filter((n) => !n.isRead),
      };
    });
  }, []);

  // ── Derived values ───────────────────────────────────────────

  const allNotifications = useMemo(() => response?.data ?? [], [response]);
  const unreadCount = useMemo(
    () => response?.unreadCount ?? 0,
    [response],
  );

  const groups = useMemo(() => {
    if (filter.activeType === 'unread') {
      return groupBySection(allNotifications);
    }
    return groupBySection(allNotifications);
  }, [allNotifications, filter.activeType]);

  return {
    groups,
    allNotifications,
    filter,
    setFilterType,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteSingle,
    deleteAllRead,
    refresh,
    unreadCount,
    isLoading,
    isRefreshing,
    error,
  };
}
