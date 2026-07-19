/**
 * LatestResultCard
 *
 * Displays the most recent test result with score, percentile, accuracy,
 * and a "View Result" CTA button.
 *
 * Matches the HTML design reference exactly.
 *
 * @module components/dashboard/LatestResultCard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { shadows } from '../../theme/shadows';
import { coursesLightM3 } from '../../theme/colors';
import { typographyV5 } from '../../theme/typography';
import AnimatedPressable from '../AnimatedPressable';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface LatestResultCardProps {
  /** Test name. */
  testName: string;
  /** Date string (e.g. "28 May 2025"). */
  date: string;
  /** Score achieved. */
  score: number;
  /** Maximum possible score. */
  maxScore: number;
  /** Percentile achieved. */
  percentile: number;
  /** Accuracy percentage (0–100). */
  accuracy: number;
  /** Callback when "View Result" is pressed. */
  onViewResult?: () => void;
  /** Callback when "View All Results" is pressed. */
  onViewAllPress?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const LatestResultCard = React.memo(function LatestResultCard({
  testName,
  date,
  score,
  maxScore,
  percentile,
  accuracy,
  onViewResult,
  onViewAllPress,
}: LatestResultCardProps): React.JSX.Element {
  return (
    <View style={styles.sectionOuter}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Latest Result</Text>
        <AnimatedPressable
          onPress={onViewAllPress}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityLabel="View All Results"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View All Results</Text>
        </AnimatedPressable>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Left icon */}
        <View style={styles.iconCircle}>
          <View style={styles.iconInner}>
            <Text style={styles.iconText}>📄</Text>
          </View>
          {/* Star badge */}
          <View style={styles.starBadge}>
            <Text style={styles.starText}>⭐</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.testName} numberOfLines={1}>
            {testName}
          </Text>

          <View style={styles.dateRow}>
            <Text style={styles.dateIcon}>📅</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          <View style={styles.statsRow}>
            {/* Score */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>
                <Text style={styles.statValueLarge}>{score}</Text>
                <Text style={styles.statValueDivider}> / {maxScore}</Text>
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Percentile */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Percentile</Text>
              <Text style={styles.statValueLarge}>{percentile}</Text>
            </View>

            <View style={styles.divider} />

            {/* Accuracy */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Accuracy</Text>
              <Text style={styles.statValueLarge}>{Math.round(accuracy)}%</Text>
            </View>

            {/* View Result button */}
            <AnimatedPressable
              style={styles.viewResultButton}
              onPress={onViewResult}
              accessibilityLabel="View Result"
              accessibilityRole="button"
            >
              <Text style={styles.viewResultText}>View Result</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
});

export default LatestResultCard;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionOuter: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...typographyV5.cardTitleHero,
    color: coursesLightM3.textOnDark,
  },
  viewAllText: {
    ...typographyV5.buttonLabel,
    color: coursesLightM3.accentPrimary,
  },
  card: {
    backgroundColor: coursesLightM3.surfaceCard,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: coursesLightM3.dividerOnDark,
    ...shadows.small,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: coursesLightM3.surfaceCardDark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 4,
  },
  iconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
    lineHeight: 28,
  },
  starBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: coursesLightM3.surfaceCard,
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  starText: {
    fontSize: 10,
    lineHeight: 12,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  testName: {
    ...typographyV5.cardTitleCompact,
    color: coursesLightM3.textOnCard,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateIcon: {
    fontSize: 12,
    lineHeight: 14,
  },
  dateText: {
    ...typographyV5.metadata,
    color: coursesLightM3.textMutedOnCard,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...typographyV5.metadataSmall,
    color: coursesLightM3.textMutedOnCard,
    marginBottom: 2,
  },
  statValue: {
    ...typographyV5.ratingValue,
    color: coursesLightM3.accentPrimary,
  },
  statValueLarge: {
    ...typographyV5.ratingValue,
    fontSize: 14,
    color: coursesLightM3.accentPrimary,
  },
  statValueDivider: {
    ...typographyV5.metadataSmall,
    color: coursesLightM3.textMutedOnCard,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: coursesLightM3.dividerOnDark,
  },
  viewResultButton: {
    backgroundColor: coursesLightM3.surfaceCardDark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  viewResultText: {
    ...typographyV5.buttonLabelSmall,
    color: coursesLightM3.accentPrimary,
  },
});
