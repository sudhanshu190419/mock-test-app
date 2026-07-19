/**
 * PyqPracticeSectionV5 — Auto-Scroll PYQ Practice Carousel
 *
 * Full-width cards with parallax image layer.
 * Crystalline glass footer with shimmer CTAs.
 * Auto-scroll with pause on interaction.
 * Breathing status indicator.
 *
 * @module components/home/PyqPracticeSectionV5
 */

import React, { memo, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import PyqPracticeCardV5 from './PyqPracticeCardV5';
import PageIndicatorV5 from './PageIndicatorV5';
import SectionHeaderV5 from './SectionHeaderV5';
import type { PyqItem } from './types';
import { colors, colorsV5 } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  PYQ_CAROUSEL,
  SPRING_PHYSICS,
} from './carouselConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PyqPracticeSectionV5Props {
  /** All PYQ items to display in the carousel. */
  items: PyqItem[];
  /** Callback when "View All" is pressed. */
  onViewAllPress?: () => void;
  /** Callback when a PYQ card is pressed. */
  onItemPress?: (key: string) => void;
  /** Callback when Preview on a card is pressed. */
  onPreviewPress?: (key: string) => void;
  /** Callback when Start Practice on a card is pressed. */
  onStartPracticePress?: (key: string) => void;
}

const PyqPracticeSectionV5 = memo(function PyqPracticeSectionV5({
  items,
  onViewAllPress,
  onItemPress,
  onPreviewPress,
  onStartPracticePress,
}: PyqPracticeSectionV5Props): React.JSX.Element {
  const flatListRef = useRef<FlatList>(null);
  const isInteracting = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollIndexRef = useRef(0);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const isFocused = useIsFocused();
  const { reduceMotion } = useReducedMotion();

  // Duplicate data for infinite loop illusion
  const loopedItems = useMemo(
    () => (items.length > 1 ? [...items, items[0]] : items),
    [items],
  );

  // Auto-scroll logic — pauses when screen not focused
  useEffect(() => {
    if (items.length <= 1 || !isFocused || reduceMotion) return;

    const interval = setInterval(() => {
      if (isInteracting.current || !flatListRef.current) return;

      const nextIndex = scrollIndexRef.current + 1;

      if (nextIndex >= loopedItems.length) {
        flatListRef.current.scrollToIndex({
          index: 0,
          animated: false,
        });
        scrollIndexRef.current = 0;
        setActiveDotIndex(0);
      } else {
        flatListRef.current.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        scrollIndexRef.current = nextIndex;
      }
    }, PYQ_CAROUSEL.autoScrollInterval);

    return () => clearInterval(interval);
  }, [items.length, loopedItems.length, isFocused, reduceMotion]);

  // Track scroll position for dot updates
  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const snapInterval = PYQ_CAROUSEL.getSnapInterval();
      const index = Math.round(offsetX / snapInterval);

      if (index >= items.length) {
        flatListRef.current?.scrollToIndex({ index: 0, animated: false });
        scrollIndexRef.current = 0;
        setActiveDotIndex(0);
      } else {
        scrollIndexRef.current = index;
        setActiveDotIndex(index);
      }

      if (isInteracting.current) {
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
        resumeTimer.current = setTimeout(() => {
          isInteracting.current = false;
        }, PYQ_CAROUSEL.autoScrollPauseDelay);
      }
    },
    [items.length],
  );

  // User interaction handlers
  const handleTouchStart = useCallback(() => {
    isInteracting.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  // Renderers
  const renderCarouselItem = useCallback(
    ({ item }: { item: PyqItem }) => {
      const { key, ...rest } = item;
      return (
        <View style={styles.carouselItem}>
          <PyqPracticeCardV5
            key={key}
            {...rest}
            onPress={() => onItemPress?.(key)}
            onPreviewPress={() => onPreviewPress?.(key)}
            onStartPracticePress={() => onStartPracticePress?.(key)}
          />
        </View>
      );
    },
    [onItemPress, onPreviewPress, onStartPracticePress],
  );

  const keyExtractor = useCallback(
    (item: PyqItem, index: number) => `${item.key}-${index}`,
    [],
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: PYQ_CAROUSEL.getSnapInterval(),
      offset: PYQ_CAROUSEL.getSnapInterval() * index,
      index,
    }),
    [],
  );

  const darkColor = colors.mint?.dark || '#052224';
  const accentColor = colorsV5.accent?.primary || '#05C46B';

  // Live metric for header
  const totalSessions = useMemo(
    () => items.reduce((sum, item) => sum + (item.totalStudents || 0), 0),
    [items],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <SectionHeaderV5
        title="Practice with PYQs"
        subtitle="Previous Year Papers with Timed Tests & Smart Analytics"
        liveMetric={`${totalSessions.toLocaleString()} sessions this month`}
        liveMetricColor={accentColor}
        onViewAllPress={onViewAllPress}
        viewAllAccessibilityLabel="View all PYQ practice packs"
        viewAllIcon="arrow-right"
      />

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={loopedItems}
          renderItem={renderCarouselItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={PYQ_CAROUSEL.getSnapInterval()}
          decelerationRate={PYQ_CAROUSEL.decelerationRate}
          onMomentumScrollEnd={handleScrollEnd}
          getItemLayout={getItemLayout}
          removeClippedSubviews={PYQ_CAROUSEL.removeClippedSubviews}
          initialNumToRender={PYQ_CAROUSEL.initialNumToRender}
          maxToRenderPerBatch={PYQ_CAROUSEL.maxToRenderPerBatch}
          windowSize={PYQ_CAROUSEL.windowSize}
          bounces={false}
          contentContainerStyle={{ paddingLeft: spacing[16], paddingRight: spacing[4] }}
          onScrollBeginDrag={handleTouchStart}
          onScrollEndDrag={handleScrollEnd}
        />
      </View>

      {/* Page Indicators */}
      {items.length > 1 && (
        <PageIndicatorV5
          count={items.length}
          scrollX={{ value: activeDotIndex * PYQ_CAROUSEL.getSnapInterval() } as any}
          cardWidth={PYQ_CAROUSEL.cardWidth}
          itemSpacing={PYQ_CAROUSEL.itemSpacing}
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
    marginBottom: spacing[4],
  },
  carouselItem: {
    width: PYQ_CAROUSEL.cardWidth,
  },
});

PyqPracticeSectionV5.displayName = 'PyqPracticeSectionV5';

export default PyqPracticeSectionV5;