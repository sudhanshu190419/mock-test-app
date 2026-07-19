/**
 * PyqPracticeCardV5 — Premium PYQ Practice Card (Style C Asymmetric Redesign)
 *
 * Implements the minimal/asymmetric Style C design featuring:
 * - Solid mint-accented top bar (6px asymmetric accent line)
 * - Clean white card surface with slate border (#E2E8F0)
 * - Neutral metadata tags (ASYNCHRONOUS DRILL, Category chip)
 * - Wrapped horizontal feature pills with icon prefix
 * - Slate-themed footer row with inline price block
 * - Solid dark action button ("Practice →") with micro-interaction hover scaling and shimmer effect
 *
 * @module components/home/PyqPracticeCardV5
 */

import React, { memo, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence, interpolate, type SharedValue, Easing, cancelAnimation } from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

import Icon from './Icons';
import type { PyqItem } from './types';
import { colors, colorsV5 } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typographyV5 } from '../../theme/typography';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  PYQ_CAROUSEL,
  SPRING_PHYSICS,
  DELAYS,
} from './carouselConstants';

// Color constants matching Style C design
const darkColor = '#0F172A';
const white = '#FFFFFF';
const accentMint = '#00D09E';
const borderSlate = '#E2E8F0';
const bgSlateLight = '#F8FAFC';
const bgSlatePill = '#F1F5F9';
const textSlateDark = '#0F172A';
const textSlateSub = '#475569';
const textSlateLight = '#94A3B8';

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const PyqPracticeCardV5 = memo(function PyqPracticeCardV5({
  title,
  category,
  features = [],
  price,
  originalPrice,
  badgeLabel,
  onPreviewPress,
  onStartPracticePress,
  onPress,
}: PyqItem & {
  onPreviewPress?: () => void;
  onStartPracticePress?: () => void;
  onPress?: () => void;
}): React.JSX.Element {
  const { reduceMotion } = useReducedMotion();

  // Shared values for tactile animations
  const pressScale = useSharedValue(1);
  const startPressScale = useSharedValue(1);
  const shimmerProgress = useSharedValue(0);
  const entranceProgress = useSharedValue(0);

  // Shimmer sweep on "Practice →" button (idle state)
  useEffect(() => {
    if (reduceMotion) {
      shimmerProgress.value = 0;
      return;
    }

    shimmerProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.linear }),
        withDelay(3000, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(shimmerProgress);
    };
  }, [reduceMotion, shimmerProgress]);

  // Staggered entrance animation
  useEffect(() => {
    if (reduceMotion) {
      entranceProgress.value = withTiming(1, { duration: 100 });
      return;
    }

    entranceProgress.value = withDelay(
      DELAYS.pyq?.(0) ?? 0,
      withTiming(1, SPRING_PHYSICS.entrance),
    );
  }, [reduceMotion, entranceProgress]);

  // Press handlers
  const handlePressIn = useCallback(() => {
    if (reduceMotion) return;
    pressScale.value = withTiming(0.98, SPRING_PHYSICS.press);
  }, [reduceMotion, pressScale]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion) return;
    pressScale.value = withTiming(1, SPRING_PHYSICS.press);
  }, [reduceMotion, pressScale]);

  const handleStartPressIn = useCallback(() => {
    if (reduceMotion) return;
    startPressScale.value = withTiming(0.95, SPRING_PHYSICS.press);
  }, [reduceMotion, startPressScale]);

  const handleStartPressOut = useCallback(() => {
    if (reduceMotion) return;
    startPressScale.value = withTiming(1, SPRING_PHYSICS.press);
  }, [reduceMotion, startPressScale]);

  // Animated styles
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const startPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: startPressScale.value }],
  }));

  const entranceStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ translateY: 0 }] };
    return {
      opacity: entranceProgress.value,
      transform: [
        { translateY: interpolate(entranceProgress.value, [0, 1], [20, 0]) },
        { scale: interpolate(entranceProgress.value, [0, 1], [0.95, 1]) },
      ],
    };
  }, [reduceMotion, entranceProgress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerProgress.value, [0, 1], [-120, 120]) }],
  }));

  return (
    <Animated.View
      style={[styles.container, entranceStyle, pressStyle]}
      accessibilityRole="summary"
      accessibilityLabel={`PYQ practice: ${title}`}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={reduceMotion ? 1 : 0.95}
        style={styles.touchable}
      >
        <View style={styles.card}>
          {/* Asymmetric Mint Top Bar */}
          <View style={styles.asymmetricBar} />

          {/* Top Bar: Badge + Category */}
          <View style={styles.topBar}>
            {badgeLabel ? (
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText} numberOfLines={1}>
                  {badgeLabel.toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>SOLVED PAPERS</Text>
              </View>
            )}
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {category.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Body Content */}
          <View style={styles.body}>
            <View>
              {/* Title */}
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>

              {/* Horizontal wrapped feature tags with stagger entrance */}
              <View style={styles.featureRow}>
                {features.map((feature, i) => (
                  <FeatureRowItem
                    key={feature.icon || i}
                    feature={feature}
                    entranceProgress={entranceProgress}
                  />
                ))}
              </View>
            </View>

            {/* Footer Row: Divider, Price, Action Button */}
            <View style={styles.footerRow}>
              {/* Price Block */}
              <View style={styles.priceBlock}>
                <Text style={styles.priceMain}>{formatPrice(price)}</Text>
                {originalPrice && originalPrice > price && (
                  <Text style={styles.originalPriceSub}>{formatPrice(originalPrice)}</Text>
                )}
              </View>

              {/* Start Practice Button */}
              <Animated.View style={styles.startButtonWrapper}>
                <AnimatedTouchableOpacity
                  style={[styles.btnStart, startPressStyle]}
                  onPressIn={handleStartPressIn}
                  onPressOut={handleStartPressOut}
                  onPress={onStartPracticePress}
                  activeOpacity={reduceMotion ? 1 : 0.9}
                  accessibilityLabel="Practice paper"
                  accessibilityRole="button"
                >
                  <Text style={styles.btnStartText}>Practice</Text>
                  <Icon name="arrow-right" color={white} width={14} height={14} />
                </AnimatedTouchableOpacity>

                {/* Shimmer Overlay */}
                <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
              </Animated.View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing[16],
    marginBottom: spacing[8],
    borderRadius: radius.xxl, // 24px
    borderWidth: 1.5,
    borderColor: borderSlate,
    backgroundColor: white,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: textSlateDark,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: { elevation: 3 },
    }),
  },
  touchable: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    minHeight: PYQ_CAROUSEL.cardHeight,
    backgroundColor: white,
  },
  asymmetricBar: {
    height: 6,
    backgroundColor: accentMint,
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  badgeNeutral: {
    backgroundColor: bgSlatePill,
    borderWidth: 1,
    borderColor: borderSlate,
    paddingHorizontal: spacing[8],
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeNeutralText: {
    color: textSlateSub,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  categoryChip: {
    backgroundColor: bgSlatePill,
    paddingHorizontal: spacing[8],
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: textSlateSub,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    justifyContent: 'space-between',
  },
  title: {
    color: textSlateDark,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: spacing[12],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing[12],
  },
  featureTag: {
    backgroundColor: bgSlateLight,
    borderWidth: 1,
    borderColor: bgSlatePill,
    paddingHorizontal: spacing[8],
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureTagText: {
    color: textSlateSub,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: bgSlatePill,
    paddingTop: spacing[12],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceBlock: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  priceMain: {
    fontSize: 17,
    fontWeight: '800',
    color: textSlateDark,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  originalPriceSub: {
    fontSize: 10,
    color: textSlateLight,
    textDecorationLine: 'line-through',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  startButtonWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 6,
  },
  btnStart: {
    backgroundColor: darkColor,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnStartText: {
    color: white,
    fontWeight: '700',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -120,
    width: 120,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    transform: [{ rotate: '25deg' }],
    overflow: 'hidden',
  },
});

interface FeatureRowItemProps {
  feature: { icon: string; text: string };
  entranceProgress: SharedValue<number>;
}

const FeatureRowItem = memo(function FeatureRowItem({
  feature,
  entranceProgress,
}: FeatureRowItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: entranceProgress.value,
      transform: [
        { translateY: interpolate(entranceProgress.value, [0, 1], [8, 0]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.featureTag, animatedStyle]}>
      {feature.icon ? (
        <Icon
          name={feature.icon as any}
          color={textSlateSub}
          width={11}
          height={11}
        />
      ) : (
        <Text style={styles.featureTagText}>⚡</Text>
      )}
      <Text style={styles.featureTagText}>{feature.text}</Text>
    </Animated.View>
  );
});

PyqPracticeCardV5.displayName = 'PyqPracticeCardV5';

export default PyqPracticeCardV5;