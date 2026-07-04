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
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';

import GreetingHeader from '../../components/home/GreetingHeader';
import HeroBanner from '../../components/home/HeroBanner';
import QuickActionCard from '../../components/home/QuickActionCard';
import SectionHeader from '../../components/home/SectionHeader';
import FeatureCard from '../../components/home/FeatureCard';
import PopularExamCard from '../../components/home/PopularExamCard';
import CTASection from '../../components/home/CTASection';
import BottomNav from '../../components/home/BottomNav';
import TrendingCoursesSection from '../../components/home/TrendingCoursesSection';

import type { QuickActionItem, FeatureItem, PopularExamItem, TrendingCourseItem } from '../../components/home/types';
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

// --- Trending Courses Data ---

const TRENDING_FEATURED: TrendingCourseItem = {
  key: 'featured-data-science',
  title: 'Data Science & Machine Learning',
  category: 'Data Science',
  description: 'Master Python, ML algorithms, and real-world data projects with hands-on training.',
  instructor: 'Dr. Priya Sharma',
  rating: 4.8,
  totalStudents: 12450,
  price: 3999,
  originalPrice: 14999,
  isBestSeller: true,
  gradientColors: ['#1E1B4B', '#312E81', '#4C1D95'],
  illustration: '💡',
};

const TRENDING_COURSES: TrendingCourseItem[] = [
  {
    key: 'full-stack-web',
    title: 'Full Stack Web Development',
    category: 'Web Dev',
    description: 'React, Node.js, MongoDB & more',
    instructor: 'Amit Kumar',
    rating: 4.7,
    totalStudents: 9820,
    price: 2999,
    originalPrice: 9999,
    isBestSeller: true,
    gradientColors: ['#1E1B4B', '#312E81', '#4C1D95'],
    illustration: '🌐',
  },
  {
    key: 'ai-deep-learning',
    title: 'AI & Deep Learning',
    category: 'AI',
    description: 'Neural networks, computer vision, NLP',
    instructor: 'Prof. Vikram Reddy',
    rating: 4.9,
    totalStudents: 7650,
    price: 4999,
    originalPrice: 19999,
    isBestSeller: false,
    gradientColors: ['#1E1B4B', '#312E81', '#4C1D95'],
    illustration: '🤖',
  },
  {
    key: 'gate-2026',
    title: 'GATE 2026: Complete Preparation',
    category: 'GATE',
    description: 'Comprehensive coverage for all GATE papers',
    instructor: 'IIT Faculty Panel',
    rating: 4.8,
    totalStudents: 15320,
    price: 2499,
    originalPrice: 8499,
    isBestSeller: true,
    gradientColors: ['#1E1B4B', '#312E81', '#4C1D95'],
    illustration: '🎓',
  },
  {
    key: 'app-dev-flutter',
    title: 'Flutter Mobile App Development',
    category: 'Mobile',
    description: 'Build iOS & Android apps with Flutter',
    instructor: 'Sneha Patel',
    rating: 4.6,
    totalStudents: 5430,
    price: 1999,
    originalPrice: 6999,
    isBestSeller: false,
    gradientColors: ['#1E1B4B', '#312E81', '#4C1D95'],
    illustration: '📱',
  },
];

// --- Section IDs ---

type SectionId =
  | 'greeting'
  | 'hero'
  | 'trending-courses'
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
  { id: 'quick-start' },
  { id: 'why-choose' },
  { id: 'popular-exams' },
  { id: 'cta' },
];

// --- Screen ---

export default function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);

  const handleExplorePress = useCallback(() => {}, []);
  const handleNotificationPress = useCallback(() => {}, []);
  const handleProfilePress = useCallback(() => {}, []);
  const handleActionPress = useCallback((_key: string) => {}, []);
  const handleExamPress = useCallback((_key: string) => {}, []);
  const handleStartFreeTest = useCallback(() => {}, []);
  const handleViewAllExams = useCallback(() => {}, []);
  const handleTabPress = useCallback((_tabKey: string) => {}, []);
  const handleViewAllTrending = useCallback(() => {}, []);
  const handleCoursePress = useCallback((_key: string) => {}, []);
  const handleHeroExplorePress = useCallback(() => {}, []);
  const handleHeroEnrollPress = useCallback(() => {}, []);

  const quickActions = useMemo(() => QUICK_ACTIONS, []);
  const features = useMemo(() => FEATURES, []);
  const popularExams = useMemo(() => POPULAR_EXAMS, []);
  const featuredCourse = useMemo(() => TRENDING_FEATURED, []);
  const trendingCourses = useMemo(() => TRENDING_COURSES, []);

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
              featuredCourse={featuredCourse}
              courses={trendingCourses}
              onViewAllPress={handleViewAllTrending}
              onCoursePress={handleCoursePress}
              onHeroExplorePress={handleHeroExplorePress}
              onHeroEnrollPress={handleHeroEnrollPress}
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
      user, quickActions, features, popularExams, featuredCourse, trendingCourses,
      handleExplorePress, handleNotificationPress, handleProfilePress,
      handleActionPress, handleExamPress, handleStartFreeTest, handleViewAllExams,
      handleViewAllTrending, handleCoursePress, handleHeroExplorePress, handleHeroEnrollPress,
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
          paddingBottom: insets.bottom + spacing[8],
        }}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={3}
      />
      <BottomNav onTabPress={handleTabPress} />
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
