/**
 * FCM Service
 *
 * Reusable service layer for Firebase Cloud Messaging (FCM) registration
 * and foreground notification handling.
 *
 * ## Responsibilities
 *
 * - Request notification permission (Android 13+ requires `POST_NOTIFICATIONS`)
 * - Obtain the FCM registration token
 * - Register a foreground message listener via `messaging().onMessage()`
 * - Display local notifications when the app is in foreground
 * - Expose a single `initializeFCM()` entry point for app startup
 *
 * ## Foreground Notification Behaviour
 *
 * When the app is in the foreground, Android **does not** automatically show
 * a system notification tray entry for FCM messages. Instead, the
 * `onMessage` callback fires, and this service uses **Notifee** to manually
 * display a local notification.
 *
 * | App State    | Behaviour                                                    |
 * |--------------|-------------------------------------------------------------|
 * | Foreground   | `onMessage` fires → Notifee creates a local notification     |
 * | Background   | Android system tray displays the notification automatically  |
 * | Terminated   | Android system tray displays the notification automatically  |
 *
 * ## Usage
 *
 * ```ts
 * import { initializeFCM } from '../services/fcm/fcmService';
 *
 * // Call once at app startup (e.g. in App.tsx)
 * initializeFCM();
 * ```
 *
 * ## Permission Architecture
 *
 * | Platform     | SDK        | Method                                   |
 * |--------------|------------|------------------------------------------|
 * | Android      | >= 33      | `PermissionsAndroid.request(...)`        |
 * | Android      | < 33       | No runtime permission required           |
 * | iOS          | any        | `messaging().requestPermission()`        |
 *
 * @module services/fcm/fcmService
 */

import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { store } from '../../store/store';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Tag used for all console.log output from this service. */
const TAG = '[FCM]';

// ─── Notifee Constants ───────────────────────────────────────────────────────

/**
 * The Android notification channel used for all foreground notifications.
 * Created once during `initializeFCM()` and reused for every foreground
 * message.
 */
const DEFAULT_CHANNEL_ID = 'fcm_foreground';
const DEFAULT_CHANNEL_NAME = 'Notifications';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Request notification permission from the user.
 *
 * **Android (SDK >= 33):**
 * Uses `PermissionsAndroid.request(POST_NOTIFICATIONS)` which triggers the
 * system's runtime permission dialog. This is the **correct** approach for
 * Android 13+ — `messaging().requestPermission()` does **not** reliably
 * show the system permission dialog on Android.
 *
 * **Android (SDK < 33):**
 * No runtime permission required. Returns `'granted'` immediately.
 *
 * **iOS:**
 * Uses `messaging().requestPermission()` which triggers the system
 * notification permission dialog with alert, sound, and badge options.
 *
 * @returns The permission result:
 *   - `'granted'` — permission granted
 *   - `'denied'`  — permission denied
 *   - `'never_ask_again'` — (Android only) user permanently denied
 */
export async function requestPermission(): Promise<
  'granted' | 'denied' | 'never_ask_again'
> {
  if (Platform.OS === 'android') {
    // ── Android ────────────────────────────────────────────────────────────
    //
    // React Native Firebase's messaging().requestPermission() on Android
    // does NOT reliably trigger the POST_NOTIFICATIONS system dialog on
    // Android 13+ (API 33+). The correct approach is to use React Native's
    // built-in PermissionsAndroid API which properly goes through the
    // Android permission framework.
    //
    // Permission is only needed on SDK >= 33 (Android 13+).

    if ((Platform.Version as number) >= 33) {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return result as 'granted' | 'denied' | 'never_ask_again';
      } catch (error) {
        console.error(`${TAG} Permission request failed:`, error);
        throw error;
      }
    }

    // SDK < 33 → no runtime permission required
    return 'granted';
  }

  // ── iOS ──────────────────────────────────────────────────────────────────
  //
  // On iOS, messaging().requestPermission() is the correct API. It triggers
  // the system notification permission dialog.
  try {
    const authStatus = await messaging().requestPermission();

    if (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL ||
      authStatus === messaging.AuthorizationStatus.EPHEMERAL
    ) {
      return 'granted';
    }

    return 'denied';
  } catch (error) {
    console.error(`${TAG} Permission request failed:`, error);
    throw error;
  }
}

/**
 * Check the current notification permission status without prompting the user.
 *
 * **Android (SDK >= 33):** Checks `POST_NOTIFICATIONS` via PermissionsAndroid.
 * **Android (SDK < 33):**   Returns `true` (permission is implicit).
 * **iOS:**                  Checks via `messaging().hasPermission()`.
 *
 * @returns `true` if notification permission is granted, `false` otherwise.
 */
export async function checkPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if ((Platform.Version as number) >= 33) {
      try {
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } catch (error) {
        console.error(`${TAG} Permission check failed:`, error);
        throw error;
      }
    }

    // SDK < 33 → permission is implicit
    return true;
  }

  // ── iOS ──────────────────────────────────────────────────────────────────
  try {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL ||
      authStatus === messaging.AuthorizationStatus.EPHEMERAL
    );
  } catch (error) {
    console.error(`${TAG} Permission check failed:`, error);
    throw error;
  }
}

/**
 * Retrieve the FCM registration token for this device.
 *
 * On Android, the token is generated by the Firebase SDK and identifies
 * this device instance for push notification targeting. The token can
 * change over time (e.g. on app reinstall, or when Firebase rotates it),
 * so callers should handle token refreshes in a later phase.
 *
 * @returns The FCM registration token string, or `null` if retrieval failed.
 */
export async function getToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error(`${TAG} Token retrieval failed:`, error);
    throw error;
  }
}

/**
 * Initialize FCM at application startup.
 *
 * This is the single entry point. It:
 *
 * 1. Creates the Android notification channel (required for Android 8+)
 * 2. Registers the foreground message listener (via `messaging().onMessage()`)
 * 3. Requests notification permission using the correct platform-specific API
 * 4. If permission is granted, retrieves and logs the FCM registration token
 * 5. If permission is denied, logs the denial
 * 6. If token retrieval fails, logs the full error
 *
 * Call this function **once** at app startup, e.g. in a `useEffect` inside
 * the root `App` component.
 *
 * @example
 * // In App.tsx
 * useEffect(() => {
 *   initializeFCM();
 * }, []);
 */
export async function initializeFCM(): Promise<void> {
  console.log(`${TAG} Initializing Firebase Cloud Messaging...`);

  // ── Create Android notification channel ────────────────────────────────
  // Must be done before any notification can be displayed.
  await createNotificationChannel();

  // ── Register foreground message handler ─────────────────────────────────
  // This handles FCM messages delivered while the app is in the foreground.
  setupForegroundMessageHandler();

  if (Platform.OS === 'android') {
    await initializeFCMAndroid();
  } else {
    await initializeFCMiOS();
  }
}

// ─── Platform-specific Initialization ───────────────────────────────────────

/**
 * Initialize FCM on Android.
 *
 * Permission flow:
 *   - SDK >= 33: Prompt user with `POST_NOTIFICATIONS` dialog via
 *     `PermissionsAndroid.request()`
 *   - SDK < 33:  No runtime permission required
 *
 * After permission is resolved (or skipped on older SDK), the FCM token
 * is fetched and logged.
 */
async function initializeFCMAndroid(): Promise<void> {
  console.log(`${TAG} Platform: Android`);
  console.log(`${TAG} Android SDK: ${Platform.Version}`);

  // ── Step 1: Request POST_NOTIFICATIONS permission (SDK >= 33) ────────────

  if ((Platform.Version as number) >= 33) {
    console.log(`${TAG} Requesting POST_NOTIFICATIONS permission...`);

    let permissionResult: 'granted' | 'denied' | 'never_ask_again';

    try {
      permissionResult = await requestPermission();
    } catch (error) {
      console.error(`${TAG} Permission request failed:`, error);
      if (error instanceof Error) {
        console.error(`${TAG} Error: ${error.message}`);
      }
      // Continue to token fetch — token may still work for data messages
      permissionResult = 'denied';
    }

    // Log the raw permission result string
    const resultLabel = permissionResult.toUpperCase();
    console.log(`${TAG} Permission result: ${resultLabel}`);

    if (permissionResult === 'denied' || permissionResult === 'never_ask_again') {
      console.log(`${TAG} Permission denied`);
      // Attempt to get token regardless (data messages work without permission)
      await fetchAndLogToken();
      return;
    }
  } else {
    console.log(`${TAG} Android SDK < 33 — no runtime permission required`);
  }

  // ── Step 2: Fetch and log FCM token ─────────────────────────────────────
  await fetchAndLogToken();
}

/**
 * Initialize FCM on iOS.
 *
 * Uses `messaging().requestPermission()` which triggers the system
 * notification permission dialog with alert, sound, and badge options.
 */
async function initializeFCMiOS(): Promise<void> {
  console.log(`${TAG} Platform: iOS`);

  // ── Step 1: Request notification permission ─────────────────────────────
  try {
    const authStatus = await messaging().requestPermission();

    if (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL ||
      authStatus === messaging.AuthorizationStatus.EPHEMERAL
    ) {
      console.log(`${TAG} Notification permission granted`);
    } else if (authStatus === messaging.AuthorizationStatus.DENIED) {
      console.log(`${TAG} Permission denied`);
      // Attempt to get token regardless
      await fetchAndLogToken();
      return;
    } else {
      console.log(`${TAG} Permission status: ${authStatus}`);
    }
  } catch (error) {
    console.error(`${TAG} Permission request failed:`, error);
    if (error instanceof Error) {
      console.error(`${TAG} Error: ${error.message}`);
    }
    // Continue to token fetch even if permission request errored
  }

  // ── Step 2: Fetch and log FCM token ─────────────────────────────────────
  await fetchAndLogToken();
}

// ─── Token Fetching ─────────────────────────────────────────────────────────

/**
 * Fetch the FCM token and log it.
 *
 * Logs `[FCM] Fetching FCM token...` before fetching, then either:
 *   - `[FCM] Token: <token>` on success
 *   - Full error details on failure
 */
async function fetchAndLogToken(): Promise<void> {
  console.log(`${TAG} Fetching FCM token...`);

  try {
    const token = await messaging().getToken();

    if (token) {
      console.log(`${TAG} Token: ${token}`);
    } else {
      console.warn(`${TAG} Token is null or empty`);
    }
  } catch (tokenError) {
    console.error(`${TAG} Failed to retrieve FCM token:`, tokenError);
    if (tokenError instanceof Error) {
      console.error(`${TAG} Error name: ${tokenError.name}`);
      console.error(`${TAG} Error message: ${tokenError.message}`);
      console.error(`${TAG} Error stack: ${tokenError.stack}`);
    }
  }
}

// ─── Foreground Message Handling ────────────────────────────────────────────

/**
 * Create the default Android notification channel.
 *
 * Required for Android 8.0+ (API 26+). Notifee will throw if a notification
 * is displayed without first creating a channel. This is safe to call
 * repeatedly — Notifee ignores duplicate channel creation.
 *
 * On iOS this is a no-op (iOS does not use notification channels).
 */
async function createNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await notifee.createChannel({
      id: DEFAULT_CHANNEL_ID,
      name: DEFAULT_CHANNEL_NAME,
      description: 'General app notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      badge: true,
    });

    console.log(`${TAG} Notification channel "${DEFAULT_CHANNEL_ID}" created`);
  } catch (error) {
    console.error(`${TAG} Failed to create notification channel:`, error);
  }
}

/**
 * Register the foreground message handler.
 *
 * Calls `messaging().onMessage()` which fires whenever an FCM data or
 * notification message is received while the app is in the foreground.
 *
 * ## Behaviour
 *
 * - Extracts `notification.title` and `notification.body` from the message.
 * - Preserves the data payload (`type`, `referenceType`, `referenceId`)
 *   so the notification's tap handler can navigate to the correct screen.
 * - Displays a local notification via Notifee's `displayNotification`.
 * - Android notifications appear in the system tray automatically because
 *   they target the notification channel created above.
 *
 * ## No-duplicate Guarantee
 *
 * - **Foreground:**  `onMessage` fires → this handler creates a local
 *   notification manually. Android does NOT auto-display a tray entry.
 * - **Background / Terminated:** The FCM SDK handles display via the
 *   system tray automatically. `onMessage` does NOT fire. Therefore,
 *   exactly one notification is shown regardless of app state.
 *
 * @returns An unsubscribe function to stop listening (for testing/cleanup).
 */
export function setupForegroundMessageHandler(): () => void {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    const { notification, data } = remoteMessage;

    const title = notification?.title ?? 'New Notification';
    const body = notification?.body ?? '';

    console.log(`${TAG} Foreground message received:`, {
      title,
      body,
      data,
    });

    // Skip if there is no meaningful content to show
    if (!title && !body && !data) {
      console.log(`${TAG} Skipping — no content`);
      return;
    }

    // ── Suppress commerce notifications during purchase flow ──────────────
    //
    // When the user is actively purchasing (Razorpay checkout open, polling),
    // commerce-related foreground push notifications are redundant — the user
    // is already looking at the purchase overlay.
    //
    // The notification is still created in Supabase and delivered to the
    // notification centre via Realtime. Only the system tray popup is skipped.

    const dataPayload = data as Record<string, string> | undefined;
    const notificationType = dataPayload?.type ?? '';
    const referenceType = dataPayload?.referenceType ?? '';

    const isCommerceNotification =
      notificationType === 'course_purchased' ||
      notificationType === 'payment' ||
      referenceType === 'course' ||
      referenceType === 'order';

    if (isCommerceNotification) {
      const isPurchaseInProgress =
        store.getState().purchase.isPurchaseInProgress;

      if (isPurchaseInProgress) {
        console.log(
          `${TAG} Commerce notification suppressed because purchase is active`,
        );
        return;
      }
    }

    try {
      await notifee.displayNotification({
        title,
        body,
        data: data as Record<string, string> | undefined,
        android: {
          channelId: DEFAULT_CHANNEL_ID,
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
          importance: AndroidImportance.HIGH,
          sound: 'default',
          showTimestamp: true,
          // Preserve data payload for tap handling
        },
        ios: {
          sound: 'default',
        },
      });

      console.log(`${TAG} Local notification displayed`);
    } catch (error) {
      console.error(`${TAG} Failed to display local notification:`, error);
    }
  });

  return unsubscribe;
}
