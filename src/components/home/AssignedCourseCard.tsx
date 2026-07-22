/**
 * AssignedCourseCard
 *
 * Premium card component for displaying an institute-assigned course in the
 * "My Batch" section of the student dashboard. Visually distinct from
 * public catalog cards — communicates "this is YOUR course, assigned by
 * your institute."
 *
 * Features:
 * - Accent-coloured left border (institute branding)
 * - Course thumbnail with fallback gradient
 * - Instructor name, module count, and short description
 * - Subtle "Assigned" badge to differentiate from purchased courses
 * - Animated press feedback
 *
 * @module components/home/AssignedCourseCard
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from './Icons';
import type { AssignedCourse } from '../../types/studentDashboard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL_MARGIN = spacing[16];
const CARD_GAP = spacing[12];
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;

interface AssignedCourseCardProps {
  course: AssignedCourse;
  onPress: (courseId: string) => void;
}

// ─── Colour palette for the assigned course cards ─────────────────────────

const CARD_ACCENT = '#05C46B'; // Mint green — signals "assigned by institute"
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#475569';
const TEXT_MUTED = '#94A3B8';
const BADGE_BG = '#ECFDF5';
const BADGE_TEXT = '#059669';
const PILL_BG = '#F8FAFC';

function getStreamGradient(
  category: string,
): [string, string, ...string[]] {
  const cat = category.toLowerCase();
  if (cat.includes('neet') || cat.includes('medical'))
    return ['#155215', '#0C3D0C'] as [string, string, ...string[]];
  if (cat.includes('jee') || cat.includes('engineering'))
    return ['#1E3A5F', '#15294A'] as [string, string, ...string[]];
  if (cat.includes('school') || cat.includes('class'))
    return ['#4A1942', '#2E0F2A'] as [string, string, ...string[]];
  if (cat.includes('clat') || cat.includes('law'))
    return ['#1A4A4A', '#0D2F2F'] as [string, string, ...string[]];
  return ['#1E1B4B', '#312E81'] as [string, string, ...string[]];
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const AssignedCourseCard = React.memo(function AssignedCourseCard({
  course,
  onPress,
}: AssignedCourseCardProps): React.JSX.Element {
  const pressScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.985, { duration: 150 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration: 150 });
  }, [pressScale]);

  const handlePress = useCallback(() => {
    onPress(course.courseId);
  }, [onPress, course.courseId]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const gradientColors = useMemo(
    () => getStreamGradient(course.category),
    [course.category],
  );

  return (
    <AnimatedTouchableOpacity
      activeOpacity={0.95}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
      accessibilityLabel={`Assigned course: ${course.title}`}
      accessibilityRole="button"
    >
      {/* Left Accent Border */}
      <View style={styles.accentBar} />

      <View style={styles.inner}>
        {/* Top Row: Badge + Thumbnail */}
        <View style={styles.topRow}>
          {/* Thumbnail with fallback gradient */}
          <View style={styles.thumbnailContainer}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.thumbnailGradient}
            >
              <Text style={styles.thumbnailEmoji}>
                {course.category === 'NEET' || course.category === 'Medical'
                  ? '🔬'
                  : course.category === 'JEE' ||
                      course.category === 'Engineering'
                    ? '⚛️'
                    : '📚'}
              </Text>
            </LinearGradient>
          </View>

          {/* Title and Description */}
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {course.title}
            </Text>
            {course.shortDescription && (
              <Text style={styles.description} numberOfLines={2}>
                {course.shortDescription}
              </Text>
            )}
          </View>
        </View>

        {/* Metadata Row: Instructor + Modules + Stream */}
        <View style={styles.metaRow}>
          {/* Stream Pill */}
          <View style={styles.pill}>
            <Icon
              name="book-open"
              color={CARD_ACCENT}
              width={10}
              height={10}
            />
            <Text style={styles.pillText}>{course.category}</Text>
          </View>

          {course.instructorName && (
            <View style={styles.pill}>
              <Icon
                name="user"
                color={TEXT_SECONDARY}
                width={10}
                height={10}
              />
              <Text style={styles.pillText} numberOfLines={1}>
                {course.instructorName}
              </Text>
            </View>
          )}

          {course.moduleCount > 0 && (
            <View style={styles.pill}>
              <Icon
                name="layers"
                color={TEXT_SECONDARY}
                width={10}
                height={10}
              />
              <Text style={styles.pillText}>
                {course.moduleCount} Module{course.moduleCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Row: "Assigned" badge + duration */}
        <View style={styles.bottomRow}>
          <View style={styles.assignedBadge}>
            <Icon
              name="check-circle"
              color={BADGE_TEXT}
              width={11}
              height={11}
            />
            <Text style={styles.assignedBadgeText}>Institute Assigned</Text>
          </View>

          {course.duration && (
            <Text style={styles.durationText}>{course.duration} Days</Text>
          )}
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
});

AssignedCourseCard.displayName = 'AssignedCourseCard';

export default AssignedCourseCard;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: 'row',
    marginBottom: spacing[12],
    ...Platform.select({
      ios: {
        shadowColor: TEXT_PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  accentBar: {
    width: 5,
    backgroundColor: CARD_ACCENT,
  },
  inner: {
    flex: 1,
    padding: spacing[12],
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing[12],
    marginBottom: spacing[8],
  },
  thumbnailContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  thumbnailGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  description: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_SECONDARY,
    lineHeight: 16,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing[8],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PILL_BG,
    paddingHorizontal: spacing[8],
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing[8],
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BADGE_BG,
    paddingHorizontal: spacing[8],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  assignedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BADGE_TEXT,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_MUTED,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
});
