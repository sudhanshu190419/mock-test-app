/**
 * TestHeader
 *
 * Fixed top header for the test engine matching Figma specifications. Displays:
 * - Exit button to discard session
 * - AutoSavePill to show syncing status (saved, saving, local)
 * - ExamTimer displaying remaining duration
 * - Submit button to finalize attempt
 *
 * @module components/testEngine/TestHeader
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '../home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

export type AutoSaveStatus = 'saved' | 'saving' | 'local';

interface TestHeaderProps {
  /** Callback when user clicks Exit. */
  onExitPress: () => void;
  /** Callback when user clicks Submit. */
  onSubmitPress: () => void;
  /** Auto-save status indicator. */
  autoSaveStatus: AutoSaveStatus;
  /** Time remaining in seconds. */
  timeRemainingSeconds: number;
}

// ─── AutoSavePill Subcomponent ───────────────────────────────────────────────
const AutoSavePill = React.memo(function AutoSavePill({
  status,
}: {
  status: AutoSaveStatus;
}): React.JSX.Element {
  const cfg = {
    saved: {
      dot: '#10B981', // green-500
      text: 'Saved',
      bg: '#ECFDF5', // green-50
      border: '#A7F3D0', // green-200
      textCol: '#047857', // green-700
    },
    saving: {
      dot: '#F59E0B', // amber-500
      text: 'Saving...',
      bg: '#FFFBEB', // amber-50
      border: '#FDE68A', // amber-200
      textCol: '#B45309', // amber-700
    },
    local: {
      dot: '#EF4444', // red-500
      text: 'Saved Locally',
      bg: '#FEF2F2', // red-50
      border: '#FCA5A5', // red-200
      textCol: '#B91C1C', // red-700
    },
  }[status] || {
    dot: '#10B981',
    text: 'Saved',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    textCol: '#047857',
  };

  return (
    <View
      style={[
        styles.pillContainer,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        },
      ]}
    >
      <View style={[styles.pillDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.pillText, { color: cfg.textCol }]}>{cfg.text}</Text>
    </View>
  );
});

// ─── ExamTimer Subcomponent ──────────────────────────────────────────────────
const ExamTimer = React.memo(function ExamTimer({
  seconds,
}: {
  seconds: number;
}): React.JSX.Element {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const display = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  const isCritical = seconds < 300; // < 5 minutes

  return (
    <View
      style={[
        styles.timerBadge,
        isCritical ? styles.timerBadgeCritical : styles.timerBadgeNormal,
      ]}
    >
      <Icon name="timer" color={isCritical ? '#DC2626' : '#FFFFFF'} width={14} height={14} />
      <Text
        style={[
          styles.timerText,
          { color: isCritical ? '#DC2626' : '#FFFFFF' },
        ]}
      >
        {display}
      </Text>
    </View>
  );
});

// ─── TestHeader Main Component ───────────────────────────────────────────────
const TestHeader = React.memo(function TestHeader({
  onExitPress,
  onSubmitPress,
  autoSaveStatus,
  timeRemainingSeconds,
}: TestHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20);

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <StatusBar barStyle="light-content" backgroundColor="#155215" translucent />
      <View style={styles.row}>
        {/* Left: Exit button */}
        <TouchableOpacity
          style={styles.exitButton}
          onPress={onExitPress}
          activeOpacity={0.7}
          accessibilityLabel="Exit Test"
          accessibilityRole="button"
        >
          <Icon name="x" color="#FFFFFF" width={16} height={16} />
        </TouchableOpacity>

        <View style={styles.spacer} />

        {/* Right side: AutoSave, Timer, Submit */}
        <View style={styles.rightGroup}>
          <AutoSavePill status={autoSaveStatus} />
          <ExamTimer seconds={timeRemainingSeconds} />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={onSubmitPress}
            activeOpacity={0.7}
            accessibilityLabel="Submit Test"
            accessibilityRole="button"
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const HEADER_HEIGHT = 48; // Base height without safe area

export { TestHeader, HEADER_HEIGHT };

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#155215', // var(--exam-green)
    borderBottomWidth: 1,
    borderBottomColor: '#1a6b1a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT + spacing[12],
    paddingHorizontal: spacing[12],
  },
  exitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 36,
    height: 36,
    borderRadius: radius.sm,
  },
  exitButtonText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  // Pill styles
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[12],
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    ...typography.labelSmall,
    fontSize: 11,
    fontWeight: '700',
  },
  // Timer styles
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[12],
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  timerBadgeNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timerBadgeCritical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  timerText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  // Submit styles
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    backgroundColor: '#194080', // var(--exam-blue)
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    paddingHorizontal: spacing[12],
    height: 36,
    borderRadius: radius.sm,
  },
  submitButtonText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
