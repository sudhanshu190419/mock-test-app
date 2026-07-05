/**
 * AppNavigator
 *
 * The authenticated application stack.
 *
 * Uses a root stack navigator where the MainTabNavigator (with bottom
 * tabs) is the initial screen. Full-screen pages like TestDashboard
 * are pushed on top, hiding the tab bar.
 *
 * Rendered by `AuthNavigator` when the user is signed in.
 *
 * @module AppNavigator
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabNavigator from './MainTabNavigator';
import TestDashboardScreen from '../screens/tests/TestDashboardScreen';

// DEV ONLY - Remove after frontend integration
import DevNavigator from './DevNavigator';

export type AppStackParamList = {
  MainTabs: undefined;
  TestDashboard: undefined;
  // DEV ONLY - Remove after frontend integration
  DevHub: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
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
        name="DevHub"
        component={DevNavigator}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}