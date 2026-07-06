/**
 * QuestionBreakdownCard
 *
 * Displays the question-wise breakdown: correct, incorrect, and
 * skipped counts with colour-coded dot indicators.
 * Matches the HTML design's questions breakdown card.
 *
 * @module components/testResult/QuestionBreakdownCard
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../home/Icons';

interface QuestionBreakdownCardProps {
  /** Number of correct answers. */
  correctCount: number;
  /** Number of incorrect answers. */
  incorrectCount: number;
  /** Number of skipped questions. */
  skippedCount: number;
  /** Total questions in the test. */
  totalQuestions: number;
}

interface BreakdownRowProps {
  label: string;
  count: number;
  dotColor: string;
}

const BreakdownRow = React.memo(function BreakdownRow({
  label,
  count,
  dotColor,
}: BreakdownRowProps): React.JSX.Element {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLabel}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.breakdownText}>{label}</Text>
      </View>
      <Text style={styles.breakdownCount}>{count}</Text>
    </View>
  );
});

const QuestionBreakdownCard = React.memo(function QuestionBreakdownCard({
  correctCount,
  incorrectCount,
  skippedCount,
  totalQuestions,
}: QuestionBreakdownCardProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconContainer}>
            <Icon name="clipboard-list" color={palette.slate500} width={20} height={20} />
          </View>
          <Text style={styles.title}>Questions</Text>
        </View>
      </View>

      <View style={styles.breakdownList}>
        <BreakdownRow
          label="Correct"
          count={correctCount}
          dotColor={colors.primary}
        />
        <View style={styles.separator} />
        <BreakdownRow
          label="Incorrect"
          count={incorrectCount}
          dotColor={colors.error}
        />
        <View style={styles.separator} />
        <BreakdownRow
          label="Skipped"
          count={skippedCount}
          dotColor={palette.slate300}
        />
      </View>
    </View>
  );
});

export { QuestionBreakdownCard };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[16],
    marginBottom: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[12],
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: palette.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate800,
  },
  breakdownList: {
    gap: 0,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownText: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate600,
    lineHeight: 20,
  },
  breakdownCount: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate800,
    lineHeight: 24,
  },
  separator: {
    height: 1,
    backgroundColor: palette.slate100,
  },
});
