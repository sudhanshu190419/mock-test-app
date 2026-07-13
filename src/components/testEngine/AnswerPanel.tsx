/**
 * AnswerPanel Components
 *
 * Renders answer input views based on question type (MCQ, MSQ, Numerical).
 * Implements Figma styling and design specs:
 * - MCQPanel: Single correct option cards (Radio behavior)
 * - MSQPanel: Multiple correct option cards (Checkbox behavior)
 * - NumericalPanel: Keyboard input via a custom 3-column NumericKeypad
 *
 * @module components/testEngine/AnswerPanel
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';

import Icon from '../home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── NumericKeypad Component ────────────────────────────────────────────────
interface NumericKeypadProps {
  value: string;
  onChange: (v: string) => void;
}

export function NumericKeypad({ value, onChange }: NumericKeypadProps): React.JSX.Element {
  const press = useCallback((key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === 'CLR') {
      onChange('');
      return;
    }
    if (key === '.') {
      if (value.includes('.')) return;
    }
    if (key === '-') {
      if (value.includes('-') || value.length > 0) return;
    }
    if (value.length < 10) {
      onChange(value + key);
    }
  }, [value, onChange]);

  const keypadRows = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['.', '0', 'backspace'],
    ['-', 'CLR', ''],
  ];

  return (
    <View style={styles.keypadWrapper}>
      {/* Display box */}
      <View style={styles.keypadDisplay}>
        {value ? (
          <Text style={styles.keypadDisplayText}>{value}</Text>
        ) : (
          <Text style={styles.keypadPlaceholderText}>Enter answer</Text>
        )}
      </View>

      {/* Grid cells */}
      <View style={styles.keypadGrid}>
        {keypadRows.map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map((key, cIdx) => {
              if (key === '') {
                return <View key={cIdx} style={styles.emptyCell} />;
              }

              const isAction = key === 'backspace' || key === 'CLR';
              const isMinus = key === '-';

              return (
                <TouchableOpacity
                  key={cIdx}
                  style={[
                    styles.keypadButton,
                    isAction && styles.keypadButtonAction,
                    isMinus && styles.keypadButtonMinus,
                  ]}
                  onPress={() => press(key)}
                  activeOpacity={0.7}
                >
                  {key === 'backspace' ? (
                    <Icon name="delete" color="#B45309" width={18} height={18} />
                  ) : key === 'CLR' ? (
                    <Icon name="x-circle" color="#B45309" width={16} height={16} />
                  ) : (
                    <Text
                      style={[
                        styles.keypadButtonText,
                        isAction && styles.keypadButtonTextAction,
                        isMinus && styles.keypadButtonTextMinus,
                      ]}
                    >
                      {key}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Option Card Item (Shared by MCQ and MSQ) ────────────────────────────────
interface OptionItemProps {
  id: string;
  label: string;
  text: string;
  imageUrl?: string;
  isSelected: boolean;
  isMsq?: boolean;
  disabled?: boolean;
  onPress: (id: string) => void;
}

const OptionItem = React.memo(function OptionItem({
  id,
  label,
  text,
  imageUrl,
  isSelected,
  isMsq = false,
  disabled = false,
  onPress,
}: OptionItemProps): React.JSX.Element {
  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress(id);
    }
  }, [id, disabled, onPress]);

  const activeColor = isMsq ? '#7C3AED' : '#194080';
  const activeBg = isMsq ? '#F5F3FF' : '#EFF6FF';

  return (
    <TouchableOpacity
      style={[
        styles.optionCard,
        isSelected && {
          borderColor: activeColor,
          backgroundColor: activeBg,
          borderWidth: 2,
        },
        disabled && { opacity: 0.6 },
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {/* Circle selector */}
      <View
        style={[
          styles.selectorCircle,
          isSelected && {
            backgroundColor: activeColor,
            borderColor: activeColor,
          },
        ]}
      >
        {isMsq ? (
          isSelected && <Icon name="check-circle" color="#FFFFFF" width={12} height={12} />
        ) : (
          <Text style={[styles.selectorLabel, isSelected && { color: '#FFFFFF' }]}>
            {label}
          </Text>
        )}
      </View>

      {/* Option Content */}
      <View style={styles.optionContent}>
        {text ? <Text style={styles.optionText}>{text}</Text> : null}
        {imageUrl ? (
          <View style={styles.optionImageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.optionImage} resizeMode="contain" />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

// ─── MCQPanel Component ──────────────────────────────────────────────────────
interface MCQPanelProps {
  question: {
    options: Array<{ id: string; label: string; text: string; imageUrl?: string }>;
  };
  value: string | null;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function MCQPanel({
  question,
  value,
  onChange,
  disabled = false,
}: MCQPanelProps): React.JSX.Element {
  return (
    <View style={styles.panelContainer}>
      {question.options.map((opt) => (
        <OptionItem
          key={opt.id}
          id={opt.id}
          label={opt.label}
          text={opt.text}
          imageUrl={opt.imageUrl}
          isSelected={value === opt.id}
          disabled={disabled}
          onPress={onChange}
        />
      ))}
    </View>
  );
}

// ─── MSQPanel Component ──────────────────────────────────────────────────────
interface MSQPanelProps {
  question: {
    options: Array<{ id: string; label: string; text: string; imageUrl?: string }>;
  };
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}

export function MSQPanel({
  question,
  value,
  onChange,
  disabled = false,
}: MSQPanelProps): React.JSX.Element {
  const toggleOption = useCallback((optionId: string) => {
    const nextValue = value.includes(optionId)
      ? value.filter((id) => id !== optionId)
      : [...value, optionId];
    onChange(nextValue);
  }, [value, onChange]);

  return (
    <View style={styles.panelContainer}>
      <View style={styles.warningPillViolet}>
        <Text style={styles.warningTextViolet}>Multiple correct — select all that apply.</Text>
      </View>
      {question.options.map((opt) => (
        <OptionItem
          key={opt.id}
          id={opt.id}
          label={opt.label}
          text={opt.text}
          imageUrl={opt.imageUrl}
          isSelected={value.includes(opt.id)}
          isMsq
          disabled={disabled}
          onPress={toggleOption}
        />
      ))}
    </View>
  );
}

// ─── NumericalPanel Component ────────────────────────────────────────────────
interface NumericalPanelProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function NumericalPanel({
  value,
  onChange,
  disabled = false,
}: NumericalPanelProps): React.JSX.Element {
  return (
    <View style={styles.panelContainer}>
      <View style={styles.warningPillBlue}>
        <Text style={styles.warningTextBlue}>Enter the numerical value using the keypad below.</Text>
      </View>
      <NumericKeypad value={value} onChange={onChange} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  panelContainer: {
    gap: spacing[12],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[12],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  selectorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[12],
    flexShrink: 0,
  },
  selectorLabel: {
    ...typography.labelSmall,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    lineHeight: 20,
  },
  optionImageContainer: {
    marginTop: spacing[8],
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionImage: {
    width: '100%',
    height: '100%',
  },

  // Warning pills
  warningPillViolet: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  warningTextViolet: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '600',
    color: '#6D28D9',
  },
  warningPillBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  warningTextBlue: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },

  // Keypad
  keypadWrapper: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: spacing[8],
    width: '100%',
  },
  keypadDisplay: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  keypadDisplayText: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  keypadPlaceholderText: {
    ...typography.body,
    fontSize: 14,
    color: '#94A3B8',
  },
  keypadGrid: {
    gap: spacing[8],
  },
  keypadRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  keypadButton: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  keypadButtonAction: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  keypadButtonMinus: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  keypadButtonText: {
    ...typography.bodyLarge,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  keypadButtonTextAction: {
    color: '#B45309',
  },
  keypadButtonTextMinus: {
    color: '#1D4ED8',
  },
  emptyCell: {
    flex: 1,
  },
});
