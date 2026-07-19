/**
 * SectionHeaderV5 — Asymmetric Editorial Header
 *
 * Left-aligned title + subtitle with live metric badge.
 * Right-aligned "View All" glass pill with magnetic hover.
 * No centered layouts — pure editorial asymmetry.
 *
 * @module components/home/SectionHeaderV5
 */

import React, { memo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextStyle,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, type SharedValue, type AnimatedStyle } from 'react-native-reanimated';
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
import { useReducedMotion } from '../../hooks/useReducedMotion';

import Icon from './Icons';
import { colors, colorsV5 } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typographyV5 } from '../../theme/typography';

const springConfig = { duration: 200 };

export interface SectionHeaderV5Props {
  /** Main section title */
  title: string;
  /** Subtitle / context line */
  subtitle: string;
  /** Optional live metric (e.g., "1,247 enrolling now") */
  liveMetric?: string;
  /** Live metric pulse color (defaults to accent) */
  liveMetricColor?: string;
  /** "View All" button press handler */
  onViewAllPress?: () => void;
  /** Accessibility label for View All */
  viewAllAccessibilityLabel?: string;
  /** Custom icon for View All (defaults to arrow-right) */
  viewAllIcon?: string;
  /** Override title style */
  titleStyle?: StyleProp<TextStyle>;
  /** Override subtitle style */
  subtitleStyle?: StyleProp<TextStyle>;
}

const SectionHeaderV5 = memo(function SectionHeaderV5({
  title,
  subtitle,
  liveMetric,
  liveMetricColor = '#05C46B',
  onViewAllPress,
  viewAllAccessibilityLabel = 'View all',
  viewAllIcon = 'arrow-right',
  titleStyle,
  subtitleStyle,
}: SectionHeaderV5Props): React.JSX.Element {
  const { reduceMotion, motionMultiplier: mm } = useReducedMotion();

  // View All button press scale
  const pressScale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);

  // Live metric pulse
  const pulseScale = useSharedValue(1);

  const handlePressIn = () => {
    if (reduceMotion) return;
    pressScale.value = withTiming(0.96, springConfig);
    pressOpacity.value = withTiming(0.8, { duration: 80 * mm });
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    pressScale.value = withTiming(1, springConfig);
    pressOpacity.value = withTiming(1, { duration: 120 * mm });
  };

// Pulse animation for live metric
  const pulseAnimation = useCallback(() => {
    if (reduceMotion) return;
    pulseScale.value = withTiming(1.05, { duration: 200 }, () => {
      pulseScale.value = withTiming(1, { duration: 200 });
    });
  }, [reduceMotion]);

  // Trigger pulse periodically if live metric exists
  // (In production, this would be driven by actual live data updates)
  useEffect(() => {
    if (!liveMetric || reduceMotion) return;
    const interval = setInterval(pulseAnimation, 8000);
    return () => clearInterval(interval);
  }, [liveMetric, reduceMotion, pulseAnimation]);

  const viewAllAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    opacity: pressOpacity.value,
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const darkColor = colors.mint?.dark || '#052224';
  const accentColor = liveMetricColor;

  return (
    <View style={styles.container}>
      {/* Left: Editorial Title Block */}
      <View style={styles.titleBlock}>
        <Text style={[styles.title, typographyV5.displayAsymmetric, { color: darkColor }, titleStyle]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, typographyV5.metadata, { color: '#64748B' }, subtitleStyle]}>
          {subtitle}
        </Text>
        {liveMetric && (
          <Animated.View style={[styles.liveMetric, pulseAnimatedStyle]}>
            <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.liveText, typographyV5.metadataStrong, { color: darkColor }]}>
              {liveMetric}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Right: Glass "View All" Pill */}
      {onViewAllPress && (
        <AnimatedTouchableOpacity
          style={[styles.viewAllPill, viewAllAnimatedStyle]}
          onPress={onViewAllPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={reduceMotion ? 1 : 0.9}
          accessibilityLabel={viewAllAccessibilityLabel}
          accessibilityRole="button"
        >
          <Text style={[styles.viewAllText, typographyV5.buttonLabelSmall, { color: darkColor }]}>
            View All
          </Text>
          <Icon
            name={viewAllIcon as any}
            color={darkColor}
            width={14}
            height={14}
          />
        </AnimatedTouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[16],
    marginBottom: spacing[16],
    minHeight: 64,
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing[12],
    justifyContent: 'flex-end',
  },
  title: {
    marginBottom: 2,
    lineHeight: 34,
  },
  subtitle: {
    marginBottom: spacing[8],
    lineHeight: 17,
  },
  liveMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    lineHeight: 17,
  },
  viewAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[12],
    paddingVertical: 6,
    borderRadius: radius.xxl,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  viewAllText: {
    lineHeight: 16,
  },
});

SectionHeaderV5.displayName = 'SectionHeaderV5';

export default SectionHeaderV5;