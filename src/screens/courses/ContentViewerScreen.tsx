/**
 * ContentViewerScreen
 *
 * Dispatcher screen that selects the appropriate viewer based on content type:
 * - `pdf` / `notes` → PDFViewer (RNFS download + react-native-pdf)
 * - `video`         → VideoViewer (stream from signed URL via react-native-video)
 * - `assignment`    → Placeholder (future)
 *
 * Navigation: SubjectDashboard → ContentViewer
 *
 * All content-type-specific logic lives in dedicated sub-components.
 * Adding a new content type requires only adding a new viewer component
 * and a route in the switch below.
 *
 * @module screens/courses/ContentViewerScreen
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import PDFViewer from './PDFViewer';
import VideoViewer from './VideoViewer';
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
  infoLight: '#EFF6FF',
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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── Route by content type ───────────────────────────────────────────────

  switch (contentType) {
    case 'pdf':
    case 'notes':
      return (
        <PDFViewer
          contentId={contentId}
          storageBucket={storageBucket}
          storagePath={storagePath}
          title={title}
          onBack={handleBack}
        />
      );

    case 'video':
      return (
        <VideoViewer
          storageBucket={storageBucket}
          storagePath={storagePath}
          title={title}
          onBack={handleBack}
        />
      );

    case 'assignment':
      return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Icon name="arrow-left" color={COLORS.textPrimary} width={20} height={20} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title || 'Assignment'}
            </Text>
            <View style={styles.backButton} />
          </View>
          <View style={styles.centerState}>
            <View style={styles.placeholderIconContainer}>
              <Text style={styles.placeholderEmoji}>📋</Text>
            </View>
            <Text style={styles.placeholderTitle}>Assignments Coming Soon</Text>
            <Text style={styles.placeholderDescription}>
              Assignment submissions will be supported in a future update.
            </Text>
            <TouchableOpacity style={styles.backNavButton} onPress={handleBack} activeOpacity={0.8}>
              <Text style={styles.backNavButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );

    default:
      // Fallback: unknown content type
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
            <View style={styles.placeholderIconContainer}>
              <Text style={styles.placeholderEmoji}>📄</Text>
            </View>
            <Text style={styles.placeholderTitle}>Content Type Not Supported</Text>
            <Text style={styles.placeholderDescription}>
              This content type is not yet supported in this version of the app.
            </Text>
            <TouchableOpacity style={styles.backNavButton} onPress={handleBack} activeOpacity={0.8}>
              <Text style={styles.backNavButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    gap: spacing[12],
  },
  // ── Placeholder ─────────────────────────────────────────────────────
  placeholderIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  placeholderEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  placeholderDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing[16],
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  backNavButton: {
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[8],
    borderRadius: radius.md,
  },
  backNavButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
});
