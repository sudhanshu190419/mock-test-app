/**
 * LiveRoomScreen
 *
 * Second screen of the LiveKit POC.
 *
 * Displays:
 * - Local video feed (front camera)
 * - Remote video feeds (one tile per participant)
 * - Control bar (camera toggle, mic toggle, leave room)
 *
 * On leave, disconnects from the room and navigates back to JoinRoom.
 *
 * @module features/livekit/screens/LiveRoomScreen
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useLiveKit } from '../hooks/useLiveKit';
import LiveKitVideoView from '../components/VideoView';
import ControlBar from '../components/ControlBar';
import {
  logLiveKitState,
  logFullDiagnostics,
  logAudioRecordConfig,
  logAudioFocusState,
  startRouteMonitoring,
  stopRouteMonitoring,
  startCapturingAudioDiagnostics,
  stopCapturingAudioDiagnostics,
} from '../diagnostics';
import type { LiveKitStackParamList } from '../../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════════════
//  Navigation Types
// ═══════════════════════════════════════════════════════════════════════════

type LiveRoomRouteProp = RouteProp<LiveKitStackParamList, 'LiveRoom'>;

// ═══════════════════════════════════════════════════════════════════════════
//  Screen
// ═══════════════════════════════════════════════════════════════════════════

export default function LiveRoomScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<LiveRoomRouteProp>();
  const { url, token, roomName, participantName, role } = route.params;
  const { width: screenWidth } = useWindowDimensions();

  const {
    roomState,
    room,
    connect,
    disconnect,
    toggleCamera,
    toggleMicrophone,
  } = useLiveKit();

  const hasConnectedRef = useRef(false);

  // Ref wrapper for the room instance, updated when room changes.
  // Used by the periodic diagnostic monitor to access the current room.
  const roomRefForDiagnostics = useRef<typeof room>(null);
  roomRefForDiagnostics.current = room;

  // ── Connect on mount ───────────────────────────────────────────────────

  useEffect(() => {
    if (hasConnectedRef.current) return;
    hasConnectedRef.current = true;

    // Diagnostics: start route monitoring when entering the room
    startRouteMonitoring();

    // Diagnostics: log AudioRecord configuration at startup
    logAudioRecordConfig().catch(() => {});

    // Diagnostics: note on audio focus limitations
    logAudioFocusState();

    let isMounted = true;

    async function joinRoom() {
      try {
        console.log('[LiveRoom] Connecting to room:', roomName);
        await connect(url, token);

        // Diagnostics: after successful connection
        if (room) {
          logFullDiagnostics('AFTER room connect (LiveRoomScreen)', room).catch(
            () => {},
          );
        }

        // Diagnostics: start 1-second periodic audio capture monitor
        // This logs audio levels, mode transitions, LiveKit callbacks,
        // and outbound RTC stats at regular intervals.
        startCapturingAudioDiagnostics(roomRefForDiagnostics);

        console.log('[LiveRoom] Connected as:', participantName, '(' + role + ')');
      } catch (error) {
        if (!isMounted) return;
        const message =
          error instanceof Error ? error.message : 'Connection failed.';
        console.error('[LiveRoom] Connection error:', message);
        Alert.alert(
          'Connection Failed',
          message + '\n\nPlease check your LiveKit server URL and token.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }],
        );
      }
    }

    joinRoom();

    return () => {
      isMounted = false;
      // Diagnostics: stop periodic audio capture monitor
      stopCapturingAudioDiagnostics();
      // Diagnostics: stop route monitoring when leaving room
      stopRouteMonitoring();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle disconnect and navigate back ────────────────────────────────

  const handleLeave = useCallback(() => {
    console.log('[LiveRoom] Leaving room...');

    // Diagnostics: log state before disconnect
    if (room) {
      logFullDiagnostics('BEFORE disconnect', room).catch(() => {});
    }

    // Diagnostics: stop periodic audio capture monitor
    stopCapturingAudioDiagnostics();

    disconnect();
    stopRouteMonitoring();

    setTimeout(() => {
      navigation.goBack();
    }, 100);
  }, [disconnect, navigation, room]);

  // ── Handle back navigation (Android hardware back button) ──────────────

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      console.log('[LiveRoom] Navigation away, disconnecting...');

      // Diagnostics: log final state before leaving
      if (room) {
        logLiveKitState('BEFORE navigation away (on beforeRemove)', room);
      }

      // Diagnostics: stop periodic audio capture monitor
      stopCapturingAudioDiagnostics();

      disconnect();
      stopRouteMonitoring();
    });
    return unsubscribe;
  }, [navigation, disconnect, room]);

  // ── Derive display states ─────────────────────────────────────────────

  const isConnecting =
    roomState.connectionState === 'connecting' ||
    roomState.connectionState === 'reconnecting';
  const isConnected = roomState.connectionState === 'connected';
  const isDisconnected = roomState.connectionState === 'disconnected';
  const hasError =
    roomState.error !== null &&
    roomState.connectionState !== 'connecting' &&
    roomState.connectionState !== 'reconnecting';

  // ── Error State ──────────────────────────────────────────────────────

  if (hasError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>{roomState.error}</Text>
          <ControlBar
            isCameraEnabled={false}
            isMicrophoneEnabled={false}
            onToggleCamera={() => {}}
            onToggleMicrophone={() => {}}
            onLeave={handleLeave}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Connecting / Loading State ────────────────────────────────────────

  if (isConnecting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>
            {roomState.connectionState === 'reconnecting'
              ? 'Reconnecting...'
              : 'Connecting to room...'}
          </Text>
          <Text style={styles.roomInfoText}>{roomName}</Text>
          <ControlBar
            isCameraEnabled={false}
            isMicrophoneEnabled={false}
            onToggleCamera={() => {}}
            onToggleMicrophone={() => {}}
            onLeave={handleLeave}
            disabled
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Connected / Disconnected State ────────────────────────────────────

  const remoteParticipants = roomState.participants.filter((p) => !p.isLocal);
  const localParticipant = roomState.participants.find((p) => p.isLocal);

  const participantCount = roomState.participants.length;
  const tileSize =
    participantCount <= 2
      ? { width: screenWidth - 32, height: 240 }
      : { width: (screenWidth - 40) / 2, height: 200 };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Room Info Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerRoom}>📡 {roomName}</Text>
          <View style={styles.participantCount}>
            <Text style={styles.participantCountText}>
              {roomState.participants.length} participant
              {roomState.participants.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Video Grid */}
      <ScrollView
        style={styles.videoScroll}
        contentContainerStyle={styles.videoGrid}
      >
        {/* Reconnecting Banner */}
        {roomState.connectionState === 'reconnecting' && (
          <View style={styles.connectingBanner}>
            <ActivityIndicator size="small" color="#FFC107" />
            <Text style={styles.connectingBannerText}>
              Reconnecting...
            </Text>
          </View>
        )}

        {/* Local Video */}
        {localParticipant && room && (
          <LiveKitVideoView
            key={localParticipant.sid}
            room={room}
            participantIdentity={localParticipant.identity}
            isLocal
            style={[styles.videoTile, tileSize]}
          />
        )}

        {/* Remote Videos or Waiting Message */}
        {remoteParticipants.length === 0 && isConnected ? (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              Waiting for others to join...
            </Text>
            <Text style={styles.waitingSubtext}>
              Share the room name "{roomName}" with another device to test.
            </Text>
          </View>
        ) : (
          remoteParticipants.map((participant) =>
            room ? (
              <LiveKitVideoView
                key={participant.sid}
                room={room}
                participantIdentity={participant.identity}
                isLocal={false}
                style={[styles.videoTile, tileSize]}
              />
            ) : null,
          )
        )}

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🔍 Connection Info</Text>
          <Text style={styles.debugText}>
            Status: {roomState.connectionState}
          </Text>
          <Text style={styles.debugText}>
            Participants: {roomState.participants.length}
          </Text>
          <Text style={styles.debugText}>
            Role: {role}
          </Text>
          <Text style={styles.debugText}>
            Camera: {roomState.isCameraEnabled ? 'On' : 'Off'}
          </Text>
          <Text style={styles.debugText}>
            Mic: {roomState.isMicrophoneEnabled ? 'On' : 'Muted'}
          </Text>
        </View>
      </ScrollView>

      {/* Control Bar */}
      <ControlBar
        isCameraEnabled={roomState.isCameraEnabled}
        isMicrophoneEnabled={roomState.isMicrophoneEnabled}
        onToggleCamera={toggleCamera}
        onToggleMicrophone={toggleMicrophone}
        onLeave={handleLeave}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A4A',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRoom: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  participantCount: {
    backgroundColor: '#2A2A4A',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  participantCountText: {
    fontSize: 12,
    color: '#8888AA',
    fontWeight: '600',
  },
  videoScroll: {
    flex: 1,
  },
  videoGrid: {
    padding: 16,
    gap: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoTile: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  connectingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2A2A1A',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  connectingBannerText: {
    fontSize: 13,
    color: '#FFC107',
    fontWeight: '600',
  },
  waitingContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 24,
  },
  waitingText: {
    fontSize: 16,
    color: '#8888AA',
    fontWeight: '600',
    marginBottom: 8,
  },
  waitingSubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  debugContainer: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  debugTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C63FF',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#8888AA',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 80,
  },
  loadingText: {
    fontSize: 16,
    color: '#8888AA',
    fontWeight: '600',
  },
  roomInfoText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorMessage: {
    fontSize: 14,
    color: '#8888AA',
    textAlign: 'center',
    marginBottom: 32,
  },
});
