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
import { usePracticeList } from '../../hooks/practice/usePractice';
import { usePurchasedPractices } from '../../hooks/practice/usePurchasedPractices';
import type { PracticePackage } from '../../types/practice';
import type { AppStackParamList } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Category mapping helper
function matchesCategoryFilter(streamName: string, filterValue: string | null): boolean {
  if (!filterValue) return true;
  const streamCat = streamName.toLowerCase();
  const filter = filterValue.toLowerCase();
  
  if (filter === 'school') {
    return streamCat.includes('class') || streamCat.includes('school');
  }
  return streamCat.includes(filter);
}

export default function MockTestsTabScreen(): React.JSX.Element {
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
    data: practiceData,
    isLoading,
    error,
    refetch,
  } = usePracticeList(undefined, undefined, { page: 1, pageSize: 50 });

  const { data: purchasedPractices, refetch: refetchPurchased } = usePurchasedPractices(user?.id);

  // Handle manual pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchPurchased()]);
    setRefreshing(false);
  }, [refetch, refetchPurchased]);

  const allPractices = useMemo<PracticePackage[]>(() => {
    return practiceData?.data ?? [];
  }, [practiceData]);

  // Filter & Sort Main Practices
  const processedPractices = useMemo(() => {
    let list = [...allPractices];

    if (activeCategory) {
      list = list.filter((p) => matchesCategoryFilter(p.streamName, activeCategory));
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query)) ||
          p.streamName.toLowerCase().includes(query)
      );
    }

    list.sort((a, b) => {
      switch (activeSort) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'newest':
          return new Date(b.publishedAt || '').getTime() - new Date(a.publishedAt || '').getTime();
        case 'popular':
        default:
          return b.totalPapers - a.totalPapers;
      }
    });

    return list;
  }, [allPractices, activeCategory, searchText, activeSort]);

  // Spotlight card is the first item of processed list
  const spotlightPractice = useMemo(() => {
    return processedPractices.length > 0 ? processedPractices[0] : null;
  }, [processedPractices]);

  // Grid practices are the remaining items
  const gridPractices = useMemo(() => {
    return processedPractices.length > 1 ? processedPractices.slice(1) : [];
  }, [processedPractices]);

  const handlePracticePress = useCallback(
    (packageId: string) => {
      navigation.navigate('ExamPackDetail', { packageId });
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
          <Text style={styles.headerTitle}>Practice</Text>
          <Text style={styles.headerSubtitle}>Master your exams with PYQs</Text>
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
                  placeholder="Search PYQs, exams, years..."
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
            title="Unable to load PYQs"
            description="There was a connection issue loading the practice catalog. Please check your network and try again."
            buttonText="Try Again"
            onButtonPress={handleRefresh}
          />
        ) : allPractices.length === 0 ? (
          <CoursesEmptyState
            title="No PYQs Available"
            description="Check back later! We are currently uploading awesome new practice papers."
          />
        ) : (
          <View style={styles.contentContainer}>
            {/* My PYQs row (Purchased) */}
            {purchasedPractices && purchasedPractices.length > 0 && !searchText && !activeCategory && (
              <View style={styles.sectionContainer}>
                <CoursesSectionHeader title="My Purchased PYQs" emoji="⚡" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.enrolledScroll}
                >
                  {purchasedPractices.map((practice) => (
                    <EnrolledCourseCard
                      key={practice.packageId}
                      courseId={practice.packageId}
                      title={practice.name}
                      category={practice.streamName}
                      progressPercent={0}
                      progressSuffix=" Papers"
                      onPress={() => handlePracticePress(practice.packageId)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* All PYQs catalog */}
            <View style={styles.sectionContainer}>
              <CoursesSectionHeader
                title={searchText || activeCategory ? 'Filtered PYQs' : 'Browse All PYQs'}
                emoji="📚"
              />

              {processedPractices.length === 0 ? (
                <CoursesEmptyState
                  title="No matches found"
                  description="We couldn't find any PYQs matching your criteria. Try resetting your search query or filters."
                  buttonText="Clear Filters"
                  onButtonPress={() => {
                    setActiveCategory(null);
                    setSearchText('');
                  }}
                />
              ) : (
                <View style={styles.catalogContainer}>
                  {/* Spotlight Large Card */}
                  {spotlightPractice && (
                    <Animated.View layout={Layout.duration(200)}>
                      <CourseCard
                        key={spotlightPractice.packageId}
                        courseId={spotlightPractice.packageId}
                        title={spotlightPractice.name}
                        description={spotlightPractice.description || ''}
                        category={spotlightPractice.streamName}
                        price={spotlightPractice.price}
                        originalPrice={spotlightPractice.originalPrice || undefined}
                        imageUrl={spotlightPractice.thumbnailUrl}
                        primaryCtaText="Unlock PYQs →"
                        secondaryCtaText="View Papers"
                        features={[
                          { icon: 'layers', text: `${spotlightPractice.totalPapers} Papers` },
                          { icon: 'calendar', text: `${spotlightPractice.yearFrom}${spotlightPractice.yearTo ? ` - ${spotlightPractice.yearTo}` : ''}` },
                          { icon: 'check-circle', text: 'Solutions' }
                        ]}
                        onPress={() => handlePracticePress(spotlightPractice.packageId)}
                        onExplorePress={() => handlePracticePress(spotlightPractice.packageId)}
                      />
                    </Animated.View>
                  )}

                  {/* Dynamic 2-column grid of compact cards */}
                  {gridPractices.length > 0 && (
                    <View style={styles.gridCatalog}>
                      {gridPractices.map((practice, idx) => (
                        <Animated.View
                          key={practice.packageId}
                          entering={FadeInDown.delay(idx * 50).duration(200)}
                          layout={Layout.duration(200)}
                          style={styles.gridCardWrapper}
                        >
                          <CourseCardCompact
                            courseId={practice.packageId}
                            title={practice.name}
                            category={practice.streamName}
                            price={practice.price}
                            originalPrice={practice.originalPrice || undefined}
                            imageUrl={practice.thumbnailUrl}
                            primaryCtaText="View Papers"
                            onPress={() => handlePracticePress(practice.packageId)}
                            onExplorePress={() => handlePracticePress(practice.packageId)}
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
});
