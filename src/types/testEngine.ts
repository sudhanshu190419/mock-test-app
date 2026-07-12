/**
 * Test Engine Types
 *
 * Display-oriented type definitions for the PYQ Mock Test Engine.
 * These are UI-layer types separate from the backend-domain types in
 * types/mockTest.ts. Designed to be easily mapped from API responses.
 *
 * @module types/testEngine
 */

// ═════════════════════════════════════════════════════════════════
//  Enums & Unions
// ═════════════════════════════════════════════════════════════════

/** Visual status of a question in the palette. */
export type PaletteQuestionStatus =
  | 'not-visited'
  | 'answered'
  | 'marked-for-review'
  | 'current';

/** Section/subject identifier within a multi-subject paper. */
export interface SubjectSection {
  id: string;
  name: string;
  questionStartIndex: number;
  questionEndIndex: number;
}

// ═════════════════════════════════════════════════════════════════
//  Display Models
// ═════════════════════════════════════════════════════════════════

/** A single selectable answer option. */
export interface OptionDisplay {
  /** Unique option identifier. */
  id: string;
  /** Display label (A, B, C, D). */
  label: string;
  /** Option text / content. */
  text: string;
  /** Optional image URL for image-based options. */
  imageUrl?: string;
}

/** A question as rendered in the test engine. */
export interface QuestionDisplay {
  /** Unique question identifier. */
  id: string;
  /** 1-indexed display number within the paper. */
  index: number;
  /** Question stem text. */
  text: string;
  /** Selectable answer options. */
  options: OptionDisplay[];
  /** Optional diagram / figure URL. */
  imageUrl?: string;
  /** Accessibility description for the image. */
  imageAlt?: string;
  /** Marks awarded for a correct answer. */
  marks: number;
  /** Marks deducted for an incorrect answer. */
  negativeMarks: number;
  /** Subject this question belongs to. */
  subjectName?: string;
  /** Section this question belongs to. */
  sectionName?: string;
}

/** Frozen test configuration (loaded at screen mount). */
export interface TestConfig {
  /** Unique test identifier. */
  testId: string;
  /** Paper identifier (JEE Main 2025 Shift 1, etc.). */
  paperId: string;
  /** Current subject filter (null = all subjects). */
  subjectId: string | null;
  /** Full display title. */
  title: string;
  /** Short title for the header on mobile. */
  shortTitle: string;
  /** Total test duration in minutes. */
  durationMin: number;
  /** Total number of questions. */
  totalQuestions: number;
  /** Maximum possible score. */
  totalMarks: number;
  /** Subject sections in this paper. */
  subjects: SubjectSection[];
  /** Default negative marking per wrong answer. */
  negativeMarking: number;
}

// ═════════════════════════════════════════════════════════════════
//  Runtime State
// ═════════════════════════════════════════════════════════════════

/** Mutable test-taking state. */
export interface TestState {
  /** Currently visible question index (0-based). */
  currentQuestionIndex: number;
  /** Selected option per question index (null = not answered). */
  selectedOption: Record<number, string | null>;
  /** Set of question indices flagged for review. */
  markedForReview: Set<number>;
  /** Set of question indices the user has visited. */
  visitedQuestions: Set<number>;
  /** Remaining time in seconds. */
  timeRemaining: number;
  /** Active subject filter for the palette. */
  activeSubject: string | null;
  /** Whether the question palette modal is visible (mobile). */
  isPaletteVisible: boolean;
  /** Whether the test has been submitted. */
  isSubmitted: boolean;
}

/** Initial state factory. */
export function createInitialTestState(questionCount: number, durationSeconds: number): TestState {
  return {
    currentQuestionIndex: 0,
    selectedOption: {},
    markedForReview: new Set<number>(),
    visitedQuestions: new Set<number>([0]),
    timeRemaining: durationSeconds,
    activeSubject: null,
    isPaletteVisible: false,
    isSubmitted: false,
  };
}

// ═════════════════════════════════════════════════════════════════
//  Navigation Params
// ═════════════════════════════════════════════════════════════════

export interface TestEngineParams {
  testId: string;
  paperId: string;
  subjectId?: string;
  title?: string;
  shortTitle?: string;
  durationMin: number;
  totalQuestions: number;
  totalMarks: number;
  negativeMarking: number;
}

// ═════════════════════════════════════════════════════════════════
//  Service Types
// ═════════════════════════════════════════════════════════════════

export interface SaveAnswerInput {
  questionIndex: number;
  optionId: string | null;
  timeSpentSeconds: number;
}

export interface SubmitTestInput {
  testId: string;
  paperId: string;
  questions: QuestionDisplay[];
  answers: Record<number, string | null>;
  timeTakenSeconds: number;
}

/** Result of a successful test submission. */
export interface SubmitTestOutput {
  attemptId: string;
  resultId: string;
}
