/**
 * SMS Provider Abstraction
 *
 * Provider selection is driven by the `SMS_PROVIDER` environment variable.
 * To switch providers, update the env var — no code changes needed.
 *
 * ─── Switch to MSG91 ─────────────────────────────────────────────────────────
 * 1. Set the environment variable:
 *      supabase secrets set SMS_PROVIDER=msg91
 * 2. Set MSG91 credentials (see TODOs in the "msg91" case).
 * 3. Deploy: supabase functions deploy send-msg91-otp
 *
 * @module sms-provider
 */

import { IS_DEV, SMS_PROVIDER } from "./config.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Structured log entry for SMS events (used in non-dev / production mode). */
interface SmsLogEntry {
  event: "sms_sent" | "sms_failed";
  provider: string;
  phone: string;
  /** Masked OTP — only last 2 digits visible. */
  otpMasked: string;
  timestamp: string;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mask an OTP so sensitive values are never written to logs in production.
 * Reveals only the last 2 digits (e.g. "****56").
 */
function maskOtp(otp: string): string {
  if (otp.length <= 2) return "**";
  return "*".repeat(otp.length - 2) + otp.slice(-2);
}

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Send an SMS containing the OTP to the given phone number.
 *
 * The active provider is selected at runtime via the `SMS_PROVIDER` env var.
 *   - "mock"  : logs OTP to console (full OTP in dev, masked in production).
 *   - "msg91" : TODO — not yet implemented.
 *
 * @param phone - Recipient phone number in E.164 format (e.g. "+919876543210").
 * @param otp   - The one-time password to deliver.
 *
 * @throws {Error} If the SMS cannot be delivered or the provider is unknown.
 */
export async function sendSms(phone: string, otp: string): Promise<void> {
  switch (SMS_PROVIDER) {
    // ── Mock Provider ───────────────────────────────────────────────
    case "mock": {
      const timestamp = new Date().toISOString();

      if (IS_DEV) {
        // ── Development mode: print full OTP for easy testing ─────
        console.log(`
=============================================
  SMS Provider   : mock
  📱 PHONE       : ${phone}
  🔐 OTP         : ${otp}
  🕐 Timestamp   : ${timestamp}
=============================================
        `);
      } else {
        // ── Production mode: mask the OTP ─────────────────────────
        const logEntry: SmsLogEntry = {
          event: "sms_sent",
          provider: "mock",
          phone,
          otpMasked: maskOtp(otp),
          timestamp,
        };

        console.log(
          "[send-msg91-otp] SMS sent (mock mode)",
          JSON.stringify(logEntry),
        );
      }

      break;
    }

    // ── MSG91 Provider (TODO) ───────────────────────────────────────
    case "msg91": {
      // ================================================================
      // TODO: Implement MSG91 OTP API integration.
      //
      // Required setup:
      //   1. Set MSG91_AUTH_KEY via `supabase secrets set MSG91_AUTH_KEY=...`
      //   2. (Optional) Set MSG91_SENDER_ID and MSG91_TEMPLATE_ID
      //
      // Integration checklist:
      //   [ ] MSG91 Auth Key   — Deno.env.get("MSG91_AUTH_KEY")
      //   [ ] Sender ID        — Deno.env.get("MSG91_SENDER_ID") ?? "MSG91"
      //   [ ] Template ID      — Deno.env.get("MSG91_TEMPLATE_ID")
      //   [ ] DLT registration — Ensure template is DLT-approved in India
      //   [ ] Retry logic      — Exponential backoff on 429 / 5xx
      //   [ ] Rate limiting    — Throttle to MSG91's TPS limit
      //
      // API reference: https://docs.msg91.com/collection/msg91-api-integration/5/send-otp
      //
      // Steps:
      //   1. Validate MSG91_AUTH_KEY is present
      //   2. POST to https://api.msg91.com/api/v5/otp
      //   3. Handle non-2xx responses with descriptive errors
      //   4. Log success/failure (mask OTP in all cases)
      // ================================================================

      throw new Error(
        "MSG91 provider is not yet implemented. " +
          "Set SMS_PROVIDER=mock for development, or implement the msg91 case in sms-provider.ts.",
      );
    }

    // ── Unknown Provider ────────────────────────────────────────────
    default: {
      throw new Error(
        `Unknown SMS_PROVIDER: "${SMS_PROVIDER}". ` +
          'Valid values are "mock" or "msg91".',
      );
    }
  }
}
