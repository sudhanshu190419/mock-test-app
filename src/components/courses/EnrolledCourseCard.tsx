import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

export interface EnrolledCourseCardProps {
  courseId: string;
  title: string;
  category: string;
  progressPercent: number; // 0 - 100
  onPress: () => void;
  progressSuffix?: string;
}

export default React.memo(function EnrolledCourseCard({
  courseId,
  title,
  category,
  progressPercent = 0,
  onPress,
  progressSuffix = '% Completed',
}: EnrolledCourseCardProps): React.JSX.Element {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progressPercent / 100, { duration: 1000 });
  }, [progressPercent, animatedProgress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  // Resolve category accent dot color
  const catKey = (category || 'all').toLowerCase().trim();
  let categoryColor: string = coursesDark.categories.all.accent;
  if (catKey.includes('neet')) categoryColor = coursesDark.categories.medical.accent;
  else if (catKey.includes('jee')) categoryColor = coursesDark.categories.engineering.accent;
  else if (catKey.includes('school') || catKey.includes('class')) categoryColor = coursesDark.categories.school.accent;
  else if (catKey.includes('clat') || catKey.includes('law')) categoryColor = coursesDark.categories.law.accent;
  else if (catKey.includes('cuet')) categoryColor = coursesDark.categories.cuet.accent;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.container}
    >
      {/* Category Indicator Dot and Name */}
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: categoryColor }]} />
        <Text style={styles.categoryText} numberOfLines={1}>
          {category.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      {/* Progress Section */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarWrapper}>
          <Animated.View style={[styles.progressBar, progressStyle]}>
            <LinearGradient
              colors={[coursesDark.accentPrimary, coursesDark.accentCyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBar}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressText}>{Math.round(progressPercent)}{progressSuffix}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 148,
    backgroundColor: coursesDark.surfaceCardDark,
    borderRadius: radius.xl,
    padding: spacing[12],
    justifyContent: 'space-between',
    height: 124,
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  categoryText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
    color: coursesDark.textMutedOnDark,
    letterSpacing: 0.5,
  },
  title: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: coursesDark.textOnDark,
    lineHeight: 18,
    marginVertical: spacing[8],
  },
  progressContainer: {
    gap: spacing[4],
  },
  progressBarWrapper: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: radius.full,
  },
  gradientBar: {
    width: '100%',
    height: '100%',
  },
  progressText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: coursesDark.accentCyan,
  },
});
