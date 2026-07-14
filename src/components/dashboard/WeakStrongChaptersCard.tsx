/**
 * WeakStrongChaptersCard
 *
 * Displays a list of either weak or strong chapters with accuracy
 * percentages and progress bars. Used interchangeably for both
 * weak chapters and strong chapters sections.
 *
 * Matches the existing dashboard design language.
 *
 * @module components/dashboard/WeakStrongChaptersCard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import type { ChapterWeakStrongItem } from '../../types/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeakStrongChaptersCardProps {
  /** Title for the section (e.g. "Weak Chapters" or "Strong Chapters"). */
  title: string;
  /** The chapters array to display. */
  chapters: ChapterWeakStrongItem[];
  /** Whether this is a "weak" list (red/amber tones) or "strong" list (green tones). */
  variant: 'weak' | 'strong';
}

// ─── Component ───────────────────────────────────────────────────────────────

const WeakStrongChaptersCard = React.memo(function WeakStrongChaptersCard({
  title,
  chapters,
  variant,
}: WeakStrongChaptersCardProps): React.JSX.Element | null {
  if (chapters.length === 0) return null;

  const accentColor = variant === 'weak' ? colors.warning : colors.primary;
  const tintBg = variant === 'weak' ? colors.tint.amber : colors.tint.green;
  const icon = variant === 'weak' ? '⚠️' : '⭐';
  const barColor = variant === 'weak' ? '#F59E0B' : '#0F5132';

  return (
    <View style={styles.outer}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {icon} {title}
        </Text>
        <Text style={styles.countBadge}>{chapters.length}</Text>
      </View>

      <View style={styles.card}>
        {chapters.map((chapter, index) => (
          <View key={chapter.chapterId}>
            <View style={styles.chapterRow}>
              {/* Left: Subject + Chapter names */}
              <View style={styles.chapterInfo}>
                <Text style={styles.subjectLabel} numberOfLines={1}>
                  {chapter.subjectName}
                </Text>
                <Text style={styles.chapterLabel} numberOfLines={1}>
                  {chapter.chapterName}
                </Text>
              </View>

              {/* Right: Accuracy bar + value */}
              <View style={styles.accuracySection}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, Math.max(0, chapter.accuracy))}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                    pointerEvents="none"
                  />
                </View>
                <Text style={[styles.accuracyValue, { color: accentColor }]}>
                  {Math.round(chapter.accuracy)}%
                </Text>
              </View>
            </View>

            {/* Divider (except last) */}
            {index < chapters.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
});

export default WeakStrongChaptersCard;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 22,
  },
  countBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.inverse,
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  chapterInfo: {
    flex: 1,
    gap: 2,
  },
  subjectLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chapterLabel: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 16,
  },
  accuracySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 110,
  },
  progressTrack: {
    width: 60,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  accuracyValue: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
});
