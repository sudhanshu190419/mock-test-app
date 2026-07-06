/**
 * Mock Test Result Data
 *
 * Realistic mock data for the Test Result / Analytical Report screen.
 * Replace with real API responses when integrating the backend.
 * Structure mirrors the types in types/testResult.ts.
 *
 * @module data/mockTestResult
 */

import type { TestResult } from '../types/testResult';

export const MOCK_TEST_RESULT: TestResult = {
  testId: 'test_jee_advanced_001',
  attemptId: 'attempt_2025_07_001',
  paperId: 'jee_advanced_2025_p1',
  examId: 'jee_advanced',
  testTitle: 'Mock Exam - JEE Advanced Pattern',
  attemptedAt: '2025-07-06T10:30:00Z',
  attemptedLabel: 'Today, 10:30 AM',

  // Score
  score: 245,
  maxScore: 360,
  percentage: 68.06,

  // Rank & Percentile
  rank: null,
  percentile: 98.2,

  // Accuracy
  accuracy: 85,
  accuracyInsight: 'Consistent performance, slight drop in Physics section.',

  // Time
  timeTakenMin: 172,
  totalDurationMin: 180,
  avgTimePerQuestion: 2.3,

  // Question Breakdown
  correctCount: 62,
  incorrectCount: 11,
  skippedCount: 2,
  totalQuestions: 75,

  // Subject breakdown
  subjectBreakdown: [
    {
      subjectId: 'physics',
      subjectName: 'Physics',
      score: 68,
      maxScore: 120,
      percentage: 56.7,
      correct: 17,
      wrong: 7,
      skipped: 1,
      accuracy: 71,
      timeSpentMin: 58,
    },
    {
      subjectId: 'chemistry',
      subjectName: 'Chemistry',
      score: 88,
      maxScore: 120,
      percentage: 73.3,
      correct: 22,
      wrong: 2,
      skipped: 1,
      accuracy: 92,
      timeSpentMin: 54,
    },
    {
      subjectId: 'mathematics',
      subjectName: 'Mathematics',
      score: 89,
      maxScore: 120,
      percentage: 74.2,
      correct: 23,
      wrong: 2,
      skipped: 0,
      accuracy: 92,
      timeSpentMin: 60,
    },
  ],
};
