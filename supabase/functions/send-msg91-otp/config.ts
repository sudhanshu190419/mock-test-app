/**
 * Centralized Environment Configuration
 *
 * All environment-dependent behaviour is driven from this single module.
 * To change the mode or provider, set the corresponding environment variable
 * via `supabase secrets set` (production) or a local `.env` file (development).
 *
 * ─── Environment Variables ────────────────────────────────────────────────────
 * Variable          | Default         | Description
 * ------------------|-----------------|------------------------------------------
 * APP_ENV           | "development"  | "development" | "production"
 * SMS_PROVIDER      | "mock"         | "mock" | "msg91"
 *
 * @module config
 */

/** Application environment — controls logging verbosity and OTP exposure. */
const APP_ENV: string = Deno.env.get("APP_ENV") ?? "development";

/** Active SMS provider — determines which branch runs inside sendSms(). */
const SMS_PROVIDER: string = Deno.env.get("SMS_PROVIDER") ?? "mock";

/** Convenience flag: true when running in development mode. */
const IS_DEV: boolean = APP_ENV === "development";

export { APP_ENV, IS_DEV, SMS_PROVIDER };
