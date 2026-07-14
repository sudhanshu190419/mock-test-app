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
  const formattedReleased = item.releasedAt ? formatDate(item.releasedAt) : 'N/A';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${item.testTitle}, Score: ${item.score} out of ${item.maxScore}, ${item.percentage.toFixed(1)}%`}
      accessibilityRole="button"
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardIconContainer}>
          <Icon name="clipboard-list" color={colors.primary} width={22} height={22} />
        </View>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.testTitle}
          </Text>
          <Text style={styles.cardDate}>{formattedDate}</Text>
        </View>
        <Icon name="chevron-right" color={palette.slate300} width={20} height={20} />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardStats}>
        {/* Score */}
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Score</Text>
          <Text style={styles.cardStatValue}>
            {item.score}
            <Text style={styles.cardStatMax}>/{item.maxScore}</Text>
          </Text>
        </View>

        {/* Percentage */}
        <View style={styles.cardStatDivider} />
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Percentage</Text>
          <Text style={[styles.cardStatValue, styles.cardStatPercent]}>
            {item.percentage.toFixed(1)}%
          </Text>
        </View>

        {/* Released */}
        <View style={styles.cardStatDivider} />
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Released</Text>
          <Text style={[styles.cardStatValue, styles.cardStatSmall]}>
            {formattedReleased}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
        ListHeaderComponent={trendHeader}
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
  // ── Card ──────────────────────────────────────────────────────────
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
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 105, 72, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleGroup: {
    flex: 1,
    gap: 2,
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
  cardDivider: {
    height: 1,
    backgroundColor: palette.slate100,
    marginVertical: spacing[12],
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardStat: {
    flex: 1,
    alignItems: 'center',
  },
  cardStatLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: palette.slate500,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing[4],
  },
  cardStatValue: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: palette.slate800,
  },
  cardStatMax: {
    fontSize: 12,
    fontWeight: '500',
    color: palette.slate300,
  },
  cardStatPercent: {
    color: colors.primary,
  },
  cardStatSmall: {
    fontSize: 11,
    fontWeight: '500',
    color: palette.slate500,
  },
  cardStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: palette.slate200,
    marginHorizontal: spacing[8],
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
