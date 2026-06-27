/**
 * AppNavigator
 *
 * The authenticated application stack.
 *
 * Rendered by `AuthNavigator` when the user is signed in.  This component
 * is intentionally kept as a thin, single-responsibility navigator so that
 * future authenticated screens (e.g. Profile, Settings, Classes) can be
 * added here without touching the root auth gate.
 *
 * @module AppNavigator
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/home/HomeScreen';
import TestDashboardScreen from '../screens/tests/TestDashboardScreen';

// DEV ONLY - Remove after frontend integration
import StreamServiceTestScreen from '../screens/dev/StreamServiceTestScreen';
import SubjectServiceTestScreen from '../screens/dev/SubjectServiceTestScreen';

export type AppStackParamList = {
  Home: undefined;
  TestDashboard: undefined;
  // DEV ONLY - Remove after frontend integration
  StreamServiceTest: undefined;
  SubjectServiceTest: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="TestDashboard"
        component={TestDashboardScreen}
        options={{
          headerShown: true,
          headerTitle: 'Test Dashboard',
          headerBackTitle: 'Home',
          headerTintColor: '#6C63FF',
          headerStyle: { backgroundColor: '#F5F7FA' },
          headerShadowVisible: false,
        }}
      />

      {/* DEV ONLY - Remove after frontend integration */}
      <Stack.Screen
        name="StreamServiceTest"
        component={StreamServiceTestScreen}
        options={{
          headerShown: true,
          headerTitle: 'Stream Service Test',
          headerBackTitle: 'Home',
          headerTintColor: '#6C63FF',
          headerStyle: { backgroundColor: '#1A1A2E' },
          headerShadowVisible: false,
        }}
      />

      {/* DEV ONLY - Remove after frontend integration */}
      <Stack.Screen
        name="SubjectServiceTest"
        component={SubjectServiceTestScreen}
        options={{
          headerShown: true,
          headerTitle: 'Subject Service Test',
          headerBackTitle: 'Home',
          headerTintColor: '#6C63FF',
          headerStyle: { backgroundColor: '#1A1A2E' },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}