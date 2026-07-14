/**
 * Analytics Query Key Factory
 *
 * Centralised, stable query key definitions for the Analytics module.
 *
 * Every hook in this module derives its keys from this factory so that
 * cache invalidation is always consistent.
 *
 * ## Structure
 *
 * ```
 * analyticsKeys.all                 → root for all analytics queries
 * analyticsKeys.subject.all()       → root for subject analytics queries
 * analyticsKeys.subject.list()      → specific subject analytics query
 * analyticsKeys.chapter.all()       → root for chapter analytics queries
 * analyticsKeys.chapter.list()      → specific chapter analytics query
 * analyticsKeys.weak.all()          → root for weak chapters queries
 * analyticsKeys.weak.list()         → specific weak chapters query
 * analyticsKeys.strong.all()        → root for strong chapters queries
 * analyticsKeys.strong.list()       → specific strong chapters query
 * ```
 *
 * @module hooks/analytics/queryKeys
 */

export const analyticsKeys = {
  all: ['analytics'] as const,

  // ═════════════════════════════════════════════════════════════════════════
  //  Student Subject Analytics
  // ═════════════════════════════════════════════════════════════════════════

  subject: {
    /** Root key for all subject analytics queries. */
    all: () => [...analyticsKeys.all, 'subject'] as const,

    /** Key for the specific subject analytics query (no params — student derived from session). */
    list: () => [...analyticsKeys.subject.all(), 'list'] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Student Chapter Analytics
  // ═════════════════════════════════════════════════════════════════════════

  chapter: {
    /** Root key for all chapter analytics queries. */
    all: () => [...analyticsKeys.all, 'chapter'] as const,

    /** Key for the specific chapter analytics query (no params — student derived from session). */
    list: () => [...analyticsKeys.chapter.all(), 'list'] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Student Weak Chapters
  // ═════════════════════════════════════════════════════════════════════════

  weak: {
    /** Root key for all weak chapters queries. */
    all: () => [...analyticsKeys.all, 'weak'] as const,

    /** Key for the specific weak chapters query (no params — student derived from session). */
    list: () => [...analyticsKeys.weak.all(), 'list'] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Student Strong Chapters
  // ═════════════════════════════════════════════════════════════════════════

  strong: {
    /** Root key for all strong chapters queries. */
    all: () => [...analyticsKeys.all, 'strong'] as const,

    /** Key for the specific strong chapters query (no params — student derived from session). */
    list: () => [...analyticsKeys.strong.all(), 'list'] as const,
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  Student Score Trend
  // ═════════════════════════════════════════════════════════════════════════

  scoreTrend: {
    /** Root key for all score trend queries. */
    all: () => [...analyticsKeys.all, 'scoreTrend'] as const,

    /** Key for the specific score trend query (no params — student derived from session). */
    list: () => [...analyticsKeys.scoreTrend.all(), 'list'] as const,
  },
};
