/**
 * TrendingCoursesSectionV5 — Asymmetric Deck Carousel
 *
 * Hero card (full-width) → Standard cards → Compact cards.
 * Scroll-linked scale/opacity/translateY depth effect.
 * Magnetic spring page indicators.
 * Staggered entrance orchestration.
 *
 * @module components/home/TrendingCoursesSectionV5
 */

import React, { memo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';

import TrendingCourseCardV5 from './TrendingCourseCardV5';
import PageIndicatorV5 from './PageIndicatorV5';
import SectionHeaderV5 from './SectionHeaderV5';
import type { TrendingCourseItem } from './types';
import { colors, colorsV5 } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  TRENDING_CAROUSEL,
  CARD_DIMENSIONS,
  type CardVariant,
} from './carouselConstants';

export interface TrendingCoursesSectionV5Props {
  courses: TrendingCourseItem[];
  onViewAllPress?: () => void;
  onCoursePress?: (key: string) => void;
  onHeroExplorePress?: (key: string) => void;
  onHeroEnrollPress?: (key: string) => void;
  /** Live enrollment count for header */
  liveEnrollmentCount?: number;
  /** Custom "View All" accessibility label */
  viewAllAccessibilityLabel?: string;
}

const TrendingCoursesSectionV5 = memo(function TrendingCoursesSectionV5({
  courses = [],
  onViewAllPress,
  onCoursePress,
  onHeroExplorePress,
  onHeroEnrollPress,
  liveEnrollmentCount,
  viewAllAccessibilityLabel = 'View all trending courses',
}: TrendingCoursesSectionV5Props): React.JSX.Element {
  const flatListRef = useRef<Animated.FlatList<TrendingCourseItem>>(null);
  const scrollX = useSharedValue(0);

  // Reanimated scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollX.value = event.contentOffset.x;
    },
  });

  // Determine variant based on index
  const getVariant = useCallback((index: number): CardVariant => {
    if (index === 0) return 'hero';
    if (index <= 3) return 'standard';
    return 'compact';
  }, []);

  const getCardWidth = useCallback((index: number) => {
    const variant = getVariant(index);
    return CARD_DIMENSIONS[variant].width;
  }, [getVariant]);

  const snapInterval = TRENDING_CAROUSEL.getSnapInterval(CARD_DIMENSIONS.standard.width);

  const renderCarouselItem = useCallback(
    ({ item, index }: { item: TrendingCourseItem; index: number }) => {
      const variant = getVariant(index);
      return (
        <View style={styles.carouselItemWrapper}>
          <TrendingCourseCardV5
            item={item}
            index={index}
            variant={variant}
            scrollX={scrollX}
            onPress={() => onCoursePress?.(item.key)}
            onExplorePress={() => onHeroExplorePress?.(item.key)}
            onEnrollPress={() => onHeroEnrollPress?.(item.key)}
          />
        </View>
      );
    },
    [getVariant, onCoursePress, onHeroExplorePress, onHeroEnrollPress],
  );

  const keyExtractor = useCallback(
    (item: TrendingCourseItem) => item.key,
    [],
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: getCardWidth(index) + TRENDING_CAROUSEL.itemSpacing,
      offset: index * (getCardWidth(index) + TRENDING_CAROUSEL.itemSpacing),
      index,
    }),
    [getCardWidth],
  );

  const darkColor = colors.mint?.dark || '#052224';
  const accentColor = colorsV5.accent?.primary || '#05C46B';

  // Live metric for header
  const liveMetric = liveEnrollmentCount !== undefined
    ? `${liveEnrollmentCount.toLocaleString()} enrolling now`
    : courses.length > 0
      ? `${courses[0].totalStudents?.toLocaleString() || '28,340'} students this week`
      : undefined;

  return (
    <View style={styles.container}>
      {/* Premium Asymmetric Header */}
      <SectionHeaderV5
        title="Trending Courses"
        subtitle="Most enrolled lectures & exam prep masterclasses this week"
        liveMetric={liveMetric}
        liveMetricColor={accentColor}
        onViewAllPress={onViewAllPress}
        viewAllAccessibilityLabel={viewAllAccessibilityLabel}
      />

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <Animated.FlatList
          ref={flatListRef}
          data={courses}
          renderItem={renderCarouselItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          decelerationRate={TRENDING_CAROUSEL.decelerationRate}
          onScroll={scrollHandler}
          scrollEventThrottle={TRENDING_CAROUSEL.scrollEventThrottle}
          getItemLayout={getItemLayout}
          removeClippedSubviews={TRENDING_CAROUSEL.removeClippedSubviews}
          initialNumToRender={TRENDING_CAROUSEL.initialNumToRender}
          maxToRenderPerBatch={TRENDING_CAROUSEL.maxToRenderPerBatch}
          windowSize={TRENDING_CAROUSEL.windowSize}
          bounces={true}
          contentContainerStyle={styles.carouselContent}
        />
      </View>

      {/* Page Indicators */}
      {courses.length > 1 && (
        <PageIndicatorV5
          count={courses.length}
          scrollX={scrollX}
          cardWidth={CARD_DIMENSIONS.standard.width}
          itemSpacing={TRENDING_CAROUSEL.itemSpacing}
          activeColor={accentColor}
          inactiveColor={'#94A3B8'}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[24],
    marginBottom: spacing[8],
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselContent: {
    paddingLeft: TRENDING_CAROUSEL.horizontalPadding,
    paddingRight: TRENDING_CAROUSEL.horizontalPadding - TRENDING_CAROUSEL.itemSpacing,
  },
  carouselItemWrapper: {
    marginRight: TRENDING_CAROUSEL.itemSpacing,
  },
});

TrendingCoursesSectionV5.displayName = 'TrendingCoursesSectionV5';

export default TrendingCoursesSectionV5;