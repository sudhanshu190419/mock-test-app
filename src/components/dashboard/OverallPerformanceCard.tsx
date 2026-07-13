/**
 * OverallPerformanceCard
 *
 * Dark green gradient hero card showing overall accuracy with a circular
 * SVG progress indicator, improvement trend badge, and three stat rows.
 *
 * Matches the HTML design reference exactly.
 *
 * @module components/dashboard/OverallPerformanceCard
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { shadows } from '../../theme/shadows';

// ─── Constants ───────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 110;
const STROKE_WIDTH = 4;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Dark green gradient base colour — matches HTML #0a472a / #0F5132. */
const DARK_GREEN = '#0F5132';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface OverallPerformanceCardProps {
  /** Overall accuracy percentage (0–100). */
  accuracy: number;
  /** Number of tests attempted. */
  testsAttempted: number;
  /** Average score across tests. */
  averageScore: number;
  /** Best score achieved. */
  bestScore: number;
  /** Improvement trend text (e.g. "12% improvement from last month"). */
  improvementText?: string;
}

// ─── Circular Progress (white on green) ──────────────────────────────────────

interface CircularProgressProps {
  percentage: number;
}

const CircularProgress = React.memo(function CircularProgress({
  percentage,
}: CircularProgressProps): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, percentage));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox="0 0 36 36">
      {/* Background track — semi-transparent white */}
      <Circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="3.8"
      />
      {/* Progress arc — white */}
      <Circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke="#4ADE80"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeDasharray="100, 100"
        strokeDashoffset={100 - clamped}
      />
      {/* Centre text */}
      <SvgText
        x="18"
        y="20"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="9"
        fontWeight="700"
      >
        {Math.round(clamped)}%
      </SvgText>
      <SvgText
        x="18"
        y="25"
        textAnchor="middle"
        fill="rgba(255,255,255,0.9)"
        fontSize="4"
        fontWeight="500"
      >
        Accuracy
      </SvgText>
    </Svg>
  );
});

// ─── Stat Row (single) ───────────────────────────────────────────────────────

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

const StatRow = React.memo(function StatRow({
  icon,
  label,
  value,
}: StatRowProps): React.JSX.Element {
  return (
    <View style={styles.statRow}>
      <View style={styles.statIcon}>{icon}</View>
      <View style={styles.statTextGroup}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

const OverallPerformanceCard = React.memo(function OverallPerformanceCard({
  accuracy,
  testsAttempted,
  averageScore,
  bestScore,
  improvementText = '12% improvement from last month',
}: OverallPerformanceCardProps): React.JSX.Element {
  const clampedAccuracy = Math.min(100, Math.max(0, accuracy));

  return (
    <View style={styles.container}>
      {/* Decorative glow */}
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.content}>
        {/* Left: Overall Accuracy column */}
        <View style={styles.leftColumn}>
          <Text style={styles.overallLabel}>Overall Accuracy</Text>
          <Text style={styles.overallValue}>{Math.round(clampedAccuracy)}%</Text>
          <View style={styles.trendBadge}>
            <Text style={styles.trendArrow}>↑</Text>
            <Text style={styles.trendText}>{improvementText}</Text>
          </View>
        </View>

        {/* Center: Circular progress */}
        <View style={styles.centerColumn}>
          <CircularProgress percentage={clampedAccuracy} />
        </View>

        {/* Right: Stats list */}
        <View style={styles.rightColumn}>
          <StatRow
            icon={
              <View style={styles.miniIcon}>
                <Text style={styles.miniIconText}>📋</Text>
              </View>
            }
            label="Tests Attempted"
            value={testsAttempted}
          />
          <StatRow
            icon={
              <View style={styles.miniIcon}>
                <Text style={styles.miniIconText}>📊</Text>
              </View>
            }
            label="Average Score"
            value={averageScore}
          />
          <StatRow
            icon={
              <View style={styles.miniIcon}>
                <Text style={styles.miniIconText}>🏆</Text>
              </View>
            }
            label="Best Score"
            value={bestScore}
          />
        </View>
      </View>
    </View>
  );
});

export default OverallPerformanceCard;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: DARK_GREEN,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  glow: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  // Left column
  leftColumn: {
    flex: 1,
    paddingRight: 8,
  },
  overallLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  overallValue: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 12,
    lineHeight: 48,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  trendArrow: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 16,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 12,
    maxWidth: 80,
  },
  // Center column
  centerColumn: {
    width: '28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  // Right column
  rightColumn: {
    flex: 1,
    paddingLeft: 8,
    gap: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIconText: {
    fontSize: 14,
    lineHeight: 16,
  },
  statTextGroup: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 14,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
  },
});
