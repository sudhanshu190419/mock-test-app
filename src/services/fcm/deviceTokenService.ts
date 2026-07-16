/**
 * Device Token Service
 *
 * Dedicated service for managing FCM device token persistence in Supabase.
 * This is part of Phase 2 and follows the clean-architecture pattern:
 * the service encapsulates all Supabase queries; consumers (AuthProvider,
 * hooks) simply call the exposed functions.
 *
 * ## Responsibilities
 *
 * - Register (upsert) the current FCM token into the `device_tokens` table
 * - Deactivate the current token on logout (is_active = false)
 * - Listen for Firebase token refresh and update the database record
 *
 * ## Boundaries
 *
 * This service does NOT:
 *   - Mix logic into AuthProvider (AuthProvider calls these functions)
 *   - Send push notifications
 *   - Modify notification_recipients or notifications tables
 *   - Implement foreground/background message listeners
 *   - Display notifications to the user
 *
 * @module services/fcm/deviceTokenService
 */

import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '../../config/supabase';
import { getToken } from './fcmService';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Tag used for all console.log output from this service. */
const TAG = '[FCM]';

/**
 * App version used when registering device tokens.
 * Mirrors the version field in package.json.
 * Update this when bumping the app version.
 *
 * @todo Read from a shared app config if available.
 */
const APP_VERSION = '0.0.1';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register the current device's FCM token in the `device_tokens` table.
 *
 * Retrieves the FCM token (via `fcmService.getToken()`), then upserts it
 * into Supabase. If the token already exists (same device re-registering),
 * the existing row is updated with the latest `last_seen_at`, `app_version`,
 * `platform`, and `is_active = true`.
 *
 * This is a fire-and-forget operation — errors are logged but not rethrown,
 * so a failed token registration never crashes the app.
 *
 * @param profileId - The authenticated user's `profile_id` (auth.uid()).
 *
 * @example
 * ```ts
 * import { registerDeviceToken } from '../services/fcm/deviceTokenService';
 *
 * // After successful login:
 * registerDeviceToken(user.id);
 * ```
 */
export async function registerDeviceToken(profileId: string): Promise<void> {
  console.log(`${TAG} Registering device token...`);

  try {
    const token = await getToken();

    if (!token) {
      console.warn(`${TAG} No FCM token available — skipping registration`);
      return;
    }

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    const { error } = await supabase.from('device_tokens').upsert(
      {
        profile_id: profileId,
        fcm_token: token,
        platform,
        app_version: APP_VERSION,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'fcm_token',
        ignoreDuplicates: false,
      },
    );

    if (error) {
      console.error(`${TAG} Failed to register device token:`, error.message);
      return;
    }

    console.log(`${TAG} Device token registered`);
  } catch (error) {
    console.error(`${TAG} Device token registration failed:`, error);
  }
}

/**
 * Deactivate the current device's FCM token on logout.
 *
 * Sets `is_active = false` for the current token belonging to this user.
 * The row is preserved for audit purposes — never deleted.
 *
 * This is a fire-and-forget operation — errors are logged but not rethrown.
 *
 * @param profileId - The authenticated user's `profile_id` (auth.uid()).
 *
 * @example
 * ```ts
 * import { deactivateDeviceToken } from '../services/fcm/deviceTokenService';
 *
 * // On logout:
 * deactivateDeviceToken(user.id);
 * ```
 */
export async function deactivateDeviceToken(profileId: string): Promise<void> {
  try {
    const token = await getToken();

    if (!token) {
      console.warn(`${TAG} No FCM token available — skipping deactivation`);
      return;
    }

    const { error } = await supabase
      .from('device_tokens')
      .update({
        is_active: false,
        last_seen_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)
      .eq('fcm_token', token);

    if (error) {
      console.error(`${TAG} Failed to deactivate device token:`, error.message);
      return;
    }

    console.log(`${TAG} Token marked inactive`);
  } catch (error) {
    console.error(`${TAG} Device token deactivation failed:`, error);
  }
}

/**
 * Watch for FCM token refresh and update the database record.
 *
 * Firebase periodically rotates FCM tokens (e.g. on app reinstall, after
 * security events). When a new token is generated, this listener
 * automatically upserts it into the `device_tokens` table so push
 * notifications continue to work without a new login.
 *
 * Call this once after the user successfully authenticates. The returned
 * unsubscribe function should be called on logout to clean up the listener.
 *
 * @param profileId - The authenticated user's `profile_id` (auth.uid()).
 *
 * @returns An unsubscribe function to stop listening for token refreshes.
 *
 * @example
 * ```ts
 * import { setupTokenRefresh } from '../services/fcm/deviceTokenService';
 *
 * // After login:
 * const stopRefresh = setupTokenRefresh(user.id);
 *
 * // On logout:
 * stopRefresh();
 * ```
 */
export function setupTokenRefresh(profileId: string): () => void {
  const unsubscribe = messaging().onTokenRefresh(async (newToken: string) => {
    console.log(`${TAG} Token refreshed`);

    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      const { error } = await supabase.from('device_tokens').upsert(
        {
          profile_id: profileId,
          fcm_token: newToken,
          platform,
          app_version: APP_VERSION,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'fcm_token',
          ignoreDuplicates: false,
        },
      );

      if (error) {
        console.error(
          `${TAG} Failed to persist refreshed token:`,
          error.message,
        );
        return;
      }

      console.log(`${TAG} Token refresh registered in database`);
    } catch (error) {
      console.error(`${TAG} Token refresh handler failed:`, error);
    }
  });

  return unsubscribe;
}
