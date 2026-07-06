/**
 * PyqPracticeSection
 *
 * Premium auto-scrolling carousel of PYQ practice cards.
 *
 * Features:
 * - Paging FlatList with full-width cards
 * - Auto-scroll every 3.5s with infinite looping
 * - Pauses when screen is not focused
 * - Simple static dot indicators
 * - Snap-to-card with no partial cuts
 *
 * @module components/home/PyqPracticeSection
 */

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
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

import PyqPracticeCard from './PyqPracticeCard';
import Icon from './Icons';
import type { PyqItem } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AUTO_SCROLL_INTERVAL = 3500; // ms between auto-scrolls

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PyqPracticeSectionProps {
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

// ─── Carousel Card Wrapper ──────────────────────────────────────────────────

interface CarouselCardProps {
  item: PyqItem;
  onItemPress?: (key: string) => void;
  onPreviewPress?: (key: string) => void;
  onStartPracticePress?: (key: string) => void;
}

const CarouselCard = React.memo(function CarouselCard({
  item,
  onItemPress,
  onPreviewPress,
  onStartPracticePress,
}: CarouselCardProps): React.JSX.Element {
  const { key: _key, ...cardProps } = item;
  return (
    <View style={styles.carouselItem}>
      <PyqPracticeCard
        key={_key}
        {...cardProps}
        onPress={() => onItemPress?.(item.key)}
        onPreviewPress={() => onPreviewPress?.(item.key)}
        onStartPracticePress={() => onStartPracticePress?.(item.key)}
      />
    </View>
  );
});

// ─── Static Dot ─────────────────────────────────────────────────────────────

interface DotProps {
  index: number;
  activeIndex: number;
}

const Dot = React.memo(function Dot({
  index,
  activeIndex,
}: DotProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.dot,
        {
          backgroundColor: index === activeIndex ? colors.secondary : colors.disabled,
        },
      ]}
    />
  );
});

// ─── Section Component ──────────────────────────────────────────────────────

const PyqPracticeSection = React.memo(function PyqPracticeSection({
  items,
  onViewAllPress,
  onItemPress,
  onPreviewPress,
  onStartPracticePress,
}: PyqPracticeSectionProps): React.JSX.Element {
  const flatListRef = useRef<FlatList>(null);
  const isInteracting = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollIndexRef = useRef(0);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const isFocused = useIsFocused();

  // ── Duplicate data for infinite loop illusion ──────────────────
  const loopedItems = useMemo(
    () => (items.length > 1 ? [...items, items[0]] : items),
    [items],
  );

  // ── Auto-scroll logic — pauses when screen not focused ─────────
  useEffect(() => {
    if (items.length <= 1 || !isFocused) return;

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
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [items.length, loopedItems.length, isFocused]);

  // ── Track scroll position for dot updates ──────────────────────
  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);

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
        }, 3000);
      }
    },
    [items.length],
  );

  // ── User interaction handlers ──────────────────────────────────
  const handleTouchStart = useCallback(() => {
    isInteracting.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  // ── FlatList renderers ─────────────────────────────────────────
  const renderCarouselItem = useCallback(
    ({ item }: { item: PyqItem }) => (
      <CarouselCard
        item={item}
        onItemPress={onItemPress}
        onPreviewPress={onPreviewPress}
        onStartPracticePress={onStartPracticePress}
      />
    ),
    [onItemPress, onPreviewPress, onStartPracticePress],
  );

  const keyExtractor = useCallback(
    (item: PyqItem, index: number) => `${item.key}-${index}`,
    [],
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Practice with PYQs</Text>
          <Text style={styles.headerSubtitle}>
            Previous Year Papers with Timed Tests & Smart Analytics{' '}
            <Text style={styles.headerEmoji}>📊</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={onViewAllPress}
          activeOpacity={0.7}
          accessibilityLabel="View all PYQs"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Icon
            name="arrow-right"
            color={colors.secondary}
            width={14}
            height={14}
          />
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={loopedItems}
          renderItem={renderCarouselItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={SCREEN_WIDTH}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScrollEnd}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          bounces={false}
          onScrollBeginDrag={handleTouchStart}
          onScrollEndDrag={handleScrollEnd}
        />
      </View>

      {/* Static Page Indicators */}
      {items.length > 1 && (
        <View style={styles.dotsContainer}>
          {items.map((_, i) => (
            <Dot key={i} index={i} activeIndex={activeDotIndex} />
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[20],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[16],
    marginBottom: spacing[12],
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing[12],
  },
  headerTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    ...typography.body,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  headerEmoji: {
    fontSize: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[12],
    borderRadius: radius.xxl,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing[4],
  },
  viewAllText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '700',
  },
  carouselContainer: {
    marginBottom: spacing[4],
  },
  carouselItem: {
    width: SCREEN_WIDTH,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[8],
    paddingVertical: spacing[8],
  },
  dot: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
});

export default PyqPracticeSection;
