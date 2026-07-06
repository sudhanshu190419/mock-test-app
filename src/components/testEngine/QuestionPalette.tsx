/**
 * QuestionPalette
 *
 * Grid of question number buttons indicating answer status via colour.
 * Rendered as a side panel on desktop or a modal on mobile.
 * Supports filtering by subject.
 *
 * @module components/testEngine/QuestionPalette
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../home/Icons';
import type { QuestionDisplay, PaletteQuestionStatus } from '../../types/testEngine';
import { SUBJECTS } from '../../data/mockTestEngine';
import type { SubjectSection } from '../../types/testEngine';

interface QuestionPaletteProps {
  /** All questions in the paper. */
  questions: QuestionDisplay[];
  /** Currently selected question index (0-based). */
  currentIndex: number;
  /** Set of answered question indices. */
  answeredIndices: Set<number>;
  /** Set of marked-for-review question indices. */
  markedForReviewIndices: Set<number>;
  /** Set of visited question indices. */
  visitedIndices: Set<number>;
  /** Active subject filter (null for all). */
  activeSubject: string | null;
  /** Subject filter change callback. */
  onSubjectChange: (subjectId: string | null) => void;
  /** Question navigation callback. */
  onQuestionSelect: (index: number) => void;
  /** Submit test callback. */
  onSubmitTest: () => void;
  /** Close the palette (for mobile modal). */
  onClose?: () => void;
  /** Whether this is rendered in a modal (mobile). */
  isModal?: boolean;
}

/** Returns the palette colour for a question's status. */
function getStatusColor(
  index: number,
  currentIndex: number,
  answeredIndices: Set<number>,
  markedForReviewIndices: Set<number>,
  visitedIndices: Set<number>,
): { bg: string; text: string; ring: boolean } {
  if (index === currentIndex) {
    return { bg: '#E8F5E9', text: colors.primary, ring: true };
  }
  if (markedForReviewIndices.has(index)) {
    return { bg: '#FFF3CD', text: '#856404', ring: false };
  }
  if (answeredIndices.has(index)) {
    return { bg: colors.primary, text: colors.text.inverse, ring: false };
  }
  if (visitedIndices.has(index)) {
    return { bg: palette.slate200, text: palette.slate600, ring: false };
  }
  return { bg: palette.slate100, text: palette.slate400, ring: false };
}

const QuestionPalette = React.memo(function QuestionPalette({
  questions,
  currentIndex,
  answeredIndices,
  markedForReviewIndices,
  visitedIndices,
  activeSubject,
  onSubjectChange,
  onQuestionSelect,
  onSubmitTest,
  onClose,
  isModal = false,
}: QuestionPaletteProps): React.JSX.Element {
  // Determine which questions to show based on subject filter
  const filteredQuestions = useMemo(() => {
    if (!activeSubject) return questions;
    return questions.filter(
      (q) => q.subjectName?.toLowerCase() === activeSubject.toLowerCase(),
    );
  }, [questions, activeSubject]);

  return (
    <View style={[styles.container, isModal && styles.containerModal]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Icon
            name={isModal ? 'layers' : 'menu-book'}
            color={palette.slate700}
            width={20}
            height={20}
          />
          <Text style={styles.headerTitle}>Question Palette</Text>
        </View>
        {isModal && onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Close palette"
          >
            <Icon name="arrow-left" color={palette.slate500} width={20} height={20} />
          </TouchableOpacity>
        )}
      </View>

      {/* Subject Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.subjectRow}
        contentContainerStyle={styles.subjectRowContent}
      >
        <TouchableOpacity
          style={[
            styles.subjectChip,
            !activeSubject && styles.subjectChipActive,
          ]}
          onPress={() => onSubjectChange(null)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.subjectChipText,
              !activeSubject && styles.subjectChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {SUBJECTS.map((subject) => (
          <TouchableOpacity
            key={subject.id}
            style={[
              styles.subjectChip,
              activeSubject === subject.id && styles.subjectChipActive,
            ]}
            onPress={() => onSubjectChange(subject.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.subjectChipText,
                activeSubject === subject.id && styles.subjectChipTextActive,
              ]}
            >
              {subject.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color={palette.slate200} label="Not Visited" />
        <LegendItem color={colors.primary} label="Answered" />
        <LegendItem color="#FFF3CD" label="Marked" />
        <LegendItem color={palette.slate100} label="Unvisited" />
      </View>

      {/* Question Grid */}
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filteredQuestions.map((q) => {
            const status = getStatusColor(
              q.index - 1,
              currentIndex,
              answeredIndices,
              markedForReviewIndices,
              visitedIndices,
            );
            return (
              <TouchableOpacity
                key={q.id}
                style={[
                  styles.gridButton,
                  { backgroundColor: status.bg },
                  status.ring && styles.gridButtonCurrent,
                ]}
                onPress={() => onQuestionSelect(q.index - 1)}
                activeOpacity={0.6}
                accessibilityLabel={`Question ${q.index}, ${getStatusLabel(
                  q.index - 1,
                  currentIndex,
                  answeredIndices,
                  markedForReviewIndices,
                  visitedIndices,
                )}`}
              >
                <Text style={[styles.gridButtonText, { color: status.text }]}>
                  {q.index}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={onSubmitTest}
          activeOpacity={0.8}
          accessibilityLabel="Submit test"
          accessibilityRole="button"
        >
          <Icon name="log-out" color={colors.error} width={20} height={20} />
          <Text style={styles.submitText}>Submit Test</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Legend Item ────────────────────────────────────────────────────

interface LegendItemProps {
  color: string;
  label: string;
}

const LegendItem = React.memo(function LegendItem({
  color,
  label,
}: LegendItemProps): React.JSX.Element {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
});

// ─── Helpers ────────────────────────────────────────────────────────

function getStatusLabel(
  index: number,
  currentIndex: number,
  answeredIndices: Set<number>,
  markedForReviewIndices: Set<number>,
  visitedIndices: Set<number>,
): string {
  if (index === currentIndex) return 'current question';
  if (markedForReviewIndices.has(index)) return 'marked for review';
  if (answeredIndices.has(index)) return 'answered';
  if (visitedIndices.has(index)) return 'visited';
  return 'not visited';
}

export { QuestionPalette, getStatusColor };

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.slate50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    overflow: 'hidden',
    flex: 1,
  },
  containerModal: {
    borderRadius: 0,
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.slate200,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  headerTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: palette.slate700,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.slate100,
  },
  subjectRow: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: palette.slate200,
  },
  subjectRowContent: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    gap: spacing[8],
    flexDirection: 'row',
  },
  subjectChip: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  subjectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subjectChipText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: palette.slate600,
  },
  subjectChipTextActive: {
    color: colors.text.inverse,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    gap: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: palette.slate200,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: spacing[8],
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    ...typography.caption,
    fontSize: 10,
    color: palette.slate500,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    padding: spacing[12],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  gridButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridButtonCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  gridButtonText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '600',
  },
  submitSection: {
    padding: spacing[12],
    borderTopWidth: 1,
    borderTopColor: palette.slate200,
    backgroundColor: colors.surface,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingVertical: spacing[12],
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: palette.red500,
    backgroundColor: colors.surface,
  },
  submitText: {
    ...typography.buttonSmall,
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
});
