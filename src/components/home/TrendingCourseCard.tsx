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

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TrendingCourseCardProps extends TrendingCourseItem {
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
  onExplorePress,
  onEnrollPress,
  onBookmarkPress,
  onPress,
}: TrendingCourseCardProps): React.JSX.Element {
  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : 0;

  return (
    <View
      style={styles.shadowWrapper}
      accessibilityRole="summary"
      accessibilityLabel={`Featured course: ${title}`}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={1}
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

          {/* Content (on top of gradient) */}
          <View style={styles.content}>
            {/* Top section — fills remaining space naturally */}
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
                <View style={styles.textColumn}>
                  {/* Category chip — hidden when empty */}
                  {category ? (
                    <View style={styles.categoryChip}>
                      <Text style={styles.categoryText}>{category}</Text>
                    </View>
                  ) : null}

                  {/* Title */}
                  <Text style={styles.title} numberOfLines={3}>
                    {title}
                  </Text>

                  {/* Description */}
                  <Text style={styles.description} numberOfLines={3}>
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

            {/* Bottom section: divider + price + CTA — anchored to bottom */}
            <View style={styles.bottomSection}>
              {/* Divider */}
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
    </View>
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
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
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
  },
  topSection: {
    flexShrink: 1,
  },
  /** Anchors divider + price + CTA to the bottom of the card. */
  bottomSection: {
    marginTop: 'auto',
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
    marginBottom: spacing[12],
  },
  textColumn: {
    width: '65%',
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
    marginBottom: spacing[8],
  },
  description: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
    marginBottom: spacing[8],
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
    marginBottom: spacing[16],
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
