/**
 * CoursesScreen
 *
 * Premium dedicated Courses page using ScrollView with stickyHeaderIndices
 * for native, lag-free scrolling that matches MockTestsTabScreen.
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import CourseCard from '../../components/courses/CourseCard';
import Icon from '../../components/home/Icons';
import type { CourseItem, CourseCategory } from '../../components/home/types';
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

// ─── Sample Course Data ─────────────────────────────────────────────────────

const ALL_COURSES: CourseItem[] = [
  {
    key: 'jee-main-2026',
    title: 'JEE Main 2026 Complete Batch',
    subtitle: 'Class 12 | IIT-JEE Aspirants',
    description: 'Master Physics, Chemistry & Maths with IITian faculty. Includes live doubt sessions, weekly mock tests, and personalised performance reports.',
    category: 'JEE',
    badgeLabel: 'Best Seller',
    badgeType: 'Best Seller',
    stats: { duration: '8 Months', hasLiveClasses: true, hasRecorded: true },
    price: 5999,
    originalPrice: 24999,
  },
  {
    key: 'neet-ug-2026',
    title: 'NEET UG 2026 Crash Course',
    subtitle: 'Class 12 | Medical Aspirants',
    description: 'Complete NEET syllabus in 5 months with expert faculty. Daily live classes, chapter tests, and full-length mock exams with AI analytics.',
    category: 'NEET',
    badgeLabel: 'Popular',
    badgeType: 'Popular',
    stats: { duration: '5 Months', hasLiveClasses: true, hasRecorded: true },
    price: 4999,
    originalPrice: 19999,
  },
  {
    key: 'class-12-boards-2026',
    title: 'Class 12 Boards Mastery',
    subtitle: 'Class 12 | CBSE & State Boards',
    description: 'Score 95%+ with chapter-wise recorded lectures, PYQ practice, revision notes, and live doubt-clearing sessions every weekend.',
    category: 'Class 12',
    badgeLabel: 'Best Seller',
    badgeType: 'Best Seller',
    stats: { duration: '6 Months', hasLiveClasses: false, hasRecorded: true },
    price: 2999,
    originalPrice: 12999,
  },
  {
    key: 'jee-advanced-2026',
    title: 'JEE Advanced 2026 Rank Booster',
    subtitle: 'Class 12 | JEE Advanced Aspirants',
    description: 'Advanced problem-solving sessions, IOQM-level practice, and exclusive mentorship from top IIT rankers. Limited seats available.',
    category: 'JEE',
    badgeLabel: 'New Launch',
    badgeType: 'New Launch',
    stats: { duration: '10 Months', hasLiveClasses: true, hasRecorded: true },
    price: 8999,
    originalPrice: 34999,
  },
];

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function CoursesScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState<CourseCategory | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // ── Derived data ─────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    let list = ALL_COURSES;

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
  }, [activeCategory, searchText]);

  // ── Callbacks ────────────────────────────────────────────────
  const handleBackPress = useCallback(() => navigation.goBack(), [navigation]);

  const handleMyLearningPress = useCallback(() => { /* Navigate to My Learning */ }, []);

  const handleCategoryPress = useCallback((category: CourseCategory | null) => {
    setActiveCategory((prev) => (prev === category ? null : category));
  }, []);

  const handleExplorePress = useCallback((courseKey: string) => { /* Navigate */ }, []);
  const handleBookmarkPress = useCallback((courseKey: string) => { /* Toggle */ }, []);

  const handleSearchFocus = useCallback(() => setIsSearchFocused(true), []);
  const handleSearchBlur = useCallback(() => setIsSearchFocused(false), []);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    searchInputRef.current?.blur();
  }, []);

  // ── Render ───────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        // Index 1 (search + chips) sticks to the top when scrolling
        stickyHeaderIndices={[1]}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing[24],
        }}
        bounces
        overScrollMode="never"
      >
        {/* ═══ Index 0: App Bar — scrolls away ═══ */}
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.appBarLeft}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" color={colors.text.primary} width={22} height={22} />
          </TouchableOpacity>

          <View style={styles.appBarCenter}>
            <Text style={styles.appBarTitle}>Courses</Text>
            <Text style={styles.appBarSubtitle} numberOfLines={1}>
              Explore courses and find the perfect batch for your goals.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleMyLearningPress}
            style={styles.myLearningButton}
            activeOpacity={0.7}
          >
            <Icon name="bookmark" color={colors.secondary} width={18} height={18} />
            <Text style={styles.myLearningText}>My Learning</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Index 1: Search + Chips — sticky ═══ */}
        <View style={styles.stickyHeaderWrapper}>
          {/* Search Row */}
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
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
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearSearch}
                  style={styles.clearButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.clearIcon}>
                    <Text style={styles.clearIconText}>✕</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
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
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ═══ Index 2+: Course Cards or Empty State ═══ */}
        {filteredCourses.length > 0 ? (
          filteredCourses.map((item, index) => {
            // Destructure `key` out so it isn't spread into JSX
            const { key, ...courseProps } = item;
            return (
              <CourseCard
                key={key}
                {...courseProps}
                animationDelay={index * 80}
                onExplorePress={() => handleExplorePress(key)}
                onBookmarkPress={() => handleBookmarkPress(key)}
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
