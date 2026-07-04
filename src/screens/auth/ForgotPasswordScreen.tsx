/**
 * ForgotPasswordScreen
 *
 * Phone-based forgot password flow:
 * 1. User enters their mobile number
 * 2. An OTP is sent via SMS (using Supabase signInWithOtp)
 * 3. User navigates to the OTP Verification screen
 * 4. After verifying the OTP, user sets a new password
 * 5. Redirected back to Login
 *
 * @module ForgotPasswordScreen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
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

type ForgotPasswordNavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function ForgotPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<ForgotPasswordNavProp>();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const { resendOtp, loading } = useAuth();

  const handleSendOtp = async () => {
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

    // ── Convert to E.164 and send OTP ─────────────────────────────────
    const e164Phone = toE164(phone);
    const result = await resendOtp(e164Phone);

    if (result.success) {
      // Navigate to OTP verification in forgot_password mode
      navigation.navigate('OtpVerification', {
        phone: e164Phone,
        mode: 'forgot_password',
      });
    } else {
      Alert.alert(
        'Failed to Send OTP',
        result.error ?? 'Could not send OTP. Please check the number and try again.',
      );
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
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your registered mobile number. We'll send you an OTP to
            verify your identity.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <PhoneNumberInput
            value={phone}
            onChange={setPhone}
            disabled={loading}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              shadows.small,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSendOtp}
            disabled={loading || !phone.trim()}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.sendButtonText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
              Remember your password?{' '}
              <Text style={styles.linkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {'\uD83D\uDD12'} We'll send a one-time password via SMS to verify
            your identity.
          </Text>
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
  backButton: {
    marginBottom: spacing[16],
  },
  backText: {
    ...typography.body,
    color: colors.secondary,
    fontWeight: '600',
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
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing[24],
    ...shadows.small,
  },
  sendButton: {
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
  sendButtonText: {
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
  infoSection: {
    marginTop: spacing[24],
    paddingHorizontal: spacing[8],
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
