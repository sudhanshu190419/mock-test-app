/**
 * PhoneNumberInput
 *
 * Reusable phone number input with a fixed +91 (India) country code
 * prefix. Users only type the 10-digit mobile number.
 *
 * ## Usage
 *
 * ```tsx
 * import PhoneNumberInput, { toE164 } from '../../components/PhoneNumberInput';
 *
 * const [phone, setPhone] = useState('');
 *
 * <PhoneNumberInput
 *   value={phone}
 *   onChange={setPhone}
 *   disabled={loading}
 * />
 *
 * // Before calling any auth method:
 * const e164Phone = toE164(phone); // "8860979255" → "+918860979255"
 * ```
 *
 * @module components/PhoneNumberInput
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';

// ─── Constants ───────────────────────────────────────────────────────────────

/** India country code — displayed as a non-editable prefix. */
const COUNTRY_CODE = '+91';

/** Maximum digits for an Indian mobile number. */
const MAX_DIGITS = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts a raw 10-digit phone number to E.164 format by prepending
 * the +91 country code.
 *
 * @example
 *   toE164("8860979255") // → "+918860979255"
 *   toE164("")           // → ""
 */
export function toE164(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  return `${COUNTRY_CODE}${digits}`;
}

/**
 * Validates that the input is a complete 10-digit mobile number.
 * Returns an error message string, or `null` if valid.
 *
 * @example
 *   validatePhoneNumber("8860979255") // → null
 *   validatePhoneNumber("88609")      // → "Please enter a valid 10-digit mobile number"
 *   validatePhoneNumber("")           // → null (empty is not an error — show this before submit)
 */
export function validatePhoneNumber(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 0) return null; // empty — handled by the caller
  if (digits.length < MAX_DIGITS) {
    return `Please enter a complete 10-digit mobile number`;
  }
  if (digits.length > MAX_DIGITS) {
    return `Mobile number cannot exceed ${MAX_DIGITS} digits`;
  }
  return null;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PhoneNumberInputProps {
  /** The raw 10-digit value (without country code). */
  value: string;
  /** Called with the raw 10-digit value whenever the user types. */
  onChange: (rawPhone: string) => void;
  /** Disable editing (e.g. while a network request is in flight). */
  disabled?: boolean;
  /** Label text shown above the input. Defaults to "Mobile Number". */
  label?: string;
  /** Placeholder text inside the digit input area. */
  placeholder?: string;
  /** Optional validation error to display below the input. */
  error?: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhoneNumberInput({
  value,
  onChange,
  disabled = false,
  label = 'Mobile Number',
  placeholder = '8860979255',
  error,
}: PhoneNumberInputProps): React.JSX.Element {
  const handleChange = useCallback(
    (text: string) => {
      // Strip any non-digit characters
      const digits = text.replace(/\D/g, '');
      // Enforce max 10 digits
      const clamped = digits.slice(0, MAX_DIGITS);
      onChange(clamped);
    },
    [onChange],
  );

  const hasError = !!error;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          hasError && styles.inputRowError,
        ]}
      >
        {/* Non-editable country code prefix */}
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>{COUNTRY_CODE}</Text>
        </View>

        {/* Digit input */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={MAX_DIGITS}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    ...typography.label,
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    height: 52,
    overflow: 'hidden',
  },
  inputRowError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  countryCode: {
    paddingHorizontal: spacing[16],
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.tint.blue,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  countryCodeText: {
    ...typography.subtitle,
    color: colors.text.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: spacing[16],
    height: '100%',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing[4],
    marginLeft: spacing[4],
  },
});
