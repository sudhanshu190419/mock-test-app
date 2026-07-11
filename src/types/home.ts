/**
 * Home Module Types
 *
 * UI-layer type definitions for the Home Screen data layer.
 * These types represent the data shapes consumed by the Home Screen
 * components and hooks, mapped from the actual database tables.
 *
 * ═══ SCHEMA NOTES ═══
 *
 *   • `HomeBanner`     — Backed by `content` table (Domain 03).
 *     No `home_banners` table exists yet. The `content` table provides
 *     title, description, and thumbnail fields. CTA and gradient fields
 *     are populated with defaults.
 *
 *   • `TrendingCourse` — Backed by `content` table (Domain 03).
 *     No `courses` table exists yet. Several course-specific fields
 *     (rating, price, instructor, category) are set to default values
 *     because the `content` table does not store them.
 *
 *   • `HomeStream`     — Backed by `streams` table (Domain 02). ✅
 *     The `streams` table exists and has all required columns.
 *     `courseCount` and `mockTestCount` are hardcoded as 0 (requires
 *     separate count queries against `content`/`mock_tests` tables).
 *
 *   • `NotificationSummary` / `LatestNotification` — Backed by
 *     `notification_recipients` + `notifications` join (Domain 09).
 *     The `notifications` table has NO `user_id` or `is_read` columns.
 *     User targeting and read status live on `notification_recipients`.
 *
 *   • `HomeConfig`     — No backing table exists yet.
 *     Returned as hardcoded defaults matching the current UI layout.
 *
 *   • `HomeDashboard`  — Aggregates from `profiles` and `notification_recipients`.
 *
 * Reuses shared types from src/types/academic.ts (ApiResponse,
 * PaginatedResponse, PaginationParams).
 *
 * @module types/home
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
//  Home Dashboard
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Aggregate home dashboard summary.
 *
 * Contains the high-level overview data that the Home Screen needs
 * to render the greeting header, notification badge, and quick stats.
 *
 * Data source: `profiles` table + `notification_recipients` table.
 */
export interface HomeDashboard {
  /** User's display name (from `profiles.name`). */
  userName: string;
  /** User's avatar URL, if set (from `profiles.avatar_url`). */
  avatarUrl: string | null;
  /** Number of unread notifications (from `notification_recipients.is_read`). */
  unreadCount: number;
  /** Greeting text based on time of day. */
  greeting: string;
  /** Current streak count (days of consecutive activity). Not yet implemented. */
  currentStreak: number;
  /** Next scheduled live class title, if any. Not yet implemented. */
  nextLiveClass: string | null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Hero Banner
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A hero banner displayed on the Home Screen.
 *
 * ⚠️ SCHEMA NOTE: The `home_banners` table does not exist in the current
 * schema. This is temporarily backed by `content` (Domain 03) filtered by
 * `is_free_preview = true` and `status = 'approved'`.
 *
 * Several banner-specific fields (ctaLabel, ctaLink, gradientColors) are
 * populated with sensible defaults.
 */
export interface HomeBanner {
  /** Primary key (maps to `content.content_id`). */
  id: string;
  /** Banner headline text (maps to `content.title`). */
  headline: string;
  /** Banner subtitle / description (maps to `content.description`). */
  description: string;
  /** Call-to-action button label. Default: "Explore Now". */
  ctaLabel: string;
  /** Navigation target when the CTA is tapped. Not populated from content table. */
  ctaLink: string;
  /** Optional image URL (constructed from `content.thumbnail_bucket/path`). */
  imageUrl: string | null;
  /** Whether this banner is currently active (maps to `content.is_free_preview`). */
  isActive: boolean;
  /** Display order for multiple banners (lower = first). Default: 0. */
  displayOrder: number;
  /** Background gradient colours. Not populated from content table. */
  gradientColors: [string, string] | null;
  /** UTC timestamp of creation (from `content.created_at`). */
  createdAt: string;
  /** UTC timestamp of last modification (from `content.updated_at`). */
  updatedAt: string;
}

/**
 * Filters available when querying hero banners.
 * Retained for future use when a dedicated `home_banners` table is created.
 */
export interface HomeBannerFilters {
  /** Only return active banners. Defaults to true. */
  isActive?: boolean;
}

/**
 * Sort options for hero banners list queries.
 * Retained for future use when a dedicated `home_banners` table is created.
 */
export interface HomeBannerSortOptions {
  sortBy?: 'displayOrder' | 'createdAt';
  sortDirection?: SortDirection;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Trending Course
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A course displayed in the Trending Courses carousel.
 *
 * ✅ SCHEMA NOTE: Backed by the `courses` table (Domain 16 — Course
 * Management). The `courses` table is a fully-featured entity with pricing,
 * instructor mapping (via `course_teachers` junction), stream association,
 * enrollment counting, and publication lifecycle.
 *
 * Instructor name is resolved via the join path:
 *   courses.course_id → course_teachers.course_id
 *   course_teachers.teacher_id → teacher_details.teacher_id
 *   teacher_details.profile_id → profiles.profile_id (name)
 *
 * Stream name is resolved via:
 *   courses.stream_id → streams.stream_id (name)
 *
 * `totalStudents` is a count of active rows in `course_enrollments` for
 * the given course_id.
 *
 * `rating` and `reviewCount` are not yet available — no `course_reviews`
 * table exists in the current schema. Defaults to 0 until implemented.
 */
export interface TrendingCourse {
  /** Unique identifier (maps to `courses.course_id`). */
  courseId: string;
  /** Course title (maps to `courses.title`). */
  title: string;
  /** Stream display name (maps to `streams.name` via FK join). */
  category: string;
  /** Short description shown on the card (maps to `courses.short_description`). */
  description: string;
  /** Instructor display name (from `profiles.name` via course_teachers → teacher_details → profiles). */
  instructor: string;
  /** Average rating (0–5). Not yet implemented — no course_reviews table exists. */
  rating: number;
  /** Number of enrolled students (count from `course_enrollments`). */
  totalStudents: number;
  /** Current selling price in ₹ (maps to `courses.discounted_price` or falls back to `original_price`). */
  price: number;
  /** Original price before discount (maps to `courses.original_price`). */
  originalPrice: number;
  /** Whether this course is featured on the homepage (maps to `courses.featured`). */
  isBestSeller: boolean;
  /** Relative URL or path to the course thumbnail (from `courses.thumbnail_bucket/path`). */
  imageUrl: string | null;
  /** Badge label text (derived: "Featured" when featured, null otherwise). */
  badgeLabel: string | null;
  /** Whether this course is bookmarked by the current user. Not yet implemented. */
  isBookmarked: boolean;
  /** UTC timestamp when the course was published (from `courses.published_at`). */
  publishedAt: string;
  /** Course duration in days (from `courses.duration`). Nullable. */
  duration: number | null;
  /** Difficulty level (from `courses.difficulty_level`: easy, medium, hard). */
  difficultyLevel: string | null;
  /** Language of instruction (from `courses.language`). */
  language: string | null;
}

/**
 * Raw snake_case shape of a row from the `courses` table (Domain 16),
 * with nested join results for stream, instructor, and enrollment count.
 *
 * This type is internal to the service layer. Consumers receive only the
 * camelCase `TrendingCourse` interface.
 */
export interface DbTrendingCourse {
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
  /**
   * Nested join result from `streams` table.
   * MANY-TO-ONE: FK courses.stream_id → streams.stream_id → single object.
   */
  stream: { name: string } | null;
  /**
   * Nested join result from `course_teachers` junction table.
   * ONE-TO-MANY: courses.course_id ← course_teachers.course_id → array.
   * Each item's `teacher` is MANY-TO-ONE: course_teachers.teacher_id → teacher_details.teacher_id → single object.
   * Each teacher's `profile` is ONE-TO-ONE: teacher_details.profile_id → profiles.profile_id → single object.
   */
  course_teachers: Array<{
    teacher: {
      profile: { name: string } | null;
    } | null;
  }>;
  /**
   * Computed aggregate count from `course_enrollments`.
   * PostgREST returns computed counts as arrays.
   */
  enrollments_count?: Array<{ count: number }>;
}

/**
 * Filters available when querying trending / featured courses.
 * Retained for future use when a dedicated `courses` table is created.
 */
export interface CourseFilters {
  /** Filter by category / stream. */
  category?: string;
  /** Limit to active/enrolled only. */
  isActive?: boolean;
  /** Search across title and description. */
  search?: string;
  /** Filter by specific course IDs. */
  ids?: string[];
  /** When true, return only best-seller courses. */
  bestSellersOnly?: boolean;
  /** Maximum number of courses to return. */
  limit?: number;
}

/**
 * Sort options for course list queries.
 * Retained for future use when a dedicated `courses` table is created.
 */
export interface CourseSortOptions {
  sortBy?: 'rating' | 'totalStudents' | 'price' | 'publishedAt' | 'title';
  sortDirection?: SortDirection;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Home Stream
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A stream (exam category) displayed on the Home Screen.
 *
 * ✅ SCHEMA NOTE: Backed by the `streams` table (Domain 02 — Academic
 * Structure), which has all required columns: `stream_id`, `name`, `code`,
 * `description`, `is_active`, `display_order`.
 *
 * Icon metadata (iconName, iconBg, iconColor) is derived from the stream
 * code and does not come from the database.
 *
 * `courseCount` and `mockTestCount` are currently hardcoded as `0` because
 * they require separate aggregate queries against `content` and `mock_tests`
 * tables. These can be implemented as a separate counting step or a
 * materialised view when needed.
 */
export interface HomeStream {
  /** Primary key (maps to `streams.stream_id`). */
  streamId: string;
  /** Display name (e.g. "NEET", "JEE Mains") — from `streams.name`. */
  name: string;
  /** Short uppercase code (e.g. NEET) — from `streams.code`. */
  code: string;
  /** Optional description (from `streams.description`). */
  description: string | null;
  /** Icon name for the UI (maps to the shared Icon component). Derived from code. */
  iconName: string;
  /** Background tint colour for the icon circle. Derived from code. */
  iconBg: string;
  /** Icon fill colour. Derived from code. */
  iconColor: string;
  /** Number of courses available in this stream. Needs separate content count query. */
  courseCount: number;
  /** Number of mock tests available in this stream. Needs separate mock_tests count query. */
  mockTestCount: number;
  /** Controls display order (from `streams.display_order`). */
  displayOrder: number;
  /** Whether this stream is active (from `streams.is_active`). */
  isActive: boolean;
}

/**
 * Filters for home stream queries.
 */
export interface HomeStreamFilters {
  /** Only return active streams. Defaults to true. */
  isActive?: boolean;
  /** Limit to a specific set of stream IDs. */
  ids?: string[];
}

/**
 * Sort options for home stream list queries.
 */
export interface HomeStreamSortOptions {
  sortBy?: 'name' | 'displayOrder' | 'courseCount';
  sortDirection?: SortDirection;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Notification Summary (Home-specific)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A lightweight notification summary for the Home Screen greeting header.
 *
 * ✅ SCHEMA NOTE: Correctly backed by `notification_recipients` (Domain 09)
 * joined with `notifications`. The `notification_recipients.profile_id`
 * matches the user UUID, and `notification_recipients.is_read` tracks
 * read state.
 */
export interface NotificationSummary {
  /** Total number of unread notifications (via `notification_recipients` count). */
  unreadCount: number;
  /** The most recent notification (for preview display). */
  latestNotification: LatestNotification | null;
}

/**
 * A single notification item in the latest-notification preview.
 */
export interface LatestNotification {
  /** Unique notification identifier (from `notifications.notification_id`). */
  id: string;
  /** Notification title (from `notifications.title`). */
  title: string;
  /** Notification body / description (from `notifications.body`). */
  description: string;
  /** Notification type for icon rendering (from `notifications.event_type`). */
  type: string;
  /** ISO-8601 timestamp (from `notifications.created_at`). */
  createdAt: string;
  /** Whether the user has read this notification (from `notification_recipients.is_read`). */
  isRead: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Home Configuration
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Home screen configuration — controls which sections are visible
 * and in what order they appear.
 *
 * ⚠️ SCHEMA NOTE: The `home_config` table does not exist. This is returned
 * as hardcoded defaults matching the current Home Screen section layout.
 * A config table or `system_settings` JSON key should be added in a future
 * migration for dynamic reordering without code deployment.
 */
export interface HomeConfig {
  /** Unique configuration identifier. Currently always "default". */
  configId: string;
  /** Ordered list of section IDs to display. */
  sectionOrder: string[];
  /** Whether the hero banner section is enabled. */
  showHeroBanner: boolean;
  /** Whether the trending courses section is enabled. */
  showTrendingCourses: boolean;
  /** Whether the PYQ practice section is enabled. */
  showPyqPractice: boolean;
  /** Whether the quick start section is enabled. */
  showQuickStart: boolean;
  /** Whether the features section is enabled. */
  showFeatures: boolean;
  /** Whether the popular exams section is enabled. */
  showPopularExams: boolean;
  /** Whether the CTA section is enabled. */
  showCta: boolean;
}
