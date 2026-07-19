/**
 * TrendingCourseCardV5 — Premium Asymmetric Course Card (Style C Asymmetric Redesign)
 *
 * Implements the minimal/asymmetric Style C design featuring:
 * - Solid mint-accented top bar (6px asymmetric accent line)
 * - Clean white card surface with slate border (#E2E8F0)
 * - Neutral metadata tags (Category badge, Best Seller badge)
 * - Rating & Enrollment row
 * - Wrapped horizontal feature pills with icon prefix
 * - Slate-themed footer row with inline price block
 * - Double action buttons (View details & Enroll with shimmer sweep)
 * - Scroll-linked scale/opacity/translateY depth transition
 *
 * @module components/home/TrendingCourseCardV5
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence, interpolate, Extrapolation, type SharedValue, Easing, cancelAnimation } from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

import Icon from './Icons';
import type { TrendingCourseItem } from './types';
import { getTrendingCategoryFeatures } from './types';
import { colors, colorsV5 } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typographyV5 } from '../../theme/typography';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  CARD_DIMENSIONS,
  SPRING_PHYSICS,
  TIMING,
  DELAYS,
  LAYOUT,
  type CardVariant,
} from './carouselConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface TrendingCourseCardV5Props {
  item: TrendingCourseItem;
  index: number;
  variant: CardVariant;
  scrollX: SharedValue<number>;
  onPress?: () => void;
  onExplorePress?: (key: string) => void;
  onEnrollPress?: (key: string) => void;
}

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatCount(count: number): string {
  if (count >= 100000) return `${(count / 100000).toFixed(1)}L+`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K+`;
  return count.toLocaleString('en-IN');
}

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

const TrendingCourseCardV5 = memo(function TrendingCourseCardV5({
  item,
  index,
  variant,
  scrollX,
  onPress,
  onExplorePress,
  onEnrollPress,
}: TrendingCourseCardV5Props): React.JSX.Element {
  const { reduceMotion, staggerMultiplier: sm } = useReducedMotion();

  // Shared values for animations
  const pressScale = useSharedValue(1);
  const pressY = useSharedValue(0);
  const explorePressScale = useSharedValue(1);
  const enrollPressScale = useSharedValue(1);
  const shimmerProgress = useSharedValue(0);
  const liveCounterValue = useSharedValue(item.totalStudents || 0);

  // Entrance animation
  const entranceProgress = useSharedValue(0);

  // Card dimensions
  const dims = useMemo(() => CARD_DIMENSIONS[variant], [variant]);
  const cardWidth = dims.width;
  const cardHeight = dims.height;

  // Snap interval for scroll-linked animations
  const snapInterval = cardWidth + LAYOUT.itemSpacing;

  // Compute discount
  const discountPercent = item.originalPrice && item.originalPrice > item.price
    ? Math.round((1 - item.price / item.originalPrice) * 100)
    : 0;

  // Combined transform for card depth transition in carousel
  const combinedAnimatedStyle = useAnimatedStyle(() => {
    const cardCenter = index * snapInterval;
    const distance = scrollX.value - cardCenter;
    const absDistance = Math.abs(distance);

    let scrollScale = 1;
    let scrollTranslateY = 0;
    let scrollOpacity = 1;

    if (!reduceMotion) {
      scrollScale = interpolate(
        absDistance,
        [0, snapInterval],
        [1, 0.93],
        Extrapolation.CLAMP,
      );
      scrollTranslateY = interpolate(
        absDistance,
        [0, snapInterval],
        [0, -6],
        Extrapolation.CLAMP,
      );
      scrollOpacity = interpolate(
        absDistance,
        [0, snapInterval],
        [1, 0.85],
        Extrapolation.CLAMP,
      );
    }

    const pressScaleVal = pressScale.value;
    const pressYVal = pressY.value;

    let entranceOpacity = 1;
    let entranceTranslateY = 0;
    let entranceScale = 1;

    if (!reduceMotion) {
      entranceOpacity = entranceProgress.value;
      entranceTranslateY = interpolate(entranceProgress.value, [0, 1], [20, 0]);
      entranceScale = interpolate(entranceProgress.value, [0, 1], [0.95, 1]);
    }

    return {
      transform: [
        { scale: scrollScale * pressScaleVal * entranceScale },
        { translateY: scrollTranslateY + pressYVal + entranceTranslateY },
      ],
      opacity: scrollOpacity * entranceOpacity,
    };
  }, [reduceMotion, index, snapInterval, scrollX]);

  // Explore button press style
  const explorePressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: explorePressScale.value }],
  }));

  // Enroll button press style
  const enrollPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: enrollPressScale.value }],
  }));

  // Shimmer sweep on enroll button
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerProgress.value, [0, 1], [-120, 120]) }],
  }));

  // Staggered entrance
  useEffect(() => {
    if (reduceMotion) {
      entranceProgress.value = withTiming(1, { duration: 100 });
      return;
    }

    const delay = DELAYS[variant as keyof typeof DELAYS] ?? 0;
    const delayMs = typeof delay === 'function' ? delay(index) : delay;

    entranceProgress.value = withDelay(
      delayMs * sm,
      withTiming(1, SPRING_PHYSICS.entrance),
    );
  }, [index, variant, reduceMotion, sm]);

  // Shimmer loop on action button
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

  // Live counter animation
  useEffect(() => {
    if (reduceMotion) {
      liveCounterValue.value = item.totalStudents || 0;
      return;
    }

    liveCounterValue.value = withTiming(item.totalStudents || 0, { duration: 200 });
  }, [item.totalStudents, reduceMotion, liveCounterValue]);

  // Press handlers for the card
  const handlePressIn = useCallback(() => {
    if (reduceMotion) return;
    pressScale.value = withTiming(0.97, SPRING_PHYSICS.press);
    pressY.value = withTiming(2, SPRING_PHYSICS.press);
  }, [reduceMotion, pressScale, pressY]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion) return;
    pressScale.value = withTiming(1, SPRING_PHYSICS.press);
    pressY.value = withTiming(0, SPRING_PHYSICS.press);
  }, [reduceMotion, pressScale, pressY]);

  const handleExplorePressIn = useCallback(() => {
    if (reduceMotion) return;
    explorePressScale.value = withTiming(0.95, SPRING_PHYSICS.press);
  }, [reduceMotion, explorePressScale]);

  const handleExplorePressOut = useCallback(() => {
    if (reduceMotion) return;
    explorePressScale.value = withTiming(1, SPRING_PHYSICS.press);
  }, [reduceMotion, explorePressScale]);

  const handleEnrollPressIn = useCallback(() => {
    if (reduceMotion) return;
    enrollPressScale.value = withTiming(0.95, SPRING_PHYSICS.press);
  }, [reduceMotion, enrollPressScale]);

  const handleEnrollPressOut = useCallback(() => {
    if (reduceMotion) return;
    enrollPressScale.value = withTiming(1, SPRING_PHYSICS.press);
  }, [reduceMotion, enrollPressScale]);

  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  // Fallback to auto-derived categories features if none provided custom
  const courseFeatures = useMemo(() => {
    if (item.features && item.features.length > 0) {
      return item.features;
    }
    return getTrendingCategoryFeatures(item.category);
  }, [item.features, item.category]);

  return (
    <Animated.View style={[styles.container, { width: cardWidth, height: cardHeight }, combinedAnimatedStyle]}>
      <TouchableOpacity
        activeOpacity={reduceMotion ? 1 : 0.96}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress ?? (() => onExplorePress?.(item.key))}
        style={styles.touchable}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${formatPrice(item.price)}${item.originalPrice ? `, was ${formatPrice(item.originalPrice)}` : ''}, ${item.rating?.toFixed(1)} stars`}
      >
        <View style={styles.cardSurface}>
          {/* Asymmetric Mint Top Bar */}
          <View style={styles.asymmetricBar} />

          {/* Top Bar: Badge + Category */}
          <View style={styles.topBar}>
            {item.isBestSeller ? (
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>BEST SELLER</Text>
              </View>
            ) : (
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>FEATURED COURSE</Text>
              </View>
            )}
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {item.category?.toUpperCase() || 'PREP'}
              </Text>
            </View>
          </View>

          {/* Body Content */}
          <View style={styles.body}>
            <View>
              {/* Rating & Enrollment */}
              <View style={styles.ratingRow}>
                <Icon name="star" color="#F59E0B" width={12} height={12} />
                <Text style={styles.ratingText}>
                  {item.rating ? item.rating.toFixed(1) : '4.8'}
                </Text>
                {(item.totalStudents || 0) > 0 && (
                  <>
                    <View style={styles.ratingDot} />
                    <Animated.Text style={styles.enrolledText}>
                      {formatCount(liveCounterValue.value)} Students
                    </Animated.Text>
                  </>
                )}
              </View>

              {/* Title */}
              <Text style={[isHero ? styles.titleHero : styles.title]} numberOfLines={2}>
                {item.title}
              </Text>

              {/* Instructor */}
              <Text style={styles.instructorText} numberOfLines={1}>
                By {item.instructor || 'Senior Master Faculty'}
              </Text>

              {/* Horizontal wrapped features row */}
              <View style={styles.featuresRow}>
                {courseFeatures.slice(0, isCompact ? 2 : 3).map((feature, i) => (
                  <FeatureRowItem
                    key={feature.icon || i}
                    feature={feature}
                    entranceProgress={entranceProgress}
                  />
                ))}
              </View>
            </View>

            {/* Footer Row: Divider, Price, Double Button Group */}
            <View style={styles.footerRow}>
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.currentPrice}>
                    {formatPrice(item.price)}
                  </Text>
                  {discountPercent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                    </View>
                  )}
                </View>
                {item.originalPrice && item.originalPrice > item.price && (
                  <Text style={styles.originalPrice}>
                    {formatPrice(item.originalPrice)}
                  </Text>
                )}
              </View>

              {/* Button Group */}
              <View style={styles.buttonGroup}>
                <AnimatedTouchableOpacity
                  style={[styles.exploreButton, explorePressStyle]}
                  onPressIn={handleExplorePressIn}
                  onPressOut={handleExplorePressOut}
                  onPress={() => onExplorePress?.(item.key)}
                  activeOpacity={reduceMotion ? 1 : 0.8}
                  accessibilityLabel="View course details"
                  accessibilityRole="button"
                >
                  <Text style={styles.exploreText}>View</Text>
                </AnimatedTouchableOpacity>

                <Animated.View style={styles.enrollButtonWrapper}>
                  <AnimatedTouchableOpacity
                    style={[styles.enrollButton, enrollPressStyle]}
                    onPressIn={handleEnrollPressIn}
                    onPressOut={handleEnrollPressOut}
                    onPress={() => onEnrollPress?.(item.key)}
                    activeOpacity={reduceMotion ? 1 : 0.9}
                    accessibilityLabel="Enroll in this course"
                    accessibilityRole="button"
                  >
                    <Text style={styles.enrollText}>Enroll</Text>
                    <Icon name="arrow-right" color={white} width={12} height={12} />
                  </AnimatedTouchableOpacity>

                  {/* Shimmer overlay */}
                  <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
                </Animated.View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xxl, // 24px
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: borderSlate,
    backgroundColor: white,
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
    flex: 1,
  },
  cardSurface: {
    flex: 1,
    borderRadius: radius.xxl,
    overflow: 'hidden',
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
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
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
    paddingBottom: spacing[12],
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing[4],
  },
  ratingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: textSlateLight,
    marginHorizontal: 2,
  },
  ratingText: {
    color: textSlateDark,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  enrolledText: {
    color: textSlateSub,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  title: {
    color: textSlateDark,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  titleHero: {
    color: textSlateDark,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  instructorText: {
    color: textSlateSub,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing[8],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing[8],
  },
  featureTag: {
    backgroundColor: bgSlateLight,
    borderWidth: 1,
    borderColor: bgSlatePill,
    paddingHorizontal: spacing[8],
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureTagText: {
    color: textSlateSub,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  divider: {
    height: 1,
    backgroundColor: bgSlatePill,
    marginBottom: spacing[8],
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: bgSlatePill,
    paddingTop: spacing[8],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currentPrice: {
    color: textSlateDark,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  discountText: {
    color: '#15803D',
    fontSize: 8,
    fontWeight: '800',
  },
  originalPrice: {
    color: textSlateLight,
    fontSize: 10,
    textDecorationLine: 'line-through',
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exploreButton: {
    paddingHorizontal: spacing[12],
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: borderSlate,
    backgroundColor: white,
  },
  exploreText: {
    color: textSlateSub,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  enrollButtonWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 6,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[12],
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: darkColor,
  },
  enrollText: {
    color: white,
    fontSize: 12,
    fontWeight: '700',
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
        { translateY: interpolate(entranceProgress.value, [0, 1], [6, 0]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.featureTag, animatedStyle]}>
      {feature.icon ? (
        <Icon
          name={feature.icon as any}
          color={textSlateSub}
          width={10}
          height={10}
        />
      ) : (
        <Text style={styles.featureTagText}>⚡</Text>
      )}
      <Text style={styles.featureTagText}>{feature.text}</Text>
    </Animated.View>
  );
});

TrendingCourseCardV5.displayName = 'TrendingCourseCardV5';

export default TrendingCourseCardV5;