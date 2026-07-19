/**
 * AnimatedDotV5 — Magnetic Spring Page Indicator Dot
 *
 * Expands with spring physics when active, contracts when inactive.
 * Color transitions between accent and zinc-400.
 *
 * @module components/home/AnimatedDotV5
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, type SharedValue, Extrapolation, interpolate } from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

import { colors } from '../../theme/colors';
import { PAGE_INDICATOR } from './carouselConstants';

interface AnimatedDotV5Props {
  index: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  itemSpacing: number;
  activeColor?: string;
  inactiveColor?: string;
}

const AnimatedDotV5 = memo(function AnimatedDotV5({
  index,
  scrollX,
  cardWidth,
  itemSpacing,
  activeColor = '#05C46B',
  inactiveColor = '#94A3B8',
}: AnimatedDotV5Props): React.JSX.Element {
  const { reduceMotion, motionMultiplier } = useReducedMotion();

  const snapInterval = cardWidth + itemSpacing;

  const dotStyle = useAnimatedStyle(() => {
    const currentPage = scrollX.value / snapInterval;
    const distance = Math.abs(currentPage - index);
    const isActive = distance < 0.5;

    if (reduceMotion) {
      return {
        width: isActive ? PAGE_INDICATOR.activeWidth : PAGE_INDICATOR.inactiveWidth,
        height: PAGE_INDICATOR.height,
        borderRadius: PAGE_INDICATOR.height / 2,
        opacity: isActive ? 1 : 0.4,
        backgroundColor: isActive ? activeColor : inactiveColor,
      };
    }

    const width = withTiming(
      isActive ? PAGE_INDICATOR.activeWidth : PAGE_INDICATOR.inactiveWidth,
      { duration: 200 },
    );

    const opacity = withTiming(isActive ? 1 : 0.35, { duration: 180 });

    return {
      width,
      height: PAGE_INDICATOR.height,
      borderRadius: PAGE_INDICATOR.height / 2,
      opacity,
      backgroundColor: isActive ? activeColor : inactiveColor,
    };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
});

const styles = StyleSheet.create({
  dot: {
    height: PAGE_INDICATOR.height,
    borderRadius: PAGE_INDICATOR.height / 2,
  },
});

AnimatedDotV5.displayName = 'AnimatedDotV5';

export default AnimatedDotV5;