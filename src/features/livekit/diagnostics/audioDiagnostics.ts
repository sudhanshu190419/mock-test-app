/**
 * Android Audio Diagnostics
 *
 * A read‑only diagnostic module that collects and logs comprehensive
 * information about Android's audio subsystem, microphone capabilities,
 * and LiveKit audio state.
 *
 * *** This module NEVER changes any audio setting. ***
 * It ONLY writes to the console for log‑based root‑cause analysis.
 *
 * ## Usage
 *
 * All life‑cycle events are wired automatically when `useLiveKit` calls
 * the relevant hooks. You can also call any function manually.
 *
 * ## Log format
 *
 * Every output line is prefixed with `[AUDIO_DIAG]` so logs can be
 * filtered with:
 *
 *   adb logcat -s ReactNative:V ReactNativeJS:V *:S | findstr AUDIO_DIAG
 *
 * @module features/livekit/diagnostics/audioDiagnostics
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { AudioSession } from '@livekit/react-native';
import type { Room, Participant } from 'livekit-client';

// ═══════════════════════════════════════════════════════════════════════════
//  Types (exported for barrel re-export)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shape returned by the native AudioDiagnostics module.
 */
interface NativeDiagnosticsSnapshot {
  device: Record<string, any> | null;
  audioManager: Record<string, any> | null;
  microphone: Record<string, any> | null;
}

export interface RouteChangeEvent {
  action: string;
  reason?: string;
  description?: string;
  scoState?: string;
  headsetState?: string;
  hasMicrophone?: boolean;
  currentMode?: string;
  currentSpeakerphone?: boolean;
  currentBluetoothSco?: boolean;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Native module access
// ═══════════════════════════════════════════════════════════════════════════

const NativeAudioDiag = NativeModules.AudioDiagnostics as
  | {
      getDeviceInfo(): Promise<Record<string, any>>;
      getAudioManagerState(): Promise<Record<string, any>>;
      getMicrophoneInfo(): Promise<Record<string, any>>;
      getAllDiagnostics(): Promise<NativeDiagnosticsSnapshot>;
      getAudioRecordConfig(): Promise<Record<string, any>>;
      startRouteMonitoring(): void;
      stopRouteMonitoring(): void;
      startModeMonitoring(): void;
      stopModeMonitoring(): void;
      startAudioLevelPolling(): void;
      stopAudioLevelPolling(): void;
      addListener(eventName: string): void;
      removeListeners(count: number): void;
    }
  | undefined;

let routeEventEmitter: NativeEventEmitter | null = null;

if (NativeAudioDiag && Platform.OS === 'android') {
  routeEventEmitter = new NativeEventEmitter(NativeAudioDiag as any);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Formatting helpers
// ═══════════════════════════════════════════════════════════════════════════

const LINE = '─'.repeat(58);
const HEAD = '═'.repeat(58);

function tag(label: string): string {
  return `[AUDIO_DIAG] [${label}]`;
}

function captureTag(label: string): string {
  return `[AUDIO_CAPTURE] [${label}]`;
}

function levelTag(label: string): string {
  return `[AUDIO_LEVEL] [${label}]`;
}

/** Indent every line of a multi-line string by `spaces`. */
function indent(str: string, spaces = 2): string {
  const pad = ' '.repeat(spaces);
  return str
    .split('\n')
    .map((line) => pad + line)
    .join('\n');
}

/** Pretty‑print a key: value pair, right‑aligning the value to `width`. */
function kv(key: string, value: any, width = 14): string {
  const val = value === null || value === undefined ? 'N/A' : String(value);
  return `${key.padEnd(width)} : ${val}`;
}

/** Print a map of strings as aligned key: value pairs. */
function printMap(
  title: string,
  data: Record<string, any> | null | undefined,
  keyWidth = 16,
): string {
  if (!data || Object.keys(data).length === 0) {
    return `  ${title}\n  ${LINE}\n  (no data)\n`;
  }
  let out = `  ${title}\n  ${LINE}\n`;
  for (const [k, v] of Object.entries(data)) {
    out += `  ${kv(k, v, keyWidth)}\n`;
  }
  return out;
}

/** Print stream volumes in a nested format. */
function printStreamVolumes(
  volumes: Record<string, { current: number; max: number }> | null | undefined,
): string {
  if (!volumes) return '  (no volume data)\n';
  let out = `  Stream Volumes\n  ${LINE}\n`;
  for (const [name, v] of Object.entries(volumes)) {
    out += `  ${name.padEnd(18)} : ${v.current} / ${v.max}\n`;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log device information: manufacturer, model, Android version, etc.
 */
export async function logDeviceInfo(): Promise<void> {
  const deviceInfo: Record<string, any> = {};

  // Always‑available JS info
  deviceInfo.platform = Platform.OS;
  deviceInfo.platformVersion = String(Platform.Version);

  // Native info (Android only)
  if (Platform.OS === 'android' && NativeAudioDiag) {
    try {
      const native = await NativeAudioDiag.getDeviceInfo();
      Object.assign(deviceInfo, native);
    } catch (e) {
      deviceInfo.nativeError = String(e);
    }
  }

  const lines = [
    `\n`,
    `${HEAD}`,
    `ANDROID AUDIO DIAGNOSTICS — DEVICE INFORMATION`,
    `${HEAD}`,
    ``,
    printMap('Device', deviceInfo, 18),
  ];

  console.log(lines.join('\n'));
}

/**
 * Log AudioManager state: mode, speakerphone, volumes, devices, etc.
 */
export async function logAudioManagerState(): Promise<void> {
  if (Platform.OS !== 'android' || !NativeAudioDiag) {
    console.log(tag('AudioManager'), 'Not available on this platform');
    return;
  }

  try {
    const state = await NativeAudioDiag.getAudioManagerState();
    const lines = [
      `\n${HEAD}`,
      `ANDROID AUDIO DIAGNOSTICS — AUDIO MANAGER STATE`,
      `${HEAD}`,
      ``,
      printMap('Flags', {
        Mode: state.mode ?? '?',
        Speakerphone: state.isSpeakerphoneOn,
        'Mic Mute': state.isMicrophoneMute,
        'Music Active': state.isMusicActive,
        'Ringer Mode': state.ringerMode ?? '?',
        'BT SCO': state.isBluetoothScoOn,
        'Wired Headset': state.isWiredHeadsetOn,
      }),
      printStreamVolumes(state.streamVolumes),
      state.activeInputDevice
        ? `  Active Input  : ${state.activeInputDevice}\n`
        : '',
      state.activeOutputDevice
        ? `  Active Output : ${state.activeOutputDevice}\n`
        : '',
    ];

    console.log(lines.join(''));
  } catch (e) {
    console.log(tag('AudioManager'), 'Failed to read state:', String(e));
  }
}

/**
 * Log microphone capabilities: sample rate, AEC/NS/AGC, encodings, etc.
 */
export async function logMicrophoneInfo(): Promise<void> {
  if (Platform.OS !== 'android' || !NativeAudioDiag) {
    console.log(tag('Microphone'), 'Not available on this platform');
    return;
  }

  try {
    const mic = await NativeAudioDiag.getMicrophoneInfo();
    const lines = [
      `\n${HEAD}`,
      `ANDROID AUDIO DIAGNOSTICS — MICROPHONE`,
      `${HEAD}`,
      ``,
      printMap('Hardware Audio Processing', {
        'AEC Supported': mic.aecSupported,
        'AEC Enabled': mic.aecEnabled,
        'NS Supported': mic.nsSupported,
        'NS Enabled': mic.nsEnabled,
        'AGC Supported': mic.agcSupported,
        'AGC Enabled': mic.agcEnabled,
      }),
      printMap('Input Device', {
        Type: mic.inputDeviceType ?? 'N/A',
        'Product Name': mic.inputDeviceProductName ?? 'N/A',
        Address: mic.inputDeviceAddress ?? 'N/A',
      }),
      mic.supportedSampleRates
        ? `  Sample Rates : ${(mic.supportedSampleRates as number[]).join(', ')}\n`
        : '',
      mic.channelCounts
        ? `  Channels     : ${(mic.channelCounts as number[]).join(', ')}\n`
        : '',
      mic.encodings
        ? `  Encodings    : ${(mic.encodings as string[]).join(', ')}\n`
        : '',
      printMap('Audio Properties', {
        'Unprocessed Audio': mic.supportsUnprocessedAudio,
        'Output Sample Rate': mic.outputSampleRate,
        'Output Frames/Buffer': mic.outputFramesPerBuffer,
      }),
    ];

    console.log(lines.join(''));
  } catch (e) {
    console.log(tag('Microphone'), 'Failed to read microphone info:', String(e));
  }
}

/**
 * Log the LiveKit AudioSession configuration.
 * Does NOT modify any configuration — only reads it.
 */
export function logAudioSessionConfig(): void {
  // AudioSession from @livekit/react-native does not expose a
  // getter for the current configuration, so we log what was
  // previously set by our own code.
  const lines = [
    `\n${HEAD}`,
    `ANDROID AUDIO DIAGNOSTICS — AUDIO SESSION`,
    `${HEAD}`,
    ``,
    `  AudioSession.configureAudio() was called with:`,
    `    preferredOutputList : ["speaker", "bluetooth", "headset", "earpiece"]`,
    `    audioTypeOptions    : AndroidAudioTypePresets.communication`,
    `                      -> MODE_IN_COMMUNICATION`,
    `                      -> STREAM_VOICE_CALL`,
    `                      -> AEC / NS / AGC enabled by system`,
    ``,
    `  AudioSession.startAudioSession() was called after config.`,
    ``,
  ];

  console.log(lines.join(''));
}

/**
 * Log LiveKit room state: connection, tracks, mic, camera.
 */
export function logLiveKitState(
  label: string,
  room: Room | null,
  isMicEnabled?: boolean,
  isCameraEnabled?: boolean,
): void {
  if (!room) {
    console.log(tag('LiveKit'), `${label} — Room instance is null`);
    return;
  }

  const localParticipant = room.localParticipant;
  const micPublication = localParticipant?.getTrackPublication(
    'microphone' as any,
  );
  const camPublication = localParticipant?.getTrackPublication(
    'camera' as any,
  );

  const micTrack = micPublication?.track;
  const camTrack = camPublication?.track;

  const lines = [
    `\n${HEAD}`,
    `ANDROID AUDIO DIAGNOSTICS — LIVEKIT STATE (${label})`,
    `${HEAD}`,
    ``,
    printMap('Room', {
      SID: (room as any).sid ?? '(not assigned)',
      'Connection State': room.state,
      'Server Version': (room as any).serverVersion ?? '?',
      Participants: room.remoteParticipants.size,
    }),
    localParticipant
      ? printMap('Local Participant', {
          SID: localParticipant.sid,
          Identity: localParticipant.identity,
          'Mic Enabled': micPublication?.isEnabled ?? false,
          'Cam Enabled': camPublication?.isEnabled ?? false,
          'Mic Track State': micTrack?.mediaStreamTrack?.readyState ?? 'none',
          'Cam Track State': camTrack?.mediaStreamTrack?.readyState ?? 'none',
        })
      : '',
  ];

  console.log(lines.join(''));
}

/**
 * Full diagnostics snapshot — calls native getAllDiagnostics and logs
 * everything in a single, readable block.
 */
export async function logFullDiagnostics(
  label: string,
  room?: Room | null,
): Promise<void> {
  const lines: string[] = [
    `\n`,
    `${HEAD}`,
    `ANDROID AUDIO DIAGNOSTICS — FULL SNAPSHOT [${label}]`,
    `${HEAD}`,
  ];

  if (Platform.OS === 'android' && NativeAudioDiag) {
    try {
      const snap = await NativeAudioDiag.getAllDiagnostics();

      if (snap.device) {
        lines.push(``, printMap('Device', snap.device, 18));
      }
      if (snap.audioManager) {
        const am = snap.audioManager;
        lines.push(
          ``,
          printMap('Audio Manager', {
            Mode: am.mode ?? '?',
            Speakerphone: am.isSpeakerphoneOn,
            'Mic Mute': am.isMicrophoneMute,
            'Ringer Mode': am.ringerMode ?? '?',
            'BT SCO': am.isBluetoothScoOn,
            'Wired Headset': am.isWiredHeadsetOn,
          }),
        );
        if (am.streamVolumes) {
          lines.push(``, printStreamVolumes(am.streamVolumes));
        }
        if (am.activeInputDevice) {
          lines.push(`  Active Input  : ${am.activeInputDevice}`);
        }
        if (am.activeOutputDevice) {
          lines.push(`  Active Output : ${am.activeOutputDevice}`);
        }
      }
      if (snap.microphone) {
        lines.push(
          ``,
          printMap('Microphone / HW Audio', {
            'AEC Supported': snap.microphone.aecSupported,
            'AEC Enabled': snap.microphone.aecEnabled,
            'NS Supported': snap.microphone.nsSupported,
            'NS Enabled': snap.microphone.nsEnabled,
            'AGC Supported': snap.microphone.agcSupported,
            'AGC Enabled': snap.microphone.agcEnabled,
          }),
        );
        if (snap.microphone.inputDeviceType) {
          lines.push(
            `  Input Device  : ${snap.microphone.inputDeviceType} (${snap.microphone.inputDeviceProductName ?? '?'})`,
          );
        }
        if (snap.microphone.supportedSampleRates) {
          lines.push(
            `  Sample Rates  : ${(snap.microphone.supportedSampleRates as number[]).join(', ')}`,
          );
        }
        if (snap.microphone.channelCounts) {
          lines.push(
            `  Channels      : ${(snap.microphone.channelCounts as number[]).join(', ')}`,
          );
        }
      }
    } catch (e) {
      lines.push(``, `  [Native diagnostics unavailable: ${String(e)}]`);
    }
  } else {
    lines.push(``, `  [Platform: ${Platform.OS} — native diagnostics not available]`);
  }

  // LiveKit state
  if (room) {
    lines.push(
      ``,
      printMap('LiveKit', {
        SID: (room as any).sid ?? '(not assigned)',
        State: room.state,
      }),
    );
    const lp = room.localParticipant;
    if (lp) {
      lines.push(
        printMap('Local Participant', {
          SID: lp.sid,
          Identity: lp.identity,
          'Mic Pub': lp.getTrackPublication('microphone' as any)?.isEnabled ?? false,
          'Cam Pub': lp.getTrackPublication('camera' as any)?.isEnabled ?? false,
        }),
      );
    }
  }

  console.log(lines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════
//  Audio Session Diagnostics (from JS side)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Logs the "before configureAudio" state snapshot.
 */
export async function logBeforeConfigureAudio(): Promise<void> {
  console.log(tag('Lifecycle'), 'BEFORE configureAudio()');
  await logAudioManagerState();
  await logMicrophoneInfo();
}

/**
 * Logs the "after configureAudio" state snapshot.
 */
export async function logAfterConfigureAudio(): Promise<void> {
  console.log(tag('Lifecycle'), 'AFTER configureAudio()');
  await logAudioManagerState();
  await logMicrophoneInfo();
}

/**
 * Logs the "before startAudioSession" state snapshot.
 */
export async function logBeforeStartAudioSession(): Promise<void> {
  console.log(tag('Lifecycle'), 'BEFORE startAudioSession()');
  await logAudioManagerState();
}

/**
 * Logs the "after startAudioSession" state snapshot.
 */
export async function logAfterStartAudioSession(): Promise<void> {
  console.log(tag('Lifecycle'), 'AFTER startAudioSession()');
  await logAudioManagerState();
  await logMicrophoneInfo();
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. AudioRecord Configuration Diagnostics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Logs AudioRecord initialization parameters supported by this device.
 * Uses only `AudioRecord.getMinBufferSize()` — never creates an AudioRecord
 * instance, so it does NOT conflict with WebRTC's AudioRecord.
 *
 * Logs with [AUDIO_CAPTURE] prefix.
 *
 * NOTE: This only logs the STATIC configuration that WOULD be used
 * if WebRTC created an AudioRecord. The following AudioRecord runtime
 * states CANNOT be observed without modifying WebRTC internals (which
 * would violate the "no behavior change" constraint):
 *   - AudioRecord state (initialized / recording / stopped)
 *   - Recording state (startRecording success/failure)
 *   - AudioRecord.read() return values
 *   - Session ID
 *
 * These require modifying @livekit/react-native-webrtc's source.
 * For now, the static config below is the best read-only diagnostic.
 */
export async function logAudioRecordConfig(): Promise<void> {
  if (Platform.OS !== 'android' || !NativeAudioDiag) {
    console.log(captureTag('Config'), 'Not available on this platform');
    return;
  }

  try {
    const info = await NativeAudioDiag.getAudioRecordConfig();

    const lines: string[] = [
      `\n${HEAD}`,
      `ANDROID AUDIO DIAGNOSTICS — AudioRecord CONFIGURATION`,
      `${HEAD}`,
      ``,
      `  [AUDIO_CAPTURE] AudioRecord static configuration:`,
      ``,
      `  Audio Source   : ${info.recommended?.audioSource ?? '?'}`,
      `  Sample Rate    : ${info.recommended?.recommendedSampleRate ?? '?'} Hz`,
      `  Channel Config : ${info.recommended?.recommendedChannelConfig ?? '?'}`,
      `  Encoding       : ${info.recommended?.recommendedEncoding ?? '?'}`,
      `  Min Buffer Size: ${info.recommended?.recommendedMinBufferSize ?? '?'} bytes`,
      ``,
      `  Output Sample Rate (API 28+): ${info.outputSampleRate ?? 'N/A'} Hz`,
      ``,
    ];

    // Valid configurations
    const validConfigs = info.validConfigs as Array<Record<string, any>> | undefined;
    if (validConfigs && validConfigs.length > 0) {
      lines.push(`  Supported configurations (${validConfigs.length} total):`);
      lines.push(`  ${LINE}`);

      // Group by sample rate for readability
      const byRate: Record<number, Array<Record<string, any>>> = {};
      for (const cfg of validConfigs) {
        const sr = cfg.sampleRate as number;
        if (!byRate[sr]) byRate[sr] = [];
        byRate[sr].push(cfg);
      }

      const sortedRates = Object.keys(byRate)
        .map(Number)
        .sort((a, b) => a - b);

      for (const sr of sortedRates) {
        const configs = byRate[sr];
        for (const cfg of configs) {
          lines.push(
            `    ${String(sr).padStart(5)} Hz | ${(cfg.channelConfig as string).padEnd(7)} | ${(cfg.encoding as string).padEnd(10)} | buffer: ${String(cfg.minBufferSize).padStart(5)} bytes`,
          );
        }
      }
    } else {
      lines.push(`  No compatible AudioRecord configurations found.`);
    }

    lines.push(``);
    console.log(lines.join('\n'));
  } catch (e) {
    console.log(captureTag('Config'), 'Failed to query:', String(e));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. Real-time Microphone / Audio Level Analysis
// ═══════════════════════════════════════════════════════════════════════════

interface AudioLevelSample {
  timestamp: number;
  audioLevel: number;
  isSpeaking: boolean;
}

/**
 * Rolling window of audio level samples for computing peak/avg/silence.
 */
const levelHistory: AudioLevelSample[] = [];
const MAX_HISTORY = 60; // 60 seconds of 1-second samples

/**
 * Reset the rolling audio level history.
 * Call this when starting a new monitoring session so statistics
 * from a previous session are not mixed in.
 */
function resetLevelHistory(): void {
  levelHistory.length = 0;
}

/**
 * Log the current audio level from the LiveKit local participant.
 * Logs with [AUDIO_LEVEL] prefix.
 *
 * Also computes and logs rolling statistics:
 *   - Peak amplitude (max audioLevel in the window)
 *   - Average amplitude
 *   - Silence percentage (audioLevel < 0.01 threshold)
 *
 * @param localParticipant - The local participant from livekit-client
 * @param label - Optional label for context (e.g. "1s interval")
 */
export function logAudioLevel(
  localParticipant: Participant | null | undefined,
  label = '',
): void {
  if (!localParticipant) {
    console.log(levelTag('Capture'), `${label} No local participant available`);
    return;
  }

  // audioLevel from livekit-client is 0 (silent) to 1 (loudest)
  const rawLevel = localParticipant.audioLevel ?? 0;
  const isSpeaking = localParticipant.isSpeaking ?? false;

  // Clamp to 0-1
  const level = Math.max(0, Math.min(1, rawLevel));

  // Store sample
  const sample: AudioLevelSample = {
    timestamp: Date.now(),
    audioLevel: level,
    isSpeaking,
  };
  levelHistory.push(sample);
  while (levelHistory.length > MAX_HISTORY) {
    levelHistory.shift();
  }

  // Compute rolling statistics over the last N samples
  const window =
    levelHistory.length >= 10 ? levelHistory.slice(-10) : levelHistory;
  let peak = 0;
  let sum = 0;
  let silenceCount = 0;
  const threshold = 0.01;

  for (const s of window) {
    if (s.audioLevel > peak) peak = s.audioLevel;
    sum += s.audioLevel;
    if (s.audioLevel < threshold) silenceCount++;
  }
  const avg = sum / window.length;
  const silencePct = (silenceCount / window.length) * 100;

  // Format level as dB-like value for readability
  // audioLevel is 0-1 where ~0.01 is quiet speech, ~0.5 is loud speech
  const levelDB = level > 0 ? (20 * Math.log10(level)).toFixed(1) : '-Infinity';
  const peakDB = peak > 0 ? (20 * Math.log10(peak)).toFixed(1) : '-Infinity';
  const avgDB = avg > 0 ? (20 * Math.log10(avg)).toFixed(1) : '-Infinity';

  // Visual level bar
  const barLen = Math.round(level * 40);
  const bar = '█'.repeat(barLen) + '░'.repeat(Math.max(0, 40 - barLen));

  const lines = [
    `[AUDIO_LEVEL] [Capture] ${label} level: ${(level * 100).toFixed(1)}%  |${bar}|`,
    `[AUDIO_LEVEL] [Stats]   peak: ${(peak * 100).toFixed(1)}%  avg: ${(avg * 100).toFixed(1)}%  silence: ${silencePct.toFixed(0)}%`,
    `[AUDIO_LEVEL] [Log]     level: ${levelDB} dB (rel)  peak: ${peakDB} dB (rel)  avg: ${avgDB} dB (rel)  speaking: ${isSpeaking}`,
  ];

  console.log(lines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. Audio Focus State (passive observation only)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Logs a note about audio focus monitoring.
 *
 * Android's AudioManager does NOT expose a passive API to observe the
 * current audio focus state. Registering an `OnAudioFocusChangeListener`
 * requires calling `requestAudioFocus()` first, which changes audio behavior.
 *
 * To diagnose audio focus issues manually:
 *   adb shell dumpsys audio | grep -A 20 "Audio Focus"
 *
 * The polled AudioManager state below can sometimes indicate focus
 * indirectly (e.g., volume ducking, mode changes).
 */
export function logAudioFocusState(): void {
  const lines = [
    `\n===========================================`,
    `ANDROID AUDIO DIAGNOSTICS — Audio Focus`,
    `===========================================`,
    ``,
    `  [AUDIO_CAPTURE] Audio focus passive monitoring: NOT AVAILABLE`,
    `  Reason: Android does not expose a passive read-only API for`,
    `  observing audio focus. Registering an OnAudioFocusChangeListener`,
    `  requires calling requestAudioFocus(), which is a behavior change.`,
    ``,
    `  To check audio focus state manually, run:`,
    `    adb shell dumpsys audio | grep -A 20 "Audio Focus"`,
    ``,
    `  Key things to look for in dumpsys output:`,
    `    - "active_audio_focus" - who currently holds focus`,
    `    - "fade" / "duck" state - whether our app is being ducked`,
    `    - "Focus Stack" - ordered list of focus holders`,
    ``,
  ];

  console.log(lines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. AudioManager Mode Transition Logging
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start monitoring AudioManager mode transitions.
 * The native module emits `onAudioModeChanged` events when the mode changes.
 */
export function startModeMonitoring(): void {
  if (Platform.OS !== 'android' || !NativeAudioDiag) {
    console.log(captureTag('Mode'), 'Not available on this platform');
    return;
  }

  NativeAudioDiag.startModeMonitoring();
  console.log(captureTag('Mode'), 'Mode transition monitoring started');
}

/**
 * Stop monitoring AudioManager mode transitions.
 */
export function stopModeMonitoring(): void {
  if (Platform.OS !== 'android' || !NativeAudioDiag) {
    return;
  }

  NativeAudioDiag.stopModeMonitoring();
  console.log(captureTag('Mode'), 'Mode transition monitoring stopped');
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. WebRTC / LiveKit Audio Callbacks (read-only observation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Logs LiveKit audio track state changes (publication, track state,
 * capture start/stop) as observed from the Room's local participant.
 *
 * These are NOT direct WebRTC callbacks, but observable state from
 * livekit-client that reflects what WebRTC is doing underneath.
 */
export function logLiveKitAudioCallbacks(label: string, localParticipant: Participant | null | undefined): void {
  if (!localParticipant) {
    console.log(captureTag('LKCallback'), `${label} — No local participant`);
    return;
  }

  const micPub = localParticipant.getTrackPublication('microphone' as any);

  if (!micPub) {
    console.log(captureTag('LKCallback'), `${label} — No microphone publication`);
    return;
  }

  const track = micPub.track;
  const trackState = track?.mediaStreamTrack?.readyState ?? 'none';

  const lines = [
    `[AUDIO_CAPTURE] [LKCallback] ${label}`,
    `  Publication      : ${micPub.isEnabled ? 'ENABLED' : 'DISABLED'}`,
    `  Track Kind       : ${track?.kind ?? 'none'}`,
    `  Track State      : ${trackState}`,
    `  Track Muted      : ${track?.isMuted ?? '?'}`,
    `  Track SID        : ${track?.sid ?? '?'}`,
    `  Source           : ${track?.source ?? '?'}`,
    `  Publication SID  : ${micPub.trackSid ?? '?'}`,
    `  Audio Level      : ${(localParticipant.audioLevel ?? 0).toFixed(4)}`,
    `  Is Speaking      : ${localParticipant.isSpeaking}`,
  ];

  console.log(lines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════
//  6. LiveKit Outbound Audio Statistics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Attempts to read LiveKit outbound audio statistics from the underlying
 * WebRTC peer connection.
 *
 * This accesses `room.engine` internally (undocumented API) and wraps
 * everything in try/catch. If the engine API is not available or returns
 * no data, a message indicating stats are unavailable is logged.
 *
 * In React Native, `RTCPeerConnection.getStats()` support depends on
 * the WebRTC implementation. This is best-effort diagnostics.
 */
export async function logOutboundAudioStats(room: Room | null): Promise<void> {
  if (!room || !room.localParticipant) {
    console.log(captureTag('RTCStats'), 'No room or local participant');
    return;
  }

  // First, log what we can get from LiveKit directly
  const lp = room.localParticipant;
  const micPub = lp.getTrackPublication('microphone' as any);
  const micTrack = micPub?.track;

  const directLines = [
    `[AUDIO_CAPTURE] [RTCStats] — Local outbound audio (LiveKit API)`,
    `  Audio Level       : ${(lp.audioLevel ?? 0).toFixed(4)}`,
    `  Is Speaking       : ${lp.isSpeaking}`,
    `  Mic Published     : ${micPub?.isEnabled ?? false}`,
    `  Mic Track State   : ${micTrack?.mediaStreamTrack?.readyState ?? 'none'}`,
    `  Mic Track Muted   : ${micTrack?.isMuted ?? '?'}`,
  ];

  // Try to get WebRTC-level statistics via room.engine
  try {
    // Access the internal engine — this is undocumented but works
    // in livekit-client 2.x
    const engine = (room as any).engine;
    if (engine) {
      const client = engine.client;
      if (client) {
        const pc = client.peerConnection ?? client._peerConnection;
        if (pc && typeof pc.getStats === 'function') {
          const statsReport: any = await pc.getStats();
          let audioStatsFound = false;

          if (statsReport && typeof statsReport.forEach === 'function') {
            statsReport.forEach((report: any) => {
              if (
                report.type === 'outbound-rtp' &&
                report.kind === 'audio'
              ) {
                audioStatsFound = true;
                directLines.push(
                  ``,
                  `  ── WebRTC outbound-rtp (audio) stats ──`,
                  `  Packets Sent      : ${report.packetsSent ?? '?'}`,
                  `  Bytes Sent        : ${report.bytesSent ?? '?'}`,
                  `  Bitrate (est.)    : ${report.bytesSent && report.timestamp ? 'varies' : '?'}`,
                  `  Packet Loss       : ${report.packetsLost ?? '?'}`,
                  `  Jitter            : ${report.jitter !== undefined ? (report.jitter * 1000).toFixed(2) + ' ms' : '?'}`,
                  `  Codec             : ${report.codecId ?? '?'}`,
                  `  SSRC              : ${report.ssrc ?? '?'}`,
                  `  Target Bitrate    : ${report.targetBitrate ?? '?'}`,
                  `  Quality Limit     : ${report.qualityLimitationReason ?? 'none'}`,
                  `  Encoded Frames    : ${report.framesEncoded ?? '?'}`,
                  `  Total Encode Time : ${report.totalEncodeTime ?? '?'}`,
                  `  NACK Count        : ${report.nackCount ?? '?'}`,
                  `  PLI Count         : ${report.pliCount ?? '?'}`,
                );
              }
            });
          } else if (statsReport && typeof statsReport.values === 'function') {
            // Map-based stats (Chrome/RN WebRTC)
            const values = Array.from(statsReport.values()) as any[];
            for (const report of values) {
              if (
                report.type === 'outbound-rtp' &&
                report.kind === 'audio'
              ) {
                audioStatsFound = true;
                directLines.push(
                  ``,
                  `  ── WebRTC outbound-rtp (audio) stats ──`,
                  `  Packets Sent      : ${report.packetsSent ?? '?'}`,
                  `  Bytes Sent        : ${report.bytesSent ?? '?'}`,
                  `  Packet Loss       : ${report.packetsLost ?? '?'}`,
                  `  Jitter            : ${report.jitter !== undefined ? (report.jitter * 1000).toFixed(2) + ' ms' : '?'}`,
                  `  Codec             : ${report.codecId ?? '?'}`,
                  `  SSRC              : ${report.ssrc ?? '?'}`,
                  `  Target Bitrate    : ${report.targetBitrate ?? '?'}`,
                );
              }
            }
          }

          if (!audioStatsFound) {
            directLines.push(
              ``,
              `  ── WebRTC stats available but no outbound-rtp audio found`,
              `  (stats report entries: ${statsReport.size ?? statsReport.length ?? '?'})`,
            );
          }
        } else {
          directLines.push(
            ``,
            `  ── WebRTC peerConnection.getStats() not available`,
          );
        }
      } else {
        directLines.push(``, `  ── Engine client not available`);
      }
    } else {
      directLines.push(
        ``,
        `  ── room.engine not accessible (expected in RN)`,
      );
    }
  } catch (statsError) {
    directLines.push(
      ``,
      `  ── WebRTC getStats() failed: ${String(statsError)}`,
    );
  }

  console.log(directLines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════
//  Periodic Audio Monitor (combines all diagnostics every 1 second)
// ═══════════════════════════════════════════════════════════════════════════

let periodicMonitorInterval: ReturnType<typeof setInterval> | null = null;
let periodicMonitorRoomRef: { current: Room | null } | null = null;

/**
 * Start a 1-second interval that logs:
 * - Audio level from LiveKit local participant
 * - AudioManager state from native polling (mode, volumes, etc.)
 * - Mode transitions
 * - LiveKit audio callbacks state
 *
 * Call `stopCapturingAudioDiagnostics()` to stop.
 *
 * @param roomRef - A ref-like object with `.current` pointing to the Room
 */
export function startCapturingAudioDiagnostics(roomRef: {
  current: Room | null;
}): void {
  if (Platform.OS !== 'android') {
    console.log(captureTag('Periodic'), 'Not available on this platform');
    return;
  }

  // Stop any existing monitor
  if (periodicMonitorInterval) {
    clearInterval(periodicMonitorInterval);
  }

  periodicMonitorRoomRef = roomRef;

  // Register event listeners FIRST, then start native polling
  // to avoid missing any early events.
  if (routeEventEmitter) {
    routeEventEmitter.addListener('onAudioLevelUpdate', (state: any) => {
      // Mode transitions are also logged via onAudioModeChanged
      // Level updates provide the native side of audio state
      console.log(
        `[AUDIO_CAPTURE] [NativePoll] mode: ${state.modeLabel ?? '?'} | ` +
          `speaker: ${String(state.speakerphoneOn)} | ` +
          `micMute: ${String(state.microphoneMute)} | ` +
          `callVol: ${String(state.voiceCallVolume)}/${String(state.voiceCallMaxVolume)} | ` +
          `btSCO: ${String(state.bluetoothScoOn)}`,
      );
    });

    // Register event listener for mode transitions
    routeEventEmitter.addListener('onAudioModeChanged', (event: any) => {
      console.log(
        `\n${HEAD}`,
      );
      console.log(`ANDROID AUDIO DIAGNOSTICS — MODE TRANSITION`);
      console.log(`${HEAD}`);
      console.log(`[AUDIO_CAPTURE] [Mode] ${event.previousMode ?? '?'} → ${event.currentMode ?? '?'}`);
      console.log();
    });
  }

  // Start native audio level polling (1s AudioManager state events)
  // AFTER registering listeners so no events are missed.
  if (NativeAudioDiag) {
    NativeAudioDiag.startAudioLevelPolling();
    NativeAudioDiag.startModeMonitoring();
  }

  // Reset rolling level history for a fresh session
  resetLevelHistory();

  // Simple counter-based throttling for sub-interval logging
  let tickCounter = 0;

  // Start JS-side 1-second interval
  periodicMonitorInterval = setInterval(() => {
    const room = roomRef.current;
    if (!room) return;

    const lp = room.localParticipant;
    tickCounter++;

    // Log audio level from LiveKit
    logAudioLevel(lp, '1s');

    // Log LiveKit audio callbacks state (every 5th tick to reduce noise)
    if (tickCounter % 5 === 0) {
      logLiveKitAudioCallbacks('Periodic', lp);
    }

    // Log outbound stats (every 10th tick)
    if (tickCounter % 10 === 0) {
      logOutboundAudioStats(room).catch(() => {});
    }
  }, 1000);

  console.log(captureTag('Periodic'), '1-second audio capture monitor started');
  console.log(
    levelTag('Periodic'),
    'Logging audio level every 1s, callbacks every 5s, stats every 10s',
  );
}

/**
 * Stop the periodic audio capture monitor.
 */
export function stopCapturingAudioDiagnostics(): void {
  if (periodicMonitorInterval) {
    clearInterval(periodicMonitorInterval);
    periodicMonitorInterval = null;
  }

  // Stop native polling
  if (NativeAudioDiag) {
    NativeAudioDiag.stopAudioLevelPolling();
    NativeAudioDiag.stopModeMonitoring();
  }

  // Clear event listeners (the NativeEventEmitter will be garbage collected;
  // a fresh one is created on next startCapturingAudioDiagnostics call)
  if (routeEventEmitter) {
    routeEventEmitter.removeAllListeners('onAudioLevelUpdate');
    routeEventEmitter.removeAllListeners('onAudioModeChanged');
  }

  periodicMonitorRoomRef = null;
  console.log(captureTag('Periodic'), 'Audio capture monitor stopped');
}

// ═══════════════════════════════════════════════════════════════════════════
//  Route Monitoring
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Subscribe to native Android audio route change events.
 * The callback receives a formatted log string each time a route change
 * is detected.
 */
export function startRouteMonitoring(
  onRouteChange?: (event: RouteChangeEvent) => void,
): void {
  if (Platform.OS !== 'android' || !NativeAudioDiag || !routeEventEmitter) {
    console.log(tag('RouteMonitor'), 'Not available on this platform');
    return;
  }

  NativeAudioDiag.startRouteMonitoring();

  routeEventEmitter.addListener('onAudioRouteChanged', (event: any) => {
    const ev = (event ?? {}) as RouteChangeEvent;
    const lines = [
      `\n${HEAD}`,
      `ANDROID AUDIO DIAGNOSTICS — ROUTE CHANGE`,
      `${HEAD}`,
      ``,
      `  Action     : ${ev.action ?? 'unknown'}`,
      `  Reason     : ${ev.reason ?? '?'}`,
      `  Description: ${ev.description ?? '?'}`,
      ev.scoState ? `  SCO State  : ${ev.scoState}` : '',
      ev.headsetState
        ? `  Headset    : ${ev.headsetState} ${ev.hasMicrophone ? '(with mic)' : ''}`
        : '',
      ``,
      `  Post-change AudioManager:`,
      `    Mode         : ${ev.currentMode ?? '?'}`,
      `    Speakerphone : ${ev.currentSpeakerphone ?? '?'}`,
      `    BT SCO       : ${ev.currentBluetoothSco ?? '?'}`,
      ``,
    ];

    console.log(lines.filter(Boolean).join('\n'));

    onRouteChange?.(ev);
  });

  // Also listen for full diagnostics snapshots emitted by the native module
  routeEventEmitter.addListener('onAudioDiagnosticsSnapshot', (snap: any) => {
    const lines = [
      `\n${HEAD}`,
      `ANDROID AUDIO DIAGNOSTICS — ROUTE CHANGE SNAPSHOT`,
      `${HEAD}`,
    ];
    if (snap?.audioManager) {
      lines.push(
        ``,
        printMap('Audio Manager', {
          Mode: snap.audioManager.mode,
          Speakerphone: snap.audioManager.isSpeakerphoneOn,
          'Mic Mute': snap.audioManager.isMicrophoneMute,
          'BT SCO': snap.audioManager.isBluetoothScoOn,
          'Active Input': snap.audioManager.activeInputDevice ?? '?',
          'Active Output': snap.audioManager.activeOutputDevice ?? '?',
        }),
      );
    }
    if (snap?.microphone) {
      lines.push(
        ``,
        printMap('Microphone', {
          'Input Device': snap.microphone.inputDeviceType ?? '?',
          AEC: snap.microphone.aecSupported ? 'supported' : 'not supported',
          NS: snap.microphone.nsSupported ? 'supported' : 'not supported',
          AGC: snap.microphone.agcSupported ? 'supported' : 'not supported',
        }),
      );
    }
    console.log(lines.join('\n'));
  });

  console.log(tag('RouteMonitor'), 'Route change monitoring started');
}

/**
 * Unsubscribe from native route change events.
 */
export function stopRouteMonitoring(): void {
  if (Platform.OS !== 'android' || !NativeAudioDiag) {
    return;
  }

  NativeAudioDiag.stopRouteMonitoring();
  console.log(tag('RouteMonitor'), 'Route change monitoring stopped');
}

// ═══════════════════════════════════════════════════════════════════════════
//  Convenience: log all diagnostic data at once
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log everything — device info, audio manager, microphone, and LiveKit state.
 * Call this at any point to get a full baseline snapshot.
 */
export async function logAllDiagnostics(
  label: string,
  room?: Room | null,
): Promise<void> {
  await logDeviceInfo();
  await logAudioManagerState();
  await logMicrophoneInfo();
  logAudioSessionConfig();
  logLiveKitState(label, room ?? null);
}

/**
 * Start route monitoring and log a full initial snapshot.
 * Call this once after app launch to begin diagnostics.
 */
export async function initializeDiagnostics(
  onRouteChange?: (event: RouteChangeEvent) => void,
): Promise<void> {
  console.log(`\n${HEAD}`);
  console.log(`ANDROID AUDIO DIAGNOSTICS — INITIALIZED`);
  console.log(`${HEAD}\n`);

  await logDeviceInfo();
  await logAudioManagerState();
  await logMicrophoneInfo();
  logAudioSessionConfig();

  startRouteMonitoring(onRouteChange);

  console.log(tag('Init'), 'Diagnostics initialized. Route monitoring active.\n');
}
