/**
 * QuestionPalette
 *
 * Implements the Question Palette component matching Figma specifications. Displays:
 * - Grouped subject columns (Physics, Chemistry, Maths)
 * - Progress indicators and progress bars per subject
 * - Color-coded question buttons indicating status (Answered, Marked, Skipped, Not Visited)
 * - Highlights the currently active question with an outline ring
 * - Modal layout for mobile, sidebar layout for desktop/tablet
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
  Modal,
  Platform,
  Dimensions,
} from 'react-native';

import Icon from '../home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import type { QuestionDisplay } from '../../types/testEngine';

interface QuestionPaletteProps {
  /** All questions in the mock test. */
  questions: QuestionDisplay[];
  /** Map of question index to option selected (or array/string). */
  selectedOptions: Record<number, string | string[] | null>;
  /** Set of question indices marked for review. */
  markedForReview: Set<number>;
  /** Set of question indices visited by the user. */
  visitedQuestions: Set<number>;
  /** Currently active question index. */
  currentIndex: number;
  /** Navigation callback to jump to a question. */
  onQuestionSelect: (index: number) => void;
  /** Visible status of the mobile sheet. */
  open: boolean;
  /** Close action for mobile sheet. */
  onClose: () => void;
  /** Force sidebar rendering (for desktop view). */
  isSidebar?: boolean;
}

const SUBJECT_META: Record<string, { tint: string; bar: string; text: string }> = {
  Physics: { tint: '#EFF6FF', bar: '#1D4ED8', text: '#1E40AF' },
  Chemistry: { tint: '#F0FDF4', bar: '#15803D', text: '#166534' },
  Maths: { tint: '#F5F3FF', bar: '#7C3AED', text: '#5B21B6' },
  Biology: { tint: '#FFF5F5', bar: '#DC2626', text: '#991B1B' },
};

export const QuestionPalette = React.memo(function QuestionPalette({
  questions,
  selectedOptions,
  markedForReview,
  visitedQuestions,
  currentIndex,
  onQuestionSelect,
  open,
  onClose,
  isSidebar = false,
}: QuestionPaletteProps): React.JSX.Element {
  // Group questions by subject name
  const groupedData = useMemo(() => {
    const map: Record<string, QuestionDisplay[]> = {};
    for (const q of questions) {
      const subject = q.subjectName || 'General';
      if (!map[subject]) {
        map[subject] = [];
      }
      map[subject].push(q);
    }
    return map;
  }, [questions]);

  // Derived counts
  const answeredCount = useMemo(() => {
    let count = 0;
    for (const [idx, val] of Object.entries(selectedOptions)) {
      if (val !== null && val !== undefined && (typeof val !== 'string' || val !== '')) {
        if (!Array.isArray(val) || val.length > 0) {
          count++;
        }
      }
    }
    return count;
  }, [selectedOptions]);

  const markedCount = markedForReview.size;

  const handleJump = useCallback(
    (index: number) => {
      onQuestionSelect(index);
      if (!isSidebar) {
        onClose();
      }
    },
    [onQuestionSelect, onClose, isSidebar]
  );

  const getQuestionStatus = useCallback(
    (index: number) => {
      const isAnswered =
        selectedOptions[index] !== null &&
        selectedOptions[index] !== undefined &&
        (typeof selectedOptions[index] !== 'string' || selectedOptions[index] !== '');

      const isMarked = markedForReview.has(index);
      const isVisited = visitedQuestions.has(index);

      if (isAnswered) return 'answered';
      if (isMarked) return 'marked';
      if (isVisited) return 'skipped';
      return 'not-visited';
    },
    [selectedOptions, markedForReview, visitedQuestions]
  );

  const renderContent = () => {
    const subjectsList = Object.keys(groupedData);

    return (
      <View style={styles.paletteContent}>
        {/* Drag handle (mobile only) */}
        {!isSidebar && (
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Question Palette</Text>
            <Text style={styles.headerSubtitle}>
              {answeredCount} answered  •  {markedCount} marked  •  {questions.length - answeredCount - markedCount} remaining
            </Text>
          </View>
          {!isSidebar && (
            <TouchableOpacity style={styles.closeIconButton} onPress={onClose} activeOpacity={0.7}>
              <Icon name="x" color="#64748B" width={16} height={16} />
            </TouchableOpacity>
          )}
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {[
            { color: '#22C55E', label: 'Answered' },
            { color: '#7C3AED', label: 'Marked' },
            { color: '#D1D5DB', label: 'Skipped' },
            { color: '#F3F4F6', label: 'Not Visited', border: '#E5E7EB' },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: item.color },
                  item.border ? { borderWidth: 1, borderColor: item.border } : null,
                ]}
              />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Subject columns scroll container */}
        <ScrollView
          style={styles.subjectScroll}
          contentContainerStyle={styles.subjectScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={isSidebar ? styles.gridStacked : styles.gridColumns}>
            {subjectsList.map((subject, sIdx) => {
              const sc = SUBJECT_META[subject] || { tint: '#F3F4F6', bar: '#64748B', text: '#334155' };
              const subjectQs = groupedData[subject] || [];

              // Calculate subject specific answered count
              const subjectAnswered = subjectQs.filter((q) => {
                const globalIndex = q.index - 1;
                const opt = selectedOptions[globalIndex];
                return opt !== null && opt !== undefined && (typeof opt !== 'string' || opt !== '');
              }).length;

              const progressPct = subjectQs.length > 0 ? (subjectAnswered / subjectQs.length) * 100 : 0;

              return (
                <View key={subject} style={styles.subjectCard}>
                  {/* Subject Header */}
                  <View style={[styles.subjectHeader, { backgroundColor: sc.tint }]}>
                    <Text style={[styles.subjectTitle, { color: sc.text }]}>{subject}</Text>
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${progressPct}%`, backgroundColor: sc.bar },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressRatio, { color: sc.text }]}>
                        {subjectAnswered}/{subjectQs.length}
                      </Text>
                    </View>
                  </View>

                  {/* Buttons Grid */}
                  <View style={styles.buttonsContainer}>
                    {subjectQs.map((q) => {
                      const globalIndex = q.index - 1;
                      const status = getQuestionStatus(globalIndex);
                      const isCurrent = globalIndex === currentIndex;

                      const bg =
                        status === 'answered' ? '#22C55E' :
                        status === 'marked' ? '#7C3AED' :
                        status === 'skipped' ? '#D1D5DB' : '#F3F4F6';

                      const fg =
                        status === 'answered' || status === 'marked' ? '#FFFFFF' :
                        status === 'skipped' ? '#374151' : '#94A3B8';

                      return (
                        <TouchableOpacity
                          key={q.id}
                          style={[
                            styles.badgeButton,
                            { backgroundColor: bg },
                            isCurrent && styles.badgeButtonCurrent,
                          ]}
                          onPress={() => handleJump(globalIndex)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.badgeText, { color: fg }]}>
                            {q.index}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (isSidebar) {
    return <View style={styles.sidebarContainer}>{renderContent()}</View>;
  }

  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.mobileModalContainer}>
        {/* Backdrop Scrim */}
        <TouchableOpacity
          style={styles.mobileModalScrim}
          activeOpacity={1}
          onPress={onClose}
        />
        {/* Bottom Sheet wrapper */}
        <View style={styles.mobileSheet}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
});

const SCREEN_HEIGHT = Dimensions.get('window').height;

const styles = StyleSheet.create({
  // Desktop sidebar wrapper
  sidebarContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  // Mobile Modal layout
  mobileModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mobileModalScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  mobileSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 16,
      },
    }),
  },

  // Main Palette Content
  paletteContent: {
    flexDirection: 'column',
    width: '100%',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    ...typography.title,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  closeIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Legend
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[12],
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  // Subject scroll area
  subjectScroll: {
    maxHeight: SCREEN_HEIGHT * 0.52,
  },
  subjectScrollContent: {
    padding: spacing[12],
  },
  gridColumns: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  gridStacked: {
    flexDirection: 'column',
    gap: spacing[12],
  },
  subjectCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    minWidth: 100,
  },
  subjectHeader: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
  },
  subjectTitle: {
    ...typography.labelSmall,
    fontSize: 11,
    fontWeight: '800',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[4],
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressRatio: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
  },

  // Buttons Grid
  buttonsContainer: {
    padding: spacing[8],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  badgeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeButtonCurrent: {
    borderWidth: 2,
    borderColor: '#194080', // var(--exam-blue)
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
  },
});
