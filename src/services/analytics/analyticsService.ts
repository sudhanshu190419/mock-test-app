/**
 * Analytics Service
 *
 * Clean-architecture service layer for the four student analytics RPCs.
 *
 * All analytics are computed on the database side — the mobile app is a
 * pure consumer and never duplicates business logic.
 *
 * Each RPC resolves the student's identity from the authenticated session
 * (`auth.uid()` → `get_my_student_id()`), so no parameters are required.
 *
 * Each public method returns a standardised `ApiResponse<T>` shape so that
 * consumers (hooks, screens) never need to handle raw Supabase exceptions.
 *
 * @module services/analytics/analyticsService
 */

import { supabase } from '../../config/supabase';
import { extractErrorMessage } from '../../utils/supabase';
import type { ApiResponse } from '../../types/academic';
import type {
  SubjectAnalyticsItem,
  ChapterAnalyticsItem,
  ChapterWeakStrongItem,
  ScoreTrendPoint,
} from '../../types/analytics';

// ─── RPC Response Shapes (snake_case, raw from PostgreSQL) ──────────────────

/**
 * Raw snake_case shape of a row returned by `get_student_subject_analytics()`.
 */
interface RpcSubjectAnalytics {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  questions_attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  accuracy: number;
  avg_time_per_question: number | null;
}

/**
 * Raw snake_case shape of a row returned by `get_student_chapter_analytics()`.
 */
interface RpcChapterAnalytics {
  chapter_id: string;
  chapter_name: string;
  subject_id: string;
  subject_name: string;
  questions_attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  accuracy: number;
  avg_time_per_question: number | null;
  is_weak: boolean;
  is_strong: boolean;
}

/**
 * Raw snake_case shape of a row returned by `get_student_weak_chapters()`
 * and `get_student_strong_chapters()`.
 */
interface RpcChapterWeakStrong {
  chapter_id: string;
  chapter_name: string;
  subject_id: string;
  subject_name: string;
  accuracy: number;
  questions_attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
}

/**
 * Raw snake_case shape of a row returned by `get_student_score_trend()`.
 */
interface RpcScoreTrendPoint {
  result_id: string;
  attempt_id: string;
  test_id: string;
  test_name: string;
  attempted_on: string;
  score: number;
  max_score: number;
  percentage: number;
  accuracy: number | null;
  rank: number | null;
  percentile: number | null;
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

function mapSubjectAnalytics(rpc: RpcSubjectAnalytics): SubjectAnalyticsItem {
  return {
    subjectId: rpc.subject_id,
    subjectName: rpc.subject_name,
    subjectCode: rpc.subject_code,
    questionsAttempted: rpc.questions_attempted,
    correct: rpc.correct,
    wrong: rpc.wrong,
    skipped: rpc.skipped,
    score: rpc.score,
    accuracy: rpc.accuracy,
    avgTimePerQuestion: rpc.avg_time_per_question,
  };
}

function mapChapterAnalytics(rpc: RpcChapterAnalytics): ChapterAnalyticsItem {
  return {
    chapterId: rpc.chapter_id,
    chapterName: rpc.chapter_name,
    subjectId: rpc.subject_id,
    subjectName: rpc.subject_name,
    questionsAttempted: rpc.questions_attempted,
    correct: rpc.correct,
    wrong: rpc.wrong,
    skipped: rpc.skipped,
    score: rpc.score,
    accuracy: rpc.accuracy,
    avgTimePerQuestion: rpc.avg_time_per_question,
    isWeak: rpc.is_weak,
    isStrong: rpc.is_strong,
  };
}

function mapChapterWeakStrong(rpc: RpcChapterWeakStrong): ChapterWeakStrongItem {
  return {
    chapterId: rpc.chapter_id,
    chapterName: rpc.chapter_name,
    subjectId: rpc.subject_id,
    subjectName: rpc.subject_name,
    accuracy: rpc.accuracy,
    questionsAttempted: rpc.questions_attempted,
    correct: rpc.correct,
    wrong: rpc.wrong,
    skipped: rpc.skipped,
  };
}

function mapScoreTrendPoint(rpc: RpcScoreTrendPoint): ScoreTrendPoint {
  return {
    resultId: rpc.result_id,
    attemptId: rpc.attempt_id,
    testId: rpc.test_id,
    testName: rpc.test_name,
    attemptedOn: rpc.attempted_on,
    score: rpc.score,
    maxScore: rpc.max_score,
    percentage: rpc.percentage,
    accuracy: rpc.accuracy,
    rank: rpc.rank,
    percentile: rpc.percentile,
  };
}

// ─── Generic RPC Helper ─────────────────────────────────────────────────────

/**
 * Execute a snake_case → camelCase mapped RPC that returns an array.
 *
 * Handles diagnostic logging, error extraction, and the optional "error"
 * response shape that Supabase Functions may return.
 */
async function callRpcArray<T, R>(
  rpcName: string,
  mapper: (raw: R) => T,
): Promise<ApiResponse<T[]>> {
  try {
    // ── RPC REQUEST ──────────────────────────────────────────────────
    console.log(`RPC REQUEST: ${rpcName}`, { rpcName, parameters: {} });

    const { data, error } = await supabase.rpc(rpcName);

    // ── RPC RESPONSE ─────────────────────────────────────────────────
    console.log(`RPC RESPONSE: ${rpcName}`, { data, error });

    if (error) {
      console.log(`[ANALYTICS SERVICE] ${rpcName} failure (full PostgREST error):`, {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      return { success: false, error: extractErrorMessage(error) };
    }

    const rawArray = data as unknown;

    // ── RAW RPC DATA (before mapping) ────────────────────────────────
    console.log(`RAW RPC DATA: ${rpcName}`, rawArray);

    // ── Handle error response from RPC ───────────────────────────────
    if (rawArray && typeof (rawArray as Record<string, unknown>).error === 'string') {
      const errMsg = (rawArray as Record<string, unknown>).error as string;
      console.log(`[ANALYTICS SERVICE] ${rpcName} returned error:`, errMsg);
      return { success: false, error: errMsg };
    }

    // ── Map rows ────────────────────────────────────────────────────
    if (!Array.isArray(rawArray)) {
      // RPC returned a non-array (e.g. empty result set as null)
      console.log(`[ANALYTICS SERVICE] ${rpcName} returned non-array:`, rawArray);
      return { success: true, data: [] };
    }

    const mapped = rawArray.map((row: unknown) => mapper(row as R));
    // ── MAPPED DATA (after mapping) ──────────────────────────────────
    console.log(`MAPPED DATA: ${rpcName}`, mapped);
    console.log(`[ANALYTICS SERVICE] ${rpcName} success:`, mapped.length, 'rows');
    return { success: true, data: mapped };
  } catch (err) {
    console.log(`[ANALYTICS SERVICE] ${rpcName} exception:`, err);
    return { success: false, error: extractErrorMessage(err) };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch subject-wise analytics for the authenticated student.
 *
 * Returns an array of `SubjectAnalyticsItem` ordered by subject display
 * order. Each item contains the subject name, accuracy, questions attempted,
 * correct/wrong/skipped counts, score, and average time per question.
 *
 * All analytics are computed server-side via the `get_student_subject_analytics()`
 * RPC. The mobile app is a pure consumer.
 *
 * @example
 * const result = await getStudentSubjectAnalytics();
 * if (result.success) {
 *   result.data.forEach(s => console.log(s.subjectName, s.accuracy));
 * }
 */
export async function getStudentSubjectAnalytics(): Promise<
  ApiResponse<SubjectAnalyticsItem[]>
> {
  return callRpcArray<SubjectAnalyticsItem, RpcSubjectAnalytics>(
    'get_student_subject_analytics',
    mapSubjectAnalytics,
  );
}

/**
 * Fetch chapter-wise analytics for the authenticated student.
 *
 * Returns an array of `ChapterAnalyticsItem` ordered by subject then
 * chapter display order. Each item contains chapter name, subject name,
 * accuracy, questions attempted, correct/wrong/skipped counts, score,
 * average time per question, and pre-computed weak/strong flags.
 *
 * All analytics are computed server-side via the `get_student_chapter_analytics()`
 * RPC. The mobile app is a pure consumer.
 *
 * @example
 * const result = await getStudentChapterAnalytics();
 * if (result.success) {
 *   result.data.forEach(c => console.log(c.chapterName, c.accuracy));
 * }
 */
export async function getStudentChapterAnalytics(): Promise<
  ApiResponse<ChapterAnalyticsItem[]>
> {
  return callRpcArray<ChapterAnalyticsItem, RpcChapterAnalytics>(
    'get_student_chapter_analytics',
    mapChapterAnalytics,
  );
}

/**
 * Fetch the weakest chapters for the authenticated student.
 *
 * Returns an array of `ChapterWeakStrongItem` ordered exactly as returned
 * by the RPC — the mobile app must NOT re-sort. Weak chapters are those
 * where the student's accuracy is below the configured threshold.
 *
 * All analytics are computed server-side via the `get_student_weak_chapters()`
 * RPC. The mobile app is a pure consumer.
 *
 * @example
 * const result = await getStudentWeakChapters();
 * if (result.success) {
 *   result.data.forEach(c => console.log(c.chapterName, c.accuracy));
 * }
 */
export async function getStudentWeakChapters(): Promise<
  ApiResponse<ChapterWeakStrongItem[]>
> {
  return callRpcArray<ChapterWeakStrongItem, RpcChapterWeakStrong>(
    'get_student_weak_chapters',
    mapChapterWeakStrong,
  );
}

/**
 * Fetch the strongest chapters for the authenticated student.
 *
 * Returns an array of `ChapterWeakStrongItem` ordered exactly as returned
 * by the RPC — the mobile app must NOT re-sort. Strong chapters are those
 * where the student's accuracy is above the configured threshold.
 *
 * All analytics are computed server-side via the `get_student_strong_chapters()`
 * RPC. The mobile app is a pure consumer.
 *
 * @example
 * const result = await getStudentStrongChapters();
 * if (result.success) {
 *   result.data.forEach(c => console.log(c.chapterName, c.accuracy));
 * }
 */
export async function getStudentStrongChapters(): Promise<
  ApiResponse<ChapterWeakStrongItem[]>
> {
  return callRpcArray<ChapterWeakStrongItem, RpcChapterWeakStrong>(
    'get_student_strong_chapters',
    mapChapterWeakStrong,
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Student Score Trend
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch the student's score trend via the `get_student_score_trend()`
 * PostgreSQL RPC.
 *
 * Returns an array of `ScoreTrendPoint` ordered chronologically by
 * attempt date (oldest first) — perfect for rendering a line chart.
 * Each point contains result metadata, score/maxScore, percentage,
 * accuracy, rank, and percentile.
 *
 * The RPC internally resolves the student_id from the authenticated session
 * via `get_my_student_id()` — no parameters are required. All analytics
 * are computed server-side. The mobile app is a pure consumer.
 *
 * @example
 * const result = await getStudentScoreTrend();
 * if (result.success) {
 *   result.data.forEach(p => console.log(p.testName, p.score, p.percentage));
 * }
 */
export async function getStudentScoreTrend(): Promise<
  ApiResponse<ScoreTrendPoint[]>
> {
  return callRpcArray<ScoreTrendPoint, RpcScoreTrendPoint>(
    'get_student_score_trend',
    mapScoreTrendPoint,
  );
}
