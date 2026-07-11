/**
 * TrendingCoursesSection
 *
 * Premium auto-scrolling carousel of course cards (Netflix/Unacademy-style).
 *
 * Features:
 * - Paging FlatList with full-width cards
 * - Auto-scroll every 3.5s with infinite looping
 * - Pauses when screen is not focused
 * - Simple static dot indicators
 * - Snap-to-card with no partial cuts
 *
 * @module components/home/TrendingCoursesSection
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

import TrendingCourseCard from './TrendingCourseCard';
import Icon from './Icons';
import type { TrendingCourseItem } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AUTO_SCROLL_INTERVAL = 3500; // ms between auto-scrolls

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TrendingCoursesSectionProps {
  /** All courses to display in the carousel. */
  courses: TrendingCourseItem[];
  /** Callback when "View All" is pressed. */
  onViewAllPress?: () => void;
  /** Callback when a course card is pressed. */
  onCoursePress?: (key: string) => void;
  /** Callback when Explore on a card is pressed. */
  onHeroExplorePress?: (key: string) => void;
  /** Callback when Enroll Now on a card is pressed. */
  onHeroEnrollPress?: (key: string) => void;
}

// ─── Carousel Card Wrapper ──────────────────────────────────────────────────

interface CarouselCardProps {
  item: TrendingCourseItem;
  onCoursePress?: (key: string) => void;
  onExplorePress?: (key: string) => void;
  onEnrollPress?: (key: string) => void;
}

const CarouselCard = React.memo(function CarouselCard({
  item,
  onCoursePress,
  onExplorePress,
  onEnrollPress,
}: CarouselCardProps): React.JSX.Element {
  const { key: _key, ...cardProps } = item;
  return (
    <View style={styles.carouselItem}>
      <TrendingCourseCard
        key={_key}
        {...cardProps}
        onPress={() => onCoursePress?.(item.key)}
        onExplorePress={() => onExplorePress?.(item.key)}
        onEnrollPress={() => onEnrollPress?.(item.key)}
        onBookmarkPress={() => {}}
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

const TrendingCoursesSection = React.memo(function TrendingCoursesSection({
  courses,
  onViewAllPress,
  onCoursePress,
  onHeroExplorePress,
  onHeroEnrollPress,
}: TrendingCoursesSectionProps): React.JSX.Element {
  const flatListRef = useRef<FlatList>(null);
  const isInteracting = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollIndexRef = useRef(0);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const isFocused = useIsFocused();

  // ── Duplicate data for infinite loop illusion ──────────────────
  const loopedCourses = useMemo(
    () => (courses.length > 1 ? [...courses, courses[0]] : courses),
    [courses],
  );

  // ── Auto-scroll logic — pauses when screen not focused ─────────
  useEffect(() => {
    if (courses.length <= 1 || !isFocused) return;

    const interval = setInterval(() => {
      if (isInteracting.current || !flatListRef.current) return;

      const nextIndex = scrollIndexRef.current + 1;

      if (nextIndex >= loopedCourses.length) {
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
  }, [courses.length, loopedCourses.length, isFocused]);

  // ── Track scroll position for dot updates ──────────────────────
  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);

      // If we scrolled to the duplicate first card, snap back to real first
      if (index >= courses.length) {
        flatListRef.current?.scrollToIndex({ index: 0, animated: false });
        scrollIndexRef.current = 0;
        setActiveDotIndex(0);
      } else {
        scrollIndexRef.current = index;
        setActiveDotIndex(index);
      }

      // Resume auto-scroll after 3s of inactivity
      if (isInteracting.current) {
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
        resumeTimer.current = setTimeout(() => {
          isInteracting.current = false;
        }, 3000);
      }
    },
    [courses.length],
  );

  // ── User interaction handlers ──────────────────────────────────
  const handleTouchStart = useCallback(() => {
    isInteracting.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  // ── FlatList renderers ─────────────────────────────────────────
  const renderCarouselItem = useCallback(
    ({ item }: { item: TrendingCourseItem }) => (
      <CarouselCard
        item={item}
        onCoursePress={onCoursePress}
        onExplorePress={onHeroExplorePress}
        onEnrollPress={onHeroEnrollPress}
      />
    ),
    [onCoursePress, onHeroExplorePress, onHeroEnrollPress],
  );

  const keyExtractor = useCallback(
    (item: TrendingCourseItem, index: number) => `${item.key}-${index}`,
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
          <Text style={styles.headerTitle}>Trending Courses</Text>
          <Text style={styles.headerSubtitle}>
            Most loved courses by students this week{' '}
            <Text style={styles.headerSparkle}>✦</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={onViewAllPress}
          activeOpacity={0.7}
          accessibilityLabel="View all trending courses"
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
          data={loopedCourses}
          renderItem={renderCarouselItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="normal"
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
      {courses.length > 1 && (
        <View style={styles.dotsContainer}>
          {courses.map((_, i) => (
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
  headerSparkle: {
    color: '#FBBF24',
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

export default TrendingCoursesSection;
