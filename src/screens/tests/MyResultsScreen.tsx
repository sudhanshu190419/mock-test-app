/**
 * MyResultsScreen
 *
 * Displays all released test attempts for the logged-in student.
 * Each card shows test name, date, score, percentage, and released date.
 * Tapping a card navigates to the full TestResult screen.
 *
 * Supports pull-to-refresh — when the admin releases results while the
 * student is using the app, refreshing immediately reveals the result.
 *
 * @module screens/tests/MyResultsScreen
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from '../../components/home/Icons';
import type { IconName } from '../../components/home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useMyResults } from '../../hooks/mockTest/useMyResults';
import { useStudentScoreTrend } from '../../hooks/analytics/useAnalytics';
import ScoreTrendChart from '../../components/analytics/ScoreTrendChart';
import ShimmerBlock from '../../components/SkeletonLoader';
import type { StudentResultItem } from '../../services/resultService';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export type MyResultsParams = undefined;

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

// ── Header ────────────────────────────────────────────────────────

interface HeaderProps {
  safeAreaTop: number;
  onBackPress: () => void;
}

const Header = React.memo(function Header({
  safeAreaTop,
  onBackPress,
}: HeaderProps): React.JSX.Element {
  return (
    <View style={[styles.header, { paddingTop: safeAreaTop + spacing[12] }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.6}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" color={colors.primary} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Results</Text>
        <View style={styles.backButton} />
      </View>
    </View>
  );
});

// ── Result Card ───────────────────────────────────────────────────

interface ResultCardProps {
  item: StudentResultItem;
  onPress: () => void;
}

const ResultCard = React.memo(function ResultCard({
  item,
  onPress,
}: ResultCardProps): React.JSX.Element {
  const formattedDate = formatDate(item.attemptedAt);
  const percentage = item.percentage;
  
  const statusConfig = useMemo(() => {
    if (percentage >= 80) {
      return { label: 'Excellent', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
    }
    if (percentage >= 60) {
      return { label: 'Good', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
    }
    if (percentage >= 40) {
      return { label: 'Average', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
    }
    return { label: 'Needs Focus', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
  }, [percentage]);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusConfig.color, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardInfoGroup}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.testTitle}
          </Text>
          <Text style={styles.cardDate}>{formattedDate}</Text>
        </View>
        <View style={[styles.percentageBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.percentageText, { color: statusConfig.color }]}>
            {percentage.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={styles.cardMetricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Score Obtained</Text>
          <Text style={styles.metricValue}>
            {item.score} <Text style={styles.metricMax}>/ {item.maxScore}</Text>
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Performance</Text>
          <Text style={[styles.metricValue, { color: statusConfig.color, fontSize: 13 }]}>
            {statusConfig.label}
          </Text>
        </View>
        <Icon name="chevron-right" color="#BFC4CC" width={18} height={18} />
      </View>
    </TouchableOpacity>
  );
});

const ResultsStatsHub = React.memo(function ResultsStatsHub({
  results,
}: {
  results: StudentResultItem[];
}): React.JSX.Element {
  const stats = useMemo(() => {
    const total = results.length;
    if (total === 0) return null;

    const avgPct = results.reduce((sum, r) => sum + r.percentage, 0) / total;
    const highestScore = Math.max(...results.map((r) => r.score));
    const highestMax = results.find((r) => r.score === highestScore)?.maxScore ?? 720;

    return [
      {
        label: 'Total Tests',
        value: total,
        icon: 'clipboard-list',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.1)',
      },
      {
        label: 'Average Score',
        value: `${avgPct.toFixed(1)}%`,
        icon: 'bar-chart-2',
        color: '#8B5CF6',
        bg: 'rgba(139, 92, 246, 0.1)',
      },
      {
        label: 'Highest Score',
        value: `${highestScore}/${highestMax}`,
        icon: 'trophy',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.1)',
      },
    ];
  }, [results]);

  if (!stats) return <View />;

  return (
    <View style={styles.statsHubContainer}>
      <Text style={styles.dashboardSectionTitle}>Performance Dashboard</Text>
      <View style={styles.statsHubRow}>
        {stats.map((item, idx) => (
          <View key={idx} style={[styles.hubCard, shadows.small]}>
            <View style={[styles.hubIconWrapper, { backgroundColor: item.bg }]}>
              <Icon name={item.icon as any} color={item.color} width={18} height={18} />
            </View>
            <Text style={styles.hubValue}>{item.value}</Text>
            <Text style={styles.hubLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ── Empty State ───────────────────────────────────────────────────

const EmptyState = React.memo(function EmptyState(): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Icon name="clipboard-list" color={palette.slate300} width={40} height={40} />
      </View>
      <Text style={styles.emptyTitle}>No Results Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your test results will appear here once they are released by your institute.
      </Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

interface MyResultsScreenProps {
  navigation: { goBack: () => void };
}

export default function MyResultsScreen({
  navigation,
}: MyResultsScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const { data: results, isLoading, isRefetching, refetch, error } = useMyResults();

  // ── Score Trend ────────────────────────────────────────────────────────
  const {
    data: trendData,
    isLoading: trendLoading,
    error: trendError,
    refetch: trendRefetch,
  } = useStudentScoreTrend();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleResultPress = useCallback(
    (item: StudentResultItem) => {
      stackNavigation.navigate('TestResult', {
        testId: item.testId,
        attemptId: item.attemptId,
      });
    },
    [stackNavigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: StudentResultItem }) => (
      <ResultCard
        item={item}
        onPress={() => handleResultPress(item)}
      />
    ),
    [handleResultPress],
  );

  const keyExtractor = useCallback(
    (item: StudentResultItem) => item.attemptId,
    [],
  );

  // ── Trend Chart Header ────────────────────────────────────────────────

  const trendHeader = useMemo(() => {
    // ── Loading state ──────────────────────────────────────────────────
    if (trendLoading && !trendData) {
      return (
        <View style={styles.trendLoadingContainer}>
          <ShimmerBlock width="40%" height={14} borderRadius={4} />
          <View style={{ height: spacing[12] }} />
          <ShimmerBlock width="100%" height={180} borderRadius={16} />
        </View>
      );
    }

    // ── Error state with retry ─────────────────────────────────────────
    if (trendError) {
      console.log('[MyResultsScreen] Score trend RPC error:', trendError);
      return (
        <View style={[styles.trendErrorContainer]}>
          <Text style={styles.trendErrorTitle}>Score Trend</Text>
          <View style={styles.trendErrorBody}>
            <Icon name="bell" color={colors.error} width={24} height={24} />
            <Text style={styles.trendErrorText}>
              Could not load performance trend.
            </Text>
            <TouchableOpacity
              style={styles.trendRetryButton}
              onPress={() => trendRefetch()}
              activeOpacity={0.7}
            >
              <Text style={styles.trendRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── Empty state (fewer than 2 released results) ────────────────────
    if (!trendData || trendData.length < 2) {
      return (
        <View style={styles.trendEmptyContainer}>
          <Text style={styles.trendEmptyTitle}>Score Trend</Text>
          <View style={styles.trendEmptyBody}>
            <View style={styles.trendEmptyIconContainer}>
              <Icon name="bar-chart-2" color={palette.slate300} width={28} height={28} />
            </View>
            <Text style={styles.trendEmptyHeading}>Not Enough Data</Text>
            <Text style={styles.trendEmptyText}>
              Complete more mock tests to view your performance trend.
            </Text>
          </View>
        </View>
      );
    }

    // ── Chart ──────────────────────────────────────────────────────────
    return <ScoreTrendChart data={trendData} />;
  }, [trendData, trendLoading, trendError, trendRefetch]);

  const listHeader = useMemo(() => {
    return (
      <View style={styles.listHeaderContainer}>
        {results && results.length > 0 && <ResultsStatsHub results={results} />}
        
        <View style={styles.chartWrapper}>
          <Text style={styles.dashboardSectionTitle}>Score Progression</Text>
          {trendHeader}
        </View>
        
        {results && results.length > 0 && (
          <Text style={[styles.dashboardSectionTitle, { marginTop: spacing[12] }]}>
            Recent Attempts
          </Text>
        )}
      </View>
    );
  }, [results, trendHeader]);

  // ── Loading State ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header safeAreaTop={insets.top} onBackPress={handleBackPress} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerStateText}>Loading your results...</Text>
        </View>
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────

  if (error) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header safeAreaTop={insets.top} onBackPress={handleBackPress} />
        <View style={styles.centerState}>
          <Icon name="bell" color={colors.error} width={40} height={40} />
          <Text style={[styles.centerStateText, { color: colors.error, marginTop: spacing[12] }]}>
            Failed to load results. Pull down to retry.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  const headerHeight = insets.top + spacing[12] + 40 + spacing[12] + 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Header safeAreaTop={insets.top} onBackPress={handleBackPress} />

      <FlatList
        data={results ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing[16],
          paddingHorizontal: spacing[16],
          paddingBottom: spacing[32],
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
              trendRefetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyState />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

function formatDate(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return `${dateStr}, ${timeStr}`;
  } catch {
    return isoTimestamp;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.heading3,
    fontSize: 20,
    fontWeight: '700',
    color: palette.slate800,
    lineHeight: 28,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
  },
  centerStateText: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate500,
    textAlign: 'center',
    marginTop: spacing[16],
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing[16],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[24],
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  retryButtonText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  separator: {
    height: spacing[12],
  },
  listHeaderContainer: {
    marginBottom: spacing[16],
    gap: spacing[20],
  },
  statsHubContainer: {
    gap: spacing[8],
  },
  dashboardSectionTitle: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: palette.slate800,
    letterSpacing: -0.15,
  },
  statsHubRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  hubCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  hubIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  hubValue: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
    color: palette.slate800,
  },
  hubLabel: {
    ...typography.caption,
    fontSize: 10,
    color: palette.slate500,
    marginTop: 2,
    textAlign: 'center',
  },
  chartWrapper: {
    gap: spacing[8],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  cardInfoGroup: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '600',
    color: palette.slate800,
    lineHeight: 20,
  },
  cardDate: {
    ...typography.caption,
    fontSize: 12,
    color: palette.slate500,
    lineHeight: 16,
  },
  percentageBadge: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    marginTop: spacing[12],
  },
  metricItem: {
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: palette.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.slate800,
  },
  metricMax: {
    fontSize: 11,
    fontWeight: '500',
    color: palette.slate400,
  },
  // ── Empty State ───────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[48],
    paddingHorizontal: spacing[32],
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[16],
  },
  emptyTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate700,
    marginBottom: spacing[8],
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate500,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ── Score Trend ────────────────────────────────────────────────────
  trendLoadingContainer: {
    marginBottom: spacing[16],
    paddingHorizontal: spacing[4],
  },
  trendErrorContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  trendErrorTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: palette.slate800,
    marginBottom: spacing[12],
  },
  trendErrorBody: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    gap: spacing[8],
  },
  trendErrorText: {
    ...typography.body,
    fontSize: 13,
    color: palette.slate500,
    textAlign: 'center',
  },
  trendRetryButton: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  trendRetryText: {
    ...typography.button,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trendEmptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  trendEmptyTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: palette.slate800,
    marginBottom: spacing[16],
  },
  trendEmptyBody: {
    alignItems: 'center',
    paddingVertical: spacing[20],
    gap: spacing[8],
  },
  trendEmptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  trendEmptyHeading: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: palette.slate700,
  },
  trendEmptyText: {
    ...typography.body,
    fontSize: 13,
    color: palette.slate500,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing[16],
  },
});
