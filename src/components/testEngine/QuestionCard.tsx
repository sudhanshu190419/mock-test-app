/**
 * QuestionCard
 *
 * Renders the full question view: header with question number and
 * marks badges, question text, optional image, and all answer options.
 *
 * @module components/testEngine/QuestionCard
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Platform } from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { OptionCard } from './OptionCard';
import type { QuestionDisplay } from '../../types/testEngine';

interface QuestionCardProps {
  /** The question to display. */
  question: QuestionDisplay;
  /** Currently selected option ID (null if none). */
  selectedOptionId: string | null;
  /** Whether the test is submitted (disables interactions). */
  isSubmitted?: boolean;
  /** Selection callback. */
  onOptionSelect: (optionId: string) => void;
}

const QuestionCard = React.memo(function QuestionCard({
  question,
  selectedOptionId,
  isSubmitted = false,
  onOptionSelect,
}: QuestionCardProps): React.JSX.Element {
  // ── [STEP4] Log what QuestionCard receives ──────────────────────────
  console.log('[STEP4] QuestionCard received — text:', question.text);
  console.log('[STEP4] QuestionCard received — imageUrl:', question.imageUrl);
  console.log('[STEP4] QuestionCard received — imageAlt:', question.imageAlt);
  console.log('[STEP4] QuestionCard received — options:', JSON.stringify(question.options, null, 2));

  const handleOptionSelect = useCallback(
    (optionId: string) => {
      onOptionSelect(optionId);
    },
    [onOptionSelect],
  );

  return (
    <View style={styles.container}>
      {/* Question Header */}
      <View style={styles.header}>
        <Text style={styles.questionNumber}>
          Question {question.index}
        </Text>
        <View style={styles.badgesRow}>
          <View style={[styles.marksBadge, styles.marksBadgePositive]}>
            <Text style={styles.marksBadgeText}>
              +{question.marks} Marks
            </Text>
          </View>
          <View style={[styles.marksBadge, styles.marksBadgeNegative]}>
            <Text style={[styles.marksBadgeText, styles.marksBadgeTextNegative]}>
              -{question.negativeMarks} Mark
            </Text>
          </View>
        </View>
      </View>

      {/* Question Text */}
      <Text style={styles.questionText} selectable>
        {question.text}
      </Text>

      {/* Question Image */}
      {question.imageUrl && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: question.imageUrl }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={question.imageAlt ?? 'Question diagram'}
          />
        </View>
      )}

      {/* Options */}
      <View style={styles.optionsList}>
        {question.options.map((option) => (
          <OptionCard
            key={option.id}
            id={option.id}
            label={option.label}
            text={option.text}
            imageUrl={option.imageUrl}
            isSelected={selectedOptionId === option.id}
            disabled={isSubmitted}
            onSelect={handleOptionSelect}
          />
        ))}
      </View>
    </View>
  );
});

export { QuestionCard };

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[16],
    marginBottom: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[16],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: palette.slate100,
  },
  questionNumber: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: palette.slate800,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  marksBadge: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  marksBadgePositive: {
    backgroundColor: '#E8F5E9',
  },
  marksBadgeNegative: {
    backgroundColor: '#FFEBEE',
  },
  marksBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
    letterSpacing: 0.3,
  },
  marksBadgeTextNegative: {
    color: colors.error,
  },
  questionText: {
    ...typography.bodyLarge,
    fontSize: 16,
    color: palette.slate800,
    lineHeight: 26,
    marginBottom: spacing[16],
  },
  imageContainer: {
    backgroundColor: palette.slate50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.slate200,
    overflow: 'hidden',
    marginBottom: spacing[16],
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  optionsList: {
    gap: spacing[8],
  },
});
