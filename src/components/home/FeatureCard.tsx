/**
 * FeatureCard
 *
 * A card in the 2×2 "Why Choose MockPrep?" grid.
 * Each card shows a large circular icon, a bold title, and a short
 * description — all centred vertically.
 *
 * @module components/home/FeatureCard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Icon from './Icons';
import type { IconName } from './Icons';
import type { FeatureItem } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FeatureCardProps extends Omit<FeatureItem, 'key'> {
  /** Stagger delay for slide-up animation (ms). */
  animationDelay?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

const FeatureCard = React.memo(function FeatureCard({
  iconName,
  iconBg,
  iconColor,
  title,
  description,
}: FeatureCardProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="summary">
      {/* Large circular icon */}
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Icon
          name={iconName as IconName}
          color={iconColor}
          width={26}
          height={26}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Description */}
      <Text style={styles.description}>{description}</Text>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    gap: spacing[8],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  description: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing[4],
  },
});

export default FeatureCard;
