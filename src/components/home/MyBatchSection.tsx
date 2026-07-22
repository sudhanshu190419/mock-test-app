/**
 * MyBatchSection
 *
 * Premium "My Batch" section for the student dashboard. Displayed when the
 * student has a resolved active batch with assigned courses.
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │  🎓  My Batch                           │
 *   │       NEET 2026 Morning                 │
 *   │       Academic Year: 2025-26            │
 *   ├─────────────────────────────────────────┤
 *   │  Assigned Courses                       │
 *   │  ┌─ [ AssignedCourseCard ] ─────────┐   │
 *   │  │  Course thumbnail, title, desc   │   │
 *   │  │  Instructor, modules, badge      │   │
 *   │  └──────────────────────────────────┘   │
 *   │  ┌─ [ AssignedCourseCard ] ─────────┐   │
 *   │  └──────────────────────────────────┘   │
 *   └─────────────────────────────────────────┘
 *
 * @module components/home/MyBatchSection
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AssignedCourseCard from './AssignedCourseCard';
import type { StudentBatch, AssignedCourse } from '../../types/studentDashboard';
import Icon from './Icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

// ─── Props ──────────────────────────────────────────────────────────────────

interface MyBatchSectionProps {
  /** All resolved active batches for the student. */
  batches: StudentBatch[];
  /** Courses assigned across all batches (deduplicated). */
  courses: AssignedCourse[];
  /** True when the dashboard is still loading. */
  isLoading: boolean;
  /** Called when a course card is pressed. */
  onCoursePress: (courseId: string) => void;
  /** Called when "View All Courses" is pressed (navigates to MyCoursesScreen). */
  onViewAllCourses?: () => void;
}

// ─── Colour Palette ─────────────────────────────────────────────────────────

const BATCH_HEADER_BG = '#0F172A';
const BATCH_HEADER_TEXT = '#FFFFFF';
const BATCH_SUBTEXT = '#94A3B8';
const SECTION_TITLE = '#0F172A';
const SECTION_SUBTITLE = '#64748B';
const TEXT_SECONDARY = '#475569';
const EMPTY_TEXT = '#94A3B8';
const EMPTY_BG = '#F8FAFC';
const EMPTY_BORDER = '#E2E8F0';
const ACCENT_GREEN = '#05C46B';

// ─── Component ──────────────────────────────────────────────────────────────

const MyBatchSection = React.memo(function MyBatchSection({
  batches,
  courses,
  isLoading,
  onCoursePress,
  onViewAllCourses,
}: MyBatchSectionProps): React.JSX.Element {
  // Use the first batch as the primary display batch
  const primaryBatch = batches[0];
  const handleCoursePress = useCallback(
    (courseId: string) => {
      onCoursePress(courseId);
    },
    [onCoursePress],
  );

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.batchHeader}>
          <ActivityIndicator size="small" color={ACCENT_GREEN} />
          <Text style={styles.headerLoadingText}>
            Loading your batches…
          </Text>
        </View>
      </View>
    );
  }

  // ── Empty state (no courses assigned) ───────────────────────────────────
  if (courses.length === 0) {
    return (
      <View style={styles.container}>
        {/* Batch Header — always visible when batch is resolved */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.batchHeader}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerIconContainer}>
              <Text style={styles.headerEmoji}>🎓</Text>
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>My Batch</Text>
              <Text style={styles.headerBatchName}>{primaryBatch.batch.name}</Text>
            </View>
          </View>
          <View style={styles.headerMetaRow}>
            <View style={styles.headerMetaPill}>
              <Text style={styles.headerMetaPillText}>
                {primaryBatch.streamName}
              </Text>
            </View>
            <Text style={styles.headerMetaText}>
              {primaryBatch.batch.academicYear}
            </Text>
            {batches.length > 1 && (
              <View style={styles.headerMetaPill}>
                <Text style={styles.headerMetaPillText}>
                  +{batches.length - 1} more
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Empty courses message */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(300)}
          style={styles.sectionContent}
        >
          <Text style={styles.sectionTitle}>Assigned Courses</Text>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No Courses Assigned Yet</Text>
            <Text style={styles.emptyDescription}>
              Your institute hasn't assigned any courses to your batches yet.
              Check back later or contact your institute.
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Courses available ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Batch Header */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={styles.batchHeader}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerEmoji}>🎓</Text>
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>My Batch</Text>
            <Text style={styles.headerBatchName}>{primaryBatch.batch.name}</Text>
          </View>
        </View>
        <View style={styles.headerMetaRow}>
          <View style={styles.headerMetaPill}>
            <Text style={styles.headerMetaPillText}>
              {primaryBatch.streamName}
            </Text>
          </View>
          <Text style={styles.headerMetaText}>
            {primaryBatch.batch.academicYear}
          </Text>
          {batches.length > 1 && (
            <View style={styles.headerMetaPill}>
              <Text style={styles.headerMetaPillText}>
                +{batches.length - 1} more
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Assigned Courses */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(300)}
        style={styles.sectionContent}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Assigned Courses</Text>
          <Text style={styles.courseCount}>
            {courses.length} Course{courses.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {courses.slice(0, 3).map((course, index) => (
          <Animated.View
            key={course.courseId}
            entering={FadeInDown.delay(150 + index * 80).duration(300)}
          >
            <AssignedCourseCard
              course={course}
              onPress={handleCoursePress}
            />
          </Animated.View>
        ))}

        {/* View All Courses button — always shown when there are courses */}
        {onViewAllCourses && courses.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(150 + Math.min(3, courses.length) * 80).duration(300)}
          >
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={onViewAllCourses}
              activeOpacity={0.8}
              accessibilityLabel="View all courses"
            >
              <Text style={styles.viewAllButtonText}>
                {courses.length > 3 ? `View All ${courses.length} Courses` : 'View My Courses'}
              </Text>
              <Icon name="arrow-right" color={TEXT_SECONDARY} width={14} height={14} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
});

MyBatchSection.displayName = 'MyBatchSection';

export default MyBatchSection;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[8],
  },
  // ── Batch Header ──────────────────────────────────────────────────────
  batchHeader: {
    backgroundColor: BATCH_HEADER_BG,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    marginHorizontal: spacing[16],
    borderRadius: radius.xl,
    marginBottom: spacing[20],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginBottom: spacing[8],
  },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT_GREEN,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  headerBatchName: {
    fontSize: 17,
    fontWeight: '800',
    color: BATCH_HEADER_TEXT,
    lineHeight: 22,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginLeft: 54,
  },
  headerMetaPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  headerMetaPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: ACCENT_GREEN,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  headerMetaText: {
    fontSize: 10,
    fontWeight: '500',
    color: BATCH_SUBTEXT,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  headerLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: BATCH_SUBTEXT,
    marginTop: 6,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Section Content ───────────────────────────────────────────────────
  sectionContent: {
    paddingHorizontal: spacing[16],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SECTION_TITLE,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  courseCount: {
    fontSize: 12,
    fontWeight: '600',
    color: SECTION_SUBTITLE,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── View All Button ──────────────────────────────────────────────────
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: EMPTY_BORDER,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    marginTop: spacing[4],
  },
  viewAllButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Empty State ───────────────────────────────────────────────────────
  emptyContainer: {
    backgroundColor: EMPTY_BG,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: EMPTY_BORDER,
    padding: spacing[24],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: spacing[8],
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: SECTION_TITLE,
    marginBottom: spacing[4],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  emptyDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: EMPTY_TEXT,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
});
