/**
 * Practice Query Key Factory
 *
 * Centralised, stable query key definitions for the PYQ Practice module.
 *
 * Every hook in this module derives its keys from this factory so that
 * cache invalidation is always consistent — mutating one entity never
 * accidentally invalidates another's cache.
 *
 * ## Structure
 *
 * Each entity follows the same hierarchy:
 * ```
 * practiceKeys.<entity>.all        → root for the entity
 * practiceKeys.<entity>.lists()     → all list-type queries
 * practiceKeys.<entity>.list(f,s,p) → specific list query (keyed by params)
 * practiceKeys.<entity>.details()   → all detail-type queries
 * practiceKeys.<entity>.detail(id)  → single item query
 * ```
 *
 * ═══ SCHEMA NOTES ═══
 *
 * - `pyq_packages` table exists (Domain 06) → ✅ fully backed
 * - `pyq_papers` table exists (Domain 06) → ✅ detail queries backed
 * - `streams` table exists (Domain 02) → ✅ used for filter options
 * - `subjects` table exists (Domain 02) → ✅ used for filter options
 * - `chapters` table exists (Domain 02) → ✅ used for filter options
 *
 * @module hooks/practice/queryKeys
 */

import type { PaginationParams } from '../../types/academic';
import type { PracticeFilters, PracticeSortOptions } from '../../types/practice';

export const practiceKeys = {
  all: ['practice'] as const,

  // ═════════════════════════════════════════════════════════════════════════
  //  Featured (Home Screen preview)
  // ═════════════════════════════════════════════════════════════════════════

  featured: {
    /** Root key for all featured practice queries. */
    all: () => [...practiceKeys.all, 'featured'] as const,

    /** Key for the single featured list query (keyed by limit and streamId). */
    list: (limit?: number, streamId?: string | null) => [...practiceKeys.featured.all(), limit, streamId] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Practice List (Practice page — full listing)
  // ═════════════════════════════════════════════════════════════════════════

  list: {
    /** Root key for all practice list queries. */
    all: () => [...practiceKeys.all, 'list'] as const,

    /** Key for every practice list query (used for broad invalidation). */
    lists: () => [...practiceKeys.list.all(), 'list'] as const,

    /** Key for a specific practice list query with its params. */
    list: (
      filters?: PracticeFilters,
      sort?: PracticeSortOptions,
      pagination?: PaginationParams,
    ) => [...practiceKeys.list.lists(), filters, sort, pagination] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Detail (single package + papers)
  // ═════════════════════════════════════════════════════════════════════════

  detail: {
    /** Root key for all practice detail queries. */
    all: () => [...practiceKeys.all, 'detail'] as const,

    /** Key for every practice detail query. */
    details: () => [...practiceKeys.detail.all(), 'detail'] as const,

    /** Key for a single package detail by ID. */
    detail: (packageId: string) => [...practiceKeys.detail.details(), packageId] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Filters (available filter options)
  // ═════════════════════════════════════════════════════════════════════════

  filters: {
    /** Root key for all practice filter queries. */
    all: () => [...practiceKeys.all, 'filters'] as const,

    /** Key for the single filter options query. */
    options: () => [...practiceKeys.filters.all(), 'options'] as const,
  },
};
