/**
 * Root Application Component
 *
 * Sets up the application-wide provider hierarchy:
 *
 * 1. **Redux Provider** — makes the store available to all connected components
 * 2. **SafeAreaProvider** — provides safe area insets to the entire app tree
 * 3. **StatusBar** — centrally configured for Android non-translucent behaviour
 * 4. **AuthProvider** — bridges Supabase auth lifecycle events to Redux state
 * 5. **AppNavigator** — renders the navigation tree
 *
 * @module App
 */

import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store/store';
import { AuthProvider } from './src/providers/AuthProvider';
import AuthNavigator from './src/navigation/AuthNavigator';
import { ToastProvider } from './src/components/Toast';
import { colors } from './src/theme/colors';
import { initializeFCM } from './src/services/fcm/fcmService';

const queryClient = new QueryClient();

export default function App(): React.JSX.Element {
  useEffect(() => {
    initializeFCM();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <Provider store={store}>
      <SafeAreaProvider>
        {/*
         * Centralised StatusBar configuration.
         *
         * On Android:
         *   - `translucent={false}` prevents content from rendering behind the
         *     status bar (React Native's default on Android is translucent).
         *   - `backgroundColor={colors.background}` ensures the status bar
         *     blends seamlessly with the app background.
         *
         * This is the same approach used by Unacademy, WhatsApp, and YouTube
         * — the status bar is opaque with a matching background colour, and
         * per-screen safe area edges are handled by SafeAreaView from
         * react-native-safe-area-context.
         */}
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
          translucent={Platform.OS === 'android' ? false : undefined}
        />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <AuthNavigator />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </Provider>
    </GestureHandlerRootView>
  );
}