/**
 * DetailedAnalyticsScreen
 *
 * Provides a dedicated, premium view containing detailed performance metrics and charts.
 *
 * Displays:
 *   - ScoreTrendChart (using useStudentScoreTrend)
 *   - PerformanceSnapshotCard (using useStudentSubjectAnalytics)
 *   - ChapterAnalyticsCard (using useStudentChapterAnalytics)
 *   - WeakChaptersCard (using useStudentWeakChapters)
 *   - StrongChaptersCard (using useStudentStrongChapters)
 *
 * Includes pull-to-refresh to refetch all analytics queries.
 *
 * @module screens/profile/DetailedAnalyticsScreen
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/home/Icons';
import SkeletonLoader from '../../components/SkeletonLoader';
import ScoreTrendChart from '../../components/analytics/ScoreTrendChart';
import PerformanceSnapshotCard from '../../components/dashboard/PerformanceSnapshotCard';
import ChapterAnalyticsCard from '../../components/dashboard/ChapterAnalyticsCard';
import WeakStrongChaptersCard from '../../components/dashboard/WeakStrongChaptersCard';
import {
  useStudentScoreTrend,
  useStudentSubjectAnalytics,
  useStudentChapterAnalytics,
  useStudentWeakChapters,
  useStudentStrongChapters,
} from '../../hooks/analytics/useAnalytics';
import { useStudentDashboardSummary } from '../../hooks/dashboard/useStudentDashboardSummary';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getSubjectIcon = (subjectName: string): string => {
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
};

// ─── Local Components ────────────────────────────────────────────────────────

const SectionWrapper = React.memo(function SectionWrapper({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
});

const LocalEmptyCard = React.memo(function LocalEmptyCard({
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

const StatsGrid = React.memo(function StatsGrid({
  summary,
}: {
  summary: any;
}): React.JSX.Element {
  const stats = [
    {
      label: 'Tests Completed',
      value: summary.testsAttempted ?? 0,
      icon: 'clipboard-list',
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    {
      label: 'Overall Accuracy',
      value: summary.overallAccuracy !== null ? `${Math.round(summary.overallAccuracy)}%` : 'N/A',
      icon: 'target-fill',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    {
      label: 'Average Score',
      value: summary.averageScore ?? 0,
      icon: 'bar-chart-2',
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
    {
      label: 'Best Score',
      value: summary.bestScore ?? 0,
      icon: 'trophy',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
  ];

  return (
    <View style={styles.statsGrid}>
      {stats.map((item, idx) => (
        <View key={idx} style={[styles.statsCard, shadows.small]}>
          <View style={[styles.statsIconWrapper, { backgroundColor: item.bg }]}>
            <Icon name={item.icon as any} color={item.color} width={20} height={20} />
          </View>
          <View style={styles.statsInfo}>
            <Text style={styles.statsLabel}>{item.label}</Text>
            <Text style={styles.statsValue}>{item.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DetailedAnalyticsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useStudentDashboardSummary();
  const {
    data: trendData,
    isLoading: isTrendLoading,
    error: trendError,
    refetch: refetchTrend,
  } = useStudentScoreTrend();

  const {
    data: subjectAnalytics,
    isLoading: isSubjectLoading,
    error: subjectError,
    refetch: refetchSubject,
  } = useStudentSubjectAnalytics();

  const {
    data: chapterAnalytics,
    isLoading: isChapterLoading,
    error: chapterError,
    refetch: refetchChapter,
  } = useStudentChapterAnalytics();

  const {
    data: weakChapters,
    isLoading: isWeakLoading,
    error: weakError,
    refetch: refetchWeak,
  } = useStudentWeakChapters();

  const {
    data: strongChapters,
    isLoading: isStrongLoading,
    error: strongError,
    refetch: refetchStrong,
  } = useStudentStrongChapters();

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchSummary(),
        refetchTrend(),
        refetchSubject(),
        refetchChapter(),
        refetchWeak(),
        refetchStrong(),
      ]);
    } catch (err) {
      console.warn('[DetailedAnalyticsScreen] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refetchSummary, refetchTrend, refetchSubject, refetchChapter, refetchWeak, refetchStrong]);

  // ── Mappings ───────────────────────────────────────────────────────────────
  const rpcSubjectPerformance = useMemo(() => {
    if (!subjectAnalytics) return null;
    return subjectAnalytics.map((s) => ({
      subject: s.subjectName,
      icon: getSubjectIcon(s.subjectName),
      accuracy: Math.round(s.accuracy),
    }));
  }, [subjectAnalytics]);

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[12] }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-left" color={colors.text.primary} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detailed Analytics</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* ── Scrollable Body ────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing[32] },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 0. Performance Overview Stats Hub */}
        {isSummaryLoading ? (
          <View style={styles.statsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.statsCard}>
                <SkeletonLoader width={40} height={40} borderRadius={10} />
                <View style={{ gap: 4 }}>
                  <SkeletonLoader width={80} height={10} borderRadius={4} />
                  <SkeletonLoader width={50} height={16} borderRadius={4} />
                </View>
              </View>
            ))}
          </View>
        ) : summaryError ? null : summaryData ? (
          <StatsGrid summary={summaryData} />
        ) : null}

        {/* 1. Score Trend Chart */}
        <SectionWrapper title="Score Trend">
          {isTrendLoading ? (
            <SkeletonLoader width="100%" height={220} borderRadius={radius.lg} />
          ) : trendError ? (
            <LocalEmptyCard
              emoji="⚠️"
              title="Unable to Load"
              message="Trend data could not be retrieved. Please pull down to refresh."
            />
          ) : !trendData || trendData.length === 0 ? (
            <LocalEmptyCard
              emoji="📈"
              title="No Trend Data"
              message="Attempt more mock tests to see your chronological score trend."
            />
          ) : (
            <View style={[styles.chartCard, shadows.small]}>
              <ScoreTrendChart data={trendData} />
            </View>
          )}
        </SectionWrapper>

        {/* 2. Performance Snapshot */}
        <SectionWrapper title="Subject Snapshot">
          {isSubjectLoading ? (
            <SkeletonLoader width="100%" height={180} borderRadius={radius.lg} />
          ) : subjectError ? (
            <LocalEmptyCard
              emoji="⚠️"
              title="Unable to Load"
              message="Subject performance data could not be retrieved."
            />
          ) : !rpcSubjectPerformance || rpcSubjectPerformance.length === 0 ? (
            <LocalEmptyCard
              emoji="📊"
              title="No Data Yet"
              message="Subject snapshot will appear after you attempt tests."
            />
          ) : (
            <PerformanceSnapshotCard subjects={rpcSubjectPerformance} />
          )}
        </SectionWrapper>

        {/* 3. Chapter Analytics */}
        <SectionWrapper title="Chapter-wise Performance">
          {isChapterLoading ? (
            <SkeletonLoader width="100%" height={240} borderRadius={radius.lg} />
          ) : chapterError ? (
            <LocalEmptyCard
              emoji="⚠️"
              title="Unable to Load"
              message="Chapter analytics could not be retrieved."
            />
          ) : !chapterAnalytics || chapterAnalytics.length === 0 ? (
            <LocalEmptyCard
              emoji="📚"
              title="No Chapter Data"
              message="Detailed chapter analytics will show up once you attempt tests."
            />
          ) : (
            <ChapterAnalyticsCard chapters={chapterAnalytics} />
          )}
        </SectionWrapper>

        {/* 4. Weak Chapters */}
        <SectionWrapper title="Weak Chapters">
          {isWeakLoading ? (
            <SkeletonLoader width="100%" height={160} borderRadius={radius.lg} />
          ) : weakError ? (
            <LocalEmptyCard
              emoji="⚠️"
              title="Unable to Load"
              message="Weak chapters could not be retrieved."
            />
          ) : !weakChapters || weakChapters.length === 0 ? (
            <LocalEmptyCard
              emoji="🎯"
              title="No Weak Chapters"
              message="You are doing great! No weak chapters identified."
            />
          ) : (
            <WeakStrongChaptersCard
              title="Weak Chapters"
              chapters={weakChapters}
              variant="weak"
            />
          )}
        </SectionWrapper>

        {/* 5. Strong Chapters */}
        <SectionWrapper title="Strong Chapters">
          {isStrongLoading ? (
            <SkeletonLoader width="100%" height={160} borderRadius={radius.lg} />
          ) : strongError ? (
            <LocalEmptyCard
              emoji="⚠️"
              title="Unable to Load"
              message="Strong chapters could not be retrieved."
            />
          ) : !strongChapters || strongChapters.length === 0 ? (
            <LocalEmptyCard
              emoji="🏆"
              title="No Strong Chapters"
              message="Strong chapters will be highlighted as you score higher."
            />
          ) : (
            <WeakStrongChaptersCard
              title="Strong Chapters"
              chapters={strongChapters}
              variant="strong"
            />
          )}
        </SectionWrapper>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[24],
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerRightPlaceholder: {
    width: 40,
  },

  // Section styles
  sectionContainer: {
    gap: spacing[12],
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.2,
  },

  // Chart styles
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[16],
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },

  // Empty state styles
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[24],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: spacing[8],
  },
  emptyCardTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  emptyCardText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
    marginBottom: spacing[8],
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsInfo: {
    justifyContent: 'center',
  },
  statsLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  statsValue: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
});
