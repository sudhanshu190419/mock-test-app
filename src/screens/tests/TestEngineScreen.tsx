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
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import { QuitDialog, SubmissionDialog } from '../../components/testEngine/TestModals';
import { MCQPanel, MSQPanel, NumericalPanel } from '../../components/testEngine/AnswerPanel';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useTestTimer } from '../../hooks/useTestTimer';
import * as testService from '../../services/testEngineService';
import { checkResultStatus } from '../../services/resultService';
import { supabase } from '../../config/supabase';
import { getMockTestQuestions } from '../../services/mockTest/mockTestQuestionService';
import { getMockAnswers, getMockAttemptById, updateMockAnswer as updateMockAnswerService } from '../../services/mockTest/mockAttemptService';
import { enqueuePersist, clearAllPersistQueues, drainAllPersistQueues } from '../../services/persistenceQueue';
import { startTimerSync, stopTimerSync, syncTimerOnce } from '../../services/timerSyncService';
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
    index: _arrayIndex + 1,
    text: snapshot?.questionText ?? '',
    options,
    imageUrl: stemImageUrl,
    imageAlt: stemImageAlt,
    marks: snapshot?.marks ?? mtq.marks,
    negativeMarks:
      snapshot?.negativeMarks ?? (mtq.negativeMarksOverride ?? 0),
    sectionName: mtq.sectionName ?? undefined,
    questionType: snapshot?.questionType ?? 'mcq',
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
  const { testId, paperId, durationMin  } = route.params;
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= DESKTOP_BREAKPOINT;

  // ── Attempt Initialization ────────────────────────────────────
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>(undefined);
  const [isRetaking, setIsRetaking] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);
  const [expiredAttemptId, setExpiredAttemptId] = useState<string | null>(null);

  // ── State ──────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuestionDisplay[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<Record<number, string | string[] | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());

  const [isPaletteVisible, setIsPaletteVisible] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'local'>('saved');
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [isRetryingSubmission, setIsRetryingSubmission] = useState(false);

  // ── Refs for live persistence (always hold the latest value) ────
  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;
  const markedForReviewRef = useRef(markedForReview);
  markedForReviewRef.current = markedForReview;
  const selectedOptionRef = useRef(selectedOption);
  selectedOptionRef.current = selectedOption;
  const answerIdByQuestionIdRef = useRef<Map<string, string>>(new Map());

  // ── Refs for resume data (Phase 4) ──────────────────────────
  // Populated by the init effect when `reused=true`. Applied in the
  // answer map effect once questions are loaded and indices can be
  // mapped from questionIds.
  const resumeDataRef = useRef<import('../../types/testEngine').ResumeData | null>(null);
  /** Server-corrected remaining seconds for crash-safe timer recovery (Phase 4.5). */
  const effectiveRemainingRef = useRef<number | null>(null);

  // ── Refs for per-question time tracking ─────────────────────
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const accumulatedTimeRef = useRef<Map<string, number>>(new Map());
  const lastSwitchTimestampRef = useRef<number>(0);

  const scrollRef = useRef<ScrollView>(null);
  const handleSubmitTestRef = useRef<(() => void) | undefined>(undefined);
  const handleAutoSubmitRef = useRef<(() => void) | undefined>(undefined);
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // ── Derived state ──────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const answeredIndices = useMemo(() => {
    const indices = new Set<number>();
    for (const [index, val] of Object.entries(selectedOption)) {
      if (val !== null && val !== undefined && (typeof val !== 'string' || val !== '')) {
        if (!Array.isArray(val) || val.length > 0) {
          indices.add(Number(index));
        }
      }
    }
    return indices;
  }, [selectedOption]);

  const answerProgress = questions.length > 0 ? answeredIndices.size / questions.length : 0;

  // ── Initialize attempt on mount ─────────────────────────────────
  // Phase 1 / 1.5: Creates a real mock_attempt in the DB (or reuses
  // an existing in_progress one) and pre-populates mock_answers.
  // Phase 4: If the attempt is being *reused* (student crashed / closed
  // and returned), also loads the full resume data (answers, timer,
  // current question, review flags, question timing).
  //
  // Resume data is stored in a ref and applied once questions load.
  useEffect(() => {
    let isMounted = true;

    async function init() {
      console.log('[TEST_ENGINE] Initializing attempt for testId:', testId);
      setIsInitializing(true);
      setInitError(null);

      const result = await testService.initializeAttempt(testId);

      if (!isMounted) return;

      if (result.success) {
        const {
          attemptId: newAttemptId,
          reused,
          effectiveRemainingSeconds,
          isExpired: expired,
        } = result.data;

        console.log('[TEST_ENGINE] Attempt initialized, attemptId:', newAttemptId,
          'reused:', reused, 'effectiveRemainingSeconds:', effectiveRemainingSeconds,
          'isExpired:', expired);

        // Phase 4.5: If the server says the timer expired during the crash,
        // show the expired screen instead of letting the student enter.
        // Save remainingAttempts so the UI can offer "Start Another Attempt"
        // or show "No attempts remaining".
        if (expired) {
          setIsExpired(true);
          setRemainingAttempts(result.data.remainingAttempts);
          setExpiredAttemptId(newAttemptId);
          setIsInitializing(false);
          return;
        }

        setAttemptId(newAttemptId);

        if (reused) {
          // Phase 4: Load persisted answers, current question, etc.
          // Phase 4.5: Timer value comes from the server-corrected RPC,
          // NOT from the stale DB value.
          console.log('[TEST_ENGINE] Loading resume data...');
          const resumeResult = await testService.loadResumeData(newAttemptId);
          if (isMounted) {
            if (resumeResult.success) {
              resumeDataRef.current = resumeResult.data;
              // Store the server-corrected remaining time for crash-safe recovery
              if (effectiveRemainingSeconds !== undefined) {
                effectiveRemainingRef.current = effectiveRemainingSeconds;
              }
              console.log('[TEST_ENGINE] Resume data loaded:', {
                timeRemainingSeconds: resumeResult.data.timeRemainingSeconds,
                effectiveRemainingSeconds,
                lastQuestionId: resumeResult.data.lastQuestionId,
                answerCount: resumeResult.data.answersByQuestionId.size,
              });
            } else {
              console.log('[TEST_ENGINE] Resume data load failed, starting fresh:', resumeResult.error);
            }
          }
        }

        setIsInitializing(false);
      } else {
        console.log('[TEST_ENGINE] Initialization failed:', result.error);
        setInitError(result.error);
        setIsInitializing(false);
      }
    }

    init();
    return () => { isMounted = false; };
  }, [testId]);

  // ── Load questions after initialization succeeds ─────────────
  useEffect(() => {
    if (!attemptId) return; // Wait for initialization

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
  }, [testId, attemptId]);

  // ── Load answerId map + initial question times after questions load ──
  // This data is needed by persistAnswerLive() and the question time tracker.
  //
  // Phase 4: If resume data is present, also restores:
  //   - Answer selections (from DB -> index-based state)
  //   - Marked-for-review flags
  //   - Current question (from lastQuestionId)
  //   - Question timing
  //   - Timer remaining seconds
  //   - Visited questions
  useEffect(() => {
    if (!attemptId || isQuestionsLoading) return;

    let isMounted = true;
    async function loadRuntimeData() {
      const result = await getMockAnswers({ attemptId: attemptId! });
      if (!isMounted) return;

      if (result.success && result.data) {
        const idMap = new Map<string, string>();
        const timeMap = new Map<string, number>();
        for (const ans of result.data) {
          idMap.set(ans.questionId, ans.answerId);
          timeMap.set(ans.questionId, ans.timeSpentSeconds);
        }
        answerIdByQuestionIdRef.current = idMap;
        accumulatedTimeRef.current = timeMap;
        lastSwitchTimestampRef.current = Date.now();
        console.log('[ANSWER_MAP] Loaded', idMap.size, 'answer IDs + times');
      }

      // ── Phase 4: Apply resume data if present ───────────────────
      const rd = resumeDataRef.current;
      if (!rd) return;

      console.log('[RESUME] Applying resume data...');
      resumeDataRef.current = null; // Clear so it only fires once

      const restoredSelectedOption: Record<number, string | string[] | null> = {};
      const restoredMarkedForReview = new Set<number>();
      const restoredVisited = new Set<number>();

      // Get questions from the current render cycle
      const currentQuestions = questionsRef.current;

      for (let i = 0; i < currentQuestions.length; i++) {
        const q = currentQuestions[i];
        const answer = rd.answersByQuestionId.get(q.id);
        if (!answer) continue;

        // Mark as visited if there's any persisted state
        if (answer.isAnswered || answer.isMarkedForReview || (answer.numericalAnswer !== null)) {
          restoredVisited.add(i);
        }

        // Restore review flag
        if (answer.isMarkedForReview) {
          restoredMarkedForReview.add(i);
        }

        // Restore answer selection
        if (!answer.isAnswered) continue;

        const qType = q.questionType ?? 'mcq';
        if (qType === 'msq') {
          restoredSelectedOption[i] = answer.selectedOptionIds;
        } else if (qType === 'numerical') {
          restoredSelectedOption[i] = answer.numericalAnswer?.toString() ?? null;
        } else {
          // MCQ / True-False
          restoredSelectedOption[i] = answer.selectedOptionIds[0] ?? null;
        }
      }

      // Restore current question from lastQuestionId
      let restoredIndex = 0;
      if (rd.lastQuestionId) {
        const idx = currentQuestions.findIndex((q) => q.id === rd.lastQuestionId);
        if (idx >= 0) restoredIndex = idx;
      }
      restoredVisited.add(restoredIndex);

      console.log('[RESUME] Restoring:', {
        currentIndex: restoredIndex,
        answeredCount: Object.keys(restoredSelectedOption).length,
        markedCount: restoredMarkedForReview.size,
        visitedCount: restoredVisited.size,
        timeRemainingSeconds: rd.timeRemainingSeconds,
        lastQuestionId: rd.lastQuestionId,
      });

      try {
        const stored = await AsyncStorage.getItem(`attempt_answers_${attemptId}`);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          console.log('[RESUME] Found local AsyncStorage cache, merging...');
          Object.assign(restoredSelectedOption, parsed.selectedOption || {});
          if (parsed.markedForReview) {
            parsed.markedForReview.forEach((idx: number) => restoredMarkedForReview.add(idx));
          }
          if (parsed.visitedQuestions) {
            parsed.visitedQuestions.forEach((idx: number) => restoredVisited.add(idx));
          }
          if (parsed.bookmarks) {
            setBookmarks(new Set(parsed.bookmarks));
          }
        }
      } catch (err) {
        console.log('[RESUME] Failed to merge local AsyncStorage cache:', err);
      }

      // Batch all state updates
      setSelectedOption(restoredSelectedOption);
      setMarkedForReview(restoredMarkedForReview);
      setVisitedQuestions(restoredVisited);
      setCurrentIndex(restoredIndex);

      // Restore timer — use server-corrected value when available
      // (Phase 4.5: RPC computes effective remaining time accounting for
      // wall-clock elapsed during the crash gap).
      const serverCorrected = effectiveRemainingRef.current;
      const timerValue = serverCorrected !== null ? serverCorrected : rd.timeRemainingSeconds;
      effectiveRemainingRef.current = null; // Clear so it only applies once

      if (timerValue > 0) {
        timerRef.current.reset(timerValue);
      }
    }

    loadRuntimeData();
    return () => { isMounted = false; };
  }, [attemptId, isQuestionsLoading]);

  // Trigger auto-save whenever answer state changes
  useEffect(() => {
    if (isQuestionsLoading || questions.length === 0 || !attemptId) return;

    let isMounted = true;
    async function saveAttempt() {
      setAutoSaveStatus('saving');
      try {
        const payload = {
          selectedOption,
          markedForReview: Array.from(markedForReview),
          visitedQuestions: Array.from(visitedQuestions),
          bookmarks: Array.from(bookmarks),
        };
        await AsyncStorage.setItem(`attempt_answers_${attemptId}`, JSON.stringify(payload));
        if (isMounted) {
          setAutoSaveStatus('saved');
        }
      } catch (err) {
        console.log('AutoSave failed', err);
        if (isMounted) {
          setAutoSaveStatus('local');
        }
      }
    }

    const saveTimer = setTimeout(saveAttempt, 800); // debounce saves by 800ms
    return () => {
      isMounted = false;
      clearTimeout(saveTimer);
    };
  }, [selectedOption, markedForReview, visitedQuestions, bookmarks, attemptId, isQuestionsLoading, questions.length]);



  // ── Persist lastQuestionId on every navigation ────────────────
  // Whenever the student moves to a different question, save the new
  // question ID to mock_attempts.lastQuestionId so the resume flow
  // can restore their position after crash or app close.
  // Fire-and-forget — errors are logged but never block navigation.
  useEffect(() => {
    const aid = attemptIdRef.current;
    if (!aid || questions.length === 0) return;
    const q = questions[currentIndex];
    if (!q) return;

    testService.updateLastQuestionId(aid, q.id);
  }, [currentIndex, questions]);

  // ── Cleanup on unmount ─────────────────────────────────────────
  // Release queue resources and stop timer sync to prevent memory leaks.
  useEffect(() => {
    return () => {
      stopTimerSync();
      clearAllPersistQueues();
      resumeDataRef.current = null;
      effectiveRemainingRef.current = null;
      handleAutoSubmitRef.current = undefined;
    };
  }, []);

  // ── Timer ──────────────────────────────────────────────────────
  // The onTimeUp callback fires when the countdown reaches zero.
  // It invokes the auto-submit handler (Phase 5), NOT the manual
  // submit handler.  This ensures timer expiry always triggers
  // an automatic submission regardless of UI state.
  const timer = useTestTimer(
    durationMin * 60,
    () => handleAutoSubmitRef.current?.(),
  );
  // Timer refs (avoid stale closures in effects with [] deps)
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const timeRemainingRef = useRef(timer.timeRemaining);
  timeRemainingRef.current = timer.timeRemaining;

  // ── Start timer sync when attempt is ready ───────────────────────
  // Depends only on attemptId — uses timerRef to avoid re-running
  // on every timer tick (timer.timeRemaining changes every second).
  useEffect(() => {
    if (!attemptId) return;
    startTimerSync({
      attemptId,
      getTimeRemaining: () => timerRef.current.timeRemaining,
      onStatusChange: (status) => setAutoSaveStatus(status),
    });
    return () => {
      stopTimerSync();
    };
  }, [attemptId]);

  // ── Per-Question Time Tracking ───────────────────────────────────
  // Accumulates time per question in memory.  Flushes to the DB only
  // on navigation, background, and submit.
  //
  // flushCurrentQuestionTime() must be called BEFORE changing currentIndex.

  function flushCurrentQuestionTime(): void {
    const q = questionsRef.current[currentIndexRef.current];
    if (!q || !attemptIdRef.current) return;
    const answerId = answerIdByQuestionIdRef.current.get(q.id);
    if (!answerId) return;

    const now = Date.now();
    const elapsed = Math.floor((now - lastSwitchTimestampRef.current) / 1000);
    lastSwitchTimestampRef.current = now;

    if (elapsed <= 0) return;

    const prevTotal = accumulatedTimeRef.current.get(q.id) ?? 0;
    const newTotal = prevTotal + elapsed;
    accumulatedTimeRef.current.set(q.id, newTotal);

    enqueuePersist(answerId, async () => {
      await updateMockAnswerService(answerId, { timeSpentSeconds: newTotal });
    });
  }

  function flushAllQuestionTimes(): void {
    // Flush the current question (captures any time on the current view)
    flushCurrentQuestionTime();
    // All accumulated times are already enqueued via flushCurrentQuestionTime
    // or were already persisted on previous navigations.
  }

  // ── AppState Listener (background / foreground) ───────────────────
  // Uses refs exclusively to avoid stale closures ([] deps is intentional).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        // Flush current question time so it's not lost if the app is killed
        flushCurrentQuestionTime();
        // Sync remaining time to server using the ref (not stale closure)
        const aid = attemptIdRef.current;
        if (aid) {
          syncTimerOnce(aid, timeRemainingRef.current);
        }
      } else if (nextState === 'active') {
        // App came back to foreground — reset the switch timestamp so
        // background time is not counted as time spent on the question.
        lastSwitchTimestampRef.current = Date.now();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live Persistence Helper (Queue-based) ──────────────────────
  // Every persist goes through enqueuePersist() which serialises
  // operations per answerId — only one in-flight at a time, latest
  // state always wins, no race conditions (see Phase 2.5).
  //
  // Reads from refs so closures never go stale.

  function persistCurrentAnswer(value: string | string[] | null) {
    const aid = attemptIdRef.current;
    const q = questions[currentIndex];
    if (!aid || !q) return;
    const answerId = answerIdByQuestionIdRef.current.get(q.id);
    if (!answerId) return;
    const isMarked = markedForReviewRef.current.has(currentIndex);

    enqueuePersist(answerId, async () => {
      const result = await testService.persistAnswerLive({
        answerId,
        questionType: q.questionType ?? 'mcq',
        value,
        isMarkedForReview: isMarked,
      });

      if (!result.success) {
        console.log('[PERSIST] Failed:', result.error);
        setAutoSaveStatus('local');
      } else {
        setAutoSaveStatus('saved');
      }
    });
  }

  function persistCurrentReviewFlag(isMarked: boolean) {
    const aid = attemptIdRef.current;
    const q = questions[currentIndex];
    if (!aid || !q) return;
    const answerId = answerIdByQuestionIdRef.current.get(q.id);
    if (!answerId) return;

    enqueuePersist(answerId, async () => {
      const result = await updateMockAnswerService(answerId, {
        isMarkedForReview: isMarked,
      });

      if (!result.success) {
        console.log('[PERSIST] Review flag persist failed:', result.error);
        setAutoSaveStatus('local');
      }
    });
  }

  // ── Handlers ───────────────────────────────────────────────────

  const handleOptionSelect = useCallback(
    (value: string | string[]) => {
      if (isSubmitted) return;
      setSelectedOption((prev) => ({
        ...prev,
        [currentIndex]: value,
      }));
      // Immediately persist to DB (fire-and-forget)
      persistCurrentAnswer(value);
    },
    [currentIndex, isSubmitted, questions, attemptId],
  );

  const handleToggleReview = useCallback(() => {
    if (isSubmitted) return;
    const newIsMarked = !markedForReview.has(currentIndex);
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
    // Persist review flag immediately
    persistCurrentReviewFlag(newIsMarked);
  }, [currentIndex, isSubmitted, markedForReview, questions, attemptId]);

  const handleToggleBookmark = useCallback(() => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  }, [currentIndex]);

  const handleClear = useCallback(() => {
    if (isSubmitted) return;
    setSelectedOption((prev) => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    // Persist the cleared state (null value = isAnswered = false)
    persistCurrentAnswer(null);
  }, [currentIndex, isSubmitted, questions, attemptId]);

  const handleMarkForReview = useCallback(() => {
    if (isSubmitted) return;
    // Flush time for the current question before navigating
    flushCurrentQuestionTime();
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
    // Persist review flag immediately
    persistCurrentReviewFlag(true);
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      markVisited(newIndex);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      setShowSubmitDialog(true);
    }
  }, [currentIndex, questions.length, isSubmitted, markedForReview, questions, attemptId]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      // Flush time for the current question before navigating
      flushCurrentQuestionTime();
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      markVisited(newIndex);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [currentIndex]);

  const handleSaveAndNext = useCallback(() => {
    if (isSubmitted) return;
    // Flush time for the current question before navigating
    flushCurrentQuestionTime();
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    // Persist the removed review flag
    persistCurrentReviewFlag(false);
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      markVisited(newIndex);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      setShowSubmitDialog(true);
    }
  }, [currentIndex, questions.length, isSubmitted, markedForReview, questions, attemptId]);

  const handleQuestionSelect = useCallback(
    (index: number) => {
      // Flush time for the current question before jumping
      flushCurrentQuestionTime();
      setCurrentIndex(index);
      markVisited(index);
      setIsPaletteVisible(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [],
  );


  const handleOpenPalette = useCallback(() => {
    setIsPaletteVisible(true);
  }, []);

  const handleClosePalette = useCallback(() => {
    setIsPaletteVisible(false);
  }, []);

  const handleExitPress = useCallback(() => {
    setShowQuitDialog(true);
  }, []);

  const handleSubmitPress = useCallback(() => {
    setShowSubmitDialog(true);
  }, []);

  const handleConfirmQuit = useCallback(async () => {
    setShowQuitDialog(false);
    const aid = attemptId || attemptIdRef.current;
    try {
      if (aid) {
        await AsyncStorage.removeItem(`attempt_answers_${aid}`);
      }
    } catch (e) {
      console.log('Error cleaning up local storage', e);
    }
    navigation.goBack();
  }, [attemptId, navigation]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!attemptId) {
      Alert.alert('Error', 'Test not properly initialized. Please try again.');
      return;
    }

    setShowSubmitDialog(false);
    setIsSubmitted(true);

    // ── Final timing flush before submit ─────────────────────────
    // 1. Flush current question's accumulated time to the DB
    flushAllQuestionTimes();
    // 2. Stop periodic timer sync
    stopTimerSync();
    // 3. Sync the final remaining time to the server
    syncTimerOnce(attemptId, timer.timeRemaining);

    timer.pause();

    const timeTaken = durationMin * 60 - timer.timeRemaining;
    try {
      const output = await testService.submitTest({
        attemptId,
        testId,
        paperId,
        questions,
        answers: selectedOption,
        timeTakenSeconds: timeTaken,
        markedForReviewIndices: Array.from(markedForReview),
      });

      try {
        await AsyncStorage.removeItem(`attempt_answers_${attemptId}`);
      } catch (e) {
        console.log('Error cleaning up local storage', e);
      }

      const statusCheck = await checkResultStatus(output.attemptId);
      if (statusCheck.status === 'released') {
        stackNavigation.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            { name: 'TestResult', params: { testId, attemptId: output.attemptId } },
          ],
        });
      } else {
        stackNavigation.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            { name: 'TestSubmitted', params: { testId, attemptId: output.attemptId } },
          ],
        });
      }
    } catch (err) {
      console.log('Submit failed', err);
      Alert.alert('Error', 'Failed to submit test. Please try again.');
      setIsSubmitted(false);
    }
  }, [selectedOption, markedForReview, questions, testId, paperId, timer, stackNavigation, durationMin, attemptId]);

  // ── Auto-Submit Handler (Phase 5 — with Retry) ──────────────────
  // Called by useTestTimer's onTimeUp when the countdown reaches zero.
  // Drains the persistence queue, flushes final timing, then submits
  // with up to 3 retries using exponential backoff (1s, 2s, 4s).
  //
  // If all retries fail, verifies server-side submission status.
  //   - If confirmed submitted → navigates to result screen.
  //   - If not confirmed → shows recovery screen explaining answers
  //     are safely stored and the app will recover when reopened.
  //
  // Retries are safe because submitTest() is idempotent — duplicate
  // calls return the existing result without re-evaluation.
  const handleAutoSubmit = useCallback(async () => {
    if (!attemptId || isSubmitted) {
      console.log('[AUTO_SUBMIT] Skipping — already submitted or no attemptId');
      return;
    }

    console.log('[AUTO_SUBMIT] Timer expired, auto-submitting attempt:', attemptId);
    setIsAutoSubmitting(true);
    setIsSubmitted(true);
    setShowSubmitDialog(false);
    setShowQuitDialog(false);
    setRetryAttempt(0);
    setSubmitFailed(false);

    // ── 1. Drain the persistence queue ──────────────────────────
    console.log('[AUTO_SUBMIT] Draining persistence queue...');
    try {
      await drainAllPersistQueues();
      console.log('[AUTO_SUBMIT] Queue drained successfully');
    } catch (drainErr) {
      console.log('[AUTO_SUBMIT] Queue drain warning (non-fatal):', drainErr);
    }

    // ── 2. Final timing flush ───────────────────────────────────
    flushAllQuestionTimes();
    stopTimerSync();
    syncTimerOnce(attemptId, 0);
    timer.pause();

    // ── 3. Submit with retry loop ───────────────────────────────
    const MAX_RETRIES = 4;
    const RETRY_DELAYS = [1_000, 2_000, 4_000]; // Exponential backoff: 1s, 2s, 4s
    const timeTaken = durationMin * 60;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      setRetryAttempt(attempt);

      // Wait before retrying (skip delay for the first attempt)
      if (attempt > 1) {
        const delayMs = RETRY_DELAYS[attempt - 2] ?? 4_000;
        console.log('[AUTO_SUBMIT] Retry', attempt, 'of', MAX_RETRIES, 'in', delayMs, 'ms...');
        await new Promise<void>((r) => { setTimeout(() => r(), delayMs); });
      }

      try {
        console.log('[AUTO_SUBMIT] Submit attempt', attempt, 'of', MAX_RETRIES);
        const output = await testService.submitTest({
          attemptId,
          testId,
          paperId,
          questions,
          answers: selectedOption,
          timeTakenSeconds: timeTaken,
          markedForReviewIndices: Array.from(markedForReview),
        });

        console.log('[AUTO_SUBMIT] Submit succeeded on attempt', attempt, ':', output);

        try {
          await AsyncStorage.removeItem(`attempt_answers_${attemptId}`);
        } catch (e) {
          console.log('Error cleaning up local storage', e);
        }

        const statusCheck = await checkResultStatus(output.attemptId);
        if (statusCheck.status === 'released') {
          stackNavigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'TestResult', params: { testId, attemptId: output.attemptId } },
            ],
          });
        } else {
          stackNavigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'TestSubmitted', params: { testId, attemptId: output.attemptId } },
            ],
          });
        }
        return; // Exit handler — retry loop succeeded
      } catch (err) {
        lastError = err;
        console.log('[AUTO_SUBMIT] Submit attempt', attempt, 'failed:', err);
        // Fall through to retry or exhaustion
      }
    }

    // ── 4. All retries exhausted — verify server state ──────────
    console.log('[AUTO_SUBMIT] All', MAX_RETRIES, 'retries exhausted. Verifying server state...');
    console.log('[AUTO_SUBMIT] Last error:', lastError);

    try {
      const verifyResult = await getMockAttemptById(attemptId);
      if (
        verifyResult.success &&
        verifyResult.data &&
        (verifyResult.data.status === 'submitted' || verifyResult.data.status === 'timed_out')
      ) {
        console.log('[AUTO_SUBMIT] Server-side submission confirmed — navigating to result.');
        try {
          await AsyncStorage.removeItem(`attempt_answers_${attemptId}`);
        } catch (e) {
          console.log('Error cleaning up local storage', e);
        }
        const statusCheck = await checkResultStatus(attemptId);
        if (statusCheck.status === 'released') {
          stackNavigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'TestResult', params: { testId, attemptId } },
            ],
          });
        } else {
          stackNavigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'TestSubmitted', params: { testId, attemptId } },
            ],
          });
        }
        return; // Exit — student is now on the result screen
      }
    } catch (verifyErr) {
      console.log('[AUTO_SUBMIT] Verification also failed:', verifyErr);
    }

    // ── 5. Server-side submission did NOT complete ──────────────
    // Answers are safely stored in the database. The attempt remains
    // in_progress. The student can close the app and the auto-close
    // RPC will finalize the attempt on the next resume.
    console.log('[AUTO_SUBMIT] Submission could not be confirmed — showing recovery screen.');
    setIsAutoSubmitting(false);
    setSubmitFailed(true);
  }, [
    attemptId, isSubmitted, testId, paperId, questions,
    selectedOption, markedForReview, timer, stackNavigation, durationMin,
  ]);

  // ── Manual Retry Submission Handler ──────────────────────────────
  // Called when the student taps "Retry Submission" on the recovery
  // screen after all automatic retries have been exhausted.
  //
  // Reuses the same submission pipeline: submitTest() → verify → navigate.
  // Safe to call multiple times because submitTest() is idempotent.
  const handleRetrySubmission = useCallback(async () => {
    if (!attemptId) {
      console.log('[RETRY_SUBMIT] No attemptId — cannot retry.');
      return;
    }

    console.log('[RETRY_SUBMIT] Manual retry requested for attempt:', attemptId);
    setIsRetryingSubmission(true);

    try {
      const output = await testService.submitTest({
        attemptId,
        testId,
        paperId,
        questions,
        answers: selectedOption,
        timeTakenSeconds: durationMin * 60,
        markedForReviewIndices: Array.from(markedForReview),
      });

      console.log('[RETRY_SUBMIT] Submit succeeded:', output);

      try {
        await AsyncStorage.removeItem(`attempt_answers_${attemptId}`);
      } catch (e) {
        console.log('Error cleaning up local storage', e);
      }

      const statusCheck = await checkResultStatus(output.attemptId);
      if (statusCheck.status === 'released') {
        stackNavigation.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            { name: 'TestResult', params: { testId, attemptId: output.attemptId } },
          ],
        });
      } else {
        stackNavigation.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            { name: 'TestSubmitted', params: { testId, attemptId: output.attemptId } },
          ],
        });
      }
      return; // Exit — student is now on the result screen
    } catch (err) {
      console.log('[RETRY_SUBMIT] Manual retry failed:', err);
    }

    // ── Retry failed — verify server state ─────────────────────
    console.log('[RETRY_SUBMIT] Manual retry failed. Verifying server state...');
    try {
      const verifyResult = await getMockAttemptById(attemptId);
      if (
        verifyResult.success &&
        verifyResult.data &&
        (verifyResult.data.status === 'submitted' || verifyResult.data.status === 'timed_out')
      ) {
        console.log('[RETRY_SUBMIT] Server-side submission confirmed — navigating to result.');
        try {
          await AsyncStorage.removeItem(`attempt_answers_${attemptId}`);
        } catch (e) {
          console.log('Error cleaning up local storage', e);
        }
        const statusCheck = await checkResultStatus(attemptId);
        if (statusCheck.status === 'released') {
          stackNavigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'TestResult', params: { testId, attemptId } },
            ],
          });
        } else {
          stackNavigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs' },
              { name: 'TestSubmitted', params: { testId, attemptId } },
            ],
          });
        }
        return;
      }
    } catch (verifyErr) {
      console.log('[RETRY_SUBMIT] Verification also failed:', verifyErr);
    }

    // Still not confirmed — remain on recovery screen
    console.log('[RETRY_SUBMIT] Still could not confirm submission — staying on recovery screen.');
    setIsRetryingSubmission(false);
  }, [
    attemptId, testId, paperId, questions,
    selectedOption, markedForReview, stackNavigation, durationMin,
  ]);

  // Sync refs so callbacks always have the latest handler.
  useEffect(() => {
    handleSubmitTestRef.current = handleConfirmSubmit;
  }, [handleConfirmSubmit]);

  useEffect(() => {
    handleAutoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  // ── Start Another Attempt Handler ───────────────────────────────
  // Called when the student taps "Start Another Attempt" on the expired
  // screen.  Calls initializeAttempt() again — the RPC will find no
  // in_progress attempt (the expired one was already closed) and create
  // a fresh attempt (or return ATTEMPT_LIMIT_REACHED if exhausted).
  const handleStartAnotherAttempt = useCallback(async () => {
    setIsRetaking(true);
    setRetakeError(null);

    // Flush any pending persist operations for the expired attempt.
    // New answers will use a different attemptId, so old queue entries
    // would only generate unnecessary DB traffic against the timed_out attempt.
    clearAllPersistQueues();

    try {
      const result = await testService.initializeAttempt(testId);

      if (result.success) {
        // Reset all state to enter the test fresh
        setIsExpired(false);
        setRemainingAttempts(undefined);
        setRetakeError(null);
        setIsRetaking(false);

        // Reset timer to full duration
        timerRef.current.reset(durationMin * 60);

        // Set the new attemptId — the questions loading effect will fire
        setAttemptId(result.data.attemptId);
        setIsInitializing(false);

        // Reset answer state
        setSelectedOption({});
        setMarkedForReview(new Set());
        setVisitedQuestions(new Set([0]));
        setBookmarks(new Set());
        setCurrentIndex(0);
        setIsSubmitted(false);
        setIsQuestionsLoading(true);
      } else {
        setRetakeError(result.error ?? 'Failed to start a new attempt. Please try again.');
        setIsRetaking(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setRetakeError(msg);
      setIsRetaking(false);
    }
  }, [testId, durationMin]);

  function markVisited(index: number) {
    setVisitedQuestions((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }

  // ── Accessibility ──────────────────────────────────────────────


  // ── Initialization Error Screen ───────────────────────────────
  if (initError) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIconContainer}>
          <Text style={styles.errorIconText}>!</Text>
        </View>
        <Text style={styles.errorTitle}>Unable to Start Test</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <TouchableOpacity
          style={styles.goBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Expired Test Screen (Phase 4.5 + retake support) ──────────
  // The server detected that the timer expired while the student was
  // away (crash / app close) and auto-closed the attempt to 'timed_out'.
  // Show context-sensitive actions based on remaining attempts.
  //
  // remainingAttempts:
  //   - undefined → not yet computed (shouldn't happen)
  //   - -1        → unlimited retakes available
  //   - 0         → no retakes remaining
  //   - > 0       → student can retake this many more times
  if (isExpired) {
    const canRetake = remainingAttempts === -1 || (remainingAttempts !== undefined && remainingAttempts > 0);

    return (
      <View style={styles.centerContainer}>
        {/* Loading overlay while retaking */}
        {isRetaking && (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.retakingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.retakingText}>Starting new attempt...</Text>
            </View>
          </View>
        )}

        <View style={[styles.errorIconContainer, { backgroundColor: '#FFF7ED' }]}>
          <Text style={[styles.errorIconText, { color: '#EA580C' }]}>⏰</Text>
        </View>
        <Text style={styles.errorTitle}>Test Time Expired</Text>

        {canRetake ? (
          <Text style={styles.errorMessage}>
            Your time for this test has expired while you were away.{'\n\n'}
            {remainingAttempts === -1
              ? 'You can start a new attempt.'
              : `You have ${remainingAttempts} attempt(s) remaining.`}
          </Text>
        ) : (
          <Text style={styles.errorMessage}>
            Your time for this test has expired while you were away.{'\n\n'}
            You have used all allowed attempts for this test.
          </Text>
        )}

        {retakeError && (
          <Text style={styles.retakeErrorText}>{retakeError}</Text>
        )}

        <View style={styles.expiredButtonContainer}>
          {canRetake && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartAnotherAttempt}
              activeOpacity={0.85}
              disabled={isRetaking}
              accessibilityLabel="Start another attempt"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Start Another Attempt</Text>
            </TouchableOpacity>
          )}

          {!canRetake && expiredAttemptId && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={async () => {
                const statusCheck = await checkResultStatus(expiredAttemptId);
                if (statusCheck.status === 'released') {
                  stackNavigation.reset({
                    index: 1,
                    routes: [
                      { name: 'MainTabs' },
                      { name: 'TestResult', params: { testId, attemptId: expiredAttemptId } },
                    ],
                  });
                } else if (statusCheck.status !== 'not_found') {
                  stackNavigation.reset({
                    index: 1,
                    routes: [
                      { name: 'MainTabs' },
                      { name: 'TestSubmitted', params: { testId, attemptId: expiredAttemptId } },
                    ],
                  });
                } else {
                  // No result found — navigate to dashboard instead
                  navigation.goBack();
                }
              }}
              activeOpacity={0.85}
              accessibilityLabel="View result"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>View Result</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={canRetake ? styles.secondaryButton : styles.primaryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            accessibilityLabel="Back to dashboard"
            accessibilityRole="button"
          >
            <Text style={canRetake ? styles.secondaryButtonText : styles.primaryButtonText}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Initialization Loading Screen ──────────────────────────────
  if (isInitializing) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.initializingText}>Preparing your test...</Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  const contentPaddingTop = spacing[16];
  const contentPaddingBottom = isDesktop ? spacing[16] : BOTTOM_BAR_HEIGHT + spacing[24];

  return (
    <View style={styles.screen}>
      {/* ═══ Header ═══ */}
      <TestHeader
        onExitPress={handleExitPress}
        onSubmitPress={handleSubmitPress}
        autoSaveStatus={autoSaveStatus}
        timeRemainingSeconds={timer.timeRemaining}
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
            <View style={{ gap: spacing[12] }}>
              {/* Question stem, tags, indices */}
              <QuestionCard
                question={currentQuestion}
                totalQuestions={questions.length}
                isBookmarked={bookmarks.has(currentIndex)}
                onToggleBookmark={handleToggleBookmark}
              />

              {/* MCQ Panel option selector */}
              {currentQuestion.questionType === 'mcq' && (
                <MCQPanel
                  question={currentQuestion}
                  value={selectedOption[currentIndex] as string | null}
                  onChange={handleOptionSelect}
                  disabled={isSubmitted}
                />
              )}

              {/* MSQ Panel checkbox option selector */}
              {currentQuestion.questionType === 'msq' && (
                <MSQPanel
                  question={currentQuestion}
                  value={(selectedOption[currentIndex] as string[]) || []}
                  onChange={handleOptionSelect}
                  disabled={isSubmitted}
                />
              )}

              {/* Numerical Panel keypad selector */}
              {currentQuestion.questionType === 'numerical' && (
                <NumericalPanel
                  value={(selectedOption[currentIndex] as string) || ''}
                  onChange={handleOptionSelect}
                  disabled={isSubmitted}
                />
              )}
            </View>
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

        {/* ── Desktop Palette sidebar ── */}
        {isDesktop && (
          <View style={styles.paletteDesktop}>
            <QuestionPalette
              questions={questions}
              selectedOptions={selectedOption}
              markedForReview={markedForReview}
              visitedQuestions={visitedQuestions}
              currentIndex={currentIndex}
              onQuestionSelect={handleQuestionSelect}
              open={true}
              onClose={() => {}}
              isSidebar
            />
          </View>
        )}
      </View>

      {/* ═══ Mobile Bottom Bar ═══ */}
      {!isDesktop && !isSubmitted && (
        <BottomActionBar
          currentIndex={currentIndex}
          totalQuestions={questions.length}
          answeredCount={answeredIndices.size}
          onPrev={handlePrevious}
          onNext={handleSaveAndNext}
          onClear={handleClear}
          onMarkForReview={handleMarkForReview}
          onSaveAndNext={handleSaveAndNext}
          onOpenPalette={handleOpenPalette}
        />
      )}

      {/* ═══ Mobile Palette Drawer sheet ═══ */}
      {!isDesktop && (
        <QuestionPalette
          questions={questions}
          selectedOptions={selectedOption}
          markedForReview={markedForReview}
          visitedQuestions={visitedQuestions}
          currentIndex={currentIndex}
          onQuestionSelect={handleQuestionSelect}
          open={isPaletteVisible}
          onClose={handleClosePalette}
        />
      )}

      {/* ═══ Auto-Submit Overlay (Phase 5) with retry progress ═══ */}
      {isAutoSubmitting && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.autoSubmitOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.autoSubmitText}>Time is up</Text>
            <Text style={styles.autoSubmitSubText}>
              {retryAttempt > 0
                ? `Submitting your test... Attempt ${retryAttempt} of 3`
                : 'Submitting your test...'}
            </Text>
          </View>
        </View>
      )}

      {/* ═══ Submission Failed Recovery Screen ═══ */}
      {submitFailed && (
        <View style={StyleSheet.absoluteFill}>
          {/* Loading overlay while retrying submission */}
          {isRetryingSubmission && (
            <View style={StyleSheet.absoluteFill}>
              <View style={styles.autoSubmitOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.autoSubmitText}>Retrying Submission</Text>
                <Text style={styles.autoSubmitSubText}>
                  Attempting to submit your test...
                </Text>
              </View>
            </View>
          )}
          <View style={styles.recoveryOverlay}>
            <View style={[styles.errorIconContainer, { backgroundColor: '#FFF7ED' }]}>
              <Text style={[styles.errorIconText, { color: '#EA580C' }]}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Submission Could Not Be Confirmed</Text>
            <Text style={styles.errorMessage}>
              Your answers have been saved successfully.{'\n\n'}
              We couldn't confirm the final submission because of a temporary
              network issue.{'\n\n'}
              Please reconnect to the internet and tap Retry Submission.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, isRetryingSubmission && { opacity: 0.5 }]}
              onPress={handleRetrySubmission}
              activeOpacity={0.85}
              disabled={isRetryingSubmission}
              accessibilityLabel="Retry submission"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Retry Submission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, isRetryingSubmission && { opacity: 0.5 }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              disabled={isRetryingSubmission}
              accessibilityLabel="Back to dashboard"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ═══ Modals ═══ */}
      <QuitDialog
        visible={showQuitDialog}
        onClose={() => setShowQuitDialog(false)}
        onConfirmQuit={handleConfirmQuit}
      />

      <SubmissionDialog
        visible={showSubmitDialog}
        answeredCount={answeredIndices.size}
        markedCount={markedForReview.size}
        unansweredCount={questions.length - answeredIndices.size}
        totalQuestions={questions.length}
        onClose={() => setShowSubmitDialog(false)}
        onConfirmSubmit={handleConfirmSubmit}
      />
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
  // ── Initialization / Error States ─────────────────────────────
  centerContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[32],
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[16],
  },
  errorIconText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#DC2626',
  },
  errorTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: palette.slate800,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[24],
  },
  goBackButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBackButtonText: {
    ...typography.button,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  initializingText: {
    ...typography.body,
    fontSize: 15,
    color: palette.slate500,
    marginTop: spacing[16],
  },
  // ── Auto-Submit Overlay (Phase 5) ──────────────────────────
  autoSubmitOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[32],
  },
  autoSubmitText: {
    ...typography.title,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing[24],
    textAlign: 'center',
  },
  autoSubmitSubText: {
    ...typography.body,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing[8],
    textAlign: 'center',
  },
  // ── Expired Screen Buttons ────────────────────────────────────
  expiredButtonContainer: {
    width: '100%',
    gap: spacing[12],
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
  },
  primaryButtonText: {
    ...typography.button,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.button,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  retakingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[32],
    zIndex: 10,
  },
  retakingText: {
    ...typography.body,
    fontSize: 15,
    color: '#FFFFFF',
    marginTop: spacing[16],
  },
  retakeErrorText: {
    ...typography.body,
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: spacing[8],
    paddingHorizontal: spacing[16],
  },
  // ── Submission Failed Recovery Screen ────────────────────────
  recoveryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[32],
  },
});
