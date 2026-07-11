/**
 * Home Course Service
 *
 * Clean-architecture service layer for the Home Screen's course data.
 *
 * Responsibilities:
 * - Trending courses for the Home Screen carousel (backed by `courses` table)
 * - Latest published courses
 * - Recommended courses
 *
 * ═══ SCHEMA NOTES ═══
 *
 *   Table `courses` (Domain 16)   → ✅ EXISTS. Fully-featured entity with
 *     pricing, stream association (`streams` FK via `stream_id`),
 *     and full publication lifecycle (`published_at`, `status`).
 *
 *   Instructor name is resolved via:
 *     courses → course_teachers → teacher_details → profiles (name)
 *
 * Every public method returns a standardised `ApiResponse<T>` shape.
 *
 * @module services/home/courseService
 */

import { supabase } from '../../config/supabase';
import { extractErrorMessage, buildPagination } from '../../utils/supabase';
import { buildPaginatedResponse } from '../../utils/response';
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from '../../types/academic';
import type {
  TrendingCourse,
} from '../../types/home';

// ─── Database Row Shape ────────────────────────────────────────────────────

/**
 * Raw snake_case shape of a row from the `courses` table with the
 * stream_name embedded via FK join.
 *
 * This type is internal to the service layer. Consumers receive only the
 * camelCase `TrendingCourse` interface.
 */
interface DbTrendingCourseRaw {
  course_id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  language: string | null;
  difficulty_level: string | null;
  duration: number | null;
  original_price: number;
  discounted_price: number | null;
  featured: boolean;
  trending: boolean;
  status: string;
  published_at: string | null;
  /** Nested join result from `streams` table (FK: courses.stream_id).
   * MANY-TO-ONE: FK on courses table → returns single object or null. */
  stream: { name: string } | null;
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

/**
 * Maps a raw snake_case database row to the camelCase `TrendingCourse`.
 *
 * Price: uses `discounted_price` when available, falls back to `original_price`.
 * Image URL: constructed from `thumbnail_bucket` + `/` + `thumbnail_path`.
 * isBestSeller: derived from the `featured` boolean column.
 */
function mapCourseToTrendingCourse(db: DbTrendingCourseRaw): TrendingCourse {
  const price =
    db.discounted_price != null
      ? Number(db.discounted_price)
      : Number(db.original_price);

  const imageUrl =
    db.thumbnail_bucket && db.thumbnail_path
      ? `${db.thumbnail_bucket}/${db.thumbnail_path}`
      : null;

  return {
    courseId: db.course_id,
    title: db.title,
    category: db.stream?.name ?? '',
    description: db.short_description ?? db.description ?? '',
    instructor: '',
    rating: 0,
    totalStudents: 0,
    price,
    originalPrice: Number(db.original_price),
    isBestSeller: db.featured,
    imageUrl,
    badgeLabel: db.featured ? 'Featured' : null,
    isBookmarked: false,
    publishedAt: db.published_at ?? '',
    duration: db.duration,
    difficultyLevel: db.difficulty_level,
    language: db.language,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch trending courses for the Home Screen carousel.
 *
 * ✅ Backed by the `courses` table (Domain 16). Returns published courses
 * that are marked as trending, ordered by featured status then publish date.
 *
 * Includes the stream name via FK join.
 *
 * @param pagination - Optional pagination parameters.
 *
 * @example
 * const result = await getTrendingCourses({ page: 1, pageSize: 8 });
 * if (result.success) {
 *   console.log(result.data.data);  // TrendingCourse[]
 * }
 */
export async function getTrendingCourses(
  pagination?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<TrendingCourse>>> {
  try {
    const { page, pageSize, from, to } = buildPagination(pagination);

    const { data, error, count } = await supabase
      .from('courses')
      .select(
        `
        course_id,
        title,
        short_description,
        description,
        thumbnail_bucket,
        thumbnail_path,
        language,
        difficulty_level,
        duration,
        original_price,
        discounted_price,
        featured,
        trending,
        status,
        published_at,
        stream:stream_id(name)
        `,
        { count: 'exact' },
      )
      .eq('status', 'published')
      .is('deleted_at', null)
      .eq('trending', true)
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false })
      .range(from, to);

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    const courses = (data ?? []).map(
      (item) => mapCourseToTrendingCourse(item as unknown as DbTrendingCourseRaw),
    );

    return {
      success: true,
      data: buildPaginatedResponse(courses, count ?? 0, page, pageSize),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch the latest published courses.
 *
 * Sorted by `published_at` descending — newest first.
 * Excludes soft-deleted courses.
 *
 * @param limit - Maximum number of items to return. Defaults to 8.
 *
 * @example
 * const result = await getLatestCourses(6);
 */
export async function getLatestCourses(
  limit: number = 8,
): Promise<ApiResponse<PaginatedResponse<TrendingCourse>>> {
  try {
    const { page, pageSize, from, to } = buildPagination({
      page: 1,
      pageSize: limit,
    });

    const { data, error, count } = await supabase
      .from('courses')
      .select(
        `
        course_id,
        title,
        short_description,
        description,
        thumbnail_bucket,
        thumbnail_path,
        language,
        difficulty_level,
        duration,
        original_price,
        discounted_price,
        featured,
        trending,
        status,
        published_at,
        stream:stream_id(name)
        `,
        { count: 'exact' },
      )
      .eq('status', 'published')
      .is('deleted_at', null)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .range(from, to);

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    const courses = (data ?? []).map(
      (item) => mapCourseToTrendingCourse(item as unknown as DbTrendingCourseRaw),
    );

    return {
      success: true,
      data: buildPaginatedResponse(courses, count ?? 0, page, pageSize),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch recommended courses for a student.
 *
 * Returns published, non-deleted courses. When `studentId` is provided,
 * enrolled courses are excluded via a `not.in` filter against
 * `course_enrollments`.
 *
 * @param studentId - The student's UUID (from `student_details.student_id`).
 * @param limit     - Maximum number of items. Defaults to 8.
 *
 * @example
 * const result = await getRecommendedCourses('student-uuid', 6);
 */
export async function getRecommendedCourses(
  studentId?: string | null,
  limit: number = 8,
): Promise<ApiResponse<PaginatedResponse<TrendingCourse>>> {
  try {
    const { page, pageSize, from, to } = buildPagination({
      page: 1,
      pageSize: limit,
    });

    let query = supabase
      .from('courses')
      .select(
        `
        course_id,
        title,
        short_description,
        description,
        thumbnail_bucket,
        thumbnail_path,
        language,
        difficulty_level,
        duration,
        original_price,
        discounted_price,
        featured,
        trending,
        status,
        published_at,
        stream:stream_id(name)
        `,
        { count: 'exact' },
      )
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false })
      .range(from, to);

    // Exclude courses the student is already enrolled in
    if (studentId) {
      const { data: enrolledIds } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('is_active', true);

      const ids = (enrolledIds ?? []).map((e) => e.course_id);
      if (ids.length > 0) {
        query = query.not('course_id', 'in', '(' + ids.join(',') + ')');
      }
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    const courses = (data ?? []).map(
      (item) => mapCourseToTrendingCourse(item as unknown as DbTrendingCourseRaw),
    );

    return {
      success: true,
      data: buildPaginatedResponse(courses, count ?? 0, page, pageSize),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch featured courses by a specific set of course IDs.
 *
 * @param ids - Array of course UUIDs to fetch.
 *
 * @example
 * const result = await getFeaturedCourses(['id-1', 'id-2']);
 */
export async function getFeaturedCourses(
  ids: string[],
): Promise<ApiResponse<TrendingCourse[]>> {
  try {
    if (ids.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        course_id,
        title,
        short_description,
        description,
        thumbnail_bucket,
        thumbnail_path,
        language,
        difficulty_level,
        duration,
        original_price,
        discounted_price,
        featured,
        trending,
        status,
        published_at,
        stream:stream_id(name)
        `,
      )
      .eq('status', 'published')
      .is('deleted_at', null)
      .in('course_id', ids)
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false });

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return {
      success: true,
      data: (data ?? []).map(
        (item) => mapCourseToTrendingCourse(item as unknown as DbTrendingCourseRaw),
      ),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}
