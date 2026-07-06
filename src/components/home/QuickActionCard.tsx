/**
 * QuickActionCard
 *
 * A card in the 2×2 "Quick Start" grid. Each card has:
 * - A tinted icon circle at the top
 * - Title and subtitle
 * - A circular arrow button at the bottom right
 *
 * Designed to be reusable — pass different icon/color/text props for
 * each of the four cards.
 *
 * @module components/home/QuickActionCard
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
import type { QuickActionItem } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface QuickActionCardProps extends Omit<QuickActionItem, 'key'> {
  /** Callback when the card is pressed. */
  onPress?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const QuickActionCard = React.memo(function QuickActionCard({
  iconName,
  iconBg,
  iconColor,
  title,
  subtitle,
  accessibilityLabel,
  onPress,
}: QuickActionCardProps): React.JSX.Element {
  return (
    <View style={[styles.card, shadows.small]}>
      <TouchableOpacity
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
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>

        {/* Arrow button */}
        <View style={styles.arrowCircle}>
          <Icon
            name="arrow-right"
            color={iconColor}
            width={14}
            height={14}
          />
        </View>
      </TouchableOpacity>
    </View>
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
    borderRadius: radius.md,
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
  subtitle: {
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

export default QuickActionCard;
