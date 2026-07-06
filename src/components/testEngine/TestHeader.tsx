/**
 * TestHeader
 *
 * Fixed top header for the test engine. Shows the test title and a
 * live countdown timer badge. Below the header is a thin progress bar.
 *
 * @module components/testEngine/TestHeader
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '../home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

interface TestHeaderProps {
  /** Test title. */
  title: string;
  /** Formatted time string (MM:SS or HH:MM:SS). */
  formattedTime: string;
  /** Whether the timer is in warning state (< 5 min). */
  isTimerWarning: boolean;
  /** Whether the timer is critical (< 1 min). */
  isTimerCritical: boolean;
}

const TestHeader = React.memo(function TestHeader({
  title,
  formattedTime,
  isTimerWarning,
  isTimerCritical,
}: TestHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const timerBgColor = isTimerCritical
    ? palette.red500
    : isTimerWarning
      ? palette.amber400
      : palette.slate50;

  const timerTextColor = isTimerCritical
    ? colors.text.inverse
    : isTimerWarning
      ? palette.slate900
      : colors.text.primary;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {/* Left: icon + title */}
        <View style={styles.titleGroup}>
          <Icon name="timer" color={colors.primary} width={22} height={22} />
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right: timer badge */}
        <View style={[styles.timerBadge, { backgroundColor: timerBgColor }]}>
          <Text
            style={[
              styles.timerText,
              { color: timerTextColor },
            ]}
          >
            {formattedTime}
          </Text>
        </View>
      </View>
    </View>
  );
});

const HEADER_HEIGHT = 56; // Base height without safe area

export { TestHeader, HEADER_HEIGHT };

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderBottomColor: palette.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEADER_HEIGHT,
    paddingHorizontal: spacing[16],
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[8],
    marginRight: spacing[12],
  },
  titleText: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  timerBadge: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  timerText: {
    ...typography.labelSmall,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
});
