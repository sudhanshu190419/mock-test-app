/**
 * Premium Radius — "Confident Depth" Design System (v2)
 *
 * Squircle-friendly border radii with exact mathematical relationship
 * between cardOuter (20) and cardInner (16) for Double-Bezel concentricity.
 */

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 100, // Truly rounded for badges/pills

  // Double-bezel concentric radii (outer = inner + padding)
  cardOuter: 20,
  cardInner: 16,
} as const;

export type PremiumRadius = typeof radius;
