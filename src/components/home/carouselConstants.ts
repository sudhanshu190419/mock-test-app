/**
 * Carousel Constants — V5 Premium
 *
 * Centralized configuration for all carousel dimensions, intervals, and physics.
 * Single source of truth for Trending Courses and PYQ Practice carousels.
 *
 * @module components/home/carouselConstants
 */

import { Dimensions } from 'react-native';
import { spacing } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Screen Breakpoints ─────────────────────────────────────────────────────
export const BREAKPOINTS = {
  small: 360,      // iPhone SE, small Android
  standard: 400,   // Standard phones
  large: 428,      // Plus/Pro/Max models
} as const;

// ─── Card Dimensions ─────────────────────────────────────────────────────────
export const CARD_DIMENSIONS = {
  // Hero card (first position) — full width minus horizontal padding
  hero: {
    width: SCREEN_WIDTH - spacing[32],
    height: 250,
    minHeight: 230,
  },

  // Standard card — core courses
  standard: {
    width: Math.min(SCREEN_WIDTH - spacing[32], 300),
    height: 280,
    minHeight: 260,
  },

  // Compact card — supplementary/upsell
  compact: {
    width: Math.min(SCREEN_WIDTH - spacing[32], 250),
    height: 250,
    minHeight: 230,
  },

  // PYQ Practice card
  pyq: {
    width: Math.min(SCREEN_WIDTH - spacing[32], 290),
    height: 220,
    minHeight: 200,
  },
} as const;

// ─── Layout Constants ───────────────────────────────────────────────────────
export const LAYOUT = {
  itemSpacing: spacing[16],
  horizontalPadding: spacing[16],
  contentPaddingRight: spacing[16] - spacing[16], // = 0, for last item flush

  // Snap interval = card width + spacing
  getSnapInterval: (cardWidth: number) => cardWidth + spacing[16],

  // Carousel performance
  initialNumToRender: 2,
  maxToRenderPerBatch: 3,
  windowSize: 3,
  removeClippedSubviews: true,
  decelerationRate: 0.998, // Natural momentum
  scrollEventThrottle: 16, // 60fps UI thread
} as const;

// ─── Trending Courses Carousel ───────────────────────────────────────────────
export const TRENDING_CAROUSEL = {
  // Card widths (asymmetric deck: Hero > Standard > Compact)
  heroWidth: SCREEN_WIDTH - spacing[32],           // Full-width minus 32px margins
  standardWidth: Math.min(SCREEN_WIDTH - spacing[32], 300),
  compactWidth: Math.min(SCREEN_WIDTH - spacing[32], 250),

  // Card heights
  heroHeight: 250,
  standardHeight: 280,
  compactHeight: 250,

  // Spacing between cards
  itemSpacing: spacing[16],

  // Horizontal padding for carousel content
  horizontalPadding: spacing[16],

  // Snap interval calculation
  getSnapInterval: (cardWidth: number) => cardWidth + spacing[16],

  // Scroll behavior
  decelerationRate: 0.998 as const,
  scrollEventThrottle: 16, // 60fps on UI thread

  // Rendering optimization
  initialNumToRender: 2,
  maxToRenderPerBatch: 3,
  windowSize: 3,
  removeClippedSubviews: true,

  // Stagger entrance delay (ms per index)
  staggerDelay: 80,

  // Maximum visible cards for layout calculations
  maxVisibleCards: 3,
} as const;

// ─── PYQ Practice Carousel ───────────────────────────────────────────────────
export const PYQ_CAROUSEL = {
  // Card dimensions (full-width cards for PYQ)
  cardWidth: SCREEN_WIDTH - spacing[32],
  cardHeight: 220,
  itemSpacing: spacing[16],

  // Auto-scroll
  autoScrollInterval: 4500, // ms
  autoScrollPauseDelay: 3000, // ms after interaction

  // Snap
  getSnapInterval: () => (SCREEN_WIDTH - spacing[32]) + spacing[16],

  // Scroll behavior
  decelerationRate: 0.998 as const,
  scrollEventThrottle: 16,

  // Rendering
  initialNumToRender: 2,
  maxToRenderPerBatch: 3,
  windowSize: 3,
  removeClippedSubviews: true,

  // Loop seamlessly (duplicate first item at end)
  enableLoop: true,
} as const;

// ─── Spring Physics (MOTION_INTENSITY: 6) ─────────────────────────────────────
export const SPRING_PHYSICS = {
  // Entrance animations — staggered
  entrance: { duration: 200 },

  // Press/tactile feedback
  press: { duration: 200 },

  // Magnetic hover/pull (web) / press zone (mobile)
  magnetic: { duration: 200 },

  // Scroll-linked scale/translate
  scrollLinked: { duration: 200 },

  // Page indicator dots
  dot: { duration: 200 },

  // Breathing/pulse animations
  breathe: { duration: 200 },

  // Shimmer sweep
  shimmer: { duration: 200 },

  // Layout transitions (Framer Motion layoutId equivalent)
  layout: { duration: 200 },
} as const;

// ─── Timing Config ───────────────────────────────────────────────────────────
export const TIMING = {
  // Stagger delay between card entrances (ms)
  staggerDelay: 80,

  // Auto-scroll interval for PYQ carousel (ms)
  autoScrollInterval: 4500,

  // Pause auto-scroll after interaction (ms)
  autoScrollPauseDelay: 3000,

  // Page indicator dot transition (ms)
  dotTransition: 180,

  // Entrance animation duration (ms) — when using withTiming
  entranceDuration: 400,

  // Press animation duration (ms)
  pressDuration: 120,
} as const;

// ─── Page Indicator Constants ────────────────────────────────────────────────
export const PAGE_INDICATOR = {
  activeWidth: 24,
  inactiveWidth: 6,
  height: 6,
  gap: 6,
} as const;

// ─── Shadow / Elevation Tokens ───────────────────────────────────────────────
export const SHADOWS = {
  // Diffusion shadow — wide, subtle (DESIGN_VARIANCE: 8)
  diffusion: {
    light: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.05,
      shadowRadius: 40,
    },
    dark: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.25,
      shadowRadius: 40,
    },
  },

  // Card shadow — tighter
  card: {
    light: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
    },
    dark: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
  },

  // Inner refraction shadow for glassmorphism
  glassInner: {
    light: 'rgba(255, 255, 255, 0.1)',
    dark: 'rgba(255, 255, 255, 0.06)',
  },

  // Glass border
  glassBorder: {
    light: 'rgba(255, 255, 255, 0.12)',
    dark: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

// ─── Z-Index System (Z-INDEX RESTRAINT) ──────────────────────────────────────
export const Z_INDEX = {
  base: 0,
  carouselCard: 1,
  carouselCardActive: 2,
  pageIndicator: 10,
  sectionHeader: 5,
  modal: 100,
  toast: 200,
} as const;

// ─── Animation Delays ─────────────────────────────────────────────────────────
export const DELAYS = {
  // Hero card enters first
  hero: 0,

  // Standard cards stagger
  standard: (index: number) => TIMING.staggerDelay * (index + 1),

  // Compact cards stagger
  compact: (index: number) => TIMING.staggerDelay * (index + 3),

  // PYQ cards stagger
  pyq: (index: number) => TIMING.staggerDelay * (index + 1),

  // Page dots stagger
  dot: (index: number) => TIMING.staggerDelay * index,
} as const;

// ─── Card Variant Type ───────────────────────────────────────────────────────
export type CardVariant = 'hero' | 'standard' | 'compact' | 'pyq';

export function getCardDimensions(variant: CardVariant) {
  switch (variant) {
    case 'hero':
      return CARD_DIMENSIONS.hero;
    case 'standard':
      return CARD_DIMENSIONS.standard;
    case 'compact':
      return CARD_DIMENSIONS.compact;
    case 'pyq':
      return CARD_DIMENSIONS.pyq;
    default:
      return CARD_DIMENSIONS.standard;
  }
}

export function getSnapInterval(cardWidth: number) {
  return cardWidth + spacing[16];
}