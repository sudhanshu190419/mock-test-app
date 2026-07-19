/**
 * Premium Gradients — "Confident Depth" Design System (v2)
 *
 * Gradient definitions for hero banners, CTAs, and shimmer loading skeletons.
 */

export const gradients = {
  /** Indigo to Deep Navy diagonal hero gradient */
  hero: {
    colors: ['#312E81', '#1E1B4B', '#0F172A'],
    locations: [0, 0.55, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  /** Warm Amber to Gold CTA button gradient */
  cta: {
    colors: ['#FBBF24', '#F59E0B', '#D97706'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },

  /** Card thumbnail placeholder overlay */
  cardThumbnail: {
    colors: ['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.6)', 'rgba(15, 23, 42, 0.9)'],
    locations: [0, 0.6, 1],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },

  /** Animated shimmer highlight stops for loading skeletons */
  cardShimmer: {
    colors: ['#E2E8F0', '#F1F5F9', '#E2E8F0'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
} as const;

export type PremiumGradients = typeof gradients;
