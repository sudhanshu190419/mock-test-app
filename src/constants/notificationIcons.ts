/**
 * Notification Icon & Colour Constants
 *
 * Maps each NotificationType to its icon name, background tint colour,
 * icon colour, and display label. Single source of truth so that icons
 * stay consistent across cards, filter chips, and headers.
 *
 * @module constants/notificationIcons
 */

import type { NotificationType } from '../types/notification';
import type { IconName } from '../components/home/Icons';

// ═════════════════════════════════════════════════════════════════
//  Type
// ═════════════════════════════════════════════════════════════════

export interface NotificationTypeConfig {
  /** SVG icon name from the shared Icon component. */
  icon: IconName;
  /** Background tint for the icon circle. */
  bg: string;
  /** Icon fill colour. */
  color: string;
  /** Human-readable label for filter chips. */
  label: string;
}

// ═════════════════════════════════════════════════════════════════
//  Map
// ═════════════════════════════════════════════════════════════════

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  'mock-test': {
    icon: 'clipboard-list',
    bg: '#E8F5E9',
    color: '#16A34A',
    label: 'Mock Tests',
  },
  result: {
    icon: 'bar-chart-2',
    bg: '#E3F2FD',
    color: '#2563EB',
    label: 'Results',
  },
  'live-class': {
    icon: 'video',
    bg: '#FFF3E0',
    color: '#EA580C',
    label: 'Live Classes',
  },
  course: {
    icon: 'book-open',
    bg: '#EDE9FF',
    color: '#7C3AED',
    label: 'Courses',
  },
  payment: {
    icon: 'badge-check',
    bg: '#FEF9C3',
    color: '#CA8A04',
    label: 'Payments',
  },
  announcement: {
    icon: 'calendar',
    bg: '#FCE7F3',
    color: '#DB2777',
    label: 'Announcements',
  },
  reminder: {
    icon: 'bell',
    bg: '#E0F2FE',
    color: '#0284C7',
    label: 'Reminders',
  },
  system: {
    icon: 'more-vertical',
    bg: '#F1F5F9',
    color: '#475569',
    label: 'System',
  },
} as const;

// ═════════════════════════════════════════════════════════════════
//  Helpers
// ═════════════════════════════════════════════════════════════════

/** Return the config for a given notification type. */
export function getNotificationTypeConfig(type: NotificationType): NotificationTypeConfig {
  return NOTIFICATION_TYPE_CONFIG[type];
}

/** Return a dot colour for the unread indicator based on type. */
export function getUnreadDotColor(type: NotificationType): string {
  return NOTIFICATION_TYPE_CONFIG[type].color;
}
