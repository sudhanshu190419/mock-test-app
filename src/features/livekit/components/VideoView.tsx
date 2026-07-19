/**
 * LiveKitVideoView
 *
 * Renders a participant's video stream, or a fallback avatar when video is off.
 *
 * Uses low-level livekit-client APIs directly to avoid depending on
 * @livekit/components-react context-based hooks (useParticipantTracks,
 * useIsSpeaking) which require a ParticipantContext set up by LiveKitRoom.
 *
 * The component resolves the participant from the Room directly, subscribes
 * to Participant events for speaking status and track publications, and
 * constructs a TrackReference object for the native VideoTrack component.
 *
 * @module features/livekit/components/VideoView
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VideoTrack } from '@livekit/react-native';
import {
  Track,
  ParticipantEvent,
  type Room,
  type Participant,
  type TrackPublication,
} from 'livekit-client';

// ═══════════════════════════════════════════════════════════════════════════
//  Props
// ═══════════════════════════════════════════════════════════════════════════

interface LiveKitVideoViewProps {
  /** The livekit-client Room instance. */
  room: Room;
  /** The participant's identity string. */
  participantIdentity: string;
  /** Whether this is the local participant. */
  isLocal: boolean;
  /** Style overrides for the container. */
  style?: object;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Renders a participant's video feed, or a fallback avatar.
 */
export default function LiveKitVideoView({
  room,
  participantIdentity,
  isLocal,
  style,
}: LiveKitVideoViewProps): React.JSX.Element {
  // ── Resolve participant from the Room ────────────────────────────────
  //
  // We look up the participant directly on the Room object rather than
  // relying on any context-driven hook.  The local participant is always
  // available via room.localParticipant; remote participants are keyed by
  // their identity string.
  //
  const participant = useMemo<Participant | undefined>(() => {
    if (isLocal) {
      return room.localParticipant;
    }
    return room.remoteParticipants.get(participantIdentity);
  }, [room, participantIdentity, isLocal]);

  // ── Speaking state (subscribed via ParticipantEvent) ─────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Camera track publication ─────────────────────────────────────────
  const [cameraPublication, setCameraPublication] = useState<
    TrackPublication | undefined
  >(undefined);

  // ── Subscribe to participant-level events ────────────────────────────
  //
  // We attach listeners directly to the Participant object (returned by
  // livekit-client) so we never need a React context at all.
  //
  useEffect(() => {
    if (!participant) return;

    const onIsSpeakingChanged = () => {
      setIsSpeaking(participant.isSpeaking);
    };

    const refreshCameraPublication = () => {
      setCameraPublication(
        participant.getTrackPublication(Track.Source.Camera),
      );
    };

    participant
      .on(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)
      .on(ParticipantEvent.TrackPublished, refreshCameraPublication)
      .on(ParticipantEvent.TrackUnpublished, refreshCameraPublication)
      .on(ParticipantEvent.TrackSubscribed, refreshCameraPublication)
      .on(ParticipantEvent.TrackUnsubscribed, refreshCameraPublication);

    // Set initial state
    setIsSpeaking(participant.isSpeaking);
    refreshCameraPublication();

    return () => {
      participant
        .off(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)
        .off(ParticipantEvent.TrackPublished, refreshCameraPublication)
        .off(ParticipantEvent.TrackUnpublished, refreshCameraPublication)
        .off(ParticipantEvent.TrackSubscribed, refreshCameraPublication)
        .off(ParticipantEvent.TrackUnsubscribed, refreshCameraPublication);
    };
  }, [participant]);

  // ── Build a TrackReference for the VideoTrack component ──────────────
  //
  // VideoTrack expects a TrackReference object { participant, publication, source }.
  // We construct it manually from the resolved participant and its camera
  // publication.  The shape matches the TrackReference type structurally,
  // so no import of the @livekit/components-react type is needed.
  //
  const hasTrack = cameraPublication?.track !== undefined;

  const trackRef = useMemo(() => {
    if (!participant || !cameraPublication || !hasTrack) return undefined;
    return {
      participant,
      publication: cameraPublication,
      source: Track.Source.Camera,
    };
  }, [participant, cameraPublication, hasTrack]);

  // ── Deterministic avatar colour from identity ─────────────────────────
  const avatarColor = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < participantIdentity.length; i++) {
      hash = participantIdentity.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 55%, 45%)`;
  }, [participantIdentity]);

  return (
    <View style={[styles.container, style]}>
      {trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          style={styles.video}
          mirror={isLocal}
          zOrder={isLocal ? 1 : 0}
        />
      ) : (
        // ── Fallback: Avatar placeholder ─────────────────────────
        <View style={[styles.fallback, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>
            {participantIdentity.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Participant info overlay */}
      <View style={styles.overlay}>
        <View style={styles.nameBadge}>
          <Text style={styles.nameText} numberOfLines={1}>
            {participantIdentity}
            {isLocal ? ' (You)' : ''}
          </Text>
        </View>
        {isSpeaking && <View style={styles.speakingIndicator} />}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  speakingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
});
