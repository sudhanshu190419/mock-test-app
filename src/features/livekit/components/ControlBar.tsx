/**
 * ControlBar
 *
 * Bottom control bar for the Live Room screen.
 *
 * Provides three buttons:
 * - Toggle microphone (mute/unmute)
 * - Leave room (disconnect)
 * - Toggle camera (on/off)
 *
 * Each button shows its current state via icon and color.
 *
 * @module features/livekit/components/ControlBar
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//  Props
// ═══════════════════════════════════════════════════════════════════════════

interface ControlBarProps {
  /** Whether the local camera is currently enabled. */
  isCameraEnabled: boolean;
  /** Whether the local microphone is currently enabled. */
  isMicrophoneEnabled: boolean;
  /** Called when the toggle camera button is pressed. */
  onToggleCamera: () => void;
  /** Called when the toggle microphone button is pressed. */
  onToggleMicrophone: () => void;
  /** Called when the leave room button is pressed. */
  onLeave: () => void;
  /** Whether the component should be disabled (e.g. during connection). */
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bottom control bar with camera, microphone, and leave buttons.
 *
 * Layout:
 * ```
 * [ Camera ]    [ Leave ]    [ Microphone ]
 * ```
 */
export default function ControlBar({
  isCameraEnabled,
  isMicrophoneEnabled,
  onToggleCamera,
  onToggleMicrophone,
  onLeave,
  disabled = false,
}: ControlBarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Camera Toggle */}
      <TouchableOpacity
        style={[
          styles.button,
          isCameraEnabled ? styles.buttonActive : styles.buttonInactive,
        ]}
        onPress={onToggleCamera}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>
          {isCameraEnabled ? '📷' : '🚫📷'}
        </Text>
        <Text
          style={[
            styles.buttonLabel,
            { color: isCameraEnabled ? '#FFFFFF' : '#FF6B6B' },
          ]}
        >
          {isCameraEnabled ? 'Camera On' : 'Camera Off'}
        </Text>
      </TouchableOpacity>

      {/* Leave Room */}
      <TouchableOpacity
        style={[styles.button, styles.leaveButton]}
        onPress={onLeave}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>📞</Text>
        <Text style={[styles.buttonLabel, { color: '#FFFFFF' }]}>
          Leave
        </Text>
      </TouchableOpacity>

      {/* Microphone Toggle */}
      <TouchableOpacity
        style={[
          styles.button,
          isMicrophoneEnabled ? styles.buttonActive : styles.buttonInactive,
        ]}
        onPress={onToggleMicrophone}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>
          {isMicrophoneEnabled ? '🎤' : '🔇'}
        </Text>
        <Text
          style={[
            styles.buttonLabel,
            { color: isMicrophoneEnabled ? '#FFFFFF' : '#FF6B6B' },
          ]}
        >
          {isMicrophoneEnabled ? 'Mic On' : 'Muted'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderTopColor: '#2A2A4A',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    minWidth: 90,
  },
  buttonActive: {
    backgroundColor: '#2A2A4A',
  },
  buttonInactive: {
    backgroundColor: '#3A1A1A',
  },
  leaveButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 24,
  },
  buttonIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  buttonLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
