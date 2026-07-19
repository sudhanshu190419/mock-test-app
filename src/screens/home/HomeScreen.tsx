/**
 * HomeScreen — MockPrep Home
 *
 * Premium landing screen for students and guests.
 * Incorporates a stationary absolute header with parallax-like offsets,
 * role-aware layout sections, and live Supabase RPC analytics.
 *
 * Sections:
 *   - Stream selector
 *   - Hero Banner
 *   - Overall performance, quick stats, latest result, upcoming tests,
 *     subject snapshot, chapter analytics, weak chapters, strong chapters (students only)
 *   - Trending courses (V5 premium)
 *   - PYQ Practice (V5 premium)
 *   - Popular exams
 *   - New Here CTA
 *
 * @module screens/home/HomeScreen
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolate, FadeInUp, withTiming } from 'react-native-reanimated';
import { useTabScrollContext } from '../../context/TabScrollContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectUser, selectSelectedStreamId } from '../../store/authSlice';
import { useHomeDashboard } from '../../hooks/home/useHome';
import { useTrendingCourses } from '../../hooks/home/useCourses';
import { useFeaturedPractice } from '../../hooks/practice/usePractice';
import { useEnrolledCourses } from '../../hooks/home/useEnrolledCourses';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { TrendingCourse } from '../../types/home';
import Icon from '../../components/home/Icons';
import SkeletonLoader from '../../components/SkeletonLoader';

import GreetingHeader from '../../components/home/GreetingHeader';
import NotificationBell from '../../components/notification/NotificationBell';

import SectionHeader from '../../components/home/SectionHeader';
import PopularExamCard from '../../components/home/PopularExamCard';
import CTASection from '../../components/home/CTASection';
import ConnectLiveClassBanner from '../../components/home/ConnectLiveClassBanner';
import ActiveCoursesCarousel from '../../components/home/ActiveCoursesCarousel';
import TrendingCoursesSectionV5 from '../../components/home/TrendingCoursesSectionV5';
import PyqPracticeSectionV5 from '../../components/home/PyqPracticeSectionV5';

// ─── Utilities ───────────────────────────────────────────────
import { getCourseProgress } from '../../utils/courseProgress';

import type { PopularExamItem, TrendingCourseItem, PyqItem as PyqItemType } from '../../components/home/types';
type PyqItem = PyqItemType;
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';

// --- Fallback Data ---

const POPULAR_EXAMS: PopularExamItem[] = [
  {
    key: 'neet',
    iconName: 'stethoscope',
    iconBg: '#E8F5E9',
    iconColor: '#22C55E',
    title: 'NEET',
    description: 'National Eligibility cum Entrance Test',
    accessibilityLabel: 'NEET exam mock tests',
  },
  {
    key: 'jee',
    iconName: 'atom',
    iconBg: '#E3F2FD',
    iconColor: '#3B82F6',
    title: 'JEE Main',
    description: 'Joint Entrance Examination',
    accessibilityLabel: 'JEE Main exam mock tests',
  },
  {
    key: 'class-12',
    iconName: 'graduation-cap',
    iconBg: '#FFF3E0',
    iconColor: '#F97316',
    title: 'Class 12',
    description: 'For Class 12 Students',
    accessibilityLabel: 'Class 12 mock tests',
  },
  {
    key: 'class-11',
    iconName: 'book',
    iconBg: '#EDE9FF',
    iconColor: '#7C3AED',
    title: 'Class 11',
    description: 'For Class 11 Students',
    accessibilityLabel: 'Class 11 mock tests',
  },
];

const PYQ_ITEMS: PyqItem[] = [
  {
    key: 'neet-pyq-bank',
    title: 'NEET Previous Year Question Bank',
    category: 'NEET',
    features: [
      { icon: 'calendar', text: '2015–2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '15 Previous Papers' },
    ],
    rating: 4.9,
    totalStudents: 31250,
    price: 299,
    originalPrice: 999,
    badgeLabel: '🔥 Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '📄',
  },
  {
    key: 'jee-pyq-pack',
    title: 'JEE PYQ + Mock Test Pack',
    category: 'JEE',
    features: [
      { icon: 'calendar', text: '2014–2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '20 Previous Papers' },
    ],
    rating: 4.8,
    totalStudents: 25480,
    price: 399,
    originalPrice: 1499,
    badgeLabel: '⭐ Student Favorite',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '📄',
  },
];

const FALLBACK_TRENDING_COURSES: TrendingCourseItem[] = [
  {
    key: 'neet-crash', title: 'NEET Ultimate Crash Course', category: 'NEET',
    description: 'Complete NEET syllabus coverage with live doubt sessions, mock tests, and expert faculty guidance.',
    instructor: 'Dr. Meera Iyer', rating: 4.9, totalStudents: 28340,
    price: 4999, originalPrice: 19999, isBestSeller: true,
    gradientColors: ['#1E1B4B', '#312E81', '#4C1D95'] as [string, string, ...string[]],
    illustration: '🔬',
  },
  {
    key: 'jee-main', title: 'JEE Main Complete Batch', category: 'JEE',
    description: 'Physics, Chemistry & Maths mastery with IITian faculty, weekly tests, and personalised feedback.',
    instructor: 'Prof. Arjun Nair', rating: 4.8, totalStudents: 21560,
    price: 5999, originalPrice: 24999, isBestSeller: true,
    gradientColors: ['#0F0C29', '#302B63', '#24243E'] as [string, string, ...string[]],
    illustration: '⚛️',
  },
  {
    key: 'class-12-boards', title: 'Class 12 Boards Mastery', category: 'CBSE',
    description: 'Score 95%+ in your Class 12 boards with chapter-wise videos, PYQs, and expert-curated revision notes.',
    instructor: 'Ms. Sunita Verma', rating: 4.7, totalStudents: 34780,
    price: 2999, originalPrice: 12999, isBestSeller: false,
    gradientColors: ['#0F2027', '#203A43', '#2C5364'] as [string, string, ...string[]],
    illustration: '📚',
  },
  {
    key: 'cuet-prep', title: 'CUET Complete Preparation', category: 'CUET',
    description: 'Crack DU, BHU, JNU & other central universities with our comprehensive CUET UG program.',
    instructor: 'Dr. Rohan Desai', rating: 4.6, totalStudents: 18320,
    price: 3499, originalPrice: 14999, isBestSeller: true,
    gradientColors: ['#1A0A3E', '#2D1B69', '#44107A'] as [string, string, ...string[]],
    illustration: '🎯',
  },
  {
    key: 'upsc-foundation', title: 'UPSC Foundation Program', category: 'UPSC',
    description: 'Comprehensive UPSC CSE foundation course with GS, CSAT, optional subjects, and interview prep.',
    instructor: 'Mr. Vikram Joshi', rating: 4.8, totalStudents: 12560,
    price: 8999, originalPrice: 34999, isBestSeller: false,
    gradientColors: ['#0B0C10', '#1F2833', '#2B2D42'] as [string, string, ...string[]],
    illustration: '🏛️',
  },
  {
    key: 'ssc-cgl', title: 'SSC CGL Complete Course', category: 'SSC',
    description: 'Master Quantitative Aptitude, Reasoning, English & GK for SSC CGL Tier I & II exams.',
    instructor: 'Mr. Pradeep Singh', rating: 4.5, totalStudents: 22450,
    price: 1999, originalPrice: 8999, isBestSeller: false,
    gradientColors: ['#1B1B2F', '#162447', '#1F4068'] as [string, string, ...string[]],
    illustration: '📊',
  },
  {
    key: 'banking-po', title: 'Banking PO Master Batch', category: 'Banking',
    description: 'Complete preparation for IBPS PO, SBI PO & Clerk with sectional tests and interview support.',
    instructor: 'Ms. Kavita Sharma', rating: 4.6, totalStudents: 16780,
    price: 2499, originalPrice: 9999, isBestSeller: true,
    gradientColors: ['#1E0A3C', '#2D1B69', '#4A1F7A'] as [string, string, ...string[]],
    illustration: '🏦',
  },
  {
    key: 'cat-2027', title: 'CAT 2027 Preparation', category: 'MBA',
    description: 'Crack IIMs with VARC, DILR & QA mastery, 50+ mock tests, and personalised mentorship.',
    instructor: 'Prof. Ananya Gupta', rating: 4.7, totalStudents: 9870,
    price: 6999, originalPrice: 27999, isBestSeller: false,
    gradientColors: ['#0D0D1A', '#1A1A3E', '#2A0845'] as [string, string, ...string[]],
    illustration: '🎓',
  },
];

const COURSE_GRADIENTS: [string, string, ...string[]][] = [
  ['#1E1B4B', '#312E81', '#4C1D95'],
  ['#0F0C29', '#302B63', '#24243E'],
  ['#0F2027', '#203A43', '#2C5364'],
  ['#1A0A3E', '#2D1B69', '#44107A'],
  ['#0B0C10', '#1F2833', '#2B2D42'],
  ['#1B1B2F', '#162447', '#1F4068'],
  ['#1E0A3C', '#2D1B69', '#4A1F7A'],
  ['#0D0D1A', '#1A1A3E', '#2A0845'],
];

const COURSE_ILLUSTRATIONS: string[] = ['🔬', '⚛️', '📚', '🎯', '🏛️', '📊', '🏦', '🎓'];

const DEFAULT_PYQ_GRADIENTS: [string, string, ...string[]][] = [
  ['#155215', '#0C3D0C'],
  ['#1E3A5F', '#15294A'],
  ['#4A1942', '#2E0F2A'],
  ['#1A4A4A', '#0D2F2F'],
  ['#3D2B1F', '#2A1D14'],
  ['#2B1B4A', '#1A0F30'],
];

const DEFAULT_PYQ_ILLUSTRATIONS = ['📄', '📚', '📝', '📋', '📖', '📑'];

function mapTrendingCourseToItem(
  course: TrendingCourse,
  index: number,
): TrendingCourseItem {
  const gIndex = index % COURSE_GRADIENTS.length;
  return {
    key: course.courseId,
    title: course.title,
    category: course.category,
    description: course.description,
    instructor: course.instructor,
    rating: course.rating,
    totalStudents: course.totalStudents,
    price: course.price,
    originalPrice: course.originalPrice ?? undefined,
    isBestSeller: course.isBestSeller,
    gradientColors: COURSE_GRADIENTS[gIndex],
    illustration: COURSE_ILLUSTRATIONS[gIndex],
  };
}

// --- Section IDs ---

type SectionId =
  | 'greeting'
  | 'hero'
  | 'trending-courses'
  | 'pyq-practice'
  | 'popular-exams'
  | 'cta';

interface Section {
  id: SectionId;
}

const SECTIONS: Section[] = [
  { id: 'greeting' },

  { id: 'trending-courses' },
  { id: 'pyq-practice' },
  { id: 'popular-exams' },
  { id: 'cta' },
];

const USER_SECTIONS: Section[] = [
  { id: 'greeting' },

  { id: 'trending-courses' },
  { id: 'pyq-practice' },
  { id: 'popular-exams' },
  { id: 'cta' },
];

// --- Screen ---

export default function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const selectedStreamId = useAppSelector(selectSelectedStreamId);

  // Measure dynamic heights of header components
  const [greetingHeight, setGreetingHeight] = useState(130);
  const [snapshotHeight, setSnapshotHeight] = useState(250);
  const [courseProgress, setCourseProgress] = useState(0);

  const handleGreetingLayout = useCallback((e: LayoutChangeEvent) => {
    setGreetingHeight(e.nativeEvent.layout.height);
  }, []);

  const handleSnapshotLayout = useCallback((e: LayoutChangeEvent) => {
    setSnapshotHeight(e.nativeEvent.layout.height);
  }, []);

  // Fetch active enrolled courses
  const { data: enrolledCourses } = useEnrolledCourses(user?.id);
  const activeCourse = enrolledCourses && enrolledCourses.length > 0 ? enrolledCourses[0] : null;
  const hasActiveCourse = !!activeCourse;

  // Calculate course progress dynamically
  useEffect(() => {
    if (user?.id && activeCourse?.courseId) {
      getCourseProgress(user.id, activeCourse.courseId)
        .then((progress) => setCourseProgress(progress))
        .catch(() => setCourseProgress(0));
    }
  }, [user?.id, activeCourse?.courseId]);

  // Reanimated scroll tracking
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const scrollContext = useTabScrollContext();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;

      if (scrollContext?.tabBarTranslateY) {
        if (currentY <= 0) {
          scrollContext.tabBarTranslateY.value = withTiming(0, { duration: 200 });
        } else if (diff > 5 && currentY > 50) {
          // Scrolling down -> hide tab bar (move it out of view)
          scrollContext.tabBarTranslateY.value = withTiming(120, { duration: 250 });
        } else if (diff < -5) {
          // Scrolling up -> show tab bar
          scrollContext.tabBarTranslateY.value = withTiming(0, { duration: 250 });
        }
      }

      lastScrollY.value = currentY;
      scrollY.value = currentY;
    },
  });



  const snapshotAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [20, 90], [1, 0], 'clamp');
    const scale = interpolate(scrollY.value, [0, 100], [1, 0.95], 'clamp');
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const expandedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 60], [1, 0], 'clamp');
    return {
      opacity,
    };
  });

  const compactHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [40, 90], [0, 1], 'clamp');
    const translateY = interpolate(scrollY.value, [40, 90], [10, 0], 'clamp');
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // ── Greeting: live authenticated user data ────────────────────────────
  const {
    data: dashboard,
    error: dashboardError,
  } = useHomeDashboard(user?.id);

  if (dashboardError) {
    console.warn('[HomeScreen] Dashboard fetch failed:', dashboardError);
  }

  const greetingUserName = dashboard?.userName ?? user?.name ?? 'Learner';
  const greetingAvatarUrl = dashboard?.avatarUrl ?? user?.avatarUrl ?? null;
  const greetingUnreadCount = dashboard?.unreadCount ?? 0;
  const hasUnreadNotifications = greetingUnreadCount > 0;

  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleExplorePress = useCallback(() => {
    (navigation as any).navigate('MainTabs', { screen: 'Courses' });
  }, [navigation]);
  const handleNotificationPress = useCallback(() => {
    navigation.navigate('Notification');
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    (navigation as any).navigate('MainTabs', { screen: 'Profile' });
  }, [navigation]);
  const handleActionPress = useCallback((key: string) => {
    if (key === 'mock-tests') {
      navigation.navigate('TestDashboard');
    } else {
      (navigation as any).navigate('MainTabs', { screen: 'MockTests' });
    }
  }, [navigation]);
  const handleExamPress = useCallback((_key: string) => {
    (navigation as any).navigate('MainTabs', { screen: 'Courses' });
  }, [navigation]);
  const handleStartFreeTest = useCallback(() => {
    navigation.navigate('TestDashboard');
  }, [navigation]);
  const handleViewAllExams = useCallback(() => {
    (navigation as any).navigate('MainTabs', { screen: 'Courses' });
  }, [navigation]);
  const handleViewAllTrending = useCallback(() => {
    navigation.navigate('MyStreamCourses');
  }, [navigation]);
  const handleCoursePress = useCallback(
    (courseId: string) => {
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation],
  );
  const handleHeroExplorePress = useCallback(
    (courseId: string) => {
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation],
  );
  const handleHeroEnrollPress = useCallback(
    (courseId: string) => {
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation],
  );
  const handleExploreGlobalPress = useCallback(() => {
    (navigation as any).navigate('MainTabs', { screen: 'Courses' });
  }, [navigation]);

  const handleCalendarPress = useCallback(() => {
    navigation.navigate('Calendar');
  }, [navigation]);

  // ── Dashboard Navigation ────────────────────────────────────
  const handleViewLatestResult = useCallback(() => {
    navigation.navigate('MyResults');
  }, [navigation]);
  const handleViewAllResults = useCallback(() => {
    navigation.navigate('MyResults');
  }, [navigation]);
  const handleViewAllUpcoming = useCallback(() => {
    navigation.navigate('Calendar');
  }, [navigation]);
  const handleUpcomingTestPress = useCallback((_testName: string) => {
    navigation.navigate('TestDashboard');
  }, [navigation]);
  const handleViewDetailedAnalysis = useCallback(() => {
    navigation.navigate('DetailedAnalytics');
  }, [navigation]);

  // ── PYQ Navigation ────────────────────────────────────
  const handleCourseTestsPress = useCallback(() => {
    navigation.getParent()?.navigate('MockTests');
  }, [navigation]);

  const handleViewAllPyq = useCallback(() => {
    navigation.getParent()?.navigate('MockTests');
  }, [navigation]);

  const handlePyqItemPress = useCallback(
    (packageId: string) => {
      navigation.navigate('ExamPackDetail', { packageId });
    },
    [navigation],
  );

  const handlePyqPreviewPress = useCallback(
    (packageId: string) => {
      navigation.navigate('ExamPackDetail', { packageId });
    },
    [navigation],
  );

  const handlePyqStartPracticePress = useCallback(
    (packageId: string) => {
      navigation.navigate('ExamPackDetail', { packageId });
    },
    [navigation],
  );

  // ── Role-aware section and action selection ────────────────────────────
  const userRole = user?.role;
  const isUser = userRole === 'user';
  const activeSections = useMemo(() => (isUser ? USER_SECTIONS : SECTIONS), [isUser]);
  const popularExams = useMemo(() => POPULAR_EXAMS, []);

  // ── Trending Courses: live backend data ────────────────────────────────
  const {
    data: trendingData,
    error: trendingError,
  } = useTrendingCourses({ page: 1, pageSize: 8 }, selectedStreamId);

  if (trendingError) {
    console.warn('[HomeScreen] Trending courses fetch failed:', trendingError);
  }

  const trendingCourses = useMemo<TrendingCourseItem[]>(
    () => {
      const backendData = trendingData?.data;
      if (backendData && backendData.length > 0) {
        return backendData.map((course, index) =>
          mapTrendingCourseToItem(course, index),
        );
      }
      return FALLBACK_TRENDING_COURSES;
    },
    [trendingData],
  );

  // ── Assessment / Analytics hooks have been moved to ProfileTabScreen & DetailedAnalyticsScreen ──

  const {
    data: featuredPracticeData,
    error: featuredError,
  } = useFeaturedPractice(6, selectedStreamId);

  if (featuredError) {
    console.warn('[HomeScreen] Featured practice fetch failed:', featuredError);
  }

  const pyqItems = useMemo<PyqItem[]>(() => {
    const backendData = featuredPracticeData?.data;
    if (backendData && backendData.length > 0) {
      return backendData.map((pkg, index) => {
        const gIndex = index % DEFAULT_PYQ_GRADIENTS.length;
        const discountPercent =
          pkg.originalPrice && pkg.originalPrice > pkg.price
            ? Math.round((1 - pkg.price / pkg.originalPrice) * 100)
            : 0;

        return {
          key: pkg.packageId,
          title: pkg.name,
          category: pkg.streamName,
          features: [
            { icon: 'calendar', text: `${pkg.yearFrom || ''}–${pkg.yearTo || ''} Coverage` },
            { icon: 'timer', text: 'Timed Test Mode' },
            { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
            { icon: 'trophy', text: `${pkg.totalPapers} Previous Papers` },
          ],
          rating: pkg.rating || 4.5,
          totalStudents: 0,
          price: pkg.price,
          originalPrice: pkg.originalPrice ?? undefined,
          badgeLabel: discountPercent > 0 ? `${discountPercent}% OFF` : pkg.badgeLabel ?? '⭐ Featured',
          gradientColors: DEFAULT_PYQ_GRADIENTS[gIndex],
          illustration: DEFAULT_PYQ_ILLUSTRATIONS[gIndex],
        };
      });
    }

    return PYQ_ITEMS;
  }, [featuredPracticeData]);

  const handleContinuePress = useCallback(() => {
    const courseId = activeCourse?.courseId ?? trendingCourses[0]?.key;
    if (courseId) {
      handleCoursePress(courseId);
    } else {
      handleExplorePress();
    }
  }, [activeCourse, trendingCourses, handleCoursePress, handleExplorePress]);

  const renderSection = useCallback(
    ({ item }: { item: Section }) => {
      switch (item.id) {
        case 'trending-courses':
          if (trendingData?.data && trendingData.data.length === 0) {
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Trending Courses" />
                <View style={[styles.emptyCard, shadows.small]}>
                  <Text style={styles.emptyEmoji}>🚀</Text>
                  <Text style={styles.emptyCardTitle}>Coming Soon</Text>
                  <Text style={styles.emptyCardText}>
                    We are currently designing courses tailored specifically for your target exam.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyCardButton}
                    onPress={handleExploreGlobalPress}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyCardButtonText}>Explore Other Courses</Text>
                    <Icon name="arrow-right" color={colors.text.inverse} width={14} height={14} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <TrendingCoursesSectionV5
              courses={trendingCourses}
              onViewAllPress={handleViewAllTrending}
              onCoursePress={handleCoursePress}
              onHeroExplorePress={handleHeroExplorePress}
              onHeroEnrollPress={handleHeroEnrollPress}
            />
          );

        case 'pyq-practice':
          return (
            <PyqPracticeSectionV5
              items={pyqItems}
              onViewAllPress={handleViewAllPyq}
              onItemPress={handlePyqItemPress}
              onPreviewPress={handlePyqPreviewPress}
              onStartPracticePress={handlePyqStartPracticePress}
            />
          );

        case 'popular-exams':
          return (
            <View style={styles.sectionWrapper}>
              <SectionHeader
                title="Popular Exams"
                actionLabel="View All"
                onActionPress={handleViewAllExams}
              />
              <View style={styles.grid}>
                {popularExams.map((exam, index) => {
                  const { key, ...examProps } = exam;
                  return (
                    <Animated.View 
                      key={key} 
                      style={styles.gridHalf}
                      entering={FadeInUp.delay(index * 100).duration(200)}
                    >
                      <PopularExamCard
                         {...examProps}
                        onPress={() => handleExamPress(key)}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          );

        case 'cta':
          return (
            <View style={styles.ctaWrapper}>
              <CTASection onStartFreeTest={handleStartFreeTest} />
            </View>
          );

        default:
          return null;
      }
    },
    [
      popularExams, trendingCourses, pyqItems,
      handleExplorePress, handleExamPress, handleStartFreeTest, handleViewAllExams,
      handleViewAllTrending, handleCoursePress, handleHeroExplorePress, handleHeroEnrollPress,
      handleViewAllPyq, handlePyqItemPress, handlePyqPreviewPress, handlePyqStartPracticePress,
      handleExploreGlobalPress, trendingData,
    ],
  );

  const keyExtractor = useCallback((section: Section) => section.id, []);

  // Filter out sections that are rendered statically or are deactivated
  const listSections = useMemo(
    () => activeSections.filter((s) => s.id !== 'greeting'),
    [activeSections],
  );

  const renderHeader = useCallback(() => {
    const activeCourseTitle = trendingCourses[0]?.title ?? 'Complete Exam Masterclass';

    return (
      <View style={styles.headerContainer}>
        {/* We render the expanded greeting and course snapshot directly in the normal flow */}
        <Animated.View style={[styles.expandedHeaderContainer, expandedHeaderStyle]}>
          <View
            onLayout={handleGreetingLayout}
            style={[
              styles.skyHeaderTier,
              {
                paddingTop: insets.top + spacing[4],
                paddingBottom: hasActiveCourse ? spacing[12] : spacing[24],
              },
            ]}
          >
            <GreetingHeader
              userName={greetingUserName}
              onNotificationPress={handleNotificationPress}
              hasUnreadNotifications={hasUnreadNotifications}
              unreadCount={greetingUnreadCount}
            />

            <Animated.View
              onLayout={handleSnapshotLayout}
              style={[styles.headerHeroWrapper, snapshotAnimatedStyle]}
            >
              <ConnectLiveClassBanner />
              <ActiveCoursesCarousel courses={enrolledCourses || []} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    );
  }, [
    hasActiveCourse,
    greetingUserName,
    hasUnreadNotifications,
    greetingUnreadCount,
    courseProgress,
    trendingCourses,
    handleContinuePress,
    handleActionPress,
    handleCourseTestsPress,
    handleCalendarPress,
    handleSnapshotLayout,
    handleGreetingLayout,
    handleNotificationPress,
    insets.top,
    expandedHeaderStyle,
    snapshotAnimatedStyle,
  ]);

  const activeCourseTitle = activeCourse?.title ?? 'Complete Exam Masterclass';

  return (
    <View style={styles.screen}>
      {/* Absolute Stationary Header */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.absoluteHeader,
        ]}
      >
        {/* Compact Content: Fades in on scroll */}
        <Animated.View style={[styles.compactHeaderContainer, { paddingTop: insets.top }, compactHeaderStyle]}>
          <View style={styles.compactHeaderContent}>
            <View style={styles.compactPill}>
              <View style={styles.compactPillInfo}>
                <Text style={styles.compactGreetingText}>👋 Hey, {greetingUserName}</Text>
                {hasActiveCourse && (
                  <View style={styles.compactCourseRow}>
                    <Text style={styles.compactCourseTitle} numberOfLines={1}>
                      {activeCourseTitle}
                    </Text>
                    <View style={styles.compactProgressContainer}>
                      <View style={[styles.compactProgressFill, { width: `${courseProgress}%` }]} />
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.compactActions}>
                <NotificationBell
                  unreadCount={greetingUnreadCount}
                  onPress={handleNotificationPress}
                  color="#0F172A"
                  size={20}
                />
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.FlatList
        data={listSections}
        ListHeaderComponent={renderHeader}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing[8],
        }}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.sky?.sheet || '#F0F9FF',
  },
  headerContainer: {
    backgroundColor: colors.sky?.sheet || '#F0F9FF',
  },
  skyHeaderTier: {
    backgroundColor: colors.sky?.sheet || '#F0F9FF',
    paddingBottom: spacing[24],
  },
  headerHeroWrapper: {
    marginTop: spacing[8],
  },
  heroWrapper: {
    marginTop: spacing[8],
    marginBottom: spacing[12],
  },
  sectionWrapper: {
    paddingHorizontal: spacing[16],
    marginTop: spacing[20],
  },
  ctaWrapper: {
    marginTop: spacing[24],
    marginBottom: spacing[8],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
  },
  gridHalf: {
    width: '48%',
    flexGrow: 1,
  },
  selectorWrapper: {
    paddingVertical: spacing[8],
    backgroundColor: colors.background,
  },
  selectorScroll: {
    paddingHorizontal: spacing[16],
    gap: spacing[8],
  },
  selectorPill: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  selectorPillActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  selectorText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  selectorTextActive: {
    color: colors.text.inverse,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[24],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing[8],
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: spacing[8],
  },
  emptyCardTitle: {
    ...typography.title,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  emptyCardText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing[16],
    paddingHorizontal: spacing[12],
  },
  emptyCardButton: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.md,
    gap: spacing[4],
  },
  emptyCardButtonText: {
    ...typography.buttonSmall,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  expandedHeaderContainer: {
    width: '100%',
  },
  compactHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(240, 249, 255, 0.95)',
  },
  compactHeaderContent: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    paddingTop: spacing[8],
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    ...shadows.small,
    shadowColor: '#0284C7',
    shadowOpacity: 0.12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  compactPillInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
    marginRight: 12,
  },
  compactGreetingText: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 11,
  },
  compactCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactCourseTitle: {
    flex: 1,
    ...typography.subtitle,
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  compactProgressContainer: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    width: 40,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#00D09E',
    borderRadius: 2,
  },
  compactActions: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
