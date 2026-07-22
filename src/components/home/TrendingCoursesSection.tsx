/**
 * TrendingCoursesSection
 *
 * Ultra-premium auto-scrolling carousel of course cards with:
 * - 3D perspective card tilt (rotateY) for a cover-flow tunnel effect
 * - Parallax background with subtle hue shift
 * - Spring-animated dot indicators with width transitions
 * - Dynamic shadow depth — center card has deeper shadow
 * - Smooth auto-scroll every 3.5s with infinite looping
 * - Pauses when screen is not focused or user is interacting
 *
 * @module components/home/TrendingCoursesSection
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

import TrendingCourseCard from './TrendingCourseCard';
import SectionHeaderV5 from './SectionHeaderV5';
import type { TrendingCourseItem } from './types';
import { colors, colorsV5 } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AUTO_SCROLL_INTERVAL = 3500;
const DOT_ACTIVE_WIDTH = 28;
const DOT_INACTIVE_WIDTH = 8;
const DOT_HEIGHT = 6;
const CARD_SCALE_FULL = 1;
const CARD_SCALE_MIN = 0.92;
const PERSPECTIVE = 800;
const ROTATE_DEG_MAX = 8;
const SHADOW_ACTIVE_ELEVATION = 16;
const SHADOW_INACTIVE_ELEVATION = 4;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TrendingCoursesSectionProps {
  courses: TrendingCourseItem[];
  onViewAllPress?: () => void;
  onCoursePress?: (key: string) => void;
  onHeroExplorePress?: (key: string) => void;
  onHeroEnrollPress?: (key: string) => void;
}

// ─── Animated Card with 3D transform ─────────────────────────────────────────

interface AnimatedCardProps {
  item: TrendingCourseItem;
  index: number;
  scrollX: SharedValue<number>;
  courseCount: number;
  onCoursePress?: (key: string) => void;
  onExplorePress?: (key: string) => void;
  onEnrollPress?: (key: string) => void;
}

const AnimatedCard = React.memo(function AnimatedCard({
  item,
  index,
  scrollX,
  courseCount,
  onCoursePress,
  onExplorePress,
  onEnrollPress,
}: AnimatedCardProps): React.JSX.Element {
  const cardStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    // Scale — center card full size, side cards slightly smaller
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [CARD_SCALE_MIN, CARD_SCALE_FULL, CARD_SCALE_MIN],
      Extrapolation.CLAMP,
    );

    // Opacity — center card fully visible, side cards dimmed
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.75, 1, 0.75],
      Extrapolation.CLAMP,
    );

    // 3D rotateY — side cards rotate away from center (cover-flow effect)
    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [ROTATE_DEG_MAX, 0, -ROTATE_DEG_MAX],
      Extrapolation.CLAMP,
    );

    // Shadow — center card has deep premium shadow
    const elevation = interpolate(
      scrollX.value,
      inputRange,
      [SHADOW_INACTIVE_ELEVATION, SHADOW_ACTIVE_ELEVATION, SHADOW_INACTIVE_ELEVATION],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { perspective: PERSPECTIVE },
        { rotateY: `${rotateY}deg` },
        { scale },
      ],
      opacity,
      elevation,
      shadowOpacity: interpolate(
        scrollX.value,
        inputRange,
        [0.2, 0.5, 0.2],
        Extrapolation.CLAMP,
      ),
    };
  });

  const { key: _key, ...cardProps } = item;

  return (
    <View style={styles.carouselItem}>
      {/* Card with 3D transforms */}
      <Animated.View style={[styles.cardAnimatedWrapper, cardStyle]}>
        <TrendingCourseCard
          key={_key}
          {...cardProps}
          onPress={() => onCoursePress?.(item.key)}
          onExplorePress={() => onExplorePress?.(item.key)}
          onEnrollPress={() => onEnrollPress?.(item.key)}
          onBookmarkPress={() => {}}
        />
      </Animated.View>
    </View>
  );
});

// ─── Animated Dot ────────────────────────────────────────────────────────────

interface DotProps {
  index: number;
  scrollX: SharedValue<number>;
  courseCount: number;
}

const AnimatedDot = React.memo(function AnimatedDot({
  index,
  scrollX,
  courseCount,
}: DotProps): React.JSX.Element {
  const dotStyle = useAnimatedStyle(() => {
    const currentPage = scrollX.value / SCREEN_WIDTH;
    const distance = Math.abs(currentPage - index);
    const isActive = distance < 0.5;

    const width = withSpring(
      isActive ? DOT_ACTIVE_WIDTH : DOT_INACTIVE_WIDTH,
      { damping: 14, stiffness: 220 },
    );

    const opacity = withTiming(isActive ? 1 : 0.3, { duration: 200 });

    const scale = withSpring(isActive ? 1.15 : 1, {
      damping: 12,
      stiffness: 200,
    });

    return {
      width,
      height: DOT_HEIGHT,
      borderRadius: DOT_HEIGHT / 2,
      opacity,
      backgroundColor: isActive ? colors.secondary : colors.disabled,
      transform: [{ scale }],
    };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
});

// ─── Section Component ──────────────────────────────────────────────────────

const TrendingCoursesSection = React.memo(function TrendingCoursesSection({
  courses,
  onViewAllPress,
  onCoursePress,
  onHeroExplorePress,
  onHeroEnrollPress,
}: TrendingCoursesSectionProps): React.JSX.Element {
  const flatListRef = useRef<Animated.FlatList<TrendingCourseItem>>(null);
  const isInteracting = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollIndexRef = useRef(0);
  const isFocused = useIsFocused();

  // ── Reanimated shared values ────────────────────────────────────
  const scrollX = useSharedValue(0);

  // ── Duplicate data for infinite loop illusion ──────────────────
  const loopedCourses = useMemo(
    () => (courses.length > 1 ? [...courses, courses[0]] : courses),
    [courses],
  );

  // ── Reanimated scroll handler ──────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollX.value = event.contentOffset.x;
    },
  });

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

  // ── Track scroll position for auto-scroll resumption ──────────
  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);

      if (index >= courses.length) {
        flatListRef.current?.scrollToIndex({ index: 0, animated: false });
        scrollIndexRef.current = 0;
      } else {
        scrollIndexRef.current = index;
      }

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
    ({ item, index }: { item: TrendingCourseItem; index: number }) => (
      <AnimatedCard
        item={item}
        index={index}
        scrollX={scrollX}
        courseCount={courses.length}
        onCoursePress={onCoursePress}
        onExplorePress={onHeroExplorePress}
        onEnrollPress={onHeroEnrollPress}
      />
    ),
    [scrollX, courses.length, onCoursePress, onHeroExplorePress, onHeroEnrollPress],
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

  const accentColor = colorsV5.accent?.primary || '#05C46B';

  // Live metric for header
  const liveMetric = courses.length > 0
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
        viewAllAccessibilityLabel="View all trending courses"
      />

      {/* Carousel — cards floating above the page */}
      <View style={styles.carouselContainer}>
        <Animated.FlatList
          ref={flatListRef}
          data={loopedCourses}
          renderItem={renderCarouselItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="normal"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          bounces={false}
          onScrollBeginDrag={handleTouchStart}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={styles.carouselContent}
        />
      </View>

      {/* Animated Page Indicators */}
      {courses.length > 1 && (
        <View style={styles.dotsContainer}>
          {courses.map((_, i) => (
            <AnimatedDot
              key={i}
              index={i}
              scrollX={scrollX}
              courseCount={courses.length}
            />
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
  carouselContainer: {
    position: 'relative',
    marginBottom: spacing[4],
    paddingTop: spacing[8],
  },
  carouselContent: {
    // Inner padding not needed — cards are full-width
  },
  carouselItem: {
    width: SCREEN_WIDTH,
  },
  cardAnimatedWrapper: {
    width: SCREEN_WIDTH,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
  },
  dot: {
    height: DOT_HEIGHT,
    borderRadius: DOT_HEIGHT / 2,
    backgroundColor: colors.disabled,
  },
});

export default TrendingCoursesSection;
