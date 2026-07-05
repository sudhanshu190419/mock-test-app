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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';

import GreetingHeader from '../../components/home/GreetingHeader';
import HeroBanner from '../../components/home/HeroBanner';
import QuickActionCard from '../../components/home/QuickActionCard';
import SectionHeader from '../../components/home/SectionHeader';
import FeatureCard from '../../components/home/FeatureCard';
import PopularExamCard from '../../components/home/PopularExamCard';
import CTASection from '../../components/home/CTASection';
import TrendingCoursesSection from '../../components/home/TrendingCoursesSection';
import PyqPracticeSection from '../../components/home/PyqPracticeSection';
import BatchesSection from '../../components/home/BatchesSection';

import type { QuickActionItem, FeatureItem, PopularExamItem, TrendingCourseItem, PyqItem, BatchItem } from '../../components/home/types';
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

const PYQ_FEATURES = {
  neet: [
    { icon: 'description', text: 'Previous Year Papers' },
    { icon: 'timer', text: 'Timed Tests' },
    { icon: 'bar-chart-2', text: 'Performance Analytics' },
    { icon: 'trophy', text: 'Rank Prediction' },
  ],
} as const;

const PYQ_ITEMS: PyqItem[] = [
  {
    key: 'neet-pyq-bank',
    title: 'NEET Previous Year Question Bank',
    category: 'NEET',
    features: [...PYQ_FEATURES.neet],
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
    features: [...PYQ_FEATURES.neet],
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
    features: [...PYQ_FEATURES.neet],
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
    features: [...PYQ_FEATURES.neet],
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
    features: [...PYQ_FEATURES.neet],
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
    features: [...PYQ_FEATURES.neet],
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
    features: [...PYQ_FEATURES.neet],
    rating: 4.9,
    totalStudents: 27890,
    price: 249,
    originalPrice: 849,
    badgeLabel: '🔥 Most Attempted',
    gradientColors: ['#155215', '#0C3D0C'],
    illustration: '📄',
  },
];

// --- Batches Data ---

const BATCH_ITEMS: BatchItem[] = [
  {
    key: 'jee-main',
    name: 'JEE Main 2026',
    subtitle: 'Foundation Batch',
    accentColor: '#7C3AED',
    badgeLabel: 'Popular',
    studentCount: 12450,
    startDate: 'Jan 2025',
    duration: '6 Months',
    iconName: 'atom',
  },
  {
    key: 'jee-advanced',
    name: 'JEE Advanced 2026',
    subtitle: 'Rank Booster',
    accentColor: '#3B82F6',
    badgeLabel: 'New',
    studentCount: 8900,
    startDate: 'Mar 2025',
    duration: '8 Months',
    iconName: 'atom',
  },
  {
    key: 'neet-ug',
    name: 'NEET UG 2026',
    subtitle: 'Crash Course',
    accentColor: '#22C55E',
    badgeLabel: 'Best Seller',
    studentCount: 28340,
    startDate: 'Feb 2025',
    duration: '5 Months',
    iconName: 'stethoscope',
  },
  {
    key: 'class-9',
    name: 'Class 9 Foundation',
    subtitle: 'Foundation Batch',
    accentColor: '#F97316',
    badgeLabel: 'Popular',
    studentCount: 15670,
    startDate: 'Apr 2025',
    duration: '12 Months',
    iconName: 'book',
  },
  {
    key: 'class-10',
    name: 'Class 10 Board Prep',
    subtitle: 'Crash Course',
    accentColor: '#EC4899',
    badgeLabel: 'New',
    studentCount: 21340,
    startDate: 'Jan 2025',
    duration: '6 Months',
    iconName: 'book',
  },
  {
    key: 'class-11',
    name: 'Class 11 Foundation',
    subtitle: 'Foundation Batch',
    accentColor: '#06B6D4',
    badgeLabel: 'Popular',
    studentCount: 18920,
    startDate: 'Apr 2025',
    duration: '12 Months',
    iconName: 'book-open',
  },
  {
    key: 'class-12',
    name: 'Class 12 Mastery',
    subtitle: 'Rank Booster',
    accentColor: '#6366F1',
    badgeLabel: 'Best Seller',
    studentCount: 34780,
    startDate: 'Jan 2025',
    duration: '6 Months',
    iconName: 'book-open',
  },
  {
    key: 'cuet',
    name: 'CUET UG Complete',
    subtitle: 'Foundation Batch',
    accentColor: '#F59E0B',
    badgeLabel: 'Popular',
    studentCount: 18320,
    startDate: 'Feb 2025',
    duration: '8 Months',
    iconName: 'graduation-cap',
  },
  {
    key: 'clat',
    name: 'CLAT 2026',
    subtitle: 'Crash Course',
    accentColor: '#1E3A5F',
    badgeLabel: 'New',
    studentCount: 7890,
    startDate: 'Mar 2025',
    duration: '4 Months',
    iconName: 'badge-check',
  },
];

// --- Trending Courses Data (8 courses for the auto-carousel) ---

const TRENDING_COURSES: TrendingCourseItem[] = [
  {
    key: 'neet-crash',
    title: 'NEET Ultimate Crash Course',
    category: 'NEET',
    description: 'Complete NEET syllabus coverage with live doubt sessions, mock tests, and expert faculty guidance.',
    instructor: 'Dr. Meera Iyer',
    rating: 4.9,
    totalStudents: 28340,
    price: 4999,
    originalPrice: 19999,
    isBestSeller: true,
    gradientColors: ['#1E1B4B', '#312E81', '#4C1D95'],
    illustration: '🔬',
  },
  {
    key: 'jee-main',
    title: 'JEE Main Complete Batch',
    category: 'JEE',
    description: 'Physics, Chemistry & Maths mastery with IITian faculty, weekly tests, and personalised feedback.',
    instructor: 'Prof. Arjun Nair',
    rating: 4.8,
    totalStudents: 21560,
    price: 5999,
    originalPrice: 24999,
    isBestSeller: true,
    gradientColors: ['#0F0C29', '#302B63', '#24243E'],
    illustration: '⚛️',
  },
  {
    key: 'class-12-boards',
    title: 'Class 12 Boards Mastery',
    category: 'CBSE',
    description: 'Score 95%+ in your Class 12 boards with chapter-wise videos, PYQs, and expert-curated revision notes.',
    instructor: 'Ms. Sunita Verma',
    rating: 4.7,
    totalStudents: 34780,
    price: 2999,
    originalPrice: 12999,
    isBestSeller: false,
    gradientColors: ['#0F2027', '#203A43', '#2C5364'],
    illustration: '📚',
  },
  {
    key: 'cuet-prep',
    title: 'CUET Complete Preparation',
    category: 'CUET',
    description: 'Crack DU, BHU, JNU & other central universities with our comprehensive CUET UG program.',
    instructor: 'Dr. Rohan Desai',
    rating: 4.6,
    totalStudents: 18320,
    price: 3499,
    originalPrice: 14999,
    isBestSeller: true,
    gradientColors: ['#1A0A3E', '#2D1B69', '#44107A'],
    illustration: '🎯',
  },
  {
    key: 'upsc-foundation',
    title: 'UPSC Foundation Program',
    category: 'UPSC',
    description: 'Comprehensive UPSC CSE foundation course with GS, CSAT, optional subjects, and interview prep.',
    instructor: 'Mr. Vikram Joshi',
    rating: 4.8,
    totalStudents: 12560,
    price: 8999,
    originalPrice: 34999,
    isBestSeller: false,
    gradientColors: ['#0B0C10', '#1F2833', '#2B2D42'],
    illustration: '🏛️',
  },
  {
    key: 'ssc-cgl',
    title: 'SSC CGL Complete Course',
    category: 'SSC',
    description: 'Master Quantitative Aptitude, Reasoning, English & GK for SSC CGL Tier I & II exams.',
    instructor: 'Mr. Pradeep Singh',
    rating: 4.5,
    totalStudents: 22450,
    price: 1999,
    originalPrice: 8999,
    isBestSeller: false,
    gradientColors: ['#1B1B2F', '#162447', '#1F4068'],
    illustration: '📊',
  },
  {
    key: 'banking-po',
    title: 'Banking PO Master Batch',
    category: 'Banking',
    description: 'Complete preparation for IBPS PO, SBI PO & Clerk with sectional tests and interview support.',
    instructor: 'Ms. Kavita Sharma',
    rating: 4.6,
    totalStudents: 16780,
    price: 2499,
    originalPrice: 9999,
    isBestSeller: true,
    gradientColors: ['#1E0A3C', '#2D1B69', '#4A1F7A'],
    illustration: '🏦',
  },
  {
    key: 'cat-2027',
    title: 'CAT 2027 Preparation',
    category: 'MBA',
    description: 'Crack IIMs with VARC, DILR & QA mastery, 50+ mock tests, and personalised mentorship.',
    instructor: 'Prof. Ananya Gupta',
    rating: 4.7,
    totalStudents: 9870,
    price: 6999,
    originalPrice: 27999,
    isBestSeller: false,
    gradientColors: ['#0D0D1A', '#1A1A3E', '#2A0845'],
    illustration: '🎓',
  },
];

// --- Section IDs ---

type SectionId =
  | 'greeting'
  | 'hero'
  | 'trending-courses'
  | 'pyq-practice'
  | 'our-batches'
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
  { id: 'trending-courses' },
  { id: 'pyq-practice' },
  { id: 'our-batches' },
  { id: 'quick-start' },
  { id: 'why-choose' },
  { id: 'popular-exams' },
  { id: 'cta' },
];

// --- Screen ---

export default function HomeScreen(): React.JSX.Element {
  const user = useAppSelector(selectUser);

  const handleExplorePress = useCallback(() => {}, []);
  const handleNotificationPress = useCallback(() => {}, []);
  const handleProfilePress = useCallback(() => {}, []);
  const handleActionPress = useCallback((_key: string) => {}, []);
  const handleExamPress = useCallback((_key: string) => {}, []);
  const handleStartFreeTest = useCallback(() => {}, []);
  const handleViewAllExams = useCallback(() => {}, []);
  const handleViewAllTrending = useCallback(() => {}, []);
  const handleCoursePress = useCallback((_key: string) => {}, []);
  const handleHeroExplorePress = useCallback((_key: string) => {}, []);
  const handleHeroEnrollPress = useCallback((_key: string) => {}, []);
  const handleViewAllPyq = useCallback(() => {}, []);
  const handlePyqItemPress = useCallback((_key: string) => {}, []);
  const handlePyqPreviewPress = useCallback((_key: string) => {}, []);
  const handlePyqStartPracticePress = useCallback((_key: string) => {}, []);
  const handleViewAllBatches = useCallback(() => {}, []);
  const handleBatchPress = useCallback((_key: string) => {}, []);

  const quickActions = useMemo(() => QUICK_ACTIONS, []);
  const features = useMemo(() => FEATURES, []);
  const popularExams = useMemo(() => POPULAR_EXAMS, []);
  const trendingCourses = useMemo(() => TRENDING_COURSES, []);
  const pyqItems = useMemo(() => PYQ_ITEMS, []);
  const batchItems = useMemo(() => BATCH_ITEMS, []);

  const renderSection = useCallback(
    ({ item }: { item: Section }) => {
      switch (item.id) {
        case 'greeting':
          return (
            <GreetingHeader
              userName={user?.name ?? 'Learner'}
              onNotificationPress={handleNotificationPress}
              onProfilePress={handleProfilePress}
              hasUnreadNotifications={false}
            />
          );

        case 'hero':
          return (
            <View style={styles.heroWrapper}>
              <HeroBanner onExplorePress={handleExplorePress} />
            </View>
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

        case 'our-batches':
          return (
            <BatchesSection
              batches={batchItems}
              onViewAllPress={handleViewAllBatches}
              onBatchPress={handleBatchPress}
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
      user, quickActions, features, popularExams, trendingCourses, pyqItems, batchItems,
      handleExplorePress, handleNotificationPress, handleProfilePress,
      handleActionPress, handleExamPress, handleStartFreeTest, handleViewAllExams,
      handleViewAllTrending, handleCoursePress, handleHeroExplorePress, handleHeroEnrollPress,
      handleViewAllPyq, handlePyqItemPress, handlePyqPreviewPress, handlePyqStartPracticePress,
      handleViewAllBatches, handleBatchPress,
    ],
  );

  const keyExtractor = useCallback((section: Section) => section.id, []);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <FlatList
        data={SECTIONS}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: spacing[8],
        }}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={3}
      />
    </SafeAreaView>
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
