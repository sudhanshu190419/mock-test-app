/**
 * StudentLiveClassRoomScreen
 *
 * Full-screen LiveKit room for a student to join a live class.
 *
 * ## Flow
 *
 * ```
 * LiveClassesTabScreen (Join Class tap)
 *   ↓ classId, roomName, className, teacherName, studentName
 * StudentLiveClassRoomScreen
 *   ↓ useLiveKit().connect(url, token)
 *   ↓ LiveKit connected → show video grid + ControlBar
 *   ↓ Teacher ends class OR student taps Leave
 *   ↓ Disconnect → "Session Ended" → navigate back
 * ```
 *
 * ## Reuse
 *
 * - `useLiveKit` hook — manages Room, connect, disconnect, camera/mic toggles
 * - `LiveKitVideoView` — renders participant video with fallback avatar
 * - `ControlBar` — camera toggle, mic toggle, leave button
 * - `getLiveKitToken` — Supabase Edge Function for student-scoped JWT
 *
 * @module screens/liveClasses/StudentLiveClassRoomScreen
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useLiveKit } from '../../features/livekit/hooks/useLiveKit';
import { getLiveKitToken } from '../../features/livekit/services/tokenService';
import LiveKitVideoView from '../../features/livekit/components/VideoView';
import ControlBar from '../../features/livekit/components/ControlBar';
import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════════════

export interface StudentLiveClassRoomParams {
  /** UUID of the live_classes row. */
  classId: string;
  /** LiveKit room name (from live_classes.room_name). */
  roomName: string;
  /** Class title for display. */
  className: string;
  /** Teacher display name. */
  teacherName: string;
  /** Student display name for the LiveKit participant. */
  studentName: string;
}

type ScreenRouteProp = RouteProp<AppStackParamList, 'StudentLiveClassRoom'>;
type ScreenNavProp = NativeStackNavigationProp<AppStackParamList>;

// ═══════════════════════════════════════════════════════════════════════════
//  Screen
// ═══════════════════════════════════════════════════════════════════════════

export default function StudentLiveClassRoomScreen(): React.JSX.Element {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { classId, roomName, className, teacherName, studentName } =
    route.params;

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
  /** Tracks whether the LiveKit room has ever reached the 'connected' state.
   *  Used to distinguish the initial 'disconnected' state from a real
   *  disconnect (teacher ended the session). */
  const hasEverConnectedRef = useRef(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  // ── Connect to LiveKit room on mount ───────────────────────────────────

  useEffect(() => {
    if (hasConnectedRef.current) return;
    hasConnectedRef.current = true;

    let isMounted = true;

    async function joinRoom() {
      try {
        setConnectionAttempted(true);

        // Generate a student-scoped LiveKit token
        const { token, url } = await getLiveKitToken({
          roomName,
          participantName: studentName,
          role: 'student',
        });

        if (!isMounted) return;

        // Connect to the LiveKit room (viewer mode — no publish)
        await connect(url, token, { autoPublish: false });
        // Mark as ever-connected so the disconnect effect knows this was a
        // real transition, not the initial disconnected state.
        hasEverConnectedRef.current = true;
        console.log(
          '[StudentLiveClass] Connected to room:',
          roomName,
          'as',
          studentName,
        );
      } catch (error) {
        if (!isMounted) return;
        const message =
          error instanceof Error ? error.message : 'Failed to join class.';
        console.error('[StudentLiveClass] Connection failed:', message);
        // Session ended - teacher may have ended before we connected
        setIsEnded(true);
      }
    }

    joinRoom();

    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle disconnect (teacher ended or student left) ─────────────────

  useEffect(() => {
    // Only treat as "session ended" if the room was EVER connected and is
    // now disconnected. This prevents the initial 'disconnected' state from
    // triggering the ended screen before connect() has been called.
    if (
      hasEverConnectedRef.current &&
      (roomState.connectionState === 'disconnected' ||
        roomState.connectionState === 'error')
    ) {
      if (roomState.error) {
        console.log('[StudentLiveClass] Session ended:', roomState.error);
      }
      setIsEnded(true);
    }
  }, [roomState.connectionState, roomState.error]);
  // Note: hasEverConnectedRef is a ref, not state — it's intentionally
  // excluded from deps. connectionAttempted is no longer needed here since
  // hasEverConnectedRef only becomes true after a successful connection.

  // ── Handle Leave ──────────────────────────────────────────────────────

  const handleLeave = useCallback(() => {
    disconnect();
    // Navigate back to the live classes list
    navigation.goBack();
  }, [disconnect, navigation]);

  // ── Handle Back to Live Classes (after session ended) ─────────────────

  const handleBackToClasses = useCallback(() => {
    disconnect();
    navigation.goBack();
  }, [disconnect, navigation]);

  // ── Derive display states ─────────────────────────────────────────────

  const isConnecting =
    roomState.connectionState === 'connecting' ||
    roomState.connectionState === 'reconnecting';
  const isConnected = roomState.connectionState === 'connected';

  const remoteParticipants = roomState.participants.filter((p) => !p.isLocal);
  const localParticipant = roomState.participants.find((p) => p.isLocal);
  const participantCount = roomState.participants.length;
  const tileSize =
    participantCount <= 2
      ? { width: screenWidth - spacing[16] * 2, height: 240 }
      : {
          width: (screenWidth - spacing[16] * 2 - spacing[8]) / 2,
          height: 200,
        };

  // ── Session Ended State ───────────────────────────────────────────────

  if (isEnded) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.endedContainer}>
          <View style={styles.endedIconContainer}>
            <Icon name="video" color="#94A3B8" width={48} height={48} />
          </View>
          <Text style={styles.endedTitle}>Session Ended</Text>
          <Text style={styles.endedSubtitle}>
            The live class "{className}" has ended.
          </Text>

          {teacherName ? (
            <Text style={styles.endedTeacher}>
              Hosted by {teacherName}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToClasses}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Return to live classes"
          >
            <Icon
              name="arrow-left"
              color="#FFFFFF"
              width={16}
              height={16}
            />
            <Text style={styles.backButtonText}>Back to Live Classes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Connecting State ──────────────────────────────────────────────────

  if (isConnecting || !connectionAttempted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.connectingContainer}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveIndicatorText}>LIVE</Text>
          </View>

          <ActivityIndicator size="large" color={colors.secondary} />

          <Text style={styles.connectingTitle}>
            {roomState.connectionState === 'reconnecting'
              ? 'Reconnecting...'
              : 'Joining Class...'}
          </Text>

          <Text style={styles.connectingSubtitle}>{className}</Text>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleLeave}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Cancel joining"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Connected State ───────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveIndicatorText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {className}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.participantBadge}>
              {participantCount}
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
          <View style={styles.reconnectingBanner}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={styles.reconnectingText}>Reconnecting...</Text>
          </View>
        )}

        {/* Local Video (Student's own camera) */}
        {localParticipant && room && (
          <LiveKitVideoView
            key={localParticipant.sid}
            room={room}
            participantIdentity={localParticipant.identity}
            isLocal
            style={[styles.videoTile, tileSize]}
          />
        )}

        {/* Remote Videos (Teacher + other participants) */}
        {remoteParticipants.length === 0 && isConnected ? (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              Waiting for the class to begin...
            </Text>
            <Text style={styles.waitingSubtext}>
              Stay tuned — the teacher will start shortly.
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
    backgroundColor: '#0F172A',
  },

  // ── Connected Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: '#1E293B',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: spacing[12],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.subtitle,
    color: '#F8FAFC',
    fontSize: 15,
    textAlign: 'center',
  },
  participantBadge: {
    backgroundColor: '#334155',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  // ── Live Indicator ────────────────────────────────────────────────────
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: 'rgba(5, 196, 107, 0.15)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#05C46B',
  },
  liveIndicatorText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#05C46B',
    letterSpacing: 0.5,
  },

  // ── Video Grid ────────────────────────────────────────────────────────
  videoScroll: {
    flex: 1,
  },
  videoGrid: {
    padding: spacing[16],
    gap: spacing[8],
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoTile: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  reconnectingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    padding: spacing[12],
    width: '100%',
  },
  reconnectingText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
  },
  waitingContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing[24],
  },
  waitingText: {
    ...typography.body,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  waitingSubtext: {
    ...typography.bodySmall,
    color: '#64748B',
    textAlign: 'center',
  },

  // ── Connecting State ──────────────────────────────────────────────────
  connectingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[16],
    paddingHorizontal: spacing[32],
  },
  connectingTitle: {
    ...typography.title,
    color: '#F8FAFC',
    textAlign: 'center',
  },
  connectingSubtitle: {
    ...typography.body,
    color: '#94A3B8',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: spacing[16],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[32],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelButtonText: {
    ...typography.buttonSmall,
    color: '#94A3B8',
  },

  // ── Session Ended State ───────────────────────────────────────────────
  endedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    gap: spacing[12],
  },
  endedIconContainer: {
    opacity: 0.4,
    marginBottom: spacing[8],
  },
  endedTitle: {
    ...typography.heading2,
    color: '#F8FAFC',
    textAlign: 'center',
  },
  endedSubtitle: {
    ...typography.body,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  endedTeacher: {
    ...typography.bodySmall,
    color: '#64748B',
    textAlign: 'center',
    marginTop: spacing[4],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    marginTop: spacing[16],
  },
  backButtonText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
  },
});
