/**
 * LiveKit Token Service
 *
 * Manages token generation for joining LiveKit rooms.
 *
 * ## Architecture
 *
 * The token service abstracts token generation behind a single interface.
 * In production, the frontend calls the `livekit-token` Supabase Edge
 * Function which uses the LiveKit server SDK to generate a signed JWT.
 *
 * Previously this module fell back to a mock token generator. That fallback
 * has been removed — the Edge Function is now the single source of truth.
 *
 * ## Usage
 *
 * ```ts
 * import { getLiveKitToken } from '../services/tokenService';
 *
 * const { token, url } = await getLiveKitToken({
 *   roomName: 'my-room',
 *   participantName: 'John Doe',
 *   role: 'student',
 * });
 * ```
 *
 * @module features/livekit/services/tokenService
 */

import { supabase } from '../../../config/supabase';
import type { TokenRequest, TokenResponse } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetches a LiveKit token for the given room and participant.
 *
 * Calls the `livekit-token` Supabase Edge Function which validates the
 * caller's JWT and generates a signed LiveKit Access Token.
 *
 * @param request - Room name, participant name, and role.
 * @returns TokenResponse with JWT token and WebSocket URL.
 *
 * @throws If the Edge Function returns a non-2xx response.
 */
export async function getLiveKitToken(
  request: TokenRequest,
): Promise<TokenResponse> {
  console.log('[LiveKit] Requesting token from Edge Function:', {
    roomName: request.roomName,
    participantName: request.participantName,
    role: request.role,
  });

  const { data, error } = await supabase.functions.invoke(
    'livekit-token',
    {
      body: request,
    },
  );

  if (error) {
    console.error('[LiveKit] Edge Function invocation failed:', error.message);
    throw new Error(`Failed to fetch LiveKit token: ${error.message}`);
  }

  const response = data as TokenResponse;

  if (!response.token || !response.url) {
    console.error('[LiveKit] Edge Function returned incomplete response:', JSON.stringify(response));
    throw new Error('LiveKit token service returned an invalid response.');
  }

  console.log('[LiveKit] Token fetched successfully:', {
    roomName: request.roomName,
    participantName: request.participantName,
    url: response.url,
    tokenLength: response.token.length,
  });

  return response;
}
