/**
 * Supabase Edge Function — livekit-token
 *
 * Generates a LiveKit Access Token so the client can join a LiveKit room.
 * This function MUST be called with a valid Supabase JWT (verify_jwt = true).
 *
 * Request (POST /):
 *   {
 *     "roomName": "room-uuid-or-name",
 *     "participantName": "display-name",
 *     "role": "teacher" | "student"
 *   }
 *
 * Response (200):
 *   {
 *     "token": "eyJhbGciOiJIUzI1NiJ9...",
 *     "url": "wss://my-project.livekit.cloud"
 *   }
 *
 * Errors:
 *   401 — Unauthenticated (handled automatically by Supabase Edge Runtime)
 *   400 — Missing or invalid request fields
 *   500 — Missing environment variables or LiveKit SDK failure
 *
 * @module edge-function
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { AccessToken } from 'livekit-server-sdk';
import {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
} from './config.ts';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Valid participant roles. */
type LiveKitRole = 'teacher' | 'student';

/** Shape of the incoming token request. */
interface TokenRequestBody {
  roomName?: string;
  participantName?: string;
  role?: LiveKitRole;
}

/** Shape of the successful token response. */
interface TokenResponseBody {
  token: string;
  url: string;
}

/** Structured log context used throughout the function. */
interface LogContext {
  requestId: string;
  participantName?: string;
  roomName?: string;
  role?: string;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Valid roles set for quick lookup. */
const VALID_ROLES: ReadonlySet<string> = new Set(['teacher', 'student']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a short request identifier for correlating log entries.
 */
function generateRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Log a structured message to the console.
 * In production these appear in the Supabase Edge Function logs.
 */
function logStructured(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: LogContext,
  extra?: Record<string, unknown>,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'livekit-token',
    message,
    ...context,
    ...extra,
  };
  const formatted = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Log a debug message directly (not structured) for quick visibility.
 */
function logDebug(message: string): void {
  console.log(`[LIVEKIT_DEBUG] ${message}`);
}

/**
 * Decode the payload portion of a JWT and return the parsed JSON object.
 * Returns null if decoding fails.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      logDebug('JWT does not have 3 dot-separated parts');
      return null;
    }
    const payload = parts[1];
    // Standard base64url → base64 conversion
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (err) {
    logDebug(`Failed to decode JWT payload: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Log debug information about the generated LiveKit token.
 * Never prints the full API key or the API secret.
 */
function inspectToken(
  jwt: string,
  apiKey: string | undefined,
  liveKitUrl: string | undefined,
  apiSecretExists: boolean,
): void {
  // ── 1. API key (first 6 chars) ────────────────────────────────
  const keyPreview = apiKey ? apiKey.slice(0, 6) : 'UNDEFINED';
  logDebug(`LIVEKIT_API_KEY (first 6 chars): ${keyPreview}`);

  // ── 2. LiveKit URL ────────────────────────────────────────────
  logDebug(`LIVEKIT_URL: ${liveKitUrl ?? 'UNDEFINED'}`);

  // ── 3. Whether the secret exists ──────────────────────────────
  logDebug(`LIVEKIT_API_SECRET exists: ${apiSecretExists}`);

  // ── 4–9. Decode JWT claims ────────────────────────────────────
  const claims = decodeJwtPayload(jwt);
  if (!claims) {
    logDebug('Could not decode JWT payload — claims inspection skipped.');
    return;
  }

  logDebug(`JWT issuer (iss): ${claims.iss ?? 'MISSING'}`);
  logDebug(`JWT subject (sub): ${claims.sub ?? 'MISSING'}`);

  // Video grant
  const video = claims.video as Record<string, unknown> | undefined;
  if (video) {
    logDebug(`JWT room grant: ${video.room ?? 'MISSING'}`);
    logDebug(`JWT canPublish: ${String(video.canPublish)}`);
    logDebug(`JWT canSubscribe: ${String(video.canSubscribe)}`);
  } else {
    logDebug('JWT room grant: MISSING (no video claim)');
    logDebug('JWT canPublish: MISSING');
    logDebug('JWT canSubscribe: MISSING');
  }

  // Expiration
  const exp = claims.exp as number | undefined;
  if (exp) {
    const expDate = new Date(exp * 1000).toISOString();
    const now = new Date().toISOString();
    const ttlSeconds = exp - Math.floor(Date.now() / 1000);
    logDebug(`JWT expiration (exp): ${expDate} (TTL: ${ttlSeconds}s from now; current time: ${now})`);
  } else {
    logDebug('JWT expiration (exp): MISSING');
  }
}

/**
 * Build a JSON Response with CORS headers so the function can be tested
 * locally from browser-based tools.
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Validate the request body and return a typed error message if invalid.
 * Returns `null` when the body is valid.
 */
function validateRequestBody(body: TokenRequestBody): string | null {
  if (!body.roomName || typeof body.roomName !== 'string' || body.roomName.trim().length === 0) {
    return 'Missing or invalid "roomName" — must be a non-empty string.';
  }

  if (
    !body.participantName ||
    typeof body.participantName !== 'string' ||
    body.participantName.trim().length === 0
  ) {
    return 'Missing or invalid "participantName" — must be a non-empty string.';
  }

  if (!body.role || !VALID_ROLES.has(body.role)) {
    return 'Missing or invalid "role" — must be "teacher" or "student".';
  }

  return null;
}

/**
 * Check that all required LiveKit environment variables are set.
 * Returns an error message when any are missing, or `null` when all are present.
 */
function checkEnv(): string | null {
  if (!LIVEKIT_API_KEY) {
    return 'LIVEKIT_API_KEY is not set.';
  }
  if (!LIVEKIT_API_SECRET) {
    return 'LIVEKIT_API_SECRET is not set.';
  }
  if (!LIVEKIT_URL) {
    return 'LIVEKIT_URL is not set.';
  }
  return null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();

  // ── CORS preflight ─────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // ── Method guard ───────────────────────────────────────────────
  if (req.method !== 'POST') {
    logStructured('warn', 'Method not allowed', { requestId }, { method: req.method });
    return jsonResponse({ error: 'Only POST requests are accepted' }, 405);
  }

  // ── Check environment variables ────────────────────────────────
  const envError = checkEnv();
  if (envError) {
    logStructured('error', 'Environment configuration error', { requestId }, { detail: envError });
    return jsonResponse({ error: 'Server configuration error. Contact support.' }, 500);
  }

  // ── Parse & validate payload ───────────────────────────────────
  let body: TokenRequestBody;

  try {
    body = await req.json() as TokenRequestBody;
  } catch {
    logStructured('error', 'Failed to parse request body as JSON', { requestId });
    return jsonResponse({ error: 'Invalid JSON in request body' }, 400);
  }

  const validationError = validateRequestBody(body);
  if (validationError) {
    logStructured('error', 'Validation error', { requestId }, { detail: validationError });
    return jsonResponse({ error: validationError }, 400);
  }

  // Guaranteed non-null after validation.
  const roomName: string = body.roomName!.trim();
  const participantName: string = body.participantName!.trim();
  const role: LiveKitRole = body.role!;

  const logContext: LogContext = { requestId, roomName, participantName, role };

  logStructured('info', 'Processing LiveKit token request', logContext);

  // ── Generate LiveKit Access Token ──────────────────────────────
  try {
    const token = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
      identity: participantName,
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    const responseBody: TokenResponseBody = {
      token: jwt,
      url: LIVEKIT_URL!,
    };

    logStructured('info', 'LiveKit token generated successfully', logContext, {
      tokenLength: jwt.length,
    });

    // ═══════════════════════════════════════════════════════════════
    //  DEBUG: Inspect JWT claims
    //  REMOVE THIS BLOCK after debugging is complete.
    // ═══════════════════════════════════════════════════════════════
    inspectToken(jwt, LIVEKIT_API_KEY, LIVEKIT_URL, LIVEKIT_API_SECRET !== undefined);

    return jsonResponse(responseBody, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStructured('error', 'Token generation failed', logContext, { error: errorMessage });
    return jsonResponse({ error: 'Failed to generate LiveKit token.' }, 500);
  }
});
