/**
 * Test Engine Service
 *
 * Placeholder service layer for the PYQ Mock Test Engine.
 * Currently uses mock data. When the backend is connected, replace
 * each method's implementation with real API calls without changing
 * the UI code.
 *
 * @module services/testEngineService
 */

import { MOCK_QUESTIONS, MOCK_TEST_CONFIG, MOCK_DURATION_SECONDS } from '../data/mockTestEngine';
import type {
  QuestionDisplay,
  TestConfig,
  SaveAnswerInput,
  SubmitTestInput,
} from '../types/testEngine';

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
 * Submit the entire test.
 * Replace with: POST /api/attempts/:attemptId/submit
 */
export async function submitTest(input: SubmitTestInput): Promise<{ success: boolean }> {
  await delay(300);
  console.log('[testEngineService] submitTest:', input);
  return { success: true };
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
