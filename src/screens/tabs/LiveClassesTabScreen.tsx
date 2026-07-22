/**
 * LiveClassesTabScreen — Student Live Classes Dashboard
 *
 * Displays live classes assigned to the student's active batches with
 * three tabs: Upcoming, Live Now, and Completed.
 *
 * ## Data Flow
 *
 * ```
 * Student (via useDashboard)
 *   ↓ batches[] (from DashboardProvider)
 * getStudentUpcomingClasses(batchIds)
 * getStudentLiveNowClasses(batchIds)
 * getStudentCompletedClasses(batchIds)
 *   ↓
 * Three-tab FlatList
 * ```
 *
 * ## States
 *
 * - **Loading:  ** Skeleton placeholders
 * - **Empty:    ** Clean illustration with contextual message per tab
 * - **Error:    ** Retry button + error message
 * - **Populated:** Premium card list with pull-to-refresh
 *
 * @module screens/tabs/LiveClassesTabScreen
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from '../../components/home/Icons';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useDashboard } from '../../hooks/useDashboard';
import {
  getStudentUpcomingClasses,
  getStudentLiveNowClasses,
  getStudentCompletedClasses,
  type StudentLiveClassItem,
} from '../../services/student/studentLiveClassService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════════════

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL_MARGIN = spacing[16];
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;

type TabKey = 'upcoming' | 'live' | 'completed';

interface TabDefinition {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDefinition[] = [
  {
    key: 'upcoming',
    label: 'Upcoming',
    icon: <Icon name="calendar" color="#475569" width={14} height={14} />,
  },
  {
    key: 'live',
    label: 'Live Now',
    icon: <Icon name="play-circle" color="#475569" width={14} height={14} />,
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: <Icon name="check-circle" color="#475569" width={14} height={14} />,
  },
];

// ─── Status Badge Config ─────────────────────────────────────────────────

interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

function getStatusBadge(status: StudentLiveClassItem['status'], sessionStatus: string | null): BadgeConfig {
  if (status === 'live') {
    return {
      label: sessionStatus === 'live' ? 'LIVE' : 'LIVE',
      bg: 'rgba(5, 196, 107, 0.12)',
      text: '#059669',
      dot: '#05C46B',
    };
  }
  if (status === 'scheduled') {
    return {
      label: 'UPCOMING',
      bg: 'rgba(2, 132, 199, 0.10)',
      text: '#0284C7',
      dot: '#0284C7',
    };
  }
  if (status === 'completed') {
    return {
      label: 'COMPLETED',
      bg: 'rgba(100, 116, 139, 0.10)',
      text: '#64748B',
      dot: '#94A3B8',
    };
  }
  // cancelled
  return {
    label: 'CANCELLED',
    bg: 'rgba(220, 38, 38, 0.08)',
    text: '#DC2626',
    dot: '#DC2626',
  };
}

// ─── Date Formatting Helpers ──────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();

    const dateStr = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // If same year, omit year
    if (d.getFullYear() === today.getFullYear()) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    return dateStr;
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Animated Card
// ═══════════════════════════════════════════════════════════════════════════

type ScreenNavProp = NativeStackNavigationProp<AppStackParamList>;

interface LiveClassCardProps {
  item: StudentLiveClassItem;
  index: number;
  onPress: (item: StudentLiveClassItem) => void;
  /** Called when the Join Class button is tapped on a live item. */
  onJoinPress: (item: StudentLiveClassItem) => void;
}

const LiveClassCard = React.memo(function LiveClassCard({
  item,
  index,
  onPress,
  onJoinPress,
}: LiveClassCardProps) {
  const badge = getStatusBadge(item.status, item.sessionStatus);
  const entranceDelay = 50 * index;

  const entrance = useSharedValue(0);

  useEffect(() => {
    entrance.value = withDelay(entranceDelay, withTiming(1, { duration: 300 }));
  }, [entrance, entranceDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateY: interpolate(entrance.value, [0, 1], [12, 0], Extrapolation.CLAMP) },
      { scale: interpolate(entrance.value, [0, 1], [0.96, 1], Extrapolation.CLAMP) },
    ],
  }));

  const isLive = item.status === 'live';
  const isCancelled = item.status === 'cancelled';

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} — ${badge.label}`}
      >
        {/* Top Bar: Status Badge + Duration */}
        <View style={styles.cardTopBar}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            {isLive && (
              <View style={[styles.liveDot, { backgroundColor: badge.dot }]} />
            )}
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>

          <View style={styles.durationRow}>
            <Icon name="timer" color="#94A3B8" width={12} height={12} />
            <Text style={styles.durationText}>
              {formatDuration(item.durationMin)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Description (if available) */}
        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Metadata Row: Date, Time, Batch */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="calendar" color="#94A3B8" width={12} height={12} />
            <Text style={styles.metaText}>
              {formatDate(item.scheduledAt)}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Icon name="timer" color="#94A3B8" width={12} height={12} />
            <Text style={styles.metaText}>
              {formatTime(item.scheduledAt)}
            </Text>
          </View>
        </View>

        {/* Footer: Teacher + Batch */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Icon name="user" color="#94A3B8" width={12} height={12} />
            <Text style={styles.footerText} numberOfLines={1}>
              {item.teacherName ?? 'Teacher assigned'}
            </Text>
          </View>

          <View style={styles.footerDivider} />

          <View style={styles.footerItem}>
            <Icon name="users" color="#94A3B8" width={12} height={12} />
            <Text style={styles.footerText} numberOfLines={1}>
              {item.batchName}
            </Text>
          </View>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          {isLive ? (              <TouchableOpacity
              style={styles.joinButton}
              activeOpacity={0.8}
              onPress={() => onJoinPress(item)}
              accessibilityRole="button"
              accessibilityLabel="Join class"
            >
              <Icon name="play-circle" color="#FFFFFF" width={16} height={16} />
              <Text style={styles.joinButtonText}>Join Class</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.detailsButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View details"
            >
              <Text style={styles.detailsButtonText}>View Details</Text>
              <Icon name="arrow-right" color="#0284C7" width={14} height={14} />
            </TouchableOpacity>
          )}
        </View>

        {/* Cancelled reason (if cancelled) */}
        {isCancelled && (
          <Text style={styles.cancelledReason}>
            Cancelled
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
//  Tab Content — Renders one tab's data
// ═══════════════════════════════════════════════════════════════════════════

interface TabContentProps {
  tab: TabKey;
  data: StudentLiveClassItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  refreshing: boolean;
  onCardPress: (item: StudentLiveClassItem) => void;
  onJoinPress: (item: StudentLiveClassItem) => void;
}

function TabContent({
  tab,
  data,
  isLoading,
  error,
  onRefresh,
  refreshing,
  onCardPress,
  onJoinPress,
}: TabContentProps) {
  // Initial loading state
  if (isLoading && data.length === 0) {
    return (
      <View style={styles.skeletonContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <SkeletonLoader width={CARD_WIDTH} height={180} borderRadius={radius.lg} />
          </View>
        ))}
      </View>
    );
  }

  // Error state
  if (error && data.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-triangle" color="#DC2626" width={40} height={40} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (data.length === 0) {
    const emptyMessages: Record<TabKey, { title: string; subtitle: string; icon: 'calendar' | 'play-circle' | 'check-circle' }> = {
      upcoming: {
        title: 'No upcoming classes',
        subtitle: 'Your scheduled live classes will appear here.',
        icon: 'calendar',
      },
      live: {
        title: 'No live classes right now',
        subtitle: 'When a class goes live, it will appear here.',
        icon: 'play-circle',
      },
      completed: {
        title: 'No completed classes',
        subtitle: 'Classes you have attended will appear here.',
        icon: 'check-circle',
      },
    };

    const msg = emptyMessages[tab];

    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name={msg.icon} color="#CBD5E1" width={48} height={48} />
        </View>
        <Text style={styles.emptyTitle}>{msg.title}</Text>
        <Text style={styles.emptySubtitle}>{msg.subtitle}</Text>
      </View>
    );
  }

  // Populated list
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.classId}
      renderItem={({ item, index }) => (
        <LiveClassCard
          item={item}
          index={index}
          onPress={onCardPress}
          onJoinPress={onJoinPress}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.secondary}
          colors={[colors.secondary]}
        />
      }
      ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Screen
// ═══════════════════════════════════════════════════════════════════════════

export default function LiveClassesTabScreen(): React.JSX.Element {
  const navigation = useNavigation<ScreenNavProp>();
  const { data, batches, isLoading: isDashboardLoading } = useDashboard();

  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [upcomingData, setUpcomingData] = useState<StudentLiveClassItem[]>([]);
  const [liveData, setLiveData] = useState<StudentLiveClassItem[]>([]);
  const [completedData, setCompletedData] = useState<StudentLiveClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive batch IDs from the dashboard context
  const batchIds = useMemo(
    () => batches.map((b) => b.batch.batchId),
    [batches],
  );

  // Fetch all three tabs in parallel
  const fetchAll = useCallback(
    async (showLoader = true) => {
      if (batchIds.length === 0) {
        setIsLoading(false);
        setUpcomingData([]);
        setLiveData([]);
        setCompletedData([]);
        return;
      }

      if (showLoader) setIsLoading(true);
      setError(null);

      try {
        const [upcoming, live, completed] = await Promise.all([
          getStudentUpcomingClasses(batchIds),
          getStudentLiveNowClasses(batchIds),
          getStudentCompletedClasses(batchIds),
        ]);

        setUpcomingData(upcoming);
        setLiveData(live);
        setCompletedData(completed);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load live classes.';
        setError(message);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [batchIds],
  );

  // Initial fetch when batches resolve
  useEffect(() => {
    if (!isDashboardLoading) {
      fetchAll(true);
    }
  }, [isDashboardLoading, batchIds, fetchAll]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll(false);
  }, [fetchAll]);

  // Navigate to the student live classroom when Join Class is tapped
  const handleJoinPress = useCallback(
    (item: StudentLiveClassItem) => {
      navigation.navigate('StudentLiveClassRoom', {
        classId: item.classId,
        roomName: item.roomName ?? '',
        className: item.title,
        teacherName: item.teacherName ?? 'Teacher',
        studentName: data?.profile?.name ?? 'Student'
      });
    },
    [navigation],
  );

  // Card press handler (View Details for non-live items)
  const handleCardPress = useCallback(
    (_item: StudentLiveClassItem) => {
      // Future: navigate to LiveClassDetailScreen
      // For now this is a no-op; JoinClass is handled separately via onJoinPress
    },
    [],
  );

  // Determine which data to show for the active tab
  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingData;
      case 'live':
        return liveData;
      case 'completed':
        return completedData;
    }
  }, [activeTab, upcomingData, liveData, completedData]);

  // ── Render ──────────────────────────────────────────────────────────────

  // Show a global loading state while dashboard is still resolving
  if (isDashboardLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Classes</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  // Show message when student has no active batches
  if (batchIds.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Classes</Text>
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="video" color="#CBD5E1" width={48} height={48} />
          </View>
          <Text style={styles.emptyTitle}>No batches assigned</Text>
          <Text style={styles.emptySubtitle}>
            You are not enrolled in any batch yet.{'\n'}Contact your institute
            for batch assignment.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Classes</Text>
        <Text style={styles.headerSubtitle}>
          {upcomingData.length + liveData.length + completedData.length} classes
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              {tab.icon}
              <Text
                style={[styles.tabLabel, isActive && styles.activeTabLabel]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <TabContent
        tab={activeTab}
        data={currentData}
        isLoading={isLoading}
        error={error}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onCardPress={handleCardPress}
        onJoinPress={handleJoinPress}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[12],
    paddingBottom: spacing[16],
  },
  headerTitle: {
    ...typography.heading2,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing[4],
  },

  // ── Tab Bar ─────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing[16],
    marginBottom: spacing[16],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
  },
  activeTab: {
    backgroundColor: colors.tint.blue,
  },
  tabLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  activeTabLabel: {
    color: colors.secondary,
    fontWeight: '700',
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  cardTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  durationText: {
    ...typography.caption,
    color: '#94A3B8',
  },
  cardTitle: {
    ...typography.title,
    fontSize: 17,
    color: colors.text.primary,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[4],
  },
  cardDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[8],
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[8],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  metaText: {
    ...typography.caption,
    color: '#64748B',
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    flex: 1,
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: spacing[8],
  },
  footerText: {
    ...typography.caption,
    color: '#64748B',
    fontSize: 11,
  },
  actionRow: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
    paddingTop: spacing[4],
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: '#059669',
    borderRadius: radius.md,
    paddingVertical: spacing[12],
  },
  joinButtonText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    backgroundColor: colors.tint.blue,
    borderRadius: radius.md,
    paddingVertical: spacing[12],
  },
  detailsButtonText: {
    ...typography.buttonSmall,
    color: colors.secondary,
  },
  cancelledReason: {
    ...typography.caption,
    color: '#DC2626',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    fontStyle: 'italic',
  },

  // ── List ────────────────────────────────────────────────────────────────
  listContent: {
    paddingTop: spacing[4],
    paddingBottom: spacing[32],
  },
  listSeparator: {
    height: spacing[12],
  },

  // ── Loading / Empty / Error ────────────────────────────────────────────
  skeletonContainer: {
    paddingTop: spacing[8],
    gap: spacing[12],
    alignItems: 'center',
  },
  skeletonCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    gap: spacing[8],
  },
  emptyIconContainer: {
    opacity: 0.4,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    ...typography.title,
    color: colors.error,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    marginTop: spacing[8],
  },
  retryButtonText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
  },
});
