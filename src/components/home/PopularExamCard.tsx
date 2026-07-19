/**
 * PopularExamCard
 *
 * A card in the 2×2 "Popular Exams" grid. Each card has:
 * - A tinted circular icon for the exam
 * - Exam short name
 * - Full exam description
 * - Arrow indicator at the bottom
 *
 * @module components/home/PopularExamCard
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import Icon from './Icons';
import type { IconName } from './Icons';
import type { PopularExamItem } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PopularExamCardProps extends Omit<PopularExamItem, 'key'> {
  /** Callback when the card is pressed. */
  onPress?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const PopularExamCard = React.memo(function PopularExamCard({
  iconName,
  iconBg,
  iconColor,
  title,
  description,
  accessibilityLabel,
  onPress,
}: PopularExamCardProps): React.JSX.Element {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 200 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView style={[styles.card, shadows.small, animatedStyle]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={styles.touchable}
      >
        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Icon
            name={iconName as IconName}
            color={iconColor}
            width={24}
            height={24}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        {/* Arrow */}
        <View style={styles.arrowCircle}>
          <Icon
            name="arrow-right"
            color={iconColor}
            width={14}
            height={14}
          />
        </View>
      </TouchableOpacity>
    </AnimatedView>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  touchable: {
    padding: spacing[16],
    gap: spacing[8],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text.primary,
    lineHeight: 20,
  },
  description: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
});

export default PopularExamCard;
