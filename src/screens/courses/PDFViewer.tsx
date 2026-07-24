/**
 * PDFViewer
 *
 * Dedicated PDF viewer that downloads a file from a signed URL via RNFS,
 * caches it locally, and renders it with react-native-pdf.
 *
 * All PDF-specific production hardening is contained here:
 * - Download progress with RNFS callbacks
 * - Download cancellation on unmount
 * - File integrity verification (exists + size > 0)
 * - Duplicate download prevention (ref-based guard)
 * - Differentiated error messages
 *
 * @module screens/courses/PDFViewer
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateSignedUrl } from '../../services/storage/storageService';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../../components/home/Icons';

// ─── Colour Palette ─────────────────────────────────────────────────────────

const COLORS = {
  screen: '#F0F9FF',
  headerBg: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#05C46B',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  skeleton: '#F1F5F9',
} as const;

// ─── Props ──────────────────────────────────────────────────────────────────

interface PDFViewerProps {
  contentId: string;
  storageBucket: string;
  storagePath: string;
  title: string;
  onBack: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════

export default function PDFViewer({
  contentId,
  storageBucket,
  storagePath,
  title,
  onBack,
}: PDFViewerProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  // ── State ───────────────────────────────────────────────────────────────
  const [localPdfPath, setLocalPdfPath] = useState<string | null>(null);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const downloadJobIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isDownloadingRef = useRef(false);

  // ── Generate Signed URL & Download ──────────────────────────────────────
  const loadSignedUrl = useCallback(async () => {
    if (isDownloadingRef.current) return;
    isDownloadingRef.current = true;

    setIsGeneratingUrl(true);
    setDownloadProgress(0);
    setErrorMessage(null);

    try {
      const result = await generateSignedUrl({
        bucket: storageBucket,
        storagePath,
        contentType: 'pdf',
      });

      if (!result.success || !result.data) {
        setErrorMessage(result.error || 'Failed to generate access URL.');
        isDownloadingRef.current = false;
        return;
      }

      setIsGeneratingUrl(false);
      setIsDownloading(true);

      const filePath = `${RNFS.CachesDirectoryPath}/content_${contentId}.pdf`;

      // Clear stale cache
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }

      // Start download with progress tracking
      const downloadJob = RNFS.downloadFile({
        fromUrl: result.data.signedUrl,
        toFile: filePath,
        background: true,
        progressDivider: 5,
        begin: () => {
          if (!isMountedRef.current) return;
          setDownloadProgress(0);
        },
        progress: (res) => {
          if (!isMountedRef.current) return;
          const pct = res.contentLength > 0
            ? Math.round((res.bytesWritten / res.contentLength) * 100)
            : 0;
          setDownloadProgress(Math.min(pct, 99));
        },
      });

      downloadJobIdRef.current = downloadJob.jobId;

      let downloadRes;
      try {
        downloadRes = await downloadJob.promise;
      } finally {
        downloadJobIdRef.current = null;
      }

      if (!isMountedRef.current) return;

      // Validate HTTP response
      if (downloadRes.statusCode !== 200) {
        if (downloadRes.statusCode === 403) {
          throw new Error('expired');
        } else if (downloadRes.statusCode === 404) {
          throw new Error('not-found');
        }
        throw new Error('network');
      }

      // Validate file integrity
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('not-found');
      }

      const stat = await RNFS.stat(filePath);
      if (stat.size === 0) {
        await RNFS.unlink(filePath).catch(() => {});
        throw new Error('empty');
      }

      setDownloadProgress(100);
      setLocalPdfPath(`file://${filePath}`);
      setIsDownloading(false);
      isDownloadingRef.current = false;
    } catch (err) {
      if (!isMountedRef.current) {
        isDownloadingRef.current = false;
        return;
      }

      setIsDownloading(false);
      isDownloadingRef.current = false;

      const message = err instanceof Error ? err.message : 'unexpected';
      switch (message) {
        case 'cancelled':
          return;
        case 'expired':
          setErrorMessage('This link has expired. Please go back and try again.');
          break;
        case 'not-found':
          setErrorMessage('The requested file was not found. It may have been removed.');
          break;
        case 'empty':
          setErrorMessage('The downloaded file is empty or corrupted. Please try again.');
          break;
        case 'network':
          setErrorMessage('Unable to download the document. Check your connection and try again.');
          break;
        default:
          setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsGeneratingUrl(false);
      }
    }
  }, [storageBucket, storagePath, contentId]);

  // ── Cancel download on unmount ───────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (downloadJobIdRef.current !== null) {
        RNFS.stopDownload(downloadJobIdRef.current);
        downloadJobIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    loadSignedUrl();
  }, [loadSignedUrl]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    if (isDownloading) return;
    setDownloadProgress(0);
    setErrorMessage(null);
    setLocalPdfPath(null);
    setIsPdfLoading(true);
    loadSignedUrl();
  }, [loadSignedUrl, isDownloading]);

  const handlePdfLoadComplete = useCallback((_numberOfPages: number) => {
    if (!isMountedRef.current) return;
    setIsPdfLoading(false);
    setErrorMessage(null);
  }, []);

  const handlePdfError = useCallback((error: object) => {
    if (!isMountedRef.current) return;
    setIsPdfLoading(false);

    const raw = (error as any)?.message;
    const errMsg = typeof raw === 'string' ? raw : '';

    if (errMsg.includes('403') || errMsg.includes('permission')) {
      setErrorMessage('Access denied. You do not have permission to view this file.');
    } else if (errMsg.includes('404') || errMsg.includes('not found')) {
      setErrorMessage('The requested file was not found. It may have been removed.');
    } else if (errMsg.includes('network') || errMsg.includes('timeout')) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } else if (errMsg.includes('expired')) {
      setErrorMessage('The access URL has expired. Please try again.');
    } else {
      setErrorMessage('Failed to load the document. Please try again.');
    }
  }, []);

  // ── Render States ───────────────────────────────────────────────────────

  // Generating signed URL
  if (isGeneratingUrl) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Content'}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.textPrimary} />
          <Text style={styles.centerStateText}>Preparing your content…</Text>
        </View>
      </View>
    );
  }

  // Download progress state
  if (isDownloading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Content'}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>{downloadProgress}%</Text>
          </View>
          <Text style={styles.centerStateText}>Downloading document…</Text>
        </View>
      </View>
    );
  }

  // Error state (pre-PDF)
  if (errorMessage && !localPdfPath) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Content'}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Could Not Load Content</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
            disabled={isDownloading}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Viewer ────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || 'Content'}
        </Text>
        <View style={[styles.backButton, styles.downloadButtonDisabled]}>
          <Icon name="download" color={COLORS.textMuted} width={20} height={20} />
        </View>
      </View>

      {/* PDF Loading Overlay */}
      {isPdfLoading && (
        <View style={styles.pdfLoadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.textPrimary} />
          <Text style={styles.centerStateText}>Loading document…</Text>
        </View>
      )}

      {/* PDF Error Overlay */}
      {errorMessage && localPdfPath && (
        <View style={styles.pdfErrorOverlay}>
          <View style={styles.pdfErrorContent}>
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorEmoji}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Failed to Load Document</Text>
            <Text style={styles.errorDescription}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
              disabled={isDownloading}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PDF Viewer */}
      {localPdfPath && !errorMessage && (
        <Pdf
          source={{ uri: localPdfPath }}
          onLoadComplete={handlePdfLoadComplete}
          onError={handlePdfError}
          style={styles.pdfViewer}
          trustAllCerts={false}
          enablePaging={true}
        />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.screen,
  },
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
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
  downloadButtonDisabled: {
    opacity: 0.4,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
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
    backgroundColor: COLORS.textPrimary,
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
  pdfViewer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: COLORS.skeleton,
  },
  pdfLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
    gap: spacing[12],
  },
  pdfErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 10,
    paddingHorizontal: spacing[32],
  },
  pdfErrorContent: {
    alignItems: 'center',
  },
});
