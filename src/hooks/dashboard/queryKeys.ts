/**
 * Dashboard Query Key Factory
 *
 * Centralised, stable query key definitions for the Dashboard module.
 *
 * Every hook in this module derives its keys from this factory so that
 * cache invalidation is always consistent.
 *
 * ## Structure
 *
 * ```
 * dashboardKeys.all              → root for all dashboard queries
 * dashboardKeys.summary.all()    → root for summary queries
 * dashboardKeys.summary.dashboard() → specific dashboard summary query
 * ```
 *
 * @module hooks/dashboard/queryKeys
 */

export const dashboardKeys = {
  all: ['dashboard'] as const,

  // ═════════════════════════════════════════════════════════════════════════
  //  Student Dashboard Summary
  // ═════════════════════════════════════════════════════════════════════════

  summary: {
    /** Root key for all dashboard summary queries. */
    all: () => [...dashboardKeys.all, 'summary'] as const,

    /** Key for the single student dashboard summary query (no params — student derived from session). */
    dashboard: () => [...dashboardKeys.summary.all(), 'dashboard'] as const,
  },
};
