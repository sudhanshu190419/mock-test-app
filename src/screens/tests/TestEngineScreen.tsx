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
import { checkResultStatus } from '../../services/resultService';
import { supabase } from '../../config/supabase';
import { getMockTestQuestions } from '../../services/mockTest/mockTestQuestionService';
import type { MockTestQuestion } from '../../types/mockTest';
import type { TestEngineParams, QuestionDisplay } from '../../types/testEngine';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const DESKTOP_BREAKPOINT = 768;
const TIMER_WARNING_THRESHOLD = 300; // 5 minutes in seconds
const TIMER_CRITICAL_THRESHOLD = 60; // 1 minute in seconds
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * Builds a compound key for deduplicating image references.
 * Format: "storageBucket::storagePath"
 */
function imageStorageKey(img: { storageBucket: string; storagePath: string }): string {
  return `${img.storageBucket}::${img.storagePath}`;
}

/**
 * Maps a MockTestQuestion (from mock_test_questions junction + snapshot)
 * to the QuestionDisplay model used by the Test Engine UI.
 *
 * Image URLs are resolved from a pre-generated signed URL map keyed by
 * `${storageBucket}::${storagePath}`. The caller (useEffect) collects all
 * image references from the snapshot and generates signed URLs before
 * calling this function.
 *
 * @param mtq          - The mock test question junction record.
 * @param _arrayIndex  - Index in the array (unused).
 * @param signedUrlMap - Pre-generated map of storageKey → signed URL.
 */
function mockTestQuestionToDisplay(
  mtq: MockTestQuestion,
  _arrayIndex: number,
  signedUrlMap?: Record<string, string>,
): QuestionDisplay {
  const snapshot = mtq.questionSnapshot;

  // ── Resolve stem image (first stem image in snapshot.images) ─────────
  let stemImageUrl: string | undefined;
  let stemImageAlt: string | undefined;
  if (snapshot?.images && snapshot.images.length > 0) {
    const stemImg = snapshot.images[0];
    const key = imageStorageKey(stemImg);
    stemImageUrl = signedUrlMap?.[key];
    stemImageAlt = stemImg.altText;
  }

  // ── Resolve option images from snapshot.options[].images ─────────────
  const options = (snapshot?.options ?? []).map((opt, i) => {
    let optionImageUrl: string | undefined;
    if (opt.images && opt.images.length > 0) {
      const optImg = opt.images[0];
      const key = imageStorageKey(optImg);
      optionImageUrl = signedUrlMap?.[key];
    }

    return {
      id: opt.optionId,
      label: OPTION_LABELS[i] ?? String(i + 1),
      text: opt.optionText,
      imageUrl: optionImageUrl,
    };
  });

  const result: QuestionDisplay = {
    id: snapshot?.questionId ?? mtq.questionId,
    index: mtq.orderSequence,
    text: snapshot?.questionText ?? '',
    options,
    imageUrl: stemImageUrl,
    imageAlt: stemImageAlt,
    marks: snapshot?.marks ?? mtq.marks,
    negativeMarks:
      snapshot?.negativeMarks ?? (mtq.negativeMarksOverride ?? 0),
    sectionName: mtq.sectionName ?? undefined,
  };

  // ── [IMG6] Log the signedUrlMap received by the mapper ─────────────
  console.log('[IMG6] signedUrlMap received by mapper:', JSON.stringify(signedUrlMap, null, 2));

  // ── [IMG7] Log the final QuestionDisplay before returning ───────────
  console.log('[IMG7] Final QuestionDisplay:', JSON.stringify(result, null, 2));

  // ── [STEP2] Log the mapped QuestionDisplay before returning ─────────
  console.log('[STEP2] QuestionDisplay result:', JSON.stringify(result, null, 2));

  return result;
}

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
  const { testId, paperId, title, durationMin  } = route.params;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= DESKTOP_BREAKPOINT;

  // ── State ──────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuestionDisplay[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
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

  // ── Load questions via existing Mock Test module ──────────────
  useEffect(() => {
    let isMounted = true;
    async function loadQuestions() {
      try {
        // ── [MANUAL STORAGE TEST] Verify signed URL generation with known object ──
        const {
          data: manualData,
          error: manualError,
        } = await supabase.storage
          .from('question-images')
          .createSignedUrl(
            'questions/e97ebfd2-ca4d-4637-a583-1078568f1b2f/959d3fcc-f756-461d-8b89-950638ded9e6/cf428842-08d7-4c75-8da1-98d41f31638f.png',
            300,
          );
        console.log('[MANUAL STORAGE TEST] data:', manualData);
        console.log('[MANUAL STORAGE TEST] error:', manualError);

        setIsQuestionsLoading(true);
        const result = await getMockTestQuestions(testId, 'orderSequence', 'asc');
        if (!isMounted) return;

        if (!result.success || !result.data) {
          setQuestions([]);
          return;
        }

        // ── [STEP1] Log first MockTestQuestion and its snapshot ────────
        console.log('[STEP1] First MockTestQuestion:', JSON.stringify(result.data[0], null, 2));
        console.log('[STEP1] First questionSnapshot (images + options):', JSON.stringify(result.data[0]?.questionSnapshot, null, 2));

        // ── Collect all image references from snapshots and generate
        //    signed URLs. The snapshot is now the single source of truth
        //    for images — we no longer query the question_images table. ──

        // Collect unique image storage references across all questions
        const allStorageRefs: Array<{ bucket: string; path: string }> = [];
        const seenKeys = new Set<string>();

        for (const mtq of result.data) {
          const snap = mtq.questionSnapshot;
          if (!snap) continue;

          // Stem images
          if (snap.images) {
            for (const img of snap.images) {
              const key = imageStorageKey(img);
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                allStorageRefs.push({ bucket: img.storageBucket, path: img.storagePath });
              }
            }
          }

          // Per-option images
          if (snap.options) {
            for (const opt of snap.options) {
              if (opt.images) {
                for (const img of opt.images) {
                  const key = imageStorageKey(img);
                  if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    allStorageRefs.push({ bucket: img.storageBucket, path: img.storagePath });
                  }
                }
              }
            }
          }
        }

        // ── [IMG1] Log all collected storage references ────────────────
        console.log('[IMG1] allStorageRefs collected from snapshots:', JSON.stringify(allStorageRefs, null, 2));

        // Generate signed URLs for all unique images in parallel
        const signedUrlMap: Record<string, string> = {};
        const urlPromises: Promise<void>[] = [];

        for (const ref of allStorageRefs) {
          const compoundKey = `${ref.bucket}::${ref.path}`;
          // ── [SIGNED URL REQUEST] Log exact path with JSON.stringify to expose hidden whitespace ─
          console.log('[SIGNED URL REQUEST]');
          console.log('bucket =', ref.bucket);
          console.log('path   =', JSON.stringify(ref.path));
          console.log('length =', ref.path.length);

          const promise = supabase.storage
            .from(ref.bucket)
            .createSignedUrl(ref.path, 300)
            .then(({ data, error }) => {
              // ── [SIGNED URL RESPONSE] ────────────────────────────────
              console.log('[SIGNED URL RESPONSE]', data, error);
              if (data?.signedUrl) {
                signedUrlMap[compoundKey] = data.signedUrl;
              }
            });
          urlPromises.push(promise);
        }

        await Promise.all(urlPromises);

        // ── [IMG4] Log the complete signedUrlMap after all URLs resolved ─
        console.log('[IMG4] signedUrlMap after insert', JSON.stringify(signedUrlMap, null, 2));

        // Map questions with image URLs from the snapshot
        const mapped: QuestionDisplay[] = result.data.map(
          (mtq: MockTestQuestion, idx: number) => {
            // ── [IMG5] Log what's passed to mapper for this question ──
            console.log('[IMG5] signedUrlMap passed to mapper (full map):', JSON.stringify(signedUrlMap, null, 2));
            return mockTestQuestionToDisplay(mtq, idx, signedUrlMap);
          },
        );

        // ── [STEP3] Log first question passed to state (React batches
        //    setState, so state may not be immediately readable) ────────
        console.log('[STEP3] First mapped question (passed to setQuestions):', JSON.stringify(mapped[0], null, 2));
        console.log('[STEP3] All mapped question count:', mapped.length);

        setQuestions(mapped);
      } catch {
        if (isMounted) {
          setQuestions([]);
        }
      } finally {
        if (isMounted) {
          setIsQuestionsLoading(false);
        }
      }
    }
    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [testId]);



  // ── Timer ──────────────────────────────────────────────────────
  const timer = useTestTimer(
    durationMin * 60,
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
            console.log('[SUBMIT_STEP_1] TestEngineScreen.handleSubmitTest fired');
            console.log('[SUBMIT_STEP_1] testId:', testId);
            console.log('[SUBMIT_STEP_1] paperId:', paperId);
            const answerCount = Object.values(selectedOption).filter((v) => v !== null).length;
            console.log('[SUBMIT_STEP_1] answers (selected):', answerCount, 'out of', questions.length);
            console.log('[SUBMIT_STEP_1] answers map:', JSON.stringify(selectedOption));
            const timeTaken = durationMin * 60 - timer.timeRemaining;
            console.log('[SUBMIT_STEP_1] timeTakenSeconds:', timeTaken);
            try {
              const output = await testService.submitTest({
                testId,
                paperId,
                questions,
                answers: selectedOption,
                timeTakenSeconds: timeTaken,
              });
              console.log('[SUBMIT_STEP_9] submitTest succeeded:', JSON.stringify(output));

              // Check release status and navigate accordingly
              const statusCheck = await checkResultStatus(output.attemptId);
              console.log('[SUBMIT_STEP_10] Release status:', statusCheck.status);

              if (statusCheck.status === 'released') {
                // Result is available — go to result screen
                stackNavigation.reset({
                  index: 1,
                  routes: [
                    { name: 'MainTabs' },
                    { name: 'TestResult', params: { testId, attemptId: output.attemptId } },
                  ],
                });
              } else {
                // Result not yet released — go to success screen
                stackNavigation.reset({
                  index: 1,
                  routes: [
                    { name: 'MainTabs' },
                    { name: 'TestSubmitted', params: { testId, attemptId: output.attemptId } },
                  ],
                });
              }
            } catch (err) {
              console.log('[SUBMIT_STEP_ERROR] Submit failed. Complete error object:');
              console.log('[SUBMIT_STEP_ERROR] typeof err:', typeof err);
              if (err instanceof Error) {
                console.log('[SUBMIT_STEP_ERROR] name:', err.name);
                console.log('[SUBMIT_STEP_ERROR] message:', err.message);
                console.log('[SUBMIT_STEP_ERROR] stack:', err.stack);
                const errObj = err as unknown as Record<string, unknown>;
                if (errObj.cause) console.log('[SUBMIT_STEP_ERROR] cause:', errObj.cause);
              } else {
                console.log('[SUBMIT_STEP_ERROR] raw error:', JSON.stringify(err));
              }
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
        title={title ?? 'Practice Test'}
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
          {isQuestionsLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading questions...</Text>
            </View>
          ) : currentQuestion ? (
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
