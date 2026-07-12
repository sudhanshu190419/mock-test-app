/**
 * Practice Module Types
 *
 * Shared TypeScript interfaces for the PYQ Practice module.
 * These types are consumed by BOTH the Home Screen (featured/preview)
 * and the Practice page (full list, search, filters).
 *
 * Backed by the existing `pyq_packages` table (Domain 06 — PYQ).
 * No new migrations required — all data comes from established tables.
 *
 * ═══ SCHEMA NOTES ═══
 *
 *   • `pyq_packages`       — Top-level sellable PYQ unit (name, price, stream_id, year range)
 *   • `pyq_package_unlocks` — Asset types unlocked (pdf, solutions, mock_test)
 *   • `pyq_papers`          — Individual exam papers within a package
 *   • `pyq_question_mappings` — Junction: pyq_papers → questions
 *   • `student_pyq_purchases` — Access control (purchased packages per student)
 *   • `streams`             — FK join for stream name (via pyq_packages.stream_id)
 *
 * Reuses shared types from src/types/academic.ts (ApiResponse,
 * PaginatedResponse, PaginationParams, SortDirection).
 *
 * @module types/practice
 */

import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SortDirection,
} from './academic';

// ─── Re-exports for consumer convenience ────────────────────────────────────
export type { ApiResponse, PaginatedResponse, PaginationParams, SortDirection };

// ═════════════════════════════════════════════════════════════════════════════
//  PracticePackage — the core entity
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A PYQ practice package displayed on the Home Screen or Practice page.
 *
 * Maps from `pyq_packages` table with a FK join to `streams` for the
 * stream/exam category name.
 *
 * @example
 * const pkg: PracticePackage = {
 *   packageId: 'uuid',
 *   name: 'NEET PYQ 2015–2024 Complete Bundle',
 *   price: 299,
 *   streamName: 'NEET',
 *   totalPapers: 15,
 *   yearFrom: 2015,
 *   yearTo: 2024,
 * };
 */
export interface PracticePackage {
  /** Primary key (maps to `pyq_packages.package_id`). */
  packageId: string;
  /** Display name shown to students (maps to `pyq_packages.name`). */
  name: string;
  /** Marketing description (maps to `pyq_packages.description`). */
  description: string | null;
  /** Current price in INR (maps to `pyq_packages.price`). */
  price: number;
  /** ISO 4217 currency code (maps to `pyq_packages.currency`). Default 'INR'. */
  currency: string;
  /** URL or path to the package cover image (from `pyq_packages.thumbnail_path`). */
  thumbnailUrl: string | null;
  /** Earliest exam year (maps to `pyq_packages.year_from`). */
  yearFrom: number | null;
  /** Latest exam year (maps to `pyq_packages.year_to`). */
  yearTo: number | null;
  /** Denormalized count of published papers (maps to `pyq_packages.total_papers`). */
  totalPapers: number;
  /** Stream/exam category name (from `streams.name` via FK join). */
  streamName: string;
  /** FK to `streams.stream_id` (maps to `pyq_packages.stream_id`). */
  streamId: string;
  /** Whether the package is active and purchasable (maps to `pyq_packages.is_active`). */
  isActive: boolean;
  /** UTC timestamp when published (maps to `pyq_packages.published_at`). */
  publishedAt: string | null;
  /**
   * Difficulty level hint (reserved for future use).
   * `pyq_packages` has no difficulty column. A future migration or
   * derived-field computation would populate this.
   */
  difficulty: string | null;
  /** Average rating (0–5). Not yet implemented — no PYQ reviews table exists. */
  rating: number;
  /** Original price before discount. Null when no discount applies. */
  originalPrice: number | null;
  /** Badge label for the card (e.g. "🔥 Most Attempted"). Null when not applicable. */
  badgeLabel: string | null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  PracticeFilters — filters for the Practice page list
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Filters available when querying the practice package list.
 *
 * Each optional filter maps to a WHERE clause on `pyq_packages`.
 * When multiple filters are present, all are AND-ed together.
 *
 * Used by BOTH the service layer and the Practice page UI.
 */
export interface PracticeFilters {
  /** Filter by stream/exam category (maps to `pyq_packages.stream_id`). */
  streamId?: string;
  /**
   * Filter by subject (reserved for future use).
   * `pyq_packages` has no direct FK to subjects — filtering by subject would
   * require a join through `pyq_papers → pyq_question_mappings → questions`.
   */
  subjectId?: string;
  /**
   * Filter by chapter (reserved for future use).
   * Same limitation as `subjectId` — `pyq_packages` has no direct FK to chapters.
   */
  chapterId?: string;
  /** Search across `pyq_packages.name` (case-insensitive LIKE). */
  search?: string;
  /** When true, return only free packages (price = 0). */
  isFree?: boolean;
  /** Filter by specific package IDs. */
  ids?: string[];
}

/**
 * Sort options for practice package list queries.
 */
export interface PracticeSortOptions {
  sortBy?: 'name' | 'price' | 'yearFrom' | 'totalPapers' | 'publishedAt';
  sortDirection?: SortDirection;
}

// ═════════════════════════════════════════════════════════════════════════════
//  PracticeDetail — full package detail with papers
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A single PYQ paper within a package.
 *
 * Maps from `pyq_papers` table. Represents one official exam paper.
 */
export interface PracticePaper {
  /** Primary key (maps to `pyq_papers.paper_id`). */
  paperId: string;
  /** Parent package ID (maps to `pyq_papers.package_id`). */
  packageId: string;
  /** Display title (maps to `pyq_papers.title`). */
  title: string;
  /** The calendar year the exam was held (maps to `pyq_papers.exam_year`). */
  examYear: number;
  /** Optional exam date (maps to `pyq_papers.exam_date`). */
  examDate: string | null;
  /** Session/shift identifier (maps to `pyq_papers.exam_session`). */
  examSession: string | null;
  /** Denormalized question count (maps to `pyq_papers.total_questions`). */
  totalQuestions: number;
  /** Official total marks (maps to `pyq_papers.total_marks`). */
  totalMarks: number | null;
  /** Official duration in minutes (maps to `pyq_papers.duration_min`). */
  durationMin: number | null;
  /** Whether this paper is published (maps to `pyq_papers.is_published`). */
  isPublished: boolean;
  /** UTC timestamp when published (maps to `pyq_papers.published_at`). */
  publishedAt: string | null;
  /** Whether this paper has a linked mock test (from `pyq_mock_mappings`). */
  hasMockTest: boolean;
}

/**
 * Full package detail including its papers.
 *
 * Returned by `getPracticeDetail()`. Includes the parent package
 * info plus the array of papers it contains.
 */
export interface PracticeDetail {
  /** The parent package info. */
  package: PracticePackage;
  /** The papers in this package. */
  papers: PracticePaper[];
  /** Total count of published papers. */
  paperCount: number;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Filter Options (for the Practice page filter UI)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Available filter options for the Practice page.
 *
 * Returned by `getPracticeFilters()` so the UI can render
 * dropdown/select inputs with pre-populated values.
 */
export interface PracticeFilterOptions {
  /** Available streams/exam categories. */
  streams: Array<{ id: string; name: string }>;
  /** Available subjects. */
  subjects: Array<{ id: string; name: string }>;
  /** Available chapters. */
  chapters: Array<{ id: string; name: string }>;
}
