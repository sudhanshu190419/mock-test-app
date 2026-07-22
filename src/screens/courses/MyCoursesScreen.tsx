/**
 * MyCoursesScreen
 *
 * Premium full-screen view of all courses assigned to the student's batch.
 * Shows premium course cards with subject batch chips and a "View Course" CTA.
 *
 * Navigation: Home → MyCourses → CourseBatchDetail → SubjectDashboard
 *
 * @module screens/courses/MyCoursesScreen
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useDashboard } from '../../hooks/useDashboard';
import { getCourseBatchNames } from '../../services/student/studentDashboardService';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { AssignedCourse } from '../../types/studentDashboard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import Icon from '../../components/home/Icons';

// ─── Colour Palette ─────────────────────────────────────────────────────────

const BACK_BG = '#F1F5F9';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#475569';
const TEXT_MUTED = '#94A3B8';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const PILL_BG = '#F8FAFC';
const PILL_BORDER = '#E2E8F0';
const ACCENT_GREEN = '#05C46B';
const BADGE_BG = '#ECFDF5';
const BADGE_TEXT = '#059669';
const CHIP_BG = '#EEF2FF';
const CHIP_TEXT = '#4338CA';
const EMPTY_BG = '#F8FAFC';
const EMPTY_BORDER = '#E2E8F0';

// ─── State ───────────────────────────────────────────────────────────────────

interface CourseBatchInfo {
  batchId: string;
  batchName: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGradient(category: string): [string, string, ...string[]] {
  const cat = category.toLowerCase();
  if (cat.includes('neet') || cat.includes('medical')) return ['#155215', '#0C3D0C'] as [string, string, ...string[]];
  if (cat.includes('jee') || cat.includes('engineering')) return ['#1E3A5F', '#15294A'] as [string, string, ...string[]];
  if (cat.includes('school') || cat.includes('class')) return ['#4A1942', '#2E0F2A'] as [string, string, ...string[]];
  if (cat.includes('clat') || cat.includes('law')) return ['#1A4A4A', '#0D2F2F'] as [string, string, ...string[]];
  return ['#1E1B4B', '#312E81'] as [string, string, ...string[]];
}

function getBatchEmoji(batchName: string): string {
  const c = batchName.toLowerCase();
  if (c.includes('phy') || c === 'physics') return '📘';
  if (c.includes('chem') || c === 'chemistry') return '🧪';
  if (c.includes('bio') || c === 'biology') return '🧬';
  if (c.includes('math')) return '📐';
  if (c.includes('eng')) return '📖';
  return '📚';
}

// ─── Course Card ────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: AssignedCourse;
  index: number;
  batchNames: CourseBatchInfo[];
  onViewCourse: (courseId: string) => void;
}

const CourseCard = React.memo(function CourseCard({
  course,
  index,
  batchNames,
  onViewCourse,
}: CourseCardProps): React.JSX.Element {
  const gradientColors = useMemo(() => getGradient(course.category), [course.category]);

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80).duration(350)}
      style={styles.cardContainer}
    >
      <View style={styles.card}>
        {/* Accent Top Bar */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardAccentBar}
        />

        <View style={styles.cardInner}>
          {/* Top Row: Thumbnail + Info */}
          <View style={styles.cardTopRow}>
            {/* Thumbnail */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardThumbnail}
            >
              <Text style={styles.cardThumbnailEmoji}>
                {course.category === 'NEET' || course.category === 'Medical'
                  ? '🔬'
                  : course.category === 'JEE' || course.category === 'Engineering'
                    ? '⚛️'
                    : '📚'}
              </Text>
            </LinearGradient>

            {/* Title and Description */}
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {course.title}
              </Text>
              {course.shortDescription && (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {course.shortDescription}
                </Text>
              )}
            </View>
          </View>

          {/* Metadata Pills */}
          <View style={styles.cardMetaRow}>
            <View style={styles.metaPill}>
              <Icon name="book-open" color={ACCENT_GREEN} width={10} height={10} />
              <Text style={styles.metaPillText}>{course.category}</Text>
            </View>

            {course.instructorName && (
              <View style={styles.metaPill}>
                <Icon name="user" color={TEXT_SECONDARY} width={10} height={10} />
                <Text style={styles.metaPillText} numberOfLines={1}>
                  {course.instructorName}
                </Text>
              </View>
            )}

            <View style={styles.metaPill}>
              <Icon name="layers" color={TEXT_SECONDARY} width={10} height={10} />
              <Text style={styles.metaPillText}>
                {course.moduleCount} Module{course.moduleCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Batch Chips — showing batches assigned to this course */}
          {batchNames.length > 0 && (
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {batchNames.length} Batch{batchNames.length !== 1 ? 'es' : ''}
                </Text>
              </View>
              {batchNames.slice(0, 5).map((b) => (
                <View key={b.batchId} style={styles.chip}>
                  <Text style={styles.chipTextEmoji}>{getBatchEmoji(b.batchName)}</Text>
                  <Text style={styles.chipText}>{b.batchName.replace(/\s*Batch$/i, '')}</Text>
                </View>
              ))}
              {batchNames.length > 5 && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>+{batchNames.length - 5}</Text>
                </View>
              )}
            </View>
          )}

          {/* Bottom Row: Badge + CTA */}
          <View style={styles.cardBottomRow}>
            <View style={styles.instituteBadge}>
              <Icon name="check-circle" color={BADGE_TEXT} width={12} height={12} />
              <Text style={styles.instituteBadgeText}>Institute Assigned</Text>
            </View>

            <TouchableOpacity
              style={styles.viewCourseButton}
              onPress={() => onViewCourse(course.courseId)}
              activeOpacity={0.8}
              accessibilityLabel={`View course: ${course.title}`}
            >
              <Text style={styles.viewCourseText}>View Course</Text>
              <Icon name="arrow-right" color="#FFFFFF" width={13} height={13} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

CourseCard.displayName = 'CourseCard';

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function MyCoursesScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: studentDashboard, isLoading, initialized } = useDashboard();

  const batches = studentDashboard?.batches ?? [];
  const currentBatch = batches.length > 0 ? batches[0] : null;
  const batchCourses = studentDashboard?.assignedCourses ?? [];

  // Fetch batch names for each course (for batch chips on cards)
  const [coursesBatchMap, setCoursesBatchMap] = useState<Record<string, CourseBatchInfo[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const map: Record<string, CourseBatchInfo[]> = {};
      for (const course of batchCourses) {
        const names = await getCourseBatchNames(course.courseId);
        if (!cancelled) {
          map[course.courseId] = names;
        }
      }
      if (!cancelled) {
        setCoursesBatchMap(map);
      }
    }

    if (batchCourses.length > 0) {
      load();
    }
    return () => { cancelled = true; };
  }, [batchCourses]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewCourse = useCallback(
    (courseId: string) => {
      navigation.navigate('CourseBatchDetail', { courseId });
    },
    [navigation],
  );

  // ── Loading State ─────────────────────────────────────────────────
  if (isLoading || !initialized) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading your courses…</Text>
        </View>
      </View>
    );
  }

  // ── No Batch State ────────────────────────────────────────────────
  if (!currentBatch) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" color={TEXT_PRIMARY} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Courses</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎓</Text>
          <Text style={styles.emptyTitle}>No Batch Assigned</Text>
          <Text style={styles.emptyDescription}>
            You are not currently assigned to any batch. Contact your institute
            to get enrolled.
          </Text>
        </View>
      </View>
    );
  }

  // ── Empty Courses State ───────────────────────────────────────────
  if (batchCourses.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" color={TEXT_PRIMARY} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Courses</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.batchInfoCard}>
          <Text style={styles.batchInfoLabel}>Your Batch</Text>
          <Text style={styles.batchInfoName}>{currentBatch.batch.name}</Text>
          <View style={styles.batchInfoMeta}>
            <View style={styles.batchInfoPill}>
              <Text style={styles.batchInfoPillText}>{currentBatch.streamName}</Text>
            </View>
            <Text style={styles.batchInfoYear}>{currentBatch.batch.academicYear}</Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No Courses Assigned</Text>
          <Text style={styles.emptyDescription}>
            Your institute hasn't assigned any courses to your batch yet.
          </Text>
        </View>
      </View>
    );
  }

  // ── Courses Available ─────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" color={TEXT_PRIMARY} width={20} height={20} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Courses</Text>
          <Text style={styles.headerSubtitle}>
            {currentBatch.batch.name} · {batchCourses.length} Course{batchCourses.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Batch Context Card */}
      <Animated.View
        entering={FadeInUp.duration(300)}
        style={styles.batchInfoCard}
      >
        <Text style={styles.batchInfoLabel}>Active Batch</Text>
        <Text style={styles.batchInfoName}>{currentBatch.batch.name}</Text>
        <View style={styles.batchInfoMeta}>
          <View style={styles.batchInfoPill}>
            <Text style={styles.batchInfoPillText}>{currentBatch.streamName}</Text>
          </View>
          <Text style={styles.batchInfoYear}>{currentBatch.batch.academicYear}</Text>
        </View>
      </Animated.View>

      {/* Course List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing[24],
        }}
      >
        {batchCourses.map((course, index) => (
          <CourseCard
            key={course.courseId}
            course={course}
            index={index}
            batchNames={coursesBatchMap[course.courseId] ?? []}
            onViewCourse={handleViewCourse}
          />
        ))}
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
  // ── Header ───────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_MUTED,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Batch Info ───────────────────────────────────────────────────
  batchInfoCard: {
    backgroundColor: '#0F172A',
    marginHorizontal: spacing[16],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.lg,
    marginBottom: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  batchInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: ACCENT_GREEN,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  batchInfoName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  batchInfoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginTop: spacing[4],
  },
  batchInfoPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  batchInfoPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: ACCENT_GREEN,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  batchInfoYear: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Empty State ──────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing[12],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: spacing[4],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  emptyDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Course Cards ─────────────────────────────────────────────────
  cardContainer: {
    paddingHorizontal: spacing[16],
    marginBottom: spacing[12],
  },
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    ...Platform.select({
      ios: {
        shadowColor: TEXT_PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  cardAccentBar: {
    height: 5,
    width: '100%',
  },
  cardInner: {
    padding: spacing[12],
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: spacing[12],
    marginBottom: spacing[8],
  },
  cardThumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardThumbnailEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  cardTextBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    lineHeight: 21,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_SECONDARY,
    lineHeight: 16,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing[8],
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PILL_BG,
    paddingHorizontal: spacing[8],
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing[8],
  },
  chip: {
    backgroundColor: CHIP_BG,
    paddingHorizontal: spacing[8],
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: CHIP_TEXT,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  chipTextEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing[8],
  },
  instituteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BADGE_BG,
    paddingHorizontal: spacing[8],
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  instituteBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BADGE_TEXT,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  viewCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing[12],
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  viewCourseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
});
