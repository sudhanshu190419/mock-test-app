/**
 * LiveKit Types
 *
 * Type definitions for the LiveKit proof-of-concept module.
 * Isolated from the rest of the application — no existing types are modified.
 *
 * @module features/livekit/types
 */

// ─── Participant Roles ─────────────────────────────────────────────────────

/**
 * Role of a participant in a LiveKit room.
 * - `teacher`: Publisher with full publish/subscribe rights.
 * - `student`: Subscriber who can also publish audio/video.
 */
export type LiveKitRole = 'teacher' | 'student';

// ─── Token Service ─────────────────────────────────────────────────────────

/**
 * Input expected by the token service to generate a LiveKit join token.
 */
export interface TokenRequest {
  /** Name of the room to join. */
  roomName: string;
  /** Display name of the participant. */
  participantName: string;
  /** Role of the participant. */
  role: LiveKitRole;
}

/**
 * Response from the token service containing credentials to join a room.
 */
export interface TokenResponse {
  /** LiveKit JWT token for authentication. */
  token: string;
  /** WebSocket URL of the LiveKit server (e.g. wss://my-project.livekit.cloud). */
  url: string;
}

// ─── Connection State ──────────────────────────────────────────────────────

/**
 * Possible states of the LiveKit room connection.
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

// ─── Participant Info ──────────────────────────────────────────────────────

/**
 * Display-friendly participant information.
 * Derived from LiveKit's Participant object.
 */
export interface ParticipantInfo {
  /** Unique participant identifier (SID). */
  sid: string;
  /** Human-readable identity (set at token creation). */
  identity: string;
  /** Whether this is the local participant. */
  isLocal: boolean;
  /** Whether the participant is currently speaking (audio level). */
  isSpeaking: boolean;
  /** Whether the participant's camera is enabled. */
  isCameraEnabled: boolean;
  /** Whether the participant's microphone is enabled. */
  isMicrophoneEnabled: boolean;
}

// ─── Room State ────────────────────────────────────────────────────────────

/**
 * Observable state of the LiveKit room, consumed by UI screens.
 */
export interface LiveKitRoomState {
  /** Current connection state. */
  connectionState: ConnectionState;
  /** List of all participants (including local). */
  participants: ParticipantInfo[];
  /** Whether the local camera is enabled. */
  isCameraEnabled: boolean;
  /** Whether the local microphone is enabled. */
  isMicrophoneEnabled: boolean;
  /** Error message if connectionState is 'error'. */
  error: string | null;
}

// ─── Media Permissions ─────────────────────────────────────────────────────

/**
 * Result of a media permission check/request.
 */
export interface MediaPermissionResult {
  /** Whether camera permission was granted. */
  camera: boolean;
  /** Whether microphone permission was granted. */
  microphone: boolean;
  /** Human-readable explanation if any permission was denied. */
  error: string | null;
}

// ─── Configuration ─────────────────────────────────────────────────────────

/**
 * LiveKit module configuration.
 *
 * Replace these values with actual LiveKit Cloud / self-hosted server
 * details when the production backend is ready.
 *
 * @todo Phase 2: Move to environment config / backend-driven values.
 */
export interface LiveKitConfig {
  /**
   * LiveKit server WebSocket URL.
   * For LiveKit Cloud: `wss://<project-name>.livekit.cloud`
   * For self-hosted: `ws://<your-server>:7880`
   */
  liveKitUrl: string;

  /**
   * Token endpoint URL.
   * The backend should accept POST with TokenRequest body
   * and return TokenResponse.
   */
  tokenEndpoint: string;
}
