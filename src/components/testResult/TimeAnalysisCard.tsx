/**
 * TimeAnalysisCard
 *
 * Displays time management stats: total time taken, percentage of
 * total duration used, and average time per question.
 * Matches the HTML design's time card.
 *
 * @module components/testResult/TimeAnalysisCard
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../home/Icons';

interface TimeAnalysisCardProps {
  /** Total time taken in minutes. */
  timeTakenMin: number;
  /** Total test duration in minutes. */
  totalDurationMin: number;
  /** Average time per question in minutes. */
  avgTimePerQuestion: number;
}

const TimeAnalysisCard = React.memo(function TimeAnalysisCard({
  timeTakenMin,
  totalDurationMin,
  avgTimePerQuestion,
}: TimeAnalysisCardProps): React.JSX.Element {
  const timePercentage = totalDurationMin > 0
    ? Math.round((timeTakenMin / totalDurationMin) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconContainer}>
            <Icon name="timer" color="#0058BE" width={20} height={20} />
          </View>
          <Text style={styles.title}>Time</Text>
        </View>
        <Text style={styles.totalTime}>{timeTakenMin}m</Text>
      </View>

      <Text style={styles.subtitle}>
        Out of {totalDurationMin}m total
      </Text>

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            Avg: {avgTimePerQuestion.toFixed(1)}m/Q
          </Text>
        </View>
      </View>
    </View>
  );
});

export { TimeAnalysisCard };

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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
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
    backgroundColor: 'rgba(0, 88, 190, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate800,
  },
  totalTime: {
    ...typography.heading3,
    fontSize: 24,
    fontWeight: '700',
    color: '#0058BE',
    lineHeight: 32,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: palette.slate500,
    letterSpacing: 0.5,
    marginBottom: spacing[12],
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  chip: {
    backgroundColor: palette.slate100,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.sm,
  },
  chipText: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '600',
    color: palette.slate600,
  },
});
