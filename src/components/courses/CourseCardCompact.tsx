import React, { useCallback } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../home/Icons';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 16 - 16 - 12) / 2;

export interface CourseCardCompactProps {
  courseId?: string;
  title: string;
  category?: string;
  price: number;
  originalPrice?: number;
  discountLabel?: string;
  rating?: number;
  imageUrl?: string | null;
  onPress?: () => void;
  onExplorePress?: () => void;
  primaryCtaText?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default React.memo(function CourseCardCompact({
  courseId,
  title,
  category = 'General',
  price,
  originalPrice,
  discountLabel,
  rating = 4.8,
  imageUrl,
  onPress,
  onExplorePress,
  primaryCtaText = 'Explore',
}: CourseCardCompactProps): React.JSX.Element {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 200 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 200 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
      {/* Thumbnail Container */}
      <View style={styles.thumbnailContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
        ) : (
          <LinearGradient
            colors={[...catColors.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.thumbnailGradient}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent']}
          style={styles.overlayTop}
        />
        
        {/* Rating star on thumbnail */}
        <View style={styles.ratingBadge}>
          <Icon name="star" color="#FBBF24" width={9} height={9} />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>

        {/* Category tag */}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
        </View>
      </View>

      {/* Info Tray */}
      <View style={styles.infoTray}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
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

        {/* Action Button */}
        <TouchableOpacity
          onPress={onExplorePress || onPress}
          activeOpacity={0.8}
          style={[styles.exploreButton, { borderColor: catColors.accent + '30' }]}
        >
          <Text style={[styles.exploreButtonText, { color: catColors.accent }]}>{primaryCtaText}</Text>
        </TouchableOpacity>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: coursesDark.surfaceCard,
    borderRadius: radius.xl,
    width: CARD_WIDTH,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  thumbnailContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.8,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailGradient: {
    width: '100%',
    height: '100%',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing[8],
    right: spacing[8],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  ratingText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryPill: {
    position: 'absolute',
    bottom: spacing[8],
    left: spacing[8],
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  categoryText: {
    ...typography.badgeLabelCustom,
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  infoTray: {
    padding: spacing[12],
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  title: {
    ...typography.cardTitleCompact,
    color: coursesDark.textOnCard,
    lineHeight: 18,
    height: 36, // Lock height for 2 lines to preserve grid layout alignment
  },
  priceContainer: {
    gap: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  priceText: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '800',
    color: coursesDark.textOnCard,
  },
  discountPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: spacing[4],
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  discountText: {
    ...typography.badgeLabelCustom,
    color: '#059669',
    fontSize: 8,
    fontWeight: '700',
  },
  originalPriceText: {
    ...typography.caption,
    fontSize: 10,
    color: coursesDark.textMutedOnCard,
    textDecorationLine: 'line-through',
  },
  exploreButton: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  exploreButtonText: {
    ...typography.buttonSmall,
    fontWeight: '700',
    fontSize: 11,
  },
});
