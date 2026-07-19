/**
 * Premium Shadows — "Confident Depth" Design System (v2)
 *
 * Multi-layer depth tailored for mobile Double-Bezel cards.
 * Uses outer shell machining + inner core lighting without Android elevation clipping.
 */

import { Platform, type ViewStyle } from 'react-native';

export const shadows = {
  /** Outer shell shadow for double-bezel cards */
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) as ViewStyle,

  /** Standard interactive card shadow */
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }) as ViewStyle,

  /** Elevated modals, bottom sheets, and active cards */
  elevated: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }) as ViewStyle,

  /** Deep shadow for hero overlay and floating elements */
  deep: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#1E1B4B',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 28,
    },
    android: {
      elevation: 12,
    },
    default: {},
  }) as ViewStyle,

  /** Inner highlight values for Double-Bezel inset glow */
  innerHighlight: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FFFFFF',
  } as ViewStyle,
} as const;

export type PremiumShadows = typeof shadows;
