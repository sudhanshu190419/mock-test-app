/**
 * Test Engine Service
 *
 * Service layer for the PYQ Mock Test Engine.
 * submitTest() now uses the real evaluation engine.
 * Placeholder functions remain for future implementation.
 *
 * @module services/testEngineService
 */

import { MOCK_QUESTIONS, MOCK_TEST_CONFIG, MOCK_DURATION_SECONDS } from '../data/mockTestEngine';
import { resolveCurrentStudentId } from './mockTest/studentResolver';
import { updateMockAttempt, updateMockAnswer, createMockAnswerOption, deleteMockAnswerOptionsByAnswerId, getMockAnswers, getMockAnswerOptions, getMockAttemptById, initializeMockAttemptRpc } from './mockTest/mockAttemptService';
import { evaluateAttempt } from './mockTest/mockEvaluationService';
import { getMockTestById } from './mockTest/mockTestService';
import { getMockTestQuestions } from './mockTest/mockTestQuestionService';
import type {
  QuestionDisplay,
  TestConfig,
  SaveAnswerInput,
  SubmitTestInput,
  SubmitTestOutput,
  ResumeData,
} from '../types/testEngine';
import type { MockTest, MockAnswer } from '../types/mockTest';

// ─── Test Data ──────────────────────────────────────────────────────

/**
 * Fetch the test configuration.
 * Replace with: GET /api/tests/:testId
 */
export async function fetchTestConfig(testId: string): Promise<TestConfig> {
  // Simulate network latency
  await delay(100);
  return { ...MOCK_TEST_CONFIG, testId };
}

/**
 * Fetch all questions for a paper.
 * Replace with: GET /api/papers/:paperId/questions
 */
export async function fetchQuestions(paperId: string): Promise<QuestionDisplay[]> {
  await delay(150);
  return MOCK_QUESTIONS.map((q) => ({ ...q }));
}

/**
 * Fetch a specific question by ID.
 * Replace with: GET /api/questions/:questionId
 */
export async function fetchQuestion(questionId: string): Promise<QuestionDisplay | null> {
  await delay(50);
  return MOCK_QUESTIONS.find((q) => q.id === questionId) ?? null;
}

/**
 * Fetch filtered questions by subject.
 * Replace with: GET /api/papers/:paperId/questions?subjectId=:subjectId
 */
export async function fetchQuestionsBySubject(
  paperId: string,
  subjectId: string,
): Promise<QuestionDisplay[]> {
  await delay(100);
  return MOCK_QUESTIONS.filter((q) => q.subjectName?.toLowerCase() === subjectId.toLowerCase());
}

// ─── Test Taking ────────────────────────────────────────────────────

/**
 * Persist a single answer interaction live during the test.
 *
 * Called immediately when the student selects/deselects an option.
 * Does NOT wait for submission — updates are written to the DB in real time.
 *
 * This replaces the old pattern of saving everything at submit time.
 *
 * ├─ MCQ / True-False : Deletes old options → inserts the newly selected one
 * ├─ MSQ              : Deletes all old options → inserts current selection set
 * └─ Numerical        : Updates numerical_answer directly (no options)
 *
 * @param answerId        - The pre-populated mock_answer row ID
 * @param questionType    - 'mcq' | 'msq' | 'numerical' | 'true_false'
 * @param value           - Selected option ID, array of IDs, numerical string, or null
 * @param isMarkedForReview - Whether the question is currently flagged for review
 */
export async function persistAnswerLive(params: {
  answerId: string;
  questionType: string;
  value: string | string[] | null;
  isMarkedForReview: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { answerId, questionType, value, isMarkedForReview } = params;

  const val = value;
  const isAnswered =
    val !== null &&
    val !== undefined &&
    (typeof val === 'string' ? val.trim() !== '' : true) &&
    (!Array.isArray(val) || val.length > 0);

  let numericalValue: number | null = null;

  try {
    // ── MCQ / True-False: replace single option ──────────────────
    if (questionType === 'mcq' || questionType === 'true_false') {
      await deleteMockAnswerOptionsByAnswerId(answerId);
      if (isAnswered && typeof val === 'string' && val.trim() !== '') {
        const optResult = await createMockAnswerOption({ answerId, optionId: val });
        if (!optResult.success) {
          console.log('[PERSIST_WARN] createMockAnswerOption failed:', optResult.error);
        }
      }
    }
    // ── MSQ: replace all selected options ────────────────────────
    else if (questionType === 'msq') {
      await deleteMockAnswerOptionsByAnswerId(answerId);
      if (isAnswered && Array.isArray(val) && val.length > 0) {
        await Promise.all(
          val.map((optId) =>
            createMockAnswerOption({ answerId, optionId: optId }).then((r) => {
              if (!r.success) console.log('[PERSIST_WARN] MSQ option failed:', r.error);
            }),
          ),
        );
      }
    }
    // ── Numerical: store the parsed value ────────────────────────
    else if (questionType === 'numerical') {
      if (isAnswered && typeof val === 'string' && val.trim() !== '') {
        const parsed = Number(val.trim());
        if (!isNaN(parsed)) {
          numericalValue = parsed;
        }
      }
    }

    // ── Update the mock_answer row ────────────────────────────────
    const updateResult = await updateMockAnswer(answerId, {
      isAnswered,
      isMarkedForReview,
      numericalAnswer: numericalValue,
      answeredAt: isAnswered ? new Date().toISOString() : null,
    });

    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('[PERSIST_ERROR] Failed to persist answer:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Save the student's answer for a question.
 * Replace with: POST /api/attempts/:attemptId/answers
 */
export async function saveAnswer(input: SaveAnswerInput): Promise<{ success: boolean }> {
  await delay(50);
  // Placeholder — in production, persist to backend
  console.log('[testEngineService] saveAnswer:', input);
  return { success: true };
}

/**
 * Mark a question for review.
 * Replace with: POST /api/attempts/:attemptId/answers/:questionIndex/review
 */
export async function markForReview(
  attemptId: string,
  questionIndex: number,
  isMarked: boolean,
): Promise<{ success: boolean }> {
  await delay(30);
  console.log('[testEngineService] markForReview:', { attemptId, questionIndex, isMarked });
  return { success: true };
}

/**
 * Submit the test — saves all answers using the pre-existing attempt,
 * evaluates, and returns the attempt and result IDs.
 *
 * The attempt and mock_answers rows were already created by
 * initializeAttempt() when the student started the test.
 *
 * Steps:
 * 1. Load the pre-existing attempt and mock test
 * 2. Load test questions to map indices → questionIds
 * 3. Load existing pre-populated mock_answers
 * 4. For each answered question: update mock_answer + create mock_answer_options
 * 5. Update attempt status to 'submitted'
 * 6. Call evaluateAttempt() to compute and persist the result
 * 7. Return the attemptId and resultId
 */
export async function submitTest(input: SubmitTestInput): Promise<SubmitTestOutput> {
  const { attemptId } = input;
  console.log('[SUBMIT] testEngineService.submitTest() for attemptId:', attemptId);
  console.log('[SUBMIT] input.testId:', input.testId);
  console.log('[SUBMIT] input.answers keys:', Object.keys(input.answers));
  console.log('[SUBMIT] input.timeTakenSeconds:', input.timeTakenSeconds);

  // ── 1. Fetch mock test for duration, etc. ───────────────────────────
  console.log('[SUBMIT] Fetching mock test...');
  const testResult = await getMockTestById(input.testId);
  if (!testResult.success || !testResult.data) {
    console.log('[SUBMIT_ERROR] Mock test not found:', input.testId);
    throw new Error(`Mock test not found: ${input.testId}`);
  }
  const mockTest: MockTest = testResult.data;
  console.log('[SUBMIT] Loaded test:', mockTest.title);

  // ── 2. Final safety flush: persist all answers from local state ───────
  // Answers were already persisted live during the attempt, but we
  // flush one more time here so that any in-flight or missed updates
  // are captured before finalising the attempt.
  await flushRemainingAnswers(input.attemptId, input.testId, input.questions, input.answers, input.markedForReviewIndices ?? []);

  // ── 3. Mark attempt as submitted ───────────────────────────────────────
  console.log('[SUBMIT] Marking attempt as submitted...');
  const submitUpdateResult = await updateMockAttempt(attemptId, {
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    timeRemainingSeconds: Math.max(0, mockTest.durationMin * 60 - input.timeTakenSeconds),
  });
  console.log('[SUBMIT] updateMockAttempt success:', submitUpdateResult.success);

  // ── 4. Evaluate the attempt ────────────────────────────────────────────
  console.log('[SUBMIT] Evaluating attempt...');
  const evalResult = await evaluateAttempt(attemptId);
  console.log('[SUBMIT] Evaluate success:', evalResult.success);

  if (!evalResult.success || !evalResult.data) {
    console.log('[SUBMIT_ERROR] Evaluation failed:', evalResult.error);
    throw new Error(`Evaluation failed: ${evalResult.error}`);
  }

  const result = evalResult.data;
  console.log('[SUBMIT_SUCCESS] attemptId:', attemptId, 'resultId:', result.resultId);
  return { attemptId, resultId: result.resultId };
}

/**
 * Navigate to the next question.
 * Replace with: POST /api/attempts/:attemptId/navigate
 */
export async function nextQuestion(
  attemptId: string,
  currentIndex: number,
): Promise<{ nextIndex: number }> {
  await delay(20);
  return { nextIndex: currentIndex + 1 };
}

/**
 * Navigate to the previous question.
 */
export async function previousQuestion(
  attemptId: string,
  currentIndex: number,
): Promise<{ prevIndex: number }> {
  await delay(20);
  return { prevIndex: currentIndex - 1 };
}

// ─── Timer Sync ─────────────────────────────────────────────────────

/**
 * Sync the current timer value with the server.
 * Replace with: POST /api/attempts/:attemptId/sync-timer
 */
export async function syncTimer(
  attemptId: string,
  timeRemainingSeconds: number,
): Promise<{ success: boolean }> {
  await delay(50);
  console.log('[testEngineService] syncTimer:', { attemptId, timeRemainingSeconds });
  return { success: true };
}

/**
 * Pause the test timer.
 * Replace with: POST /api/attempts/:attemptId/pause
 */
export async function pauseTest(attemptId: string): Promise<{ success: boolean }> {
  await delay(30);
  return { success: true };
}

/**
 * Resume the test timer.
 * Replace with: POST /api/attempts/:attemptId/resume
 */
export async function resumeTest(attemptId: string): Promise<{ success: boolean }> {
  await delay(30);
  return { success: true };
}

// ─── Initialisation ─────────────────────────────────────────────────

/**
 * Initialize a new test attempt.
 *
 * Called when the student presses "Start Test".
 *
 * Uses the `initialize_mock_attempt` RPC (Supabase database function) which
 * performs the entire operation in a single transaction:
 *
 * 1. Acquires an advisory lock to serialise concurrent requests
 * 2. Checks for an existing in_progress attempt for this student + test
 * 3. If found and answers are fully populated → reuses it (returns immediately)
 * 4. If found but answers are partially populated → completes the missing ones
 * 5. If not found → creates a new mock_attempts row + bulk-inserts all
 *    mock_answers rows (one per question) in a single INSERT-SELECT
 * 6. Returns the real database-generated attemptId
 *
 * No orphaned rows, no partial state, no N+1 network round-trips.
 */
export async function initializeAttempt(
  testId: string,
): Promise<{ success: true; data: { attemptId: string; reused: boolean; effectiveRemainingSeconds?: number; isExpired?: boolean } } | { success: false; error: string }> {
  console.log('[INIT_ATTEMPT] Starting initialization for testId:', testId);

  // ── 1. Resolve current student ───────────────────────────────────────
  console.log('[INIT_ATTEMPT] Resolving student...');
  const resolved = await resolveCurrentStudentId();
  if (!resolved) {
    console.log('[INIT_ATTEMPT_ERROR] No student profile found');
    return { success: false, error: 'Cannot start test: no student profile found for the current user.' };
  }
  const studentId = resolved.studentId;
  console.log('[INIT_ATTEMPT] Resolved studentId:', studentId);

  // ── 2. Fetch mock test for instituteId + attemptLimit ────────────────
  console.log('[INIT_ATTEMPT] Fetching mock test...');
  const testResult = await getMockTestById(testId);
  if (!testResult.success || !testResult.data) {
    console.log('[INIT_ATTEMPT_ERROR] Mock test not found');
    return { success: false, error: `Mock test not found: ${testId}` };
  }
  const mockTest = testResult.data;
  const instituteId = mockTest.instituteId;
  const attemptLimit = mockTest.attemptLimit;
  console.log('[INIT_ATTEMPT] Loaded test:', mockTest.title, 'instituteId:', instituteId, 'attemptLimit:', attemptLimit);

  // ── 3. Delegate to the atomic RPC ────────────────────────────────────
  // The RPC performs all DB work in a single transaction:
  //   - Acquires advisory lock to prevent duplicate concurrent attempts
  //   - Checks for existing in_progress attempt → reuses or completes it
  //   - Otherwise creates attempt + bulk-inserts all answers atomically
  //   - Returns success/error with the attemptId
  console.log('[INIT_ATTEMPT] Calling atomic RPC...');
  const rpcResult = await initializeMockAttemptRpc(
    testId,
    studentId,
    instituteId,
    attemptLimit,
  );

  if (!rpcResult.success || !rpcResult.data) {
    console.log('[INIT_ATTEMPT_ERROR] RPC initialization failed:', rpcResult.error);
    return { success: false, error: rpcResult.error ?? 'Failed to initialize test. Please try again.' };
  }

  const { attemptId, reused, effectiveRemainingSeconds, isExpired } = rpcResult.data;

  if (reused) {
    console.log('[INIT_ATTEMPT] Reused existing attempt, attemptId:', attemptId,
      'effectiveRemainingSeconds:', effectiveRemainingSeconds,
      'isExpired:', isExpired);
  } else {
    console.log('[INIT_ATTEMPT] New attempt created, attemptId:', attemptId);
  }

  return {
    success: true,
    data: {
      attemptId,
      reused,
      effectiveRemainingSeconds,
      isExpired,
    },
  };
}

/**
 * Safety flush — re-persists all answers from local state just before
 * submission.  This is intentionally redundant with live persistence
 * (Phase 2) so that any answer that was never successfully persisted
 * during the attempt still gets into the database.
 *
 * The update is idempotent because:
 *   - mock_answer rows already exist (pre-populated by initializeAttempt())
 *   - updateMockAnswer() overwrites in place
 *   - deleteMockAnswerOptionsByAnswerId() + createMockAnswerOption()
 *     resets the junction table each time
 */
async function flushRemainingAnswers(
  attemptId: string,
  testId: string,
  questions: QuestionDisplay[],
  answers: Record<number, string | string[] | null>,
  markedForReviewIndices: number[],
): Promise<void> {
  // Load test questions to map indices → questionIds
  const questionsResult = await getMockTestQuestions(testId, 'orderSequence', 'asc');
  if (!questionsResult.success || !questionsResult.data) {
    console.log('[FLUSH_WARN] Cannot load test questions, skipping flush');
    return;
  }

  const questionIdBySequence = new Map<number, string>();
  for (const mtq of questionsResult.data) {
    questionIdBySequence.set(mtq.orderSequence, mtq.questionId);
  }

  // Load existing pre-populated mock_answers for answerId lookup
  const existingAnswersResult = await getMockAnswers({ attemptId });
  const answerByQuestionId = new Map<string, string>();
  if (existingAnswersResult.success && existingAnswersResult.data) {
    for (const ans of existingAnswersResult.data) {
      answerByQuestionId.set(ans.questionId, ans.answerId);
    }
  }

  const markedSet = new Set(markedForReviewIndices);

  for (const [indexStr, selectedOptionId] of Object.entries(answers)) {
    const questionIndex = Number(indexStr);
    const displayQuestion = questions[questionIndex];
    if (!displayQuestion) continue;

    const orderSequence = questionIndex + 1;
    const questionId = questionIdBySequence.get(orderSequence);
    if (!questionId) continue;

    const answerId = answerByQuestionId.get(questionId);
    if (!answerId) continue;

    // Persist — reuses the same live-persist function
    await persistAnswerLive({
      answerId,
      questionType: displayQuestion.questionType ?? 'mcq',
      value: selectedOptionId,
      isMarkedForReview: markedSet.has(questionIndex),
    });
  }
}

// ─── Resume ────────────────────────────────────────────────────────

/**
 * Load all persisted state for an existing in_progress attempt.
 * Called after initializeAttempt() returns reused=true.
 *
 * Returns everything needed to restore the student's test session:
 *   - Saved answers (option selections, numerical values)
 *   - Marked-for-review flags
 *   - Remaining time
 *   - Last visited question
 *   - Existing question time accumulators
 */
export async function loadResumeData(
  attemptId: string,
): Promise<{ success: true; data: ResumeData } | { success: false; error: string }> {
  try {
    // ── 1. Load attempt (for timeRemainingSeconds + lastQuestionId) ──
    const attemptResult = await getMockAttemptById(attemptId);
    if (!attemptResult.success || !attemptResult.data) {
      return { success: false, error: 'Failed to load attempt details for resume.' };
    }
    const attempt = attemptResult.data;

    // ── 2. Load all mock_answers ─────────────────────────────────────
    const answersResult = await getMockAnswers({ attemptId });
    if (!answersResult.success || !answersResult.data) {
      return { success: false, error: 'Failed to load saved answers for resume.' };
    }
    const answers = answersResult.data;

    // ── 3. Build answerId → optionIds map ────────────────────────────
    const answerIds = answers.map((a) => a.answerId);
    const selectedOptionsByAnswerId = new Map<string, string[]>();
    if (answerIds.length > 0) {
      const optsResult = await getMockAnswerOptions({ answerIds });
      if (optsResult.success && optsResult.data) {
        for (const opt of optsResult.data) {
          const existing = selectedOptionsByAnswerId.get(opt.answerId) ?? [];
          existing.push(opt.optionId);
          selectedOptionsByAnswerId.set(opt.answerId, existing);
        }
      }
    }

    // ── 4. Build index → value mapping ───────────────────────────────
    // The caller (screen) will map these to indices once questions load.
    const answersByQuestionId = new Map<string, {
      answerId: string;
      isAnswered: boolean;
      isMarkedForReview: boolean;
      numericalAnswer: number | null;
      selectedOptionIds: string[];
      timeSpentSeconds: number;
    }>();
    for (const ans of answers) {
      answersByQuestionId.set(ans.questionId, {
        answerId: ans.answerId,
        isAnswered: ans.isAnswered,
        isMarkedForReview: ans.isMarkedForReview,
        numericalAnswer: ans.numericalAnswer,
        selectedOptionIds: selectedOptionsByAnswerId.get(ans.answerId) ?? [],
        timeSpentSeconds: ans.timeSpentSeconds,
      });
    }

    return {
      success: true,
      data: {
        attemptId,
        timeRemainingSeconds: attempt.timeRemainingSeconds ?? 0,
        lastQuestionId: (attempt as any).lastQuestionId ?? null,
        answersByQuestionId,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('[RESUME_ERROR] Failed to load resume data:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Persist the last-visited question ID to the mock_attempt row.
 * Called on every navigation event so the student can resume from
 * the correct question after a crash or app close.
 */
export async function updateLastQuestionId(
  attemptId: string,
  questionId: string,
): Promise<void> {
  try {
    await updateMockAttempt(attemptId, {
      lastQuestionId: questionId,
    } as any);
  } catch (err) {
    console.log('[RESUME] Failed to update lastQuestionId:', err);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
