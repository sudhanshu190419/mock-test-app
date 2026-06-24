/**
 * AuthNavigator
 *
 * Root navigation component that gates the app experience based on
 * authentication state from the Redux store.
 *
 * ## Navigation flow
 *
 * ```
 *                    ┌──────────────────┐
 *                    │   SplashScreen    │  ← while `initialized === false`
 *                    └────────┬─────────┘
 *                             │
 *                    ┌────────▼─────────┐
 *                    │   initialized?   │
 *                    └──┬──────────┬────┘
 *                   No  │          │ Yes
 *              ┌────────▼──┐  ┌────▼──────────┐
 *              │ Auth Stack │  │   App Stack   │
 *              │  ────────  │  │   ────────    │
 *              │  Login     │  │   Home        │
 *              │  Register  │  └───────────────┘
 *              │  ForgotPwd │
 *              └────────────┘
 * ```
 *
 * ## Architecture
 *
 * This component uses **conditional rendering** rather than a switch
 * navigator.  React Navigation handles this gracefully — when the
 * condition flips, the previous stack is unmounted and the new stack
 * mounts with its initial route.
 *
 * - No API calls (handled by AuthProvider)
 * - No business logic (handled by authService / authSlice)
 * - Pure presentation derived from Redux selectors
 *
 * @module AuthNavigator
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../store/hooks';
import {
  selectIsInitialized,
  selectIsAuthenticated,
} from '../store/authSlice';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AppNavigator from './AppNavigator';

// ─── Auth Stack (unauthenticated) ───────────────────────────────────────────

const AuthStack = createNativeStackNavigator();

function AuthStackScreens(): React.JSX.Element {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
    </AuthStack.Navigator>
  );
}

// ─── Splash Screen ──────────────────────────────────────────────────────────

function SplashScreen(): React.JSX.Element {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}

// ─── Root Navigator ─────────────────────────────────────────────────────────

export default function AuthNavigator(): React.JSX.Element {
  const initialized = useAppSelector(selectIsInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <NavigationContainer>
      {!initialized ? <SplashScreen /> : !isAuthenticated ? <AuthStackScreens /> : <AppNavigator />}
    </NavigationContainer>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
