/**
 * DesktopActionBar
 *
 * Action buttons shown below the question area on tablet/desktop layouts.
 * Displays: Previous | Mark for Review | Save & Next.
 *
 * @module components/testEngine/DesktopActionBar
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../home/Icons';

interface DesktopActionBarProps {
  /** Whether there is a previous question to go back to. */
  hasPrevious: boolean;
  /** Whether the current question is marked for review. */
  isMarkedForReview: boolean;
  /** Previous question callback. */
  onPrevious: () => void;
  /** Toggle review mark callback. */
  onToggleReview: () => void;
  /** Save & next callback. */
  onSaveAndNext: () => void;
  /** Whether this is the last question. */
  isLastQuestion: boolean;
}

const DesktopActionBar = React.memo(function DesktopActionBar({
  hasPrevious,
  isMarkedForReview,
  onPrevious,
  onToggleReview,
  onSaveAndNext,
  isLastQuestion,
}: DesktopActionBarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.secondaryButton, !hasPrevious && styles.buttonDisabled]}
        onPress={onPrevious}
        disabled={!hasPrevious}
        activeOpacity={0.7}
        accessibilityLabel="Previous question"
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasPrevious }}
      >
        <Icon name="arrow-left" color={hasPrevious ? palette.slate600 : palette.slate300} width={18} height={18} />
        <Text style={[styles.secondaryButtonText, !hasPrevious && styles.textDisabled]}>
          Previous
        </Text>
      </TouchableOpacity>

      <View style={styles.rightGroup}>
        <TouchableOpacity
          style={[
            styles.reviewButton,
            isMarkedForReview && styles.reviewButtonActive,
          ]}
          onPress={onToggleReview}
          activeOpacity={0.7}
          accessibilityLabel={
            isMarkedForReview ? 'Unmark for review' : 'Mark for review'
          }
          accessibilityRole="button"
        >
          <Icon
            name="bookmark"
            color={isMarkedForReview ? colors.primary : palette.slate600}
            width={18}
            height={18}
          />
          <Text
            style={[
              styles.reviewButtonText,
              isMarkedForReview && styles.reviewButtonTextActive,
            ]}
          >
            {isMarkedForReview ? 'Marked' : 'Mark Review'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onSaveAndNext}
          activeOpacity={0.85}
          accessibilityLabel={isLastQuestion ? 'Submit test' : 'Save and next'}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>
            {isLastQuestion ? 'Submit' : 'Save & Next'}
          </Text>
          <Icon name="badge-check" color={colors.text.inverse} width={18} height={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export { DesktopActionBar };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[16],
    borderTopWidth: 1,
    borderTopColor: palette.slate200,
  },
  rightGroup: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  secondaryButtonText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '600',
    color: palette.slate600,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  textDisabled: {
    color: palette.slate300,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  reviewButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  reviewButtonText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '600',
    color: palette.slate600,
  },
  reviewButtonTextActive: {
    color: colors.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.inverse,
  },
});
