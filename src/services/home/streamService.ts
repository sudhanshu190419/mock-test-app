/**
 * Home Stream Service
 *
 * Clean-architecture service layer for the Home Screen's stream/exam data.
 *
 * Responsibilities:
 * - Featured streams for the Popular Exams section
 * - Stream-based navigation data
 *
 * Reuses the existing `streams` database table but returns a home-screen-
 * specific shape with icon metadata derived from the stream code.
 *
 * Every public method returns a standardised `ApiResponse<T>` shape so that
 * consumers (hooks, screens) never need to handle raw Supabase exceptions.
 *
 * @module services/home/streamService
 */

import { supabase } from '../../config/supabase';
import { extractErrorMessage, buildPagination } from '../../utils/supabase';
import { buildPaginatedResponse } from '../../utils/response';
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SortDirection,
} from '../../types/academic';
import type {
  HomeStream,
  HomeStreamFilters,
  HomeStreamSortOptions,
} from '../../types/home';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Maps camelCase sort keys to their snake_case database column names.
 */
const SORT_FIELD_MAP: Record<string, string> = {
  name: 'name',
  displayOrder: 'display_order',
};

/**
 * Default icon mapping for known streams.
 * Falls back to a generic book icon for unrecognised streams.
 */
const DEFAULT_STREAM_ICONS: Record<string, { iconName: string; iconBg: string; iconColor: string }> = {
  NEET: { iconName: 'stethoscope', iconBg: '#E8F5E9', iconColor: '#22C55E' },
  'JEE-M': { iconName: 'atom', iconBg: '#E3F2FD', iconColor: '#3B82F6' },
  JEE: { iconName: 'atom', iconBg: '#E3F2FD', iconColor: '#3B82F6' },
  CUET: { iconName: 'graduation-cap', iconBg: '#FFF3E0', iconColor: '#F97316' },
  UPSC: { iconName: 'school', iconBg: '#EDE9FF', iconColor: '#7C3AED' },
  SSC: { iconName: 'clipboard-list', iconBg: '#FEF9C3', iconColor: '#EAB308' },
};

// ─── Database Row Shape ────────────────────────────────────────────────────

/**
 * Raw snake_case shape returned by the `streams` table.
 */
interface DbStream {
  stream_id: string;
  institute_id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

function getDefaultIcon(code: string): { iconName: string; iconBg: string; iconColor: string } {
  return DEFAULT_STREAM_ICONS[code] ?? {
    iconName: 'book',
    iconBg: '#F1F5F9',
    iconColor: '#64748B',
  };
}

function mapHomeStream(db: DbStream): HomeStream {
  const icon = getDefaultIcon(db.code);
  return {
    streamId: db.stream_id,
    name: db.name,
    code: db.code,
    description: db.description,
    iconName: icon.iconName,
    iconBg: icon.iconBg,
    iconColor: icon.iconColor,
    courseCount: 0, // Counts omitted from simple query — can be added via separate query if needed
    mockTestCount: 0,
    displayOrder: db.display_order,
    isActive: db.is_active,
  };
}

function mapSortField(sortBy: HomeStreamSortOptions['sortBy']): string {
  return SORT_FIELD_MAP[sortBy ?? 'displayOrder'] ?? 'display_order';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch featured streams for the Home Screen's Popular Exams section.
 *
 * Returns active streams ordered by display_order ascending by default.
 *
 * @param filters   - Optional filter criteria (defaults to isActive: true).
 * @param sort      - Optional sort configuration.
 * @param pagination - Optional pagination parameters.
 *
 * @example
 * const result = await getFeaturedStreams();
 * if (result.success) {
 *   console.log(result.data.data);  // HomeStream[]
 * }
 */
export async function getFeaturedStreams(
  filters?: HomeStreamFilters,
  sort?: HomeStreamSortOptions,
  pagination?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<HomeStream>>> {
  try {
    let query = supabase
      .from('streams')
      .select('*', { count: 'exact' });

    // Default: only active streams
    const isActive = filters?.isActive ?? true;
    query = query.eq('is_active', isActive);

    // Filter by specific IDs
    if (filters?.ids && filters.ids.length > 0) {
      query = query.in('stream_id', filters.ids);
    }

    // Apply sorting
    const sortBy = mapSortField(sort?.sortBy);
    const sortDirection: SortDirection = sort?.sortDirection ?? 'asc';
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });

    // Apply pagination
    const { page, pageSize, from, to } = buildPagination(pagination);
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    const streams = (data ?? []).map(mapHomeStream);

    return {
      success: true,
      data: buildPaginatedResponse(streams, count ?? 0, page, pageSize),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch a single stream by its ID.
 *
 * @param streamId - The UUID of the stream to retrieve.
 *
 * @example
 * const result = await getFeaturedStreamById('uuid-here');
 * if (result.success) {
 *   console.log(result.data.name);
 * }
 */
export async function getFeaturedStreamById(
  streamId: string,
): Promise<ApiResponse<HomeStream>> {
  try {
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .eq('stream_id', streamId)
      .single<DbStream>();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: `Stream not found: ${streamId}` };
      }
      return { success: false, error: extractErrorMessage(error) };
    }

    return { success: true, data: mapHomeStream(data) };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}
