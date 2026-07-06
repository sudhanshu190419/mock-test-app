/**
 * Test Result Types
 *
 * Backend-ready type definitions for the Test Result / Analytical Report
 * screen. These types assume all data comes from an API response.
 *
 * @module types/testResult
 */

// ═════════════════════════════════════════════════════════════════
//  Core Result
// ═════════════════════════════════════════════════════════════════

/** Overall test result summary. */
export interface TestResult {
  /** Unique test identifier. */
  testId: string;
  /** Unique attempt identifier. */
  attemptId: string;
  /** Paper/exam identifier. */
  paperId: string;
  /** Exam identifier (e.g., 'jee_main', 'neet'). */
  examId: string;
  /** Display title of the test. */
  testTitle: string;
  /** Timestamp string of when the test was attempted. */
  attemptedAt: string;
  /** Human-readable attempt date (e.g., "Today, 10:30 AM"). */
  attemptedLabel: string;

  // Score
  /** Marks scored by the student. */
  score: number;
  /** Maximum possible marks. */
  maxScore: number;
  /** Calculated percentage (0–100). */
  percentage: number;

  // Rank & Percentile
  /** National rank (null if not ranked). */
  rank: number | null;
  /** Percentile (0–100). */
  percentile: number;

  // Accuracy
  /** Accuracy percentage (0–100). */
  accuracy: number;
  /** Accuracy insight text. */
  accuracyInsight: string;

  // Time
  /** Total time taken in minutes. */
  timeTakenMin: number;
  /** Total test duration in minutes. */
  totalDurationMin: number;
  /** Average time per question in minutes. */
  avgTimePerQuestion: number;

  // Question Breakdown
  /** Number of correct answers. */
  correctCount: number;
  /** Number of incorrect answers. */
  incorrectCount: number;
  /** Number of skipped / unanswered questions. */
  skippedCount: number;
  /** Total questions in the test. */
  totalQuestions: number;

  // Subject breakdown
  /** Per-subject performance (empty for single-subject tests). */
  subjectBreakdown: SubjectResult[];
}

// ═════════════════════════════════════════════════════════════════
//  Subject & Topic Breakdown
// ═════════════════════════════════════════════════════════════════

/** Per-subject performance data. */
export interface SubjectResult {
  /** Subject identifier. */
  subjectId: string;
  /** Subject display name. */
  subjectName: string;
  /** Marks scored. */
  score: number;
  /** Maximum possible marks. */
  maxScore: number;
  /** Percentage (0–100). */
  percentage: number;
  /** Correct answers. */
  correct: number;
  /** Incorrect answers. */
  wrong: number;
  /** Skipped answers. */
  skipped: number;
  /** Accuracy percentage. */
  accuracy: number;
  /** Time spent in minutes. */
  timeSpentMin: number;
}

/** Per-topic performance (for future chapter-wise analysis). */
export interface TopicAnalysis {
  /** Topic name. */
  topicName: string;
  /** Subject this topic belongs to. */
  subjectName: string;
  /** Correct answers. */
  correct: number;
  /** Incorrect answers. */
  wrong: number;
  /** Accuracy percentage. */
  accuracy: number;
  /** Whether this is a strong topic. */
  isStrong: boolean;
}

// ═════════════════════════════════════════════════════════════════
//  Question Analysis (for future per-question review)
// ═════════════════════════════════════════════════════════════════

/** Per-question analysis for question-wise review. */
export interface QuestionAnalysis {
  /** Question index (1-based). */
  index: number;
  /** Question text. */
  text: string;
  /** Selected option ID. */
  selectedOptionId: string | null;
  /** Correct option ID. */
  correctOptionId: string;
  /** Whether the answer was correct. */
  isCorrect: boolean;
  /** Whether the question was skipped. */
  isSkipped: boolean;
  /** Time spent in seconds. */
  timeSpentSeconds: number;
  /** Subject name. */
  subjectName?: string;
  /** Marks awarded. */
  marksAwarded: number;
  /** Maximum marks. */
  marks: number;
}

// ═════════════════════════════════════════════════════════════════
//  Performance Metrics (for future charts)
// ═════════════════════════════════════════════════════════════════

/** Aggregate performance metrics. */
export interface PerformanceMetrics {
  /** Overall accuracy percentage. */
  accuracy: number;
  /** Average time per question in minutes. */
  avgTimePerQuestion: number;
  /** Score percentage. */
  scorePercentage: number;
  /** Number of questions attempted. */
  attemptedCount: number;
  /** Efficiency score (attempted / total * accuracy). */
  efficiency: number;
}

// ═════════════════════════════════════════════════════════════════
//  AI Insights (for future AI recommendations)
// ═════════════════════════════════════════════════════════════════

/** AI-generated insight for performance improvement. */
export interface AIInsight {
  /** Insight category (strength, weakness, recommendation). */
  category: 'strength' | 'weakness' | 'recommendation';
  /** Insight text. */
  text: string;
  /** Subject this relates to (null for general). */
  subjectName: string | null;
  /** Priority (1 = highest). */
  priority: number;
}

// ═════════════════════════════════════════════════════════════════
//  Rank Prediction (for future rank estimation)
// ═════════════════════════════════════════════════════════════════

/** Rank prediction data. */
export interface RankPrediction {
  /** Estimated rank. */
  estimatedRank: number;
  /** Confidence range low. */
  rangeLow: number;
  /** Confidence range high. */
  rangeHigh: number;
  /** Predicted percentile. */
  predictedPercentile: number;
  /** Number of data points used for prediction. */
  dataPoints: number;
}

// ═════════════════════════════════════════════════════════════════
//  Navigation Params
// ═════════════════════════════════════════════════════════════════

export interface TestResultParams {
  testId: string;
  attemptId: string;
  paperId?: string;
  examId?: string;
}
