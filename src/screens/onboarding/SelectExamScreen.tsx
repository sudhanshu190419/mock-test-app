/**
 * SelectExamScreen
 *
 * Post-login gating screen for selecting the target exam stream.
 * Displays active exam streams (e.g. JEE, NEET, Class 12, etc.) dynamically
 * fetched from the database, letting the user choose their goal.
 *
 * Persists the selection to AsyncStorage and Redux, which unlocks the dashboard.
 *
 * @module screens/onboarding/SelectExamScreen
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectUser, setSelectedStreamId } from '../../store/authSlice';
import { useStreams } from '../../hooks/academic/useStreams';
import type { Stream } from '../../types/academic';
import Icon from '../../components/home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

export default function SelectExamScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch active streams for this student's institute ───────────
  const { data: streamsData, isLoading, error, refetch } = useStreams(
    { isActive: true, instituteId: user?.instituteId ?? undefined },
    { sortBy: 'displayOrder', sortDirection: 'asc' }
  );

  const streams = useMemo(() => streamsData?.data ?? [], [streamsData]);

  // ── Handle exam stream submission ──────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedId || !user?.id) return;

    setSubmitting(true);
    try {
      const storageKey = `selected_exam_stream_id_${user.id}`;
      await AsyncStorage.setItem(storageKey, selectedId);
      dispatch(setSelectedStreamId(selectedId));
    } catch (err) {
      console.error('[SelectExamScreen] Failed to save stream selection:', err);
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, user?.id, dispatch]);

  // ── Card render ────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: Stream }) => {
      const isSelected = item.streamId === selectedId;
      return (
        <TouchableOpacity
          onPress={() => setSelectedId(item.streamId)}
          activeOpacity={0.8}
          style={[
            styles.card,
            isSelected && styles.cardSelected,
            shadows.small,
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, isSelected && styles.iconBadgeSelected]}>
              <Text style={[styles.emoji, isSelected && styles.emojiSelected]}>
                {item.code.includes('NEET') ? '🔬' : item.code.includes('JEE') ? '⚛️' : '📚'}
              </Text>
            </View>
            {isSelected && (
              <View style={styles.checkWrapper}>
                <Icon name="badge-check" color={colors.text.inverse} width={14} height={14} />
              </View>
            )}
          </View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardCode}>{item.code}</Text>
          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [selectedId]
  );

  // ── Main UI States ─────────────────────────────────────────────
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Fetching available exams...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load exams</Text>
          <Text style={styles.errorText}>{error.message || 'Something went wrong.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (streams.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emoji}>📭</Text>
          <Text style={styles.errorTitle}>No active exams found</Text>
          <Text style={styles.errorText}>
            We couldn't find any active exams for your institute. Please check back later.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={streams}
        keyExtractor={(item) => item.streamId}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.name || 'Learner'} 👋</Text>
        <Text style={styles.title}>What exam are you preparing for?</Text>
        <Text style={styles.subtitle}>
          Select your goal. We will customize your study materials, courses, and mock tests.
        </Text>
      </View>

      {/* Grid Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Bottom Submit Bar */}
      {streams.length > 0 && !isLoading && !error && (
        <View style={[styles.footer, shadows.medium]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedId || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedId || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Confirm Selection</Text>
                <Text style={styles.arrowIcon}>{' \u2192'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[20],
    paddingBottom: spacing[16],
  },
  welcomeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: spacing[8],
  },
  title: {
    ...typography.heading2,
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[40],
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing[16],
  },
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing[16],
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'space-between',
  },
  cardSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.tint.blue,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeSelected: {
    backgroundColor: palette.white,
  },
  emoji: {
    fontSize: 20,
  },
  emojiSelected: {
    fontSize: 22,
  },
  checkWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...typography.title,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardCode: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing[8],
  },
  cardDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing[16],
  },
  errorTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginTop: spacing[16],
    fontWeight: '700',
  },
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[8],
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: radius.xl,
    marginTop: spacing[20],
  },
  retryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    paddingBottom: Platform.OS === 'ios' ? spacing[32] : spacing[20],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.secondary,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  arrowIcon: {
    ...typography.button,
    color: colors.text.inverse,
  },
});
