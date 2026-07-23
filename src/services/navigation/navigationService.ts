/**
 * Navigation Service
 *
 * Provides a shared navigation ref for use outside of React components
 * (FCM/Notifee event handlers) and deep-link navigation helpers that
 * load required data before navigating.
 *
 * ## Architecture
 *
 * ```
 * FCM tap handler / In-app notification tap
 *   → navigateFromNotification(actionType, actionId)
 *     → Load data if needed (e.g. getMockTestById)
 *     → navigationRef.navigate(screen, params)
 * ```
 *
 * ## Adding a new notification type
 *
 * 1. Add a case to `navigateFromNotification` mapping `actionType` →
 *    screen + params
 * 2. If the screen requires additional data (beyond `actionId`), load it
 *    using existing services before navigating
 * 3. The generic architecture means no new navigation logic is needed
 *    for future notification types — just add the case
 *
 * @module services/navigation/navigationService
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import { getMockTestById } from '../mockTest/mockTestService';
import { getMockTestQuestions } from '../mockTest/mockTestQuestionService';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { NotificationActionType } from '../../types/notification';

// ═════════════════════════════════════════════════════════════════
//  Navigation Ref
// ═════════════════════════════════════════════════════════════════
//
// This ref is attached to NavigationContainer in AuthNavigator.tsx.
// It allows navigation from anywhere (FCM handlers, Notifee events,
// Redux middleware, etc.) without needing a component context.

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

/**
 * Type-safe navigation helper using the shared ref.
 * Only navigates if the ref is ready (container is mounted).
 */
export function navigate(name: keyof AppStackParamList, params?: unknown) {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as any)(name, params);
  }
}

/**
 * Reset the navigation stack to a specific set of routes.
 */
export function reset(routes: { name: keyof AppStackParamList; params?: unknown }[]) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: routes.length - 1,
      routes: routes as any,
    });
  }
}

// ═════════════════════════════════════════════════════════════════
//  Deep-Link Navigation Helpers
// ═════════════════════════════════════════════════════════════════

/**
 * Navigate to the appropriate screen based on a notification's action type.
 *
 * This is the generic deep-link entry point. Every notification uses:
 *   actionType → determines destination screen
 *   actionId   → resource ID to pass to the destination
 *
 * @param actionType - The notification's action type (from reference_type).
 * @param actionId   - The resource ID (from reference_id).
 */
export async function navigateFromNotification(
  actionType: NotificationActionType,
  actionId?: string,
): Promise<void> {
  switch (actionType) {
    case 'mockTestDetails':
      await navigateToMockTest(actionId);
      break;
    case 'testResult':
      navigate('TestResult', {
        testId: actionId ?? '',
        attemptId: actionId ?? '',
      });
      break;
    case 'courseDetails':
      navigate('CourseDetail', { courseId: actionId ?? '' });
      break;
    case 'liveClassDetails':
      navigate('MainTabs', { screen: 'LiveClasses' });
      break;
    case 'paymentDetails':
      navigate('MainTabs', { screen: 'Profile' });
      break;
    case 'announcementDetails':
      navigate('MainTabs', { screen: 'Home' });
      break;
    case 'profile':
    case 'systemAlert':
      navigate('MainTabs', { screen: 'Profile' });
      break;
    case 'deepLink':
      // External deep links handled separately
      break;
    default:
      break;
  }
}

// ═════════════════════════════════════════════════════════════════
//  Screen-Specific Navigation Helpers
// ═════════════════════════════════════════════════════════════════

/**
 * Navigate to the TestInstructions screen for a given mock test.
 *
 * Loads the mock test metadata + question count using existing services,
 * then navigates to TestInstructions with the required params.
 *
 * @param testId - The mock test UUID (from notification.reference_id).
 */
async function navigateToMockTest(testId?: string): Promise<void> {
  if (!testId) return;

  // ── 1. Load mock test metadata ───────────────────────────────
  const testResult = await getMockTestById(testId);
  if (!testResult.success || !testResult.data) {
    console.warn('[Navigation] Mock test not found:', testId);
    return;
  }

  const mockTest = testResult.data;

  // ── 2. Load question count ───────────────────────────────────
  let questionCount = 0;
  const questionsResult = await getMockTestQuestions(testId, 'orderSequence', 'asc');
  if (questionsResult.success && questionsResult.data) {
    questionCount = questionsResult.data.length;
  }

  // ── 3. Navigate to TestInstructions ──────────────────────────
  navigate('TestInstructions', {
    examTitle: mockTest.title,
    year: new Date().getFullYear().toString(),
    displayLabel: mockTest.title,
    durationMin: mockTest.durationMin,
    questions: questionCount,
    totalMarks: mockTest.totalMarks,
    negativeMarking: mockTest.negativeMarking,
    testId,
    paperId: testId, // For assigned mock tests, use testId as paperId
  });
}
