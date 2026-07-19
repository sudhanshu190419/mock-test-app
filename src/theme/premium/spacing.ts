/**
 * Premium Spacing — "Confident Depth" Design System (v2)
 *
 * 8pt grid with generous macro-whitespace.
 */

export const spacing = {
  0: 0,
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  64: 64,

  // Named aliases & domain specifics
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xgiant: 64,

  screenPadding: 20,
  cardInset: 16,
  sectionGap: 32,
  heroHeight: 220,
  cardGap: 16,
} as const;

export type PremiumSpacing = typeof spacing;
