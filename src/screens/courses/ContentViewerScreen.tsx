/**
 * ContentViewerScreen
 *
 * Generic content viewer that renders study material inside the app.
 * Currently supports only `contentType = 'notes'` (PDF).
 *
 * Future phases will add support for:
 * - `video` → embedded video player
 * - `pdf` → PDF viewer (same as notes)
 * - `assignment` → PDF viewer
 *
 * Navigation: SubjectDashboard → ContentViewer
 *
 * ## Flow
 *
 * 1. Screen receives content metadata via route params
 * 2. Generate a signed URL from `storageBucket` + `storagePath`
 *    using the existing `storageService.generateSignedUrl()`
 * 3. Show loading indicator while URL is being generated
 * 4. Render the PDF inside `react-native-pdf`
 * 5. Show loading indicator while PDF loads
 * 6. On error, show a friendly error state with Retry button
 *
 * @module screens/courses/ContentViewerScreen
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Pdf from 'react-native-pdf';
import { generateSignedUrl } from '../../services/storage/storageService';
import { supabase } from '../../config/supabase';
import type { AppStackParamList } from '../../navigation/AppNavigator';
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

// ─── Content Type Route ─────────────────────────────────────────────────────

type ContentViewerRouteProp = RouteProp<AppStackParamList, 'ContentViewer'>;

// ═══════════════════════════════════════════════════════════════════════════
//  Screen
// ═══════════════════════════════════════════════════════════════════════════

export default function ContentViewerScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ContentViewerRouteProp>();
  const { contentId, contentType, storageBucket, storagePath, title } = route.params;

  // ── [DIAGNOSTIC] Log content metadata received ────────────────────────
  console.log('[ContentViewer] ==================== CONTENT METADATA ====================');
  console.log('[ContentViewer] Route params received:', {
    contentId,
    contentType,
    storageBucket,
    storagePath,
    title,
  });
  console.log('[ContentViewer] ============================================================');

  // ── Content Type Guard ──────────────────────────────────────────────
  // Only `notes` and `pdf` content types are supported in this iteration.
  const isPdfType = contentType === 'notes' || contentType === 'pdf';

  // ── State ───────────────────────────────────────────────────────────────
  const [localPdfPath, setLocalPdfPath] = useState<string | null>(null);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Generate Signed URL & Download ──────────────────────────────────────
  const loadSignedUrl = useCallback(async () => {
    setIsGeneratingUrl(true);
    setErrorMessage(null);

    // ── [DIAGNOSTIC] Verify file existence in storage bucket ─────────────
    console.log('[ContentViewer] ==================== STORAGE FILE CHECK ====================');
    try {
      const lastSlashIndex = storagePath.lastIndexOf('/');
      const parentFolder = lastSlashIndex > 0 ? storagePath.slice(0, lastSlashIndex) : '';
      const fileName = lastSlashIndex > 0 ? storagePath.slice(lastSlashIndex + 1) : storagePath;

      const { data: fileList, error: listError } = await supabase.storage
        .from(storageBucket)
        .list(parentFolder, { limit: 100, sortBy: { column: 'name', order: 'asc' } });

      if (listError) {
        console.error('[ContentViewer] Failed to list bucket contents:', listError);
      } else {
        const fileExists = fileList?.some((f: any) => f.name === fileName);
        console.log('[ContentViewer] Target file exists in bucket?', fileExists);
      }
    } catch (listErr) {
      console.error('[ContentViewer] Exception while listing storage bucket:', listErr);
    }
    console.log('[ContentViewer] ============================================================');

    // ── Generate Signed URL ───────────────────────────────────────────────
    console.log('[ContentViewer] ==================== SIGNED URL GENERATION ====================');
    try {
      const result = await generateSignedUrl({
        bucket: storageBucket,
        storagePath,
        contentType: contentType as 'pdf' | 'video' | 'notes' | 'assignment',
      });

      if (result.success && result.data) {
        console.log('[ContentViewer] Signed URL generated. Starting manual download...');
        
        // --- NEW NATIVE DOWNLOAD LOGIC ---
        // --- FALLBACK JS DOWNLOAD LOGIC ---
        // --- NATIVE DOWNLOAD LOGIC (PRODUCTION READY) ---
        // --- NATIVE DOWNLOAD LOGIC (PRODUCTION READY) ---
        // --- NATIVE DOWNLOAD LOGIC (PRODUCTION READY) ---
        // --- REACT NATIVE FS DOWNLOAD LOGIC ---
        try {
          const filePath = `${RNFS.CachesDirectoryPath}/content_${contentId}.pdf`;

          // Remove the file if it already exists to prevent corrupt cache collisions
          const exists = await RNFS.exists(filePath);
          if (exists) {
            await RNFS.unlink(filePath);
          }

          const downloadRes = await RNFS.downloadFile({
            fromUrl: result.data.signedUrl,
            toFile: filePath,
            background: true,
          }).promise;

          if (downloadRes.statusCode !== 200) {
            throw new Error(`Server returned status ${downloadRes.statusCode}`);
          }

          const localPath = `file://${filePath}`;
          console.log('[ContentViewer] RNFS download complete:', localPath);
          setLocalPdfPath(localPath);
        } catch (downloadErr) {
          console.error('[ContentViewer] RNFS download failed:', downloadErr);
          setErrorMessage('Network interrupted while downloading the document.');
        }
        // --------------------------------------

      } else {
        console.error('[ContentViewer] Signed URL generation FAILED:', result.error);
        setErrorMessage(result.error || 'Failed to generate access URL.');
      }
    } catch (err) {
      console.error('[ContentViewer] Signed URL generation threw EXCEPTION:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      console.log('[ContentViewer] ============================================================');
      setIsGeneratingUrl(false);
    }
  }, [storageBucket, storagePath, contentType, contentId]);

  useEffect(() => {
    loadSignedUrl();
  }, [loadSignedUrl]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setLocalPdfPath(null); // Fixed from setSignedUrl
    setIsPdfLoading(true);
    loadSignedUrl();
  }, [loadSignedUrl]);

  const handlePdfLoadComplete = useCallback((numberOfPages: number) => {
    setIsPdfLoading(false);
    setErrorMessage(null);
    console.log('[PDF] Loaded successfully. Pages:', numberOfPages);
  }, []);

  const handlePdfProgress = useCallback((percent: number) => {
    console.log('[PDF] Progress:', percent);
  }, []);

  const handlePdfLinkPress = useCallback((uri: string) => {
    console.log('[PDF] Link pressed:', uri);
  }, []);

  const handlePdfError = useCallback((error: object) => {
    setIsPdfLoading(false);
    console.error('[PDF] Error:', error);

    const raw = (error as any)?.message;
    const errMsg = typeof raw === 'string' ? raw : 'An unknown error occurred while loading the document.';

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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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

  // Error state (pre-PDF)
  if (errorMessage && !localPdfPath) { // Fixed from signedUrl
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Unsupported content type
  if (!isPdfType && localPdfPath) { // Fixed from signedUrl
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Content'}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerState}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorEmoji}>🎥</Text>
          </View>
          <Text style={styles.errorTitle}>Content Type Not Supported Yet</Text>
          <Text style={styles.errorDescription}>
            Video, audio, and other content types will be supported in a future update.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Viewer (PDF) ──────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || 'Content'}
        </Text>
        {/* Download button (disabled for now) */}
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

      {/* PDF Error Overlay (when path exists but PDF fails) */}
      {errorMessage && localPdfPath && ( // Fixed from signedUrl
        <View style={styles.pdfErrorOverlay}>
          <View style={styles.pdfErrorContent}>
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorEmoji}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Failed to Load Document</Text>
            <Text style={styles.errorDescription}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PDF Viewer */}
      {localPdfPath && !errorMessage && (() => {
        console.log('[PDF] Loading local URI:', localPdfPath);
        return (
          <Pdf
            source={{ uri: localPdfPath }} // Now pointing to the local file
            onLoadComplete={handlePdfLoadComplete}
            onLoadProgress={handlePdfProgress}
            onError={handlePdfError}
            onPressLink={handlePdfLinkPress}
            style={styles.pdfViewer}
            trustAllCerts={false}
            enablePaging={true}
          />
        );
      })()}
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
  // ── PDF Viewer ──────────────────────────────────────────────────────
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