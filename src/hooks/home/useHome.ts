/**
 * Home Hooks
 *
 * React Query hooks wrapping the homeService API calls.
 * Provides cached queries for the Home Screen aggregate data.
 *
 * ## Exports
 *
 * | Hook              | Type     | Description                             |
 * |-------------------|----------|-----------------------------------------|
 * | `useHomeDashboard`| Query    | Current user's dashboard summary        |
 * | `useHeroBanners`  | Query    | Hero banners (backed by `content` table)|
 * | `useHomeConfig`   | Query    | Home screen section configuration       |
 *
 * @module hooks/home/useHome
 */

import { useQuery } from '@tanstack/react-query';
import { homeKeys } from './queryKeys';
import {
  getHomeDashboard,
  getHeroBanners,
  getHomeConfig,
} from '../../services/home/homeService';
import type { HomeDashboard, HomeBanner, HomeConfig } from '../../types/home';

// ─── Query Hooks ────────────────────────────────────────────────────────────

/**
 * Fetch the home dashboard summary for the authenticated user.
 *
 * Returns greeting, user name, unread count, streak, and next live class.
 * The query is disabled when `userId` is falsy.
 *
 * @param userId - The authenticated user's UUID.
 *
 * @example
 * const { data: dashboard, isLoading } = useHomeDashboard(userId);
 * if (dashboard) {
 *   console.log(dashboard.greeting);    // "Good Morning!"
 *   console.log(dashboard.unreadCount); // 3
 * }
 */
export function useHomeDashboard(userId: string | undefined | null) {
  return useQuery<HomeDashboard>({
    queryKey: homeKeys.dashboard.summary(userId ?? ''),
    queryFn: async () => {
      const result = await getHomeDashboard(userId!);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch home dashboard.');
      }
      return result.data!;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes — dashboard data changes infrequently
    retry: 1,
  });
}

/**
 * Fetch hero banners for the Home Screen.
 *
 * ⚠️ SCHEMA NOTE: Backed by `content` table filtered by is_free_preview = true
 * and status = 'approved'. A dedicated `home_banners` table should be created
 * in a future migration for proper hero banner management.
 */
export function useHeroBanners() {
  return useQuery<HomeBanner[]>({
    queryKey: homeKeys.banners.list(),
    queryFn: async () => {
      const result = await getHeroBanners();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch hero banners.');
      }
      return result.data!;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — banners are rarely changed
  });
}

/**
 * Fetch the home screen section configuration.
 *
 * ⚠️ SCHEMA NOTE: The `home_config` table does not exist in the current schema.
 * This hook returns the default section layout. Once a config table is added,
 * this hook can be extended with a `configId` parameter.
 */
export function useHomeConfig() {
  return useQuery<HomeConfig>({
    queryKey: homeKeys.config.active(),
    queryFn: async () => {
      const result = await getHomeConfig();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch home configuration.');
      }
      return result.data!;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — config is almost never changed
  });
}
