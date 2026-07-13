/**
 * PerformanceSnapshotCard
 *
 * Shows subject-wise performance with icon circles, progress bars, and
 * percentage labels — matching the HTML design exactly.
 *
 * @module components/dashboard/PerformanceSnapshotCard
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';


// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubjectPerformance {
  /** Subject name (e.g. "Physics"). */
  subject: string;
  /** Emoji icon to display. */
  icon: string;
  /** Accuracy percentage (0–100). */
  accuracy: number;
}

export interface PerformanceSnapshotCardProps {
  /** Array of subject performance data. */
  subjects: SubjectPerformance[];
  /** Callback when "View Detailed Analysis" is pressed. */
  onViewDetailedAnalysis?: () => void;
}

// ─── Subject Row Component ───────────────────────────────────────────────────

const SubjectRow = React.memo(function SubjectRow({
  subject,
  icon,
  accuracy,
}: SubjectPerformance): React.JSX.Element {
  const clampedAccuracy = Math.min(100, Math.max(0, accuracy));

  return (
    <View style={styles.subjectRow}>
      {/* Icon circle */}
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Subject name (fixed width) */}
      <Text style={styles.subjectName}>{subject}</Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${clampedAccuracy}%` }]}
          pointerEvents="none"
        />
      </View>

      {/* Percentage */}
      <Text style={styles.percentage}>{Math.round(clampedAccuracy)}%</Text>
    </View>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

const PerformanceSnapshotCard = React.memo(function PerformanceSnapshotCard({
  subjects,
  onViewDetailedAnalysis,
}: PerformanceSnapshotCardProps): React.JSX.Element | null {
  if (subjects.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionOuter}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Performance Snapshot</Text>
        <TouchableOpacity
          onPress={onViewDetailedAnalysis}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityLabel="View Detailed Analysis"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View Detailed Analysis</Text>
        </TouchableOpacity>
      </View>

      {/* Subject rows */}
      <View style={styles.listContainer}>
        {subjects.map((subject) => (
          <SubjectRow key={subject.subject} {...subject} />
        ))}
      </View>
    </View>
  );
});

export default PerformanceSnapshotCard;

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
    marginBottom: 16,
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
  listContainer: {
    gap: 20,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    lineHeight: 22,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    width: 80,
    lineHeight: 18,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F5132',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    width: 36,
    textAlign: 'right',
    lineHeight: 18,
  },
});
