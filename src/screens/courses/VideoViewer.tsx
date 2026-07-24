/**
 * VideoViewer
 *
 * Dedicated video player that streams content directly from a signed URL.
 * No RNFS download — videos are streamed on-demand using react-native-video.
 *
 * Signed URLs are generated on mount with content-video expiry (60s).
 * If playback fails due to an expired URL, the user can retry to generate
 * a fresh signed URL.
 *
 * @module screens/courses/VideoViewer
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateSignedUrl } from '../../services/storage/storageService';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../../components/home/Icons';

// ─── Colour Palette ─────────────────────────────────────────────────────────

const COLORS = {
  screen: '#0F0F12',
  headerBg: '#1A1A20',
  border: '#2A2A35',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  accent: '#8B5CF6',
  accentLight: '#2D1B69',
  error: '#EF4444',
  errorLight: '#3B1010',
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;

// ─── Props ──────────────────────────────────────────────────────────────────

interface VideoViewerProps {
  storageBucket: string;
  storagePath: string;
  title: string;
  onBack: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════

export default function VideoViewer({
  storageBucket,
  storagePath,
  title,
  onBack,
}: VideoViewerProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  // ── State ───────────────────────────────────────────────────────────────
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const isMountedRef = useRef(true);

  // ── Generate Signed URL ──────────────────────────────────────────────────
  const loadSignedUrl = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setHasEnded(false);

    try {
      const result = await generateSignedUrl({
        bucket: storageBucket,
        storagePath,
        contentType: 'video',
      });

      if (!isMountedRef.current) return;

      if (!result.success || !result.data) {
        setErrorMessage(result.error || 'Failed to generate video access URL.');
        return;
      }

      setSignedUrl(result.data.signedUrl);
    } catch (err) {
      if (!isMountedRef.current) return;
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [storageBucket, storagePath]);

  useEffect(() => {
    loadSignedUrl();
  }, [loadSignedUrl]);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setSignedUrl(null);
    loadSignedUrl();
  }, [loadSignedUrl]);

  const handleVideoLoad = useCallback(() => {
    if (!isMountedRef.current) return;
    setIsLoading(false);
    setIsBuffering(false);
  }, []);

  const handleVideoBuffer = useCallback(({ isBuffering: buffering }: { isBuffering: boolean }) => {
    if (!isMountedRef.current) return;
    setIsBuffering(buffering);
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (!isMountedRef.current) return;
    setHasEnded(true);
  }, []);

  const handleVideoError = useCallback(() => {
    if (!isMountedRef.current) return;
    setIsLoading(false);
    setIsBuffering(false);
    setErrorMessage('Failed to play this video. Check your connection and try again.');
  }, []);

  // ── Render States ───────────────────────────────────────────────────────

  // Generating signed URL
  if (isLoading && !signedUrl) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Video'}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.centerStateText}>Preparing video…</Text>
        </View>
      </View>
    );
  }

  // Error state — show retry screen
  if (errorMessage) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Video'}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorEmoji}>🎥</Text>
          </View>
          <Text style={styles.errorTitle}>Could Not Load Video</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Playback ended overlay
  if (hasEnded && signedUrl) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Video'}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <View style={styles.endedIconContainer}>
            <Text style={styles.endedEmoji}>✅</Text>
          </View>
          <Text style={styles.endedTitle}>Playback Complete</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Replay</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Player ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header with semi-transparent background over video */}
      <View style={[styles.header, styles.headerOverVideo]}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonOverlay}>
          <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || 'Video'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Buffering overlay */}
      {isBuffering && (
        <View style={styles.bufferingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.bufferingText}>Buffering…</Text>
        </View>
      )}

      {/* Loading overlay (after initial URL generation, while video loads) */}
      {isLoading && signedUrl && (
        <View style={styles.bufferingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      )}

      {/* Video Player */}
      {signedUrl && (
        <Video
          source={{ uri: signedUrl }}
          style={styles.videoPlayer}
          controls={true}
          resizeMode="contain"
          onLoad={handleVideoLoad}
          onBuffer={handleVideoBuffer}
          onError={handleVideoError}
          onEnd={handleVideoEnd}
          paused={false}
          repeat={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
        />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.screen,
  },
  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.headerBg,
  },
  headerOverVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: COLORS.overlay,
    borderBottomColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonOverlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginHorizontal: spacing[8],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Centred State ───────────────────────────────────────────────────
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    gap: spacing[12],
  },
  centerStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Error State ─────────────────────────────────────────────────────
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  errorEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: spacing[4],
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  errorDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing[16],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[8],
    borderRadius: radius.md,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Video Player ────────────────────────────────────────────────────
  videoPlayer: {
    flex: 1,
    backgroundColor: COLORS.screen,
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 15, 18, 0.6)',
    zIndex: 10,
    gap: spacing[8],
  },
  bufferingText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  // ── Playback Ended ──────────────────────────────────────────────────
  endedIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A3A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  endedEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  endedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: spacing[16],
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
});
