/**
 * Mock Evaluation Service
 *
 * Backend evaluation engine that computes results for a submitted mock test
 * attempt. Called immediately after an attempt transitions to `submitted`.
 *
 * ## Flow
 *
 * 1. Load the attempt → get testId, studentId, instituteId
 * 2. Load the mock test → get totalMarks, negativeMarking
 * 3. Load all mock_test_questions → get questionSnapshot for correct answers
 * 4. Load all mock_answers for the attempt
 * 5. Load all mock_answer_options (selected options) for those answers
 * 6. Compare submitted answers with correct answers from snapshots
 * 7. Calculate scores and insert mock_results row
 *
 * ## Duplicate prevention
 *
 * Before inserting, checks if a result already exists for the attempt.
 * If so, skips evaluation entirely.
 *
 * @module mockEvaluationService
 */

import { supabase } from '../../config/supabase';
import { validateUUID, extractErrorMessage } from '../../utils/supabase';
import { getMockAttemptById, getMockAnswers, getMockAnswerOptions } from './mockAttemptService';
import { getMockTestById } from './mockTestService';
import { getMockTestQuestions } from './mockTestQuestionService';
import type { ApiResponse } from '../../types/academic';
import type {
  MockResult,
  MockAnswer,
  MockAnswerOption,
  MockTestQuestion,
  QuestionSnapshotOption,
  MockTest,
  MockAttempt,
} from '../../types/mockTest';

// ─── Database Row Shapes ──────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Resolve the effective negative marks for a question.
 * Uses per-question override if set, otherwise falls back to test-level default.
 */
function getEffectiveNegativeMarks(
  mtq: MockTestQuestion,
  mockTest: MockTest,
): number {
  if (mtq.negativeMarksOverride !== null && mtq.negativeMarksOverride !== undefined) {
    return mtq.negativeMarksOverride;
  }
  return mockTest.negativeMarking;
}

/**
 * Check if a submitted MCQ/MSQ answer matches the correct options.
 *
 * For MCQ / True-False: exactly one correct option, and the student must
 * select that exact option and no others.
 *
 * For MSQ: student must select ALL correct options and NO incorrect options.
 */
function isOptionAnswerCorrect(
  selectedOptionIds: string[],
  correctOptions: QuestionSnapshotOption[],
): boolean {
  const correctIds = correctOptions
    .filter((o) => o.isCorrect)
    .map((o) => o.optionId)
    .sort();

  const selected = [...selectedOptionIds].sort();

  if (selected.length !== correctIds.length) return false;

  return selected.every((id, idx) => id === correctIds[idx]);
}

/**
 * Check if a numerical answer is correct within tolerance.
 */
function isNumericalAnswerCorrect(
  studentAnswer: number,
  correctAnswer: number,
  tolerance: number | null,
): boolean {
  if (tolerance === null || tolerance === undefined) {
    return studentAnswer === correctAnswer;
  }
  return Math.abs(studentAnswer - correctAnswer) <= tolerance;
}

// ─── Evaluation Engine ─────────────────────────────────────────────────────

/**
 * Evaluate a submitted attempt and insert a result row.
 *
 * Steps:
 * 1. Check for existing result (duplicate prevention)
 * 2. Load attempt, mock test, test questions, answers, and answer options
 * 3. Compare each answer against the correct options from question snapshots
 * 4. Calculate aggregate scores
 * 5. Update mock_answers with is_correct and marks_awarded
 * 6. Insert one row into mock_results
 *
 * @param attemptId - The UUID of the submitted attempt.
 *
 * @returns The created MockResult, or an error if evaluation fails.
 */
export async function evaluateAttempt(
  attemptId: string,
): Promise<ApiResponse<MockResult>> {
  try {
    validateUUID(attemptId, 'attemptId');

    console.log('[EVAL] evaluateAttempt() started for attemptId:', attemptId);

    // ── Step 1: Duplicate prevention ────────────────────────────────────
    console.log('[EVAL] Step 1 — Checking for existing result...');
    const existingResult = await getMockResultByAttemptId(attemptId);
    console.log('[EVAL] Existing result check:', existingResult.success, existingResult.data?.resultId);
    if (existingResult.success && existingResult.data) {
      console.log('[EVAL] Result already exists, returning early');
      return { success: true, data: existingResult.data };
    }

    // ── Step 2: Load attempt data ───────────────────────────────────────
    console.log('[EVAL] Step 2 — Loading attempt:', attemptId);
    const attemptResult = await getMockAttemptById(attemptId);
    if (!attemptResult.success || !attemptResult.data) {
      return { success: false, error: `Attempt not found: ${attemptId}` };
    }
    const attempt: MockAttempt = attemptResult.data;

    console.log('[EVAL] Step 2 — Loading mock test:', attempt.testId);
    const testResult = await getMockTestById(attempt.testId);
    console.log('[EVAL] getMockTestById success:', testResult.success);
    if (!testResult.success || !testResult.data) {
      console.log('[EVAL_ERROR] Mock test not found:', attempt.testId);
      return { success: false, error: `Mock test not found: ${attempt.testId}` };
    }
    const mockTest: MockTest = testResult.data;
    console.log('[EVAL] Loaded test:', mockTest.title, 'negMarking:', mockTest.negativeMarking);

    console.log('[EVAL] Step 2 — Loading test questions:', attempt.testId);
    const questionsResult = await getMockTestQuestions(attempt.testId);
    if (!questionsResult.success || !questionsResult.data) {
      return { success: false, error: 'Failed to load test questions.' };
    }
    const testQuestions: MockTestQuestion[] = questionsResult.data;

    if (testQuestions.length === 0) {
      return { success: false, error: 'No questions found for this test.' };
    }

    console.log('[EVAL] Loading answers for attempt:', attemptId);
    const answersResult = await getMockAnswers({ attemptId });
    console.log('[EVAL] getMockAnswers success:', answersResult.success, 'count:', answersResult.data?.length);
    if (!answersResult.success || !answersResult.data) {
      console.log('[EVAL_ERROR] Failed to load answers');
      return { success: false, error: 'Failed to load answers.' };
    }
    const answers: MockAnswer[] = answersResult.data;
    console.log('[EVAL] Loaded', answers.length, 'answers');

    // ── Step 3: Load answer options (selected options per answer) ────────
    const answerIds = answers.map((a) => a.answerId);
    const answerOptionsMap = new Map<string, MockAnswerOption[]>();

    if (answerIds.length > 0) {
      console.log('[EVAL] Loading answer options for', answerIds.length, 'answers');
      const optsResult = await getMockAnswerOptions({ answerIds });
      console.log('[EVAL] getMockAnswerOptions success:', optsResult.success, 'count:', optsResult.data?.length);
      if (optsResult.success && optsResult.data) {
        for (const opt of optsResult.data) {
          const existing = answerOptionsMap.get(opt.answerId) ?? [];
          existing.push(opt);
          answerOptionsMap.set(opt.answerId, existing);
        }
      }
    }
    console.log('[EVAL] answerOptionsMap size:', answerOptionsMap.size);

    // ── Step 4: Build question lookup by questionId ─────────────────────
    const questionMap = new Map<string, MockTestQuestion>();
    for (const mtq of testQuestions) {
      questionMap.set(mtq.questionId, mtq);
    }
    console.log('[EVAL] questionMap size:', questionMap.size);

    // ── Step 5: Score each answer ────────────────────────────────────────
    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let totalTimeSeconds = 0;
    const answerUpdates: { answerId: string; isCorrect: boolean; marksAwarded: number }[] = [];

    for (const answer of answers) {
      const mtq = questionMap.get(answer.questionId);
      if (!mtq) {
        continue; // Question not in this test (shouldn't happen)
      }

      const questionMarks = mtq.marks;
      maxScore += questionMarks;
      totalTimeSeconds += answer.timeSpentSeconds;

      if (!answer.isAnswered) {
        // Skipped
        skippedCount++;
        answerUpdates.push({
          answerId: answer.answerId,
          isCorrect: false,
          marksAwarded: 0,
        });
        continue;
      }

      // Answered — determine correctness
      const snapshot = mtq.questionSnapshot;
      let isCorrect = false;
      let marksAwarded = 0;

      if (!snapshot) {
        // No snapshot — can't evaluate (shouldn't happen for published tests)
        skippedCount++;
        answerUpdates.push({
          answerId: answer.answerId,
          isCorrect: false,
          marksAwarded: 0,
        });
        continue;
      }

      const snapshotOptions = snapshot.options ?? [];
      const correctOptions = snapshotOptions.filter((o) => o.isCorrect);

      if (snapshot.questionType === 'numerical') {
        // Numerical answer
        if (answer.numericalAnswer !== null && answer.numericalAnswer !== undefined) {
          isCorrect = isNumericalAnswerCorrect(
            answer.numericalAnswer,
            snapshot.correctNumericalAnswer ?? 0,
            snapshot.numericalTolerance,
          );
        } else {
          isCorrect = false;
        }
      } else {
        // MCQ, MSQ, True/False — compare selected options
        const selectedOptions = answerOptionsMap.get(answer.answerId) ?? [];
        const selectedOptionIds = selectedOptions.map((o) => o.optionId);
        isCorrect = isOptionAnswerCorrect(selectedOptionIds, correctOptions);
      }

      if (isCorrect) {
        marksAwarded = questionMarks;
        correctCount++;
        totalScore += marksAwarded;
      } else {
        // Wrong answer — apply negative marking
        const negativeMarks = getEffectiveNegativeMarks(mtq, mockTest);
        marksAwarded = negativeMarks > 0 ? -negativeMarks : 0;
        wrongCount++;
        totalScore += marksAwarded;
      }

      answerUpdates.push({ answerId: answer.answerId, isCorrect, marksAwarded });
    }

    console.log('[EVAL] Step 6 — Updating mock_answers with scoring results...');
    console.log('[EVAL] Scores summary: correctCount:', correctCount, 'wrongCount:', wrongCount, 'skippedCount:', skippedCount);
    console.log('[EVAL] Score:', totalScore, '/', maxScore);

    // ── Step 6: Update mock_answers with scoring results ─────────────────
    let answersUpdated = 0;
    let answerUpdateErrors = 0;
    for (const update of answerUpdates) {
      console.log('[DB] mock_answers UPDATE is_correct:', update.isCorrect, 'marks_awarded:', update.marksAwarded, 'WHERE answer_id:', update.answerId);
      const { error: updateError } = await supabase
        .from('mock_answers')
        .update({
          is_correct: update.isCorrect,
          marks_awarded: update.marksAwarded,
        })
        .eq('answer_id', update.answerId);

      if (updateError) {
        answerUpdateErrors++;
        console.log('[DB_ERROR] mock_answers UPDATE (scoring) failed');
        console.log('  answerId:', update.answerId);
        console.log('  code:', updateError.code);
        console.log('  message:', updateError.message);
        console.log('  details:', (updateError as any).details);
        console.log('  hint:', (updateError as any).hint);
      } else {
        answersUpdated++;
      }
    }

    if (answerUpdateErrors > 0) {
      console.log('[EVAL_ERROR] Failed to update', answerUpdateErrors, 'answers');
      return { success: false, error: `Failed to update ${answerUpdateErrors} answer(s) with scoring results.` };
    }
    console.log('[EVAL] Answers updated:', answersUpdated);

    // ── Step 7: Compute aggregate values ─────────────────────────────────
    const percentage = maxScore > 0 ? Math.max(0, (totalScore / maxScore) * 100) : 0;
    const avgTimePerQuestion = testQuestions.length > 0
      ? totalTimeSeconds / testQuestions.length
      : 0;

    const resultPayload = {
      attempt_id: attemptId,
      test_id: attempt.testId,
      student_id: attempt.studentId,
      institute_id: attempt.instituteId,
      total_score: totalScore,
      max_score: maxScore,
      percentage,
      correct_count: correctCount,
      wrong_count: wrongCount,
      skipped_count: skippedCount,
      total_time_seconds: totalTimeSeconds,
      avg_time_per_question: avgTimePerQuestion,
    };

    // ── Step 8: Insert mock_results row ──────────────────────────────────
    const dbRecord: Record<string, unknown> = {
      ...resultPayload,
      subject_breakdown: null,
      chapter_breakdown: null,
      is_released: false,
      rank: null,
      percentile: null,
      released_at: null,
    };

    console.log('[DB] mock_results INSERT payload:', JSON.stringify(dbRecord));
    const { data: resultData, error: insertError } = await supabase
      .from('mock_results')
      .insert(dbRecord)
      .select()
      .single<DbMockResult>();

    if (insertError) {
      console.log('[DB_ERROR] mock_results INSERT failed');
      console.log('  code:', insertError.code);
      console.log('  message:', insertError.message);
      console.log('  details:', (insertError as any).details);
      console.log('  hint:', (insertError as any).hint);
      console.log('[EVAL_ERROR] Failed to insert result');
      return { success: false, error: extractErrorMessage(insertError) };
    }

    console.log('[EVAL] Result inserted successfully. resultId:', resultData.result_id);
    console.log('[EVAL] Final result:', JSON.stringify(resultData));
    return { success: true, data: mapMockResult(resultData) };
  } catch (err) {
    console.log('[EVAL_CATCH] evaluateAttempt unexpected error:', err);
    if (err instanceof Error) {
      console.log('  name:', err.name);
      console.log('  message:', err.message);
      console.log('  stack:', err.stack);
      const pgCode = (err as any).code;
      if (pgCode) console.log('  Postgres code:', pgCode);
      const pgDetail = (err as any).details;
      if (pgDetail) console.log('  Postgres details:', pgDetail);
      const pgHint = (err as any).hint;
      if (pgHint) console.log('  Postgres hint:', pgHint);
    }
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Check if a result already exists for an attempt.
 * Used by evaluateAttempt for duplicate prevention.
 */
async function getMockResultByAttemptId(
  attemptId: string,
): Promise<ApiResponse<MockResult>> {
  try {
    validateUUID(attemptId, 'attemptId');

    const { data, error } = await supabase
      .from('mock_results')
      .select('*')
      .eq('attempt_id', attemptId)
      .maybeSingle<DbMockResult>();

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    if (!data) {
      return { success: false, error: `Mock result not found for attempt: ${attemptId}` };
    }

    return { success: true, data: mapMockResult(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}
