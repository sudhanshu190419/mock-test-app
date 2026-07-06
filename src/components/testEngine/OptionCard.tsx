/**
 * OptionCard
 *
 * A single selectable answer option styled as a radio button.
 * Follows the HTML design: custom radio circle, label (A/B/C/D), and text.
 *
 * @module components/testEngine/OptionCard
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

interface OptionCardProps {
  /** Option identifier. */
  id: string;
  /** Display label (A, B, C, D). */
  label: string;
  /** Option text / content. */
  text: string;
  /** Whether this option is currently selected. */
  isSelected: boolean;
  /** Whether this option is disabled (test submitted). */
  disabled?: boolean;
  /** Selection callback. */
  onSelect: (optionId: string) => void;
}

const RADIO_SIZE = 24;
const RADIO_INNER_SIZE = 10;

const OptionCard = React.memo(function OptionCard({
  id,
  label,
  text,
  isSelected,
  disabled = false,
  onSelect,
}: OptionCardProps): React.JSX.Element {
  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation?.();
      if (!disabled) {
        onSelect(id);
      }
    },
    [id, disabled, onSelect],
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        isSelected && styles.containerSelected,
        pressed && !disabled && styles.containerPressed,
        disabled && styles.containerDisabled,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected, disabled }}
      accessibilityLabel={`Option ${label}: ${text}`}
    >
      {/* Custom radio circle */}
      <View
        style={[
          styles.radioOuter,
          isSelected && styles.radioOuterSelected,
        ]}
      >
        {isSelected && <View style={styles.radioInner} />}
      </View>

      {/* Option label */}
      <Text
        style={[
          styles.labelText,
          isSelected && styles.labelSelected,
        ]}
      >
        {label}.
      </Text>

      {/* Option text */}
      <Text
        style={[
          styles.optionText,
          isSelected && styles.optionTextSelected,
        ]}
        numberOfLines={0}
      >
        {text}
      </Text>

      {/* Focus ring — visible when selected */}
      {isSelected && <View style={styles.focusRing} pointerEvents="none" />}
    </Pressable>
  );
});

export { OptionCard };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[16],
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: palette.slate200,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  containerSelected: {
    borderColor: colors.primary,
    backgroundColor: palette.slate50,
  },
  containerPressed: {
    backgroundColor: '#F1F5F9',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  radioOuter: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
    borderColor: palette.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[12],
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioInner: {
    width: RADIO_INNER_SIZE,
    height: RADIO_INNER_SIZE,
    borderRadius: RADIO_INNER_SIZE / 2,
    backgroundColor: colors.surface,
  },
  labelText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate500,
    width: 22,
    flexShrink: 0,
  },
  labelSelected: {
    color: colors.primary,
  },
  optionText: {
    ...typography.body,
    fontSize: 15,
    color: palette.slate700,
    lineHeight: 22,
    flex: 1,
    marginLeft: spacing[4],
  },
  optionTextSelected: {
    fontWeight: '600',
    color: palette.slate800,
  },
  focusRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius.sm + 3,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.3,
  },
});
