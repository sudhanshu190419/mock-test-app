import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { coursesDark } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

const { width } = Dimensions.get('window');
const GRID_CARD_WIDTH = (width - 16 - 16 - 12) / 2;

interface SkeletonItemProps {
  style: any;
}

const SkeletonBlock = React.memo(({ style }: SkeletonItemProps) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.shimmerBg, style, animatedStyle]} />;
});

interface CoursesSkeletonProps {
  variant?: 'carousel' | 'list' | 'grid' | 'all';
}

export default function CoursesSkeleton({ variant = 'all' }: CoursesSkeletonProps): React.JSX.Element {
  const renderCarouselSkeleton = () => (
    <View style={styles.carouselContainer}>
      <SkeletonBlock style={styles.carouselCard} />
    </View>
  );

  const renderLargeCardSkeleton = () => (
    <View style={styles.largeCard}>
      <SkeletonBlock style={styles.largeCardBanner} />
      <View style={styles.cardDetails}>
        <SkeletonBlock style={styles.titleLine} />
        <SkeletonBlock style={styles.subtitleLine} />
        <View style={styles.featuresRow}>
          <SkeletonBlock style={styles.featurePill} />
          <SkeletonBlock style={styles.featurePill} />
          <SkeletonBlock style={styles.featurePill} />
        </View>
        <View style={styles.divider} />
        <View style={styles.bottomRow}>
          <SkeletonBlock style={styles.priceBlock} />
          <SkeletonBlock style={styles.ctaBlock} />
        </View>
      </View>
    </View>
  );

  const renderGridSkeleton = () => (
    <View style={styles.gridContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.gridCard}>
          <SkeletonBlock style={styles.gridCardImage} />
          <View style={styles.gridCardDetails}>
            <SkeletonBlock style={styles.gridTitleLine} />
            <SkeletonBlock style={styles.gridPriceLine} />
            <SkeletonBlock style={styles.gridCtaLine} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {(variant === 'carousel' || variant === 'all') && renderCarouselSkeleton()}
      
      {(variant === 'list' || variant === 'all') && (
        <>
          <SkeletonBlock style={styles.sectionHeader} />
          {renderLargeCardSkeleton()}
        </>
      )}

      {(variant === 'grid' || variant === 'all') && (
        <>
          <SkeletonBlock style={styles.sectionHeader} />
          {renderGridSkeleton()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[12],
    gap: spacing[16],
  },
  shimmerBg: {
    backgroundColor: coursesDark.surfaceElevated,
    borderRadius: radius.md,
  },
  sectionHeader: {
    width: 140,
    height: 20,
    marginHorizontal: spacing[16],
    marginVertical: spacing[8],
  },
  carouselContainer: {
    paddingHorizontal: spacing[16],
    marginBottom: spacing[8],
  },
  carouselCard: {
    width: '100%',
    height: 200,
    borderRadius: radius.xl,
  },
  largeCard: {
    backgroundColor: coursesDark.surfaceCardDark,
    borderRadius: radius.xl,
    marginHorizontal: spacing[16],
    marginBottom: spacing[16],
    overflow: 'hidden',
  },
  largeCardBanner: {
    height: 120,
    width: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardDetails: {
    padding: spacing[16],
    gap: spacing[12],
  },
  titleLine: {
    width: '80%',
    height: 18,
  },
  subtitleLine: {
    width: '50%',
    height: 14,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  featurePill: {
    width: 80,
    height: 24,
    borderRadius: radius.md,
  },
  divider: {
    height: 1,
    backgroundColor: coursesDark.dividerOnDark,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceBlock: {
    width: 100,
    height: 22,
  },
  ctaBlock: {
    width: 120,
    height: 36,
    borderRadius: radius.lg,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[16],
    justifyContent: 'space-between',
    rowGap: spacing[16],
  },
  gridCard: {
    backgroundColor: coursesDark.surfaceCardDark,
    borderRadius: radius.xl,
    width: GRID_CARD_WIDTH,
    overflow: 'hidden',
    paddingBottom: spacing[12],
  },
  gridCardImage: {
    width: '100%',
    height: GRID_CARD_WIDTH * 0.9,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  gridCardDetails: {
    padding: spacing[12],
    gap: spacing[8],
  },
  gridTitleLine: {
    width: '90%',
    height: 14,
  },
  gridPriceLine: {
    width: '60%',
    height: 14,
  },
  gridCtaLine: {
    width: '100%',
    height: 32,
    borderRadius: radius.lg,
    marginTop: spacing[4],
  },
});
