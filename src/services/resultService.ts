/**
 * Result Service
 *
 * Service layer for the Test Result / Analytical Report screen.
 * Fetches real result data from the mock_results table.
 *
 * @module services/resultService
 */

import { getMockResultByAttemptId, getMockAttemptById, getMockResults } from './mockTest/mockAttemptService';
import { getMockTestById } from './mockTest/mockTestService';
import { resolveCurrentStudentId } from './mockTest/studentResolver';
import type { TestResult, QuestionAnalysis, TopicAnalysis } from '../types/testResult';
import type { MockResult, MockTest } from '../types/mockTest';

// ─── Result Release Status ─────────────────────────────────────────────────

export type ResultReleaseStatus =
  | { status: 'released'; result: MockResult }
  | { status: 'unreleased'; result: MockResult }
  | { status: 'not_found' }
  | { status: 'not_generated' };

/**
 * Check the release status of a result for a given attempt.
 * Does not throw — returns a clean status object.
 */
export async function checkResultStatus(
  attemptId: string,
): Promise<ResultReleaseStatus> {
  try {
    const resultResp = await getMockResultByAttemptId(attemptId);
    if (!resultResp.success || !resultResp.data) {
      return { status: 'not_found' };
    }
    const mr = resultResp.data;
    if (mr.isReleased) {
      return { status: 'released', result: mr };
    }
    return { status: 'unreleased', result: mr };
  } catch {
    return { status: 'not_generated' };
  }
}

/**
 * Fetch the full test result for a given attempt.
 * Fetches from mock_results table via mockAttemptService.
 * Throws if the result is not found or not released.
 */
export async function getTestResult(
  testId: string,
  attemptId: string,
): Promise<TestResult> {
  // Fetch result from database
  const resultResp = await getMockResultByAttemptId(attemptId);
  if (!resultResp.success || !resultResp.data) {
    throw new Error(`Result not found for attempt: ${attemptId}`);
  }
  const mr: MockResult = resultResp.data;

  // Check release status
  if (!mr.isReleased) {
    throw new Error('RESULT_NOT_RELEASED');
  }

  // Fetch test metadata for title / paper info
  const testResp = await getMockTestById(testId);
  const mockTest: MockTest | null = testResp.success ? testResp.data! : null;

  // Fetch attempt for timestamps
  const attemptResp = await getMockAttemptById(attemptId);
  const attemptedAt = attemptResp.success && attemptResp.data
    ? attemptResp.data.startedAt
    : new Date().toISOString();

  const totalTimeMin = Math.round(mr.totalTimeSeconds / 60);
  const durationMin = mockTest?.durationMin ?? totalTimeMin;
  const totalQuestions = mr.correctCount + mr.wrongCount + mr.skippedCount;

  // Build subject breakdown (from denormalized JSONB or compute single subject)
  const subjectBreakdown = mr.subjectBreakdown
    ? mr.subjectBreakdown.map((s) => ({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        score: s.score,
        maxScore: s.maxScore,
        percentage: s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0,
        correct: s.correct,
        wrong: s.wrong,
        skipped: s.skipped,
        accuracy: (s.correct + s.wrong) > 0
          ? (s.correct / (s.correct + s.wrong)) * 100
          : 0,
        timeSpentMin: Math.round((mr.totalTimeSeconds / totalQuestions) * (s.correct + s.wrong + s.skipped) / 60),
      }))
    : [];

  const totalAttempted = mr.correctCount + mr.wrongCount;
  const accuracy = totalAttempted > 0
    ? (mr.correctCount / totalAttempted) * 100
    : 0;

  let accuracyInsight = 'No answers submitted.';
  if (accuracy >= 90) {
    accuracyInsight = 'Excellent performance! Outstanding accuracy.';
  } else if (accuracy >= 75) {
    accuracyInsight = 'Good performance with consistent accuracy.';
  } else if (accuracy >= 50) {
    accuracyInsight = 'Fair performance. Focus on weak areas to improve.';
  } else {
    accuracyInsight = 'Needs improvement. Review the incorrect answers carefully.';
  }

  return {
    testId,
    attemptId,
    paperId: mockTest?.testId ?? '',
    examId: mockTest?.testType ?? 'practice',
    testTitle: mockTest?.title ?? 'Practice Test',
    attemptedAt,
    attemptedLabel: formatAttemptDate(attemptedAt),

    // Score
    score: mr.totalScore,
    maxScore: mr.maxScore,
    percentage: mr.percentage,

    // Rank & Percentile
    rank: mr.rank,
    percentile: mr.percentile ?? 0,

    // Accuracy
    accuracy,
    accuracyInsight,

    // Time
    timeTakenMin: totalTimeMin,
    totalDurationMin: durationMin,
    avgTimePerQuestion: totalQuestions > 0
      ? totalTimeMin / totalQuestions
      : 0,

    // Question Breakdown
    correctCount: mr.correctCount,
    incorrectCount: mr.wrongCount,
    skippedCount: mr.skippedCount,
    totalQuestions,

    // Subject breakdown
    subjectBreakdown,
  };
}

// ─── Released Results for Student ──────────────────────────────────────────

/**
 * Result item displayed in the My Results screen.
 */
export interface StudentResultItem {
  attemptId: string;
  testId: string;
  testTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalTimeSeconds: number;
  attemptedAt: string;
  releasedAt: string | null;
}

/**
 * Fetch all released results for the current authenticated student.
 */
export async function getStudentReleasedResults(): Promise<StudentResultItem[]> {
  const resolved = await resolveCurrentStudentId();
  if (!resolved) {
    throw new Error('Cannot fetch results: no student profile found.');
  }
  const { studentId } = resolved;

  const resultsResp = await getMockResults(
    { studentId, isReleased: true },
    { sortBy: 'releasedAt', sortDirection: 'desc' },
  );

  if (!resultsResp.success || !resultsResp.data) {
    throw new Error(resultsResp.error ?? 'Failed to fetch results.');
  }

  const items: StudentResultItem[] = [];

  for (const mr of resultsResp.data) {
    // Fetch test title for each result
    let testTitle = 'Practice Test';
    try {
      const testResp = await getMockTestById(mr.testId);
      if (testResp.success && testResp.data) {
        testTitle = testResp.data.title;
      }
    } catch {
      // Use default title
    }

    // Fetch attempt for attempted date
    let attemptedAt = mr.generatedAt;
    try {
      const attemptResp = await getMockAttemptById(mr.attemptId);
      if (attemptResp.success && attemptResp.data) {
        attemptedAt = attemptResp.data.submittedAt ?? attemptResp.data.startedAt;
      }
    } catch {
      // Use generatedAt
    }

    items.push({
      attemptId: mr.attemptId,
      testId: mr.testId,
      testTitle,
      score: mr.totalScore,
      maxScore: mr.maxScore,
      percentage: mr.percentage,
      correctCount: mr.correctCount,
      wrongCount: mr.wrongCount,
      skippedCount: mr.skippedCount,
      totalTimeSeconds: mr.totalTimeSeconds,
      attemptedAt,
      releasedAt: mr.releasedAt,
    });
  }

  return items;
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

/**
 * Formats an ISO timestamp into a human-readable label.
 * Used by getTestResult() for the attemptedLabel field.
 */
// ─── Helpers ────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatAttemptDate(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoTimestamp;
  }
}
