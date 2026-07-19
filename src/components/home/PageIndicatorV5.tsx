/**
 * PageIndicatorV5 — Magnetic Spring Page Dots Container
 *
 * Renders a row of AnimatedDotV5 components with center alignment.
 * Supports haptic feedback on page change (iOS).
 *
 * @module components/home/PageIndicatorV5
 */

import React, { memo } from 'react';
import { View, StyleSheet, Platform, NativeModules, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, useAnimatedReaction, runOnJS, type SharedValue } from 'react-native-reanimated';

import AnimatedDotV5 from './AnimatedDotV5';
import { PAGE_INDICATOR } from './carouselConstants';

interface PageIndicatorV5Props {
  count: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  itemSpacing: number;
  activeColor?: string;
  inactiveColor?: string;
  /** Show page number accessibility label */
  showAccessibilityLabels?: boolean;
  /** Container style override */
  containerStyle?: ViewStyle;
}

const { HapticFeedback } = NativeModules;

const triggerHaptic = () => {
  if (Platform.OS === 'ios' && HapticFeedback && typeof HapticFeedback.selection === 'function') {
    HapticFeedback.selection();
  }
};

const PageIndicatorV5 = memo(function PageIndicatorV5({
  count,
  scrollX,
  cardWidth,
  itemSpacing,
  activeColor = '#05C46B',
  inactiveColor = '#94A3B8',
  showAccessibilityLabels = true,
  containerStyle: containerStyleProp,
}: PageIndicatorV5Props): React.JSX.Element {
  const animatedContainerStyle = useAnimatedStyle(() => {
    // Subtle entrance animation
    return {
      opacity: withTiming(1, { duration: 200 }),
    };
  });

  // Track page change to trigger haptic on the UI thread without rendering access
  useAnimatedReaction(
    () => {
      const snapInterval = cardWidth + itemSpacing;
      return Math.round(scrollX.value / snapInterval);
    },
    (currentPage, prevPage) => {
      if (prevPage !== null && currentPage !== prevPage) {
        runOnJS(triggerHaptic)();
      }
    },
    [cardWidth, itemSpacing]
  );

  if (count <= 1) return <></>;

  return (
    <Animated.View style={[styles.container, containerStyleProp]}>
      {Array.from({ length: count }, (_, i) => (
        <AnimatedDotV5
          key={i}
          index={i}
          scrollX={scrollX}
          cardWidth={cardWidth}
          itemSpacing={itemSpacing}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: PAGE_INDICATOR.gap,
    paddingVertical: 8,
  },
});

PageIndicatorV5.displayName = 'PageIndicatorV5';

export default PageIndicatorV5;