/**
 * OtpVerificationScreen
 *
 * Verifies an OTP sent via SMS. Supports two modes:
 * - "registration":    called after signUp — on success, completes
 *                      registration and navigates to Home.
 * - "forgot_password": called after requesting an OTP — on success,
 *                      shows a "Set New Password" form, then redirects
 *                      to Login.
 *
 * Features:
 * - 6-digit OTP input with auto-advance
 * - Countdown timer for resend
 * - Resend OTP button after timer expires
 * - Handles invalid/expired OTP
 *
 * @module OtpVerificationScreen
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { suppressNextSessionSync } from '../../services/authService';
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

type OtpNavProp = NativeStackNavigationProp<AuthStackParamList, 'OtpVerification'>;
type OtpRouteProp = RouteProp<AuthStackParamList, 'OtpVerification'>;

// ─── Constants ───────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function OtpVerificationScreen(): React.JSX.Element {
  const navigation = useNavigation<OtpNavProp>();
  const route = useRoute<OtpRouteProp>();
  const insets = useSafeAreaInsets();

  const { phone, mode } = route.params;

  const { verifyOtp, resendOtp, resetPassword, loading, error } = useAuth();

  // ── OTP input ─────────────────────────────────────────────────
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  // ── Resend cooldown ───────────────────────────────────────────
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── New password (forgot_password mode only) ──────────────────
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  // ── Countdown timer ───────────────────────────────────────────
  useEffect(() => {
    startCooldown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCanResend(false);
    setCooldown(RESEND_COOLDOWN_SECONDS);

    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── OTP input handlers ────────────────────────────────────────
  const handleOtpChange = (text: string, index: number) => {
    // Only accept digits
    const sanitized = text.replace(/[^0-9]/g, '');
    const char = sanitized.slice(0, 1);

    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    // Auto-advance to next input
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      Alert.alert('Validation', 'Please enter the complete OTP.');
      return;
    }

    // For forgot-password mode, suppress the AuthProvider's automatic
    // session sync so the user stays on this screen to set a new password
    // instead of being navigated to the App stack by the AuthNavigator.
    const otpOptions = mode === 'forgot_password' ? { updateSession: false } : undefined;
    if (mode === 'forgot_password') {
      suppressNextSessionSync();
    }
    const result = await verifyOtp(phone, otpString, otpOptions);

    if (result.success) {
      setOtpVerified(true);

      if (mode === 'registration') {
        // Registration complete — navigate to Home
        // AuthNavigator will automatically switch to AppNavigator
        // since the Redux session state has been updated.
        Alert.alert(
          'Registration Complete',
          'Your phone number has been verified. Welcome!',
          [{ text: 'Continue' }],
        );
      } else {
        // Forgot password — show the new password form
        setShowNewPassword(true);
        Alert.alert(
          'OTP Verified',
          'Your identity has been confirmed. Please set a new password.',
        );
      }
    } else {
      Alert.alert('Verification Failed', result.error ?? 'Invalid or expired OTP.');
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────
  const handleResend = async () => {
    const result = await resendOtp(phone);

    if (result.success) {
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      startCooldown();
      Alert.alert('OTP Sent', 'A new OTP has been sent to your phone.');
    } else {
      Alert.alert('Failed', result.error ?? 'Could not resend OTP.');
    }
  };

  // ── Set new password (forgot_password mode) ───────────────────
  const handleSetNewPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Validation', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }

    const result = await resetPassword(newPassword);

    if (result.success) {
      Alert.alert(
        'Password Reset Successfully',
        'Your password has been updated. Please sign in with your new password.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } else {
      Alert.alert('Failed', result.error ?? 'Could not reset password.');
    }
  };

  // ── Render ────────────────────────────────────────────────────
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
          <Text style={styles.title}>
            {mode === 'registration' ? 'Verify Phone Number' : 'Verify OTP'}
          </Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{' '}
            <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                handleOtpKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading && !otpVerified}
            />
          ))}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Verify Button */}
        {!otpVerified && (
          <TouchableOpacity
            style={[
              styles.verifyButton,
              shadows.small,
              (loading || otp.join('').length !== OTP_LENGTH) && styles.buttonDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={loading || otp.join('').length !== OTP_LENGTH}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Resend Section */}
        {!otpVerified && (
          <View style={styles.resendSection}>
            {canResend ? (
              <TouchableOpacity
                onPress={handleResend}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Resend code in{' '}
                <Text style={styles.resendTimerBold}>{cooldown}s</Text>
              </Text>
            )}
          </View>
        )}

        {/* New Password Form (forgot_password mode after OTP verified) */}
        {showNewPassword && (
          <View style={styles.newPasswordSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.newPasswordTitle}>Set New Password</Text>

            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.text.secondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: spacing[16] }]}>
              Confirm New Password
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.text.secondary}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                shadows.small,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSetNewPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.verifyButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        {!otpVerified && (
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              {'\uD83D\uDD12'} If you don't receive the OTP within{' '}
              {RESEND_COOLDOWN_SECONDS} seconds, you can request a resend.
            </Text>
          </View>
        )}
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
  phoneHighlight: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[8],
    marginBottom: spacing[24],
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    backgroundColor: colors.surface,
  },
  otpBoxFilled: {
    borderColor: colors.secondary,
    backgroundColor: colors.tint.blue,
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
  verifyButton: {
    backgroundColor: colors.secondary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[8],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: spacing[20],
  },
  resendLink: {
    ...typography.body,
    color: colors.secondary,
    fontWeight: '700',
  },
  resendTimer: {
    ...typography.body,
    color: colors.text.secondary,
  },
  resendTimerBold: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  newPasswordSection: {
    marginTop: spacing[8],
  },
  divider: {
    marginVertical: spacing[20],
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.divider,
  },
  newPasswordTitle: {
    ...typography.title,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[24],
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
