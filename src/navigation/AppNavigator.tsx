/**
 * AppNavigator
 *
 * The authenticated application stack with premium screen transitions.
 *
 * All pushes slide in from the right (horizontal slide), and back
 * navigation reverses seamlessly — matching the Apple/Duolingo feel.
 *
 * Uses @react-navigation/native-stack with custom animation configs
 * for a 250ms ease-in-out transition.
 *
 * @module AppNavigator
 */

import React from 'react';
import { Easing, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabNavigator from './MainTabNavigator';
import TestDashboardScreen from '../screens/tests/TestDashboardScreen';
import CourseDetailScreen from '../screens/courses/CourseDetailScreen';
import CoursesScreen from '../screens/courses/CoursesScreen';
import MyStreamCoursesScreen from '../screens/courses/MyStreamCoursesScreen';
import PyqPapersScreen from '../screens/tests/PyqPapersScreen';
import ExamPackDetailScreen from '../screens/tests/ExamPackDetailScreen';
import TestInstructionsScreen from '../screens/tests/TestInstructionsScreen';
import TestEngineScreen from '../screens/tests/TestEngineScreen';
import TestResultScreen from '../screens/tests/TestResultScreen';
import TestSubmittedScreen from '../screens/tests/TestSubmittedScreen';
import MyResultsScreen from '../screens/tests/MyResultsScreen';
import AnswerReviewScreen from '../screens/tests/AnswerReviewScreen';
import AnswerReviewDetailScreen from '../screens/tests/AnswerReviewDetailScreen';
import NotificationScreen from '../screens/NotificationScreen';
import CalendarScreen from '../screens/home/CalendarScreen';
import DetailedAnalyticsScreen from '../screens/profile/DetailedAnalyticsScreen';
import PersonalInfoScreen from '../screens/profile/PersonalInfoScreen';
import PaymentHistoryScreen from '../screens/profile/PaymentHistoryScreen';
import DownloadsScreen from '../screens/profile/DownloadsScreen';
import NotificationSettingsModal from '../screens/profile/NotificationSettingsModal';
import HelpSupportModal from '../screens/profile/HelpSupportModal';
import TimetableScreen from '../screens/home/TimetableScreen';

// DEV ONLY - Remove after frontend integration
import DevNavigator from './DevNavigator';
import { colors } from '../theme/colors';

// ─── Screen Transition Config ───────────────────────────────────────────────

const SCREEN_TRANSITION_DURATION = 250;

const slideFromRight = {
  animation: 'slide_from_right' as const,
  config: {
    duration: SCREEN_TRANSITION_DURATION,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

import type { PyqPapersScreenParams } from '../screens/tests/PyqPapersScreen';
import type { ExamPackDetailParams } from '../screens/tests/ExamPackDetailScreen';
import type { TestInstructionsParams } from '../screens/tests/TestInstructionsScreen';
import type { TestEngineParams } from '../screens/tests/TestEngineScreen';
import type { TestResultParams } from '../screens/tests/TestResultScreen';
import type { TestSubmittedParams } from '../screens/tests/TestSubmittedScreen';
import type { AnswerReviewParams, AnswerReviewDetailParams } from '../types/review';

export type AppStackParamList = {
  MainTabs: undefined;
  Notification: undefined;
  TestDashboard: undefined;
  CourseDetail: { courseId: string };
  MyStreamCourses: undefined;
  PyqPapers: PyqPapersScreenParams;
  ExamPackDetail: ExamPackDetailParams;
  TestInstructions: TestInstructionsParams;
  TestEngine: TestEngineParams;
  TestResult: TestResultParams;
  TestSubmitted: TestSubmittedParams;
  MyResults: undefined;
  AnswerReview: AnswerReviewParams;
  AnswerReviewDetail: AnswerReviewDetailParams;
  Calendar: undefined;
  DetailedAnalytics: undefined;
  PersonalInfo: undefined;
  PaymentHistory: undefined;
  Downloads: undefined;
  NotificationSettings: undefined;
  HelpSupport: undefined;
  Timetable: undefined;
  // DEV ONLY - Remove after frontend integration
  DevHub: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

// ─── Navigator ──────────────────────────────────────────────────────────────

export default function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: SCREEN_TRANSITION_DURATION,
        ...Platform.select({
          ios: {
            animation: 'slide_from_right',
          },
        }),
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />

      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      />

      <Stack.Screen
        name="TestDashboard"
        component={TestDashboardScreen}
        options={{
          headerShown: true,
          headerTitle: 'Test Dashboard',
          headerBackTitle: 'Home',
          headerTintColor: colors.text.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: SCREEN_TRANSITION_DURATION,
        }}
      />

      <Stack.Screen
        name="MyStreamCourses"
        component={MyStreamCoursesScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: SCREEN_TRANSITION_DURATION,
        }}
      />

      <Stack.Screen
        name="PyqPapers"
        component={PyqPapersScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="ExamPackDetail"
        component={ExamPackDetailScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="TestInstructions"
        component={TestInstructionsScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="TestEngine"
        component={TestEngineScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
          animationDuration: 300,
        }}
      />

      <Stack.Screen
        name="TestResult"
        component={TestResultScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="TestSubmitted"
        component={TestSubmittedScreen}
        options={{
          headerShown: false,
          animation: 'fade_from_bottom',
          animationDuration: 300,
        }}
      />

      <Stack.Screen
        name="MyResults"
        component={MyResultsScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="AnswerReview"
        component={AnswerReviewScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: SCREEN_TRANSITION_DURATION,
        }}
      />

      <Stack.Screen
        name="AnswerReviewDetail"
        component={AnswerReviewDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: SCREEN_TRANSITION_DURATION,
        }}
      />

      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="DetailedAnalytics"
        component={DetailedAnalyticsScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="Downloads"
        component={DownloadsScreen}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />

      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsModal}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportModal}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      <Stack.Screen name="Timetable" component={TimetableScreen} />

      {/* DEV ONLY - Remove after frontend integration */}
      <Stack.Screen
        name="DevHub"
        component={DevNavigator}
        options={{
          headerShown: false,
          ...slideFromRight,
        }}
      />
    </Stack.Navigator>
  );
}