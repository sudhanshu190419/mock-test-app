/**
 * ContinuePracticeCard
 *
 * Card showing the current practice session with progress bar, question
 * counts, and a "Continue" CTA button.
 *
 * Matches the HTML design reference exactly.
 *
 * @module components/dashboard/ContinuePracticeCard
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { shadows } from '../../theme/shadows';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ContinuePracticeCardProps {
  /** Name of the practice test / session. */
  testName: string;
  /** Number of questions completed. */
  completedCount: number;
  /** Total number of questions. */
  totalCount: number;
  /** Progress fraction (0–1). */
  progress: number;
  /** Number of remaining questions. */
  remainingCount: number;
  /** Callback when "Continue" is pressed. */
  onContinuePress?: () => void;
  /** Callback when "View All" is pressed. */
  onViewAllPress?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ContinuePracticeCard = React.memo(function ContinuePracticeCard({
  testName,
  completedCount,
  totalCount,
  progress,
  remainingCount,
  onContinuePress,
  onViewAllPress,
}: ContinuePracticeCardProps): React.JSX.Element {
  const progressPercent = Math.min(1, Math.max(0, progress));

  return (
    <View style={styles.sectionOuter}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Continue Practice</Text>
        <TouchableOpacity
          onPress={onViewAllPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityLabel="View All"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <View style={styles.cardLeftCol}>
          {/* Dark green icon box */}
          <View style={styles.iconBox}>
            <Text style={styles.iconBoxText}>📋</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.testName} numberOfLines={1}>
            {testName}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPercent * 100}%` }]}
              pointerEvents="none"
            />
          </View>

          <View style={styles.progressInfoRow}>
            <Text style={styles.progressText}>
              <Text style={styles.progressHighlight}>{completedCount}</Text>
              {' / '}
              {totalCount} Questions Completed
            </Text>

            <View style={styles.remainingBox}>
              <Text style={styles.remainingValue}>{remainingCount}</Text>
              <Text style={styles.remainingLabel}>Remaining</Text>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={onContinuePress}
              activeOpacity={0.85}
              accessibilityLabel={`Continue ${testName}`}
              accessibilityRole="button"
            >
              <Text style={styles.continueText}>Continue</Text>
              <Text style={styles.continueArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

export default ContinuePracticeCard;

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
  cardLeftCol: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxText: {
    fontSize: 24,
    lineHeight: 28,
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
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F5132',
    borderRadius: 3,
  },
  progressInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    flex: 1,
  },
  progressHighlight: {
    color: '#0F5132',
    fontWeight: '700',
  },
  remainingBox: {
    alignItems: 'center',
    paddingRight: 12,
  },
  remainingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  remainingLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 12,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F5132',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  continueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueArrow: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
