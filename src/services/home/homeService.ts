/**
 * Home Service
 *
 * Clean-architecture service layer for the Home Screen's aggregate data.
 *
 * Responsibilities:
 * - Home dashboard summary (greeting, unread count)
 * - Hero banner management (backed by `content` table with is_free_preview)
 * - Home page configuration (returned as defaults — no config table exists yet)
 *
 * ─── Schema Notes ───────────────────────────────────────────────────────────
 *
 *   Table `home_banners`  → DOES NOT EXIST.
 *     Replaced with `content` filtered by is_free_preview = true AND
 *     status = 'approved'. A dedicated banners table should be created
 *     in a future migration for proper CTA support.
 *
 *   Table `home_config`   → DOES NOT EXIST.
 *     Home config is returned as a hardcoded default matching the current
 *     UI sections. A system_settings JSON key or a `home_config` table
 *     should be added in a future migration for dynamic section ordering.
 *
 *   Table `notifications` → EXISTS (Domain 09).
 *     But it has NO `user_id` or `is_read` column. User targeting is
 *     handled by `notification_recipients`, which has `profile_id` and
 *     `is_read`. All notification queries now join through that table.
 *
 * Every public method returns a standardised `ApiResponse<T>` shape so that
 * consumers (hooks, screens) never need to handle raw Supabase exceptions.
 *
 * @module services/home/homeService
 */

import { supabase } from '../../config/supabase';
import { extractErrorMessage } from '../../utils/supabase';
import type { ApiResponse } from '../../types/academic';
import type {
  HomeBanner,
  HomeDashboard,
  HomeConfig,
} from '../../types/home';

// ─── Database Row Shapes ────────────────────────────────────────────────────

/**
 * Raw snake_case shape of the `content` table (Domain 03).
 * Used as the backing table for hero banners until a dedicated
 * `home_banners` table is created.
 */
interface DbContentBanner {
  content_id: string;
  title: string;
  description: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  content_type: string;
  status: string;
  is_free_preview: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

/**
 * Map a `content` row to a `HomeBanner`.
 *
 * Several banner-only fields (ctaLabel, ctaLink, gradientColors) are
 * populated with sensible defaults because the `content` table does not
 * store them. When a `home_banners` table is added, this mapping can be
 * replaced with a direct table query.
 */
function mapContentToBanner(db: DbContentBanner): HomeBanner {
  return {
    id: db.content_id,
    headline: db.title,
    description: db.description ?? '',
    ctaLabel: 'Explore Now',
    ctaLink: '',
    imageUrl:
      db.thumbnail_bucket && db.thumbnail_path
        ? `${db.thumbnail_bucket}/${db.thumbnail_path}`
        : null,
    isActive: db.is_free_preview,
    displayOrder: 0,
    gradientColors: null,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Default configuration matching the current Home Screen section order.
 *
 * When a `home_config` table is added, this function can be updated to
 * query from that table instead of returning hardcoded defaults.
 */
function getDefaultHomeConfig(): HomeConfig {
  return {
    configId: 'default',
    sectionOrder: [
      'greeting',
      'hero',
      'trending-courses',
      'pyq-practice',
      'quick-start',
      'why-choose',
      'popular-exams',
      'cta',
    ],
    showHeroBanner: true,
    showTrendingCourses: true,
    showPyqPractice: true,
    showQuickStart: true,
    showFeatures: true,
    showPopularExams: true,
    showCta: true,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch the home dashboard summary.
 *
 * Aggregates data from `profiles` and `notification_recipients` to
 * produce the greeting header data.
 *
 * @param userId - The authenticated user's UUID (profile_id).
 *
 * @example
 * const result = await getHomeDashboard('uuid-here');
 * if (result.success) {
 *   console.log(result.data.greeting);   // "Good Morning!"
 *   console.log(result.data.unreadCount); // 3
 * }
 */
export async function getHomeDashboard(
  userId: string,
): Promise<ApiResponse<HomeDashboard>> {
  try {
    // ── Fetch user profile ──────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('profile_id', userId)
      .single<{ name: string; avatar_url: string | null }>();

    if (profileError && profileError.code !== 'PGRST116') {
      return { success: false, error: extractErrorMessage(profileError) };
    }

    // ── Fetch unread notification count via notification_recipients ────
    // The `notifications` table has no `user_id` or `is_read` columns.
    // User targeting and read status live on `notification_recipients`.
    const { count: unreadCount, error: notifError } = await supabase
      .from('notification_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('is_read', false);

    if (notifError) {
      return { success: false, error: extractErrorMessage(notifError) };
    }

    // ── Determine greeting based on time of day ─────────────────────────
    const hour = new Date().getHours();
    let greeting: string;
    if (hour < 12) {
      greeting = 'Good Morning!';
    } else if (hour < 17) {
      greeting = 'Good Afternoon!';
    } else {
      greeting = 'Good Evening!';
    }

    return {
      success: true,
      data: {
        userName: profile?.name ?? 'Learner',
        avatarUrl: profile?.avatar_url ?? null,
        unreadCount: unreadCount ?? 0,
        greeting,
        currentStreak: 0,
        nextLiveClass: null,
      },
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch hero banners for the Home Screen.
 *
 * ⚠️ SCHEMA NOTE: The `home_banners` table does not exist in the current
 * schema. This method queries `content` (Domain 03) as a temporary backing
 * table, filtering for free-preview items (`is_free_preview = true`) with
 * `status = 'approved'`.
 *
 * This is a reasonable approximation because:
 *   - Free-preview content is promotional by nature
 *   - The `content` table has `title`, `description`, and thumbnail fields
 *   - The page already has a dedicated content listing for study materials
 *
 * **Future**: When a `home_banners` table is created (with headline,
 * cta_label, cta_link, image_url, gradient_colors, display_order), replace
 * this query with a direct `supabase.from('home_banners')` call.
 */
export async function getHeroBanners(): Promise<ApiResponse<HomeBanner[]>> {
  try {
    const { data, error } = await supabase
      .from('content')
      .select(
        'content_id, title, description, thumbnail_bucket, thumbnail_path, content_type, status, is_free_preview, published_at, created_at, updated_at',
      )
      .eq('is_free_preview', true)
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .limit(5);

    if (error) {
      return { success: false, error: extractErrorMessage(error) };
    }

    return {
      success: true,
      data: (data ?? []).map(mapContentToBanner),
    };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

/**
 * Fetch the home screen configuration.
 *
 * ⚠️ SCHEMA NOTE: The `home_config` table does not exist in the current
 * schema. A default configuration matching the current Home Screen section
 * layout is returned. Once a config table is added, this method should
 * query from that table.
 *
 * Options for future implementation:
 *   a. Create a `home_config` table with section_order, visibility toggles
 *   b. Store config as a JSON blob in `system_settings` (Domain 10)
 */
export async function getHomeConfig(): Promise<ApiResponse<HomeConfig>> {
  // Return the default config for now.
  // Future: const { data } = await supabase.from('home_config').single();
  return { success: true, data: getDefaultHomeConfig() };
}
