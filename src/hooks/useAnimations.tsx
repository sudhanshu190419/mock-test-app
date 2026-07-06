import React, { useCallback } from 'react';
import type { ReactNode } from 'react';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { WithSpringConfig } from 'react-native-reanimated';

const PRESS_SPRING: WithSpringConfig = {
  damping: 20,
  mass: 0.3,
  stiffness: 300,
  overshootClamping: true,
};

const CARD_PRESS_SPRING: WithSpringConfig = {
  damping: 18,
  mass: 0.4,
  stiffness: 250,
  overshootClamping: true,
};

export function useAnimatedPress() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, PRESS_SPRING);
    opacity.value = withTiming(0.9, { duration: 120 });
  }, [scale, opacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
    opacity.value = withTiming(1, { duration: 200 });
  }, [scale, opacity]);

  return { pressStyle, handlePressIn, handlePressOut, scale };
}

export function useAnimatedCardPress() {
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, CARD_PRESS_SPRING);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, CARD_PRESS_SPRING);
  }, [scale]);

  return { cardStyle, handlePressIn, handlePressOut, scale };
}

/**
 * @deprecated Use plain View wrappers instead. Entrance animations
 * caused lag during navigation. Will be replaced with optimized
 * production animations in a future update.
 */
export function AnimatedSectionWrapper({
  children,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return <Animated.View>{children}</Animated.View>;
}
