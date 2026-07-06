/**
 * NotificationSection
 *
 * Section header used to group notifications by time period
 * (Today, Yesterday, Earlier). Renders a label with a decorative
 * left accent bar.
 *
 * @module components/notification/NotificationSection
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ═════════════════════════════════════════════════════════════════
//  Props
// ═════════════════════════════════════════════════════════════════

export interface NotificationSectionProps {
  /** Section display label (e.g. "Today", "Yesterday", "Earlier"). */
  label: string;
}

// ═════════════════════════════════════════════════════════════════
//  Component
// ═════════════════════════════════════════════════════════════════

const NotificationSection = React.memo(function NotificationSection({
  label,
}: NotificationSectionProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="header">
      <View style={styles.accentBar} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
  },
  accentBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },
  label: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
});

export default NotificationSection;
