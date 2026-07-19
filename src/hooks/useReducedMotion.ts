/**
 * useReducedMotion Hook — Accessibility
 *
 * Detects system-level "Reduce Motion" preference and provides
 * a motion multiplier for scaling animations.
 * When reduced motion is enabled, all spring animations become instant,
 * and stagger delays are removed.
 *
 * @module hooks/useReducedMotion
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export interface ReducedMotionResult {
  /** Whether the user has requested reduced motion */
  reduceMotion: boolean;
  /** Multiplier for animation durations (0 = instant, 1 = normal) */
  motionMultiplier: number;
  /** Delay multiplier for stagger animations (0 = no stagger) */
  staggerMultiplier: number;
}

let reducedMotionListener: (() => void) | null = null;

export function useReducedMotion(): ReducedMotionResult {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Initial check
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    // Listen for changes
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      listener.remove();
    };
  }, []);

  // On iOS, also respect "Prefer Cross-Fade Transitions" which implies reduced motion
  // On Android, "Remove animations" in developer options

  return {
    reduceMotion,
    motionMultiplier: reduceMotion ? 0 : 1,
    staggerMultiplier: reduceMotion ? 0 : 1,
  };
}

// For components that need synchronous access without hook overhead
export function getReducedMotionSync(): Promise<boolean> {
  return AccessibilityInfo.isReduceMotionEnabled();
}

// Utility to wrap spring configs with reduced motion support
export function withReducedMotion<T extends { duration: 200 }>(
  config: T,
  reduceMotion: boolean,
): T | { duration: 0 } {
  if (reduceMotion) {
    return { duration: 0 } as any;
  }
  return config;
}

// Utility for timing animations with reduced motion
export function withReducedTiming(
  toValue: number | string,
  config: { duration: number; easing?: any },
  reduceMotion: boolean,
) {
  if (reduceMotion) {
    return toValue;
  }
  return {
    toValue,
    duration: config.duration,
    easing: config.easing,
  };
}