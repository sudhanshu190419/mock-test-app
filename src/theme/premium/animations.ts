/**
 * Premium Animations — "Confident Depth" Design System (v2)
 *
 * Spring physics and timing presets for Awwwards-tier micro-interactions.
 */

import { Easing } from 'react-native-reanimated';

export const animations = {
  // Spring configurations (damping, stiffness, mass)
  spring: {
    gentle: { duration: 200 },
    snappy: { duration: 200 },
    bouncy: { duration: 200 },
    pressScale: { duration: 200 },
  },

  // Timing durations (ms)
  duration: {
    fast: 200,
    normal: 350,
    slow: 600,
    stagger: 60,
  },

  // Easing curves
  easing: {
    smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
    decelerate: Easing.out(Easing.quad),
    accelerate: Easing.in(Easing.quad),
  },

  // Stagger helper limits (to prevent FlatList recycling layout jumps)
  maxStaggerCount: 6,
} as const;

export type PremiumAnimations = typeof animations;
