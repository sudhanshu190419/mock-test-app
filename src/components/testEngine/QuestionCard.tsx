/**
 * QuestionCard
 *
 * Renders the question stem card matching Figma specifications. Displays:
 * - Header row with subject tag, sequence (e.g. Q. 1 / 90), type label (e.g. Single Correct),
 *   marks badges (+4, -1), and Bookmark toggle button.
 * - Body container displaying the question text stem and optional diagram image.
 *
 * @module components/testEngine/QuestionCard
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';

import Icon from '../home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

interface QuestionCardProps {
  /** The question display model. */
  question: {
    id: string;
    index: number;
    text: string;
    imageUrl?: string;
    imageAlt?: string;
    marks: number;
    negativeMarks: number;
    subjectName?: string;
    questionType?: 'mcq' | 'msq' | 'numerical' | 'true_false';
  };
  /** Total number of questions in test. */
  totalQuestions: number;
  /** Whether this question is bookmarked. */
  isBookmarked: boolean;
  /** Bookmark toggle callback. */
  onToggleBookmark: () => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics: '#1D4ED8',
  Chemistry: '#15803D',
  Maths: '#6D28D9',
  Biology: '#DC2626',
};

const TYPE_LABELS: Record<string, string> = {
  mcq: 'Single Correct',
  msq: 'Multiple Correct',
  numerical: 'Integer/Numerical',
  true_false: 'True/False',
};

export const QuestionCard = React.memo(function QuestionCard({
  question,
  totalQuestions,
  isBookmarked,
  onToggleBookmark,
}: QuestionCardProps): React.JSX.Element {
  const subjectBg = SUBJECT_COLORS[question.subjectName || ''] || '#475569';
  const typeLabel = TYPE_LABELS[question.questionType || 'mcq'] || 'MCQ';

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.header}>
        {/* Left Side: Subject Tag, Index, and Type Label */}
        <View style={styles.headerLeft}>
          <View style={[styles.subjectTag, { backgroundColor: subjectBg }]}>
            <Text style={styles.subjectTagText}>{question.subjectName || 'General'}</Text>
          </View>
          <Text style={styles.indexText}>
            Q. {question.index} / {totalQuestions}
          </Text>
          <Text style={styles.typeLabel}>{typeLabel}</Text>
        </View>

        {/* Right Side: Marks and Bookmark Toggle */}
        <View style={styles.headerRight}>
          <View style={styles.marksBadgePositive}>
            <Text style={styles.marksTextPositive}>+{question.marks}</Text>
          </View>
          <View style={styles.marksBadgeNegative}>
            <Text style={styles.marksTextNegative}>-{Math.abs(question.negativeMarks)}</Text>
          </View>
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={onToggleBookmark}
            activeOpacity={0.7}
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
          >
            <Icon
              name={isBookmarked ? 'bookmark-check' : 'bookmark'}
              color={isBookmarked ? '#F59E0B' : '#94A3B8'}
              width={16}
              height={16}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body: Question Text & Image */}
      <View style={styles.body}>
        <Text style={styles.questionText} selectable>
          {question.text || 'Question content is empty or unavailable.'}
        </Text>

        {question.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: question.imageUrl }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel={question.imageAlt || 'Question diagram'}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: spacing[12],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    minWidth: 0,
  },
  subjectTag: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  subjectTagText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  indexText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  typeLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  marksBadgePositive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    borderRadius: radius.sm - 2,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
  },
  marksTextPositive: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  marksBadgeNegative: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: radius.sm - 2,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
  },
  marksTextNegative: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  bookmarkButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  body: {
    padding: spacing[16],
  },
  questionText: {
    ...typography.bodyLarge,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 22,
    fontWeight: '500',
  },
  imageContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 180,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[12],
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
