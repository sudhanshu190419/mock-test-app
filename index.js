/**
 * @format
 */
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import { AppRegistry, Platform } from 'react-native';

/**
 * LiveKit WebRTC globals.
 *
 * Must be called before any LiveKit component is imported or any
 * Room is created. Registers the required WebRTC polyfills for
 * React Native, including DOMException which livekit-client
 * depends on.
 *
 * @see https://docs.livekit.io/transport/sdk-platforms/react-native/
 */
import { registerGlobals } from '@livekit/react-native';
registerGlobals({ autoConfigureAudioSession: false });

import App from './App';
import { name as appName } from './app.json';

/**
 * Android Audio Diagnostics — app launch.
 *
 * Logs device info, AudioManager state, and microphone capabilities
 * as soon as the JS bundle loads. This provides a baseline before
 * any LiveKit connection is established.
 *
 * This block does NOT change any app behaviour.
 */
if (Platform.OS === 'android') {
  try {
    const { logDeviceInfo } = require('./src/features/livekit/diagnostics');
    logDeviceInfo().catch(() => {});
  } catch (e) {
    console.log('[AUDIO_DIAG] [Init] Diagnostics unavailable at launch:', String(e));
  }
}

AppRegistry.registerComponent(appName, () => App);
