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

import React, { useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectIsInitialized,
  selectIsAuthenticated,
  selectOnboardingCompleted,
  setOnboardingCompleted,
} from '../store/authSlice';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import SplashScreen from '../screens/splash/SplashScreen';
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
      <AuthStack.Screen
        name="OtpVerification"
        component={OtpVerificationScreen}
      />
    </AuthStack.Navigator>
  );
}

// ─── Onboarding (single animated screen) ───────────────────────────────────

/**
 * Single-screen onboarding flow with animated content transitions.
 *
 * - "Next" advances to the next step within the single component
 * - "Skip" / "Skip for now" dispatches `setOnboardingCompleted(true)`
 *   which unmounts onboarding and shows auth/app.
 */
function OnboardingGate(): React.JSX.Element {
  const dispatch = useAppDispatch();

  const handleComplete = useCallback(() => {
    dispatch(setOnboardingCompleted(true));
  }, [dispatch]);

  return <OnboardingScreen onComplete={handleComplete} />;
}

// ─── Root Navigator ─────────────────────────────────────────────────────────

export default function AuthNavigator(): React.JSX.Element {
  const initialized = useAppSelector(selectIsInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const onboardingCompleted = useAppSelector(selectOnboardingCompleted);

  return (
    <NavigationContainer>
      {!initialized ? (
        <SplashScreen />
      ) : !onboardingCompleted ? (
        <OnboardingGate />
      ) : !isAuthenticated ? (
        <AuthStackScreens />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
}
