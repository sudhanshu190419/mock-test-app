/**
 * CourseBatchDetailScreen
 *
 * Shows the subject batches available within a course assigned to the
 * student's batch. Each subject batch is a learning track (e.g. Physics,
 * Chemistry, Biology) that the student can enter.
 *
 * Navigation: MyCourses → CourseBatchDetail → SubjectDashboard
 *
 * @module screens/courses/CourseBatchDetailScreen
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDashboard } from '../../hooks/useDashboard';
import { getCourseBatches } from '../../services/student/studentDashboardService';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { SubjectBatch } from '../../types/studentDashboard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/home/Icons';

type ScreenRouteProp = RouteProp<AppStackParamList, 'CourseBatchDetail'>;

// ─── Colour Palette ─────────────────────────────────────────────────────────

const BACK_BG = '#F1F5F9';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#475569';
const TEXT_MUTED = '#94A3B8';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const ACCENT_GREEN = '#05C46B';

// ─── Batch Emoji Map ──────────────────────────────────────────────────────
// Batches are treated as subjects (Physics Batch, Chemistry Batch).
// Emoji/color derived from the batch name.

function getBatchEmoji(batchName: string): string {
  const c = batchName.toLowerCase();
  if (c.includes('phy') || c === 'physics') return '📘';
  if (c.includes('chem') || c === 'chemistry') return '🧪';
  if (c.includes('bio') || c === 'biology') return '🧬';
  if (c.includes('math')) return '📐';
  if (c.includes('eng')) return '📖';
  return '📚';
}

function getBatchColor(batchName: string): string {
  const c = batchName.toLowerCase();
  if (c.includes('phy') || c === 'physics') return '#3B82F6';
  if (c.includes('chem') || c === 'chemistry') return '#8B5CF6';
  if (c.includes('bio') || c === 'biology') return '#22C55E';
  if (c.includes('math')) return '#F97316';
  if (c.includes('eng')) return '#EC4899';
  return '#64748B';
}

// ─── Batch Card ─────────────────────────────────────────────────────────────

interface BatchCardProps {
  batch: SubjectBatch;
  index: number;
  onOpen: (batchId: string, batchName: string) => void;
}

const BatchCard = React.memo(function BatchCard({
  batch,
  index,
  onOpen,
}: BatchCardProps): React.JSX.Element {
  const batchEmoji = useMemo(() => getBatchEmoji(batch.subjectName), [batch.subjectName]);
  const batchColor = useMemo(() => getBatchColor(batch.subjectName), [batch.subjectName]);

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80).duration(350)}
      style={styles.batchCard}
    >
      <View style={[styles.batchAccentLine, { backgroundColor: batchColor }]} />
      <View style={styles.batchCardInner}>
        {/* Top Row: Emoji + Name + Teacher */}
        <View style={styles.batchTopRow}>
          <View style={[styles.batchEmojiContainer, { backgroundColor: `${batchColor}15` }]}>
            <Text style={styles.batchEmoji}>{batchEmoji}</Text>
          </View>
          <View style={styles.batchInfo}>
            <Text style={styles.batchName}>{batch.subjectName}</Text>
            {batch.teacherName ? (
              <View style={styles.teacherRow}>
                <Icon name="user" color={TEXT_SECONDARY} width={11} height={11} />
                <Text style={styles.teacherText} numberOfLines={1}>
                  {batch.teacherName}
                </Text>
              </View>
            ) : (
              <Text style={styles.teacherText}>Teacher not assigned</Text>
            )}
          </View>
        </View>

        {/* Bottom Row: Open Button */}
        <View style={styles.batchBottomRow}>
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => onOpen(batch.subjectId, batch.subjectName)}
            activeOpacity={0.8}
            accessibilityLabel={`Open ${batch.subjectName}`}
          >
            <Text style={styles.openButtonText}>Open</Text>
            <Icon name="arrow-right" color="#FFFFFF" width={13} height={13} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

BatchCard.displayName = 'BatchCard';

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function CourseBatchDetailScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<ScreenRouteProp>();
  const { courseId } = route.params;
  const { data: studentDashboard } = useDashboard();

  const [batchList, setBatchList] = useState<SubjectBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const course = useMemo(
    () => studentDashboard?.assignedCourses.find((c) => c.courseId === courseId) ?? null,
    [studentDashboard?.assignedCourses, courseId],
  );

  // Fetch batches assigned to this course
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const batches = await getCourseBatches(courseId);
        if (!cancelled) {
          setBatchList(batches);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load batches');
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [courseId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenBatch = useCallback(
    (batchId: string, batchName: string) => {
      navigation.navigate('SubjectDashboard', {
        courseId,
        subjectId: batchId,
        subjectName: batchName,
      });
    },
    [navigation, courseId],
  );

  // ── Loading State ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" color={TEXT_PRIMARY} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading subjects…</Text>
        </View>
      </View>
    );
  }

  // ── Error State ───────────────────────────────────────────────────
  if (loadError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" color={TEXT_PRIMARY} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorDescription}>{loadError}</Text>
        </View>
      </View>
    );
  }

  // ── No Course ─────────────────────────────────────────────────────
  if (!course) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" color={TEXT_PRIMARY} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🔒</Text>
          <Text style={styles.errorTitle}>Course Unavailable</Text>
          <Text style={styles.errorDescription}>
            This course could not be found.
          </Text>
        </View>
      </View>
    );
  }

  // ── Main Content ─────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" color={TEXT_PRIMARY} width={20} height={20} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{course.title}</Text>
          <Text style={styles.headerSubtitle}>
            {batchList.length} Subject{batchList.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing[24],
        }}
      >
        {/* Course Info Card */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.courseInfoCard}>
          <View style={styles.courseInfoRow}>
            <View style={styles.courseInfoDot} />
            <View style={styles.courseInfoTextBlock}>
              <Text style={styles.courseInfoLabel}>Course</Text>
              <Text style={styles.courseInfoTitle} numberOfLines={2}>
                {course.title}
              </Text>
              {course.instructorName && (
                <Text style={styles.courseInfoInstructor}>
                  by {course.instructorName}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select a Subject</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a subject to start learning
          </Text>
        </View>

        {/* Batch Cards */}
        {batchList.length === 0 ? (
          <View style={styles.emptyBatches}>
            <Text style={styles.emptyBatchesEmoji}>📚</Text>
            <Text style={styles.emptyBatchesTitle}>No Subjects Available</Text>
            <Text style={styles.emptyBatchesDescription}>
              This course doesn't have any subjects assigned yet.
            </Text>
          </View>
        ) : (
          batchList.map((batch, index) => (
            <BatchCard
              key={batch.subjectId}
              batch={batch}
              index={index}
              onOpen={handleOpenBatch}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  // ── Header ───────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BACK_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_MUTED,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Loading ──────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Error ────────────────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: spacing[12],
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: spacing[4],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  errorDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Course Info ──────────────────────────────────────────────────
  courseInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing[16],
    marginTop: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    ...Platform.select({
      ios: {
        shadowColor: TEXT_PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  courseInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  courseInfoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT_GREEN,
    marginTop: 5,
  },
  courseInfoTextBlock: {
    flex: 1,
  },
  courseInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: ACCENT_GREEN,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  courseInfoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  courseInfoInstructor: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_SECONDARY,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Section Header ───────────────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    paddingBottom: spacing[12],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_MUTED,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Batch Cards ──────────────────────────────────────────────────
  batchCard: {
    flexDirection: 'row',
    marginHorizontal: spacing[16],
    marginBottom: spacing[8],
    backgroundColor: CARD_BG,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    ...Platform.select({
      ios: {
        shadowColor: TEXT_PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  batchAccentLine: {
    width: 4,
  },
  batchCardInner: {
    flex: 1,
    padding: spacing[12],
  },
  batchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginBottom: spacing[8],
  },
  batchEmojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  batchInfo: {
    flex: 1,
  },
  batchName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  teacherText: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_SECONDARY,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  batchBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing[8],
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing[12],
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  openButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Empty Batches ────────────────────────────────────────────────
  emptyBatches: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    paddingVertical: spacing[32],
  },
  emptyBatchesEmoji: {
    fontSize: 40,
    marginBottom: spacing[8],
  },
  emptyBatchesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: spacing[4],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  emptyBatchesDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
});
