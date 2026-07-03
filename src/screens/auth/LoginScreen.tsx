/**
 * LoginScreen — Freebuff
 *
 * Production-ready login screen with:
 * - Branded header photo with a clean, perfectly symmetrical overlapping white form card
 * - Two-tone scrim (brand tint + bottom-anchored shadow) for legible text
 * - Floating circular logo badge (open book + graduation cap mark)
 * - "Skip" affordance, safe-area aware
 * - Real Supabase authentication via `useAuth` hook
 *
 * @module screens/auth/LoginScreen
 */

import React, { useState, useCallback } from 'react';
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
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../hooks/useAuth';
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
};

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

// ═════════════════════════════════════════════════════════════════
//  Constants
// ═════════════════════════════════════════════════════════════════

const HEADER_HEIGHT = 340;
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Validation', 'Please enter your password.');
      return;
    }

    const result = await login(email.trim(), password);

    if (!result.success) {
      Alert.alert('Sign In Failed', result.error);
    }
  };

  const handleSkip = useCallback(() => {
    console.warn('[LoginScreen] Skip pressed — no destination wired up yet.');
  }, []);

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
        <View style={styles.headerSection}>
          <ImageBackground
            source={HEADER_IMAGE}
            style={styles.headerBg}
            resizeMode="cover"
          >
           <LinearGradient
  colors={[
  'rgba(45,130,70,0.85)',
  'rgba(30,90,45,0.48)',
  'rgba(8,20,12,0.82)',
]}
  locations={[0, 0.45, 1]}
  start={{ x: 0.5, y: 0 }}
  end={{ x: 0.5, y: 1 }}
  style={StyleSheet.absoluteFill}
/>

            

            <TouchableOpacity
              style={[styles.skipButton, { top: insets.top + spacing[8] }]}
              onPress={handleSkip}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <View style={styles.logoBadge}>
                <LogoMark size={44} />
                <Text style={styles.logoText}>
                  <Text style={styles.logoTextDark}>Free</Text>
                  <Text style={styles.logoTextAccent}>buff</Text>
                </Text>
              </View>

              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.subtitle}>
                Login to continue your learning journey
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* WHITE FORM SECTION */}
        <View style={styles.formSection}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.text.secondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

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

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {'\uD83D\uDD12'} Your data is encrypted and secure.
            </Text>
          </View>
        </View>
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
  },
  headerBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    opacity: 0.22,
  },
  headerScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: '#02140C',
    opacity: 0.38,
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
  skipButton: {
    position: 'absolute',
    right: spacing[20],
    zIndex: 3,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  skipText: {
    ...typography.body,
    color: colors.text.inverse,
    fontWeight: '600',
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