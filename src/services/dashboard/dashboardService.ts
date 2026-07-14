/**
 * Dashboard Service
 *
 * Clean-architecture service layer for the Student Dashboard Summary.
 *
 * This service is a thin wrapper around the `get_student_dashboard_summary()`
 * PostgreSQL RPC.  All analytics are computed on the database side — the
 * mobile app never queries `mock_results` or `mock_attempts` directly for
 * dashboard statistics.
 *
 * The RPC resolves the student's identity from the authenticated session
 * (`auth.uid()` → `get_my_student_id()`), so no parameters are required.
 *
 * Each public method returns a standardised `ApiResponse<T>` shape so that
 * consumers (hooks, screens) never need to handle raw Supabase exceptions.
 *
 * @module services/dashboard/dashboardService
 */

import { supabase } from '../../config/supabase';
import { extractErrorMessage } from '../../utils/supabase';
import type { ApiResponse } from '../../types/academic';
import type {
  StudentDashboardSummary,
  LatestResult,
  ContinuePracticeAttempt,
} from '../../types/dashboard';

// ─── RPC Response Shape (snake_case, raw from PostgreSQL) ──────────────────

/**
 * Raw snake_case shape of the JSON object returned by the
 * `get_student_dashboard_summary()` RPC.  Internally mapped to the
 * camelCase `StudentDashboardSummary` interface before being returned
 * to consumers.
 */
interface RpcDashboardSummary {
  tests_attempted: number;
  average_score: number;
  best_score: number;
  overall_accuracy: number | null;
  latest_result: {
    result_id: string;
    attempt_id: string;
    test_id: string;
    total_score: number;
    max_score: number;
    percentage: number;
    correct_count: number;
    wrong_count: number;
    skipped_count: number;
    rank: number | null;
    percentile: number | null;
    generated_at: string;
    released_at: string | null;
  } | null;
  continue_practice: {
    attempt_id: string;
    test_id: string;
    status: string;
    started_at: string;
    time_remaining_seconds: number | null;
  } | null;
}

// ─── Raw mock_tests row shape (for lightweight metadata lookups) ───────────

interface DbMockTest {
  test_id: string;
  title: string;
  total_marks: number;
  duration_min: number | null;
}

// ─── Test Name Lookup ───────────────────────────────────────────────────────

/**
 * Fetch test titles (and optionally duration / total marks) for a set of
 * test IDs.  This is a lightweight metadata enrichment — NOT a dashboard
 * statistics computation — and is only called when the RPC returns a
 * non-null latest_result or continue_practice.
 */
async function getTestMetadata(
  testIds: string[],
): Promise<Map<string, DbMockTest>> {
  if (testIds.length === 0) return new Map();

  const uniqueIds = [...new Set(testIds)];
  const { data, error } = await supabase
    .from('mock_tests')
    .select('test_id, title, total_marks, duration_min')
    .in('test_id', uniqueIds)
    .returns<DbMockTest[]>();

  if (error || !data) return new Map();

  const testMap = new Map<string, DbMockTest>();
  for (const row of data) {
    testMap.set(row.test_id, row);
  }
  return testMap;
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

/**
 * Map the raw snake_case RPC response to the camelCase TypeScript interface.
 * Test metadata is merged in separately after this mapping.
 */
function mapRpcToDashboardSummary(rpc: RpcDashboardSummary): StudentDashboardSummary {
  return {
    testsAttempted: rpc.tests_attempted,
    averageScore: rpc.average_score,
    bestScore: rpc.best_score,
    overallAccuracy: rpc.overall_accuracy,
    latestResult: rpc.latest_result
      ? {
          resultId: rpc.latest_result.result_id,
          attemptId: rpc.latest_result.attempt_id,
          testId: rpc.latest_result.test_id,
          testTitle: null,
          totalScore: rpc.latest_result.total_score,
          maxScore: rpc.latest_result.max_score,
          percentage: rpc.latest_result.percentage,
          correctCount: rpc.latest_result.correct_count,
          wrongCount: rpc.latest_result.wrong_count,
          skippedCount: rpc.latest_result.skipped_count,
          rank: rpc.latest_result.rank,
          percentile: rpc.latest_result.percentile,
          generatedAt: rpc.latest_result.generated_at,
          releasedAt: rpc.latest_result.released_at,
        }
      : null,
    continuePractice: rpc.continue_practice
      ? {
          attemptId: rpc.continue_practice.attempt_id,
          testId: rpc.continue_practice.test_id,
          testTitle: null,
          status: rpc.continue_practice.status as ContinuePracticeAttempt['status'],
          startedAt: rpc.continue_practice.started_at,
          timeRemainingSeconds: rpc.continue_practice.time_remaining_seconds,
        }
      : null,
  };
}

/**
 * Enrich a `StudentDashboardSummary` with test metadata (titles, durations)
 * from the `mock_tests` table.
 *
 * This is purely cosmetic — the RPC returns test IDs, and we resolve them
 * to human-readable names for display.  No analytics are computed here.
 */
function enrichWithTestMetadata(
  summary: StudentDashboardSummary,
  testMap: Map<string, DbMockTest>,
): StudentDashboardSummary {
  return {
    ...summary,
    latestResult: summary.latestResult
      ? {
          ...summary.latestResult,
          testTitle: testMap.get(summary.latestResult.testId)?.title ?? null,
        }
      : null,
    continuePractice: summary.continuePractice
      ? {
          ...summary.continuePractice,
          testTitle: testMap.get(summary.continuePractice.testId)?.title ?? null,
        }
      : null,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch the student dashboard summary via the dedicated PostgreSQL RPC.
 *
 * The RPC internally resolves the student_id from the authenticated session
 * via `get_my_student_id()` — no parameters are required.
 *
 * All analytics (tests attempted, average/best score, accuracy, latest result,
 * continue practice) are computed server-side.  The mobile app is a pure
 * consumer and never duplicates business logic.
 *
 * Test titles and durations are fetched as a lightweight metadata enrichment
 * from `mock_tests` — this is NOT an analytics computation.
 *
 * @example
 * const result = await getStudentDashboardSummary();
 * if (result.success) {
 *   console.log(result.data.testsAttempted); // 42
 *   console.log(result.data.overallAccuracy); // 82.5
 * }
 */
export async function getStudentDashboardSummary(): Promise<
  ApiResponse<StudentDashboardSummary>
> {
  try {
    const { data, error } = await supabase.rpc('get_student_dashboard_summary');

    // ── Diagnostic logging ────────────────────────────────────────────
    console.group('DASHBOARD RPC');
    console.log('data:', data);
    console.log('error:', error);
    console.groupEnd();

    if (error) {
      console.log('[DASHBOARD SERVICE] failure:', {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      return { success: false, error: extractErrorMessage(error) };
    }

    const raw = data as unknown as Record<string, unknown>;

    // ── Handle error response from RPC (e.g. caller is not a student) ──
    if (raw && typeof raw.error === 'string') {
      console.log('[DASHBOARD SERVICE] RPC returned error:', raw.error);
      return { success: false, error: raw.error as string };
    }

    const rpcData = raw as unknown as RpcDashboardSummary;

    // ── Map snake_case RPC response → camelCase TypeScript interface ───
    const summary = mapRpcToDashboardSummary(rpcData);

    // ── Enrich with test metadata (titles) from mock_tests ─────────────
    const testIdsToLookup: string[] = [];
    if (summary.latestResult?.testId) {
      testIdsToLookup.push(summary.latestResult.testId);
    }
    if (summary.continuePractice?.testId) {
      testIdsToLookup.push(summary.continuePractice.testId);
    }

    if (testIdsToLookup.length > 0) {
      const testMap = await getTestMetadata(testIdsToLookup);
      const enriched = enrichWithTestMetadata(summary, testMap);
      console.log('[DASHBOARD SERVICE] success (enriched):', JSON.stringify(enriched, null, 2));
      return { success: true, data: enriched };
    }

    console.log('[DASHBOARD SERVICE] success:', JSON.stringify(summary, null, 2));
    return { success: true, data: summary };
  } catch (err) {
    console.log('[DASHBOARD SERVICE] exception:', err);
    return { success: false, error: extractErrorMessage(err) };
  }
}
