/**
 * LiveKit Feature Module
 *
 * Isolated proof-of-concept module for LiveKit integration.
 * Not yet wired into the main Teacher or Student dashboards.
 *
 * ## Architecture
 *
 * ```
 * src/features/livekit/
 *   ├── types/          # TypeScript type definitions
 *   ├── services/       # Token service (backend communication)
 *   ├── hooks/          # React hooks (useLiveKit, useMediaPermissions)
 *   ├── components/     # UI components (VideoView, ControlBar)
 *   ├── screens/        # Full-screen views (JoinRoom, LiveRoom)
 *   └── index.ts        # Barrel exports
 * ```
 *
 * ## Usage (POC)
 *
 * Navigate to the JoinRoom screen from the Dev hub or any test screen:
 *
 * ```tsx
 * navigation.navigate('JoinRoom');
 * ```
 *
 * ## Phase 2 Upgrades
 *
 * - Replace mock token service with actual backend endpoint
 * - Move LiveKit URL to environment config
 * - Integrate with Teacher/Student dashboards
 * - Add reconnection UI feedback
 * - Add data channels for chat/raise-hand
 *
 * @module features/livekit
 */

// Types
export type {
  LiveKitRole,
  TokenRequest,
  TokenResponse,
  ConnectionState,
  ParticipantInfo,
  LiveKitRoomState,
  MediaPermissionResult,
} from './types';

// Services
export { getLiveKitToken } from './services/tokenService';

// Hooks
export { useLiveKit, useMediaPermissions } from './hooks';

// Components
export { LiveKitVideoView, ControlBar } from './components';

// Screens
export { JoinRoomScreen, LiveRoomScreen } from './screens';
