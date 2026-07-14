/**
 * ChapterAnalyticsCard
 *
 * Displays chapter-wise analytics grouped by subject, with accuracy
 * progress bars and attempt counts.
 *
 * Matches the existing dashboard design language established by
 * PerformanceSnapshotCard.
 *
 * @module components/dashboard/ChapterAnalyticsCard
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import type { ChapterAnalyticsItem } from '../../types/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChapterAnalyticsCardProps {
  /** Array of chapter analytics items. */
  chapters: ChapterAnalyticsItem[];
}

// ─── Subject Group ───────────────────────────────────────────────────────────

interface SubjectGroup {
  subjectName: string;
  subjectId: string;
  chapters: ChapterAnalyticsItem[];
}

function groupBySubject(chapters: ChapterAnalyticsItem[]): SubjectGroup[] {
  const map = new Map<string, SubjectGroup>();
  for (const ch of chapters) {
    const existing = map.get(ch.subjectId);
    if (existing) {
      existing.chapters.push(ch);
    } else {
      map.set(ch.subjectId, {
        subjectName: ch.subjectName,
        subjectId: ch.subjectId,
        chapters: [ch],
      });
    }
  }
  return Array.from(map.values());
}

// ─── Chapter Row ─────────────────────────────────────────────────────────────

interface ChapterRowProps {
  chapter: ChapterAnalyticsItem;
}

const ChapterRow = React.memo(function ChapterRow({
  chapter,
}: ChapterRowProps): React.JSX.Element {
  const clampedAccuracy = Math.min(100, Math.max(0, chapter.accuracy));
  const attempted = chapter.questionsAttempted;

  return (
    <View style={styles.chapterRow}>
      <View style={styles.chapterTop}>
        <Text style={styles.chapterName} numberOfLines={1}>
          {chapter.chapterName}
        </Text>
        <Text style={styles.chapterAccuracy}>
          {Math.round(clampedAccuracy)}%
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${clampedAccuracy}%` },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{attempted}</Text>
          <Text style={styles.statLabel}>Attempted</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: palette.green }]}>
            {chapter.correct}
          </Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {chapter.wrong}
          </Text>
          <Text style={styles.statLabel}>Wrong</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: palette.slate400 }]}>
            {chapter.skipped}
          </Text>
          <Text style={styles.statLabel}>Skipped</Text>
        </View>
      </View>
    </View>
  );
});

// ─── Subject Accordion ───────────────────────────────────────────────────────

interface SubjectAccordionProps {
  group: SubjectGroup;
  defaultExpanded?: boolean;
}

const SubjectAccordion = React.memo(function SubjectAccordion({
  group,
  defaultExpanded = false,
}: SubjectAccordionProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const avgAccuracy = group.chapters.length > 0
    ? Math.round(
        group.chapters.reduce((sum, c) => sum + c.accuracy, 0) /
          group.chapters.length,
      )
    : 0;

  return (
    <View style={styles.groupContainer}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityLabel={`${group.subjectName} — ${group.chapters.length} chapters`}
        accessibilityRole="button"
      >
        <View style={styles.groupHeaderLeft}>
          <Text style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </Text>
          <Text style={styles.groupName}>{group.subjectName}</Text>
        </View>
        <View style={styles.groupHeaderRight}>
          <Text style={styles.groupAccuracy}>{avgAccuracy}%</Text>
          <Text style={styles.groupCount}>{group.chapters.length}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.chapterList}>
          {group.chapters.map((ch, index) => (
            <View key={ch.chapterId}>
              <ChapterRow chapter={ch} />
              {index < group.chapters.length - 1 && (
                <View style={styles.chapterDivider} />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

const ChapterAnalyticsCard = React.memo(function ChapterAnalyticsCard({
  chapters,
}: ChapterAnalyticsCardProps): React.JSX.Element | null {
  if (chapters.length === 0) return null;

  const groups = groupBySubject(chapters);

  return (
    <View style={styles.outer}>
      <Text style={styles.title}>Chapter-wise Performance</Text>

      <View style={styles.card}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.scrollContainer}
        >
          {groups.map((group) => (
            <SubjectAccordion
              key={group.subjectId}
              group={group}
              defaultExpanded={groups.length === 1}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
});

export default ChapterAnalyticsCard;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  scrollContainer: {
    maxHeight: 400,
  },
  // ── Subject Group ───────────────────────────────────────────────
  groupContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  expandIcon: {
    fontSize: 10,
    color: colors.text.secondary,
    width: 12,
    textAlign: 'center',
  },
  groupName: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupAccuracy: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  groupCount: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    backgroundColor: colors.tint.green,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  // ── Chapter List ────────────────────────────────────────────────
  chapterList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chapterRow: {
    paddingVertical: 10,
    gap: 6,
  },
  chapterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterName: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  chapterAccuracy: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F5132',
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    gap: 0,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  chapterDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 0,
  },
});
