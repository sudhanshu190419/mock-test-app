/**
 * Centralized Environment Configuration
 *
 * All environment-dependent behaviour is driven from this single module.
 * To set the values, use `supabase secrets set` (production) or a local
 * `.env` file (development).
 *
 * ─── Environment Variables ────────────────────────────────────────────────────
 * Variable           | Default         | Description
 * -------------------|-----------------|------------------------------------------
 * LIVEKIT_API_KEY    | (required)      | LiveKit project API key
 * LIVEKIT_API_SECRET | (required)      | LiveKit project API secret
 * LIVEKIT_URL        | (required)      | LiveKit server WebSocket URL (e.g. wss://my-project.livekit.cloud)
 *
 * @module config
 */

/** LiveKit project API key — required. */
const LIVEKIT_API_KEY: string | undefined = Deno.env.get("LIVEKIT_API_KEY");

/** LiveKit project API secret — required. */
const LIVEKIT_API_SECRET: string | undefined = Deno.env.get("LIVEKIT_API_SECRET");

/** LiveKit server WebSocket URL — required. */
const LIVEKIT_URL: string | undefined = Deno.env.get("LIVEKIT_URL");

export { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL };
