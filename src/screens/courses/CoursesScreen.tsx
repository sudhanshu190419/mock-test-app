/**
 * CoursesScreen
 *
 * Production-optimised Courses page — loads all published courses from
 * Supabase via the `usePublishedCourses` hook.
 *
 * Search and category filtering are applied client-side on the loaded data.
 *
 * @module screens/courses/CoursesScreen
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import CourseCard from '../../components/courses/CourseCard';
import Icon from '../../components/home/Icons';
import { usePublishedCourses } from '../../hooks/home/useCourses';
import type { CourseItem, CourseCategory, CourseBadgeType, CourseStats } from '../../components/home/types';
import type { TrendingCourse } from '../../types/home';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── Constants ──────────────────────────────────────────────────────────────

interface CategoryChip {
  key: string;
  label: string;
  filterCategory: CourseCategory | null;
}

const CATEGORIES: CategoryChip[] = [
  { key: 'all', label: 'All', filterCategory: null },
  { key: 'engineering', label: 'Engineering', filterCategory: 'JEE' },
  { key: 'medical', label: 'Medical', filterCategory: 'NEET' },
  { key: 'school', label: 'School', filterCategory: 'Class 10' },
  { key: 'law-others', label: 'Law & Others', filterCategory: 'CLAT' },
];

// ─── Mapping Helper ─────────────────────────────────────────────────────────

/**
 * Map a backend `TrendingCourse` to the UI-facing `CourseItem`.
 */
function mapTrendingCourseToCourseItem(course: TrendingCourse): CourseItem {
  const hasDiscount = course.originalPrice > course.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - course.price / course.originalPrice) * 100)
    : 0;

  const stats: CourseStats = {
    duration: course.duration ? `${course.duration} Days` : 'Self-paced',
    hasLiveClasses: false,
    hasRecorded: false,
  };

  const badgeType: CourseBadgeType = course.isBestSeller
    ? 'Best Seller'
    : 'Popular';

  return {
    key: course.courseId,
    title: course.title,
    subtitle: course.category,
    description: course.description,
    category: course.category as CourseCategory,
    badgeLabel: course.isBestSeller ? 'Best Seller' : 'Featured',
    badgeType,
    stats,
    price: course.price,
    originalPrice: course.originalPrice > course.price ? course.originalPrice : undefined,
    discountLabel: hasDiscount ? `${discountPercent}% Off` : undefined,
  };
}

// ─── Reusable hitSlop objects ───────────────────────────────────────────────

const CLEAR_BUTTON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function CoursesScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [activeCategory, setActiveCategory] = useState<CourseCategory | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // ── Fetch courses from Supabase ───────────────────────────────
  const {
    data: coursesData,
    isLoading,
    error,
    refetch,
  } = usePublishedCourses({ page: 1, pageSize: 50 });

  console.log('[COURSES_SCREEN] Courses loaded:', coursesData?.data?.length ?? 0);

  // ── Map to CourseItem[] once ──────────────────────────────────
  const allCourses = useMemo<CourseItem[]>(() => {
    const backendData = coursesData?.data ?? [];
    return backendData.map((course) => mapTrendingCourseToCourseItem(course));
  }, [coursesData]);

  // ── Derived data ─────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    let list = allCourses;

    if (activeCategory) {
      list = list.filter((c) => c.category === activeCategory);
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.subtitle.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query),
      );
    }

    return list;
  }, [allCourses, activeCategory, searchText]);

  // ── Navigation helper ────────────────────────────────────────
  const navigateToDetail = useCallback(
    (courseId: string) => {
      console.log('[COURSES_SCREEN] Navigating to course detail:', courseId);
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation],
  );

  // ── Stable handlers ──────────────────────────────────────────
  const handleSearchFocus = useCallback(() => setIsSearchFocused(true), []);
  const handleSearchBlur = useCallback(() => setIsSearchFocused(false), []);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    searchInputRef.current?.blur();
  }, []);

  const handleCategoryPress = useCallback(
    (category: CourseCategory | null) =>
      setActiveCategory((prev) => (prev === category ? null : category)),
    [],
  );

  // ── Stable content container style ───────────────────────────
  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom: insets.bottom + spacing[24],
    }),
    [insets.bottom],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={contentContainerStyle}
        bounces
        overScrollMode="never"
      >
        {/* ═══ Index 0: App Bar ═══ */}
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={navigation.goBack}
            style={styles.appBarLeft}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-left" color={colors.text.primary} width={22} height={22} />
          </TouchableOpacity>

          <View style={styles.appBarCenter}>
            <Text style={styles.appBarTitle}>Courses</Text>
            <Text style={styles.appBarSubtitle} numberOfLines={1}>
              Explore courses and find the perfect batch for your goals.
            </Text>
          </View>

          <View style={styles.myLearningButton}>
            <Icon name="bookmark" color={colors.secondary} width={18} height={18} />
            <Text style={styles.myLearningText}>My Learning</Text>
          </View>
        </View>

        {/* ═══ Index 1: Search + Chips — sticky ═══ */}
        <View style={styles.stickyHeaderWrapper}>
          {/* Search Row */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchContainer,
                isSearchFocused && styles.searchContainerFocused,
              ]}
            >
              <Icon
                name="search"
                color={isSearchFocused ? colors.secondary : colors.text.secondary}
                width={18}
                height={18}
              />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search courses, subjects..."
                placeholderTextColor={colors.text.secondary}
                value={searchText}
                onChangeText={setSearchText}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search courses and subjects"
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearSearch}
                  style={styles.clearButton}
                  activeOpacity={0.7}
                  hitSlop={CLEAR_BUTTON_HIT_SLOP}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                >
                  <View style={styles.clearIcon}>
                    <Text style={styles.clearIconText}>✕</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.filterButton}
              activeOpacity={0.7}
              accessibilityLabel="Filter courses"
              accessibilityRole="button"
            >
              <Icon name="filter" color={colors.text.inverse} width={18} height={18} />
            </TouchableOpacity>
          </View>

          {/* Category Chips */}
          <View style={styles.chipsContent}>
            {CATEGORIES.map((item) => {
              const isActive = activeCategory === item.filterCategory;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handleCategoryPress(item.filterCategory)}
                  style={[styles.chip, isActive && styles.chipActive]}
                  activeOpacity={0.75}
                  accessibilityLabel={`${item.label} courses`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ═══ Index 2+: Loading / Error / Course Cards ═══ */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={styles.loadingText}>Loading courses…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconWrap}>
              <Icon name="alert-triangle" color="#DC2626" width={40} height={40} />
            </View>
            <Text style={styles.errorTitle}>Could not load courses</Text>
            <Text style={styles.errorText}>
              {error instanceof Error ? error.message : 'An error occurred while loading courses.'}
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={styles.retryButton}
              activeOpacity={0.85}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((item) => {
            const { key, ...courseProps } = item;
            return (
              <CourseCard
                key={key}
                {...courseProps}
                onPress={() => navigateToDetail(key)}
              />
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Icon name="book-open" color={colors.disabled} width={48} height={48} />
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or filter to discover courses.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── App Bar ──────────────────────────────────────────────────
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingTop: spacing[8],
    paddingBottom: spacing[16],
  },
  appBarLeft: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[12],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  appBarCenter: {
    flex: 1,
  },
  appBarTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    lineHeight: 28,
  },
  appBarSubtitle: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
    marginTop: 2,
  },
  myLearningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.tint.blue,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.xxl,
    marginLeft: spacing[8],
  },
  myLearningText: {
    ...typography.labelSmall,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
  },

  // ── Loading ──────────────────────────────────────────────────
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[48],
    gap: spacing[12],
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
  },

  // ── Error ────────────────────────────────────────────────────
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[48],
    paddingHorizontal: spacing[32],
    gap: spacing[8],
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  errorTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    marginTop: spacing[8],
  },
  retryButtonText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.inverse,
  },

  // ── Sticky Header Wrapper ────────────────────────────────────
  stickyHeaderWrapper: {
    backgroundColor: colors.background,
    paddingBottom: spacing[12],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing[8],
  },

  // ── Search ───────────────────────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    gap: spacing[12],
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing[12],
  },
  searchContainerFocused: {
    borderColor: colors.secondary,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    color: colors.text.primary,
    paddingVertical: 0,
    fontSize: 14,
  },
  clearButton: {
    padding: 2,
  },
  clearIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIconText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Category Chips ───────────────────────────────────────────
  chipsContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing[16],
    gap: spacing[8],
  },
  chip: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  chipText: {
    ...typography.labelSmall,
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.text.inverse,
    fontWeight: '700',
  },

  // ── Empty State ──────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[48],
    paddingHorizontal: spacing[32],
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text.primary,
    marginTop: spacing[16],
    fontWeight: '700',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[8],
  },
});
