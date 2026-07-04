/**
 * TrendingCoursesSection
 *
 * Premium trending courses section with:
 * - Header: "Trending Courses" + subtitle + "View All" button
 * - Featured hero card (dark gradient, badges, avatars, CTAs)
 * - Horizontal FlatList of additional trending course mini-cards
 *
 * @module components/home/TrendingCoursesSection
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';

import TrendingCourseCard from './TrendingCourseCard';
import Icon from './Icons';
import type { TrendingCourseItem } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';


// ─── Props ───────────────────────────────────────────────────────────────────

export interface TrendingCoursesSectionProps {
  /** Featured course displayed as the large hero card. */
  featuredCourse: TrendingCourseItem;
  /** Additional trending courses for the horizontal list. */
  courses: TrendingCourseItem[];
  /** Callback when "View All" is pressed. */
  onViewAllPress?: () => void;
  /** Callback when a course is pressed. */
  onCoursePress?: (key: string) => void;
  /** Callback when Explore on hero card is pressed. */
  onHeroExplorePress?: () => void;
  /** Callback when Enroll Now on hero card is pressed. */
  onHeroEnrollPress?: () => void;
}

// ─── Mini Course Card (for horizontal list) ──────────────────────────────────

interface MiniCourseCardProps {
  item: TrendingCourseItem;
  onPress?: () => void;
  index: number;
}

const MiniCourseCard = React.memo(function MiniCourseCard({
  item,
  onPress,
  index,
}: MiniCourseCardProps): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 300 + index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 300 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, {
      toValue: 0.95,
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

  return (
    <Animated.View
      style={[
        styles.miniCardWrapper,
        shadows.small,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: pressScale }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
        style={styles.miniTouchable}
        accessibilityLabel={item.title}
        accessibilityRole="button"
      >
        {/* Emoji illustration */}
        <View style={styles.miniIllustration}>
          <Text style={styles.miniEmoji}>{item.illustration}</Text>
        </View>

        {/* Content */}
        <View style={styles.miniContent}>
          <View style={styles.miniCategoryChip}>
            <Text style={styles.miniCategoryText}>{item.category}</Text>
          </View>

          <Text style={styles.miniTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.miniMetaRow}>
            <Icon name="star" color="#FBBF24" width={10} height={10} />
            <Text style={styles.miniRating}>{item.rating.toFixed(1)}</Text>
            <View style={styles.miniDot} />
            <Icon name="users" color={colors.text.secondary} width={10} height={10} />
            <Text style={styles.miniStudents}>
              {item.totalStudents >= 1000
                ? `${(item.totalStudents / 1000).toFixed(1)}k`
                : item.totalStudents}
            </Text>
          </View>

          <Text style={styles.miniPrice}>
            ₹{item.price.toLocaleString('en-IN')}
            {item.originalPrice && item.originalPrice > item.price && (
              <Text style={styles.miniOriginalPrice}>
                {' '}
                ₹{item.originalPrice.toLocaleString('en-IN')}
              </Text>
            )}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Section Component ──────────────────────────────────────────────────────

const TrendingCoursesSection = React.memo(function TrendingCoursesSection({
  featuredCourse,
  courses,
  onViewAllPress,
  onCoursePress,
  onHeroExplorePress,
  onHeroEnrollPress,
}: TrendingCoursesSectionProps): React.JSX.Element {
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const activeIndexRef = useRef(0);

  const renderMiniCourse = useCallback(
    ({ item, index }: { item: TrendingCourseItem; index: number }) => (
      <MiniCourseCard
        item={item}
        index={index}
        onPress={() => onCoursePress?.(item.key)}
      />
    ),
    [onCoursePress],
  );

  const keyExtractor = useCallback(
    (item: TrendingCourseItem) => item.key,
    [],
  );

  // Track scroll position to animate carousel dots (ref-based to avoid
  // recreating the callback on every state change).
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const cardWidth = 190; // matches snapToInterval
      const index = Math.round(offsetX / cardWidth);
      if (index !== activeIndexRef.current && index < courses.length) {
        activeIndexRef.current = index;
        setActiveDotIndex(index);
      }
    },
    [courses.length],
  );

  return (
    <View style={styles.container}>
      {/* ── Header ───────────────────────────────────────────── */}
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

      {/* ── Featured Hero Card ───────────────────────────────── */}
      <TrendingCourseCard
        {...featuredCourse}
        onExplorePress={onHeroExplorePress}
        onEnrollPress={onHeroEnrollPress}
        onBookmarkPress={() => {}}
      />

      {/* ── Horizontal Trending Courses List ──────────────────── */}
      {courses.length > 0 && (
        <FlatList
          data={courses}
          renderItem={renderMiniCourse}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
          snapToInterval={190}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          removeClippedSubviews
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={3}
        />
      )}

      {/* ── Carousel Page Indicators ──────────────────────────── */}
      {courses.length > 1 && (
        <View style={styles.dotsContainer}>
          {courses.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i === activeDotIndex && styles.dotActive,
              ]}
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
  horizontalListContent: {
    paddingLeft: spacing[16],
    paddingRight: spacing[8],
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
    gap: spacing[8],
  },
  miniCardWrapper: {
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  miniTouchable: {
    overflow: 'hidden',
  },
  miniIllustration: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  miniEmoji: {
    fontSize: 36,
  },
  miniContent: {
    padding: spacing[8],
    gap: spacing[4],
  },
  miniCategoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tint.blue,
    paddingHorizontal: spacing[4],
    paddingVertical: 2,
    borderRadius: radius.xxl,
  },
  miniCategoryText: {
    ...typography.caption,
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '600',
  },
  miniTitle: {
    ...typography.subtitle,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 17,
  },
  miniMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniRating: {
    ...typography.caption,
    fontSize: 9,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  miniDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.disabled,
    marginHorizontal: 2,
  },
  miniStudents: {
    ...typography.caption,
    fontSize: 9,
    color: colors.text.secondary,
  },
  miniPrice: {
    ...typography.subtitle,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '800',
  },
  miniOriginalPrice: {
    fontSize: 11,
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[8],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.disabled,
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
});

export default TrendingCoursesSection;
