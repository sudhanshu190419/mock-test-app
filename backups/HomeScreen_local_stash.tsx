/**
 * HomeScreen ΓÇö MockPrep Home
 *
 * Production-ready landing screen for first-time users who have not
 * purchased any course, mock test, or subscription yet.
 *
 * Sections:
 *   1. GreetingHeader ΓÇö greeting, notification bell, profile avatar
 *   2. HeroBanner ΓÇö illustration with headline + CTA
 *   3. TrendingCoursesSection ΓÇö featured hero card + horizontal course list
 *   4. Quick Start ΓÇö 2├ù2 grid of action cards
 *   5. Why Choose Us ΓÇö 2├ù2 feature grid
 *   6. Popular Exams ΓÇö 2├ù2 exam cards
 *   7. New Here CTA ΓÇö premium golden call-to-action card
 *   8. BottomNav ΓÇö five-tab navigation bar
 *
 * Code Style:
 *   - Single-responsibility components imported from `components/home/`
 *   - All data defined here and passed down as props
 *   - Memoised callbacks to prevent unnecessary re-renders
 *   - FlatList-based scroll for performance on low-end devices
 *   - Theme tokens only ΓÇö no hardcoded colours / spacing
 *
 * @module screens/home/HomeScreen
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useAppSelector } from '../../store/hooks';
import { selectUser, selectSelectedStreamId } from '../../store/authSlice';
import { useHomeDashboard } from '../../hooks/home/useHome';
import { useTrendingCourses } from '../../hooks/home/useCourses';
import { useFeaturedPractice } from '../../hooks/practice/usePractice';
import { useEnrolledCourses } from '../../hooks/home/useEnrolledCourses';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { TrendingCourse } from '../../types/home';
import Icon from '../../components/home/Icons';

import GreetingHeader from '../../components/home/GreetingHeader';
import EnrolledCourseSnapshotCard from '../../components/home/EnrolledCourseSnapshotCard';
import SectionHeader from '../../components/home/SectionHeader';
import PopularExamCard from '../../components/home/PopularExamCard';
import CTASection from '../../components/home/CTASection';
import TrendingCoursesSectionV5 from '../../components/home/TrendingCoursesSectionV5';
import PyqPracticeSectionV5 from '../../components/home/PyqPracticeSectionV5';

import type { PopularExamItem, TrendingCourseItem, PyqItem as PyqItemType } from '../../components/home/types';
type PyqItem = PyqItemType;
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';

// --- Data ---

// Removed QUICK_ACTIONS and FEATURES constants

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

// --- PYQ (Previous Year Questions) Data (7 items for the auto-carousel) ---

const PYQ_ITEMS: PyqItem[] = [
  {
    key: 'neet-pyq-bank',
    title: 'NEET Previous Year Question Bank',
    category: 'NEET',
    features: [
      { icon: 'calendar', text: '2015ΓÇô2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '15 Previous Papers' },
    ],
    rating: 4.9,
    totalStudents: 31250,
    price: 299,
    originalPrice: 999,
    badgeLabel: '≡ƒöÑ Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '≡ƒôä',
  },
  {
    key: 'jee-pyq-pack',
    title: 'JEE PYQ + Mock Test Pack',
    category: 'JEE',
    features: [
      { icon: 'calendar', text: '2014ΓÇô2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '20 Previous Papers' },
    ],
    rating: 4.8,
    totalStudents: 25480,
    price: 399,
    originalPrice: 1499,
    badgeLabel: 'Γ¡É Student Favorite',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '≡ƒôä',
  },
  {
    key: 'class12-pyq',
    title: 'Class 12 Board PYQ Papers',
    category: 'Class 12',
    features: [
      { icon: 'calendar', text: '2015ΓÇô2024 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '10 Previous Papers' },
    ],
    rating: 4.7,
    totalStudents: 38920,
    price: 199,
    originalPrice: 699,
    badgeLabel: '≡ƒöÑ Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '≡ƒôä',
  },
  {
    key: 'upsc-pyq',
    title: 'UPSC Prelims PYQ Compilation',
    category: 'UPSC',
    features: [
      { icon: 'calendar', text: '2000ΓÇô2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '25 Previous Papers' },
    ],
    rating: 4.8,
    totalStudents: 18960,
    price: 599,
    originalPrice: 2499,
    badgeLabel: 'Γ¡É Student Favorite',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '≡ƒôä',
  },
  {
    key: 'cuet-pyq',
    title: 'CUET UG PYQ Question Bank',
    category: 'CUET',
    features: [
      { icon: 'calendar', text: '2020ΓÇô2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '12 Previous Papers' },
    ],
    rating: 4.6,
    totalStudents: 15830,
    price: 249,
    originalPrice: 899,
    badgeLabel: '≡ƒöÑ Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '≡ƒôä',
  },
  {
    key: 'ssc-pyq',
    title: 'SSC CGL Previous Year Papers',
    category: 'SSC',
    features: [
      { icon: 'calendar', text: '2010ΓÇô2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '18 Previous Papers' },
    ],
    rating: 4.5,
    totalStudents: 21340,
    price: 349,
    originalPrice: 1299,
    badgeLabel: 'Γ¡É Student Favorite',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '≡ƒôä',
  },
  {
    key: 'neet-again-pyq',
    title: 'NEET UG Previous Year Papers',
    category: 'NEET',
    features: [
      { icon: 'calendar', text: '2015ΓÇô2024 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '10 Previous Papers' },
    ],
    rating: 4.9,
    totalStudents: 27890,
    price: 249,
    originalPrice: 849,
    badgeLabel: '≡ƒöÑ Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '≡ƒôä',
  },
];

// ΓöÇΓöÇΓöÇ Fallback Trending Courses Data (used when backend has no content rows) ΓöÇΓöÇ

/**
 * Static fallback courses displayed when the backend query returns empty.
 * These match the original hardcoded data and ensure the carousel always
 * has cards to display. Replaced by live data once `useTrendingCourses`
 * successfully fetches results.
 */
const FALLBACK_TRENDING_COURSES: TrendingCourseItem[] = [
  {
    key: 'neet-crash', title: 'NEET Ultimate Crash Course', category: 'NEET',
    description: 'Complete NEET syllabus coverage with live doubt sessions, mock tests, and expert faculty guidance.',
    instructor: 'Dr. Meera Iyer', rating: 4.9, totalStudents: 28340,
    price: 4999, originalPrice: 19999, isBestSeller: true,
    gradientColors: ['#1E1B4B', '#312E81', '#4C1D95'] as [string, string, ...string[]],
    illustration: '≡ƒö¼',
  },
  {
    key: 'jee-main', title: 'JEE Main Complete Batch', category: 'JEE',
    description: 'Physics, Chemistry & Maths mastery with IITian faculty, weekly tests, and personalised feedback.',
    instructor: 'Prof. Arjun Nair', rating: 4.8, totalStudents: 21560,
    price: 5999, originalPrice: 24999, isBestSeller: true,
    gradientColors: ['#0F0C29', '#302B63', '#24243E'] as [string, string, ...string[]],
    illustration: 'ΓÜ¢∩╕Å',
  },
  {
    key: 'class-12-boards', title: 'Class 12 Boards Mastery', category: 'CBSE',
    description: 'Score 95%+ in your Class 12 boards with chapter-wise videos, PYQs, and expert-curated revision notes.',
    instructor: 'Ms. Sunita Verma', rating: 4.7, totalStudents: 34780,
    price: 2999, originalPrice: 12999, isBestSeller: false,
    gradientColors: ['#0F2027', '#203A43', '#2C5364'] as [string, string, ...string[]],
    illustration: '≡ƒôÜ',
  },
  {
    key: 'cuet-prep', title: 'CUET Complete Preparation', category: 'CUET',
    description: 'Crack DU, BHU, JNU & other central universities with our comprehensive CUET UG program.',
    instructor: 'Dr. Rohan Desai', rating: 4.6, totalStudents: 18320,
    price: 3499, originalPrice: 14999, isBestSeller: true,
    gradientColors: ['#1A0A3E', '#2D1B69', '#44107A'] as [string, string, ...string[]],
    illustration: '≡ƒÄ»',
  },
  {
    key: 'upsc-foundation', title: 'UPSC Foundation Program', category: 'UPSC',
    description: 'Comprehensive UPSC CSE foundation course with GS, CSAT, optional subjects, and interview prep.',
    instructor: 'Mr. Vikram Joshi', rating: 4.8, totalStudents: 12560,
    price: 8999, originalPrice: 34999, isBestSeller: false,
    gradientColors: ['#0B0C10', '#1F2833', '#2B2D42'] as [string, string, ...string[]],
    illustration: '≡ƒÅ¢∩╕Å',
  },
  {
    key: 'ssc-cgl', title: 'SSC CGL Complete Course', category: 'SSC',
    description: 'Master Quantitative Aptitude, Reasoning, English & GK for SSC CGL Tier I & II exams.',
    instructor: 'Mr. Pradeep Singh', rating: 4.5, totalStudents: 22450,
    price: 1999, originalPrice: 8999, isBestSeller: false,
    gradientColors: ['#1B1B2F', '#162447', '#1F4068'] as [string, string, ...string[]],
    illustration: '≡ƒôè',
  },
  {
    key: 'banking-po', title: 'Banking PO Master Batch', category: 'Banking',
    description: 'Complete preparation for IBPS PO, SBI PO & Clerk with sectional tests and interview support.',
    instructor: 'Ms. Kavita Sharma', rating: 4.6, totalStudents: 16780,
    price: 2499, originalPrice: 9999, isBestSeller: true,
    gradientColors: ['#1E0A3C', '#2D1B69', '#4A1F7A'] as [string, string, ...string[]],
    illustration: '≡ƒÅª',
  },
  {
    key: 'cat-2027', title: 'CAT 2027 Preparation', category: 'MBA',
    description: 'Crack IIMs with VARC, DILR & QA mastery, 50+ mock tests, and personalised mentorship.',
    instructor: 'Prof. Ananya Gupta', rating: 4.7, totalStudents: 9870,
    price: 6999, originalPrice: 27999, isBestSeller: false,
    gradientColors: ['#0D0D1A', '#1A1A3E', '#2A0845'] as [string, string, ...string[]],
    illustration: '≡ƒÄô',
  },
];

// ΓöÇΓöÇΓöÇ Constants for Trending Course UI (gradients + illustration defaults) ΓöÇΓöÇ

/** Predefined gradient palettes for course cards (cycled by index). */
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

/** Default illustration emojis for course cards (cycled by index). */
const COURSE_ILLUSTRATIONS: string[] = ['≡ƒö¼', 'ΓÜ¢∩╕Å', '≡ƒôÜ', '≡ƒÄ»', '≡ƒÅ¢∩╕Å', '≡ƒôè', '≡ƒÅª', '≡ƒÄô'];

/**
 * Map a backend `TrendingCourse` to the UI-facing `TrendingCourseItem`.
 * Fields not available from the backend (gradientColors, illustration) are
 * populated with predefined defaults cycled by index.
 */
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
  | 'trending-courses'
  | 'pyq-practice'
  | 'popular-exams'
  | 'cta';

interface Section {
  id: SectionId;
}

const SECTIONS: Section[] = [
  { id: 'trending-courses' },
  { id: 'pyq-practice' },
  { id: 'popular-exams' },
  { id: 'cta' },
];

// --- Screen ---

export default function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);
  const selectedStreamId = useAppSelector(selectSelectedStreamId);

  // Measure dynamic heights of header components
  const [greetingHeight, setGreetingHeight] = useState(130);
  const [snapshotHeight, setSnapshotHeight] = useState(250);

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

  // Reanimated scroll tracking
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: 0 }],
    };
  });

  // ΓöÇΓöÇ Greeting: live authenticated user data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const {
    data: dashboard,
    error: dashboardError,
  } = useHomeDashboard(user?.id);

  // Log dashboard errors silently ΓÇö the UI falls back to defaults.
  if (dashboardError) {
    console.warn('[HomeScreen] Dashboard fetch failed:', dashboardError);
  }

  // Derive GreetingHeader props: use live data when available,
  // fall back gracefully to defaults during loading or error.
  const greetingUserName = dashboard?.userName ?? user?.name ?? 'Learner';
  const greetingAvatarUrl = dashboard?.avatarUrl ?? user?.avatarUrl ?? null;
  const greetingUnreadCount = dashboard?.unreadCount ?? 0;
  const hasUnreadNotifications = greetingUnreadCount > 0;

  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleExplorePress = useCallback(() => {}, []);
  const handleNotificationPress = useCallback(() => {
    navigation.navigate('Notification');
  }, [navigation]);
  const handleProfilePress = useCallback(() => {}, []);
  const handleActionPress = useCallback((_key: string) => {}, []);
  const handleExamPress = useCallback((_key: string) => {}, []);
  const handleStartFreeTest = useCallback(() => {}, []);
  const handleViewAllExams = useCallback(() => {}, []);
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

  // ΓöÇΓöÇ PYQ Navigation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handleCourseTestsPress = useCallback(() => {
    navigation.getParent()?.navigate('MockTests');
  }, [navigation]);

  const handleViewAllPyq = useCallback(() => {
    // Navigate to the Practice (MockTests) tab
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

  const popularExams = useMemo(() => POPULAR_EXAMS, []);
  // ΓöÇΓöÇ Trending Courses: live backend data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const {
    data: trendingData,
    error: trendingError,
  } = useTrendingCourses({ page: 1, pageSize: 8 }, selectedStreamId);

  // Log trending errors silently ΓÇö the UI falls back gracefully.
  if (trendingError) {
    console.warn('[HomeScreen] Trending courses fetch failed:', trendingError);
  }

  // Map backend TrendingCourse[] ΓåÆ UI TrendingCourseItem[].
  // Falls back to static placeholder data when the backend has no results
  // (database is empty or no content with status='approved' exists yet).
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

  // ΓöÇΓöÇ PYQ Practice: live backend data via useFeaturedPractice ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const DEFAULT_PYQ_GRADIENTS: [string, string, ...string[]][] = [
    ['#155215', '#0C3D0C'],
    ['#1E3A5F', '#15294A'],
    ['#4A1942', '#2E0F2A'],
    ['#1A4A4A', '#0D2F2F'],
    ['#3D2B1F', '#2A1D14'],
    ['#2B1B4A', '#1A0F30'],
  ];

  const DEFAULT_PYQ_ILLUSTRATIONS = ['≡ƒôä', '≡ƒôÜ', '≡ƒô¥', '≡ƒôï', '≡ƒôû', '≡ƒôæ'];

  const {
    data: featuredPracticeData,
    isLoading: featuredLoading,
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
            { icon: 'calendar', text: `${pkg.yearFrom || ''}ΓÇô${pkg.yearTo || ''} Coverage` },
            { icon: 'timer', text: 'Timed Test Mode' },
            { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
            { icon: 'trophy', text: `${pkg.totalPapers} Previous Papers` },
          ],
          rating: pkg.rating || 4.5,
          totalStudents: 0,
          price: pkg.price,
          originalPrice: pkg.originalPrice ?? undefined,
          badgeLabel: discountPercent > 0 ? `${discountPercent}% OFF` : pkg.badgeLabel ?? 'Γ¡É Featured',
          gradientColors: DEFAULT_PYQ_GRADIENTS[gIndex],
          illustration: DEFAULT_PYQ_ILLUSTRATIONS[gIndex],
        };
      });
    }

    // Fallback: static PYQ items when backend is empty
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
                  <Text style={styles.emptyEmoji}>≡ƒÜÇ</Text>
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

        // Removed quick-start and why-choose sections

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
                    <View key={key} style={styles.gridHalf}>
                      <PopularExamCard
                        {...examProps}
                        onPress={() => handleExamPress(key)}
                      />
                    </View>
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
      handleActionPress, handleExamPress, handleStartFreeTest,
      handleViewAllTrending, handleCoursePress, handleHeroExplorePress, handleHeroEnrollPress,
      handleViewAllPyq, handlePyqItemPress, handlePyqPreviewPress, handlePyqStartPracticePress,
    ],
  );

  const renderHeader = useCallback(() => {
    const activeCourseTitle = trendingCourses[0]?.title ?? 'Complete Exam Masterclass';
    const totalSpacerHeight = hasActiveCourse
      ? (greetingHeight + snapshotHeight)
      : greetingHeight;

    return (
      <View style={styles.headerContainer}>
        {/* Transparent Spacer to offset the stationary header */}
        <View style={{ height: totalSpacerHeight }} />

        {/* If user does NOT have an active enrolled course, the details card scrolls */}
        {!hasActiveCourse && (
          <View style={styles.mintHeaderTier}>
            <View
              onLayout={handleSnapshotLayout}
              style={styles.headerHeroWrapper}
            >
              <EnrolledCourseSnapshotCard
                courseTitle={activeCourseTitle}
                progressPercentage={68}
                nextLectureTitle="Quant: Percentage & Ratio Tricks"
                remainingLectures={14}
                onContinuePress={handleContinuePress}
                liveClassTitle="Live Strategy & PYQ Marathon"
                liveClassInstructor="Dr. Sudhanshu Sharma"
                liveClassStartTime="Today, 6:00 PM"
                isLiveNow={true}
                onJoinLivePress={() => {
                  handleActionPress('mock-tests');
                }}
                onCourseTestsPress={handleCourseTestsPress}
                onCalendarPress={handleCalendarPress}
              />
            </View>
          </View>
        )}

        {/* Curved transition to white sheet content */}
        {!hasActiveCourse && <View style={styles.sheetCurveHeader} />}
      </View>
    );
  }, [
    hasActiveCourse,
    greetingHeight,
    snapshotHeight,
    trendingCourses,
    handleContinuePress,
    handleActionPress,
    handleCourseTestsPress,
    handleCalendarPress,
    handleSnapshotLayout,
  ]);

  const keyExtractor = useCallback((section: Section) => section.id, []);

  const activeCourseTitle = activeCourse?.title ?? 'Complete Exam Masterclass';

  return (
    <View style={styles.screen}>
      {/* Absolute Stationary Header */}
      <Animated.View
        style={[
          styles.absoluteHeader,
          headerAnimatedStyle,
        ]}
      >
        <View
          onLayout={handleGreetingLayout}
          style={[
            styles.mintHeaderTier,
            {
              paddingTop: insets.top + spacing[4],
              paddingBottom: hasActiveCourse ? spacing[12] : spacing[24],
            },
          ]}
        >
          <GreetingHeader
            userName={greetingUserName}
            avatarUrl={greetingAvatarUrl}
            onNotificationPress={handleNotificationPress}
            onProfilePress={handleProfilePress}
            hasUnreadNotifications={hasUnreadNotifications}
            unreadCount={greetingUnreadCount}
          />

          {hasActiveCourse && (
            <View
              onLayout={handleSnapshotLayout}
              style={styles.headerHeroWrapper}
            >
              <EnrolledCourseSnapshotCard
                courseTitle={activeCourseTitle}
                progressPercentage={68}
                nextLectureTitle="Quant: Percentage & Ratio Tricks"
                remainingLectures={14}
                onContinuePress={handleContinuePress}
                liveClassTitle="Live Strategy & PYQ Marathon"
                liveClassInstructor="Dr. Sudhanshu Sharma"
                liveClassStartTime="Today, 6:00 PM"
                isLiveNow={true}
                onJoinLivePress={() => {
                  handleActionPress('mock-tests');
                }}
                onCourseTestsPress={handleCourseTestsPress}
                onCalendarPress={handleCalendarPress}
              />
            </View>
          )}
        </View>
        {hasActiveCourse && <View style={styles.sheetCurveHeader} />}
      </Animated.View>

      <Animated.FlatList
        data={SECTIONS}
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
    backgroundColor: colors.mint?.sheet || '#F1FFF3',
  },
  headerContainer: {
    backgroundColor: colors.mint?.sheet || '#F1FFF3',
  },
  mintHeaderTier: {
    backgroundColor: colors.mint?.primary || '#00D09E',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[40],
  },
  headerHeroWrapper: {
    marginTop: spacing[16],
  },
  sheetCurveHeader: {
    height: 32,
    backgroundColor: colors.mint?.sheet || '#F1FFF3',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
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
});
