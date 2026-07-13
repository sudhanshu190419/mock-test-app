/**
 * Review Service
 *
 * Service layer for the Student Answer Review module.
 * Fetches per-question review data from existing tables:
 * - mock_answers (via mockAttemptService)
 * - mock_answer_options (via mockAttemptService)
 * - mock_test_questions.questionSnapshot (via mockTestQuestionService)
 * - question_explanations (via questionExplanationService)
 *
 * This service does NOT duplicate evaluation logic or calculate anything
 * on the device. It reads the pre-computed `is_correct`, `marks_awarded`,
 * and snapshot data that the evaluation engine already stored.
 *
 * @module services/reviewService
 */

import { getMockAnswers, getMockAnswerOptions } from './mockTest/mockAttemptService';
import { getMockTestQuestions } from './mockTest/mockTestQuestionService';
import { getQuestionExplanation } from './mockTest/questionExplanationService';
import { supabase } from '../config/supabase';
import { getQuestionById } from './mockTest/questionService';
import type {
  ReviewItem,
  ReviewQuestionDetail,
  ReviewOptionDisplay,
  ReviewQuestionStatus,
  OptionFeedback,
} from '../types/review';
import type { QuestionSnapshot, QuestionSnapshotOption } from '../types/mockTest';

// ─── Constants ───────────────────────────────────────────────────────

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SIGNED_URL_EXPIRY = 300; // 5 minutes

// ═══════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Fetch the answer review list for a given attempt.
 * Returns lightweight items — no full question content.
 *
 * Reads from:
 * - mock_answers (via getMockAnswers)
 * - mock_answer_options (via getMockAnswerOptions)
 * - mock_test_questions.questionSnapshot (via getMockTestQuestions)
 */
export async function getAnswerReviewList(
  testId: string,
  attemptId: string,
): Promise<{ success: true; data: ReviewItem[] } | { success: false; error: string }> {
  try {
    // Fetch mock test questions (with snapshots) ordered by sequence
    const questionsResp = await getMockTestQuestions(testId, 'orderSequence', 'asc');
    if (!questionsResp.success || !questionsResp.data) {
      return { success: false, error: questionsResp.error ?? 'Failed to fetch test questions.' };
    }

    // Fetch all answers for this attempt
    const answersResp = await getMockAnswers({ attemptId });
    if (!answersResp.success || !answersResp.data) {
      return { success: false, error: answersResp.error ?? 'Failed to fetch answers.' };
    }

    // Build a map of questionId → answer
    const answerMap = new Map<string, typeof answersResp.data[0]>();
    for (const answer of answersResp.data) {
      answerMap.set(answer.questionId, answer);
    }

    // Build review items in question order
    const items: ReviewItem[] = [];

    for (const mtq of questionsResp.data) {
      const snapshot = mtq.questionSnapshot;
      const questionId = snapshot?.questionId ?? mtq.questionId;
      const answer = answerMap.get(questionId);

      const isAnswered = answer?.isAnswered ?? false;
      const isCorrect = answer?.isCorrect;
      const marksAwarded = answer?.marksAwarded ?? 0;
      const marks = snapshot?.marks ?? mtq.marks;

      let status: ReviewQuestionStatus = 'skipped';
      if (isAnswered && isCorrect === true) {
        status = 'correct';
      } else if (isAnswered && isCorrect === false) {
        status = 'incorrect';
      }

      items.push({
        index: mtq.orderSequence,
        questionId,
        subjectName: mtq.sectionName ?? null,
        status,
        marksAwarded,
        marks,
      });
    }

    return { success: true, data: items };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to load answer review: ${message}` };
  }
}

/**
 * Fetch full question detail for the answer review detail screen.
 *
 * Includes question stem, options with feedback states, marks,
 * metadata, and explanation (text, images, video).
 */
export async function getReviewQuestionDetail(
  testId: string,
  attemptId: string,
  questionIndex: number,
): Promise<
  { success: true; data: ReviewQuestionDetail } | { success: false; error: string }
> {
  try {
    // Fetch the specific mock test question by index
    const questionsResp = await getMockTestQuestions(testId, 'orderSequence', 'asc');
    if (!questionsResp.success || !questionsResp.data) {
      return { success: false, error: questionsResp.error ?? 'Failed to fetch test questions.' };
    }

    const mtq = questionsResp.data[questionIndex];
    if (!mtq) {
      return { success: false, error: `Question at index ${questionIndex} not found.` };
    }

    const snapshot = mtq.questionSnapshot;
    if (!snapshot) {
      return { success: false, error: 'Question snapshot is missing. The test may not have been published.' };
    }

    const questionId = snapshot.questionId ?? mtq.questionId;

    // Fetch the answer for this question
    const answersResp = await getMockAnswers({ attemptId, questionId });
    if (!answersResp.success || !answersResp.data) {
      return { success: false, error: answersResp.error ?? 'Failed to fetch answer data.' };
    }

    const answer = answersResp.data[0];
    const isAnswered = answer?.isAnswered ?? false;
    const isCorrect = answer?.isCorrect;
    const marksAwarded = answer?.marksAwarded ?? 0;

    let status: ReviewQuestionStatus = 'skipped';
    if (isAnswered && isCorrect === true) status = 'correct';
    else if (isAnswered && isCorrect === false) status = 'incorrect';

    // Fetch selected option IDs
    let selectedOptionIds: Set<string> = new Set();
    if (answer) {
      const optsResp = await getMockAnswerOptions({ answerId: answer.answerId });
      if (optsResp.success && optsResp.data) {
        selectedOptionIds = new Set(optsResp.data.map((o) => o.optionId));
      }
    }

    // Generate signed URLs for images from the snapshot
    const signedUrlMap = await generateSignedUrlsFromSnapshot(snapshot);

    // Build stem image URL
    let stemImageUrl: string | undefined;
    let stemImageAlt: string | undefined;
    if (snapshot.images && snapshot.images.length > 0) {
      const stemImg = snapshot.images[0];
      const key = imageStorageKey(stemImg);
      stemImageUrl = signedUrlMap[key];
      stemImageAlt = stemImg.altText;
    }

    // Build options with feedback
    const correctOptionIds = new Set(
      snapshot.options.filter((o) => o.isCorrect).map((o) => o.optionId),
    );

    const options: ReviewOptionDisplay[] = snapshot.options.map((opt, i) => {
      const isSelected = selectedOptionIds.has(opt.optionId);
      const isCorrectOpt = opt.isCorrect;

      let feedback: OptionFeedback = 'neutral';
      if (isSelected && isCorrectOpt) feedback = 'selected';
      else if (isSelected && !isCorrectOpt) feedback = 'wrong';
      else if (!isSelected && isCorrectOpt) feedback = 'correct';

      // Resolve option image URL
      let optImageUrl: string | undefined;
      if (opt.images && opt.images.length > 0) {
        const optImg = opt.images[0];
        const key = imageStorageKey(optImg);
        optImageUrl = signedUrlMap[key];
      }

      return {
        id: opt.optionId,
        label: OPTION_LABELS[i] ?? String(i + 1),
        text: opt.optionText,
        imageUrl: optImageUrl,
        feedback,
        isSelected,
        isCorrect: isCorrectOpt,
      };
    });

    // Fetch explanation
    const explanationResp = await getQuestionExplanation(questionId);
    const explanation = explanationResp.success ? explanationResp.data : null;

    // Resolve explanation image URLs
    let explanationImages: string[] = [];
    if (snapshot.images) {
      // Use snapshot images for explanation images too if available
      for (const img of snapshot.images) {
        const key = imageStorageKey(img);
        const url = signedUrlMap[key];
        if (url) explanationImages.push(url);
      }
    }

    // Fetch question metadata (subject, chapter, difficulty)
    let subjectName: string | null = mtq.sectionName ?? null;
    let chapterName: string | null = null;
    let difficulty: string | null = null;

    try {
      const qResp = await getQuestionById(questionId);
      if (qResp.success && qResp.data) {
        difficulty = qResp.data.difficulty;
        // Try to get subject/chapter names from the question data
        // The actual names would need a join, but we have the IDs
      }
    } catch {
      // Metadata is optional — silently fall back
    }

    return {
      success: true,
      data: {
        index: mtq.orderSequence,
        questionId,
        text: snapshot.questionText,
        imageUrl: stemImageUrl,
        imageAlt: stemImageAlt,
        options,
        marksAwarded,
        marks: snapshot.marks,
        negativeMarks: snapshot.negativeMarks,
        subjectName,
        chapterName,
        difficulty,
        status,
        explanationText: explanation?.explanationText ?? null,
        explanationImages,
        explanationVideoUrl: explanation?.explanationVideoUrl ?? null,
        explanationLoading: false,
        explanationError: !explanationResp.success,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to load question detail: ${message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build a compound storage key from bucket + path.
 */
function imageStorageKey(img: { storageBucket: string; storagePath: string }): string {
  return `${img.storageBucket}::${img.storagePath}`;
}

/**
 * Generate signed URLs for all images referenced in a question snapshot.
 * Returns a map of storageKey → signed URL.
 */
async function generateSignedUrlsFromSnapshot(
  snapshot: QuestionSnapshot,
): Promise<Record<string, string>> {
  const signedUrlMap: Record<string, string> = {};
  const seenKeys = new Set<string>();
  const storageRefs: Array<{ bucket: string; path: string }> = [];

  // Collect stem images
  if (snapshot.images) {
    for (const img of snapshot.images) {
      const key = imageStorageKey(img);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        storageRefs.push({ bucket: img.storageBucket, path: img.storagePath });
      }
    }
  }

  // Collect option images
  if (snapshot.options) {
    for (const opt of snapshot.options) {
      if (opt.images) {
        for (const img of opt.images) {
          const key = imageStorageKey(img);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            storageRefs.push({ bucket: img.storageBucket, path: img.storagePath });
          }
        }
      }
    }
  }

  // Generate signed URLs in parallel
  const promises = storageRefs.map(async (ref) => {
    try {
      const { data } = await supabase.storage
        .from(ref.bucket)
        .createSignedUrl(ref.path, SIGNED_URL_EXPIRY);
      if (data?.signedUrl) {
        signedUrlMap[`${ref.bucket}::${ref.path}`] = data.signedUrl;
      }
    } catch {
      // Image unavailable — skip silently
    }
  });

  await Promise.all(promises);
  return signedUrlMap;
}
