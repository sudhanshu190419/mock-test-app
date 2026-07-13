/**
 * BottomActionBar
 *
 * Fixed bottom navigation bar matching Figma specifications. Contains:
 * - Previous button (ChevronLeft icon)
 * - Clear button (clears selected answer)
 * - Mark & Next button (violet bordered button)
 * - Save & Next button (blue primary button)
 * - Next button (ChevronRight icon)
 * - Palette button (LayoutGrid icon) with red/blue answer counts notification
 *
 * @module components/testEngine/BottomActionBar
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '../home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

interface BottomActionBarProps {
  /** Current active question index (0-based). */
  currentIndex: number;
  /** Total number of questions in test. */
  totalQuestions: number;
  /** Total number of answered questions. */
  answeredCount: number;
  /** Go to previous question callback. */
  onPrev: () => void;
  /** Go to next question callback. */
  onNext: () => void;
  /** Clear active response callback. */
  onClear: () => void;
  /** Mark for review callback. */
  onMarkForReview: () => void;
  /** Save and go next callback. */
  onSaveAndNext: () => void;
  /** Toggle question palette sheet. */
  onOpenPalette: () => void;
}

const BOTTOM_BAR_HEIGHT = 64;

const BottomActionBar = React.memo(function BottomActionBar({
  currentIndex,
  totalQuestions,
  answeredCount,
  onPrev,
  onNext,
  onClear,
  onMarkForReview,
  onSaveAndNext,
  onOpenPalette,
}: BottomActionBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom > 0 ? insets.bottom + spacing[8] : spacing[12] },
      ]}
    >
      <View style={styles.row}>
        {/* Previous Chevron Button */}
        <TouchableOpacity
          style={[styles.iconButton, isFirst && styles.disabledButton]}
          onPress={onPrev}
          disabled={isFirst}
          activeOpacity={0.7}
          accessibilityLabel="Previous question"
        >
          <Icon name="chevron-left" color={isFirst ? '#CBD5E1' : '#64748B'} width={16} height={16} />
        </TouchableOpacity>

        {/* Clear Button */}
        <TouchableOpacity
          style={styles.textButtonOutline}
          onPress={onClear}
          activeOpacity={0.7}
          accessibilityLabel="Clear response"
        >
          <Text
            style={styles.textButtonOutlineLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Clear
          </Text>
        </TouchableOpacity>

        {/* Mark & Next Button */}
        <TouchableOpacity
          style={styles.markButton}
          onPress={onMarkForReview}
          activeOpacity={0.7}
          accessibilityLabel="Mark for review and go next"
        >
          <Text
            style={styles.markButtonLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Mark &amp; Next
          </Text>
        </TouchableOpacity>

        {/* Save & Next Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={onSaveAndNext}
          activeOpacity={0.7}
          accessibilityLabel="Save response and go next"
        >
          <Text
            style={styles.saveButtonLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Save &amp; Next
          </Text>
        </TouchableOpacity>

        {/* Next Chevron Button */}
        <TouchableOpacity
          style={[styles.iconButton, isLast && styles.disabledButton]}
          onPress={onNext}
          disabled={isLast}
          activeOpacity={0.7}
          accessibilityLabel="Next question"
        >
          <Icon name="chevron-right" color={isLast ? '#CBD5E1' : '#64748B'} width={16} height={16} />
        </TouchableOpacity>

        {/* Palette Sheet Toggle Trigger */}
        <TouchableOpacity
          style={styles.paletteButton}
          onPress={onOpenPalette}
          activeOpacity={0.7}
          accessibilityLabel="Open question palette"
        >
          <Icon name="layout-grid" color="#FFFFFF" width={16} height={16} />
          {answeredCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{answeredCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

export { BottomActionBar, BOTTOM_BAR_HEIGHT };

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: BOTTOM_BAR_HEIGHT,
    gap: spacing[4],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.4,
    backgroundColor: '#F8FAFC',
  },
  textButtonOutline: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  textButtonOutlineLabel: {
    ...typography.buttonSmall,
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  markButton: {
    flex: 1.6,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#7C3AED', // var(--exam-marked)
    backgroundColor: '#F5F3FF', // light purple bg
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  markButtonLabel: {
    ...typography.buttonSmall,
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 12,
  },
  saveButton: {
    flex: 1.6,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#0058BE', // var(--exam-blue)
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#0058BE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  saveButtonLabel: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  paletteButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#155215', // var(--exam-green)
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0058BE', // var(--exam-blue)
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
