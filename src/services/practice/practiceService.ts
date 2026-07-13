/**
 * Practice Service
 *
 * Reusable clean-architecture service layer for the PYQ Practice module.
 * BOTH the Home Screen and the Practice page consume these same methods.
 *
 * Responsibilities:
 * - Featured/preview packages for the Home Screen "Practice with PYQs" section
 * - Paginated, filtered, sorted package listing for the Practice page
 * - Package detail with its papers
 * - Filter options (streams, subjects, chapters)
 *
 * ═══ SCHEMA ═══
 *
 *   Primary table: `pyq_packages` (Domain 06)
 *   Joined tables: `streams` (via stream_id), `pyq_papers` (for counts/detail)
 *
 * Every public method returns a standardised `ApiResponse<T>` shape.
 *
 * @module services/practice/practiceService
 */

import { supabase } from '../../config/supabase';
import { extractErrorMessage, buildPagination } from '../../utils/supabase';
import { buildPaginatedResponse } from '../../utils/response';
import type { ApiResponse, PaginatedResponse, PaginationParams, SortDirection } from '../../types/academic';
import type {
  PracticePackage,
  PracticeDetail,
  PracticePaper,
  PracticeFilters,
  PracticeSortOptions,
  PracticeFilterOptions,
} from '../../types/practice';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Maps camelCase sort keys to their snake_case database column names.
 */
const SORT_FIELD_MAP: Record<string, string> = {
  name: 'name',
  price: 'price',
  yearFrom: 'year_from',
  totalPapers: 'total_papers',
  publishedAt: 'published_at',
};

/**
 * Default number of featured items shown on the Home Screen.
 */
const DEFAULT_FEATURED_LIMIT = 6;

// ─── Database Row Shapes ────────────────────────────────────────────────────

/**
 * Raw snake_case shape of `pyq_packages` joined with `streams`.
 */
interface DbPracticePackage {
  package_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  thumbnail_path: string | null;
  year_from: number | null;
  year_to: number | null;
  total_papers: number;
  stream_id: string;
  is_active: boolean;
  published_at: string | null;
  /** Nested join result from `streams` table.
   * MANY-TO-ONE: FK pyq_packages.stream_id → streams.stream_id → single object. */
  stream: { name: string } | null;
}

/**
 * Raw snake_case shape of `pyq_papers` rows.
 */
interface DbPracticePaper {
  paper_id: string;
  package_id: string;
  title: string;
  exam_year: number;
  exam_date: string | null;
  exam_session: string | null;
  total_questions: number;
  total_marks: number | null;
  duration_min: number | null;
  is_published: boolean;
  published_at: string | null;
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

/**
 * Map a raw DB row to a camelCase `PracticePackage`.
 */
function mapPracticePackage(db: DbPracticePackage): PracticePackage {
  return {
    packageId: db.package_id,
    name: db.name,
    description: db.description,
    price: Number(db.price),
    currency: db.currency,
    thumbnailUrl: db.thumbnail_path,
    yearFrom: db.year_from,
    yearTo: db.year_to,
    totalPapers: db.total_papers,
    streamName: db.stream?.name ?? '',
    streamId: db.stream_id,
    isActive: db.is_active,
    publishedAt: db.published_at,
    difficulty: null,
    rating: 0,
    originalPrice: null,
    badgeLabel: null,
  };
}

/**
 * Map a raw DB row to a camelCase `PracticePaper`.
 */
function mapPracticePaper(db: DbPracticePaper): PracticePaper {
  return {
    paperId: db.paper_id,
    packageId: db.package_id,
    title: db.title,
    examYear: db.exam_year,
    examDate: db.exam_date,
    examSession: db.exam_session,
    totalQuestions: db.total_questions,
    totalMarks: db.total_marks,
    durationMin: db.duration_min,
    isPublished: db.is_published,
    publishedAt: db.published_at,
    hasMockTest: false, // Optimistic — verified via separate query in detail view
  };
}

/**
 * Map a camelCase sort key to its snake_case DB column.
 */
function mapSortField(sortBy: PracticeSortOptions['sortBy']): string {
  return SORT_FIELD_MAP[sortBy ?? 'publishedAt'] ?? 'published_at';
}

// ─── Public API — Home Screen ───────────────────────────────────────────────

/**
 * Fetch featured/preview PYQ packages for the Home Screen.
 *
 * Returns a limited set of active, published packages ordered by
 * published_at descending. Perfect for the "Practice with PYQs" preview.
 *
 * @param limit - Maximum number of items. Defaults to 6.
 *
 * @example
 * const result = await getFeaturedPractice(5);
 * if (result.success) {
 *   console.log(result.data.data);  // PracticePackage[]
 * }
 */
export async function getFeaturedPractice(
  limit: number = DEFAULT_FEATURED_LIMIT,
  streamId?: string | null,
): Promise<ApiResponse<PaginatedResponse<PracticePackage>>> {
  try {
    const { page, pageSize, from, to } = buildPagination({ page: 1, pageSize: limit });

    let query = supabase
      .from('pyq_packages')
      .select(
        `
        package_id,
        name,
        description,
        price,
        currency,
        thumbnail_path,
        year_from,
        year_to,
        total_papers,
        stream_id,
        is_active,
        published_at,
        stream:stream_id(name)
        `,
        { count: 'exact' },
      )
      .eq('is_active', true)
      .not('published_at', 'is', null);

    if (streamId) {
      query = query.eq('stream_id', streamId);
    }

    query = query
      .order('published_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    const packages = (data ?? []).map((item) =>
      mapPracticePackage(item as unknown as DbPracticePackage),
    );

    return {
      success: true,
      data: buildPaginatedResponse(packages, count ?? 0, page, pageSize),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

// ─── Public API — Practice Page ─────────────────────────────────────────────

/**
 * Fetch a paginated, filtered, and sorted list of PYQ practice packages.
 *
 * Supports search, stream filter, and full pagination.
 * Used by the Practice page for the main listing.
 *
 * @param filters    - Optional filter criteria (streamId, search, isFree, ids).
 * @param sort       - Optional sort configuration (sortBy, sortDirection).
 * @param pagination - Optional pagination parameters (page, pageSize).
 *
 * @example
 * const result = await getPracticeList(
 *   { streamId: 'uuid', search: 'NEET' },
 *   { sortBy: 'yearFrom', sortDirection: 'desc' },
 *   { page: 1, pageSize: 20 },
 * );
 * if (result.success) {
 *   console.log(result.data.data);  // PracticePackage[]
 * }
 */
export async function getPracticeList(
  filters?: PracticeFilters,
  sort?: PracticeSortOptions,
  pagination?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<PracticePackage>>> {
  try {
    let query = supabase
      .from('pyq_packages')
      .select(
        `
        package_id,
        name,
        description,
        price,
        currency,
        thumbnail_path,
        year_from,
        year_to,
        total_papers,
        stream_id,
        is_active,
        published_at,
        stream:stream_id(name)
        `,
        { count: 'exact' },
      );

    // ── Apply filters ──────────────────────────────────────────────────
    if (filters?.streamId) {
      query = query.eq('stream_id', filters.streamId);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.ilike('name', term);
    }

    if (filters?.isFree === true) {
      query = query.eq('price', 0);
    }

    if (filters?.ids && filters.ids.length > 0) {
      query = query.in('package_id', filters.ids);
    }

    // Always hide inactive and unpublished packages from the listing.
    query = query.eq('is_active', true);
    query = query.not('published_at', 'is', null);

    // ── Apply sorting ──────────────────────────────────────────────────
    const sortBy = mapSortField(sort?.sortBy);
    const sortDirection: SortDirection = sort?.sortDirection ?? 'desc';
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });

    // ── Apply pagination ───────────────────────────────────────────────
    const { page, pageSize, from, to } = buildPagination(pagination ?? { page: 1, pageSize: 20 });
    query = query.range(from, to);

    // ── Execute ────────────────────────────────────────────────────────
    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    const packages = (data ?? []).map((item) =>
      mapPracticePackage(item as unknown as DbPracticePackage),
    );

    return {
      success: true,
      data: buildPaginatedResponse(packages, count ?? 0, page, pageSize),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch full package detail including all its papers.
 *
 * @param packageId - The UUID of the PYQ package.
 *
 * @example
 * const result = await getPracticeDetail('uuid-here');
 * if (result.success) {
 *   console.log(result.data.package.name);
 *   console.log(result.data.papers);  // PracticePaper[]
 * }
 */
export async function getPracticeDetail(
  packageId: string,
): Promise<ApiResponse<PracticeDetail>> {
  try {
    // ── Fetch the package ───────────────────────────────────────────────
    const { data: pkgData, error: pkgError } = await supabase
      .from('pyq_packages')
      .select(
        `
        package_id,
        name,
        description,
        price,
        currency,
        thumbnail_path,
        year_from,
        year_to,
        total_papers,
        stream_id,
        is_active,
        published_at,
        stream:stream_id(name)
        `,
      )
      .eq('package_id', packageId)
      .single<DbPracticePackage>();

    if (pkgError) {
      if (pkgError.code === 'PGRST116') {
        return { success: false, error: `Practice package not found: ${packageId}` };
      }
      return { success: false, error: extractErrorMessage(pkgError) };
    }

    // ── Fetch the papers ────────────────────────────────────────────────
    const { data: papersData, error: papersError } = await supabase
      .from('pyq_papers')
      .select(
        `
        paper_id,
        package_id,
        title,
        exam_year,
        exam_date,
        exam_session,
        total_questions,
        total_marks,
        duration_min,
        is_published,
        published_at
        `,
      )
      .eq('package_id', packageId)
      .eq('is_published', true)
      .order('exam_year', { ascending: false });

    if (papersError) {
      return { success: false, error: extractErrorMessage(papersError) };
    }

    const papers = (papersData ?? []).map(mapPracticePaper);

    // ── Check for mock test mappings ────────────────────────────────────
    if (papers.length > 0) {
      const paperIds = papers.map((p) => p.paperId);
      const { data: mockMappings } = await supabase
        .from('pyq_mock_mappings')
        .select('paper_id')
        .in('paper_id', paperIds);

      const mappedPaperIds = new Set((mockMappings ?? []).map((m) => m.paper_id));
      for (const paper of papers) {
        if (mappedPaperIds.has(paper.paperId)) {
          paper.hasMockTest = true;
        }
      }
    }

    return {
      success: true,
      data: {
        package: mapPracticePackage(pkgData),
        papers,
        paperCount: papers.length,
      },
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Result of a paper mock mapping lookup.
 */
export interface PaperMockMapping {
  /** UUID of the linked mock test. */
  testId: string;
  /** Whether the linked mock test is published (status = 'published'). */
  isPublished: boolean;
}

/**
 * Look up the mock test linked to a PYQ paper via `pyq_mock_mappings`.
 *
 * Queries the junction table for a mapping row and joins `mock_tests` to
 * verify the mock test status.
 *
 * Returns `null` when no mapping exists (paper has no mock generated).
 * When a mapping exists but the mock is not published, returns the mapping
 * with `isPublished = false` so the caller can show an appropriate message.
 *
 * @param paperId - The UUID of the PYQ paper.
 *
 * @example
 * const result = await getPaperMockMapping('paper-uuid');
 * if (result.success && result.data) {
 *   if (result.data.isPublished) {
 *     console.log(result.data.testId);  // mock test UUID
 *   } else {
 *     // Mock exists but not yet published
 *   }
 * }
 */
export async function getPaperMockMapping(
  paperId: string,
): Promise<ApiResponse<PaperMockMapping | null>> {
  try {
    // ── Query the junction table joined with mock_tests ─────────────────
    const { data: mapping, error: mappingError } = await supabase
      .from('pyq_mock_mappings')
      .select(
        `
        paper_id,
        test_id,
        mock_test:test_id(status)
        `,
      )
      .eq('paper_id', paperId)
      .maybeSingle();

    if (mappingError) {
      return { success: false, error: extractErrorMessage(mappingError) };
    }

    if (!mapping) {
      return { success: true, data: null };
    }

    // Extract the mock test status from the nested join result.
    const mockTestStatus = (mapping as Record<string, unknown>).mock_test as
      | { status: string }
      | undefined;
    const isPublished = mockTestStatus?.status === 'published';

    return {
      success: true,
      data: {
        testId: mapping.test_id as string,
        isPublished,
      },
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch available filter options for the Practice page.
 *
 * Returns streams, subjects, and chapters that have published
 * PYQ packages — useful for populating filter dropdowns.
 *
 * @example
 * const result = await getPracticeFilters();
 * if (result.success) {
 *   console.log(result.data.streams);  // [{ id, name }, ...]
 * }
 */
export async function getPracticeFilters(): Promise<ApiResponse<PracticeFilterOptions>> {
  try {
    // ── Fetch streams that have active PYQ packages ────────────────────
    const { data: streams, error: streamsError } = await supabase
      .from('streams')
      .select('stream_id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (streamsError) {
      return { success: false, error: extractErrorMessage(streamsError) };
    }

    // ── Fetch subjects (from subjects table — independent of PYQ) ─────
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('subject_id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (subjectsError) {
      return { success: false, error: extractErrorMessage(subjectsError) };
    }

    // ── Fetch chapters (from chapters table) ────────────────────────────
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('chapter_id, name')
      .order('name', { ascending: true });

    if (chaptersError) {
      return { success: false, error: extractErrorMessage(chaptersError) };
    }

    return {
      success: true,
      data: {
        streams: (streams ?? []).map((s) => ({ id: s.stream_id, name: s.name })),
        subjects: (subjects ?? []).map((s) => ({ id: s.subject_id, name: s.name })),
        chapters: (chapters ?? []).map((c) => ({ id: c.chapter_id, name: c.name })),
      },
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}
