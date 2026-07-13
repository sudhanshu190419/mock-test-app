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
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { shadows } from '../../theme/shadows';

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
        <TouchableOpacity
          onPress={onViewAllPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityLabel="View All Results"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View All Results</Text>
        </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.viewResultButton}
              onPress={onViewResult}
              activeOpacity={0.7}
              accessibilityLabel="View Result"
              accessibilityRole="button"
            >
              <Text style={styles.viewResultText}>View Result</Text>
            </TouchableOpacity>
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F5132',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...shadows.small,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
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
    backgroundColor: '#FFFFFF',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 20,
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
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
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
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F5132',
  },
  statValueLarge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F5132',
    lineHeight: 18,
  },
  statValueDivider: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  viewResultButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  viewResultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F5132',
  },
});
