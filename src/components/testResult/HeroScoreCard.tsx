/**
 * HeroScoreCard
 *
 * Hero section showing the test title, attempt date, score breakdown,
 * and percentile. Matches the HTML design's hero card layout.
 *
 * @module components/testResult/HeroScoreCard
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../home/Icons';

interface HeroScoreCardProps {
  /** Test title (e.g. "Mock Exam - JEE Advanced Pattern"). */
  testTitle: string;
  /** Human-readable attempt label (e.g. "Today, 10:30 AM"). */
  attemptedLabel: string;
  /** Marks scored. */
  score: number;
  /** Maximum possible marks. */
  maxScore: number;
  /** Percentile (0–100). */
  percentile: number;
}

const HeroScoreCard = React.memo(function HeroScoreCard({
  testTitle,
  attemptedLabel,
  score,
  maxScore,
  percentile,
}: HeroScoreCardProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleSection}>
          <Text style={styles.testTitle}>{testTitle}</Text>
          <View style={styles.dateRow}>
            <Icon
              name="calendar"
              color={palette.slate500}
              width={16}
              height={16}
            />
            <Text style={styles.dateText}>{attemptedLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.scoreRow}>
        {/* Score */}
        <View style={styles.scoreSection}>
          <Text style={styles.sectionLabel}>Score</Text>
          <Text style={styles.scoreValue}>
            {score}
            <Text style={styles.maxScore}>/{maxScore}</Text>
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Percentile */}
        <View style={styles.scoreSection}>
          <Text style={styles.sectionLabel}>Percentile</Text>
          <Text style={styles.percentileValue}>{percentile}</Text>
        </View>
      </View>
    </View>
  );
});

export { HeroScoreCard };

const styles = StyleSheet.create({
  container: {
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[16],
  },
  titleSection: {
    flex: 1,
  },
  testTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate800,
    lineHeight: 24,
    marginBottom: spacing[4],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  dateText: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate500,
    lineHeight: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreSection: {
    flex: 1,
    alignItems: 'center',
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: palette.slate500,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing[4],
  },
  scoreValue: {
    ...typography.heading1,
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 44,
  },
  maxScore: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate300,
    lineHeight: 24,
  },
  percentileValue: {
    ...typography.heading1,
    fontSize: 36,
    fontWeight: '700',
    color: '#0058BE',
    lineHeight: 44,
  },
  divider: {
    width: 1,
    height: 56,
    backgroundColor: palette.slate200,
    opacity: 0.5,
    marginHorizontal: spacing[16],
  },
});
