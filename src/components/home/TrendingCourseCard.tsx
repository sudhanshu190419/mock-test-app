/**
 * TrendingCourseCard
 *
 * Premium featured course hero card with:
 * - Full-bleed image background
 * - Floating "Best Seller" badge
 * - Bookmark icon
 * - Category chip
 * - Course title + description
 * - Instructor
 * - Price with discount strikethrough
 * - Two CTA buttons: Explore + Enroll Now
 *
 * @module components/home/TrendingCourseCard
 */

import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ImageBackground,
  StyleSheet,
  Platform,
  type DimensionValue,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import Icon from './Icons';
import type { TrendingCourseItem } from './types';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Background image for the hero card (full-bleed). */
const CARD_BACKGROUND = require('../../../assets/neet.png');

/** Avatar stack overlap offset. */
const AVATAR_OVERLAP = 8;

/** Random student avatar background tints. */
const AVATAR_TINTS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981'] as const;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TrendingCourseCardProps extends TrendingCourseItem {
  /** Stagger delay for entrance animation (ms). */
  animationDelay?: number;
  /** Callback when Explore is pressed. */
  onExplorePress?: () => void;
  /** Callback when Enroll Now is pressed. */
  onEnrollPress?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Render a row of star icons for the rating. */
const RatingStars = React.memo(function RatingStars({ rating, color }: { rating: number; color: string }): React.JSX.Element {
  const fullStars = Math.floor(rating);
  const remaining = rating - fullStars;

  return (
    <View style={styles.ratingRow}>
      {Array.from({ length: 5 }, (_, i) => {
        const fillRatio = i < fullStars ? 1 : i === fullStars ? remaining : 0;
        return (
          <View key={i} style={styles.starWrapper}>
            {/* Empty star behind */}
            <Icon name="star" color={color} width={14} height={14} />
            {/* Filled star overlay */}
            {fillRatio > 0 && (
              <View
                style={[
                  styles.starFill,
                  { width: `${fillRatio * 100}%` as DimensionValue },
                ]}
                pointerEvents="none"
              >
                <Icon name="star" color="#FBBF24" width={14} height={14} />
              </View>
            )}
          </View>
        );
      })}
      <Text style={[styles.ratingText, { color }]}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
});

// ─── Helpers (outside component) ────────────────────────────────────────────

/** Format price with Indian number formatting. */
function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const TrendingCourseCard = React.memo(function TrendingCourseCard({
  title,
  category,
  description,
  instructor,
  rating,
  totalStudents,
  price,
  originalPrice,
  isBestSeller,
  animationDelay = 0,
  onExplorePress,
  onEnrollPress,
  onBookmarkPress,
  onPress,
}: TrendingCourseCardProps): React.JSX.Element {
  // ── Entrance animation ────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim, animationDelay]);

  // ── Press scale feedback ──────────────────────────────────────
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [pressScale]);

  // ── Derived values ────────────────────────────────────────────
  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : 0;

  return (
    <Animated.View
      style={[
        styles.shadowWrapper,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: Animated.multiply(scaleAnim, pressScale) },
          ],
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Featured course: ${title}`}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.98}
        style={styles.touchable}
      >
        <ImageBackground
          source={CARD_BACKGROUND}
          resizeMode="cover"
          style={styles.card}
        >
          {/* Gradient overlay: darkens left for readability, fades to transparent on right */}
          <LinearGradient
            colors={['rgba(18,14,64,0.95)', 'rgba(18,14,64,0.55)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientScrim}
            pointerEvents="none"
          />

          {/* ── Content (on top of gradient) ───────────────────── */}
          <View style={styles.content}>
            {/* Top section: badge + text + illustration */}
            <View style={styles.topSection}>
              {/* Header row: Best Seller badge + Bookmark */}
              <View style={styles.topRow}>
                {isBestSeller && (
                  <View style={styles.bestSellerBadge}>
                    <Icon name="trophy" color="#FBBF24" width={12} height={12} />
                    <Text style={styles.bestSellerText}>Best Seller</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={onBookmarkPress}
                  style={styles.bookmarkButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Bookmark course"
                >
                  <Icon
                    name="bookmark"
                    color="rgba(255,255,255,0.7)"
                    width={18}
                    height={18}
                  />
                </TouchableOpacity>
              </View>

              {/* Content row: text */}
              <View style={styles.contentRow}>
                <View style={styles.textContent}>
                  {/* Category chip */}
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>

                  {/* Title */}
                  <Text style={styles.title} numberOfLines={2}>
                    {title}
                  </Text>

                  {/* Description */}
                  <Text style={styles.description} numberOfLines={2}>
                    {description}
                  </Text>

                  {/* Instructor */}
                  <Text style={styles.instructor}>
                    by{' '}
                    <Text style={styles.instructorName}>{instructor}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom section: price + CTA buttons */}
            <View>
              {/* Subtle divider separating course details from pricing */}
              <View style={styles.divider} />

              {/* Price row */}
              <View style={styles.priceRow}>
                <View style={styles.priceLeft}>
                  <Text style={styles.currentPrice}>{formatPrice(price)}</Text>
                  {originalPrice && originalPrice > price && (
                    <Text style={styles.originalPrice}>
                      {formatPrice(originalPrice)}
                    </Text>
                  )}
                  {discountPercent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* CTA buttons */}
              <View style={styles.ctaRow}>
                <TouchableOpacity
                  style={styles.exploreButton}
                  onPress={onExplorePress}
                  activeOpacity={0.8}
                  accessibilityLabel="Explore course"
                  accessibilityRole="button"
                >
                  <Icon
                    name="eye"
                    color="rgba(255,255,255,1)"
                    width={16}
                    height={16}
                  />
                  <Text style={styles.exploreText}>Explore</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.enrollButton}
                  onPress={onEnrollPress}
                  activeOpacity={0.8}
                  accessibilityLabel="Enroll Now"
                  accessibilityRole="button"
                >
                  <Text style={styles.enrollText}>Enroll Now</Text>
                  <Icon
                    name="arrow-right"
                    color="#1E1B4B"
                    width={16}
                    height={16}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shadowWrapper: {
    marginHorizontal: spacing[16],
    marginBottom: spacing[8],
    borderRadius: radius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#4C1D95',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  touchable: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    minHeight: 400,
  },
  gradientScrim: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    flex: 1,
    padding: spacing[20],
    justifyContent: 'space-between',
  },
  topSection: {
    flexShrink: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  bestSellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  bestSellerText: {
    ...typography.caption,
    color: '#FBBF24',
    fontWeight: '700',
    fontSize: 10,
  },
  bookmarkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[16],
  },
  textContent: {
    flex: 1,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
    marginBottom: spacing[12],
  },
  categoryText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  title: {
    ...typography.title,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: spacing[4],
  },
  description: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
    marginBottom: spacing[4],
  },
  instructor: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  instructorName: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarMore: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarTextMore: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  enrolledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  enrolledText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing[12],
  },
  starWrapper: {
    position: 'relative',
    width: 14,
    height: 14,
  },
  starFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  ratingText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: spacing[4],
  },
  divider: {
    alignSelf: 'center',
    width: '87%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginTop: spacing[20],
    marginBottom: spacing[8],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  currentPrice: {
    ...typography.title,
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  originalPrice: {
    ...typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: spacing[4],
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  discountText: {
    ...typography.caption,
    color: '#FBBF24',
    fontWeight: '800',
    fontSize: 9,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  exploreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  exploreText: {
    ...typography.buttonSmall,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  enrollButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
  enrollText: {
    ...typography.buttonSmall,
    fontSize: 13,
    color: '#1E1B4B',
    fontWeight: '800',
  },
});

export default TrendingCourseCard;
