/**
 * StudentAnalyticsDashboard
 *
 * Recomposed using reusable dashboard components.
 *
 * @module components/profile/StudentAnalyticsDashboard
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import OverallPerformanceCard from '../dashboard/OverallPerformanceCard';
import QuickStatsCards from '../dashboard/QuickStatsCards';
import ChapterAnalyticsCard from '../dashboard/ChapterAnalyticsCard';
import WeakStrongChaptersCard from '../dashboard/WeakStrongChaptersCard';
import LatestResultCard from '../dashboard/LatestResultCard';
import UpcomingTestsCard from '../dashboard/UpcomingTestsCard';

import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

export interface StudentAnalyticsDashboardProps {
  summary?: any;
  subjectAnalytics?: any[];
  chapterAnalytics?: any[];
  weakChapters?: any[];
  strongChapters?: any[];
  upcomingTests?: any[];
  latestResult?: any;
  isLoading?: boolean;
  onStartChapterPractice?: (chapterId: string, subjectId?: string) => void;
  onViewTestResult?: (attemptId: string) => void;
}

const DEFAULT_SUMMARY = {
  overallAccuracy: 76,
  masteryScore: 72,
  totalQuestionsAttempted: '1,240',
  currentStreak: '14 days',
  averageScore: 610,
  bestScore: 680,
  testsAttempted: 42,
};

const DEFAULT_CHAPTER_ANALYTICS = [
  { subjectId: 's1', subjectName: 'Physics', chapterId: 'c1', chapterName: 'Rotational Motion', accuracy: 42, questionsAttempted: 120, correct: 50, wrong: 50, skipped: 20 },
  { subjectId: 's2', subjectName: 'Chemistry', chapterId: 'c2', chapterName: 'Ionic Equilibrium', accuracy: 48, questionsAttempted: 100, correct: 48, wrong: 40, skipped: 12 },
];

const DEFAULT_WEAK_CHAPTERS = [
  { chapterId: 'chap-1', chapterName: 'Rotational Motion', subjectName: 'Physics', accuracy: 42 },
  { chapterId: 'chap-2', chapterName: 'Ionic Equilibrium', subjectName: 'Chemistry', accuracy: 48 },
];

const DEFAULT_STRONG_CHAPTERS = [
  { chapterId: 'chap-4', chapterName: 'Ray Optics', subjectName: 'Physics', accuracy: 92 },
  { chapterId: 'chap-5', chapterName: 'Cell: The Unit of Life', subjectName: 'Botany', accuracy: 95 },
];

const DEFAULT_LATEST_RESULT = {
  id: 'attempt-mock-4',
  title: 'Full Syllabus Grand Mock Test #4',
  score: 640,
  maxScore: 720,
  percentile: 99.2,
  accuracy: 89,
  date: 'Yesterday',
};

const DEFAULT_UPCOMING_TESTS = [
  { id: 'test-5', title: 'All India Open Mock #5', date: 'Sunday, 2:00 PM', time: '14:00', duration: '3 Hours' },
];

export const StudentAnalyticsDashboard: React.FC<StudentAnalyticsDashboardProps> = React.memo(
  function StudentAnalyticsDashboard({
    summary,
    chapterAnalytics,
    weakChapters,
    strongChapters,
    upcomingTests,
    latestResult,
    onStartChapterPractice,
    onViewTestResult,
  }) {
    const resolvedSummary = summary || DEFAULT_SUMMARY;
    const resolvedChapterAnalytics = chapterAnalytics && chapterAnalytics.length > 0 ? chapterAnalytics : DEFAULT_CHAPTER_ANALYTICS;
    const resolvedWeak = weakChapters && weakChapters.length > 0 ? weakChapters : DEFAULT_WEAK_CHAPTERS;
    const resolvedStrong = strongChapters && strongChapters.length > 0 ? strongChapters : DEFAULT_STRONG_CHAPTERS;
    const resolvedResult = latestResult || DEFAULT_LATEST_RESULT;
    const resolvedUpcoming = upcomingTests && upcomingTests.length > 0 ? upcomingTests : DEFAULT_UPCOMING_TESTS;

    const [activeTab, setActiveTab] = useState<'weak' | 'strong'>('weak');
    const tabTransition = useSharedValue(1);

    const handleTabSwitch = (tab: 'weak' | 'strong') => {
      if (tab === activeTab) return;
      tabTransition.value = 0.5;
      setActiveTab(tab);
      tabTransition.value = withTiming(1, { duration: 200 });
    };

    const tabAnimatedStyle = useAnimatedStyle(() => ({
      opacity: tabTransition.value,
      transform: [{ scale: 0.98 + 0.02 * tabTransition.value }],
    }));

    const quickStatsItems = [
      { key: 'attempted', iconName: 'clipboard-list' as any, label: 'Attempted', value: resolvedSummary.totalQuestionsAttempted || '1,240', gradientStart: 'rgba(16, 185, 129, 0.15)', gradientEnd: 'rgba(52, 211, 153, 0.05)' },
      { key: 'accuracy', iconName: 'chart-fill' as any, label: 'Accuracy', value: `${resolvedSummary.overallAccuracy || 76}%`, gradientStart: 'rgba(59, 130, 246, 0.15)', gradientEnd: 'rgba(96, 165, 250, 0.05)' },
      { key: 'streak', iconName: 'calendar' as any, label: 'Streak', value: resolvedSummary.currentStreak || '14 days', gradientStart: 'rgba(245, 158, 11, 0.15)', gradientEnd: 'rgba(251, 191, 36, 0.05)' },
      { key: 'avg', iconName: 'bar-chart-2' as any, label: 'Test Avg', value: `${resolvedSummary.averageScore || 610}`, gradientStart: 'rgba(139, 92, 246, 0.15)', gradientEnd: 'rgba(167, 139, 250, 0.05)' },
    ];

    const upcomingItems = resolvedUpcoming.map((test: any, index: number) => ({
      key: test.id || `upcoming-${index}`,
      testName: test.title,
      date: test.date,
      time: test.time || '10:00 AM',
      duration: test.duration || '3 Hours',
    }));

    return (
      <View style={styles.container}>
        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <Text style={styles.sectionSubtitle}>Real-time accuracy & mastery diagnostics</Text>
        </View>

        <OverallPerformanceCard
          accuracy={resolvedSummary.overallAccuracy || 76}
          testsAttempted={resolvedSummary.testsAttempted || 42}
          averageScore={resolvedSummary.averageScore || 610}
          bestScore={resolvedSummary.bestScore || 680}
          improvementText="+12% vs last week"
        />

        <QuickStatsCards items={quickStatsItems} />

        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Subject Performance</Text>
          <Text style={styles.sectionSubtitle}>Syllabus mastery breakdown by subject</Text>
        </View>

        <ChapterAnalyticsCard chapters={resolvedChapterAnalytics} />

        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Targeted Revision Recommendations</Text>
          <Text style={styles.sectionSubtitle}>Focus areas optimized for maximum score jump</Text>
        </View>

        <View style={styles.trayOuter}>
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tabButton, activeTab === 'weak' && styles.tabButtonActive]}
              onPress={() => handleTabSwitch('weak')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'weak' && styles.tabButtonTextActive]}>
                ⚠️ Weak Chapters ({resolvedWeak.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeTab === 'strong' && styles.tabButtonActive]}
              onPress={() => handleTabSwitch('strong')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'strong' && styles.tabButtonTextActive]}>
                🌟 Mastered ({resolvedStrong.length})
              </Text>
            </Pressable>
          </View>

          <Animated.View style={tabAnimatedStyle}>
            {activeTab === 'weak' ? (
              <WeakStrongChaptersCard title="Weak Chapters" chapters={resolvedWeak} variant="weak" />
            ) : (
              <WeakStrongChaptersCard title="Strong Chapters" chapters={resolvedStrong} variant="strong" />
            )}
          </Animated.View>
        </View>

        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Test Engine & Diagnostics</Text>
          <Text style={styles.sectionSubtitle}>Latest simulation results and upcoming schedules</Text>
        </View>

        <LatestResultCard
          testName={resolvedResult.title || 'Full Syllabus Grand Mock Test'}
          date={resolvedResult.date || 'Yesterday'}
          score={resolvedResult.score || 640}
          maxScore={resolvedResult.maxScore || 720}
          percentile={resolvedResult.percentile || 99.2}
          accuracy={resolvedResult.accuracy || 89}
          onViewResult={() => onViewTestResult?.(resolvedResult.id || 'mock-4')}
        />

        <UpcomingTestsCard items={upcomingItems} />
      </View>
    );
  }
);

export default StudentAnalyticsDashboard;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: spacing[16],
  },
  sectionHeaderSpacing: {
    marginTop: spacing[24],
    marginBottom: spacing[12],
    paddingHorizontal: spacing[20],
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.25,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: spacing[4],
  },
  trayOuter: {
    marginBottom: spacing[24],
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.lg,
    padding: spacing[4],
    marginHorizontal: spacing[20],
    marginBottom: spacing[16],
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: '#0F172A',
  },
});
