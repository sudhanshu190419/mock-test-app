/**
 * HomeScreen — MockPrep Home
 *
 * Production-ready landing screen for first-time users who have not
 * purchased any course, mock test, or subscription yet.
 *
 * Sections:
 *   1. GreetingHeader — greeting, notification bell, profile avatar
 *   2. HeroBanner — illustration with headline + CTA
 *   3. TrendingCoursesSection — featured hero card + horizontal course list
 *   4. Quick Start — 2×2 grid of action cards
 *   5. Why Choose Us — 2×2 feature grid
 *   6. Popular Exams — 2×2 exam cards
 *   7. New Here CTA — premium golden call-to-action card
 *   8. BottomNav — five-tab navigation bar
 *
 * Code Style:
 *   - Single-responsibility components imported from `components/home/`
 *   - All data defined here and passed down as props
 *   - Memoised callbacks to prevent unnecessary re-renders
 *   - FlatList-based scroll for performance on low-end devices
 *   - Theme tokens only — no hardcoded colours / spacing
 *
 * @module screens/home/HomeScreen
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import { useHomeDashboard } from '../../hooks/home/useHome';
import { useTrendingCourses } from '../../hooks/home/useCourses';
import { useFeaturedPractice } from '../../hooks/practice/usePractice';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { TrendingCourse } from '../../types/home';

import GreetingHeader from '../../components/home/GreetingHeader';
import HeroBanner from '../../components/home/HeroBanner';
import QuickActionCard from '../../components/home/QuickActionCard';
import SectionHeader from '../../components/home/SectionHeader';
import FeatureCard from '../../components/home/FeatureCard';
import PopularExamCard from '../../components/home/PopularExamCard';
import CTASection from '../../components/home/CTASection';
import TrendingCoursesSection from '../../components/home/TrendingCoursesSection';
import PyqPracticeSection from '../../components/home/PyqPracticeSection';
// ─── Dashboard Components ────────────────────────────────────
import OverallPerformanceCard from '../../components/dashboard/OverallPerformanceCard';
import QuickStatsCards from '../../components/dashboard/QuickStatsCards';
import type { QuickStatItem } from '../../components/dashboard/QuickStatsCards';
import ContinuePracticeCard from '../../components/dashboard/ContinuePracticeCard';
import LatestResultCard from '../../components/dashboard/LatestResultCard';
import UpcomingTestsCard from '../../components/dashboard/UpcomingTestsCard';
import type { UpcomingTestItem } from '../../components/dashboard/UpcomingTestsCard';
import PerformanceSnapshotCard from '../../components/dashboard/PerformanceSnapshotCard';
import type { SubjectPerformance } from '../../components/dashboard/PerformanceSnapshotCard';

import type { QuickActionItem, FeatureItem, PopularExamItem, TrendingCourseItem, PyqItem as PyqItemType } from '../../components/home/types';
type PyqItem = PyqItemType;
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

// --- Data ---

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    key: 'mock-test',
    iconName: 'clipboard-list',
    iconBg: '#E8F5E9',
    iconColor: '#22C55E',
    title: 'Take a Mock Test',
    subtitle: 'Assess your preparation',
    accessibilityLabel: 'Take a Mock Test',
  },
  {
    key: 'courses',
    iconName: 'book-open',
    iconBg: '#E3F2FD',
    iconColor: '#3B82F6',
    title: 'Explore Courses',
    subtitle: 'Find the right course for you',
    accessibilityLabel: 'Explore Courses',
  },
  {
    key: 'live-classes',
    iconName: 'play-circle',
    iconBg: '#FFF3E0',
    iconColor: '#F97316',
    title: 'Join Live Classes',
    subtitle: 'Learn from expert teachers',
    accessibilityLabel: 'Join Live Classes',
  },
  {
    key: 'plans',
    iconName: 'bar-chart-2',
    iconBg: '#EDE9FF',
    iconColor: '#7C3AED',
    title: 'View Plans',
    subtitle: 'Choose the best plan for you',
    accessibilityLabel: 'View Plans',
  },
];

const FEATURES: FeatureItem[] = [
  {
    key: 'quality',
    iconName: 'badge-check',
    iconBg: '#E3F2FD',
    iconColor: '#3B82F6',
    title: 'High Quality Tests',
    description: 'Exam pattern based mock tests',
  },
  {
    key: 'analysis',
    iconName: 'trophy',
    iconBg: '#FEF9C3',
    iconColor: '#EAB308',
    title: 'Detailed Analysis',
    description: 'Get in-depth performance reports',
  },
  {
    key: 'trusted',
    iconName: 'shield-check',
    iconBg: '#E8F5E9',
    iconColor: '#22C55E',
    title: 'Trusted by Students',
    description: 'Join thousands of successful students',
  },
  {
    key: 'support',
    iconName: 'headphones',
    iconBg: '#EDE9FF',
    iconColor: '#7C3AED',
    title: '24/7 Support',
    description: 'We are here to help you anytime',
  },
];

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
  {
    key: 'class12-pyq',
    title: 'Class 12 Board PYQ Papers',
    category: 'Class 12',
    features: [
      { icon: 'calendar', text: '2015–2024 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '10 Previous Papers' },
    ],
    rating: 4.7,
    totalStudents: 38920,
    price: 199,
    originalPrice: 699,
    badgeLabel: '🔥 Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '📄',
  },
  {
    key: 'upsc-pyq',
    title: 'UPSC Prelims PYQ Compilation',
    category: 'UPSC',
    features: [
      { icon: 'calendar', text: '2000–2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '25 Previous Papers' },
    ],
    rating: 4.8,
    totalStudents: 18960,
    price: 599,
    originalPrice: 2499,
    badgeLabel: '⭐ Student Favorite',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '📄',
  },
  {
    key: 'cuet-pyq',
    title: 'CUET UG PYQ Question Bank',
    category: 'CUET',
    features: [
      { icon: 'calendar', text: '2020–2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '12 Previous Papers' },
    ],
    rating: 4.6,
    totalStudents: 15830,
    price: 249,
    originalPrice: 899,
    badgeLabel: '🔥 Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '📄',
  },
  {
    key: 'ssc-pyq',
    title: 'SSC CGL Previous Year Papers',
    category: 'SSC',
    features: [
      { icon: 'calendar', text: '2010–2025 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '18 Previous Papers' },
    ],
    rating: 4.5,
    totalStudents: 21340,
    price: 349,
    originalPrice: 1299,
    badgeLabel: '⭐ Student Favorite',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '📄',
  },
  {
    key: 'neet-again-pyq',
    title: 'NEET UG Previous Year Papers',
    category: 'NEET',
    features: [
      { icon: 'calendar', text: '2015–2024 Coverage' },
      { icon: 'timer', text: 'Timed Test Mode' },
      { icon: 'bar-chart-2', text: 'AI Performance Analytics' },
      { icon: 'trophy', text: '10 Previous Papers' },
    ],
    rating: 4.9,
    totalStudents: 27890,
    price: 249,
    originalPrice: 849,
    badgeLabel: '🔥 Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '📄',
  },
];

// ─── Fallback Trending Courses Data (used when backend has no content rows) ──

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

// ─── Constants for Trending Course UI (gradients + illustration defaults) ──

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
const COURSE_ILLUSTRATIONS: string[] = ['🔬', '⚛️', '📚', '🎯', '🏛️', '📊', '🏦', '🎓'];

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

// ─── Mock Dashboard Data (matches HTML design reference exactly) ──────────

/** Overall performance card data. Replace with API data when available. */
const MOCK_PERFORMANCE = {
  accuracy: 82,
  testsAttempted: 42,
  averageScore: 612,
  bestScore: 698,
  improvementText: '12% improvement\nfrom last month',
} as const;

/** Quick stats items (4 cards). Replace with API data when available. */
const MOCK_QUICK_STATS: QuickStatItem[] = [
  {
    key: 'tests-attempted',
    iconName: 'book-open',
    label: 'Tests\nAttempted',
    value: '42',
  },
  {
    key: 'best-score',
    iconName: 'trophy',
    label: 'Best Score',
    value: '698',
  },
  {
    key: 'avg-score',
    iconName: 'bar-chart-2',
    label: 'Average Score',
    value: '612',
  },
  {
    key: 'accuracy',
    iconName: 'badge-check',
    label: 'Overall Accuracy',
    value: '82%',
  },
];

/** Continue practice session data. Replace with API data when available. */
const MOCK_CONTINUE_PRACTICE = {
  testName: 'NEET Biology Mock Test 07',
  completedCount: 68,
  totalCount: 180,
  progress: 0.38,
  remainingCount: 112,
} as const;

/** Latest test result data. Replace with API data when available. */
const MOCK_LATEST_RESULT = {
  testName: 'NEET Full Syllabus Mock Test 05',
  date: '28 May 2025',
  score: 612,
  maxScore: 720,
  percentile: 94.56,
  accuracy: 82,
} as const;

/** Upcoming tests. Replace with API data when available. */
const MOCK_UPCOMING_TESTS: UpcomingTestItem[] = [
  {
    key: 'upcoming-1',
    testName: 'NEET Physics Mock Test 08',
    date: '30 May 2025',
    time: '10:00 AM',
    duration: '3 Hours',
  },
  {
    key: 'upcoming-2',
    testName: 'NEET Chemistry Mock Test 08',
    date: '31 May 2025',
    time: '10:00 AM',
    duration: '3 Hours',
  },
];

/** Performance snapshot by subject. Replace with API data when available. */
const MOCK_PERFORMANCE_SNAPSHOT: SubjectPerformance[] = [
  { subject: 'Physics', icon: '🔬', accuracy: 88 },
  { subject: 'Chemistry', icon: '🧪', accuracy: 74 },
  { subject: 'Biology', icon: '🧬', accuracy: 93 },
];

// --- Section IDs ---

type SectionId =
  | 'greeting'
  | 'hero'
  | 'overall-performance'
  | 'quick-stats'
  | 'continue-practice'
  | 'latest-result'
  | 'upcoming-tests'
  | 'performance-snapshot'
  | 'trending-courses'
  | 'pyq-practice'
  | 'quick-start'
  | 'why-choose'
  | 'popular-exams'
  | 'cta';

interface Section {
  id: SectionId;
}

const SECTIONS: Section[] = [
  { id: 'greeting' },
  { id: 'hero' },
  { id: 'overall-performance' },
  { id: 'quick-stats' },
  { id: 'continue-practice' },
  { id: 'latest-result' },
  { id: 'upcoming-tests' },
  { id: 'performance-snapshot' },
  { id: 'trending-courses' },
  { id: 'pyq-practice' },
  { id: 'quick-start' },
  { id: 'why-choose' },
  { id: 'popular-exams' },
  { id: 'cta' },
];

// --- Screen ---

export default function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);

  // ── Greeting: live authenticated user data ────────────────────────────
  const {
    data: dashboard,
    error: dashboardError,
  } = useHomeDashboard(user?.id);

  // Log dashboard errors silently — the UI falls back to defaults.
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
  const handleViewAllTrending = useCallback(() => {}, []);
  const handleCoursePress = useCallback((_key: string) => {}, []);
  const handleHeroExplorePress = useCallback((_key: string) => {}, []);
  const handleHeroEnrollPress = useCallback((_key: string) => {}, []);

  // ── Dashboard Navigation ──────────────────────────────────────────
  const handleContinuePractice = useCallback(() => {}, []);
  const handleViewAllPractice = useCallback(() => {}, []);
  const handleViewLatestResult = useCallback(() => {}, []);
  const handleViewAllResults = useCallback(() => {}, []);
  const handleViewAllUpcoming = useCallback(() => {}, []);
  const handleUpcomingTestPress = useCallback((_testName: string) => {}, []);
  const handleViewDetailedAnalysis = useCallback(() => {}, []);

  // ── PYQ Navigation ────────────────────────────────────────────────
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

  const quickActions = useMemo(() => QUICK_ACTIONS, []);
  const features = useMemo(() => FEATURES, []);
  const popularExams = useMemo(() => POPULAR_EXAMS, []);
  // ── Trending Courses: live backend data ────────────────────────────────
  const {
    data: trendingData,
    error: trendingError,
  } = useTrendingCourses({ page: 1, pageSize: 8 });

  // Log trending errors silently — the UI falls back gracefully.
  if (trendingError) {
    console.warn('[HomeScreen] Trending courses fetch failed:', trendingError);
  }

  // Map backend TrendingCourse[] → UI TrendingCourseItem[].
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

  // ── PYQ Practice: live backend data via useFeaturedPractice ───────────
  const DEFAULT_PYQ_GRADIENTS: [string, string, ...string[]][] = [
    ['#155215', '#0C3D0C'],
    ['#1E3A5F', '#15294A'],
    ['#4A1942', '#2E0F2A'],
    ['#1A4A4A', '#0D2F2F'],
    ['#3D2B1F', '#2A1D14'],
    ['#2B1B4A', '#1A0F30'],
  ];

  const DEFAULT_PYQ_ILLUSTRATIONS = ['📄', '📚', '📝', '📋', '📖', '📑'];

  const {
    data: featuredPracticeData,
    isLoading: featuredLoading,
    error: featuredError,
  } = useFeaturedPractice(6);

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

    // Fallback: static PYQ items when backend is empty
    return PYQ_ITEMS;
  }, [featuredPracticeData]);

  const renderSection = useCallback(
    ({ item }: { item: Section }) => {
      switch (item.id) {
        case 'greeting':
          return (
            <GreetingHeader
              userName={greetingUserName}
              avatarUrl={greetingAvatarUrl}
              onNotificationPress={handleNotificationPress}
              onProfilePress={handleProfilePress}
              hasUnreadNotifications={hasUnreadNotifications}
              unreadCount={greetingUnreadCount}
            />
          );

        case 'hero':
          return (
            <View style={styles.heroWrapper}>
              <HeroBanner onExplorePress={handleExplorePress} />
            </View>
          );

        case 'overall-performance':
          return (
            <OverallPerformanceCard
              accuracy={MOCK_PERFORMANCE.accuracy}
              testsAttempted={MOCK_PERFORMANCE.testsAttempted}
              averageScore={MOCK_PERFORMANCE.averageScore}
              bestScore={MOCK_PERFORMANCE.bestScore}
              improvementText={MOCK_PERFORMANCE.improvementText}
            />
          );

        case 'quick-stats':
          return (
            <QuickStatsCards items={MOCK_QUICK_STATS} />
          );

        case 'continue-practice':
          return (
            <ContinuePracticeCard
              testName={MOCK_CONTINUE_PRACTICE.testName}
              completedCount={MOCK_CONTINUE_PRACTICE.completedCount}
              totalCount={MOCK_CONTINUE_PRACTICE.totalCount}
              progress={MOCK_CONTINUE_PRACTICE.progress}
              remainingCount={MOCK_CONTINUE_PRACTICE.remainingCount}
              onContinuePress={handleContinuePractice}
              onViewAllPress={handleViewAllPractice}
            />
          );

        case 'latest-result':
          return (
            <LatestResultCard
              testName={MOCK_LATEST_RESULT.testName}
              date={MOCK_LATEST_RESULT.date}
              score={MOCK_LATEST_RESULT.score}
              maxScore={MOCK_LATEST_RESULT.maxScore}
              percentile={MOCK_LATEST_RESULT.percentile}
              accuracy={MOCK_LATEST_RESULT.accuracy}
              onViewResult={handleViewLatestResult}
              onViewAllPress={handleViewAllResults}
            />
          );

        case 'upcoming-tests':
          return (
            <UpcomingTestsCard
              items={MOCK_UPCOMING_TESTS.map((item) => ({
                ...item,
                onPress: () => handleUpcomingTestPress(item.testName),
              }))}
              onViewAll={handleViewAllUpcoming}
            />
          );

        case 'performance-snapshot':
          return (
            <PerformanceSnapshotCard
              subjects={MOCK_PERFORMANCE_SNAPSHOT}
              onViewDetailedAnalysis={handleViewDetailedAnalysis}
            />
          );

        case 'trending-courses':
          return (
            <TrendingCoursesSection
              courses={trendingCourses}
              onViewAllPress={handleViewAllTrending}
              onCoursePress={handleCoursePress}
              onHeroExplorePress={handleHeroExplorePress}
              onHeroEnrollPress={handleHeroEnrollPress}
            />
          );

        case 'pyq-practice':
          return (
            <PyqPracticeSection
              items={pyqItems}
              onViewAllPress={handleViewAllPyq}
              onItemPress={handlePyqItemPress}
              onPreviewPress={handlePyqPreviewPress}
              onStartPracticePress={handlePyqStartPracticePress}
            />
          );

        case 'quick-start':
          return (
            <View style={styles.sectionWrapper}>
              <SectionHeader title="Quick Start" />
              <View style={styles.grid}>
                {quickActions.map((action, index) => {
                  const { key, ...actionProps } = action;
                  return (
                    <View key={key} style={styles.gridHalf}>
                      <QuickActionCard
                        {...actionProps}
                        animationDelay={index * 80}
                        onPress={() => handleActionPress(key)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          );

        case 'why-choose':
          return (
            <View style={styles.sectionWrapper}>
              <SectionHeader title="Why Choose MockPrep?" />
              <View style={styles.grid}>
                {features.map((feature) => {
                  const { key, ...featureProps } = feature;
                  return (
                    <View key={key} style={styles.gridHalf}>
                      <FeatureCard {...featureProps} />
                    </View>
                  );
                })}
              </View>
            </View>
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
                    <View key={key} style={styles.gridHalf}>
                      <PopularExamCard
                        {...examProps}
                        animationDelay={index * 80}
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
      greetingUserName, greetingAvatarUrl, hasUnreadNotifications, greetingUnreadCount,
      user, quickActions, features, popularExams, trendingCourses, pyqItems,
      handleExplorePress, handleNotificationPress, handleProfilePress,
      handleActionPress, handleExamPress, handleStartFreeTest, handleViewAllExams,
      handleViewAllTrending, handleCoursePress, handleHeroExplorePress, handleHeroEnrollPress,
      handleContinuePractice, handleViewAllPractice, handleViewLatestResult, handleViewAllResults,
      handleViewAllUpcoming, handleUpcomingTestPress, handleViewDetailedAnalysis,
      handleViewAllPyq, handlePyqItemPress, handlePyqPreviewPress, handlePyqStartPracticePress,
    ],
  );

  const keyExtractor = useCallback((section: Section) => section.id, []);

  return (
    <View style={styles.screen}>
      <FlatList
        data={SECTIONS}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing[4],
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
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
});
