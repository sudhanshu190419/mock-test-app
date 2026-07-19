import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, withTiming, FadeInDown, Layout } from 'react-native-reanimated';

// Component imports
import CategoryChipStrip from '../../components/courses/CategoryChipStrip';
import SortPillsRow, { type SortOptionValue } from '../../components/courses/SortPillsRow';
import CoursesSectionHeader from '../../components/courses/CoursesSectionHeader';
import CourseCard from '../../components/courses/CourseCard';
import CourseCardCompact from '../../components/courses/CourseCardCompact';
import EnrolledCourseCard from '../../components/courses/EnrolledCourseCard';
import CourseHeroCarousel from '../../components/courses/CourseHeroCarousel';
import CoursesSkeleton from '../../components/courses/CoursesSkeleton';
import CoursesEmptyState from '../../components/courses/CoursesEmptyState';
import Icon from '../../components/home/Icons';

// Theme imports
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// Auth and Service hooks
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import { usePublishedCourses } from '../../hooks/home/useCourses';
import { useEnrolledCourses } from '../../hooks/home/useEnrolledCourses';
import { getCourseProgress } from '../../utils/courseProgress';
import type { TrendingCourse } from '../../types/home';
import type { AppStackParamList } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Category mapping helper (maps chip group filterValues to course category field values)
function matchesCategoryFilter(courseCategory: string, filterValue: string | null): boolean {
  if (!filterValue) return true;
  const courseCat = courseCategory.toLowerCase();
  const filter = filterValue.toLowerCase();
  
  if (filter === 'school') {
    return courseCat.includes('class') || courseCat.includes('school');
  }
  return courseCat.includes(filter);
}

export default function CoursesScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const user = useAppSelector(selectUser);

  // States
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<SortOptionValue>('popular');
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Reanimated Shared Values
  const scrollY = useSharedValue(0);
  const filterHeight = useSharedValue(0);
  const filterOpacity = useSharedValue(0);

  // Toggle collapsible filter panel
  useEffect(() => {
    filterHeight.value = withTiming(isFilterPanelExpanded ? 112 : 0, { duration: 200 });
    filterOpacity.value = withTiming(isFilterPanelExpanded ? 1 : 0, { duration: 200 });
  }, [isFilterPanelExpanded]);

  // Data fetching
  const {
    data: coursesData,
    isLoading,
    error,
    refetch,
  } = usePublishedCourses({ page: 1, pageSize: 50 });

  const { data: enrolledCourses, refetch: refetchEnrolled } = useEnrolledCourses(user?.id);

  // Handle manual pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchEnrolled()]);
    setRefreshing(false);
  }, [refetch, refetchEnrolled]);

  const allCourses = useMemo<TrendingCourse[]>(() => {
    return coursesData?.data ?? [];
  }, [coursesData]);

  // Enrolled courses progress states
  const [enrolledWithProgress, setEnrolledWithProgress] = useState<Array<TrendingCourse & { progress: number }>>([]);

  useEffect(() => {
    if (user?.id && enrolledCourses && enrolledCourses.length > 0) {
      let active = true;
      const fetchProgresses = async () => {
        const enriched = await Promise.all(
          enrolledCourses.map(async (course) => {
            const p = await getCourseProgress(user.id, course.courseId);
            return { ...course, progress: p || 15 };
          })
        );
        if (active) {
          setEnrolledWithProgress(enriched);
        }
      };
      fetchProgresses();
      return () => {
        active = false;
      };
    } else {
      setEnrolledWithProgress([]);
    }
  }, [user?.id, enrolledCourses]);

  // 1. Featured Courses
  const featuredCourses = useMemo(() => {
    return allCourses.filter((c) => c.isBestSeller);
  }, [allCourses]);

  // 2. Filter & Sort Main courses
  const processedCourses = useMemo(() => {
    let list = [...allCourses];

    if (activeCategory) {
      list = list.filter((c) => matchesCategoryFilter(c.category, activeCategory));
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query) ||
          (c.instructor && c.instructor.toLowerCase().includes(query))
      );
    }

    list.sort((a, b) => {
      switch (activeSort) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'newest':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'popular':
        default:
          return b.totalStudents - a.totalStudents;
      }
    });

    return list;
  }, [allCourses, activeCategory, searchText, activeSort]);

  // Spotlight card is the first item of processed list
  const spotlightCourse = useMemo(() => {
    return processedCourses.length > 0 ? processedCourses[0] : null;
  }, [processedCourses]);

  // Grid courses are the remaining items
  const gridCourses = useMemo(() => {
    return processedCourses.length > 1 ? processedCourses.slice(1) : [];
  }, [processedCourses]);

  // Recommended courses
  const recommendedCourses = useMemo(() => {
    if (!user || !user.id) return [];
    const enrolledIds = new Set((enrolledCourses || []).map((c) => c.courseId));
    return allCourses.filter((c) => !enrolledIds.has(c.courseId)).slice(0, 5);
  }, [allCourses, enrolledCourses, user]);

  const handleCoursePress = useCallback(
    (courseId: string) => {
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation]
  );

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    searchInputRef.current?.blur();
  }, []);

  // Reanimated Scroll Handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const baseColor = coursesDark.base;
  const dividerColor = coursesDark.dividerOnDark;

  // Animated styles for sticky header wrapper shadow and color
  const stickyHeaderAnimatedStyle = useAnimatedStyle(() => {
    const isScrolled = scrollY.value > 50;
    return {
      backgroundColor: withTiming(isScrolled ? '#FFFFFF' : baseColor, { duration: 150 }),
      borderBottomWidth: withTiming(isScrolled ? 1 : 0, { duration: 150 }),
      borderBottomColor: dividerColor,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: withTiming(isScrolled ? 0.05 : 0, { duration: 150 }),
      shadowRadius: 8,
      elevation: withTiming(isScrolled ? 3 : 0, { duration: 150 }),
    };
  });

  // Collapsible panel heights/opacities
  const filterPanelAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: filterHeight.value,
      opacity: filterOpacity.value,
    };
  });

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={coursesDark.accentPrimary}
            colors={[coursesDark.accentPrimary]}
          />
        }
      >
        {/* ═══ Header Title Zone (Scrolls away) ═══ */}
        <View style={styles.staticHeader}>
          <Text style={styles.headerTitle}>Courses</Text>
          <Text style={styles.headerSubtitle}>Find your perfect prep batch</Text>
        </View>

        {/* ═══ Unified Sticky Search & Collapsible Panel Wrapper ═══ */}
        <View style={styles.stickyHeaderWrapper}>
          <Animated.View style={[styles.stickyHeaderInner, stickyHeaderAnimatedStyle]}>
            <View style={styles.searchRow}>
              {/* Unified Search Input */}
              <View
                style={[
                  styles.searchContainer,
                  isSearchFocused && styles.searchContainerFocused,
                ]}
              >
                <Icon
                  name="search"
                  color={isSearchFocused ? coursesDark.accentPrimary : coursesDark.textMutedOnDark}
                  width={18}
                  height={18}
                />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search courses, subjects, tutors..."
                  placeholderTextColor={coursesDark.textMutedOnDark}
                  value={searchText}
                  onChangeText={setSearchText}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearSearch}
                    style={styles.clearButton}
                  >
                    <Icon name="x-circle" color={coursesDark.textMutedOnDark} width={16} height={16} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Unified Collapsible Panel Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.filterButtonInline,
                  isFilterPanelExpanded && styles.filterButtonInlineActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
              >
                <Icon
                  name="filter"
                  color={isFilterPanelExpanded ? '#FFFFFF' : coursesDark.accentPrimary}
                  width={18}
                  height={18}
                />
              </TouchableOpacity>
            </View>

            {/* Collapsible Panel */}
            <Animated.View style={[styles.filterPanel, filterPanelAnimatedStyle]}>
              <CategoryChipStrip
                activeCategory={activeCategory}
                onCategorySelect={setActiveCategory}
              />
              <SortPillsRow
                activeSort={activeSort}
                onSortSelect={setActiveSort}
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* ═══ Content loading / empty / main view ═══ */}
        {isLoading ? (
          <CoursesSkeleton variant="all" />
        ) : error ? (
          <CoursesEmptyState
            variant="error"
            title="Unable to load courses"
            description="There was a connection issue loading the course catalog. Please check your network and try again."
            buttonText="Try Again"
            onButtonPress={handleRefresh}
          />
        ) : allCourses.length === 0 ? (
          <CoursesEmptyState
            title="No Courses Available"
            description="Check back later! We are currently uploading awesome new test preparation programs."
          />
        ) : (
          <View style={styles.contentContainer}>
            {/* 1. Hero Carousel (Featured courses) */}
            {featuredCourses.length > 0 && !searchText && !activeCategory && (
              <View style={styles.sectionContainer}>
                <CoursesSectionHeader title="Spotlight Batches" emoji="🔥" />
                <CourseHeroCarousel
                  courses={featuredCourses}
                  onCoursePress={handleCoursePress}
                />
              </View>
            )}

            {/* 2. My Courses row (Enrolled) */}
            {enrolledWithProgress.length > 0 && !searchText && !activeCategory && (
              <View style={styles.sectionContainer}>
                <CoursesSectionHeader title="My Active Batches" emoji="⚡" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.enrolledScroll}
                >
                  {enrolledWithProgress.map((course) => (
                    <EnrolledCourseCard
                      key={course.courseId}
                      courseId={course.courseId}
                      title={course.title}
                      category={course.category}
                      progressPercent={course.progress}
                      onPress={() => handleCoursePress(course.courseId)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 3. Recommended for you */}
            {recommendedCourses.length > 0 && !searchText && !activeCategory && (
              <View style={styles.sectionContainer}>
                <CoursesSectionHeader title="Recommended Prep" emoji="🎯" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recommendedScroll}
                >
                  {recommendedCourses.map((item) => (
                    <View key={item.courseId} style={styles.gridCardWrapper}>
                      <CourseCardCompact
                        courseId={item.courseId}
                        title={item.title}
                        category={item.category}
                        price={item.price}
                        originalPrice={item.originalPrice}
                        imageUrl={item.imageUrl}
                        onPress={() => handleCoursePress(item.courseId)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 4. All Courses catalog */}
            <View style={styles.sectionContainer}>
              <CoursesSectionHeader
                title={searchText || activeCategory ? 'Filtered Batches' : 'Browse All Batches'}
                emoji="📚"
              />

              {processedCourses.length === 0 ? (
                <CoursesEmptyState
                  title="No matches found"
                  description="We couldn't find any batches matching your criteria. Try resetting your search query or filters."
                  buttonText="Clear Filters"
                  onButtonPress={() => {
                    setActiveCategory(null);
                    setSearchText('');
                  }}
                />
              ) : (
                <View style={styles.catalogContainer}>
                  {/* Spotlight Large Card */}
                  {spotlightCourse && (
                    <Animated.View layout={Layout.duration(200)}>
                      <CourseCard
                        key={spotlightCourse.courseId}
                        courseId={spotlightCourse.courseId}
                        title={spotlightCourse.title}
                        description={spotlightCourse.description}
                        category={spotlightCourse.category}
                        instructor={spotlightCourse.instructor}
                        rating={spotlightCourse.rating || 4.8}
                        totalStudents={spotlightCourse.totalStudents}
                        price={spotlightCourse.price}
                        originalPrice={spotlightCourse.originalPrice}
                        duration={spotlightCourse.duration}
                        imageUrl={spotlightCourse.imageUrl}
                        onPress={() => handleCoursePress(spotlightCourse.courseId)}
                      />
                    </Animated.View>
                  )}

                  {/* Dynamic 2-column grid of compact cards */}
                  {gridCourses.length > 0 && (
                    <View style={styles.gridCatalog}>
                      {gridCourses.map((course, idx) => (
                        <Animated.View
                          key={course.courseId}
                          entering={FadeInDown.delay(idx * 50).duration(200)}
                          layout={Layout.duration(200)}
                          style={styles.gridCardWrapper}
                        >
                          <CourseCardCompact
                            courseId={course.courseId}
                            title={course.title}
                            category={course.category}
                            price={course.price}
                            originalPrice={course.originalPrice}
                            imageUrl={course.imageUrl}
                            onPress={() => handleCoursePress(course.courseId)}
                          />
                        </Animated.View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>

      {/* Floating My Learning Action FAB Button */}
      {enrolledWithProgress.length > 0 && (
        <AnimatedTouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            refetchEnrolled();
          }}
          style={styles.floatingFab}
          entering={FadeInDown.delay(400).duration(200)}
        >
          <Icon name="bookmark" color="#FFFFFF" width={16} height={16} />
          <Text style={styles.fabText}>My Learning</Text>
        </AnimatedTouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: coursesDark.base,
  },
  staticHeader: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[12],
    backgroundColor: coursesDark.base,
  },
  headerTitle: {
    ...typography.heroTitle,
    color: coursesDark.textOnDark,
    lineHeight: 34,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: coursesDark.textMutedOnDark,
    fontSize: 13,
    marginTop: spacing[4],
  },
  stickyHeaderWrapper: {
    backgroundColor: 'transparent',
  },
  stickyHeaderInner: {
    paddingVertical: spacing[8],
    backgroundColor: coursesDark.base,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    gap: spacing[8],
  },
  backButtonInline: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: coursesDark.surfaceCardDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: coursesDark.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing[12],
    height: 42,
    borderWidth: 1.5,
    borderColor: coursesDark.dividerOnDark,
    gap: spacing[8],
  },
  searchContainerFocused: {
    borderColor: coursesDark.accentPrimary,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    color: coursesDark.textOnDark,
    paddingVertical: 0,
    fontSize: 14,
  },
  clearButton: {
    padding: spacing[4],
  },
  filterButtonInline: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: coursesDark.surfaceCardDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
  },
  filterButtonInlineActive: {
    backgroundColor: coursesDark.accentPrimary,
    borderColor: coursesDark.accentPrimary,
  },
  filterPanel: {
    overflow: 'hidden',
    marginTop: spacing[4],
  },
  contentContainer: {
    paddingBottom: spacing[24],
  },
  sectionContainer: {
    marginBottom: spacing[8],
  },
  enrolledScroll: {
    paddingHorizontal: spacing[16],
    gap: spacing[8],
    paddingBottom: spacing[8],
  },
  recommendedScroll: {
    paddingHorizontal: spacing[16],
    gap: spacing[8],
    paddingBottom: spacing[8],
  },
  gridCardWrapper: {
    width: (width - 16 - 16 - 12) / 2,
  },
  catalogContainer: {
    marginTop: spacing[4],
  },
  gridCatalog: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[16],
    justifyContent: 'space-between',
    rowGap: spacing[12],
  },
  bottomSpacer: {
    height: 100,
  },
  floatingFab: {
    position: 'absolute',
    bottom: spacing[24],
    right: spacing[16],
    backgroundColor: coursesDark.accentPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.full,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fabText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
});
