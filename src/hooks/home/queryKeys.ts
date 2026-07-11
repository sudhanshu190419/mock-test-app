/**
 * Home Query Key Factory
 *
 * Centralised, stable query key definitions for the Home Screen module.
 *
 * Every hook in this module derives its keys from this factory so that
 * cache invalidation is always consistent — mutating one entity never
 * accidentally invalidates another's cache.
 *
 * ## Structure
 *
 * Each entity follows the same hierarchy:
 * ```
 * homeKeys.<entity>.all        → root for the entity
 * homeKeys.<entity>.lists()     → all list-type queries
 * homeKeys.<entity>.list(f,s,p) → specific list query (keyed by params)
 * homeKeys.<entity>.details()   → all detail-type queries
 * homeKeys.<entity>.detail(id)  → single item query
 * ```
 *
 * ═══ SCHEMA NOTES ═══
 *
 * - `home_banners` table does not exist → banners backed by `content` table
 * - `home_config` table does not exist → config returned as hardcoded defaults
 * - `courses` table exists (Domain 16) → ✅ courses backed by `courses` table
 * - `course_enrollments` table exists (Domain 16) → ✅ used for enrollment exclusion in recommended queries
 *
 * @module hooks/home/queryKeys
 */

import type { PaginationParams } from '../../types/academic';

export const homeKeys = {
  all: ['home'] as const,

  // ═════════════════════════════════════════════════════════════════════════
  //  Dashboard
  // ═════════════════════════════════════════════════════════════════════════

  dashboard: {
    /** Root key for all dashboard queries. */
    all: () => [...homeKeys.all, 'dashboard'] as const,

    /** Key for the current user's dashboard summary. */
    summary: (userId?: string) => [...homeKeys.dashboard.all(), 'summary', userId] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Banners (backed by `content` table — no filters/sort/pagination)
  // ═════════════════════════════════════════════════════════════════════════

  banners: {
    /** Root key for all banner queries. */
    all: () => [...homeKeys.all, 'banners'] as const,

    /** Key for the single banner list query (no filters/pagination). */
    list: () => [...homeKeys.banners.all(), 'list'] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Courses (backed by `courses` table — Domain 16)
  // ═════════════════════════════════════════════════════════════════════════

  courses: {
    /** Root key for all course queries. */
    all: () => [...homeKeys.all, 'courses'] as const,

    /** Key for every course list query (used for broad invalidation). */
    lists: () => [...homeKeys.courses.all(), 'list'] as const,

    /** Key for trending courses (only pagination param). */
    trending: (pagination?: PaginationParams) =>
      [...homeKeys.courses.all(), 'trending', pagination] as const,

    /** Key for latest courses. */
    latest: (limit?: number) => [...homeKeys.courses.all(), 'latest', limit] as const,

    /** Key for recommended courses (scoped to user). */
    recommended: (userId?: string) => [...homeKeys.courses.all(), 'recommended', userId] as const,

    /** Key for featured courses by ID set. */
    featured: (ids?: string[]) => [...homeKeys.courses.all(), 'featured', ids] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Streams (backed by actual `streams` table — ✅ no schema issues)
  // ═════════════════════════════════════════════════════════════════════════

  streams: {
    /** Root key for all home stream queries. */
    all: () => [...homeKeys.all, 'streams'] as const,

    /** Key for every home stream list query. */
    lists: () => [...homeKeys.streams.all(), 'list'] as const,

    /** Key for a specific home stream list query with its params. */
    list: (pagination?: PaginationParams) =>
      [...homeKeys.streams.lists(), pagination] as const,

    /** Key for every home stream detail query. */
    details: () => [...homeKeys.streams.all(), 'detail'] as const,

    /** Key for a single home stream by ID. */
    detail: (id: string) => [...homeKeys.streams.details(), id] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Notifications (backed by `notification_recipients` + `notifications` join)
  // ═════════════════════════════════════════════════════════════════════════

  notifications: {
    /** Root key for all home notification queries. */
    all: () => [...homeKeys.all, 'notifications'] as const,

    /** Key for the notification summary for a user. */
    summary: (userId?: string) => [...homeKeys.notifications.all(), 'summary', userId] as const,

    /** Key for the unread count only. */
    unreadCount: (userId?: string) =>
      [...homeKeys.notifications.all(), 'unreadCount', userId] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Home Configuration (no backing table — returned as defaults)
  // ═════════════════════════════════════════════════════════════════════════

  config: {
    /** Root key for all config queries. */
    all: () => [...homeKeys.all, 'config'] as const,

    /** Key for the active home configuration (no configId param — table doesn't exist yet). */
    active: () => [...homeKeys.config.all(), 'active'] as const,
  },
};
