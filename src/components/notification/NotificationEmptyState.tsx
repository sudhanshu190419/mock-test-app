/**
 * NotificationEmptyState
 *
 * Beautiful empty state displayed when the user has no notifications.
 * Uses a decorative illustration placeholder (SVG icon) with title
 * and subtitle copy.
 *
 * @module components/notification/NotificationEmptyState
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Icon from '../home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ═════════════════════════════════════════════════════════════════
//  Props
// ═════════════════════════════════════════════════════════════════

export interface NotificationEmptyStateProps {
  /** Custom title override. Defaults to 'No Notifications Yet'. */
  title?: string;
  /** Custom subtitle override. */
  subtitle?: string;
}

// ═════════════════════════════════════════════════════════════════
//  Component
// ═════════════════════════════════════════════════════════════════

const NotificationEmptyState = React.memo(function NotificationEmptyState({
  title = 'No Notifications Yet',
  subtitle = "You'll receive updates about mock tests, live classes, results and announcements here.",
}: NotificationEmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="summary">
      {/* Decorative icon */}

      {/* Bell icon in a decorative circle */}
      <View style={styles.iconCircle}>
        <View style={styles.iconInner}>
          <Icon name="bell" color={colors.text.secondary} width={32} height={32} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    paddingVertical: spacing[48],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.tint.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[24],
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificationEmptyState;
