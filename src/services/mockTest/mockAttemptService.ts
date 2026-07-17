/**
 * Mock Attempt Service
 *
 * Clean-architecture service layer encapsulating Mock Attempt, Answer,
 * and Result CRUD operations for the Attempt Engine.
 *
 * Every public method returns a standardised `ApiResponse<T>` shape so that
 * consumers (hooks, screens, etc.) never need to handle raw Supabase
 * exceptions or error formats.
 *
 * ## Scope
 *
 * - mock_attempts table (create, read, update, delete, list)
 * - mock_answers table (create, read, update, delete, list)
 * - mock_answer_options table (create, read, delete)
 * - mock_results table (read, list)
 *
 * ## Architecture decisions
 *
 * 1. **RLS is respected.** This service uses the anon key — all queries run
 *    within the context of the authenticated user.
 * 2. **No service_role key.** This service never bypasses RLS.
 * 3. **Clean mapping layer.** Dedicated map functions convert snake_case DB
 *    rows to camelCase TypeScript interfaces.
 *
 * @module mockAttemptService
 */

import { supabase } from '../../config/supabase';
import { resolveCurrentStudentId } from './studentResolver';
import { validateUUID, extractErrorMessage, buildPagination } from '../../utils/supabase';
import { buildPaginatedResponse } from '../../utils/response';
import { getMockTestById } from './mockTestService';
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SortDirection,
} from '../../types/academic';
import type {
  MockAttempt,
  MockAnswer,
  MockAnswerOption,
  MockResult,
  AttemptStatus,
  CreateMockAttemptInput,
  UpdateMockAttemptInput,
  MockAttemptFilters,
  MockAttemptSortOptions,
  CreateMockAnswerInput,
  UpdateMockAnswerInput,
  MockAnswerFilters,
  MockAnswerSortOptions,
  CreateMockAnswerOptionInput,
  MockAnswerOptionFilters,
  MockResultFilters,
  MockResultSortOptions,
} from '../../types/mockTest';

// ─── Database Row Shapes ──────────────────────────────────────────────────

interface DbMockAttempt {
  attempt_id: string;
  test_id: string;
  student_id: string;
  institute_id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  time_remaining_seconds: number | null;
  last_question_id: string | null;
  last_activity_at: string | null;
  ip_address: string | null;
  device_fingerprint: string | null;
  created_at: string;
  updated_at: string;
}

interface DbMockAnswer {
  answer_id: string;
  attempt_id: string;
  question_id: string;
  institute_id: string;
  is_answered: boolean;
  is_marked_for_review: boolean;
  numerical_answer: number | null;
  is_correct: boolean | null;
  marks_awarded: number | null;
  time_spent_seconds: number;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbMockAnswerOption {
  answer_option_id: string;
  answer_id: string;
  option_id: string;
  selected_at: string;
}

interface DbMockResult {
  result_id: string;
  attempt_id: string;
  test_id: string;
  student_id: string;
  institute_id: string;
  total_score: number;
  max_score: number;
  percentage: number;
  rank: number | null;
  percentile: number | null;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  total_time_seconds: number;
  avg_time_per_question: number;
  subject_breakdown: unknown | null;
  chapter_breakdown: unknown | null;
  is_released: boolean;
  generated_at: string;
  released_at: string | null;
}

// ─── Mapping Helpers ──────────────────────────────────────────────────────

function mapMockAttempt(db: DbMockAttempt): MockAttempt {
  return {
    attemptId: db.attempt_id,
    testId: db.test_id,
    studentId: db.student_id,
    instituteId: db.institute_id,
    attemptNumber: db.attempt_number,
    status: db.status as AttemptStatus,
    startedAt: db.started_at,
    submittedAt: db.submitted_at,
    timeRemainingSeconds: db.time_remaining_seconds,
    lastQuestionId: db.last_question_id,
    lastActivityAt: db.last_activity_at,
    ipAddress: db.ip_address,
    deviceFingerprint: db.device_fingerprint,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapMockAnswer(db: DbMockAnswer): MockAnswer {
  return {
    answerId: db.answer_id,
    attemptId: db.attempt_id,
    questionId: db.question_id,
    instituteId: db.institute_id,
    isAnswered: db.is_answered,
    isMarkedForReview: db.is_marked_for_review,
    numericalAnswer: db.numerical_answer,
    isCorrect: db.is_correct,
    marksAwarded: db.marks_awarded,
    timeSpentSeconds: db.time_spent_seconds,
    answeredAt: db.answered_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapMockAnswerOption(db: DbMockAnswerOption): MockAnswerOption {
  return {
    answerOptionId: db.answer_option_id,
    answerId: db.answer_id,
    optionId: db.option_id,
    selectedAt: db.selected_at,
  };
}

// ─── Debug Helper ────────────────────────────────────────────────────────

/**
 * Logs a failed ApiResponse before returning it.
 */
function logFail<T>(fnName: string, error: string): ApiResponse<T> {
  console.log('[API_FAIL]', fnName, '- error:', error);
  return { success: false, error };
}

// ─── Mapping Helpers ──────────────────────────────────────────────────────

function mapMockResult(db: DbMockResult): MockResult {
  return {
    resultId: db.result_id,
    attemptId: db.attempt_id,
    testId: db.test_id,
    studentId: db.student_id,
    instituteId: db.institute_id,
    totalScore: db.total_score,
    maxScore: db.max_score,
    percentage: db.percentage,
    rank: db.rank,
    percentile: db.percentile,
    correctCount: db.correct_count,
    wrongCount: db.wrong_count,
    skippedCount: db.skipped_count,
    totalTimeSeconds: db.total_time_seconds,
    avgTimePerQuestion: db.avg_time_per_question,
    subjectBreakdown: db.subject_breakdown as MockResult['subjectBreakdown'],
    chapterBreakdown: db.chapter_breakdown as MockResult['chapterBreakdown'],
    isReleased: db.is_released,
    generatedAt: db.generated_at,
    releasedAt: db.released_at,
  };
}

// ─── Sort Field Maps ──────────────────────────────────────────────────────

const ATTEMPT_SORT_MAP: Record<string, string> = {
  attemptNumber: 'attempt_number',
  status: 'status',
  startedAt: 'started_at',
  submittedAt: 'submitted_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const ANSWER_SORT_MAP: Record<string, string> = {
  timeSpentSeconds: 'time_spent_seconds',
  answeredAt: 'answered_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const RESULT_SORT_MAP: Record<string, string> = {
  totalScore: 'total_score',
  percentage: 'percentage',
  rank: 'rank',
  percentile: 'percentile',
  correctCount: 'correct_count',
  totalTimeSeconds: 'total_time_seconds',
  generatedAt: 'generated_at',
  releasedAt: 'released_at',
};

// ═══════════════════════════════════════════════════════════════════════════
//  Mock Attempts
// ═══════════════════════════════════════════════════════════════════════════

export async function getMockAttempts(
  filters?: MockAttemptFilters,
  sort?: MockAttemptSortOptions,
  pagination?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<MockAttempt>>> {
  try {
    let query = supabase
      .from('mock_attempts')
      .select('*', { count: 'exact' });

    if (filters?.testId) {
      validateUUID(filters.testId, 'testId');
      query = query.eq('test_id', filters.testId);
    }

    if (filters?.studentId) {
      validateUUID(filters.studentId, 'studentId');
      query = query.eq('student_id', filters.studentId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.instituteId) {
      validateUUID(filters.instituteId, 'instituteId');
      query = query.eq('institute_id', filters.instituteId);
    }

    if (filters?.startedAfter) {
      query = query.gte('started_at', filters.startedAfter);
    }

    if (filters?.startedBefore) {
      query = query.lte('started_at', filters.startedBefore);
    }

    if (filters?.ids && filters.ids.length > 0) {
      query = query.in('attempt_id', filters.ids);
    }

    const sortBy = ATTEMPT_SORT_MAP[sort?.sortBy ?? 'createdAt'] ?? 'created_at';
    const sortDir: SortDirection = sort?.sortDirection ?? 'desc';
    query = query.order(sortBy, { ascending: sortDir === 'asc' });

    const { page, pageSize, from, to } = buildPagination(pagination);
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    const attempts = (data ?? []).map(mapMockAttempt);

    return {
      success: true,
      data: buildPaginatedResponse(attempts, count ?? 0, page, pageSize),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function getMockAttemptById(attemptId: string): Promise<ApiResponse<MockAttempt>> {
  try {
    validateUUID(attemptId, 'attemptId');

    const { data, error } = await supabase
      .from('mock_attempts')
      .select('*')
      .eq('attempt_id', attemptId)
      .single<DbMockAttempt>();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: `Mock attempt not found: ${attemptId}` };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: mapMockAttempt(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function createMockAttempt(input: CreateMockAttemptInput): Promise<ApiResponse<MockAttempt>> {
  try {
    if (!input.testId) return logFail('createMockAttempt', 'testId is required.');
    if (!input.studentId) return logFail('createMockAttempt', 'studentId is required.');
    if (!input.instituteId) return logFail('createMockAttempt', 'instituteId is required.');

    validateUUID(input.testId, 'testId');
    validateUUID(input.studentId, 'studentId');
    validateUUID(input.instituteId, 'instituteId');

    // Resolve correct student_id from session
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    const profileId = session?.user?.id;

    let studentDetailsId: string | null = null;
    if (profileId) {
      const resolved = await resolveCurrentStudentId();
      studentDetailsId = resolved?.studentId ?? null;
    }

    const studentId = studentDetailsId ?? input.studentId;
    const testId = input.testId;
    const instituteId = input.instituteId;

    // Fetch mock test for attempt limit
    const testResult = await getMockTestById(testId);
    if (!testResult.success || !testResult.data) {
      return logFail('createMockAttempt', 'Mock test not found.');
    }
    const attemptLimit = testResult.data.attemptLimit;

    // Query latest attempt number for this student + test
    console.log('[DB] mock_attempts SELECT attempt_number WHERE student_id:', studentId, 'test_id:', testId);
    const { data: lastAttempt, error: lastAttemptError } = await supabase
      .from('mock_attempts')
      .select('attempt_number')
      .eq('student_id', studentId)
      .eq('test_id', testId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAttemptError) {
      console.log('[DB_ERROR] mock_attempts SELECT failed');
      console.log('  code:', lastAttemptError.code);
      console.log('  message:', lastAttemptError.message);
      console.log('  details:', (lastAttemptError as any).details);
      console.log('  hint:', (lastAttemptError as any).hint);
    } else {
      console.log('[DB] mock_attempts SELECT result:', JSON.stringify(lastAttempt));
    }

    const attemptNumber =
      lastAttempt?.attempt_number
        ? lastAttempt.attempt_number + 1
        : 1;

    console.log('[DB] Computed attemptNumber:', attemptNumber, 'attemptLimit:', attemptLimit);

    // Validate attempt limit
    if (attemptLimit !== null && attemptNumber > attemptLimit) {
      return logFail('createMockAttempt', 'Maximum attempt limit reached.');
    }

    const dbRecord: Record<string, unknown> = {
      test_id: testId,
      student_id: studentId,
      institute_id: instituteId,
      attempt_number: attemptNumber,
      ip_address: input.ipAddress ?? null,
      device_fingerprint: input.deviceFingerprint ?? null,
    };

    console.log('[DB] mock_attempts INSERT payload:', JSON.stringify(dbRecord));
    const { data, error } = await supabase
      .from('mock_attempts')
      .insert(dbRecord)
      .select()
      .single<DbMockAttempt>();

    if (error) {
      console.log('[DB_ERROR] mock_attempts INSERT failed');
      console.log('  code:', error.code);
      console.log('  message:', error.message);
      console.log('  details:', (error as any).details);
      console.log('  hint:', (error as any).hint);

      if (error.code === '23503') {
        return logFail('createMockAttempt', 'Cannot create attempt. The referenced test or student does not exist.');
      }
      return logFail('createMockAttempt', extractErrorMessage(error));
    }

    console.log('[DB] mock_attempts INSERT success, attemptId:', data.attempt_id);
    return { success: true, data: mapMockAttempt(data) };
  } catch (err) {
    console.log('[DB_CATCH] createMockAttempt unexpected error:', err);
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function updateMockAttempt(
  attemptId: string,
  input: UpdateMockAttemptInput,
): Promise<ApiResponse<MockAttempt>> {
  try {
    validateUUID(attemptId, 'attemptId');

    const dbRecord: Record<string, unknown> = {};

    if (input.timeRemainingSeconds !== undefined) {
      dbRecord.time_remaining_seconds = input.timeRemainingSeconds;
    }
    if (input.status !== undefined) {
      dbRecord.status = input.status;
    }
    if (input.submittedAt !== undefined) {
      dbRecord.submitted_at = input.submittedAt;
    }
    if (input.lastQuestionId !== undefined) {
      dbRecord.last_question_id = input.lastQuestionId;
    }
    if (input.lastActivityAt !== undefined) {
      dbRecord.last_activity_at = input.lastActivityAt;
    }

    console.log('[DB] mock_attempts UPDATE payload:', JSON.stringify(dbRecord), 'WHERE attempt_id:', attemptId);
    const { data, error } = await supabase
      .from('mock_attempts')
      .update(dbRecord)
      .eq('attempt_id', attemptId)
      .select()
      .single<DbMockAttempt>();

    if (error) {
      console.log('[DB_ERROR] mock_attempts UPDATE failed');
      console.log('  code:', error.code);
      console.log('  message:', error.message);
      console.log('  details:', (error as any).details);
      console.log('  hint:', (error as any).hint);

      if (error.code === 'PGRST116') {
        return logFail('updateMockAttempt', `Mock attempt not found: ${attemptId}`);
      }
      return logFail('updateMockAttempt', extractErrorMessage(error));
    }

    console.log('[DB] mock_attempts UPDATE success, status:', data.status);
    return { success: true, data: mapMockAttempt(data) };
  } catch (err) {
    console.log('[DB_CATCH] updateMockAttempt unexpected error:', err);
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function deleteMockAttempt(attemptId: string): Promise<ApiResponse<void>> {
  try {
    validateUUID(attemptId, 'attemptId');

    const { error } = await supabase
      .from('mock_attempts')
      .delete()
      .eq('attempt_id', attemptId);

    if (error) {
      if (error.code === '23503') {
        return {
          success: false,
          error: 'Cannot delete this attempt because it has answers or results.',
        };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Mock Answers
// ═══════════════════════════════════════════════════════════════════════════

export async function getMockAnswers(
  filters?: MockAnswerFilters,
  sort?: MockAnswerSortOptions,
): Promise<ApiResponse<MockAnswer[]>> {
  try {
    let query = supabase
      .from('mock_answers')
      .select('*');

    if (filters?.attemptId) {
      validateUUID(filters.attemptId, 'attemptId');
      query = query.eq('attempt_id', filters.attemptId);
    }

    if (filters?.questionId) {
      validateUUID(filters.questionId, 'questionId');
      query = query.eq('question_id', filters.questionId);
    }

    if (filters?.isAnswered !== undefined) {
      query = query.eq('is_answered', filters.isAnswered);
    }

    if (filters?.isMarkedForReview !== undefined) {
      query = query.eq('is_marked_for_review', filters.isMarkedForReview);
    }

    if (filters?.ids && filters.ids.length > 0) {
      query = query.in('answer_id', filters.ids);
    }

    const sortBy = ANSWER_SORT_MAP[sort?.sortBy ?? 'createdAt'] ?? 'created_at';
    const sortDir: SortDirection = sort?.sortDirection ?? 'asc';
    query = query.order(sortBy, { ascending: sortDir === 'asc' });

    const { data, error } = await query;

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: (data ?? []).map(mapMockAnswer) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function getMockAnswerById(answerId: string): Promise<ApiResponse<MockAnswer>> {
  try {
    validateUUID(answerId, 'answerId');

    const { data, error } = await supabase
      .from('mock_answers')
      .select('*')
      .eq('answer_id', answerId)
      .single<DbMockAnswer>();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: `Mock answer not found: ${answerId}` };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: mapMockAnswer(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function createMockAnswer(input: CreateMockAnswerInput): Promise<ApiResponse<MockAnswer>> {
  try {
    if (!input.attemptId) return logFail('createMockAnswer', 'attemptId is required.');
    if (!input.questionId) return logFail('createMockAnswer', 'questionId is required.');
    if (!input.instituteId) return logFail('createMockAnswer', 'instituteId is required.');

    validateUUID(input.attemptId, 'attemptId');
    validateUUID(input.questionId, 'questionId');
    validateUUID(input.instituteId, 'instituteId');

    const dbRecord: Record<string, unknown> = {
      attempt_id: input.attemptId,
      question_id: input.questionId,
      institute_id: input.instituteId,
    };

    console.log('[DB] mock_answers INSERT payload:', JSON.stringify(dbRecord));
    const { data, error } = await supabase
      .from('mock_answers')
      .insert(dbRecord)
      .select()
      .single<DbMockAnswer>();

    if (error) {
      console.log('[DB_ERROR] mock_answers INSERT failed');
      console.log('  code:', error.code);
      console.log('  message:', error.message);
      console.log('  details:', (error as any).details);
      console.log('  hint:', (error as any).hint);

      if (error.code === '23503') {
        return logFail('createMockAnswer', 'Cannot create answer. The referenced attempt or question does not exist.');
      }
      return logFail('createMockAnswer', extractErrorMessage(error));
    }

    console.log('[DB] mock_answers INSERT success, answerId:', data.answer_id);
    return { success: true, data: mapMockAnswer(data) };
  } catch (err) {
    console.log('[DB_CATCH] createMockAnswer unexpected error:', err);
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function updateMockAnswer(
  answerId: string,
  input: UpdateMockAnswerInput,
): Promise<ApiResponse<MockAnswer>> {
  try {
    validateUUID(answerId, 'answerId');

    const dbRecord: Record<string, unknown> = {};

    if (input.isAnswered !== undefined) dbRecord.is_answered = input.isAnswered;
    if (input.isMarkedForReview !== undefined) dbRecord.is_marked_for_review = input.isMarkedForReview;
    if (input.numericalAnswer !== undefined) dbRecord.numerical_answer = input.numericalAnswer;
    if (input.timeSpentSeconds !== undefined) dbRecord.time_spent_seconds = input.timeSpentSeconds;
    if (input.answeredAt !== undefined) dbRecord.answered_at = input.answeredAt;

    console.log('[DB] mock_answers UPDATE payload:', JSON.stringify(dbRecord), 'WHERE answer_id:', answerId);
    const { data, error } = await supabase
      .from('mock_answers')
      .update(dbRecord)
      .eq('answer_id', answerId)
      .select()
      .single<DbMockAnswer>();

    if (error) {
      console.log('[DB_ERROR] mock_answers UPDATE failed');
      console.log('  code:', error.code);
      console.log('  message:', error.message);
      console.log('  details:', (error as any).details);
      console.log('  hint:', (error as any).hint);

      if (error.code === 'PGRST116') {
        return logFail('updateMockAnswer', `Mock answer not found: ${answerId}`);
      }
      return logFail('updateMockAnswer', extractErrorMessage(error));
    }

    console.log('[DB] mock_answers UPDATE success, answerId:', data.answer_id);
    return { success: true, data: mapMockAnswer(data) };
  } catch (err) {
    console.log('[DB_CATCH] updateMockAnswer unexpected error:', err);
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function deleteMockAnswer(answerId: string): Promise<ApiResponse<void>> {
  try {
    validateUUID(answerId, 'answerId');

    const { error } = await supabase
      .from('mock_answers')
      .delete()
      .eq('answer_id', answerId);

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Mock Answer Options (Junction)
// ═══════════════════════════════════════════════════════════════════════════

export async function getMockAnswerOptions(
  filters?: MockAnswerOptionFilters,
): Promise<ApiResponse<MockAnswerOption[]>> {
  try {
    let query = supabase
      .from('mock_answer_options')
      .select('*');

    if (filters?.answerId) {
      validateUUID(filters.answerId, 'answerId');
      query = query.eq('answer_id', filters.answerId);
    }

    if (filters?.optionId) {
      validateUUID(filters.optionId, 'optionId');
      query = query.eq('option_id', filters.optionId);
    }

    if (filters?.answerIds && filters.answerIds.length > 0) {
      query = query.in('answer_id', filters.answerIds);
    }

    query = query.order('selected_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: (data ?? []).map(mapMockAnswerOption) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function createMockAnswerOption(
  input: CreateMockAnswerOptionInput,
): Promise<ApiResponse<MockAnswerOption>> {
  try {
    if (!input.answerId) return logFail('createMockAnswerOption', 'answerId is required.');
    if (!input.optionId) return logFail('createMockAnswerOption', 'optionId is required.');

    validateUUID(input.answerId, 'answerId');
    validateUUID(input.optionId, 'optionId');

    const dbRecord: Record<string, unknown> = {
      answer_id: input.answerId,
      option_id: input.optionId,
    };

    console.log('[DB] mock_answer_options INSERT payload:', JSON.stringify(dbRecord));
    const { data, error } = await supabase
      .from('mock_answer_options')
      .insert(dbRecord)
      .select()
      .single<DbMockAnswerOption>();

    if (error) {
      console.log('[DB_ERROR] mock_answer_options INSERT failed');
      console.log('  code:', error.code);
      console.log('  message:', error.message);
      console.log('  details:', (error as any).details);
      console.log('  hint:', (error as any).hint);

      if (error.code === '23503') {
        return logFail('createMockAnswerOption', 'Cannot add option. The referenced answer or question option does not exist.');
      }
      return logFail('createMockAnswerOption', extractErrorMessage(error));
    }

    console.log('[DB] mock_answer_options INSERT success, answerOptionId:', data.answer_option_id);
    return { success: true, data: mapMockAnswerOption(data) };
  } catch (err) {
    console.log('[DB_CATCH] createMockAnswerOption unexpected error:', err);
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function deleteMockAnswerOption(answerOptionId: string): Promise<ApiResponse<void>> {
  try {
    validateUUID(answerOptionId, 'answerOptionId');

    const { error } = await supabase
      .from('mock_answer_options')
      .delete()
      .eq('answer_option_id', answerOptionId);

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function deleteMockAnswerOptionsByAnswerId(answerId: string): Promise<ApiResponse<void>> {
  try {
    validateUUID(answerId, 'answerId');

    const { error } = await supabase
      .from('mock_answer_options')
      .delete()
      .eq('answer_id', answerId);

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Mock Results (Read-only)
// ═══════════════════════════════════════════════════════════════════════════

export async function getMockResults(
  filters?: MockResultFilters,
  sort?: MockResultSortOptions,
): Promise<ApiResponse<MockResult[]>> {
  try {
    let query = supabase
      .from('mock_results')
      .select('*');

    if (filters?.attemptId) {
      validateUUID(filters.attemptId, 'attemptId');
      query = query.eq('attempt_id', filters.attemptId);
    }

    if (filters?.testId) {
      validateUUID(filters.testId, 'testId');
      query = query.eq('test_id', filters.testId);
    }

    if (filters?.studentId) {
      validateUUID(filters.studentId, 'studentId');
      query = query.eq('student_id', filters.studentId);
    }

    if (filters?.instituteId) {
      validateUUID(filters.instituteId, 'instituteId');
      query = query.eq('institute_id', filters.instituteId);
    }

    if (filters?.isReleased !== undefined) {
      query = query.eq('is_released', filters.isReleased);
    }

    if (filters?.ids && filters.ids.length > 0) {
      query = query.in('result_id', filters.ids);
    }

    const sortBy = RESULT_SORT_MAP[sort?.sortBy ?? 'generatedAt'] ?? 'generated_at';
    const sortDir: SortDirection = sort?.sortDirection ?? 'desc';
    query = query.order(sortBy, { ascending: sortDir === 'asc' });

    const { data, error } = await query;

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: (data ?? []).map(mapMockResult) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function getMockResultByAttemptId(attemptId: string): Promise<ApiResponse<MockResult>> {
  try {
    validateUUID(attemptId, 'attemptId');

    const { data, error } = await supabase
      .from('mock_results')
      .select('*')
      .eq('attempt_id', attemptId)
      .single<DbMockResult>();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: `Mock result not found for attempt: ${attemptId}` };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: mapMockResult(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function getMockResultById(resultId: string): Promise<ApiResponse<MockResult>> {
  try {
    validateUUID(resultId, 'resultId');

    const { data, error } = await supabase
      .from('mock_results')
      .select('*')
      .eq('result_id', resultId)
      .single<DbMockResult>();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: `Mock result not found: ${resultId}` };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: mapMockResult(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Atomic Initialization (RPC-backed)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Response shape from the `initialize_mock_attempt` RPC.
 */
export interface InitializeMockAttemptRpcResult {
  /** Whether the operation succeeded. */
  success: boolean;
  /** The attempt ID (new or existing). */
  attempt_id?: string;
  /** True if an existing in_progress attempt was reused. */
  reused?: boolean;
  /**
   * Server-corrected remaining time in seconds. Only set when reused=true.
   * Computed as: stored_remaining - (NOW() - last_activity_at).
   * The client MUST use this value (not the raw stored time_remaining_seconds)
   * to restore the timer on resume, eliminating the crash-recovery vulnerability.
   */
  effective_remaining_seconds?: number;
  /**
   * True when effective_remaining_seconds <= 0. The attempt's timer has
   * expired — the student should not be allowed to resume the test.
   */
  is_expired?: boolean;
  /**
   * Remaining attempts the student can still use.  -1 = unlimited.
   * Only set when is_expired = true. Used by the UI to decide whether
   * to show "Start Another Attempt" or "No attempts remaining".
   */
  remaining_attempts?: number;
  /** Human-readable error message (on failure). */
  error?: string;
  /** Machine-readable error code (on failure). */
  code?: string;
}

/**
 * Initialize a mock attempt atomically via the backend RPC.
 *
 * This replaces the old client-side pattern of:
 *   createMockAttempt() → N × createMockAnswer()
 *
 * with a single database transaction that:
 *   1. Detects existing in_progress attempts and reuses them
 *   2. Recovers partially-initialised attempts (missing mock_answers)
 *   3. Creates new attempts with bulk-inserted mock_answers
 *   4. Serialises concurrent requests via pg_advisory_xact_lock
 *
 * @param testId      - UUID of the mock test
 * @param studentId   - UUID of the student (from student_details)
 * @param instituteId - UUID of the institute
 * @param attemptLimit - Optional max attempts allowed (from mock_tests.attemptLimit)
 * * @returns ApiResponse with { attemptId: string; reused: boolean; effectiveRemainingSeconds?: number; isExpired?: boolean; remainingAttempts?: number } */
export async function initializeMockAttemptRpc(
  testId: string,
  studentId: string,
  instituteId: string,
  attemptLimit: number | null,
): Promise<ApiResponse<{ attemptId: string; reused: boolean; effectiveRemainingSeconds?: number; isExpired?: boolean; remainingAttempts?: number }>> {
  try {
    validateUUID(testId, 'testId');
    validateUUID(studentId, 'studentId');
    validateUUID(instituteId, 'instituteId');

    console.log('[RPC] Calling initialize_mock_attempt...');
    console.log('[RPC]   testId:', testId);
    console.log('[RPC]   studentId:', studentId);
    console.log('[RPC]   instituteId:', instituteId);
    console.log('[RPC]   attemptLimit:', attemptLimit);

    const { data, error } = await supabase.rpc(
      'initialize_mock_attempt',
      {
        p_test_id: testId,
        p_student_id: studentId,
        p_institute_id: instituteId,
        p_attempt_limit: attemptLimit,
      },
    );

    if (error) {
      console.log('[RPC_ERROR] Supabase RPC error:', error);
      return { success: false, error: extractErrorMessage(error) };
    }

    const result = data as InitializeMockAttemptRpcResult;
    console.log('[RPC] RPC result:', JSON.stringify(result));

    if (!result.success) {
      console.log('[RPC_ERROR] RPC returned failure:', result.error);
      // Map specific error codes to user-friendly messages
      if (result.code === 'ATTEMPT_LIMIT_REACHED') {
        return { success: false, error: result.error ?? 'Maximum attempt limit reached.' };
      }
      return { success: false, error: result.error ?? 'Failed to initialize test attempt.' };
    }

    if (!result.attempt_id) {
      console.log('[RPC_ERROR] RPC succeeded but no attempt_id returned');
      return { success: false, error: 'Initialization succeeded but no attempt ID was returned.' };
    }

    console.log('[RPC] Initialization complete:', result.reused ? 'REUSED' : 'NEW', 'attemptId:', result.attempt_id, 'effectiveRemainingSeconds:', result.effective_remaining_seconds, 'isExpired:', result.is_expired, 'remainingAttempts:', result.remaining_attempts);
    return {
      success: true,
      data: {
        attemptId: result.attempt_id,
        reused: result.reused ?? false,
        effectiveRemainingSeconds: result.effective_remaining_seconds,
        isExpired: result.is_expired,
        remainingAttempts: result.remaining_attempts,
      },
    };
  } catch (err) {
    console.log('[RPC_CATCH] initializeMockAttemptRpc unexpected error:', err);
    return { success: false, error: extractErrorMessage(err) };
  }
}
