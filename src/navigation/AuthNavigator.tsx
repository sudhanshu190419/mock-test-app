/**
 * AuthNavigator
 *
 * Root navigation component that gates the app experience based on
 * authentication state from the Redux store.
 *
 * All screen transitions use a subtle horizontal slide (250ms
 * ease-in-out) for a premium, native feel.
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
 * @module AuthNavigator
 */

import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectIsInitialized,
  selectIsAuthenticated,
  selectOnboardingCompleted,
  selectSelectedStreamId,
  setOnboardingCompleted,
} from '../store/authSlice';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import SplashScreen from '../screens/splash/SplashScreen';
import SelectExamScreen from '../screens/onboarding/SelectExamScreen';
import AppNavigator from './AppNavigator';

// ─── Transition Config ───────────────────────────────────────────────────────

const TRANSITION_DURATION = 250;

const screenAnimation = {
  animation: 'slide_from_right' as const,
  animationDuration: TRANSITION_DURATION,
};

// ─── Auth Stack (unauthenticated) ───────────────────────────────────────────

const AuthStack = createNativeStackNavigator();

function AuthStackScreens(): React.JSX.Element {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        ...screenAnimation,
      }}
    >
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
  const selectedStreamId = useAppSelector(selectSelectedStreamId);

  return (
    <NavigationContainer>
      {!initialized ? (
        <SplashScreen />
      ) : !onboardingCompleted ? (
        <OnboardingGate />
      ) : !isAuthenticated ? (
        <AuthStackScreens />
      ) : !selectedStreamId ? (
        <SelectExamScreen />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
}
