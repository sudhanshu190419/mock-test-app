/**
 * SectionHeader
 *
 * A reusable section title with an optional trailing action link
 * (e.g. "View All").
 *
 * Used across the home screen for Quick Start, Why Choose Us,
 * and Popular Exams sections.
 *
 * @module components/home/SectionHeader
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  /** Section title text. */
  title: string;
  /** Optional action label (e.g. "View All"). */
  actionLabel?: string;
  /** Callback when the action label is pressed. */
  onActionPress?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SectionHeader = React.memo(function SectionHeader({
  title,
  actionLabel,
  onActionPress,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>

      {actionLabel && (
        <TouchableOpacity
          onPress={onActionPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  actionLabel: {
    ...typography.body,
    fontWeight: '600' as const,
    color: colors.secondary,
  },
});

export default SectionHeader;
