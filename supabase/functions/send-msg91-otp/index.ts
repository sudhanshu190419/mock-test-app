/**
 * Supabase Edge Function — send-msg91-otp
 *
 * Handles the Supabase Auth "Send SMS" Hook.
 * Currently in DEVELOPMENT MODE: logs the OTP to console instead of sending
 * a real SMS via MSG91.
 *
 * Payload (from Supabase Auth):
 *   POST /
 *   {
 *     "user": { "id": "...", "phone": "+919876543210", ... },
 *     "sms":  { "otp": "123456" }
 *   }
 *
 * Response:
 *   200 OK → Supabase treats the SMS as sent.
 *   4xx   → malformed payload.
 *   5xx   → internal error.
 *
 * @module edge-function
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { sendSms } from './sms-provider.ts';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape of the payload Supabase Auth sends to the Send SMS Hook. */
interface SendSmsHookPayload {
  user: {
    id: string;
    phone?: string;
    /** Additional user fields are ignored by this function. */
    [key: string]: unknown;
  };
  sms: {
    otp?: string;
  };
}

/** Structured log context used throughout the function. */
interface LogContext {
  requestId: string;
  userId?: string;
  phone?: string;
  error?: string;
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
    service: 'send-msg91-otp',
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
 * Build a JSON Response with CORS headers so the function can be tested
 * locally from browser-based tools.
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Permissive CORS for local development; Supabase Auth calls
      // server-to-server so these headers are primarily useful when
      // testing via curl or a browser-based HTTP client.
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
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

  // ── Parse & validate payload ───────────────────────────────────
  let payload: SendSmsHookPayload;

  try {
    payload = await req.json() as SendSmsHookPayload;
  } catch {
    logStructured('error', 'Failed to parse request body as JSON', { requestId });
    return jsonResponse({ error: 'Invalid JSON in request body' }, 400);
  }

  // Validate user object
  if (!payload.user || typeof payload.user !== 'object') {
    logStructured('error', 'Invalid payload: missing or malformed "user" object', { requestId });
    return jsonResponse({ error: 'Invalid payload: missing or malformed "user" object' }, 400);
  }

  // Validate phone number
  if (!payload.user.phone || typeof payload.user.phone !== 'string') {
    logStructured('error', 'Invalid payload: missing or invalid "user.phone"', { requestId });
    return jsonResponse({ error: 'Invalid payload: missing or invalid user phone number' }, 400);
  }

  // Validate sms object
  if (!payload.sms || typeof payload.sms !== 'object') {
    logStructured('error', 'Invalid payload: missing or malformed "sms" object', { requestId });
    return jsonResponse({ error: 'Invalid payload: missing or malformed "sms" object' }, 400);
  }

  // Validate OTP
  if (!payload.sms.otp || typeof payload.sms.otp !== 'string') {
    logStructured('error', 'Invalid payload: missing or invalid "sms.otp"', { requestId });
    return jsonResponse({ error: 'Invalid payload: missing or invalid SMS OTP' }, 400);
  }

  // ── Extract fields ─────────────────────────────────────────────
  const phone: string = payload.user.phone;
  const otp: string = payload.sms.otp;
  const userId: string = payload.user.id;

  const logContext: LogContext = { requestId, userId, phone };

  logStructured('info', 'Processing SMS hook request', logContext);

  // ── Send SMS via the provider abstraction ──────────────────────
  try {
    // sendSms currently logs to console (mock mode).
    // When MSG91 is integrated, this call will send a real SMS.
    await sendSms(phone, otp);

    logStructured('info', 'SMS processed successfully', logContext);
    return jsonResponse({ success: true }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStructured('error', 'SMS provider returned an error', logContext, { error: errorMessage });
    return jsonResponse({ error: 'Failed to send SMS' }, 500);
  }
});
