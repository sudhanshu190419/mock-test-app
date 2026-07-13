/**
 * Answer Review Types
 *
 * Type definitions for the Student Answer Review module.
 * These are UI-layer types that represent per-question review data
 * from the existing `mock_answers`, `mock_answer_options`, and
 * `mock_test_questions.questionSnapshot` tables.
 *
 * @module types/review
 */

// ═════════════════════════════════════════════════════════════════
//  Review Item — one question in the answer review list
// ═════════════════════════════════════════════════════════════════

/** Status of a question in the student's attempt. */
export type ReviewQuestionStatus = 'correct' | 'incorrect' | 'skipped';

/**
 * Lightweight display model for a single question in the
 * Answer Review list. Does not include full question content.
 */
export interface ReviewItem {
  /** 1-based question number within the test. */
  index: number;
  /** The question's UUID. */
  questionId: string;
  /** Subject name, if available. */
  subjectName: string | null;
  /** Correct / Incorrect / Skipped. */
  status: ReviewQuestionStatus;
  /** Marks awarded to the student (can be negative). */
  marksAwarded: number;
  /** Maximum marks for this question. */
  marks: number;
}

// ═════════════════════════════════════════════════════════════════
//  Review Detail — full question with options and explanation
// ═════════════════════════════════════════════════════════════════

/** Visual treatment for an answer option in review mode. */
export type OptionFeedback = 'selected' | 'correct' | 'wrong' | 'neutral';

/** A single option with its review feedback states. */
export interface ReviewOptionDisplay {
  /** Unique option identifier. */
  id: string;
  /** Display label (A, B, C, D). */
  label: string;
  /** Option text content. */
  text: string;
  /** Optional image URL. */
  imageUrl?: string;
  /** Visual feedback: selected, correct, wrong, or neutral. */
  feedback: OptionFeedback;
  /** Whether this option was selected by the student. */
  isSelected: boolean;
  /** Whether this is the correct answer. */
  isCorrect: boolean;
}

/** Full question detail for the Answer Review detail screen. */
export interface ReviewQuestionDetail {
  /** 1-based question index. */
  index: number;
  /** Question UUID. */
  questionId: string;
  /** Question stem text. */
  text: string;
  /** Optional stem image URL. */
  imageUrl?: string;
  /** Accessibility text for the stem image. */
  imageAlt?: string;
  /** All options with feedback states. */
  options: ReviewOptionDisplay[];
  /** Marks awarded to the student. */
  marksAwarded: number;
  /** Maximum marks for this question. */
  marks: number;
  /** Negative marks for an incorrect answer. */
  negativeMarks: number;
  /** Subject name, if available. */
  subjectName: string | null;
  /** Chapter name, if available. */
  chapterName: string | null;
  /** Difficulty level, if available. */
  difficulty: string | null;
  /** Status of the answer. */
  status: ReviewQuestionStatus;
  /** Explanation text. */
  explanationText: string | null;
  /** Explanation image URLs (optional). */
  explanationImages: string[];
  /** Explanation video URL (optional). */
  explanationVideoUrl: string | null;
  /** Whether an explanation is currently loading. */
  explanationLoading: boolean;
  /** Whether the explanation failed to load. */
  explanationError: boolean;
}

// ═════════════════════════════════════════════════════════════════
//  Navigation Params
// ═════════════════════════════════════════════════════════════════

export interface AnswerReviewParams {
  testId: string;
  attemptId: string;
}

export interface AnswerReviewDetailParams {
  testId: string;
  attemptId: string;
  /** Index in the questions list (0-based). */
  questionIndex: number;
  /** Total number of questions in the test. */
  totalQuestions: number;
}
