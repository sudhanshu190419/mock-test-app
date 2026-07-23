/**
 * SubjectDashboardScreen — Study Material & Assigned Mock Tests
 *
 * Acts as the learning workspace entry point for a specific subject
 * within a course. Shows:
 * - Study Material (content assigned to this batch via `batch_contents`)
 * - Assigned Mock Tests
 *
 * Future phases will add:
 * - Live Classes
 * - Assignments
 * - Course Announcements
 *
 * Navigation: CourseBatchDetail → SubjectDashboard
 *
 * @module screens/courses/SubjectDashboardScreen
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,

  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getAssignedMockTests, getBatchContent } from '../../services/student/studentDashboardService';
import type { AssignedMockTestItem, BatchContentItem } from '../../services/student/studentDashboardService';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../../components/home/Icons';

// ─── Colour Palette ─────────────────────────────────────────────────────────

const COLORS = {
  screen: '#F0F9FF',
  headerBg: '#FFFFFF',
  border: '#E2E8F0',
  cardBg: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#05C46B',
  accentLight: '#E8FCF0',
  skeleton: '#F1F5F9',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
} as const;

// ─── Subject Emoji Map ──────────────────────────────────────────────────────

function getSubjectEmoji(name: string): string {
  const c = name.toLowerCase();
  if (c.includes('phy') || c === 'physics') return '📘';
  if (c.includes('chem') || c === 'chemistry') return '🧪';
  if (c.includes('bio') || c === 'biology') return '🧬';
  if (c.includes('math')) return '📐';
  if (c.includes('eng')) return '📖';
  return '📚';
}

function getSubjectColor(name: string): string {
  const c = name.toLowerCase();
  if (c.includes('phy') || c === 'physics') return COLORS.info;
  if (c.includes('chem') || c === 'chemistry') return COLORS.purple;
  if (c.includes('bio') || c === 'biology') return COLORS.accent;
  if (c.includes('math')) return '#F97316';
  if (c.includes('eng')) return '#EC4899';
  return '#64748B';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Determine if a mock test is currently available to the student.
 */
function getTestStatus(test: AssignedMockTestItem): 'available' | 'upcoming' | 'expired' {
  const now = Date.now();

  if (test.availableFrom && new Date(test.availableFrom).getTime() > now) {
    return 'upcoming';
  }
  if (test.availableUntil && new Date(test.availableUntil).getTime() < now) {
    return 'expired';
  }
  return 'available';
}

function getStatusConfig(status: 'available' | 'upcoming' | 'expired') {
  switch (status) {
    case 'available':
      return {
        label: 'Available',
        bg: COLORS.accentLight,
        text: COLORS.accent,
        icon: 'check-circle' as const,
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        bg: COLORS.warningLight,
        text: COLORS.warning,
        icon: 'timer' as const,
      };
    case 'expired':
      return {
        label: 'Expired',
        bg: COLORS.errorLight,
        text: COLORS.error,
        icon: 'minus-circle' as const,
      };
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatMarks(marks: number): string {
  return `${marks} marks`;
}

// ─── Skeleton Components ────────────────────────────────────────────────────

function SkeletonBlock({ width, height, style }: {
  width: number | string;
  height: number;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius: 6,
          backgroundColor: COLORS.skeleton,
        },
        style,
      ]}
    />
  );
}

function TestCardSkeleton() {
  return (
    <View style={styles.testCard}>
      <View style={styles.testCardSkeletonInner}>
        <SkeletonBlock width="65%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonBlock width="100%" height={12} style={{ marginBottom: 4 }} />
        <SkeletonBlock width="80%" height={12} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBlock width={60} height={22} style={{ borderRadius: 11 }} />
          <SkeletonBlock width={70} height={22} style={{ borderRadius: 11 }} />
          <SkeletonBlock width={50} height={22} style={{ borderRadius: 11 }} />
        </View>
      </View>
    </View>
  );
}

// ─── Mock Test Card ─────────────────────────────────────────────────────────

interface MockTestCardProps {
  test: AssignedMockTestItem;
  index: number;
  onPress?: (test: AssignedMockTestItem) => void;
}

const MockTestCard = React.memo(function MockTestCard({
  test,
  index,
  onPress,
}: MockTestCardProps): React.JSX.Element {
  const status = getTestStatus(test);
  const statusConfig = getStatusConfig(status);

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 60).duration(350)}
      layout={Layout.springify()}
      style={styles.testCard}
    >
      <TouchableOpacity
        onPress={() => onPress?.(test)}
        activeOpacity={0.7}
        disabled={status === 'expired'}
        style={styles.testCardTouchable}
      >
        {/* Top Row: Title + Status Badge */}
        <View style={styles.testCardHeader}>
          <Text style={styles.testTitle} numberOfLines={2}>
            {test.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.text }]} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Description */}
        {test.description ? (
          <Text style={styles.testDescription} numberOfLines={2}>
            {test.description}
          </Text>
        ) : null}

        {/* Metadata Pills */}
        <View style={styles.metaPills}>
          {/* Duration */}
          <View style={styles.metaPill}>
            <Icon name="timer" color={COLORS.textSecondary} width={12} height={12} />
            <Text style={styles.metaPillText}>{formatDuration(test.durationMin)}</Text>
          </View>

          {/* Total Marks */}
          <View style={styles.metaPill}>
            <Icon name="star" color={COLORS.textSecondary} width={12} height={12} />
            <Text style={styles.metaPillText}>{formatMarks(test.totalMarks)}</Text>
          </View>

          {/* Question Count */}
          {test.questionCount > 0 && (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{test.questionCount} Q</Text>
            </View>
          )}

          {/* Negative Marking */}
          {test.negativeMarking > 0 && (
            <View style={styles.metaPill}>
              <Icon name="minus-circle" color={COLORS.textSecondary} width={12} height={12} />
              <Text style={styles.metaPillText}>-{test.negativeMarking}</Text>
            </View>
          )}

          {/* Attempt Limit */}
          {test.attemptLimit !== null && (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>Attempts: {test.attemptLimit}</Text>
            </View>
          )}

          {/* Test Type */}
          {test.testType && test.testType !== 'practice' && (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>
                {test.testType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </View>
          )}
        </View>

        {/* Start Button (only for available tests) */}
        {status === 'available' && (
          <View style={styles.startButtonRow}>
            <View style={styles.startButton}>
              <Text style={styles.startButtonText}>Start Test</Text>
              <Icon name="arrow-right" color="#FFFFFF" width={13} height={13} />
            </View>
          </View>
        )}

        {/* Upcoming date info */}
        {status === 'upcoming' && test.availableFrom && (
          <View style={styles.dateInfoRow}>
            <Icon name="calendar" color={COLORS.warning} width={12} height={12} />
            <Text style={[styles.dateInfoText, { color: COLORS.warning }]}>
              Available from {new Date(test.availableFrom).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}

        {/* Assigned date */}
        {test.assignedAt && (
          <View style={styles.assignedDateRow}>
            <Text style={styles.assignedDateText}>
              Assigned on {new Date(test.assignedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

MockTestCard.displayName = 'MockTestCard';

// ─── Content Type Helpers ──────────────────────────────────────────────────

function getContentIcon(contentType: string): string {
  switch (contentType) {
    case 'video': return '🎥';
    case 'pdf': return '📄';
    case 'notes': return '📝';
    case 'assignment': return '📋';
    default: return '📄';
  }
}

function getContentColor(contentType: string): string {
  switch (contentType) {
    case 'video': return '#8B5CF6';
    case 'pdf': return '#EF4444';
    case 'notes': return '#3B82F6';
    case 'assignment': return '#F97316';
    default: return '#64748B';
  }
}

function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || bytes === 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatContentDuration(seconds: number | null): string | null {
  if (seconds === null || seconds === 0) return null;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

// ─── Content Card ───────────────────────────────────────────────────────────

interface ContentCardProps {
  item: BatchContentItem;
  index: number;
  onPress?: (item: BatchContentItem) => void;
}

const ContentCard = React.memo(function ContentCard({
  item,
  index,
  onPress,
}: ContentCardProps): React.JSX.Element {
  const emoji = getContentIcon(item.contentType);
  const accentColor = getContentColor(item.contentType);

  // Format metadata string
  const metaParts: string[] = [];
  if (item.contentType === 'video' && item.durationSeconds) {
    metaParts.push(formatContentDuration(item.durationSeconds) ?? '');
  } else if (item.contentType === 'pdf' && item.pageCount) {
    metaParts.push(`${item.pageCount} page${item.pageCount !== 1 ? 's' : ''}`);
  } else {
    const size = formatFileSize(item.fileSizeBytes);
    if (size) metaParts.push(size);
  }
  const metaLabel = metaParts.filter(Boolean).join(' · ');

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 60).duration(350)}
      layout={Layout.springify()}
      style={styles.contentCard}
    >
      <TouchableOpacity
        onPress={() => onPress?.(item)}
        activeOpacity={0.7}
        style={styles.contentCardTouchable}
      >
        {/* Section Name Header (when available) */}
        {item.sectionName ? (
          <View style={styles.sectionHeaderBar}>
            <View style={[styles.sectionDot, { backgroundColor: accentColor }]} />
            <Text style={styles.sectionHeaderText}>{item.sectionName}</Text>
          </View>
        ) : null}

        <View style={styles.contentCardInner}>
          {/* Type Icon */}
          <View style={[styles.contentTypeIcon, { backgroundColor: `${accentColor}12` }]}>
            <Text style={styles.contentTypeEmoji}>{emoji}</Text>
          </View>

          {/* Info */}
          <View style={styles.contentCardInfo}>
            <Text style={styles.contentCardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={styles.contentCardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {/* Bottom Row: Type badge + Metadata */}
            <View style={styles.contentCardMetaRow}>
              <View style={[styles.contentTypeBadge, { backgroundColor: `${accentColor}12` }]}>
                <Text style={[styles.contentTypeBadgeText, { color: accentColor }]}>
                  {item.contentType}
                </Text>
              </View>
              {metaLabel ? (
                <Text style={styles.contentCardMetaText}>{metaLabel}</Text>
              ) : null}
              {item.isOptional ? (
                <Text style={styles.optionalBadgeText}>Optional</Text>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

ContentCard.displayName = 'ContentCard';

// ═══════════════════════════════════════════════════════════════════════════
//  Screen
// ═══════════════════════════════════════════════════════════════════════════

export default function SubjectDashboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'SubjectDashboard'>>();
  const { subjectName, subjectId } = route.params;

  const [mockTests, setMockTests] = useState<AssignedMockTestItem[]>([]);
  const [contentItems, setContentItems] = useState<BatchContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const subjectEmoji = getSubjectEmoji(subjectName);
  const subjectColor = getSubjectColor(subjectName);

  // Fetch assigned content and mock tests for this batch
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setLoadError(null);

      const [content, tests] = await Promise.all([
        getBatchContent(subjectId),
        getAssignedMockTests(subjectId),
      ]);
      setContentItems(content);
      setMockTests(tests);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContentPress = useCallback(
    (item: BatchContentItem) => {
      navigation.navigate('ContentViewer', {
        contentId: item.contentId,
        contentType: item.contentType,
        storageBucket: item.storageBucket,
        storagePath: item.storagePath,
        title: item.title,
      });
    },
    [navigation],
  );

  const handleTestPress = useCallback(
    (test: AssignedMockTestItem) => {
      navigation.navigate('TestInstructions', {
        examTitle: subjectName,
        year: new Date().getFullYear().toString(),
        displayLabel: test.title,
        durationMin: test.durationMin,
        questions: test.questionCount,
        totalMarks: test.totalMarks,
        negativeMarking: test.negativeMarking,
        testId: test.testId,
        paperId: test.testId,
      });
    },
    [navigation, subjectName],
  );

  // ── Derived Data ───────────────────────────────────────────────────────
  const availableCount = useMemo(
    () => mockTests.filter((t) => getTestStatus(t) === 'available').length,
    [mockTests],
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}15` }]}>
            <Text style={styles.subjectBadgeText}>{subjectEmoji}</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {subjectName}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isLoading && !isRefreshing ? (
        <View style={styles.contentContainer}>
          {/* Subject Info Skeleton */}
          <View style={styles.subjectInfoSection}>
            <View style={styles.subjectInfoCard}>
              <SkeletonBlock width={48} height={48} style={{ borderRadius: 14 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBlock width="60%" height={18} />
                <SkeletonBlock width="40%" height={12} />
                <SkeletonBlock width="30%" height={12} />
              </View>
            </View>
          </View>

          {/* Section Header Skeleton */}
          <View style={styles.sectionHeader}>
            <SkeletonBlock width={160} height={18} style={{ marginBottom: 4 }} />
            <SkeletonBlock width={100} height={12} />
          </View>

          {/* Cards Skeleton */}
          <View style={styles.listContainer}>
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
          </View>
        </View>
      ) : loadError ? (
        <View style={styles.contentContainer}>
          <View style={styles.errorState}>
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorEmoji}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Failed to Load</Text>
            <Text style={styles.errorDescription}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchData()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
          contentContainerStyle={{
            paddingBottom: insets.bottom + spacing[24],
          }}
        >
          {/* ── Subject Info Banner ──────────────────────────────── */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.subjectInfoSection}
          >
            <View style={styles.subjectInfoCard}>
              <View style={[styles.subjectEmojiContainer, { backgroundColor: `${subjectColor}15` }]}>
                <Text style={styles.subjectEmojiLarge}>{subjectEmoji}</Text>
              </View>
              <View style={styles.subjectInfoText}>
                <Text style={styles.subjectInfoTitle}>{subjectName}</Text>
                <Text style={styles.subjectInfoSubtitle}>
                  {contentItems.length} Module{contentItems.length !== 1 ? 's' : ''} · {mockTests.length} Test{mockTests.length !== 1 ? 's' : ''}
                </Text>
                {availableCount > 0 && (
                  <View style={styles.availableCountRow}>
                    <View style={[styles.availableDot, { backgroundColor: COLORS.accent }]} />
                    <Text style={styles.availableCountText}>
                      {availableCount} Test{availableCount !== 1 ? 's' : ''} Available
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* ── Study Material Section ─────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(300)}
            style={styles.sectionHeader}
          >
            <Text style={styles.sectionTitle}>Study Material</Text>
            <Text style={styles.sectionSubtitle}>
              Content assigned to your {subjectName} batch
            </Text>
          </Animated.View>

          {/* ── Content Cards or Empty State ────────────────────── */}
          {contentItems.length === 0 ? (
            <Animated.View
              entering={FadeInDown.delay(150).duration(350)}
              style={styles.emptyState}
            >
              <View style={[styles.emptyIconContainer, { backgroundColor: `${COLORS.info}15` }]}>
                <Text style={styles.emptyEmoji}>📖</Text>
              </View>
              <Text style={styles.emptyTitle}>No Study Material Yet</Text>
              <Text style={styles.emptyDescription}>
                No content has been assigned to your {subjectName} batch yet.
                Check back later when your institute publishes new material.
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.listContainer}>
              {contentItems.map((item, index) => (
                <ContentCard
                  key={item.contentId}
                  item={item}
                  index={index}
                  onPress={handleContentPress}
                />
              ))}
            </View>
          )}

          {/* ── Mock Tests Section Header ──────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(160 + contentItems.length * 60).duration(300)}
            style={styles.sectionHeader}
          >
            <Text style={styles.sectionTitle}>Assigned Mock Tests</Text>
            <Text style={styles.sectionSubtitle}>
              Tests assigned to your {subjectName} batch
            </Text>
          </Animated.View>

          {/* ── Mock Test Cards or Empty State ───────────────────── */}
          {mockTests.length === 0 ? (
            <Animated.View
              entering={FadeInDown.delay(150).duration(350)}
              style={styles.emptyState}
            >
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyEmoji}>📝</Text>
              </View>
              <Text style={styles.emptyTitle}>No Mock Tests Assigned</Text>
              <Text style={styles.emptyDescription}>
                No mock tests have been assigned to your {subjectName} batch yet.
                Check back later when your institute publishes new tests.
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.listContainer}>
              {mockTests.map((test, index) => (
                <MockTestCard
                  key={test.assignmentId}
                  test={test}
                  index={index}
                  onPress={handleTestPress}
                />
              ))}
            </View>
          )}

          {/* ── Future Feature Previews ──────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(400 + mockTests.length * 60).duration(350)}
            style={styles.futureFeaturesSection}
          >
            <Text style={styles.futureFeaturesTitle}>Coming Soon</Text>
            <View style={styles.futureFeaturesRow}>
              <View style={styles.futureFeaturePill}>
                <Text style={styles.futureFeatureEmoji}>🎥</Text>
                <Text style={styles.futureFeatureText}>Live Classes</Text>
              </View>
              <View style={styles.futureFeaturePill}>
                <Text style={styles.futureFeatureEmoji}>📊</Text>
                <Text style={styles.futureFeatureText}>Assignments</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.screen,
  },
  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.headerBg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[8],
  },
  subjectBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectBadgeText: {
    fontSize: 14,
    lineHeight: 18,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Content Container ───────────────────────────────────────────────
  contentContainer: {
    flex: 1,
  },
  // ── Subject Info ────────────────────────────────────────────────────
  subjectInfoSection: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
  },
  subjectInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
    backgroundColor: COLORS.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: COLORS.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  subjectEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectEmojiLarge: {
    fontSize: 24,
    lineHeight: 30,
  },
  subjectInfoText: {
    flex: 1,
  },
  subjectInfoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  subjectInfoSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  availableCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availableCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Section Header ──────────────────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    paddingBottom: spacing[12],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── List Container ──────────────────────────────────────────────────
  listContainer: {
    paddingHorizontal: spacing[16],
    gap: spacing[12],
  },
  // ── Test Card ───────────────────────────────────────────────────────
  testCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  testCardSkeletonInner: {
    padding: spacing[16],
  },
  testCardTouchable: {
    padding: spacing[16],
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[8],
    marginBottom: spacing[8],
  },
  testTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  testDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: spacing[12],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing[8],
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  startButtonRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing[12],
    alignItems: 'flex-end',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: spacing[16],
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  dateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing[8],
  },
  dateInfoText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  assignedDateRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing[8],
    marginTop: spacing[4],
  },
  assignedDateText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Empty State ─────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    paddingVertical: spacing[32],
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[12],
    ...Platform.select({
      ios: {
        shadowColor: COLORS.textPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  emptyEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: spacing[8],
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  emptyDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Content Card ────────────────────────────────────────────────────
  contentCardTouchable: {
    flex: 1,
  },
  contentCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  contentCardInner: {
    flexDirection: 'row',
    padding: spacing[12],
    gap: spacing[12],
  },
  contentTypeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTypeEmoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  contentCardInfo: {
    flex: 1,
  },
  contentCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  contentCardDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: 3,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  contentCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  contentTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contentTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  contentCardMetaText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  optionalBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.warning,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Content Section Header Bar ─────────────────────────────────────
  sectionHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[12],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Error State ─────────────────────────────────────────────────────
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    paddingVertical: spacing[40],
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[12],
  },
  errorEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: spacing[8],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  errorDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing[16],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  retryButton: {
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[8],
    borderRadius: radius.md,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Future Features Preview ──────────────────────────────────────────
  futureFeaturesSection: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
  },
  futureFeaturesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing[12],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  futureFeaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  futureFeaturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  futureFeatureEmoji: {
    fontSize: 14,
  },
  futureFeatureText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
});
