/**
 * Home Stream Hooks
 *
 * React Query hooks wrapping the home streamService API calls.
 * Provides cached queries for the Home Screen's popular exams
 * and stream navigation sections.
 *
 * ## Exports
 *
 * | Hook                  | Type     | Description                          |
 * |-----------------------|----------|--------------------------------------|
 * | `useFeaturedStreams`  | Query    | Featured streams for Popular Exams   |
 * | `useFeaturedStream`   | Query    | Single featured stream by ID         |
 *
 * @module hooks/home/useStreams
 */

import { useQuery } from '@tanstack/react-query';
import { homeKeys } from './queryKeys';
import {
  getFeaturedStreams,
  getFeaturedStreamById,
} from '../../services/home/streamService';
import type { HomeStream, HomeStreamFilters, HomeStreamSortOptions } from '../../types/home';
import type { PaginatedResponse, PaginationParams } from '../../types/academic';

// ─── Query Hooks ────────────────────────────────────────────────────────────

/**
 * Fetch featured streams for the Home Screen's Popular Exams section.
 *
 * Returns active streams enriched with icon metadata,
 * ordered by display_order ascending by default.
 *
 * @param filters   - Optional filter criteria (isActive, ids).
 * @param sort      - Optional sort configuration.
 * @param pagination - Optional pagination parameters.
 *
 * @example
 * const { data, isLoading, error } = useFeaturedStreams(
 *   { isActive: true },
 *   { sortBy: 'displayOrder', sortDirection: 'asc' },
 * );
 *
 * if (data) {
 *   console.log(data.data);  // HomeStream[]
 * }
 */
export function useFeaturedStreams(
  filters?: HomeStreamFilters,
  sort?: HomeStreamSortOptions,
  pagination?: PaginationParams,
) {
  return useQuery<PaginatedResponse<HomeStream>>({
    queryKey: homeKeys.streams.list(pagination),
    queryFn: async () => {
      const result = await getFeaturedStreams(filters, sort, pagination);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch featured streams.');
      }
      return result.data!;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — stream data changes infrequently
  });
}

/**
 * Fetch a single featured stream by its ID.
 *
 * The query is disabled when `streamId` is falsy.
 *
 * @param streamId - The UUID of the stream to retrieve.
 *
 * @example
 * const { data: stream, isLoading } = useFeaturedStream(streamId);
 */
export function useFeaturedStream(streamId: string | undefined | null) {
  return useQuery<HomeStream>({
    queryKey: homeKeys.streams.detail(streamId!),
    queryFn: async () => {
      const result = await getFeaturedStreamById(streamId!);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch stream details.');
      }
      return result.data!;
    },
    enabled: !!streamId,
    staleTime: 10 * 60 * 1000,
  });
}
