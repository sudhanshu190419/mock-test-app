/**
 * TestEngineScreen
 *
 * The main test-taking screen for the PYQ Mock Test Engine.
 * Composes TestHeader, ProgressBar, QuestionCard, QuestionPalette,
 * DesktopActionBar, and BottomActionBar into a responsive layout.
 *
 * Layout modes:
 * - Desktop (width ≥ 768): Question area (left 2/3) + Palette sidebar (right 1/3)
 * - Mobile (width < 768): Full-width question area + BottomActionBar + Modal palette
 *
 * No animations — no Reanimated, no Animated API.
 *
 * @module screens/tests/TestEngineScreen
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { TestHeader } from '../../components/testEngine/TestHeader';
import { ProgressBar } from '../../components/testEngine/ProgressBar';
import { QuestionCard } from '../../components/testEngine/QuestionCard';
import { QuestionPalette } from '../../components/testEngine/QuestionPalette';
import { DesktopActionBar } from '../../components/testEngine/DesktopActionBar';
import { BottomActionBar, BOTTOM_BAR_HEIGHT } from '../../components/testEngine/BottomActionBar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useTestTimer } from '../../hooks/useTestTimer';
import * as testService from '../../services/testEngineService';
import { MOCK_QUESTIONS, MOCK_TEST_CONFIG, MOCK_DURATION_SECONDS } from '../../data/mockTestEngine';
import type { TestEngineParams, QuestionDisplay } from '../../types/testEngine';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const DESKTOP_BREAKPOINT = 768;
const TIMER_WARNING_THRESHOLD = 300; // 5 minutes in seconds
const TIMER_CRITICAL_THRESHOLD = 60; // 1 minute in seconds

// ═══════════════════════════════════════════════════════════════════
//  Navigation Params
// ═══════════════════════════════════════════════════════════════════

export type { TestEngineParams };

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

interface TestEngineScreenProps {
  route: { params: TestEngineParams };
  navigation: { goBack: () => void };
}

export default function TestEngineScreen({
  route,
  navigation,
}: TestEngineScreenProps): React.JSX.Element {
  const { testId, title, durationMin } = route.params;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= DESKTOP_BREAKPOINT;

  // ── State ──────────────────────────────────────────────────────
  const [questions] = useState<QuestionDisplay[]>(() =>
    MOCK_QUESTIONS.map((q) => ({ ...q })),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<Record<number, string | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [isPaletteVisible, setIsPaletteVisible] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const handleSubmitTestRef = useRef<(() => void) | undefined>(undefined);
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // ── Derived state ──────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const answeredIndices = useMemo(() => {
    const indices = new Set<number>();
    for (const [index, optionId] of Object.entries(selectedOption)) {
      if (optionId !== null) {
        indices.add(Number(index));
      }
    }
    return indices;
  }, [selectedOption]);

  const answerProgress = questions.length > 0 ? answeredIndices.size / questions.length : 0;

  // ── Timer ──────────────────────────────────────────────────────
  const timer = useTestTimer(
    (durationMin ?? MOCK_DURATION_SECONDS / 60) * 60,
    () => handleSubmitTestRef.current?.(),
  );

  // ── Handlers ───────────────────────────────────────────────────

  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (isSubmitted) return;
      setSelectedOption((prev) => ({
        ...prev,
        [currentIndex]: optionId,
      }));
      // If this question was marked for review, unmark it when answered
      setMarkedForReview((prev) => {
        const next = new Set(prev);
        next.delete(currentIndex);
        return next;
      });
    },
    [currentIndex, isSubmitted],
  );

  const handleToggleReview = useCallback(() => {
    if (isSubmitted) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  }, [currentIndex, isSubmitted]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      markVisited(newIndex);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [currentIndex]);

  const handleSaveAndNext = useCallback(() => {
    if (isSubmitted) return;
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      markVisited(newIndex);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      // Last question — show submit confirmation
      handleSubmitTest();
    }
  }, [currentIndex, questions.length, isSubmitted]);

  const handleQuestionSelect = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      markVisited(index);
      setIsPaletteVisible(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [],
  );

  const handleSubjectChange = useCallback((subjectId: string | null) => {
    setActiveSubject(subjectId);
  }, []);

  const handleOpenPalette = useCallback(() => {
    setIsPaletteVisible(true);
  }, []);

  const handleClosePalette = useCallback(() => {
    setIsPaletteVisible(false);
  }, []);

  // Keep a ref to the latest handleSubmitTest for the timer callback.
  const handleSubmitTest = useCallback(() => {
    Alert.alert(
      'Submit Test',
      `You have answered ${answeredIndices.size} out of ${questions.length} questions. ${
        questions.length - answeredIndices.size
      } questions are unanswered. Are you sure you want to submit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitted(true);
            timer.pause();
            try {
              await testService.submitTest({
                testId,
                paperId: 'mock_paper',
                answers: selectedOption,
                timeTakenSeconds: MOCK_DURATION_SECONDS - timer.timeRemaining,
              });
              // Navigate to results screen
              stackNavigation.reset({
                index: 1,
                routes: [
                  { name: 'MainTabs' },
                  { name: 'TestResult', params: { testId, attemptId: `attempt_${Date.now()}` } },
                ],
              });
            } catch {
              Alert.alert('Error', 'Failed to submit test. Please try again.');
              setIsSubmitted(false);
            }
          },
        },
      ],
    );
  }, [answeredIndices, questions.length, selectedOption, testId, timer]);

  // Sync the ref so the timer callback always has the latest submit handler.
  useEffect(() => {
    handleSubmitTestRef.current = handleSubmitTest;
  }, [handleSubmitTest]);

  function markVisited(index: number) {
    setVisitedQuestions((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }

  // ── Accessibility ──────────────────────────────────────────────

  const timerWarning = timer.timeRemaining <= TIMER_WARNING_THRESHOLD && timer.timeRemaining > TIMER_CRITICAL_THRESHOLD;
  const timerCritical = timer.timeRemaining <= TIMER_CRITICAL_THRESHOLD;

  // ── Render ─────────────────────────────────────────────────────

  const contentPaddingTop = (insets.top > 0 ? insets.top : spacing[8]) + 56 + 3 + spacing[16];
  const contentPaddingBottom = isDesktop ? spacing[16] : BOTTOM_BAR_HEIGHT + spacing[8] + (insets.bottom > 0 ? insets.bottom : spacing[8]);

  return (
    <View style={styles.screen}>
      {/* ═══ Header ═══ */}
      <TestHeader
        title={title ?? MOCK_TEST_CONFIG.title}
        formattedTime={timer.formattedTime}
        isTimerWarning={timerWarning}
        isTimerCritical={timerCritical}
      />

      {/* ═══ Progress Bar ═══ */}
      <ProgressBar progress={answerProgress} />

      {/* ═══ Main Content Area ═══ */}
      <View style={styles.mainRow}>
        {/* ── Question Area ── */}
        <ScrollView
          ref={scrollRef}
          style={[styles.questionArea, isDesktop && styles.questionAreaDesktop]}
          contentContainerStyle={{
            paddingTop: contentPaddingTop,
            paddingBottom: contentPaddingBottom,
            paddingHorizontal: spacing[16],
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
        >
          {currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              selectedOptionId={selectedOption[currentIndex] ?? null}
              isSubmitted={isSubmitted}
              onOptionSelect={handleOptionSelect}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No questions available.</Text>
            </View>
          )}

          {/* Desktop Action Bar */}
          {isDesktop && !isSubmitted && (
            <DesktopActionBar
              hasPrevious={currentIndex > 0}
              isMarkedForReview={markedForReview.has(currentIndex)}
              isLastQuestion={currentIndex === questions.length - 1}
              onPrevious={handlePrevious}
              onToggleReview={handleToggleReview}
              onSaveAndNext={handleSaveAndNext}
            />
          )}

          {/* Submitted overlay message */}
          {isSubmitted && (
            <View style={styles.submittedNotice}>
              <Text style={styles.submittedNoticeText}>
                Test submitted. You can review your answers.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Desktop Palette ── */}
        {isDesktop && (
          <View style={styles.paletteDesktop}>
            <QuestionPalette
              questions={questions}
              currentIndex={currentIndex}
              answeredIndices={answeredIndices}
              markedForReviewIndices={markedForReview}
              visitedIndices={visitedQuestions}
              activeSubject={activeSubject}
              onSubjectChange={handleSubjectChange}
              onQuestionSelect={handleQuestionSelect}
              onSubmitTest={handleSubmitTest}
            />
          </View>
        )}
      </View>

      {/* ═══ Mobile Bottom Bar ═══ */}
      {!isDesktop && !isSubmitted && (
        <BottomActionBar
          hasPrevious={currentIndex > 0}
          isMarkedForReview={markedForReview.has(currentIndex)}
          isLastQuestion={currentIndex === questions.length - 1}
          onPrevious={handlePrevious}
          onToggleReview={handleToggleReview}
          onSaveAndNext={handleSaveAndNext}
          onOpenPalette={handleOpenPalette}
        />
      )}

      {/* ═══ Mobile Palette Modal ═══ */}
      {!isDesktop && (
        <Modal
          visible={isPaletteVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleClosePalette}
        >
          <View style={styles.modalContainer}>
            <QuestionPalette
              questions={questions}
              currentIndex={currentIndex}
              answeredIndices={answeredIndices}
              markedForReviewIndices={markedForReview}
              visitedIndices={visitedQuestions}
              activeSubject={activeSubject}
              onSubjectChange={handleSubjectChange}
              onQuestionSelect={handleQuestionSelect}
              onSubmitTest={handleSubmitTest}
              onClose={handleClosePalette}
              isModal
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.slate50,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
  },
  questionArea: {
    flex: 1,
  },
  questionAreaDesktop: {
    flex: 2,
    maxWidth: '66.67%',
  },
  paletteDesktop: {
    flex: 1,
    maxWidth: '33.33%',
    paddingVertical: spacing[16],
    paddingRight: spacing[16],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[48],
  },
  emptyStateText: {
    ...typography.body,
    color: palette.slate400,
  },
  submittedNotice: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.sm,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: spacing[16],
  },
  submittedNoticeText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
