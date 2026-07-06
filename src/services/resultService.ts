/**
 * Result Service
 *
 * Placeholder service layer for the Test Result / Analytical Report screen.
 * Currently uses mock data. When the backend is connected, replace each
 * method's implementation with real API calls without changing UI code.
 *
 * @module services/resultService
 */

import { MOCK_TEST_RESULT } from '../data/mockTestResult';
import type { TestResult, QuestionAnalysis, TopicAnalysis } from '../types/testResult';

// ─── Data ──────────────────────────────────────────────────────────

/**
 * Fetch the full test result for a given attempt.
 * Replace with: GET /api/attempts/:attemptId/result
 */
export async function getTestResult(
  testId: string,
  attemptId: string,
): Promise<TestResult> {
  await delay(200);
  return { ...MOCK_TEST_RESULT, testId, attemptId };
}

/**
 * Fetch per-question analysis for an attempt.
 * Replace with: GET /api/attempts/:attemptId/questions/analysis
 */
export async function getQuestionAnalysis(
  attemptId: string,
): Promise<QuestionAnalysis[]> {
  await delay(150);
  // Returns empty array for now — implement when question-wise review is built
  return [];
}

/**
 * Fetch topic/chapter-wise analysis.
 * Replace with: GET /api/attempts/:attemptId/topics/analysis
 */
export async function getTopicAnalysis(
  attemptId: string,
): Promise<TopicAnalysis[]> {
  await delay(150);
  return [];
}

/**
 * Fetch rank prediction data.
 * Replace with: GET /api/attempts/:attemptId/rank-prediction
 */
export async function getRankPrediction(
  attemptId: string,
): Promise<{ estimatedRank: number; rangeLow: number; rangeHigh: number } | null> {
  await delay(100);
  return null;
}

// ─── Actions ───────────────────────────────────────────────────────

/**
 * Share the test result.
 * Replace with: POST /api/attempts/:attemptId/share
 */
export async function shareResult(
  attemptId: string,
): Promise<{ success: boolean }> {
  await delay(100);
  console.log('[resultService] shareResult:', { attemptId });
  return { success: true };
}

/**
 * Download the result as a PDF report.
 * Replace with: GET /api/attempts/:attemptId/report/download
 */
export async function downloadResult(
  attemptId: string,
): Promise<{ url: string }> {
  await delay(300);
  console.log('[resultService] downloadResult:', { attemptId });
  return { url: `https://api.example.com/attempts/${attemptId}/report.pdf` };
}

// ─── Helpers ───────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
