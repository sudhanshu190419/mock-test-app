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
  // ═══════════════════════════════════════════════════════════════════
  //  [DEBUG] PART 1 — Diagnose missing Authorization header
  // ═══════════════════════════════════════════════════════════════════
  const dbgTs = (): string => new Date().toISOString();

  console.log(`[${dbgTs()}] [LK-DIAG] ===== getLiveKitToken() called =====`);
  console.log(`[${dbgTs()}] [LK-DIAG] Request params:`, {
    roomName: request.roomName,
    participantName: request.participantName,
    role: request.role,
  });

  // ── 1. Check Supabase session ─────────────────────────────────────
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    console.log(`[${dbgTs()}] [LK-DIAG] getSession():`);
    console.log(`[${dbgTs()}] [LK-DIAG]   session exists        =`, !!session);
    if (session) {
      console.log(`[${dbgTs()}] [LK-DIAG]   user.id               =`, session.user.id);
      console.log(`[${dbgTs()}] [LK-DIAG]   email                 =`, session.user.email);
      console.log(`[${dbgTs()}] [LK-DIAG]   access token length   =`, session.access_token?.length ?? 0);
      console.log(`[${dbgTs()}] [LK-DIAG]   access token (1st 20) =`, session.access_token?.substring(0, 20) ?? 'N/A');
      console.log(`[${dbgTs()}] [LK-DIAG]   expires_at            =`, session.expires_at ?? 'N/A');
    }
  } catch (sessionErr) {
    console.error(`[${dbgTs()}] [LK-DIAG]   getSession() THREW:`, sessionErr);
  }

  // ── 2. Check Supabase user ────────────────────────────────────────
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    console.log(`[${dbgTs()}] [LK-DIAG] getUser():`);
    console.log(`[${dbgTs()}] [LK-DIAG]   user exists  =`, !!user);
    if (user) {
      console.log(`[${dbgTs()}] [LK-DIAG]   user.id      =`, user.id);
      console.log(`[${dbgTs()}] [LK-DIAG]   email        =`, user.email);
    }
  } catch (userErr) {
    console.error(`[${dbgTs()}] [LK-DIAG]   getUser() THREW:`, userErr);
  }

  // ── 3. Log the invoke call ────────────────────────────────────────
  const functionName = 'livekit-token';
  const invokeBody = request;
  console.log(`[${dbgTs()}] [LK-DIAG] Calling supabase.functions.invoke():`);
  console.log(`[${dbgTs()}] [LK-DIAG]   functionName =`, functionName);
  console.log(`[${dbgTs()}] [LK-DIAG]   body         =`, JSON.stringify(invokeBody));
  console.log(`[${dbgTs()}] [LK-DIAG]   timestamp    =`, dbgTs());

  // ── 4. Wrap invoke in try/catch ──────────────────────────────────
  let invokeResult: { data: unknown; error: unknown } | null = null;
  try {
    invokeResult = await supabase.functions.invoke(
      functionName,
      { body: invokeBody },
    );
  } catch (invokeException: unknown) {
    console.error(`[${dbgTs()}] [LK-DIAG] invoke() EXCEPTION (threw before returning):`);
    console.error(`[${dbgTs()}] [LK-DIAG]   name       =`, (invokeException as Error)?.name ?? 'N/A');
    console.error(`[${dbgTs()}] [LK-DIAG]   message    =`, (invokeException as Error)?.message ?? 'N/A');
    console.error(`[${dbgTs()}] [LK-DIAG]   stack      =`, (invokeException as Error)?.stack ?? 'N/A');
    console.error(`[${dbgTs()}] [LK-DIAG]   complete   =`, invokeException);
    throw invokeException;
  }

  const { data, error } = invokeResult;

  // ── 5. If invoke returned an error (FunctionsHttpError) ───────────
  if (error) {
    console.error(`[${dbgTs()}] [LK-DIAG] invoke() returned an error (FunctionsHttpError):`);
    // Log every accessible property of the error
    const errRecord = error as Record<string, unknown>;
    const errProps = [
      'error',
      'status',
      'context',
      'response',
      'message',
      'name',
    ];
    for (const key of errProps) {
      console.error(`[${dbgTs()}] [LK-DIAG]   ${key} =`, errRecord[key] ?? 'N/A');
    }
    console.error(`[${dbgTs()}] [LK-DIAG]   All enumerable properties:`, JSON.stringify(error, null, 2));
    throw new Error(`Failed to fetch LiveKit token: ${(error as Error).message}`);
  }

  const response = data as TokenResponse;

  if (!response.token || !response.url) {
    console.error(`[${dbgTs()}] [LK-DIAG] Edge Function returned incomplete response:`, JSON.stringify(response));
    throw new Error('LiveKit token service returned an invalid response.');
  }

  console.log(`[${dbgTs()}] [LK-DIAG] Token fetched successfully:`, {
    roomName: request.roomName,
    participantName: request.participantName,
    url: response.url,
    tokenLength: response.token.length,
  });

  return response;
}
