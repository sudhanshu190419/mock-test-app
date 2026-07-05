/**
 * CourseCard
 *
 * Premium vertical course card for the Courses screen.
 *
 * Layout:
 * ┌──────────────────────────────┐
 * │        Banner Image          │  ← 35-40% of card height
 * │  ┌──────┐        ┌────────┐ │
 * │  │ Badge │        │ Bookmark│ │  ← floating badges
 * │  └──────┘        └────────┘ │
 * ├──────────────────────────────┤
 * │         Course Details       │  ← white background
 * │  Title                       │
 * │  Subtitle                    │
 * │  Description (2 lines)       │ *  │  ───────────────────────     │  ← divider
 *  │  ⏱ Duration  │  🎥 Live + Rec  │  ← stats row
 *  │  ───────────────────────     │  ← divider
 * │  ₹Price  ₹Original  -75%    │
 * │  [      Explore →          ] │  ← CTA button
 * └──────────────────────────────┘
 *
 * @module components/courses/CourseCard
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import Icon from '../home/Icons';
import type { CourseItem, CourseBadgeType, CourseCategory } from '../home/types';
import type { IconName as IconNameType } from '../home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── Subject-specific banner gradients & illustrations ─────────────────────

interface BannerConfig {
  /** Gradient colours for the banner background. */
  gradient: [string, string, ...string[]];
  /** Emoji / icon character for the illustration overlay. */
  emoji: string;
  /** Accent badge colour. */
  accent: string;
}

const BANNER_CONFIGS: Record<string, BannerConfig> = {
  JEE: {
    gradient: ['#1E1B4B', '#312E81', '#4C1D95'] as [string, string, ...string[]],
    emoji: '⚡',
    accent: '#818CF8',
  },
  NEET: {
    gradient: ['#064E3B', '#065F46', '#047857'] as [string, string, ...string[]],
    emoji: '🔬',
    accent: '#34D399',
  },
  'Class 9': {
    gradient: ['#1E3A5F', '#1E4D7A', '#1A5F8A'] as [string, string, ...string[]],
    emoji: '📚',
    accent: '#60A5FA',
  },
  'Class 10': {
    gradient: ['#1E1B4B', '#3730A3', '#4338CA'] as [string, string, ...string[]],
    emoji: '📖',
    accent: '#818CF8',
  },
  'Class 11': {
    gradient: ['#0F172A', '#1E293B', '#334155'] as [string, string, ...string[]],
    emoji: '🧪',
    accent: '#94A3B8',
  },
  'Class 12': {
    gradient: ['#1C1917', '#292524', '#44403C'] as [string, string, ...string[]],
    emoji: '🎯',
    accent: '#A8A29E',
  },
  CUET: {
    gradient: ['#1A0A3E', '#2D1B69', '#44107A'] as [string, string, ...string[]],
    emoji: '🎓',
    accent: '#C084FC',
  },
  CLAT: {
    gradient: ['#0B0C10', '#1F2833', '#2B2D42'] as [string, string, ...string[]],
    emoji: '⚖️',
    accent: '#8D99AE',
  },
  UPSC: {
    gradient: ['#0D0D1A', '#1A1A3E', '#2A0845'] as [string, string, ...string[]],
    emoji: '🏛️',
    accent: '#A78BFA',
  },
  SSC: {
    gradient: ['#1B1B2F', '#162447', '#1F4068'] as [string, string, ...string[]],
    emoji: '📊',
    accent: '#63B3ED',
  },
  Banking: {
    gradient: ['#1E0A3C', '#2D1B69', '#4A1F7A'] as [string, string, ...string[]],
    emoji: '🏦',
    accent: '#D8B4FE',
  },
  MBA: {
    gradient: ['#0D0D1A', '#1A1A3E', '#2A0845'] as [string, string, ...string[]],
    emoji: '💼',
    accent: '#A78BFA',
  },
};

function getBannerConfig(category: CourseCategory): BannerConfig {
  return (
    BANNER_CONFIGS[category] ?? {
      gradient: ['#1E1B4B', '#312E81', '#4C1D95'] as [string, string, ...string[]],
      emoji: '📚',
      accent: '#818CF8',
    }
  );
}

// ─── Badge styling ──────────────────────────────────────────────────────────

const BADGE_STYLES: Record<
  CourseBadgeType,
  { bg: string; text: string; icon: string }
> = {
  'Best Seller': {
    bg: 'rgba(251, 191, 36, 0.2)',
    text: '#FBBF24',
    icon: 'trophy',
  },
  Popular: {
    bg: 'rgba(59, 130, 246, 0.2)',
    text: '#60A5FA',
    icon: 'star',
  },
  'New Launch': {
    bg: 'rgba(16, 185, 129, 0.2)',
    text: '#34D399',
    icon: 'badge-check',
  },
};

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CourseCardProps extends CourseItem {
  /** Stagger delay for entrance animation (ms). */
  animationDelay?: number;
}

// ─── Format helpers ─────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

const CourseCard = React.memo(function CourseCard({
  title,
  subtitle,
  description,
  category,
  badgeLabel,
  badgeType = 'Best Seller',
  stats,
  price,
  originalPrice,
  discountLabel,
  isBookmarked = false,
  animationDelay = 0,
  onPress,
  onExplorePress,
  onBookmarkPress,
}: CourseCardProps): React.JSX.Element {
  // ── Entrance animation ────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, animationDelay]);

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
  const badgeStyle = BADGE_STYLES[badgeType] ?? BADGE_STYLES['Best Seller'];
  const bannerConfig = getBannerConfig(category);
  const discount =
    discountLabel ??
    (originalPrice && originalPrice > price
      ? `${Math.round((1 - price / originalPrice) * 100)}% Off`
      : undefined);

  return (
    <Animated.View
      style={[
        styles.shadowWrapper,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: pressScale },
          ],
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Course: ${title}`}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.96}
        style={styles.touchable}
      >
        {/* ═══ Top Section: Banner Gradient ═══ */}
        <LinearGradient
          colors={bannerConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerContainer}
        >
          {/* Decorative circles for visual depth */}
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />

          {/* Emoji illustration */}
          <Text style={styles.bannerEmoji}>{bannerConfig.emoji}</Text>

          {/* Premium Badge — top-left */}
          <View style={[styles.badgePill, { backgroundColor: badgeStyle.bg }]}>
            <Icon name={badgeStyle.icon as IconNameType} color={badgeStyle.text} width={12} height={12} />
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
              {badgeLabel}
            </Text>
          </View>

          {/* Bookmark Icon — top-right (glassmorphism) */}
          <TouchableOpacity
            onPress={onBookmarkPress}
            style={styles.bookmarkButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark course'}
          >
            <View style={styles.bookmarkGlass}>
              <Icon
                name="bookmark"
                color={isBookmarked ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
                width={16}
                height={16}
              />
            </View>
          </TouchableOpacity>
        {/* ═══ Bottom Section: Course Details ═══ */}
        </LinearGradient>
        <View style={styles.detailsContainer}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Statistics Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="timer" color={colors.text.secondary} width={14} height={14} />
              <Text style={styles.statText}>{stats.duration}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              {stats.hasLiveClasses && stats.hasRecorded ? (
                <>
                  <Icon name="video" color={colors.text.secondary} width={14} height={14} />
                  <Text style={styles.statText}>Live + Rec</Text>
                </>
              ) : stats.hasLiveClasses ? (
                <>
                  <Icon name="video" color={colors.text.secondary} width={14} height={14} />
                  <Text style={styles.statText}>Live</Text>
                </>
              ) : (
                <>
                  <Icon name="monitor" color={colors.text.secondary} width={14} height={14} />
                  <Text style={styles.statText}>Recorded</Text>
                </>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Bottom Row: Price + CTA */}
          <View style={styles.bottomRow}>
            <View style={styles.priceSection}>
              <Text style={styles.currentPrice}>{formatPrice(price)}</Text>
              {originalPrice && originalPrice > price && (
                <Text style={styles.originalPrice}>
                  {formatPrice(originalPrice)}
                </Text>
              )}
              {discount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discount}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.exploreButton}
              onPress={onExplorePress}
              activeOpacity={0.85}
              accessibilityLabel={`Explore ${title}`}
              accessibilityRole="button"
            >
              <Text style={styles.exploreText}>Explore</Text>
              <Icon
                name="arrow-right"
                color={colors.text.inverse}
                width={14}
                height={14}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const CARD_MARGIN_HORIZONTAL = spacing[16];
const BANNER_HEIGHT = 180; // ~38% of ~470 total card height on a mobile screen

const styles = StyleSheet.create({
  shadowWrapper: {
    marginHorizontal: CARD_MARGIN_HORIZONTAL,
    marginBottom: spacing[20],
    borderRadius: radius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  touchable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },

  // ── Banner ──────────────────────────────────────────────────
  bannerContainer: {
    height: BANNER_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -40,
    right: -30,
  },
  decoCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    left: -20,
  },
  bannerEmoji: {
    fontSize: 64,
    opacity: 0.9,
  },

  // ── Badge (top-left) ────────────────────────────────────────
  badgePill: {
    position: 'absolute',
    top: spacing[12],
    left: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Bookmark (top-right) ────────────────────────────────────
  bookmarkButton: {
    position: 'absolute',
    top: spacing[12],
    right: spacing[12],
  },
  bookmarkGlass: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // ── Details ─────────────────────────────────────────────────
  detailsContainer: {
    padding: spacing[16],
    gap: spacing[4],
  },
  title: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 22,
  },
  subtitle: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
    lineHeight: 16,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
    marginTop: spacing[4],
  },

  // ── Divider ─────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing[8],
  },

  // ── Stats Row ───────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[16],
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  statText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
  },

  // ── Bottom Row ──────────────────────────────────────────────
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    flexShrink: 1,
  },
  currentPrice: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text.primary,
  },
  originalPrice: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  discountBadge: {
    backgroundColor: colors.tint.green,
    paddingHorizontal: spacing[4],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountText: {
    ...typography.caption,
    fontSize: 9,
    color: colors.primary,
    fontWeight: '800',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
  },
  exploreText: {
    ...typography.buttonSmall,
    fontSize: 13,
    color: colors.text.inverse,
    fontWeight: '700',
  },
});

export default CourseCard;
