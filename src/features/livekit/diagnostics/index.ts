/**
 * Android Audio Diagnostics — barrel export.
 *
 * @module features/livekit/diagnostics
 */

export {
  logDeviceInfo,
  logAudioManagerState,
  logMicrophoneInfo,
  logAudioSessionConfig,
  logLiveKitState,
  logFullDiagnostics,
  logBeforeConfigureAudio,
  logAfterConfigureAudio,
  logBeforeStartAudioSession,
  logAfterStartAudioSession,
  logAllDiagnostics,
  initializeDiagnostics,
  startRouteMonitoring,
  stopRouteMonitoring,

  // Advanced diagnostics (new)
  logAudioRecordConfig,
  logAudioLevel,
  logAudioFocusState,
  logLiveKitAudioCallbacks,
  logOutboundAudioStats,
  startModeMonitoring,
  stopModeMonitoring,
  startCapturingAudioDiagnostics,
  stopCapturingAudioDiagnostics,
} from './audioDiagnostics';

export type { RouteChangeEvent } from './audioDiagnostics';
