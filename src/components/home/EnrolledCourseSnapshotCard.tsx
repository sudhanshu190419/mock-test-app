/**
 * EnrolledCourseSnapshotCard
 *
 * HomeScreen Header Bento component representing the student's active enrolled course progress.
 * Implements a borderless Bento layout directly on the homepage surface:
 * - Left block: Course Name & Progress bar (interactive -> navigates to course page).
 * - Right column: Stacked Timetable (top) & Mock Tests (bottom) blocks.
 * - Live Alert Block: Top span, appears when a class is live.
 * - Inline Schedule Panel: Expands directly below the grid when the Timetable tile is tapped.
 *
 * Micro-animations:
 * - Spring-based tactile scale effects on press.
 * - Layout animations (FadeIn, FadeOut, Layout) for smooth expanding/collapsing of the inline schedule.
 *
 * @module components/home/EnrolledCourseSnapshotCard
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, cancelAnimation, interpolate, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

import Icon from './Icons';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// ─── Constants ───────────────────────────────────────────────────────────────

const white = '#FFFFFF';
const accentMint = '#00D09E';
const borderSlate = '#E2E8F0';
const bgSlatePill = '#F1F5F9';
const bgSlateLight = '#F8FAFC';
const textSlateDark = '#0F172A';
const textSlateSub = '#475569';
const textSlateLight = '#94A3B8';

// Live alert colors
const liveBg = '#FEF2F2';
const liveBorder = '#FCA5A5';
const liveRed = '#DC2626';

// Scheduled class colors
const scheduledBg = 'rgba(0, 208, 158, 0.04)';
const scheduledBorder = 'rgba(0, 208, 158, 0.12)';

const SPRING_CONFIG = { duration: 200 };

// Mock Daily Schedule events for the inline preview
const INLINE_EVENTS = [
  { id: 'e1', time: '09:30 AM', title: 'NEET 2024 Biology Mock Paper', type: 'test', status: 'completed' },
  { id: 'e2', time: '03:00 PM', title: 'Inorganic Chemistry Live Prep', type: 'live', status: 'upcoming' },
  { id: 'e3', time: '06:00 PM', title: 'Live Strategy & PYQ Marathon', type: 'live', status: 'live' },
];

// ─── Props Interface ─────────────────────────────────────────────────────────

export interface EnrolledCourseSnapshotCardProps {
  courseTitle: string;
  progressPercentage: number;
  nextLectureTitle: string;
  remainingLectures?: number;
  onContinuePress?: () => void;
  // Integrated Live Class / Streaming Now
  liveClassTitle?: string;
  liveClassInstructor?: string;
  liveClassStartTime?: string;
  isLiveNow?: boolean;
  onJoinLivePress?: () => void;
  onCourseTestsPress?: () => void;
  onCalendarPress?: () => void;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Inline Schedule Timeline Preview */
const InlineSchedulePreview = memo(function InlineSchedulePreview({
  onCalendarPress,
}: {
  onCalendarPress?: () => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.inlineScheduleContainer}
    >
      <View style={styles.inlineScheduleHeader}>
        <Text style={styles.inlineScheduleTitle}>Today's Timeline</Text>
        <TouchableOpacity onPress={onCalendarPress} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>View Full Timetable →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timelineList}>
        {INLINE_EVENTS.map((event) => {
          const isLive = event.status === 'live';
          const isCompleted = event.status === 'completed';
          return (
            <View key={event.id} style={styles.timelineItem}>
              {/* Node indicator */}
              <View style={styles.timelineNodeContainer}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: isLive ? liveRed : isCompleted ? '#22C55E' : textSlateLight },
                  ]}
                />
                <View style={styles.timelineLine} />
              </View>
              {/* Event Content */}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>{event.time}</Text>
                <Text style={styles.timelineEventTitle} numberOfLines={1}>
                  {isLive && <Text style={styles.liveMarkerText}>[LIVE NOW] </Text>}
                  {event.title}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

const EnrolledCourseSnapshotCard = memo(function EnrolledCourseSnapshotCard({
  courseTitle,
  progressPercentage,
  onContinuePress,
  liveClassTitle,
  liveClassInstructor,
  liveClassStartTime,
  isLiveNow = false,
  onJoinLivePress,
  onCourseTestsPress,
  onCalendarPress,
}: EnrolledCourseSnapshotCardProps): React.JSX.Element {
  const { reduceMotion } = useReducedMotion();
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);

  const clampedProgress = Math.min(100, Math.max(0, Math.round(progressPercentage)));

  // Shared values for tactile press animations
  const courseScale = useSharedValue(1);
  const calendarScale = useSharedValue(1);
  const testsScale = useSharedValue(1);
  const liveScale = useSharedValue(1);
  const livePulseOpacity = useSharedValue(isLiveNow ? 0.6 : 1.0);

  // Pulse animation for live dot
  useEffect(() => {
    if (isLiveNow && !reduceMotion) {
      livePulseOpacity.value = withRepeat(
        withTiming(1.0, { duration: 800 }),
        -1,
        true
      );
    } else {
      livePulseOpacity.value = 1.0;
    }
    return () => {
      cancelAnimation(livePulseOpacity);
    };
  }, [isLiveNow, livePulseOpacity, reduceMotion]);

  // Press Handlers
  const handleCoursePressIn = useCallback(() => {
    if (reduceMotion) return;
    courseScale.value = withTiming(0.97, SPRING_CONFIG);
  }, [reduceMotion, courseScale]);

  const handleCoursePressOut = useCallback(() => {
    if (reduceMotion) return;
    courseScale.value = withTiming(1.0, SPRING_CONFIG);
  }, [reduceMotion, courseScale]);

  const handleCalendarPressIn = useCallback(() => {
    if (reduceMotion) return;
    calendarScale.value = withTiming(0.96, SPRING_CONFIG);
  }, [reduceMotion, calendarScale]);

  const handleCalendarPressOut = useCallback(() => {
    if (reduceMotion) return;
    calendarScale.value = withTiming(1.0, SPRING_CONFIG);
  }, [reduceMotion, calendarScale]);

  const handleTestsPressIn = useCallback(() => {
    if (reduceMotion) return;
    testsScale.value = withTiming(0.96, SPRING_CONFIG);
  }, [reduceMotion, testsScale]);

  const handleTestsPressOut = useCallback(() => {
    if (reduceMotion) return;
    testsScale.value = withTiming(1.0, SPRING_CONFIG);
  }, [reduceMotion, testsScale]);

  const handleLivePressIn = useCallback(() => {
    if (reduceMotion) return;
    liveScale.value = withTiming(0.97, SPRING_CONFIG);
  }, [reduceMotion, liveScale]);

  const handleLivePressOut = useCallback(() => {
    if (reduceMotion) return;
    liveScale.value = withTiming(1.0, SPRING_CONFIG);
  }, [reduceMotion, liveScale]);

  // Toggle schedule preview
  const handleTimetablePress = useCallback(() => {
    setIsScheduleExpanded((prev) => !prev);
  }, []);

  // Animated Styles
  const courseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: courseScale.value }],
  }));

  const calendarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: calendarScale.value }],
  }));

  const testsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: testsScale.value }],
  }));

  const liveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: liveScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: livePulseOpacity.value,
  }));

  const hasLiveClassInfo = Boolean(liveClassTitle);

  return (
    <Animated.View layout={LinearTransition.duration(200)} style={styles.bentoContainer}>
      {/* 1. Live Class Card (Conditional top-most span) */}
      {hasLiveClassInfo && liveClassTitle && (
        <AnimatedTouchableOpacity
          style={[
            styles.liveCard,
            isLiveNow ? styles.liveCardActive : styles.liveCardScheduled,
            liveAnimatedStyle,
          ]}
          onPressIn={handleLivePressIn}
          onPressOut={handleLivePressOut}
          onPress={onJoinLivePress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`${isLiveNow ? 'Live Stream active' : 'Upcoming class'}: ${liveClassTitle}`}
        >
          <View style={styles.liveCardHeader}>
            <View style={styles.liveBadgeRow}>
              <Animated.View
                style={[
                  styles.liveDot,
                  { backgroundColor: isLiveNow ? liveRed : accentMint },
                  isLiveNow ? pulseStyle : null,
                ]}
              />
              <Text style={[styles.liveBadgeLabel, { color: isLiveNow ? liveRed : accentMint }]}>
                {isLiveNow ? 'LIVE STREAM' : 'SCHEDULED CLASS'}
              </Text>
            </View>

            {liveClassStartTime && (
              <Text style={[styles.liveTimeText, { color: isLiveNow ? liveRed : textSlateSub }]}>
                {liveClassStartTime}
              </Text>
            )}
          </View>

          <Text style={styles.liveTitleText} numberOfLines={1}>
            {liveClassTitle}
          </Text>

          {liveClassInstructor && (
            <Text style={styles.liveInstructorText}>
              👨‍🏫 {liveClassInstructor}
            </Text>
          )}
        </AnimatedTouchableOpacity>
      )}

      {/* 2. Top Bento Grid Row: Course card (Left) & Double mini cards (Right) */}
      <View style={styles.topBentoRow}>
        {/* Left Column: Course Progress (1x2 Tall) */}
        <AnimatedTouchableOpacity
          style={[styles.courseCard, courseAnimatedStyle]}
          onPressIn={handleCoursePressIn}
          onPressOut={handleCoursePressOut}
          onPress={onContinuePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Active Course: ${courseTitle}. Progress ${clampedProgress} percent. Tap to open.`}
        >
          <View style={styles.courseHeader}>
            <View style={styles.courseTagBadge}>
              <Icon name="book-open" color={accentMint} width={12} height={12} />
              <Text style={styles.courseTagText}>MY COURSE</Text>
            </View>
          </View>

          <Text style={styles.courseTitleText} numberOfLines={3}>
            {courseTitle}
          </Text>

          <View style={styles.courseFooter}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressPercentText}>{clampedProgress}%</Text>
              <Text style={styles.progressLabelText}>Done</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${clampedProgress}%` }]} />
            </View>
          </View>
        </AnimatedTouchableOpacity>

        {/* Right Column: Stacked 1x1 Buttons */}
        <View style={styles.rightBentoStack}>
          {/* Tile: Timetable */}
          <AnimatedTouchableOpacity
            style={[styles.miniCard, calendarAnimatedStyle]}
            onPressIn={handleCalendarPressIn}
            onPressOut={handleCalendarPressOut}
            onPress={handleTimetablePress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open schedule details"
          >
            <View style={[styles.iconFrame, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Icon name="calendar" color="#3B82F6" width={16} height={16} />
            </View>
            <View style={styles.miniCardContent}>
              <Text style={styles.miniCardTitle}>Timetable</Text>
              <Text style={styles.miniCardSub}>
                {isScheduleExpanded ? 'Hide schedule' : 'Tap to expand'}
              </Text>
            </View>
          </AnimatedTouchableOpacity>

          {/* Tile: Mock Tests */}
          <AnimatedTouchableOpacity
            style={[styles.miniCard, testsAnimatedStyle]}
            onPressIn={handleTestsPressIn}
            onPressOut={handleTestsPressOut}
            onPress={onCourseTestsPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open Mock Tests"
          >
            <View style={[styles.iconFrame, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
              <Icon name="clipboard-list" color="#7C3AED" width={16} height={16} />
            </View>
            <View style={styles.miniCardContent}>
              <Text style={styles.miniCardTitle}>Mock Tests</Text>
              <Text style={styles.miniCardSub}>Practice tests & PYQs</Text>
            </View>
          </AnimatedTouchableOpacity>
        </View>
      </View>

      {/* 3. Inline Schedule Details (Expanded Accordion Panel) */}
      {isScheduleExpanded && (
        <InlineSchedulePreview onCalendarPress={onCalendarPress} />
      )}
    </Animated.View>
  );
});

EnrolledCourseSnapshotCard.displayName = 'EnrolledCourseSnapshotCard';

export default EnrolledCourseSnapshotCard;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bentoContainer: {
    marginHorizontal: spacing[16],
    marginBottom: spacing[8],
    gap: spacing[12],
  },
  topBentoRow: {
    flexDirection: 'row',
    gap: spacing[12],
    height: 190,
  },
  courseCard: {
    flex: 1.4,
    backgroundColor: bgSlateLight,
    borderWidth: 1.5,
    borderColor: borderSlate,
    borderRadius: radius.xl, // 20px
    padding: spacing[12],
    justifyContent: 'space-between',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: bgSlatePill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  courseTagText: {
    color: textSlateSub,
    fontSize: 8,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  courseTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: textSlateDark,
    lineHeight: 18,
    marginVertical: spacing[8],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  courseFooter: {
    width: '100%',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 4,
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: '800',
    color: textSlateDark,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  progressLabelText: {
    fontSize: 9,
    fontWeight: '600',
    color: textSlateLight,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: bgSlatePill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: accentMint,
    borderRadius: 3,
  },
  rightBentoStack: {
    flex: 1,
    gap: spacing[12],
    justifyContent: 'space-between',
  },
  miniCard: {
    height: 89, // (190 - 12 gap) / 2
    padding: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: bgSlateLight,
    borderWidth: 1.5,
    borderColor: borderSlate,
    borderRadius: radius.xl, // 20px
  },
  iconFrame: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCardContent: {
    flex: 1,
  },
  miniCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: textSlateDark,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  miniCardSub: {
    fontSize: 9,
    color: textSlateLight,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Bottom Live stream Card ──
  liveCard: {
    width: '100%',
    padding: spacing[12],
    borderWidth: 1.5,
    borderRadius: radius.xl, // 20px
  },
  liveCardActive: {
    backgroundColor: liveBg,
    borderColor: liveBorder,
  },
  liveCardScheduled: {
    backgroundColor: bgSlateLight,
    borderColor: borderSlate,
  },
  liveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  liveTimeText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  liveTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: textSlateDark,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  liveInstructorText: {
    fontSize: 11,
    color: textSlateSub,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Inline Timeline Accordion ──
  inlineScheduleContainer: {
    backgroundColor: bgSlateLight,
    borderWidth: 1.5,
    borderColor: borderSlate,
    borderRadius: radius.xl, // 20px
    padding: spacing[12],
    marginTop: spacing[4],
  },
  inlineScheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: borderSlate,
    paddingBottom: 6,
  },
  inlineScheduleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: textSlateDark,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  seeAllText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  timelineList: {
    gap: spacing[8],
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  timelineNodeContainer: {
    alignItems: 'center',
    height: '100%',
    width: 12,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  timelineLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: borderSlate,
    marginTop: 4,
    marginBottom: -4,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: '700',
    color: textSlateDark,
    width: 65,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  timelineEventTitle: {
    flex: 1,
    fontSize: 11,
    color: textSlateSub,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  liveMarkerText: {
    color: liveRed,
    fontWeight: '800',
  },
});
