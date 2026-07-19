/**
 * UnifiedCoursesScreen
 *
 * Awwwards-tier unified courses catalog combining:
 * - Top Tabs ("All Courses" vs "For You" per user preference A1)
 * - Parallax Hero Header with occlusion culling (`opacity: 0` when `scrollY > HERO_HEIGHT`) to eliminate GPU overdraw
 * - Guarded Stagger entrance animations (`FadeInDown.duration(200)` restricted to `index <= 2` to prevent cell recycling jumps on mid/budget Android devices)
 * - Horizontal category/stream pill bar with smooth transitions
 * - Graceful defaults & fallback states (A2)
 *
 * @module screens/courses/UnifiedCoursesScreen
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation, FadeInDown } from 'react-native-reanimated';

import CourseCard from '../../components/courses/CourseCard';
import Icon from '../../components/home/Icons';
import type { CourseCategory } from '../../components/home/types';
import type { TrendingCourse } from '../../types/home';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import { selectUser, selectSelectedStreamId } from '../../store/authSlice';
import {
  useTrendingCourses,
  useCoursesByStream,
  useLatestCourses,
  useRecommendedCourses,
} from '../../hooks/home/useCourses';
import { useStreams } from '../../hooks/academic/useStreams';

const HERO_HEIGHT = 220;

export type CoursesTabType = 'All Courses' | 'For You';

export interface UnifiedCoursesScreenProps {
  /** Optional initial active tab */
  initialTab?: CoursesTabType;
  /** Optional initial selected stream/category */
  initialCategory?: string | null;
}

interface FilterPill {
  key: string;
  label: string;
  category: string | null;
}

const DEFAULT_FILTER_PILLS: FilterPill[] = [
  { key: 'all', label: 'All Exams', category: null },
  { key: 'jee', label: 'Engineering (JEE)', category: 'JEE' },
  { key: 'neet', label: 'Medical (NEET)', category: 'NEET' },
  { key: 'class-12', label: 'Class 12 Boards', category: 'Class 12' },
  { key: 'upsc', label: 'UPSC CSE', category: 'UPSC' },
];

export default function UnifiedCoursesScreen({
  initialTab = 'All Courses',
  initialCategory = null,
}: UnifiedCoursesScreenProps): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);
  const selectedStreamId = useAppSelector(selectSelectedStreamId);

  const [activeTab, setActiveTab] = useState<CoursesTabType>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reanimated scroll tracking for Parallax Hero + Occlusion Culling
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Hero Parallax & Occlusion Culling Style
  const heroAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0, HERO_HEIGHT],
      [-HERO_HEIGHT * 0.4, 0, HERO_HEIGHT * 0.5],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT * 0.7, HERO_HEIGHT],
      [1, 0.4, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }],
      opacity,
      // When scrolled fully past hero, hide completely to avoid GPU overdraw
      zIndex: scrollY.value > HERO_HEIGHT ? -1 : 0,
    };
  });

  // Fetch data hooks
  const { data: streamsData } = useStreams({ isActive: true });
  const { data: allCoursesData, isLoading: isLoadingAll } = useTrendingCourses({ page: 1, pageSize: 50 });
  const { data: streamCoursesData, isLoading: isLoadingStream } = useCoursesByStream(selectedStreamId ?? '');
  const { data: recommendedData, isLoading: isLoadingRecommended } = useRecommendedCourses(user?.id ?? undefined, 15);
  const { data: latestData, isLoading: isLoadingLatest } = useLatestCourses(15);

  const filterPills = useMemo<FilterPill[]>(() => {
    const backendStreams = streamsData?.data ?? [];
    if (backendStreams.length === 0) return DEFAULT_FILTER_PILLS;

    const dynamicPills: FilterPill[] = [
      { key: 'all', label: 'All Exams', category: null },
      ...backendStreams.map((s) => ({
        key: s.streamId,
        label: s.name,
        category: s.name,
      })),
    ];
    return dynamicPills;
  }, [streamsData]);

  // Combined & deduplicated courses based on activeTab
  const courses = useMemo<TrendingCourse[]>(() => {
    let rawList: TrendingCourse[] = [];

    if (activeTab === 'For You') {
      // Prioritize recommended, then stream specific, then latest
      const rec = recommendedData?.data ?? [];
      const stream = streamCoursesData?.data ?? [];
      const latest = latestData?.data ?? [];
      const map = new Map<string, TrendingCourse>();
      [...rec, ...stream, ...latest].forEach((c) => map.set(c.courseId, c));
      rawList = Array.from(map.values());
    } else {
      rawList = allCoursesData?.data ?? [];
      if (rawList.length === 0 && (latestData?.data?.length ?? 0) > 0) {
        rawList = latestData?.data ?? [];
      }
    }

    // Filter by selected category pill
    if (selectedCategory) {
      rawList = rawList.filter(
        (c) =>
          c.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          c.title?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      rawList = rawList.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.instructor?.toLowerCase().includes(q)
      );
    }

    return rawList;
  }, [
    activeTab,
    selectedCategory,
    searchQuery,
    allCoursesData,
    streamCoursesData,
    recommendedData,
    latestData,
  ]);

  const isLoading =
    activeTab === 'For You'
      ? isLoadingRecommended || isLoadingStream || isLoadingLatest
      : isLoadingAll;

  // Handlers
  const handleCoursePress = useCallback(
    (courseId: string) => {
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation]
  );

  const handleTabChange = useCallback((tab: CoursesTabType) => {
    setActiveTab(tab);
  }, []);

  const handleCategoryPress = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  // Render Header (Parallax Banner + Top Tabs + Filter Pills)
  const renderHeader = useCallback(() => {
    return (
      <View style={styles.headerContainer}>
        {/* Parallax Hero Banner */}
        <Animated.View style={[styles.heroBanner, heroAnimatedStyle]}>
          <View style={styles.heroBackgroundPlate} />
          <View style={styles.heroContent}>
            <View style={styles.heroTagBadge}>
              <Icon name="trophy" color="#F59E0B" width={12} height={12} />
              <Text style={styles.heroTagText}>Academic Excellence 2026</Text>
            </View>
            <Text style={styles.heroTitle}>
              {activeTab === 'For You'
                ? 'Curated For Your Goal'
                : 'Premium Course Catalog'}
            </Text>
            <Text style={styles.heroSubtitle}>
              Rigorous syllabus coverage, live interactive classes, and AI-driven mock analytics.
            </Text>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Icon name="search" color="#94A3B8" width={18} height={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by exam, subject, or instructor..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="x" color="#64748B" width={16} height={16} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Top Tabs (All Courses vs For You) */}
        <View style={styles.tabBarRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'All Courses' && styles.tabButtonActive]}
            onPress={() => handleTabChange('All Courses')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'All Courses' && styles.tabTextActive]}>
              All Courses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'For You' && styles.tabButtonActive]}
            onPress={() => handleTabChange('For You')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'For You' && styles.tabTextActive]}>
              For You ✨
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Pills Carousel */}
        <FlatList
          data={filterPills}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.pillsContainer}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.category;
            return (
              <TouchableOpacity
                style={[styles.pillChip, isSelected && styles.pillChipActive]}
                onPress={() => handleCategoryPress(item.category)}
                activeOpacity={0.75}
              >
                <Text style={[styles.pillChipText, isSelected && styles.pillChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.listSectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? `${selectedCategory} Batches` : activeTab === 'For You' ? 'Recommended For You' : 'All Available Batches'}
          </Text>
          <Text style={styles.sectionCount}>
            {courses.length} {courses.length === 1 ? 'Batch' : 'Batches'}
          </Text>
        </View>
      </View>
    );
  }, [
    heroAnimatedStyle,
    activeTab,
    searchQuery,
    filterPills,
    selectedCategory,
    courses.length,
    handleTabChange,
    handleCategoryPress,
  ]);

  // Render Course Item with Guarded Stagger (index <= 2 only)
  const renderItem = useCallback(
    ({ item, index }: { item: TrendingCourse; index: number }) => {
      const cardContent = (
        <CourseCard
          courseId={item.courseId}
          title={item.title}
          description={item.description}
          category={item.category}
          instructor={item.instructor || 'IITian & Expert Faculty'}
          rating={item.rating || 4.9}
          totalStudents={item.totalStudents || 1250}
          price={item.price || 4999}
          originalPrice={item.originalPrice || 14999}
          duration={item.duration || 6}
          isBookmarked={item.isBookmarked || false}
          badgeLabel={item.badgeLabel || (item.isBestSeller ? 'Best Seller' : 'Popular')}
          badgeType={item.isBestSeller ? 'Best Seller' : 'Popular'}
          onPress={() => handleCoursePress(item.courseId)}
        />
      );

      // Guarded Stagger: only apply entering animation for the first 3 items (index <= 2)
      // to avoid cell recycling jump artifacts inside FlatList on Android devices
      if (index <= 2) {
        return (
          <Animated.View entering={FadeInDown.delay(index * 60).duration(200)}>
            {cardContent}
          </Animated.View>
        );
      }

      return cardContent;
    },
    [handleCoursePress]
  );

  // Render Empty State with Graceful Defaults (A2)
  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Fetching academic batches...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Icon name="book-open" color="#64748B" width={28} height={28} />
        </View>
        <Text style={styles.emptyTitle}>No Batches Found</Text>
        <Text style={styles.emptySubtitle}>
          We couldn't find any batches matching your current filter. Try selecting 'All Exams' or clearing your search.
        </Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setSelectedCategory(null);
            setSearchQuery('');
          }}
        >
          <Text style={styles.resetButtonText}>View All Batches</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.FlatList
        data={courses}
        keyExtractor={(item) => item.courseId}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        // High-performance cell recycling props
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: spacing[8],
  },

  // Parallax Hero
  heroBanner: {
    height: HERO_HEIGHT,
    marginHorizontal: spacing[16],
    marginTop: spacing[8],
    marginBottom: spacing[16],
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    padding: spacing[20],
  },
  heroBackgroundPlate: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A', // Deep Indigo Navy base
  },
  heroContent: {
    zIndex: 2,
  },
  heroTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xxl,
    alignSelf: 'flex-start',
    marginBottom: spacing[12],
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
    maxWidth: '90%',
  },

  // Search Section
  searchSection: {
    marginHorizontal: spacing[16],
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },

  // Top Tabs
  tabBarRow: {
    flexDirection: 'row',
    marginHorizontal: spacing[16],
    backgroundColor: '#F1F5F9',
    borderRadius: radius.xl,
    padding: 4,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // Pills
  pillsContainer: {
    paddingHorizontal: spacing[16],
    gap: spacing[8],
    marginBottom: spacing[16],
  },
  pillChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.xxl,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  pillChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  pillChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pillChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Section Header
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing[16],
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: spacing[24],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[16],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: spacing[8],
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[20],
  },
  resetButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: radius.xl,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: spacing[12],
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});
