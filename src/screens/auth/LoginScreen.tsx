/**
 * LoginScreen
 *
 * Authentication screen with real Supabase sign-in via the `useAuth` hook.
 * Also provides a **Demo Mode** entry point that bypasses real authentication
 * for testing backend services.
 *
 * @module LoginScreen
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

import { getClasses } from '../../services/classService';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../store/hooks';
import {
  setSession,
  setInitialized,
  setLoading as setReduxLoading,
} from '../../store/authSlice';
import type { SessionData, UserProfile } from '../../types/auth';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const DEMO_USER: UserProfile = {
  id: 'demo-user-000001',
  email: 'demo@mocktestapp.com',
  emailVerified: true,
  name: 'Demo Tester',
  role: 'admin',
  instituteId: null,
  phone: null,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const DEMO_SESSION: SessionData = {
  isAuthenticated: true,
  accessToken: 'demo_access_token',
  refreshToken: 'demo_refresh_token',
  user: DEMO_USER,
};

export default function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<LoginNavProp>();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { login, loading, error } = useAuth();

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

  const handleTestSupabase = async () => {
    try {
      const classes = await getClasses();
      Alert.alert('Supabase Response', JSON.stringify(classes, null, 2));
      console.log('Supabase classes:', classes);
    } catch (err: any) {
      Alert.alert('Supabase Error', err?.message ?? 'Unknown error');
    }
  };

  const handleDemoMode = () => {
    dispatch(setReduxLoading(true));
    setTimeout(() => {
      dispatch(setSession(DEMO_SESSION));
      dispatch(setInitialized(true));
      dispatch(setReduxLoading(false));
    }, 400);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        <View style={styles.titleSection}>
          <Text style={styles.appName}>MockTestApp</Text>
          <Text style={styles.subtitle}>Test Login & Sign Up</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.7}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}>
            <Text style={styles.linkText}>
              {"Don't have an account? "}
              <Text style={styles.linkHighlight}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}>
            <Text style={[styles.linkText, styles.forgotLink]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={handleTestSupabase}
            activeOpacity={0.7}>
            <Text style={styles.quickButtonText}>
              {'🔌'} Test Supabase Connection
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.demoButton}
          onPress={handleDemoMode}
          activeOpacity={0.7}>
          <Text style={styles.demoButtonIcon}>{'🚀'}</Text>
          <View style={styles.demoButtonContent}>
            <Text style={styles.demoButtonTitle}>Demo Mode (Skip Login)</Text>
            <Text style={styles.demoButtonDesc}>
              Instantly access the test dashboard with a mock admin account
            </Text>
          </View>
          <Text style={styles.demoButtonArrow}>{'→'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    fontSize: 13,
    color: '#D32F2F',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    color: '#888',
  },
  linkHighlight: {
    color: '#6C63FF',
    fontWeight: '700',
  },
  forgotLink: {
    color: '#888',
  },
  quickActions: {
    marginTop: 16,
  },
  quickButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  quickButtonText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#AAA',
    fontWeight: '600',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
  },
  demoButtonIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  demoButtonContent: {
    flex: 1,
  },
  demoButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  demoButtonDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  demoButtonArrow: {
    fontSize: 20,
    color: '#6C63FF',
    fontWeight: '700',
    marginLeft: 8,
  },
});
