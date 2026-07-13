/**
 * TestResultScreen
 *
 * Displays the test result / analytical report after a test is submitted.
 * Composes ResultHeader, HeroScoreCard, AccuracyCard, TimeAnalysisCard,
 * and QuestionBreakdownCard into a scrollable layout.
 *
 * Handles both released and unreleased result states, network errors,
 * and authentication failures gracefully.
 *
 * No animations — no Reanimated, no Animated API.
 *
 * @module screens/tests/TestResultScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from '../../components/home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { ResultHeader, HEADER_HEIGHT } from '../../components/testResult/ResultHeader';
import { HeroScoreCard } from '../../components/testResult/HeroScoreCard';
import { AccuracyCard } from '../../components/testResult/AccuracyCard';
import { TimeAnalysisCard } from '../../components/testResult/TimeAnalysisCard';
import { QuestionBreakdownCard } from '../../components/testResult/QuestionBreakdownCard';
import * as resultService from '../../services/resultService';
import type { TestResultParams, TestResult } from '../../types/testResult';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════
//  Navigation Params
// ═══════════════════════════════════════════════════════════════════

export type { TestResultParams };

// ═══════════════════════════════════════════════════════════════════
//  Error Messages
// ═══════════════════════════════════════════════════════════════════

const RESULT_NOT_RELEASED_ERROR = 'RESULT_NOT_RELEASED';

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

interface TestResultScreenProps {
  route: { params: TestResultParams };
  navigation: { goBack: () => void };
}

export default function TestResultScreen({
  route,
  navigation,
}: TestResultScreenProps): React.JSX.Element {
  const { testId, attemptId } = route.params;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 640;
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnreleased, setIsUnreleased] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);

  // ── Data Loading ───────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    async function loadResult() {
      try {
        setIsLoading(true);
        setError(null);
        setIsUnreleased(false);
        setIsNetworkError(false);

        const data = await resultService.getTestResult(testId, attemptId);
        if (isMounted) {
          setResult(data);
        }
      } catch (err) {
        if (!isMounted) return;

        const message = err instanceof Error ? err.message : String(err);

        if (message === RESULT_NOT_RELEASED_ERROR) {
          // Result exists but not yet released
          setIsUnreleased(true);
          setError('Your result has been generated but has not yet been released by your institute.');
        } else if (
          message.includes('network') ||
          message.includes('Network') ||
          message.includes('Failed to fetch')
        ) {
          setIsNetworkError(true);
          setError('Network unavailable. Please check your connection and try again.');
        } else if (
          message.includes('not found') ||
          message.includes('permission') ||
          message.includes('Permission')
        ) {
          setIsNetworkError(false);
          setError(message);
        } else {
          setIsNetworkError(false);
          setError('Failed to load results. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadResult();
    return () => {
      isMounted = false;
    };
  }, [testId, attemptId]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSharePress = useCallback(() => {
    resultService.shareResult(attemptId).catch(() => {
      // Silently fail — share functionality is a placeholder
    });
  }, [attemptId]);

  const handleGoHome = useCallback(() => {
    stackNavigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  }, [stackNavigation]);

  // ── Loading State ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your results...</Text>
      </View>
    );
  }

  // ── Unreleased Result State ────────────────────────────────────

  if (isUnreleased) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <View style={styles.unreleasedIcon}>
            <Icon name="timer" color={colors.primary} width={48} height={48} />
          </View>
          <Text style={styles.title}>Result Not Released</Text>
          <Text style={styles.description}>
            {error}
          </Text>
          <Text style={styles.description}>
            Please check again later.
          </Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleGoHome}
            activeOpacity={0.85}
            accessibilityLabel="Back to Home"
            accessibilityRole="button"
          >
            <Icon name="home" color="#FFFFFF" width={20} height={20} />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────

  if (error || !result) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          {isNetworkError ? (
            <>
              <View style={styles.errorIcon}>
                <Icon name="bell" color={colors.error} width={40} height={40} />
              </View>
              <Text style={styles.errorTitle}>Connection Error</Text>
            </>
          ) : (
            <>
              <View style={styles.errorIcon}>
                <Icon name="bell" color={colors.error} width={40} height={40} />
              </View>
              <Text style={styles.errorTitle}>Unable to Load Result</Text>
            </>
          )}
          <Text style={styles.errorText}>{error ?? 'No result data available.'}</Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleGoHome}
            activeOpacity={0.85}
            accessibilityLabel="Back to Home"
            accessibilityRole="button"
          >
            <Icon name="home" color="#FFFFFF" width={20} height={20} />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  const headerHeight = insets.top + HEADER_HEIGHT;

  return (
    <View style={styles.screen}>
      {/* Sticky Header */}
      <ResultHeader
        onBackPress={handleBackPress}
        onSharePress={handleSharePress}
      />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing[16],
          paddingBottom: spacing[32],
          paddingHorizontal: spacing[16],
        }}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
      >
        {/* Hero Score Card */}
        <HeroScoreCard
          testTitle={result.testTitle}
          attemptedLabel={result.attemptedLabel}
          score={result.score}
          maxScore={result.maxScore}
          percentile={result.percentile}
        />

        {/* Breakdown Grid — responsive: column on mobile, row on tablet+ */}
        {isCompact ? (
          <>
            <AccuracyCard
              accuracy={result.accuracy}
              insight={result.accuracyInsight}
            />
            <TimeAnalysisCard
              timeTakenMin={result.timeTakenMin}
              totalDurationMin={result.totalDurationMin}
              avgTimePerQuestion={result.avgTimePerQuestion}
            />
            <QuestionBreakdownCard
              correctCount={result.correctCount}
              incorrectCount={result.incorrectCount}
              skippedCount={result.skippedCount}
              totalQuestions={result.totalQuestions}
            />

            {/* Review Answers Button */}
            <TouchableOpacity
              style={styles.reviewAnswersButton}
              onPress={() =>
                stackNavigation.navigate('AnswerReview', {
                  testId,
                  attemptId,
                })
              }
              activeOpacity={0.85}
              accessibilityLabel="Review your answers"
              accessibilityRole="button"
            >
              <Icon name="clipboard-list" color="#FFFFFF" width={20} height={20} />
              <Text style={styles.reviewAnswersButtonText}>Review Answers</Text>
              <Icon name="chevron-right" color="rgba(255,255,255,0.7)" width={18} height={18} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.breakdownGrid}>
            <AccuracyCard
              accuracy={result.accuracy}
              insight={result.accuracyInsight}
            />
            <TimeAnalysisCard
              timeTakenMin={result.timeTakenMin}
              totalDurationMin={result.totalDurationMin}
              avgTimePerQuestion={result.avgTimePerQuestion}
            />
            <QuestionBreakdownCard
              correctCount={result.correctCount}
              incorrectCount={result.incorrectCount}
              skippedCount={result.skippedCount}
              totalQuestions={result.totalQuestions}
            />
          </View>
        )}

        {/* Review Answers Button — shown below cards in both layouts */}
        <TouchableOpacity
          style={styles.reviewAnswersButton}
          onPress={() =>
            stackNavigation.navigate('AnswerReview', {
              testId,
              attemptId,
            })
          }
          activeOpacity={0.85}
          accessibilityLabel="Review your answers"
          accessibilityRole="button"
        >
          <Icon name="clipboard-list" color="#FFFFFF" width={20} height={20} />
          <Text style={styles.reviewAnswersButtonText}>Review Answers</Text>
          <Icon name="chevron-right" color="rgba(255,255,255,0.7)" width={18} height={18} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FF',
    padding: spacing[32],
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate500,
    marginTop: spacing[16],
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[24],
  },
  title: {
    ...typography.heading2,
    fontSize: 22,
    fontWeight: '700',
    color: palette.slate800,
    textAlign: 'center',
    marginBottom: spacing[12],
  },
  description: {
    ...typography.body,
    fontSize: 15,
    color: palette.slate500,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[8],
  },
  unreleasedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 105, 72, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[24],
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[16],
  },
  errorTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate800,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: colors.primary,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: radius.md,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  homeButtonText: {
    ...typography.button,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: spacing[16],
  },

  // ── Review Answers Button ──────────────────────────────────
  reviewAnswersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
    backgroundColor: colors.primary,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: radius.md,
    marginTop: spacing[20],
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  reviewAnswersButtonText: {
    ...typography.button,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 0,
  },
});
