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
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectUser, selectSelectedStreamId, setSelectedStreamId } from '../../store/authSlice';
import { useHomeDashboard } from '../../hooks/home/useHome';
import { useStudentDashboardSummary } from '../../hooks/dashboard/useStudentDashboardSummary';
import {
  useStudentSubjectAnalytics,
  useStudentChapterAnalytics,
  useStudentWeakChapters,
  useStudentStrongChapters,
} from '../../hooks/analytics/useAnalytics';
import { useTrendingCourses } from '../../hooks/home/useCourses';
import { useFeaturedPractice } from '../../hooks/practice/usePractice';
import { useStreams } from '../../hooks/academic/useStreams';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { TrendingCourse } from '../../types/home';
import Icon from '../../components/home/Icons';
import SkeletonLoader from '../../components/SkeletonLoader';

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
import ChapterAnalyticsCard from '../../components/dashboard/ChapterAnalyticsCard';
import WeakStrongChaptersCard from '../../components/dashboard/WeakStrongChaptersCard';

import type { QuickActionItem, FeatureItem, PopularExamItem, TrendingCourseItem, PyqItem as PyqItemType } from '../../components/home/types';
type PyqItem = PyqItemType;
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';

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

/**
 * Quick actions for role='user' (replace "Take a Mock Test" with "Browse Courses").
 */
const USER_QUICK_ACTIONS: QuickActionItem[] = [
  {
    key: 'courses',
    iconName: 'book-open',
    iconBg: '#E3F2FD',
    iconColor: '#3B82F6',
    title: 'Browse Courses',
    subtitle: 'Find the right course for you',
    accessibilityLabel: 'Browse Courses',
  },
  {
    key: 'pyq-practice',
    iconName: 'clipboard-list',
    iconBg: '#E8F5E9',
    iconColor: '#22C55E',
    title: 'Practice PYQs',
    subtitle: 'Solve previous year papers',
    accessibilityLabel: 'Practice PYQs',
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

// ─── Upcoming tests (mock — not yet in RPC) ────────────────────────────
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

/** Empty state cards for analytics sections that have no data yet. */
const EmptyAnalyticsCard = React.memo(function EmptyAnalyticsCard({
  emoji,
  title,
  message,
}: {
  emoji: string;
  title: string;
  message: string;
}): React.JSX.Element {
  return (
    <View style={[styles.emptyCard, shadows.small]}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyCardTitle}>{title}</Text>
      <Text style={styles.emptyCardText}>{message}</Text>
    </View>
  );
});

// --- Section IDs ---

type SectionId =
  | 'greeting'
  | 'stream-selector'
  | 'hero'
  | 'overall-performance'
  | 'quick-stats'
  | 'continue-practice'
  | 'latest-result'
  | 'upcoming-tests'
  | 'performance-snapshot'
  | 'chapter-analytics'
  | 'weak-chapters'
  | 'strong-chapters'
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
  { id: 'stream-selector' },
  { id: 'hero' },
  { id: 'overall-performance' },
  { id: 'quick-stats' },
  { id: 'continue-practice' },
  { id: 'latest-result' },
  { id: 'upcoming-tests' },
  { id: 'performance-snapshot' },
  { id: 'chapter-analytics' },
  { id: 'weak-chapters' },
  { id: 'strong-chapters' },
  { id: 'trending-courses' },
  { id: 'pyq-practice' },
  { id: 'quick-start' },
  { id: 'why-choose' },
  { id: 'popular-exams' },
  { id: 'cta' },
];

/**
 * Sections displayed for role='user'.
 * Only shows widgets that work without student_details.
 * Analytics, performance, and results widgets are intentionally excluded.
 */
const USER_SECTIONS: Section[] = [
  { id: 'greeting' },
  { id: 'stream-selector' },
  { id: 'hero' },
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
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const selectedStreamId = useAppSelector(selectSelectedStreamId);

  // ── Streams listing for interactive pill selector ──────────────
  const { data: streamsData } = useStreams(
    { isActive: true, instituteId: user?.instituteId ?? undefined },
    { sortBy: 'displayOrder', sortDirection: 'asc' }
  );
  const streams = useMemo(() => streamsData?.data ?? [], [streamsData]);

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

  // ── Role-aware section and action selection ──────────────────────
  const userRole = user?.role;
  const isUser = userRole === 'user';
  const activeSections = useMemo(() => (isUser ? USER_SECTIONS : SECTIONS), [isUser]);

  const quickActions = useMemo(() => (isUser ? USER_QUICK_ACTIONS : QUICK_ACTIONS), [isUser]);
  const features = useMemo(() => FEATURES, []);
  const popularExams = useMemo(() => POPULAR_EXAMS, []);
  // ── Trending Courses: live backend data ────────────────────────────────
  const {
    data: trendingData,
    error: trendingError,
  } = useTrendingCourses({ page: 1, pageSize: 8 }, selectedStreamId);

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

  // ── Student Dashboard Summary: live RPC data ────────────────────────────
  const {
    data: dashboardSummary,
    isLoading: dashboardSummaryLoading,
    error: dashboardSummaryError,
  } = useStudentDashboardSummary(!isUser);

  if (dashboardSummaryError) {
    console.warn('[HomeScreen] Dashboard summary fetch failed:', dashboardSummaryError);
  }

  // Determine whether dashboard data is actually being fetched for the first time
  // (vs. background refetch) so we can show a skeleton while loading.
  const isDashboardInitialLoading = dashboardSummaryLoading && !dashboardSummary;

  // Derive dashboard card props from RPC response
  const rpcPerformance = useMemo(() => dashboardSummary ? {
    accuracy: dashboardSummary.overallAccuracy ?? 0,
    testsAttempted: dashboardSummary.testsAttempted,
    averageScore: dashboardSummary.averageScore,
    bestScore: dashboardSummary.bestScore,
    improvementText: '12% improvement\nfrom last month',
  } : null, [dashboardSummary]);

  const rpcQuickStats = useMemo<QuickStatItem[] | null>(() => {
    if (!dashboardSummary) return null;
    const acc = dashboardSummary.overallAccuracy;
    return [
      {
        key: 'tests-attempted',
        iconName: 'book-open',
        label: 'Tests\nAttempted',
        value: String(dashboardSummary.testsAttempted),
      },
      {
        key: 'best-score',
        iconName: 'trophy',
        label: 'Best Score',
        value: String(dashboardSummary.bestScore),
      },
      {
        key: 'avg-score',
        iconName: 'bar-chart-2',
        label: 'Average Score',
        value: String(dashboardSummary.averageScore),
      },
      {
        key: 'accuracy',
        iconName: 'badge-check',
        label: 'Overall Accuracy',
        value: acc !== null ? `${Math.round(acc)}%` : 'N/A',
      },
    ];
  }, [dashboardSummary]);

  /** Format an ISO timestamp to a readable date string (e.g. "28 May 2025"). */
  const formatDate = useCallback((iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso.slice(0, 10);
    }
  }, []);

  /** Compute accuracy from correct / (correct + wrong) counts. */
  const computeAccuracy = useCallback((correct: number, wrong: number): number => {
    const total = correct + wrong;
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }, []);

  /**
   * Map a subject name to a consistent emoji icon.
   * Falls back to a generic book icon for unrecognised subjects.
   */  /**
   * Map a subject name to a consistent emoji icon.
   * Falls back to a generic document icon for unrecognised subjects.
   */
  const getSubjectIcon = useCallback((subjectName: string): string => {
    const name = subjectName.toLowerCase();
    if (name.includes('physics') || name.includes('phys')) return '🔬';
    if (name.includes('chemistry') || name.includes('chem')) return '🧪';
    if (name.includes('biology') || name.includes('bio') || name.includes('botany') || name.includes('zoology')) return '🧬';
    if (name.includes('mathematics') || name.includes('maths') || name.includes('math')) return '📐';
    if (name.includes('english') || name.includes('eng')) return '📖';
    if (name.includes('history') || name.includes('hist')) return '📜';
    if (name.includes('geography') || name.includes('geo')) return '🌍';
    if (name.includes('economics') || name.includes('econ')) return '💰';
    if (name.includes('computer') || name.includes('cs') || name.includes('it')) return '💻';
    if (name.includes('gk') || name.includes('general') || name.includes('current')) return '🗞️';
    return '📄';
  }, []);

  // ── Subject Analytics: live RPC data ──────────────────────────────
  const {
    data: subjectAnalytics,
    isLoading: subjectAnalyticsLoading,
    error: subjectAnalyticsError,
  } = useStudentSubjectAnalytics(!isUser);

  if (subjectAnalyticsError) {
    console.warn('[HomeScreen] Subject analytics fetch failed:', subjectAnalyticsError);
  }

  const isSubjectAnalyticsInitialLoading = subjectAnalyticsLoading && !subjectAnalytics;

  // Derive PerformanceSnapshot props from RPC response
  const rpcSubjectPerformance = useMemo<SubjectPerformance[] | null>(() => {
    if (!subjectAnalytics) return null;
    return subjectAnalytics.map((s) => ({
      subject: s.subjectName,
      icon: getSubjectIcon(s.subjectName),
      accuracy: Math.round(s.accuracy),
    }));
  }, [subjectAnalytics]);

  // ── Chapter Analytics: live RPC data ──────────────────────────────
  const {
    data: chapterAnalytics,
    isLoading: chapterAnalyticsLoading,
    error: chapterAnalyticsError,
  } = useStudentChapterAnalytics(!isUser);

  if (chapterAnalyticsError) {
    console.warn('[HomeScreen] Chapter analytics fetch failed:', chapterAnalyticsError);
  }

  const isChapterAnalyticsInitialLoading = chapterAnalyticsLoading && !chapterAnalytics;

  // ── Weak Chapters: live RPC data ──────────────────────────────────
  const {
    data: weakChapters,
    isLoading: weakChaptersLoading,
    isFetching: weakChaptersFetching,
    isSuccess: weakChaptersSuccess,
    isError: weakChaptersIsError,
    error: weakChaptersError,
  } = useStudentWeakChapters(!isUser);

  // ── DIAGNOSTIC: Weak Chapters query state ────────────────────────
  console.log('WEAK_CHAPTERS_QUERY', {
    isLoading: weakChaptersLoading,
    isFetching: weakChaptersFetching,
    isSuccess: weakChaptersSuccess,
    isError: weakChaptersIsError,
    error: weakChaptersError,
  });

  console.log('WEAK CHAPTERS RECEIVED', {
    isUndefined: weakChapters === undefined,
    isNull: weakChapters === null,
    arrayLength: Array.isArray(weakChapters) ? weakChapters.length : 'NOT_ARRAY',
  });

  if (weakChaptersError) {
    console.warn('[HomeScreen] Weak chapters fetch failed:', weakChaptersError);
  }

  const isWeakChaptersInitialLoading = weakChaptersLoading && !weakChapters;

  // ── Strong Chapters: live RPC data ────────────────────────────────
  const {
    data: strongChapters,
    isLoading: strongChaptersLoading,
    isFetching: strongChaptersFetching,
    isSuccess: strongChaptersSuccess,
    isError: strongChaptersIsError,
    error: strongChaptersError,
  } = useStudentStrongChapters(!isUser);

  // ── DIAGNOSTIC: Strong Chapters query state ──────────────────────
  console.log('STRONG_CHAPTERS_QUERY', {
    isLoading: strongChaptersLoading,
    isFetching: strongChaptersFetching,
    isSuccess: strongChaptersSuccess,
    isError: strongChaptersIsError,
    error: strongChaptersError,
  });

  console.log('STRONG CHAPTERS RECEIVED', {
    isUndefined: strongChapters === undefined,
    isNull: strongChapters === null,
    arrayLength: Array.isArray(strongChapters) ? strongChapters.length : 'NOT_ARRAY',
  });

  if (strongChaptersError) {
    console.warn('[HomeScreen] Strong chapters fetch failed:', strongChaptersError);
  }

  const isStrongChaptersInitialLoading = strongChaptersLoading && !strongChapters;

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

        case 'stream-selector':
          if (streams.length === 0) return null;
          return (
            <View style={styles.selectorWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectorScroll}
              >
                {streams.map((stream) => {
                  const isSelected = stream.streamId === selectedStreamId;
                  return (
                    <TouchableOpacity
                      key={stream.streamId}
                      style={[
                        styles.selectorPill,
                        isSelected && styles.selectorPillActive,
                      ]}
                      onPress={async () => {
                        try {
                          if (user?.id) {
                            const storageKey = `selected_exam_stream_id_${user.id}`;
                            await AsyncStorage.setItem(storageKey, stream.streamId);
                          }
                          dispatch(setSelectedStreamId(stream.streamId));
                        } catch (e) {
                          console.warn('[HomeScreen] Failed to save stream selection:', e);
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.selectorText,
                          isSelected && styles.selectorTextActive,
                        ]}
                      >
                        {stream.code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );

        case 'hero':
          return (
            <View style={styles.heroWrapper}>
              <HeroBanner onExplorePress={handleExplorePress} />
            </View>
          );

        case 'overall-performance':
          if (isDashboardInitialLoading) {
            return (
              <View style={styles.sectionWrapper}>
                <SkeletonLoader width="100%" height={180} borderRadius={24} />
              </View>
            );
          }
          if (dashboardSummaryError) {
            return (
              <View style={styles.sectionWrapper}>
                <View style={[styles.emptyCard, shadows.small]}>
                  <Text style={styles.emptyEmoji}>⚠️</Text>
                  <Text style={styles.emptyCardTitle}>Unable to Load</Text>
                  <Text style={styles.emptyCardText}>
                    Dashboard data could not be loaded. Please try again later.
                  </Text>
                </View>
              </View>
            );
          }
          return (
            <OverallPerformanceCard
              accuracy={rpcPerformance?.accuracy ?? 0}
              testsAttempted={rpcPerformance?.testsAttempted ?? 0}
              averageScore={rpcPerformance?.averageScore ?? 0}
              bestScore={rpcPerformance?.bestScore ?? 0}
              improvementText={rpcPerformance?.improvementText ?? '12% improvement\nfrom last month'}
            />
          );

        case 'quick-stats':
          if (isDashboardInitialLoading || dashboardSummaryError) return null;
          if (!rpcQuickStats) return null;
          return (
            <QuickStatsCards items={rpcQuickStats} />
          );

        case 'continue-practice':
          // Hidden when loading, errored, null, or when the RPC doesn't return
          // question-level progress data (completedCount, totalCount, etc.).
          // The RPC only returns basic attempt metadata — showing "0 / 0 Questions"
          // would be misleading. Enhance the RPC or add a dedicated query when
          // the full Continue Practice flow is implemented.
          return null;

        case 'latest-result': {
          if (isDashboardInitialLoading) {
            return (
              <View style={styles.sectionWrapper}>
                <SkeletonLoader width="100%" height={160} borderRadius={16} />
              </View>
            );
          }
          if (dashboardSummaryError) {
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Latest Result" />
                <View style={[styles.emptyCard, shadows.small]}>
                  <Text style={styles.emptyEmoji}>⚠️</Text>
                  <Text style={styles.emptyCardTitle}>Unable to Load</Text>
                  <Text style={styles.emptyCardText}>
                    Could not fetch your latest result. Please try again later.
                  </Text>
                </View>
              </View>
            );
          }
          const lr = dashboardSummary?.latestResult;
          // If latestResult is null, show empty-state UI
          if (!lr) {
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Latest Result" />
                <View style={[styles.emptyCard, shadows.small]}>
                  <Text style={styles.emptyEmoji}>📊</Text>
                  <Text style={styles.emptyCardTitle}>No Results Yet</Text>
                  <Text style={styles.emptyCardText}>
                    Your latest test results will appear here once you complete a mock test.
                  </Text>
                </View>
              </View>
            );
          }

          const lrAccuracy = computeAccuracy(lr.correctCount, lr.wrongCount);
          return (
            <LatestResultCard
              testName={lr.testTitle ?? 'Test Result'}
              date={formatDate(lr.generatedAt)}
              score={lr.totalScore}
              maxScore={lr.maxScore}
              percentile={lr.percentile ?? 0}
              accuracy={lrAccuracy}
              onViewResult={handleViewLatestResult}
              onViewAllPress={handleViewAllResults}
            />
          );
        }

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
          if (isSubjectAnalyticsInitialLoading) {
            return (
              <View style={styles.sectionWrapper}>
                <SkeletonLoader width="100%" height={140} borderRadius={16} />
              </View>
            );
          }
          if (subjectAnalyticsError) {
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Performance Snapshot" />
                <View style={[styles.emptyCard, shadows.small]}>
                  <Text style={styles.emptyEmoji}>⚠️</Text>
                  <Text style={styles.emptyCardTitle}>Unable to Load</Text>
                  <Text style={styles.emptyCardText}>
                    Performance data could not be loaded. Please try again later.
                  </Text>
                </View>
              </View>
            );
          }
          if (!rpcSubjectPerformance || rpcSubjectPerformance.length === 0) {
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Performance Snapshot" />
                <EmptyAnalyticsCard
                  emoji="📊"
                  title="No Data Yet"
                  message="Complete your first test to view subject-wise performance."
                />
              </View>
            );
          }
          return (
            <PerformanceSnapshotCard
              subjects={rpcSubjectPerformance}
              onViewDetailedAnalysis={handleViewDetailedAnalysis}
            />
          );

        case 'chapter-analytics':
          if (isChapterAnalyticsInitialLoading) {
            return (
              <View style={styles.sectionWrapper}>
                <SkeletonLoader width="100%" height={200} borderRadius={16} />
              </View>
            );
          }
          if (chapterAnalyticsError) {
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Chapter-wise Performance" />
                <View style={[styles.emptyCard, shadows.small]}>
                  <Text style={styles.emptyEmoji}>⚠️</Text>
                  <Text style={styles.emptyCardTitle}>Unable to Load</Text>
                  <Text style={styles.emptyCardText}>
                    Chapter analytics could not be loaded. Please try again later.
                  </Text>
                </View>
              </View>
            );
          }
          if (!chapterAnalytics || chapterAnalytics.length === 0) {
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Chapter-wise Performance" />
                <EmptyAnalyticsCard
                  emoji="📚"
                  title="No Chapter Data Yet"
                  message="Chapter analytics will appear after you attempt tests."
                />
              </View>
            );
          }
          return <ChapterAnalyticsCard chapters={chapterAnalytics} />;

        case 'weak-chapters':
          if (isWeakChaptersInitialLoading) {
            console.log('RENDER LOADING: weak-chapters');
            return (
              <View style={styles.sectionWrapper}>
                <SkeletonLoader width="100%" height={180} borderRadius={16} />
              </View>
            );
          }
          if (weakChaptersError) {
            console.log('RENDER ERROR STATE: weak-chapters', { reason: weakChaptersError?.message ?? String(weakChaptersError) });
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Weak Chapters" />
                <View style={[styles.emptyCard, shadows.small]}>
                  <Text style={styles.emptyEmoji}>⚠️</Text>
                  <Text style={styles.emptyCardTitle}>Unable to Load</Text>
                  <Text style={styles.emptyCardText}>
                    Weak chapters could not be loaded. Please try again later.
                  </Text>
                </View>
              </View>
            );
          }
          if (!weakChapters || weakChapters.length === 0) {
            console.log('RENDER EMPTY STATE: weak-chapters');
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Weak Chapters" />
                <EmptyAnalyticsCard
                  emoji="🎯"
                  title="No Weak Chapters Yet"
                  message="You are performing well across all chapters! Weak chapters will appear here if your accuracy drops."
                />
              </View>
            );
          }
          console.log('RENDER SUCCESS: weak-chapters', { itemCount: weakChapters.length });
          return (
            <WeakStrongChaptersCard
              title="Weak Chapters"
              chapters={weakChapters}
              variant="weak"
            />
          );

        case 'strong-chapters':
          if (isStrongChaptersInitialLoading) {
            console.log('RENDER LOADING: strong-chapters');
            return (
              <View style={styles.sectionWrapper}>
                <SkeletonLoader width="100%" height={180} borderRadius={16} />
              </View>
            );
          }
          if (strongChaptersError) {
            console.log('RENDER ERROR STATE: strong-chapters', { reason: strongChaptersError?.message ?? String(strongChaptersError) });
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Strong Chapters" />
                <View style={[styles.emptyCard, shadows.small]}>
                  <Text style={styles.emptyEmoji}>⚠️</Text>
                  <Text style={styles.emptyCardTitle}>Unable to Load</Text>
                  <Text style={styles.emptyCardText}>
                    Strong chapters could not be loaded. Please try again later.
                  </Text>
                </View>
              </View>
            );
          }
          if (!strongChapters || strongChapters.length === 0) {
            console.log('RENDER EMPTY STATE: strong-chapters');
            return (
              <View style={styles.sectionWrapper}>
                <SectionHeader title="Strong Chapters" />
                <EmptyAnalyticsCard
                  emoji="🏆"
                  title="No Strong Chapters Yet"
                  message="Strong chapters will appear here once you complete enough tests."
                />
              </View>
            );
          }
          console.log('RENDER SUCCESS: strong-chapters', { itemCount: strongChapters.length });
          return (
            <WeakStrongChaptersCard
              title="Strong Chapters"
              chapters={strongChapters}
              variant="strong"
            />
          );

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
      streams, selectedStreamId, dispatch, dashboardSummary, dashboardSummaryError,
      isDashboardInitialLoading, rpcPerformance, rpcQuickStats,
      formatDate, computeAccuracy,
      handleExplorePress, handleNotificationPress, handleProfilePress,
      handleActionPress, handleExamPress, handleStartFreeTest, handleViewAllExams,
      handleViewAllTrending, handleCoursePress, handleHeroExplorePress, handleHeroEnrollPress,
      handleContinuePractice, handleViewAllPractice, handleViewLatestResult, handleViewAllResults,
      handleViewAllUpcoming, handleUpcomingTestPress, handleViewDetailedAnalysis,
      handleViewAllPyq, handlePyqItemPress, handlePyqPreviewPress, handlePyqStartPracticePress,
      // Analytics RPC data
      subjectAnalytics, subjectAnalyticsError, isSubjectAnalyticsInitialLoading, rpcSubjectPerformance,
      chapterAnalytics, chapterAnalyticsError, isChapterAnalyticsInitialLoading,
      weakChapters, weakChaptersError, isWeakChaptersInitialLoading,
      strongChapters, strongChaptersError, isStrongChaptersInitialLoading,
      getSubjectIcon,
    ],
  );

  const keyExtractor = useCallback((section: Section) => section.id, []);

  return (
    <View style={styles.screen}>
      <FlatList
        data={activeSections}
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
