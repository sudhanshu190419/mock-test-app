/**
 * useLiveKit
 *
 * Main hook for managing a LiveKit room connection.
 *
 * Responsibilities:
 * - Creates and manages a `Room` instance from `livekit-client`
 * - Connects to a LiveKit server using a token
 * - Tracks participant state (local + remote)
 * - Manages camera and microphone toggles
 * - Handles disconnection and cleanup
 * - Implements connection timeout (30 seconds)
 *
 * Cleanup:
 * All LiveKit resources are released when the component using this hook
 * unmounts. The room disconnects and audio/video tracks are stopped.
 *
 * @module features/livekit/hooks/useLiveKit
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  type RoomConnectOptions,
  type RemoteParticipant,
  type LocalParticipant,
  type Participant,
  Track,
  type TrackPublication,
  ConnectionState as LKConnectionState,
} from 'livekit-client';
import { AudioSession, AndroidAudioTypePresets } from '@livekit/react-native';
import {
  logBeforeConfigureAudio,
  logAfterConfigureAudio,
  logBeforeStartAudioSession,
  logAfterStartAudioSession,
  logFullDiagnostics,
} from '../diagnostics';
import type {
  LiveKitRoomState,
  ConnectionState,
  ParticipantInfo,
} from '../types';

import InCallManager from 'react-native-incall-manager';
// ─── Connection Timeout ──────────────────────────────────────────────────
const CONNECTION_TIMEOUT_MS = 30_000;

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Maps a LiveKit Participant object to our lightweight ParticipantInfo.
 */
function toParticipantInfo(
  participant: Participant,
  isLocal: boolean,
): ParticipantInfo {
  const cameraPublication: TrackPublication | undefined =
    participant.getTrackPublication(Track.Source.Camera);
  const micPublication: TrackPublication | undefined =
    participant.getTrackPublication(Track.Source.Microphone);

  return {
    sid: participant.sid,
    identity: participant.identity,
    isLocal,
    isSpeaking: participant.isSpeaking,
    isCameraEnabled: cameraPublication?.isEnabled ?? false,
    isMicrophoneEnabled: micPublication?.isEnabled ?? false,
  };
}

/**
 * Maps livekit-client ConnectionState to our simplified ConnectionState.
 */
function mapConnectionState(state: LKConnectionState): ConnectionState {
  switch (state) {
    case LKConnectionState.Connecting:
      return 'connecting';
    case LKConnectionState.Connected:
      return 'connected';
    case LKConnectionState.Reconnecting:
      return 'reconnecting';
    case LKConnectionState.Disconnected:
      return 'disconnected';
    default:
      return 'disconnected';
  }
}

// ─── Default State ───────────────────────────────────────────────────────

const INITIAL_STATE: LiveKitRoomState = {
  connectionState: 'disconnected',
  participants: [],
  isCameraEnabled: false,
  isMicrophoneEnabled: false,
  error: null,
};

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Hook for managing a LiveKit room connection.
 *
 * Manages the full lifecycle: connect, participant events, media toggles,
 * disconnect, and cleanup.
 */
export function useLiveKit() {
  const [roomState, setRoomState] = useState<LiveKitRoomState>(INITIAL_STATE);

  const roomRef = useRef<Room | null>(null);
  const isMountedRef = useRef(true);

  // ── Room Event Handlers ─────────────────────────────────────────────

  const handleParticipantConnected = useCallback(
    (participant: RemoteParticipant) => {
      if (!isMountedRef.current) return;
      console.log('[LiveKit] Participant joined:', participant.identity);
      console.log('[AUDIO_DIAG] [Lifecycle] Participant joined:', participant.identity, '(SID:', participant.sid + ')');
      setRoomState((prev) => ({
        ...prev,
        participants: [
          ...prev.participants,
          toParticipantInfo(participant, false),
        ],
      }));
    },
    [],
  );

  const handleParticipantDisconnected = useCallback(
    (participant: RemoteParticipant) => {
      console.log('[LiveKit] Participant left:', participant.identity);
      console.log('[AUDIO_DIAG] [Lifecycle] Participant left:', participant.identity, '(SID:', participant.sid + ')');
      setRoomState((prev) => ({
        ...prev,
        participants: prev.participants.filter(
          (p) => p.sid !== participant.sid,
        ),
      }));
    },
    [],
  );

  const handleConnectionStateChanged = useCallback(
    (state: LKConnectionState) => {
      if (!isMountedRef.current) return;
      const mapped = mapConnectionState(state);
      console.log('[LiveKit] Connection state:', mapped);
      setRoomState((prev) => ({ ...prev, connectionState: mapped }));

      if (state === LKConnectionState.Disconnected) {
        setRoomState((prev) => ({
          ...INITIAL_STATE,
          participants: prev.participants.filter((p) => p.isLocal),
        }));
      }
    },
    [],
  );

  const handleTrackSubscribed = useCallback(
    (
      _track: Track,
      _publication: TrackPublication,
      participant: Participant,
    ) => {
      if (!isMountedRef.current) return;
      console.log('[LiveKit] Track subscribed from', participant.identity);
      setRoomState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.sid === participant.sid
            ? toParticipantInfo(participant, participant.isLocal)
            : p,
        ),
      }));
    },
    [],
  );

  const handleTrackUnsubscribed = useCallback(
    (
      track: Track,
      _publication: TrackPublication,
      participant: Participant,
    ) => {
      if (!isMountedRef.current) return;
      console.log(
        '[LiveKit] Track unsubscribed:',
        track.kind,
        'from',
        participant.identity,
      );
    },
    [],
  );

  const handleActiveSpeakersChanged = useCallback(
    (speakers: Participant[]) => {
      if (!isMountedRef.current) return;
      const speakerSids = new Set(speakers.map((s) => s.sid));
      setRoomState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) => ({
          ...p,
          isSpeaking: speakerSids.has(p.sid),
        })),
      }));
    },
    [],
  );

  /**
   * Handles participant attribute changes.
   * Signature: (changedAttributes: Record<string, string>, participant: RemoteParticipant | LocalParticipant)
   */
  const handleParticipantAttributesChanged = useCallback(
    (
      _changedAttributes: Record<string, string>,
      participant: RemoteParticipant | LocalParticipant,
    ) => {
      if (!isMountedRef.current) return;
      setRoomState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.sid === participant.sid
            ? toParticipantInfo(participant, participant.isLocal)
            : p,
        ),
      }));
    },
    [],
  );

  // ── Room Initialization ──────────────────────────────────────────
  // Creates the Room instance once and wires event listeners.
  useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
    room.on(RoomEvent.ParticipantAttributesChanged, handleParticipantAttributesChanged);

    roomRef.current = room;

    return () => {
      isMountedRef.current = false;
      console.log('[LiveKit] Cleaning up room instance...');

      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
      room.off(RoomEvent.ParticipantAttributesChanged, handleParticipantAttributesChanged);
try {
        InCallManager.stop();
      } catch (err) {
        // quiet catch
      }
      if (
        room.state === LKConnectionState.Connected ||
        room.state === LKConnectionState.Reconnecting
      ) {
        room.disconnect();
      }
      roomRef.current = null;
      console.log('[LiveKit] Cleanup completed.');
    };
  }, [
    handleParticipantConnected,
    handleParticipantDisconnected,
    handleConnectionStateChanged,
    handleTrackSubscribed,
    handleTrackUnsubscribed,
    handleActiveSpeakersChanged,
    handleParticipantAttributesChanged,
  ]);

  // ── Connect Handler (with timeout) ───────────────────────────────

  const connect = useCallback(
    async (url: string, token: string): Promise<void> => {
      const room = roomRef.current;
      if (!room) {
        throw new Error('LiveKit room not initialized.');
      }

      if (room.state === LKConnectionState.Connected) {
        console.log('[LiveKit] Already connected. Disconnect first.');
        return;
      }

      console.log('[LiveKit] Joining room...');
      setRoomState((prev) => ({
        ...prev,
        connectionState: 'connecting',
        error: null,
      }));

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Connection timed out after 30 seconds.')),
          CONNECTION_TIMEOUT_MS,
        ),
      );

      try {
        // ── Diagnostics: BEFORE configureAudio ─────────────────────
        logBeforeConfigureAudio().catch(() => {});

        // ── Configure Android audio for VoIP quality ────────────────
        //
        // Sets:
        // - MODE_IN_COMMUNICATION  (enables AEC/NS/AGC natively)
        // - STREAM_VOICE_CALL      (correct stream type for calls)
        // - preferredOutputList    (speaker first -> loudspeaker)
        //
        // Must be called *before* room.connect() per the SDK docs.
        //
        await AudioSession.configureAudio({
          android: {
            preferredOutputList: [
              'speaker',
              'bluetooth',
              'headset',
              'earpiece',
            ],
            audioTypeOptions: AndroidAudioTypePresets.communication,
          },
        });

        // ── Diagnostics: AFTER configureAudio ──────────────────────
        logAfterConfigureAudio().catch(() => {});

        // ── Diagnostics: BEFORE startAudioSession ──────────────────
        logBeforeStartAudioSession().catch(() => {});

        await AudioSession.startAudioSession();

        // ── Diagnostics: AFTER startAudioSession ───────────────────
        logAfterStartAudioSession().catch(() => {});

        const connectOptions: RoomConnectOptions = {
          autoSubscribe: true,
        };

        // ── Diagnostics: BEFORE room.connect() ─────────────────────
        console.log('[AUDIO_DIAG] [Lifecycle] BEFORE room.connect()');
        console.log('[AUDIO_DIAG] [Lifecycle] Room URL:', url);

        // Race the connection against the timeout
        await Promise.race([
          room.connect(url, token, connectOptions),
          timeoutPromise,
        ]);

        // ── Diagnostics: AFTER room.connect() ──────────────────────
        console.log('[AUDIO_DIAG] [Lifecycle] AFTER room.connect()');
        console.log('[AUDIO_DIAG] [Lifecycle] Room SID:', (room as any).sid);

        console.log('[LiveKit] Connected successfully.');

        // ── Diagnostics: BEFORE enableCameraAndMicrophone ──────────
        console.log('[AUDIO_DIAG] [Lifecycle] BEFORE enableCameraAndMicrophone()');

        // Publish camera and microphone tracks automatically
        // Publish camera and microphone tracks automatically
        await room.localParticipant.enableCameraAndMicrophone();

        // 🚨 ADD THIS BLOCK TO FORCE LOUDSPEAKER
        try {
          console.log('[LiveKit] Forcing audio routing via InCallManager...');
          // Using 'video' media type natively signals to Android that this is a 
          // conference/loudspeaker call rather than a standard handset call.
          InCallManager.start({ media: 'video' });
          InCallManager.setForceSpeakerphoneOn(true);
          InCallManager.setKeepScreenOn(true); // Optional: keeps screen awake during class
        } catch (audioErr) {
          console.warn('[LiveKit] InCallManager setup failed:', audioErr);
        }

        

        // ── Diagnostics: AFTER enableCameraAndMicrophone ───────────
        logFullDiagnostics('AFTER enableCameraAndMicrophone', room).catch(
          () => {},
        );

        const localInfo = toParticipantInfo(
          room.localParticipant as Participant,
          true,
        );

        setRoomState({
          connectionState: 'connected',
          participants: [localInfo],
          isCameraEnabled: true,
          isMicrophoneEnabled: true,
          error: null,
        });

        // List existing remote participants
        const remoteParticipants: ParticipantInfo[] = [];
        room.remoteParticipants.forEach(
          (participant: RemoteParticipant) => {
            remoteParticipants.push(
              toParticipantInfo(participant as Participant, false),
            );
          },
        );

        if (remoteParticipants.length > 0) {
          console.log(
            '[LiveKit] Existing participants:',
            remoteParticipants.map((p) => p.identity),
          );
          setRoomState((prev) => ({
            ...prev,
            participants: [...prev.participants, ...remoteParticipants],
          }));
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to connect to room.';
        console.error('[LiveKit] Connection failed:', message);
        setRoomState({
          ...INITIAL_STATE,
          error: message,
        });
        throw error;
      }
    },
    [],
  );

  // ── Disconnect Handler ──────────────────────────────────────────

  // ── Disconnect Handler ──────────────────────────────────────────

  const disconnect = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    console.log('[LiveKit] Leaving room...');
    console.log('[AUDIO_DIAG] [Lifecycle] Disconnecting from room...');
    
    // 🚨 ADD THIS LINE TO RELEASE HARDWARE CONTROL
    try {
      InCallManager.stop();
    } catch (err) {
      console.warn('[LiveKit] Failed to stop InCallManager:', err);
    }

    room.disconnect();
    setRoomState(INITIAL_STATE);
    console.log('[LiveKit] Disconnected.');
    isMountedRef.current = true; // Re-arm for rejoin
  }, []);

  // ── Camera Toggle ─────────────────────────────────────────────

  const toggleCamera = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current;
    if (!room || room.state !== LKConnectionState.Connected) {
      console.warn('[LiveKit] Cannot toggle camera: not connected.');
      return false;
    }

    try {
      const enabled = !roomState.isCameraEnabled;
      console.log('[LiveKit] Camera', enabled ? 'enabled' : 'disabled');

      // Diagnostics: camera toggle
      console.log('[AUDIO_DIAG] [Lifecycle] Camera toggle:', enabled ? 'ON' : 'OFF');

      if (enabled) {
        await room.localParticipant.setCameraEnabled(true);
      } else {
        await room.localParticipant.setCameraEnabled(false);
      }

      setRoomState((prev) => ({
        ...prev,
        isCameraEnabled: enabled,
        participants: prev.participants.map((p) =>
          p.isLocal ? { ...p, isCameraEnabled: enabled } : p,
        ),
      }));

      // Diagnostics: state after camera toggle
      logFullDiagnostics('AFTER camera toggle', room).catch(() => {});

      return enabled;
    } catch (error) {
      console.error('[LiveKit] Camera toggle failed:', error);
      return roomState.isCameraEnabled;
    }
  }, [roomState.isCameraEnabled]);

  // ── Microphone Toggle ─────────────────────────────────────────

  const toggleMicrophone = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current;
    if (!room || room.state !== LKConnectionState.Connected) {
      console.warn('[LiveKit] Cannot toggle microphone: not connected.');
      return false;
    }

    try {
      const enabled = !roomState.isMicrophoneEnabled;
      console.log('[LiveKit] Mic', enabled ? 'enabled' : 'disabled');

      // Diagnostics: microphone toggle
      console.log('[AUDIO_DIAG] [Lifecycle] Mic toggle:', enabled ? 'ON' : 'OFF');

      if (enabled) {
        await room.localParticipant.setMicrophoneEnabled(true);
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
      }

      setRoomState((prev) => ({
        ...prev,
        isMicrophoneEnabled: enabled,
        participants: prev.participants.map((p) =>
          p.isLocal ? { ...p, isMicrophoneEnabled: enabled } : p,
        ),
      }));

      // Diagnostics: state after mic toggle
      logFullDiagnostics('AFTER mic toggle', room).catch(() => {});

      return enabled;
    } catch (error) {
      console.error('[LiveKit] Microphone toggle failed:', error);
      return roomState.isMicrophoneEnabled;
    }
  }, [roomState.isMicrophoneEnabled]);

  // ── Return ──────────────────────────────────────────────────────
  // roomInstance is re-read on every render (refs update don't trigger
  // re-renders, but roomState changes will).

  return {
    roomState,
    room: roomRef.current,
    connect,
    disconnect,
    toggleCamera,
    toggleMicrophone,
  } as const;
}
