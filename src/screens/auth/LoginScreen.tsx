/**
 * LoginScreen — Freebuff
 *
 * Production-ready login screen with phone + password authentication.
 * Retains the branded header, animated form entrance, and keyboard-aware
 * header collapse from the email-based version.
 *
 * @module screens/auth/LoginScreen
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Animated,
  Keyboard,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../hooks/useAuth';
import PhoneNumberInput, {
  toE164,
  validatePhoneNumber,
} from '../../components/PhoneNumberInput';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import LinearGradient from 'react-native-linear-gradient';

// ═════════════════════════════════════════════════════════════════
//  Types
// ═════════════════════════════════════════════════════════════════

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OtpVerification: { phone: string; mode: 'registration' | 'forgot_password' };
};

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

// ═════════════════════════════════════════════════════════════════
//  Constants
// ═════════════════════════════════════════════════════════════════

const HEADER_HEIGHT = 340;
const COMPACT_HEADER_HEIGHT = 120;
const BADGE_SIZE = 112;
const HEADER_IMAGE = require('../../../assets/images/onboarding/welcome.png');

const LOGO_GREEN = '#1F9D55';
const LOGO_GREEN_DARK = '#15803D';
const LOGO_NAVY = '#1E3A5F';
const LOGO_GOLD = '#F5B942';

// ═════════════════════════════════════════════════════════════════
//  Small presentational pieces
// ═════════════════════════════════════════════════════════════════

function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M6 14C6 12.8954 6.89543 12 8 12H23V38H8C6.89543 38 6 37.1046 6 36V14Z"
        fill={LOGO_GREEN}
      />
      <Path
        d="M42 14C42 12.8954 41.1046 12 40 12H25V38H40C41.1046 38 42 37.1046 42 36V14Z"
        fill={LOGO_GREEN_DARK}
      />
      <Path d="M24 12L24 38" stroke="#FFFFFF" strokeWidth={1.5} />
      <Path d="M24 3L45 11L24 19L3 11L24 3Z" fill={LOGO_NAVY} />
      <Path
        d="M13 13.5V20C13 20 18 23.5 24 23.5C30 23.5 35 20 35 20V13.5"
        stroke={LOGO_NAVY}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M39 2L40.2 5.8L44 7L40.2 8.2L39 12L37.8 8.2L34 7L37.8 5.8L39 2Z"
        fill={LOGO_GOLD}
      />
    </Svg>
  );
}



// ═════════════════════════════════════════════════════════════════
//  Screen
// ═════════════════════════════════════════════════════════════════

export default function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<LoginNavProp>();
  const insets = useSafeAreaInsets();
  const { login, loading, error } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // ── Animated values for keyboard-aware header collapse ──────
  const headerHeight = useRef(new Animated.Value(HEADER_HEIGHT * 1.35)).current;
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  // ── Entrance morph animation (triggered on mount) ━━━━━━━━━━━
  const formSlideUp = useRef(new Animated.Value(1)).current;
  const fieldPhoneOpacity = useRef(new Animated.Value(0)).current;
  const fieldPasswordOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Step 0: Header shrinks smoothly to its final height
    Animated.timing(headerHeight, {
      toValue: HEADER_HEIGHT,
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // Steps 1–2: Form slides up, then fields stagger in
    Animated.sequence([
      // Step 1: Form card slides up from below
      Animated.timing(formSlideUp, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      // Step 2: Fields fade in one by one with stagger
      Animated.parallel([
        Animated.timing(fieldPhoneOpacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(120),
          Animated.timing(fieldPasswordOpacity, {
            toValue: 1,
            duration: 350,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(240),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 350,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(360),
          Animated.timing(footerOpacity, {
            toValue: 1,
            duration: 350,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [headerHeight, formSlideUp, fieldPhoneOpacity, fieldPasswordOpacity, buttonOpacity, footerOpacity]);

  const handleSignIn = async () => {
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
      Alert.alert('Validation', 'Please enter your password.');
      return;
    }

    // ── Convert to E.164 and call Supabase signIn ─────────────────────
    const e164Phone = toE164(phone);
    const result = await login(e164Phone, password);

    if (!result.success) {
      Alert.alert('Sign In Failed', result.error);
    }
  };

  

  // ── Keyboard-aware header collapse ─────────────────────────
  useEffect(() => {
    const subscribeToShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        Animated.parallel([
          Animated.timing(headerHeight, {
            toValue: COMPACT_HEADER_HEIGHT,
            duration: 280,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false,
          }),
          Animated.timing(bgOpacity, {
            toValue: 0,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: 200,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]).start();
      },
    );

    const subscribeToHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.parallel([
          Animated.timing(headerHeight, {
            toValue: HEADER_HEIGHT,
            duration: 280,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false,
          }),
          Animated.timing(bgOpacity, {
            toValue: 1,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 260,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]).start();
      },
    );

    return () => {
      subscribeToShow.remove();
      subscribeToHide.remove();
    };
  }, [headerHeight, bgOpacity, logoOpacity]);

  // ── Entrance animation interpolations ────────────────────────
  const formTranslateY = formSlideUp.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* HEADER SECTION */}
        <Animated.View style={[styles.headerSection, { height: headerHeight }]}>
          <Animated.Image
            source={HEADER_IMAGE}
            style={[styles.headerBg, { opacity: bgOpacity }]}
            resizeMode="cover"
          />

          <View style={styles.headerContent}>
            <Animated.View style={[styles.logoBadge, { opacity: logoOpacity }]}>
              <LogoMark size={44} />
              <Text style={styles.logoText}>
                <Text style={styles.logoTextDark}>Free</Text>
                <Text style={styles.logoTextAccent}>buff</Text>
              </Text>
            </Animated.View>

            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.subtitle}>
              Login to continue your learning journey
            </Text>
          </View>
        </Animated.View>

        {/* WHITE FORM SECTION (slides up on mount) */}
        <Animated.View
          style={[
            styles.formSection,
            {
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Animated.View style={{ opacity: fieldPhoneOpacity }}>
            <PhoneNumberInput
              value={phone}
              onChange={setPhone}
              disabled={loading}
            />
          </Animated.View>

          <Animated.View style={{ opacity: fieldPasswordOpacity }}>
            <Text style={[styles.inputLabel, { marginTop: spacing[16] }]}>
              Password
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={colors.text.secondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: buttonOpacity }}>
            <TouchableOpacity
              style={[
                styles.signInButton,
                shadows.small,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>
                {"Don't have an account? "}
                <Text style={styles.linkHighlight}>Create Account</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotLink}>Forgot Password?</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: footerOpacity }}>
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {'\uD83D\uDD12'} Your data is encrypted and secure.
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerSection: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
    zIndex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing[24],
    zIndex: 2,
  },
  dotCluster: {
    position: 'absolute',
    left: spacing[16],
    top: '52%',
    zIndex: 2,
  },
  dotRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.surface,
    marginRight: 10,
  },
  
  logoBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[16],
    ...shadows.small,
  },
  logoText: {
    ...typography.title,
    fontSize: 17,
    marginTop: spacing[8],
    letterSpacing: -0.3,
  },
  logoTextDark: {
    color: LOGO_NAVY,
  },
  logoTextAccent: {
    color: LOGO_GREEN,
  },
  welcomeText: {
    ...typography.heading2,
    color: colors.text.inverse,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  subtitle: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 250,
  },
  
  // ── Form Section (Perfectly Symmetrical Curve) ─────────────────
  formSection: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[24],
    paddingTop: spacing[32],
    paddingBottom: spacing[32],
    
    // Perfectly matched radii and margin
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    marginTop: -48,
    
    zIndex: 2,
  },
  // ───────────────────────────────────────────────────────────────

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
  signInButton: {
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
  signInButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[20],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginHorizontal: spacing[16],
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  linkText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  linkHighlight: {
    color: colors.secondary,
    fontWeight: '700',
  },
  forgotLink: {
    ...typography.body,
    color: colors.text.secondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing[32],
    paddingBottom: spacing[8],
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    opacity: 0.8,
  },
});