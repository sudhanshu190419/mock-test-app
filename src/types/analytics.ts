/**
 * Analytics Module Types
 *
 * Type definitions for the student analytics RPCs:
 *   - get_student_subject_analytics()
 *   - get_student_chapter_analytics()
 *   - get_student_weak_chapters()
 *   - get_student_strong_chapters()
 *   - get_student_score_trend()
 *
 * All RPCs resolve the student_id from the authenticated session via
 * `get_my_student_id()` — no parameters are required.
 *
 * Keys are mapped from snake_case (PostgreSQL) to camelCase (TypeScript)
 * in the service layer (analyticsService.ts).
 *
 * @module types/analytics
 */

// ═════════════════════════════════════════════════════════════════════════════
//  Subject Analytics
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
//  Score Trend
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Single score-trend point returned by `get_student_score_trend()`.
 *
 * Each point represents one released test result, ordered chronologically
 * by the RPC. The mobile app must NOT re-sort this array.
 */
export interface ScoreTrendPoint {
  /** Result ID (FK → public.mock_results). */
  resultId: string;
  /** Parent attempt ID (FK → public.mock_attempts). */
  attemptId: string;
  /** Test ID (FK → public.mock_tests). */
  testId: string;
  /** Human-readable test name (e.g. "NEET Biology Mock Test 07"). */
  testName: string;
  /** UTC ISO timestamp when the test was attempted. */
  attemptedOn: string;
  /** Aggregate score the student achieved. */
  score: number;
  /** Maximum possible score for this test. */
  maxScore: number;
  /** Percentage (score / maxScore * 100). */
  percentage: number;
  /** Accuracy (correct / (correct + wrong) * 100). Null when no questions answered. */
  accuracy: number | null;
  /** Student's rank for this test. Null if not yet ranked. */
  rank: number | null;
  /** Student's percentile for this test. Null if not yet ranked. */
  percentile: number | null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Subject Analytics
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Single subject performance row returned by `get_student_subject_analytics()`.
 */
export interface SubjectAnalyticsItem {
  /** Subject ID (FK → public.subjects). */
  subjectId: string;
  /** Human-readable subject name (e.g. "Physics"). */
  subjectName: string;
  /** Subject code (e.g. "PHY"). */
  subjectCode: string;
  /** Total questions attempted in this subject. */
  questionsAttempted: number;
  /** Number of correct answers. */
  correct: number;
  /** Number of incorrect answers. */
  wrong: number;
  /** Number of skipped questions. */
  skipped: number;
  /** Normalised score (0–100). */
  score: number;
  /** Accuracy percentage (0–100). */
  accuracy: number;
  /** Average time per question in seconds. Null when no questions attempted. */
  avgTimePerQuestion: number | null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Chapter Analytics
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Single chapter performance row returned by `get_student_chapter_analytics()`.
 */
export interface ChapterAnalyticsItem {
  /** Chapter ID (FK → public.chapters). */
  chapterId: string;
  /** Human-readable chapter name (e.g. "Laws of Motion"). */
  chapterName: string;
  /** Parent subject ID. */
  subjectId: string;
  /** Human-readable subject name (e.g. "Physics"). */
  subjectName: string;
  /** Total questions attempted in this chapter. */
  questionsAttempted: number;
  /** Number of correct answers. */
  correct: number;
  /** Number of incorrect answers. */
  wrong: number;
  /** Number of skipped questions. */
  skipped: number;
  /** Normalised score (0–100). */
  score: number;
  /** Accuracy percentage (0–100). */
  accuracy: number;
  /** Average time per question in seconds. Null when no questions attempted. */
  avgTimePerQuestion: number | null;
  /** Pre-computed weak flag (accuracy below configured threshold). */
  isWeak: boolean;
  /** Pre-computed strong flag (accuracy above configured threshold). */
  isStrong: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Weak / Strong Chapters
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Chapter item returned by `get_student_weak_chapters()` and
 * `get_student_strong_chapters()`. Ordered by the RPC — the mobile
 * app must NOT re-sort.
 */
export interface ChapterWeakStrongItem {
  /** Chapter ID (FK → public.chapters). */
  chapterId: string;
  /** Human-readable chapter name. */
  chapterName: string;
  /** Parent subject ID. */
  subjectId: string;
  /** Human-readable subject name (e.g. "Physics"). */
  subjectName: string;
  /** Accuracy percentage for this chapter. */
  accuracy: number;
  /** Total questions attempted in this chapter. */
  questionsAttempted: number;
  /** Number of correct answers. */
  correct: number;
  /** Number of incorrect answers. */
  wrong: number;
  /** Number of skipped questions. */
  skipped: number;
}
