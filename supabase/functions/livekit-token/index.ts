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
import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';
import {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
} from './config.ts';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Valid participant roles. */
type LiveKitRole = 'teacher' | 'student' | 'admin';

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

/** Roles that are allowed to publish audio/video to the room. */
const PUBLISHER_ROLES: ReadonlySet<string> = new Set(['teacher', 'admin']);

/** All valid participant roles. */
const VALID_ROLES: ReadonlySet<string> = new Set(['teacher', 'student', 'admin']);

// ─── [LiveKit Debug] JWT Decoder for Edge Function ───────────────────────────

/**
 * Decode the payload of a JWT without verifying the signature.
 * Used ONLY for debug logging in this function.
 */
function debugDecodeJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

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

// ─── CORS Headers ────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


/**
 * Build a JSON Response with CORS headers so the function can be tested
 * locally from browser-based tools.
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
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
    return 'Missing or invalid "role" — must be "teacher", "student", or "admin".';
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

  // ── CORS preflight — MUST be first, before any auth/business logic ──
  //
  // Browsers send an OPTIONS preflight before the actual POST request.
  // OPTIONS requests never contain an Authorization header, so any
  // auth check before this point would fail and block the real request.
  //
  if (req.method === 'OPTIONS') {
    console.log('[LiveKit Debug] EXIT: CORS preflight (OPTIONS)');
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  [DEBUG] PART 2 — Diagnose missing Authorization header
  // ═══════════════════════════════════════════════════════════════════
  const dbgTs = (): string => new Date().toISOString();

  console.log(`[${dbgTs()}] [LK-DIAG-EDGE] ===== REQUEST START =====`);
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE] Method :`, req.method);
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE] URL    :`, req.url);

  // Log ALL headers
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE] All request headers:`);
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   `, JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

  // Log specific headers
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE] Specific headers:`);
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   Authorization  =`, req.headers.get('authorization'));
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   apikey         =`, req.headers.get('apikey'));
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   x-client-info  =`, req.headers.get('x-client-info'));
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   content-type   =`, req.headers.get('content-type'));

  const authHeader = req.headers.get('authorization');
  if (authHeader === null) {
    console.log(`[${dbgTs()}] [LK-DIAG-EDGE] ⚠ NO AUTHORIZATION HEADER RECEIVED`);
  } else {
    console.log(`[${dbgTs()}] [LK-DIAG-EDGE] Authorization header present:`);
    console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   length         =`, authHeader.length);
    console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   first 25 chars =`, authHeader.substring(0, 25));
  }

  // ── [LiveKit Debug] Check Authorization header ────────────────
  if (authHeader) {
    const tokenPrefix = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const claims = debugDecodeJwt(tokenPrefix);
    if (claims) {
      console.log('[LiveKit Debug] Auth JWT decoded:', {
        sub: claims.sub,
        email: claims.email,
        role: claims.role,
        aud: claims.aud,
        iss: claims.iss,
        exp: claims.exp ? new Date((claims.exp as number) * 1000).toISOString() : 'missing',
        iat: claims.iat ? new Date((claims.iat as number) * 1000).toISOString() : 'missing',
        hasAccessToken: true,
      });
    } else {
      console.warn('[LiveKit Debug] Auth header present but could not decode JWT. Header prefix:', authHeader.substring(0, 20) + '...');
    }
  } else {
    console.warn('[LiveKit Debug] No Authorization header found! Request will likely get 401.');
  }

  // ── Verify authenticated user via Supabase Auth ────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  console.log(`[${dbgTs()}] [LK-DIAG-EDGE] Creating Supabase client...`);
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   SUPABASE_URL     =`, supabaseUrl ? 'set' : 'MISSING');
  console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   SUPABASE_ANON_KEY =`, supabaseAnonKey ? 'set' : 'MISSING');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader ?? '',
      },
    },
  });

  console.log(`[${dbgTs()}] [LK-DIAG-EDGE] Calling auth.getUser()...`);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log(`[${dbgTs()}] [LK-DIAG-EDGE] auth.getUser() returned:`);
  if (authError) {
    console.error(`[${dbgTs()}] [LK-DIAG-EDGE]   authError       = COMPLETE ERROR OBJECT FOLLOWS`);
    console.error(`[${dbgTs()}] [LK-DIAG-EDGE]   `, JSON.stringify(authError, Object.getOwnPropertyNames(authError)));
  }
  if (user) {
    console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   user.id         =`, user.id);
    console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   email           =`, user.email);
  } else {
    console.log(`[${dbgTs()}] [LK-DIAG-EDGE]   user            = null (no user)`);
  }

  if (authError || !user) {
    console.log('[LiveKit Debug] EXIT: Unauthorized — user not authenticated');
    logStructured('warn', 'Unauthenticated request', { requestId }, {
      error: authError?.message ?? 'User is null',
    });
    return jsonResponse({ error: 'Unauthenticated. A valid Supabase JWT is required.' }, 401);
  }

  console.log('[LiveKit Debug] Authenticated user:', {
    id: user.id,
    email: user.email,
  });

   // ── [LiveKit Debug] POST REQUEST diagnostics ────────────────
  console.log('[LiveKit Debug] ===== POST REQUEST =====');
  console.log('[LiveKit Debug] Method:', req.method);
  console.log('[LiveKit Debug] Authorization Header:', req.headers.get('authorization'));
  console.log('[LiveKit Debug] API Key Header:', req.headers.get('apikey'));
  console.log('[LiveKit Debug] x-client-info:', req.headers.get('x-client-info'));
  console.log('[LiveKit Debug] All Request Headers:', Object.fromEntries(req.headers.entries()));

  // ── Method guard ───────────────────────────────────────────────
  if (req.method !== 'POST') {
    console.log('[LiveKit Debug] EXIT: Method not allowed —', req.method);
    logStructured('warn', 'Method not allowed', { requestId }, { method: req.method });
    return jsonResponse({ error: 'Only POST requests are accepted' }, 405);
  }

  // ── Check environment variables ────────────────────────────────
  const envError = checkEnv();
  if (envError) {
    console.log('[LiveKit Debug] EXIT: Environment error —', envError);
    logStructured('error', 'Environment configuration error', { requestId }, { detail: envError });
    return jsonResponse({ error: 'Server configuration error. Contact support.' }, 500);
  }
  console.log('[LiveKit Debug] Environment check passed (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL all set)');

  // ── Parse & validate payload ───────────────────────────────────
  let body: TokenRequestBody;

  try {
    body = await req.json() as TokenRequestBody;
    console.log('[LiveKit Debug] Request body parsed:', {
      roomName: body.roomName,
      participantName: body.participantName,
      role: body.role,
    });
  } catch {
    console.log('[LiveKit Debug] EXIT: Invalid JSON in request body');
    logStructured('error', 'Failed to parse request body as JSON', { requestId });
    return jsonResponse({ error: 'Invalid JSON in request body' }, 400);
  }

  const validationError = validateRequestBody(body);
  if (validationError) {
    console.log('[LiveKit Debug] EXIT: Validation error —', validationError);
    logStructured('error', 'Validation error', { requestId }, { detail: validationError });
    return jsonResponse({ error: validationError }, 400);
  }
  console.log('[LiveKit Debug] Request body validation passed');

  // Guaranteed non-null after validation.
  const roomName: string = body.roomName!.trim();
  const participantName: string = body.participantName!.trim();
  const role: LiveKitRole = body.role!;

  const logContext: LogContext = { requestId, roomName, participantName, role };

  logStructured('info', 'Processing LiveKit token request', logContext);

  // ── Generate LiveKit Access Token ──────────────────────────────
  try {
    console.log('[LiveKit Debug] Generating AccessToken...');

    // Debug log: confirm identity is the UUID, displayName is the human-readable name
    console.log({
      identity: user.id,
      displayName: participantName,
    });

    const token = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
      identity: user.id,
      name: participantName,
    });

    const canPublish = PUBLISHER_ROLES.has(role);

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe: true,
    });

    console.log('[LiveKit Debug] Calling token.toJwt()...');
    const jwt = await token.toJwt();
    console.log('[LiveKit Debug] token.toJwt() succeeded, length:', jwt.length);

    const responseBody: TokenResponseBody = {
      token: jwt,
      url: LIVEKIT_URL!,
    };

    logStructured('info', 'LiveKit token generated successfully', logContext, {
      tokenLength: jwt.length,
    });

    logStructured('info', 'Token grant details', logContext, {
      identity: user.id,
      displayName: participantName,
      canPublish,
      canSubscribe: true,
    });

    console.log('[LiveKit Debug] EXIT: Success — returning 200 with token');
    return jsonResponse(responseBody, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[LiveKit Debug] EXIT: Token generation FAILED — ' + errorMessage);
    console.error('[LiveKit Debug] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    logStructured('error', 'Token generation failed', logContext, { error: errorMessage });
    return jsonResponse({ error: 'Failed to generate LiveKit token.' }, 500);
  }
});
