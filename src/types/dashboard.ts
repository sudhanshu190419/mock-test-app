/**
 * Dashboard Module Types
 *
 * Type definitions for the Student Dashboard Summary, consumed from the
 * `get_student_dashboard_summary()` PostgreSQL RPC.
 *
 * The RPC returns a single JSON object with all six fields needed by the
 * student dashboard home screen in one database round-trip.  No additional
 * analytics are computed on the client — the mobile app is a pure consumer.
 *
 * Keys are mapped from snake_case (PostgreSQL) to camelCase (TypeScript)
 * in the service layer (dashboardService.ts).
 *
 * @module types/dashboard
 */

// ═════════════════════════════════════════════════════════════════════════════
//  Student Dashboard Summary
// ═════════════════════════════════════════════════════════════════════════════

/**
 * The complete student dashboard summary returned by the RPC.
 *
 * All fields are derived from `mock_results` and `mock_attempts` tables
 * within the database — the mobile app never queries these tables directly.
 */
export interface StudentDashboardSummary {
  /** Total number of tests attempted across all time. */
  testsAttempted: number;
  /** Average score across all attempts. */
  averageScore: number;
  /** Highest (best) score achieved across all attempts. */
  bestScore: number;
  /** Overall accuracy (correct / (correct + wrong)). Null if no answered questions. */
  overallAccuracy: number | null;
  /** Most recently released result. Null if no results are released yet. */
  latestResult: LatestResult | null;
  /** An in-progress attempt the student can resume. Null if none exists. */
  continuePractice: ContinuePracticeAttempt | null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Latest Result
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lightweight result summary for the dashboard "Latest Result" card.
 */
export interface LatestResult {
  /** Result ID. */
  resultId: string;
  /** Parent attempt ID. */
  attemptId: string;
  /** Test this result belongs to. */
  testId: string;
  /** Human-readable test title (enriched from mock_tests). Null if lookup failed. */
  testTitle: string | null;
  /** Aggregate score. */
  totalScore: number;
  /** Maximum possible score. */
  maxScore: number;
  /** Percentage (totalScore / maxScore) * 100. */
  percentage: number;
  /** Number of correct answers. */
  correctCount: number;
  /** Number of wrong answers. */
  wrongCount: number;
  /** Number of skipped questions. */
  skippedCount: number;
  /** Student's rank. Null if not yet ranked. */
  rank: number | null;
  /** Student's percentile. Null if not yet ranked. */
  percentile: number | null;
  /** UTC timestamp when result was generated. */
  generatedAt: string;
  /** UTC timestamp when result was released. Null if not yet released. */
  releasedAt: string | null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Continue Practice Attempt
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Lightweight attempt summary for the "Continue Practice" card.
 */
export interface ContinuePracticeAttempt {
  /** Attempt ID. */
  attemptId: string;
  /** Test being attempted. */
  testId: string;
  /** Human-readable test title (enriched from mock_tests). Null if lookup failed. */
  testTitle: string | null;
  /** Current status (always 'in_progress' for this use case). */
  status: 'in_progress' | 'submitted' | 'timed_out' | 'abandoned';
  /** UTC timestamp when the attempt was started. */
  startedAt: string;
  /** Seconds remaining on the timer. Null after submission. */
  timeRemainingSeconds: number | null;
}
