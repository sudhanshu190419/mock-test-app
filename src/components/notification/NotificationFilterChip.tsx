/**
 * NotificationFilterChip
 *
 * Horizontal chip for filtering notifications by type.
 * No entrance animation — renders instantly for smooth 60 FPS.
 * Active state uses the brand secondary colour; inactive is outlined.
 *
 * @module components/notification/NotificationFilterChip
 */

import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ═════════════════════════════════════════════════════════════════
//  Props
// ═════════════════════════════════════════════════════════════════

export interface NotificationFilterChipProps {
  /** Label displayed on the chip. */
  label: string;
  /** Whether this chip is the currently active filter. */
  isActive: boolean;
  /** Callback when pressed. */
  onPress: () => void;
}

// ═════════════════════════════════════════════════════════════════
//  Component
// ═════════════════════════════════════════════════════════════════

const NotificationFilterChip = React.memo(function NotificationFilterChip({
  label,
  isActive,
  onPress,
}: NotificationFilterChipProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.chip, isActive && styles.activeChip]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Filter by ${label}`}
    >
      <Text style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing[8],
  },
  activeChip: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  label: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  activeLabel: {
    color: colors.text.inverse,
  },
});

export default NotificationFilterChip;
