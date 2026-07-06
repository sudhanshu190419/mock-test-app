/**
 * TestResultScreen
 *
 * Displays the test result / analytical report after a test is submitted.
 * Composes ResultHeader, HeroScoreCard, AccuracyCard, TimeAnalysisCard,
 * and QuestionBreakdownCard into a scrollable layout.
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
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { ResultHeader, HEADER_HEIGHT } from '../../components/testResult/ResultHeader';
import { HeroScoreCard } from '../../components/testResult/HeroScoreCard';
import { AccuracyCard } from '../../components/testResult/AccuracyCard';
import { TimeAnalysisCard } from '../../components/testResult/TimeAnalysisCard';
import { QuestionBreakdownCard } from '../../components/testResult/QuestionBreakdownCard';
import * as resultService from '../../services/resultService';
import type { TestResultParams, TestResult } from '../../types/testResult';

// ═══════════════════════════════════════════════════════════════════
//  Navigation Params
// ═══════════════════════════════════════════════════════════════════

export type { TestResultParams };

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

  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Data Loading ───────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    async function loadResult() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await resultService.getTestResult(testId, attemptId);
        if (isMounted) {
          setResult(data);
        }
      } catch (err) {
        if (isMounted) {
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

  // ── Loading State ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your results...</Text>
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────

  if (error || !result) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error ?? 'No result data available.'}</Text>
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
    padding: spacing[24],
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
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: spacing[16],
  },
});
