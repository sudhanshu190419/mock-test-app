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
import { createMockAttempt, updateMockAttempt, updateMockAnswer, createMockAnswer, createMockAnswerOption } from './mockTest/mockAttemptService';
import { evaluateAttempt } from './mockTest/mockEvaluationService';
import { getMockTestById } from './mockTest/mockTestService';
import { getMockTestQuestions } from './mockTest/mockTestQuestionService';
import type {
  QuestionDisplay,
  TestConfig,
  SaveAnswerInput,
  SubmitTestInput,
  SubmitTestOutput,
} from '../types/testEngine';
import type { MockTest } from '../types/mockTest';

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
 * Submit the test — creates an attempt, saves all answers,
 * evaluates, and returns the attempt and result IDs.
 *
 * Steps:
 * 1. Resolve the current student ID from the auth session
 * 2. Fetch the mock test to get instituteId
 * 3. Create a mock_attempts row
 * 4. Pre-populate mock_answers rows (one per question)
 * 5. Save selected options to mock_answer_options
 * 6. Update attempt status to 'submitted'
 * 7. Call evaluateAttempt() to compute and persist the result
 * 8. Return the attemptId and resultId
 */
export async function submitTest(input: SubmitTestInput): Promise<SubmitTestOutput> {
  console.log('[SUBMIT_STEP_2] testEngineService.submitTest()');
  console.log('[SUBMIT_STEP_2] input.testId:', input.testId);
  console.log('[SUBMIT_STEP_2] input.paperId:', input.paperId);
  console.log('[SUBMIT_STEP_2] input.questions.length:', input.questions?.length);
  console.log('[SUBMIT_STEP_2] input.answers keys:', Object.keys(input.answers));
  console.log('[SUBMIT_STEP_2] input.timeTakenSeconds:', input.timeTakenSeconds);

  // ── 1. Resolve current student ───────────────────────────────────────
  console.log('[SUBMIT_STEP_3] Calling resolveCurrentStudentId()...');
  const resolved = await resolveCurrentStudentId();
  console.log('[SUBMIT_STEP_3] resolveCurrentStudentId resolved:', JSON.stringify(resolved));
  if (!resolved) {
    console.log('[SUBMIT_STEP_3_ERROR] resolveCurrentStudentId returned null');
    throw new Error('Cannot submit test: no student profile found for the current user.');
  }
  const studentId = resolved.studentId;

  // ── 2. Fetch mock test for instituteId ───────────────────────────────
  console.log('[SUBMIT_STEP_4] Calling getMockTestById()...');
  const testResult = await getMockTestById(input.testId);
  console.log('[SUBMIT_STEP_4] getMockTestById success:', testResult.success);
  console.log('[SUBMIT_STEP_4] getMockTestById error:', testResult.error);
  console.log('[SUBMIT_STEP_4] getMockTestById data (testId):', testResult.data?.testId);
  console.log('[SUBMIT_STEP_4] getMockTestById data (instituteId):', testResult.data?.instituteId);
  if (!testResult.success || !testResult.data) {
    console.log('[SUBMIT_STEP_4_ERROR] Mock test not found');
    throw new Error(`Mock test not found: ${input.testId}`);
  }
  const mockTest: MockTest = testResult.data;
  const instituteId = mockTest.instituteId;

  // ── 3. Create mock attempt ───────────────────────────────────────────
  console.log('[SUBMIT_STEP_5] Calling createMockAttempt()...');
  const attemptResult = await createMockAttempt({
    testId: input.testId,
    studentId,
    instituteId,
  });
  console.log('[SUBMIT_STEP_5] createMockAttempt success:', attemptResult.success);
  console.log('[SUBMIT_STEP_5] createMockAttempt error:', attemptResult.error);
  console.log('[SUBMIT_STEP_5] createMockAttempt data (attemptId):', attemptResult.data?.attemptId);

  if (!attemptResult.success || !attemptResult.data) {
    console.log('[SUBMIT_STEP_5_ERROR] Failed to create attempt');
    throw new Error(`Failed to create attempt: ${attemptResult.error}`);
  }

  const attempt = attemptResult.data;
  const attemptId = attempt.attemptId;
  let answerCreateCount = 0;
  let answerOptionCreateCount = 0;

  try {
    // ── 4. Fetch questions to map indices → questionIds ────────────────
    console.log('[SUBMIT_STEP_6] Calling getMockTestQuestions()...');
    const questionsResult = await getMockTestQuestions(input.testId, 'orderSequence', 'asc');
    console.log('[SUBMIT_STEP_6] getMockTestQuestions success:', questionsResult.success);
    console.log('[SUBMIT_STEP_6] getMockTestQuestions error:', questionsResult.error);
    console.log('[SUBMIT_STEP_6] getMockTestQuestions data.length:', questionsResult.data?.length);
    if (!questionsResult.success || !questionsResult.data) {
      throw new Error('Failed to load test questions.');
    }
    const testQuestions = questionsResult.data;

    // Build questionId lookup by orderSequence (1-indexed)
    const questionIdBySequence = new Map<number, string>();
    for (const mtq of testQuestions) {
      questionIdBySequence.set(mtq.orderSequence, mtq.questionId);
    }

    // ── 5. Create mock_answers and mock_answer_options for each answer ─
    console.log('[SUBMIT_STEP_7] Starting answer creation loop...');
    for (const [indexStr, selectedOptionId] of Object.entries(input.answers)) {
      const questionIndex = Number(indexStr);
      const displayQuestion = input.questions[questionIndex];
      if (!displayQuestion) {
        console.log('[SUBMIT_STEP_7_WARN] No displayQuestion at index', questionIndex, '- skipping');
        continue;
      }

      // Find the questionId from the test questions using orderSequence
      const orderSequence = questionIndex + 1; // 0-based → 1-based
      const questionId = questionIdBySequence.get(orderSequence);
      if (!questionId) {
        console.log('[SUBMIT_STEP_7_WARN] No questionId for orderSequence', orderSequence, '- skipping');
        continue;
      }

      console.log('[SUBMIT_STEP_7_ANSWER] Creating answer for question', questionIndex, 'questionId:', questionId, 'selectedOptionId:', selectedOptionId);

      // Create mock_answer row
      const answerResult = await createMockAnswer({
        attemptId,
        questionId,
        instituteId,
      });

      console.log('[SUBMIT_STEP_7_ANSWER_RESULT] createMockAnswer success:', answerResult.success);
      console.log('[SUBMIT_STEP_7_ANSWER_RESULT] createMockAnswer error:', answerResult.error);
      console.log('[SUBMIT_STEP_7_ANSWER_RESULT] createMockAnswer data (answerId):', answerResult.data?.answerId);

      if (!answerResult.success || !answerResult.data) {
        console.log('[SUBMIT_STEP_7_ANSWER_FAIL] Skipping answer creation due to failure');
        continue;
      }

      answerCreateCount++;
      const answerId = answerResult.data.answerId;

      // ── Process answer content based on format / questionType ─────────
      const val = selectedOptionId;
      const isMarked = input.markedForReviewIndices?.includes(questionIndex) ?? false;
      let isAnswered = false;
      let numericalValue: number | null = null;

      if (val !== null && val !== undefined) {
        if (displayQuestion.questionType === 'numerical') {
          // It's a numerical question
          const numStr = String(val).trim();
          if (numStr !== '') {
            const parsedNum = Number(numStr);
            if (!isNaN(parsedNum)) {
              numericalValue = parsedNum;
              isAnswered = true;
            }
          }
        } else if (Array.isArray(val)) {
          // MSQ (Multiple select option IDs)
          if (val.length > 0) {
            isAnswered = true;
            for (const optId of val) {
              const optResult = await createMockAnswerOption({
                answerId,
                optionId: optId,
              });
              if (optResult.success) {
                answerOptionCreateCount++;
              }
            }
          }
        } else if (typeof val === 'string' && val.trim() !== '') {
          // MCQ (Single select option ID)
          isAnswered = true;
          const optResult = await createMockAnswerOption({
            answerId,
            optionId: val,
          });
          if (optResult.success) {
            answerOptionCreateCount++;
          }
        }
      }

      // Update the mock answer fields
      console.log('[SUBMIT_STEP_7_UPDATE] Calling updateMockAnswer() for answerId:', answerId);
      const updateResult = await updateMockAnswer(answerId, {
        isAnswered,
        isMarkedForReview: isMarked,
        numericalAnswer: numericalValue,
        answeredAt: isAnswered ? new Date().toISOString() : null,
      });
      console.log('[SUBMIT_STEP_7_UPDATE_RESULT] updateMockAnswer success:', updateResult.success);
      console.log('[SUBMIT_STEP_7_UPDATE_RESULT] updateMockAnswer error:', updateResult.error);
    }
    console.log('[SUBMIT_STEP_7_DONE] Created', answerCreateCount, 'answers and', answerOptionCreateCount, 'option selections');

    // ── 6. Mark attempt as submitted ────────────────────────────────────
    console.log('[SUBMIT_STEP_8] Calling updateMockAttempt(status=submitted)...');
    const submitUpdateResult = await updateMockAttempt(attemptId, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      timeRemainingSeconds: Math.max(0, mockTest.durationMin * 60 - input.timeTakenSeconds),
    });
    console.log('[SUBMIT_STEP_8] updateMockAttempt success:', submitUpdateResult.success);
    console.log('[SUBMIT_STEP_8] updateMockAttempt error:', submitUpdateResult.error);

    // ── 7. Evaluate the attempt ────────────────────────────────────────
    console.log('[SUBMIT_STEP_EVAL] Calling evaluateAttempt()...');
    const evalResult = await evaluateAttempt(attemptId);
    console.log('[SUBMIT_STEP_EVAL] evaluateAttempt success:', evalResult.success);
    console.log('[SUBMIT_STEP_EVAL] evaluateAttempt error:', evalResult.error);
    console.log('[SUBMIT_STEP_EVAL] evaluateAttempt data:', JSON.stringify(evalResult.data));

    if (!evalResult.success || !evalResult.data) {
      console.log('[SUBMIT_STEP_EVAL_ERROR] Evaluation failed:', evalResult.error);
      throw new Error(`Evaluation failed: ${evalResult.error}`);
    }

    const result = evalResult.data;
    console.log('[SUBMIT_STEP_SUCCESS] Returning: attemptId:', attemptId, 'resultId:', result.resultId);
    return { attemptId, resultId: result.resultId };
  } catch (err) {
    console.log('[SUBMIT_STEP_CATCH] Submit pipeline failed after attempt creation');
    console.log('[SUBMIT_STEP_CATCH] Full error object:');
    if (err instanceof Error) {
      console.log('[SUBMIT_STEP_CATCH] name:', err.name);
      console.log('[SUBMIT_STEP_CATCH] message:', err.message);
      console.log('[SUBMIT_STEP_CATCH] stack:', err.stack);
      const castErr = err as unknown as Record<string, unknown>;
      if (castErr.cause) console.log('[SUBMIT_STEP_CATCH] cause:', castErr.cause);
      const pgErr = castErr.details;
      if (pgErr) console.log('[SUBMIT_STEP_CATCH] Postgres details:', pgErr);
      const pgHint = castErr.hint;
      if (pgHint) console.log('[SUBMIT_STEP_CATCH] Postgres hint:', pgHint);
      const pgCode = castErr.code;
      if (pgCode) console.log('[SUBMIT_STEP_CATCH] Postgres code:', pgCode);
    } else {
      console.log('[SUBMIT_STEP_CATCH] raw error:', String(err));
    }
    // If something fails after attempt creation, still mark as submitted
    // so the attempt isn't left in an inconsistent state.
    try {
      console.log('[SUBMIT_STEP_CATCH_CLEANUP] Marking attempt as submitted (best-effort)...');
      await updateMockAttempt(attemptId, {
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      });
      console.log('[SUBMIT_STEP_CATCH_CLEANUP] Done');
    } catch (cleanupErr) {
      console.log('[SUBMIT_STEP_CATCH_CLEANUP_ERROR] Failed to mark attempt as submitted:', cleanupErr);
    }
    throw err;
  }
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
 * Create a new test attempt.
 * Replace with: POST /api/attempts
 */
export async function createAttempt(
  testId: string,
  studentId: string,
): Promise<{ attemptId: string; timeRemaining: number }> {
  await delay(200);
  return {
    attemptId: `attempt_${Date.now()}`,
    timeRemaining: MOCK_DURATION_SECONDS,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
