/**
 * BottomActionBar
 *
 * Fixed bottom navigation bar for mobile layout.
 * Contains: Previous | Mark Review | Save & Next (primary) | Palette trigger.
 *
 * @module components/testEngine/BottomActionBar
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../home/Icons';

interface BottomActionBarProps {
  /** Whether there is a previous question to go back to. */
  hasPrevious: boolean;
  /** Whether the current question is marked for review. */
  isMarkedForReview: boolean;
  /** Whether this is the last question. */
  isLastQuestion: boolean;
  /** Previous question callback. */
  onPrevious: () => void;
  /** Toggle review mark callback. */
  onToggleReview: () => void;
  /** Save & next callback. */
  onSaveAndNext: () => void;
  /** Open palette callback. */
  onOpenPalette: () => void;
}

const BOTTOM_BAR_HEIGHT = 72;

const BottomActionBar = React.memo(function BottomActionBar({
  hasPrevious,
  isMarkedForReview,
  isLastQuestion,
  onPrevious,
  onToggleReview,
  onSaveAndNext,
  onOpenPalette,
}: BottomActionBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing[8] },
      ]}
    >
      <View style={styles.row}>
        {/* Previous */}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={onPrevious}
          disabled={!hasPrevious}
          activeOpacity={0.6}
          accessibilityLabel="Previous question"
          accessibilityRole="button"
        >
          <Icon
            name="arrow-left"
            color={hasPrevious ? palette.slate600 : palette.slate300}
            width={22}
            height={22}
          />
          <Text
            style={[
              styles.actionLabel,
              !hasPrevious && styles.actionLabelDisabled,
            ]}
          >
            Prev
          </Text>
        </TouchableOpacity>

        {/* Mark Review */}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={onToggleReview}
          activeOpacity={0.6}
          accessibilityLabel={
            isMarkedForReview ? 'Unmark for review' : 'Mark for review'
          }
          accessibilityRole="button"
        >
          <Icon
            name="bookmark"
            color={isMarkedForReview ? colors.primary : palette.slate600}
            width={22}
            height={22}
          />
          <Text
            style={[
              styles.actionLabel,
              isMarkedForReview && { color: colors.primary },
            ]}
          >
            Review
          </Text>
        </TouchableOpacity>

        {/* Save & Next */}
        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton]}
          onPress={onSaveAndNext}
          activeOpacity={0.85}
          accessibilityLabel={isLastQuestion ? 'Submit test' : 'Save and next'}
          accessibilityRole="button"
        >
          <Icon name="badge-check" color={colors.text.inverse} width={24} height={24} />
          <Text style={styles.saveLabel}>
            {isLastQuestion ? 'Submit' : 'Save'}
          </Text>
        </TouchableOpacity>

        {/* Palette Trigger */}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={onOpenPalette}
          activeOpacity={0.6}
          accessibilityLabel="Open question palette"
          accessibilityRole="button"
        >
          <Icon name="layers" color={palette.slate600} width={22} height={22} />
          <Text style={styles.actionLabel}>Grid</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export { BottomActionBar, BOTTOM_BAR_HEIGHT };

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: palette.slate200,
    paddingTop: spacing[8],
    paddingHorizontal: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: BOTTOM_BAR_HEIGHT - spacing[8],
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: radius.sm,
    minWidth: 64,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
  },
  actionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: palette.slate600,
    marginTop: 2,
  },
  actionLabelDisabled: {
    color: palette.slate300,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[20],
    borderRadius: radius.md,
    minWidth: 80,
  },
  saveLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.inverse,
    marginTop: 2,
  },
});
