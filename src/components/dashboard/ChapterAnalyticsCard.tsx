/**
 * ChapterAnalyticsCard
 *
 * A state-of-the-art premium chapter-wise analytics card grouped by subject.
 * Features sleek accordion expansion (LayoutAnimation) and animated LinearGradient progress bars.
 * Uses coursesLightM3 and typographyV5 design system.
 *
 * @module components/dashboard/ChapterAnalyticsCard
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withDelay } from 'react-native-reanimated';
import { coursesLightM3 } from '../../theme/colors';
import { typographyV5 } from '../../theme/typography';
import type { ChapterAnalyticsItem } from '../../types/analytics';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChapterAnalyticsCardProps {
  chapters: ChapterAnalyticsItem[];
}

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

// ─── Animated Progress Bar ───────────────────────────────────────────────────

const AnimatedProgress = React.memo(({ percentage }: { percentage: number }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      200,
      withTiming(percentage, { duration: 200 })
    );
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFillWrapper, animatedStyle]}>
        <LinearGradient
          colors={['#34D399', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
});

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

      <AnimatedProgress percentage={clampedAccuracy} />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{attempted}</Text>
          <Text style={styles.statLabel}>Attempted</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#059669' }]}>
            {chapter.correct}
          </Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {chapter.wrong}
          </Text>
          <Text style={styles.statLabel}>Wrong</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#94A3B8' }]}>
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      >
        <View style={styles.groupHeaderLeft}>
          <View style={[styles.expandIconContainer, expanded && styles.expandIconExpanded]}>
            <Text style={styles.expandIcon}>▶</Text>
          </View>
          <Text style={styles.groupName}>{group.subjectName}</Text>
        </View>
        <View style={styles.groupHeaderRight}>
          <Text style={styles.groupAccuracy}>{avgAccuracy}%</Text>
          <View style={styles.groupCountBadge}>
            <Text style={styles.groupCountText}>{group.chapters.length}</Text>
          </View>
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
          {groups.map((group, idx) => (
            <React.Fragment key={group.subjectId}>
              <SubjectAccordion
                group={group}
                defaultExpanded={groups.length === 1}
              />
              {idx < groups.length - 1 && <View style={styles.groupDivider} />}
            </React.Fragment>
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
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  title: {
    ...typographyV5.cardTitleHero,
    color: coursesLightM3.textOnCard,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: coursesLightM3.dividerOnDark,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 16 },
      },
      android: {
        elevation: 0,
      },
    }),
    overflow: 'hidden',
  },
  scrollContainer: {
    maxHeight: 480,
  },
  // ── Subject Group ───────────────────────────────────────────────
  groupContainer: {
    backgroundColor: '#FFFFFF',
  },
  groupDivider: {
    height: 1,
    backgroundColor: coursesLightM3.dividerOnDark,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  expandIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIconExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  expandIcon: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 12,
    marginLeft: 2, // optical alignment for triangle
  },
  groupName: {
    ...typographyV5.cardTitle,
    color: '#0F172A',
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupAccuracy: {
    ...typographyV5.buttonLabel,
    color: '#059669',
    fontSize: 15,
  },
  groupCountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupCountText: {
    ...typographyV5.metadataStrong,
    color: '#059669',
  },
  // ── Chapter List ────────────────────────────────────────────────
  chapterList: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  chapterRow: {
    paddingVertical: 16,
    gap: 10,
  },
  chapterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterName: {
    ...typographyV5.metadata,
    color: '#1E293B',
    flex: 1,
    marginRight: 12,
    fontWeight: '600',
  },
  chapterAccuracy: {
    ...typographyV5.buttonLabel,
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFillWrapper: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typographyV5.buttonLabel,
    color: '#0F172A',
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    ...typographyV5.metadataSmall,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  chapterDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    opacity: 0.7,
  },
});
