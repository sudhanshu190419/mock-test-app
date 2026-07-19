import React, { useCallback } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSequence } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../home/Icons';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

export interface CourseCardProps {
  courseId?: string;
  title: string;
  subtitle?: string;
  description: string;
  category?: string;
  instructor?: string;
  rating?: number;
  totalStudents?: number;
  price: number;
  originalPrice?: number;
  discountLabel?: string;
  badgeLabel?: string | null;
  badgeType?: string;
  duration?: number | string | null;
  isBookmarked?: boolean;
  imageUrl?: string | null;
  onPress?: () => void;
  onExplorePress?: () => void;
  onBookmarkPress?: () => void;
  instructorPrefix?: string;
  enrollmentSuffix?: string;
  features?: Array<{ icon: string; text: string }>;
  primaryCtaText?: string;
  secondaryCtaText?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default React.memo(function CourseCard({
  courseId,
  title,
  subtitle,
  description,
  category = 'General',
  instructor = 'IITian Faculty',
  rating = 4.8,
  totalStudents = 1250,
  price,
  originalPrice,
  discountLabel,
  badgeLabel,
  duration,
  isBookmarked = false,
  imageUrl,
  onPress,
  onExplorePress,
  onBookmarkPress,
  instructorPrefix = 'By ',
  enrollmentSuffix = '+ enrolled',
  features,
  primaryCtaText = 'Enroll →',
  secondaryCtaText = 'Explore',
}: CourseCardProps): React.JSX.Element {
  const scale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.985, { duration: 200 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 200 });
  }, [scale]);

  const handleBookmarkPress = useCallback(() => {
    bookmarkScale.value = withSequence(
      withTiming(1.3, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
    onBookmarkPress?.();
  }, [bookmarkScale, onBookmarkPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBookmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  // Resolve category accents and gradients
  const catKey = (category || 'all').toLowerCase().trim();
  let catColors: { accent: string; gradient: readonly string[] } = coursesDark.categories.all;
  if (catKey.includes('neet')) catColors = coursesDark.categories.medical;
  else if (catKey.includes('jee')) catColors = coursesDark.categories.engineering;
  else if (catKey.includes('school') || catKey.includes('class')) catColors = coursesDark.categories.school;
  else if (catKey.includes('clat') || catKey.includes('law')) catColors = coursesDark.categories.law;
  else if (catKey.includes('cuet')) catColors = coursesDark.categories.cuet;

  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : 0;

  const displayDiscount =
    discountLabel ?? (discountPercent > 0 ? `${discountPercent}% OFF` : undefined);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      {/* Top Banner Zone */}
      <View style={styles.bannerContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.bannerImage} />
        ) : (
          <LinearGradient
            colors={[...catColors.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent']}
          style={styles.bannerOverlayTop}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.bannerOverlayBottom}
        />

        {/* Badges Overlay */}
        <View style={styles.badgesOverlay}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Icon name="star" color="#FBBF24" width={11} height={11} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Bookmark Action */}
        <Animated.View style={[styles.bookmarkContainer, animatedBookmarkStyle]}>
          <TouchableOpacity
            onPress={handleBookmarkPress}
            activeOpacity={0.8}
            style={styles.bookmarkButton}
          >
            <Icon
              name="bookmark"
              color={isBookmarked ? '#F59E0B' : '#FFFFFF'}
              width={16}
              height={16}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Optional Best Seller Pill */}
        {badgeLabel && (
          <View style={styles.bestSellerPill}>
            <Text style={styles.bestSellerText}>{badgeLabel.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Details Tray */}
      <View style={styles.detailsTray}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        
        {instructor ? (
          <View style={styles.instructorRow}>
            <Text style={styles.instructorText}>
              {instructorPrefix}<Text style={styles.instructorName}>{instructor}</Text> • {totalStudents.toLocaleString('en-IN')}{enrollmentSuffix}
            </Text>
          </View>
        ) : (
          <View style={styles.instructorRow}>
            <Text style={styles.instructorText}>
              {totalStudents.toLocaleString('en-IN')}{enrollmentSuffix}
            </Text>
          </View>
        )}

        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        {/* Feature Tags Row */}
        <View style={styles.featuresRow}>
          {features ? features.map((feat, i) => (
            <View key={i} style={styles.featurePill}>
              <Icon name={feat.icon as any} width={11} height={11} color={coursesDark.textMutedOnCard} />
              <Text style={styles.featurePillText}>{feat.text}</Text>
            </View>
          )) : (
            <>
              {duration && (
                <View style={styles.featurePill}>
                  <Icon name="timer" width={11} height={11} color={coursesDark.textMutedOnCard} />
                  <Text style={styles.featurePillText}>
                    {typeof duration === 'number' ? `${duration} Days` : duration}
                  </Text>
                </View>
              )}
              <View style={styles.featurePill}>
                <Icon name="video" width={11} height={11} color={coursesDark.textMutedOnCard} />
                <Text style={styles.featurePillText}>Live classes</Text>
              </View>
              <View style={styles.featurePill}>
                <Icon name="bar-chart-2" width={11} height={11} color={coursesDark.textMutedOnCard} />
                <Text style={styles.featurePillText}>AI Analytics</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.divider} />

        {/* Pricing and Actions Row */}
        <View style={styles.bottomRow}>
          <View style={styles.priceColumn}>
            <View style={styles.priceHeader}>
              <Text style={styles.priceText}>{formatPrice(price)}</Text>
              {displayDiscount && (
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>{displayDiscount}</Text>
                </View>
              )}
            </View>
            {originalPrice && originalPrice > price && (
              <Text style={styles.originalPriceText}>
                {formatPrice(originalPrice)}
              </Text>
            )}
          </View>

          <View style={styles.ctaRow}>
            {onExplorePress && (
              <TouchableOpacity
                onPress={onExplorePress}
                activeOpacity={0.8}
                style={styles.exploreButton}
              >
                <Text style={styles.exploreButtonText}>{secondaryCtaText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.9}
              style={[styles.enrollButton, { backgroundColor: catColors.accent }]}
            >
              <Text style={styles.enrollButtonText}>{primaryCtaText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: coursesDark.surfaceCard,
    borderRadius: radius.xl,
    marginHorizontal: spacing[16],
    marginBottom: spacing[16],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bannerContainer: {
    height: 130,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerGradient: {
    width: '100%',
    height: '100%',
  },
  bannerOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  bannerOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  badgesOverlay: {
    position: 'absolute',
    bottom: spacing[12],
    left: spacing[12],
    flexDirection: 'row',
    gap: spacing[8],
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  categoryText: {
    ...typography.badgeLabelCustom,
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  ratingText: {
    ...typography.badgeLabelCustom,
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bookmarkContainer: {
    position: 'absolute',
    top: spacing[12],
    right: spacing[12],
  },
  bookmarkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  bestSellerPill: {
    position: 'absolute',
    top: spacing[12],
    left: spacing[12],
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.sm,
  },
  bestSellerText: {
    ...typography.badgeLabelCustom,
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  detailsTray: {
    padding: spacing[16],
  },
  title: {
    ...typography.cardTitle,
    color: coursesDark.textOnCard,
    marginBottom: spacing[4],
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  instructorText: {
    ...typography.bodySmall,
    color: coursesDark.textMutedOnCard,
    fontSize: 12,
  },
  instructorName: {
    fontWeight: '600',
    color: coursesDark.textOnCard,
  },
  description: {
    ...typography.bodySmall,
    color: coursesDark.textMutedOnCard,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing[12],
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginBottom: spacing[12],
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featurePillText: {
    ...typography.caption,
    fontSize: 11,
    color: coursesDark.textOnCard,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginBottom: spacing[12],
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceColumn: {
    justifyContent: 'center',
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  priceText: {
    ...typography.priceTag,
    color: coursesDark.textOnCard,
  },
  discountPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountText: {
    ...typography.badgeLabelCustom,
    color: '#059669',
    fontSize: 9,
    fontWeight: '700',
  },
  originalPriceText: {
    ...typography.bodySmall,
    fontSize: 12,
    color: coursesDark.textMutedOnCard,
    textDecorationLine: 'line-through',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  exploreButton: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  exploreButtonText: {
    ...typography.buttonSmall,
    color: coursesDark.textOnCard,
    fontWeight: '700',
    fontSize: 13,
  },
  enrollButton: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.lg,
  },
  enrollButtonText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
