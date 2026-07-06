/**
 * AccuracyCard
 *
 * Displays overall accuracy percentage with a progress bar and
 * insight text. Matches the HTML design's accuracy card.
 *
 * @module components/testResult/AccuracyCard
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../home/Icons';

interface AccuracyCardProps {
  /** Accuracy percentage (0–100). */
  accuracy: number;
  /** Insight text describing performance. */
  insight: string;
}

const AccuracyCard = React.memo(function AccuracyCard({
  accuracy,
  insight,
}: AccuracyCardProps): React.JSX.Element {
  const clampedAccuracy = Math.min(100, Math.max(0, accuracy));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconContainer}>
            <Icon name="badge-check" color={colors.primary} width={20} height={20} />
          </View>
          <Text style={styles.title}>Accuracy</Text>
        </View>
        <Text style={styles.percentage}>{Math.round(clampedAccuracy)}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${clampedAccuracy}%` }]}
          pointerEvents="none"
        />
      </View>

      <Text style={styles.insight}>{insight}</Text>
    </View>
  );
});

export { AccuracyCard };

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
    backgroundColor: 'rgba(0, 105, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate800,
  },
  percentage: {
    ...typography.heading3,
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 32,
  },
  track: {
    width: '100%',
    height: 4,
    backgroundColor: palette.slate200,
    borderRadius: 2,
    marginBottom: spacing[8],
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  insight: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate500,
    lineHeight: 20,
  },
});
