/**
 * StudentLiveClassRoomScreen
 *
 * Premium, light-theme live class room for NEET/JEE students.
 *
 * Designed as a distraction-free, immersive lecture experience where
 * the teacher's video is the primary focus — no participant grid,
 * no student camera/mic, no video-conferencing-style controls.
 *
 * ─── Layout ──────────────────────────────────────────────────────
 *
 *   ┌──────────────────────────────────────────┐
 *   │  ← Back  🔴 LIVE  Class Title     ⏱ 5:12 │  ← Compact header
 *   ├──────────────────────────────────────────┤
 *   │                                          │
 *   │          Teacher Video                    │  ← 75-80% of screen
 *   │          (LiveKit)                        │
 *   │    ┌─────────────────────────────┐        │
 *   │    │ Dr. Sudhanshu • Teaching    │        │  ← Floating badge
 *   │    └─────────────────────────────┘        │
 *   │                                          │
 *   ├──────────────────────────────────────────┤
 *   │  ┌─ Class Info ────────────────────┐     │  ← Collapsible card
 *   │  │ Teacher: Dr. Sudhanshu Sharma   │     │
 *   │  │ Batch: Lakshya NEET 2026        │     │
 *   │  │ Topic: Chemical Bonding         │     │
 *   │  │ Started: 10:30 AM • Duration: 45m│    │
 *   │  └──────────────────────────────────┘     │
 *   │                                          │
 *   │  ┌──────────── Glassmorphism ─────────┐  │  ← Floating control bar
 *   │  │  ✋ Hand  💬 Chat   ⛶ Full  🚪 Leave │  │
 *   │  └────────────────────────────────────┘  │
 *   └──────────────────────────────────────────┘
 *
 * ─── States ─────────────────────────────────────────────────────
 *
 *   • Connecting    — "Connecting to Live Class..."
 *   • Reconnecting  — "Reconnecting..."
 *   • Waiting       — "Teacher has not joined yet"
 *   • Connected     — Teacher video + controls
 *   • Ended         — "Live Class Ended"
 *
 * @module screens/liveClasses/StudentLiveClassRoomScreen
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useLiveKit } from '../../features/livekit/hooks/useLiveKit';
import { getLiveKitToken } from '../../features/livekit/services/tokenService';
import LiveKitVideoView from '../../features/livekit/components/VideoView';
import Icon from '../../components/home/Icons';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════════════
//  Design Tokens — Green Premium Light Theme
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  // Brand
  primary: '#166534',
  primaryLight: '#DCFCE7',
  primarySoft: 'rgba(22, 101, 52, 0.08)',

  // Surfaces
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Status
  liveRed: '#DC2626',
  liveRedSoft: 'rgba(220, 38, 38, 0.12)',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',

  // Glass
  glassBg: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  glassDarkBg: 'rgba(15, 23, 42, 0.75)',
  glassDarkBorder: 'rgba(255, 255, 255, 0.1)',

  // Shadows
  shadowSmall: 'rgba(15, 23, 42, 0.06)',
  shadowMedium: 'rgba(15, 23, 42, 0.1)',
} as const;

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
  /** Batch name for display. */
  batchName: string;
  /** Teacher display name. */
  teacherName: string;
  /** Student display name for the LiveKit participant. */
  studentName: string;
  /** Current topic being taught (optional). */
  currentTopic?: string;
  /** Scheduled start time ISO string (optional). */
  scheduledAt?: string;
  /** Duration in minutes (optional). */
  durationMin?: number;
}

type ScreenRouteProp = RouteProp<AppStackParamList, 'StudentLiveClassRoom'>;
type ScreenNavProp = NativeStackNavigationProp<AppStackParamList>;

// ═══════════════════════════════════════════════════════════════════════════
//  Network Quality Indicator
// ═══════════════════════════════════════════════════════════════════════════

type NetworkQuality = 'excellent' | 'good' | 'weak';

function NetworkBadge({ quality }: { quality: NetworkQuality }): React.JSX.Element {
  const colorMap: Record<NetworkQuality, string> = {
    excellent: C.success,
    good: '#16A34A',
    weak: C.warning,
  };
  const labelMap: Record<NetworkQuality, string> = {
    excellent: 'Excellent',
    good: 'Good',
    weak: 'Weak',
  };
  return (
    <View style={[styles.networkBadge, { backgroundColor: quality === 'weak' ? '#FEF7E0' : '#E8F5E9' }]}>
      <Icon
        name="wifi"
        color={colorMap[quality]}
        width={12}
        height={12}
      />
      <Text style={[styles.networkText, { color: colorMap[quality] }]}>
        {labelMap[quality]}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Session Timer
// ═══════════════════════════════════════════════════════════════════════════

function useSessionTimer(isRunning: boolean): string {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      setElapsed(0);
      startRef.current = null;
      return;
    }

    startRef.current = Date.now();
    const interval = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Pulsing Dot Animation
// ═══════════════════════════════════════════════════════════════════════════

function LiveDot(): React.JSX.Element {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.liveDot,
        { opacity: pulseAnim },
      ]}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Class Info Card (Collapsible)
// ═══════════════════════════════════════════════════════════════════════════

interface ClassInfoCardProps {
  teacherName: string;
  batchName: string;
  currentTopic?: string;
  startedAt?: string;
  durationMin?: number;
}

function ClassInfoCard({
  teacherName,
  batchName,
  currentTopic,
  startedAt,
  durationMin,
}: ClassInfoCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.classInfoCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Collapse class info' : 'Expand class info'}
    >
      <View style={styles.classInfoHeader}>
        <View style={styles.classInfoHeaderLeft}>
          <Icon name="info" color={C.primary} width={16} height={16} />
          <Text style={styles.classInfoTitle}>Class Information</Text>
        </View>
        <View style={{
          transform: expanded ? [{ rotate: '180deg' }] : [],
        }}>
          <Icon
            name="chevron-down"
            color={C.textTertiary}
            width={18}
            height={18}
          />
        </View>
      </View>

      {expanded && (
        <View style={styles.classInfoBody}>
          <View style={styles.classInfoRow}>
            <Text style={styles.classInfoLabel}>Teacher</Text>
            <Text style={styles.classInfoValue}>{teacherName}</Text>
          </View>
          <View style={styles.classInfoDivider} />
          <View style={styles.classInfoRow}>
            <Text style={styles.classInfoLabel}>Batch</Text>
            <Text style={styles.classInfoValue}>{batchName}</Text>
          </View>
          {currentTopic && (
            <>
              <View style={styles.classInfoDivider} />
              <View style={styles.classInfoRow}>
                <Text style={styles.classInfoLabel}>Topic</Text>
                <Text style={styles.classInfoValue}>{currentTopic}</Text>
              </View>
            </>
          )}
          {startedAt && (
            <>
              <View style={styles.classInfoDivider} />
              <View style={styles.classInfoRow}>
                <Text style={styles.classInfoLabel}>Started</Text>
                <Text style={styles.classInfoValue}>{startedAt}</Text>
              </View>
            </>
          )}
          {durationMin && (
            <>
              <View style={styles.classInfoDivider} />
              <View style={styles.classInfoRow}>
                <Text style={styles.classInfoLabel}>Duration</Text>
                <Text style={styles.classInfoValue}>{durationMin} minutes</Text>
              </View>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Glassmorphism Control Bar
// ═══════════════════════════════════════════════════════════════════════════

interface ControlBarProps {
  onRaiseHand: () => void;
  onChat: () => void;
  onFullScreen: () => void;
  onLeave: () => void;
  unreadChatCount: number;
  isHandRaised: boolean;
}

function FloatingControlBar({
  onRaiseHand,
  onChat,
  onFullScreen,
  onLeave,
  unreadChatCount,
  isHandRaised,
}: ControlBarProps): React.JSX.Element {
  return (
    <View style={styles.controlBarOuter}>
      <View style={styles.controlBar}>
        {/* Raise Hand */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onRaiseHand}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={isHandRaised ? 'Lower hand' : 'Raise hand'}
        >
          <View style={[
            styles.controlIconWrap,
            isHandRaised && styles.controlIconWrapActive,
          ]}>
            <Icon
              name="hand"
              color={isHandRaised ? C.textInverse : C.textSecondary}
              width={22}
              height={22}
            />
          </View>
          <Text style={[
            styles.controlLabel,
            isHandRaised && styles.controlLabelActive,
          ]}>
            {isHandRaised ? 'Hand Up' : 'Raise Hand'}
          </Text>
        </TouchableOpacity>

        {/* Chat */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onChat}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Open chat"
        >
          <View style={styles.controlIconWrap}>
            <Icon
              name="message-square"
              color={C.textSecondary}
              width={22}
              height={22}
            />
            {unreadChatCount > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.controlLabel}>Chat</Text>
        </TouchableOpacity>

        {/* Full Screen */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onFullScreen}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Toggle full screen"
        >
          <View style={styles.controlIconWrap}>
            <Icon
              name="maximize"
              color={C.textSecondary}
              width={20}
              height={20}
            />
          </View>
          <Text style={styles.controlLabel}>Full Screen</Text>
        </TouchableOpacity>

        {/* Leave */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onLeave}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Leave class"
        >
          <View style={[styles.controlIconWrap, styles.leaveIconWrap]}>
            <Icon
              name="log-out"
              color={C.error}
              width={20}
              height={20}
            />
          </View>
          <Text style={[styles.controlLabel, { color: C.error }]}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Screen Component
// ═══════════════════════════════════════════════════════════════════════════

export default function StudentLiveClassRoomScreen(): React.JSX.Element {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const {
    classId,
    roomName,
    className,
    teacherName,
    studentName,
    batchName = '',
    currentTopic,
    scheduledAt,
    durationMin,
  } = route.params;

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // ── LiveKit ────────────────────────────────────────────────────────────

  const {
    roomState,
    room,
    connect,
    disconnect,
  } = useLiveKit();

  const hasConnectedRef = useRef(false);
  const hasEverConnectedRef = useRef(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  // ── UI State ───────────────────────────────────────────────────────────

  const [isHandRaised, setIsHandRaised] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('good');

  // ── Session Timer ──────────────────────────────────────────────────────

  const isTimerRunning =
    roomState.connectionState === 'connected' && !isEnded;
  const sessionTime = useSessionTimer(isTimerRunning);

  // ── Format scheduled time ─────────────────────────────────────────────

  const formattedStartTime = useMemo(() => {
    if (!scheduledAt) return undefined;
    try {
      const d = new Date(scheduledAt);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return undefined;
    }
  }, [scheduledAt]);

  // ── Connect to LiveKit room on mount ───────────────────────────────────

  useEffect(() => {
    if (hasConnectedRef.current) return;
    hasConnectedRef.current = true;

    let isMounted = true;

    async function joinRoom() {
      try {
        setConnectionAttempted(true);

        const { token, url } = await getLiveKitToken({
          roomName,
          participantName: studentName,
          role: 'student',
        });

        if (!isMounted) return;

        await connect(url, token, { autoPublish: false });
        hasEverConnectedRef.current = true;
        console.log('[StudentLiveClass] Connected to room:', roomName, 'as', studentName);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Failed to join class.';
        console.error('[StudentLiveClass] Connection failed:', message);
        setIsEnded(true);
      }
    }

    joinRoom();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle disconnect ─────────────────────────────────────────────────

  useEffect(() => {
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

  // ── Simulate network quality based on connection state ────────────────

  useEffect(() => {
    switch (roomState.connectionState) {
      case 'connected':
        setNetworkQuality('excellent');
        break;
      case 'reconnecting':
        setNetworkQuality('weak');
        break;
      default:
        setNetworkQuality('good');
    }
  }, [roomState.connectionState]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleRaiseHand = useCallback(() => {
    setIsHandRaised((prev) => !prev);
    // TODO: Send hand-raise signal via LiveKit data channel
  }, []);

  const handleChat = useCallback(() => {
    navigation.navigate('StudentChat', {
      classId,
      className,
      teacherName,
      batchName: batchName ?? '',
    });
    setUnreadChatCount(0);
  }, [navigation, classId, className, teacherName, batchName]);

  const handleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
    // TODO: Implement proper full-screen using react-native-orientation-locker
  }, []);

  const handleLeave = useCallback(() => {
    disconnect();
    navigation.goBack();
  }, [disconnect, navigation]);

  const handleBackToClasses = useCallback(() => {
    disconnect();
    navigation.goBack();
  }, [disconnect, navigation]);

  // ── Derive display states ─────────────────────────────────────────────

  const isConnecting =
    roomState.connectionState === 'connecting' ||
    roomState.connectionState === 'reconnecting';
  const isConnected = roomState.connectionState === 'connected';

  // Find the teacher (first remote participant) for video rendering
  const remoteParticipants = roomState.participants.filter((p) => !p.isLocal);
  const teacherParticipant = remoteParticipants[0] ?? null;
  const teacherHasJoined = remoteParticipants.length > 0;

  // ── Video dimensions ──────────────────────────────────────────────────

  const videoHeight = isFullScreen
    ? screenHeight
    : Math.min(screenHeight * 0.78, screenHeight - 280);

  // ═══════════════════════════════════════════════════════════════════════
  //  Session Ended State
  // ═══════════════════════════════════════════════════════════════════════

  if (isEnded) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={styles.endedContainer}>
          {/* Illustration */}
          <View style={styles.endedIllustration}>
            <View style={styles.endedIconCircle}>
              <Icon name="video" color={C.textTertiary} width={40} height={40} />
            </View>
          </View>

          <Text style={styles.endedTitle}>Live Class Ended</Text>
          <Text style={styles.endedSubtitle}>
            "{className}" has concluded.
          </Text>

          {teacherName && (
            <View style={styles.endedTeacherRow}>
              <View style={styles.endedTeacherAvatar}>
                <Text style={styles.endedTeacherAvatarText}>
                  {teacherName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.endedTeacherName}>
                Hosted by {teacherName}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleBackToClasses}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Return to live classes"
          >
            <Icon name="arrow-left" color={C.textInverse} width={18} height={18} />
            <Text style={styles.primaryButtonText}>Back to Live Classes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Connecting / Reconnecting State
  // ═══════════════════════════════════════════════════════════════════════

  if (isConnecting || !connectionAttempted) {
    const isReconnecting = roomState.connectionState === 'reconnecting';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={styles.connectingContainer}>
          {/* Animated pulse circle */}
          <View style={styles.connectingPulseRing}>
            <View style={styles.connectingPulseInner}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          </View>

          <Text style={styles.connectingTitle}>
            {isReconnecting ? 'Reconnecting...' : 'Connecting to Live Class'}
          </Text>
          <Text style={styles.connectingSubtitle}>
            {isReconnecting
              ? 'Please wait while we restore your connection.'
              : 'Setting up your class experience.'}
          </Text>

          <View style={styles.connectingMeta}>
            <Icon name="video" color={C.textTertiary} width={14} height={14} />
            <Text style={styles.connectingMetaText}>{className}</Text>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleLeave}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelButtonText}>
              {isReconnecting ? 'Leave Class' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Connected State — Waiting for Teacher
  // ═══════════════════════════════════════════════════════════════════════

  if (isConnected && !teacherHasJoined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleLeave}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon name="arrow-left" color={C.textPrimary} width={22} height={22} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={styles.liveBadgePaused}>
                <LiveDot />
                <Text style={styles.liveBadgeTextPaused}>LIVE</Text>
              </View>
            </View>

            <NetworkBadge quality={networkQuality} />
          </View>
        </View>

        {/* Waiting Content */}
        <View style={styles.waitingContainer}>
          <View style={styles.waitingIllustration}>
            <View style={styles.waitingIconCircle}>
              <Icon name="user" color={C.primary} width={36} height={36} />
            </View>
          </View>

          <Text style={styles.waitingTitle}>Waiting for the Teacher</Text>
          <Text style={styles.waitingSubtitle}>
            {teacherName} hasn't joined yet. The class will begin shortly.
          </Text>

          <View style={styles.waitingClassInfo}>
            <Text style={styles.waitingClassName}>{className}</Text>
            <Text style={styles.waitingBatchName}>{batchName}</Text>
          </View>

          {formattedStartTime && (
            <View style={styles.waitingTimeRow}>
              <Icon name="clock" color={C.textTertiary} width={14} height={14} />
              <Text style={styles.waitingTimeText}>
                Scheduled at {formattedStartTime}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Connected State — Teacher is Live
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <View style={[styles.fullScreenContainer, isFullScreen && { backgroundColor: '#000' }]}>
      <StatusBar
        barStyle={isFullScreen ? 'light-content' : 'dark-content'}
        backgroundColor={isFullScreen ? '#000' : C.background}
      />

      {/* ── Compact Header ───────────────────────────────────────── */}
      {!isFullScreen && (
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleLeave}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Leave class"
              >
                <Icon name="arrow-left" color={C.textPrimary} width={22} height={22} />
              </TouchableOpacity>

              {/* Center: LIVE badge + Title */}
              <View style={styles.headerCenter}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.liveBadge}>
                    <LiveDot />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {className}
                  </Text>
                </View>
                <Text style={styles.headerBatchName} numberOfLines={1}>
                  {batchName}
                </Text>
              </View>

              {/* Right: Timer + Network */}
              <View style={styles.headerRight}>
                <View style={styles.timerBadge}>
                  <Icon name="clock" color={C.textTertiary} width={12} height={12} />
                  <Text style={styles.timerText}>{sessionTime}</Text>
                </View>
                <NetworkBadge quality={networkQuality} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* ── Full screen header overlay when in full-screen mode ── */}
      {isFullScreen && (
        <SafeAreaView edges={['top']} style={styles.fullScreenHeaderOverlay}>
          <TouchableOpacity
            style={styles.fullScreenBackBtn}
            onPress={handleFullScreen}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Exit full screen"
          >
            <Icon name="x" color={C.textInverse} width={20} height={20} />
          </TouchableOpacity>
          <View style={styles.fullScreenLiveBadge}>
            <LiveDot />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.fullScreenTimer} numberOfLines={1}>
            {sessionTime}
          </Text>
        </SafeAreaView>
      )}

      {/* ── Scrollable Content ──────────────────────────────────── */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[
          styles.scrollInner,
          isFullScreen && { paddingTop: 0 },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Teacher Video ────────────────────────────────────────── */}
        <View style={[
          styles.videoWrapper,
          isFullScreen && styles.videoWrapperFullScreen,
        ]}>
          {/* Reconnecting Banner Overlay */}
          {roomState.connectionState === 'reconnecting' && (
            <View style={styles.reconnectingBanner}>
              <ActivityIndicator size="small" color={C.textInverse} />
              <Text style={styles.reconnectingText}>Reconnecting...</Text>
            </View>
          )}

          {/* Teacher Video */}
          {room && teacherParticipant ? (
            <LiveKitVideoView
              key={teacherParticipant.sid}
              room={room}
              participantIdentity={teacherParticipant.identity}
              isLocal={false}
              style={[
                styles.teacherVideo,
                { height: isFullScreen ? screenHeight - (Platform.OS === 'ios' ? 90 : 60) : videoHeight },
              ]}
            />
          ) : (
            /* Fallback when teacher video not yet available */
            <View style={[
              styles.teacherVideoFallback,
              { height: videoHeight },
            ]}>
              <View style={styles.fallbackAvatarCircle}>
                <Text style={styles.fallbackAvatarText}>
                  {teacherName?.charAt(0)?.toUpperCase() ?? 'T'}
                </Text>
              </View>
              <Text style={styles.fallbackTeacherName}>{teacherName}</Text>
              <Text style={styles.fallbackStatus}>Joining...</Text>
            </View>
          )}

          {/* ── Floating Teacher Badge ──────────────────────────────── */}
          {!isFullScreen && teacherName && (
            <View style={styles.teacherBadge}>
              <View style={styles.teacherBadgeAvatar}>
                <Text style={styles.teacherBadgeAvatarText}>
                  {teacherName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.teacherBadgeInfo}>
                <Text style={styles.teacherBadgeName} numberOfLines={1}>
                  {teacherName}
                </Text>
                <View style={styles.teacherBadgeStatusRow}>
                  <View style={styles.teacherBadgeLiveDot} />
                  <Text style={styles.teacherBadgeStatus}>Teaching Live</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Class Info Card ──────────────────────────────────────── */}
        {!isFullScreen && (
          <View style={styles.infoSection}>
            <ClassInfoCard
              teacherName={teacherName}
              batchName={batchName}
              currentTopic={currentTopic}
              startedAt={formattedStartTime}
              durationMin={durationMin}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Floating Control Bar ───────────────────────────────────── */}
      {!isFullScreen && (
        <SafeAreaView edges={['bottom']} style={styles.controlBarSafeArea}>
          <FloatingControlBar
            onRaiseHand={handleRaiseHand}
            onChat={handleChat}
            onFullScreen={handleFullScreen}
            onLeave={handleLeave}
            unreadChatCount={unreadChatCount}
            isHandRaised={isHandRaised}
          />
        </SafeAreaView>
      )}

      {/* ── Full Screen bottom controls ────────────────────────────── */}
      {isFullScreen && (
        <SafeAreaView edges={['bottom']} style={styles.fullScreenBottomOverlay}>
          <TouchableOpacity
            style={styles.fullScreenControlBtn}
            onPress={handleRaiseHand}
            activeOpacity={0.7}
          >
            <Icon
              name="hand"
              color={C.textInverse}
              width={22}
              height={22}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullScreenControlBtn}
            onPress={handleChat}
            activeOpacity={0.7}
          >
            <Icon
              name="message-square"
              color={C.textInverse}
              width={22}
              height={22}
            />
            {unreadChatCount > 0 && (
              <View style={styles.chatBadgeFullScreen}>
                <Text style={styles.chatBadgeText}>{unreadChatCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullScreenControlBtn}
            onPress={handleFullScreen}
            activeOpacity={0.7}
          >
            <Icon
              name="maximize"
              color={C.textInverse}
              width={20}
              height={20}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fullScreenControlBtn, styles.fullScreenLeaveBtn]}
            onPress={handleLeave}
            activeOpacity={0.7}
          >
            <Icon
              name="log-out"
              color={C.error}
              width={20}
              height={20}
            />
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // ── Root ────────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: C.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  headerSafeArea: {
    backgroundColor: C.background,
  },
  header: {
    backgroundColor: C.background,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[8],
  },
  headerCenter: {
    flex: 1,
    marginRight: spacing[8],
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  headerBatchName: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textTertiary,
    marginTop: 1,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },

  // ── Live Badge ──────────────────────────────────────────────────────────
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: C.liveRedSoft,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.liveRed,
    letterSpacing: 0.8,
  },
  liveBadgePaused: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  liveBadgeTextPaused: {
    fontSize: 9,
    fontWeight: '800',
    color: C.warning,
    letterSpacing: 0.8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.liveRed,
  },

  // ── Timer ───────────────────────────────────────────────────────────────
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: C.surface,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSecondary,
    fontVariant: ['tabular-nums'],
  },

  // ── Network Badge ───────────────────────────────────────────────────────
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  networkText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingTop: 0,
    paddingBottom: 100, // Account for floating control bar height
  },

  // ── Video Wrapper ───────────────────────────────────────────────────────
  videoWrapper: {
    position: 'relative',
    marginHorizontal: spacing[12],
    marginTop: spacing[8],
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: C.shadowMedium,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  videoWrapperFullScreen: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    flex: 1,
  },
  teacherVideo: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  teacherVideoFallback: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fallbackAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  fallbackAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: C.primary,
  },
  fallbackTeacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textInverse,
    marginBottom: spacing[4],
  },
  fallbackStatus: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // ── Teacher Badge (floating over video) ────────────────────────────────
  teacherBadge: {
    position: 'absolute',
    top: spacing[12],
    left: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: C.glassDarkBg,
    borderRadius: radius.sm,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderWidth: 1,
    borderColor: C.glassDarkBorder,
  },
  teacherBadgeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherBadgeAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textInverse,
  },
  teacherBadgeInfo: {
    gap: 1,
  },
  teacherBadgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textInverse,
    letterSpacing: -0.2,
  },
  teacherBadgeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teacherBadgeLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.success,
  },
  teacherBadgeStatus: {
    fontSize: 9,
    fontWeight: '600',
    color: C.success,
    letterSpacing: 0.3,
  },

  // ── Reconnecting Banner ─────────────────────────────────────────────────
  reconnectingBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingVertical: spacing[8],
  },
  reconnectingText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textInverse,
  },

  // ── Info Section ────────────────────────────────────────────────────────
  infoSection: {
    paddingHorizontal: spacing[12],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },

  // ── Class Info Card ─────────────────────────────────────────────────────
  classInfoCard: {
    backgroundColor: C.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: C.borderLight,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: C.shadowSmall,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  classInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
  },
  classInfoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  classInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  classInfoBody: {
    paddingHorizontal: spacing[12],
    paddingBottom: spacing[12],
  },
  classInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  classInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textTertiary,
  },
  classInfoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  classInfoDivider: {
    height: 1,
    backgroundColor: C.borderLight,
  },

  // ── Control Bar ─────────────────────────────────────────────────────────
  controlBarSafeArea: {
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlBarOuter: {
    paddingHorizontal: spacing[12],
    paddingBottom: Platform.OS === 'ios' ? spacing[4] : spacing[8],
    paddingTop: spacing[4],
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: C.glassBg,
    borderRadius: radius.xl,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: C.shadowMedium,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  controlIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  controlIconWrapActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textSecondary,
    letterSpacing: 0.2,
  },
  controlLabelActive: {
    color: C.primary,
  },
  leaveIconWrap: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  // ── Chat Badge ──────────────────────────────────────────────────────────
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: C.background,
  },
  chatBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textInverse,
    textAlign: 'center',
  },

  // ── Full Screen Overlays ────────────────────────────────────────────────
  fullScreenHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  fullScreenBackBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.liveRedSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  fullScreenTimer: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textInverse,
    fontVariant: ['tabular-nums'],
  },
  fullScreenBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullScreenControlBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenLeaveBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  chatBadgeFullScreen: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  // ── Connecting State ────────────────────────────────────────────────────
  connectingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    backgroundColor: C.background,
  },
  connectingPulseRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[24],
  },
  connectingPulseInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: spacing[8],
  },
  connectingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[20],
  },
  connectingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: C.surface,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
    marginBottom: spacing[24],
  },
  connectingMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textTertiary,
  },
  cancelButton: {
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[32],
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surfaceElevated,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    textAlign: 'center',
  },

  // ── Waiting for Teacher State ──────────────────────────────────────────
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    backgroundColor: C.background,
  },
  waitingIllustration: {
    marginBottom: spacing[20],
  },
  waitingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: spacing[8],
  },
  waitingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[20],
  },
  waitingClassInfo: {
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  waitingClassName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: spacing[4],
  },
  waitingBatchName: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textTertiary,
  },
  waitingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: C.surface,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
  },
  waitingTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textTertiary,
  },

  // ── Session Ended State ─────────────────────────────────────────────────
  endedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    backgroundColor: C.background,
    gap: spacing[12],
  },
  endedIllustration: {
    marginBottom: spacing[8],
  },
  endedIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  endedSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  endedTeacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginTop: spacing[8],
    marginBottom: spacing[16],
  },
  endedTeacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedTeacherAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
  },
  endedTeacherName: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textTertiary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: C.primary,
    borderRadius: radius.md,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textInverse,
    letterSpacing: 0.2,
  },
});
