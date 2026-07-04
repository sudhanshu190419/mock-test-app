/**
 * RegisterScreen
 *
 * Phone-based registration screen. Collects Full Name, Mobile Number,
 * Password, and Confirm Password. On success, navigates to the
 * OTP Verification screen to verify the phone number.
 *
 * Role is NOT collected during signup — the database trigger
 * (handle_new_user()) defaults to 'student' when not provided.
 *
 * @module RegisterScreen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import PhoneNumberInput, {
  toE164,
  validatePhoneNumber,
} from '../../components/PhoneNumberInput';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

// ─── Types ───────────────────────────────────────────────────────────────────

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OtpVerification: { phone: string; mode: 'registration' | 'forgot_password' };
};

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<RegisterNavProp>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { register, loading, error } = useAuth();

  const handleSignUp = async () => {
    // ── Client-side validation ───────────────────────────────────────
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter your full name.');
      return;
    }

    // ── Validate phone ────────────────────────────────────────────────
    if (!phone) {
      Alert.alert('Validation', 'Please enter your mobile number.');
      return;
    }

    const phoneError = validatePhoneNumber(phone);
    if (phoneError) {
      Alert.alert('Validation', phoneError);
      return;
    }

    if (!password.trim()) {
      Alert.alert('Validation', 'Please enter a password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }

    // ── Convert to E.164 and call Supabase signUp ─────────────────────
    // Role is NOT sent from the frontend — the database trigger defaults to 'student'.
    const e164Phone = toE164(phone);
    const result = await register(e164Phone, password, name.trim());

    if (result.success && result.phone) {
      // Navigate to OTP verification
      navigation.navigate('OtpVerification', {
        phone: result.phone,
        mode: 'registration',
      });
    } else {
      Alert.alert('Registration Failed', ('error' in result ? result.error : undefined) ?? 'An error occurred.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing[24] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up to start your learning journey
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Full Name */}
          <Text style={styles.inputLabel}>Full Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.text.secondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Mobile Number */}
          <PhoneNumberInput
            value={phone}
            onChange={setPhone}
            disabled={loading}
          />

          {/* Password */}
          <Text style={[styles.inputLabel, { marginTop: spacing[16] }]}>
            Password
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.text.secondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Confirm Password */}
          <Text style={[styles.inputLabel, { marginTop: spacing[16] }]}>
            Confirm Password
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.text.secondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.signUpButton,
              shadows.small,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.signUpButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Link to Login */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[40],
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing[32],
  },
  title: {
    ...typography.heading2,
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing[24],
    ...shadows.small,
  },
  errorBanner: {
    backgroundColor: colors.tint.red,
    borderRadius: 8,
    padding: spacing[12],
    marginBottom: spacing[16],
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  inputLabel: {
    ...typography.label,
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: 0,
    flex: 1,
  },
  signUpButton: {
    backgroundColor: colors.secondary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[24],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  linkText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  linkHighlight: {
    color: colors.secondary,
    fontWeight: '700',
  },
});
