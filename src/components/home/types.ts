/**
 * Shared types for the home screen domain.
 *
 * Every component in `src/components/home/` imports its data types
 * from this module so the HomeScreen can define data once and pass
 * it down declaratively.
 *
 * @module components/home/types
 */

// ─── Quick Action Card ────────────────────────────────────────────

export interface QuickActionItem {
  /** Unique key for the card. */
  key: string;
  /** Icon name (maps to the Icon component). */
  iconName: string;
  /** Background tint for the icon circle. */
  iconBg: string;
  /** Icon colour. */
  iconColor: string;
  /** Card title. */
  title: string;
  /** Card subtitle / description. */
  subtitle: string;
  /** Accessibility label for the card. */
  accessibilityLabel: string;
  /** Callback when the card is pressed. */
  onPress?: () => void;
}

// ─── Feature (Why Choose Us) ──────────────────────────────────────

export interface FeatureItem {
  /** Unique key. */
  key: string;
  /** Icon name. */
  iconName: string;
  /** Background tint for the icon circle. */
  iconBg: string;
  /** Icon colour. */
  iconColor: string;
  /** Feature title. */
  title: string;
  /** Feature description. */
  description: string;
}

// ─── Popular Exam ─────────────────────────────────────────────────

export interface PopularExamItem {
  /** Unique key. */
  key: string;
  /** Icon name. */
  iconName: string;
  /** Background tint for the icon circle. */
  iconBg: string;
  /** Icon colour. */
  iconColor: string;
  /** Exam short name. */
  title: string;
  /** Exam full name / description. */
  description: string;
  /** Accessibility label. */
  accessibilityLabel: string;
  /** Callback when the card is pressed. */
  onPress?: () => void;
}

// ─── Trending Courses ─────────────────────────────────────────────

export interface TrendingCourseItem {
  /** Unique key. */
  key: string;
  /** Course title. */
  title: string;
  /** Course category / subject chip label. */
  category: string;
  /** Short description. */
  description: string;
  /** Instructor name. */
  instructor: string;
  /** Numeric rating (0–5). */
  rating: number;
  /** Number of students enrolled. */
  totalStudents: number;
  /** Current price in ₹. */
  price: number;
  /** Original price before discount (optional — hides strikethrough if omitted). */
  originalPrice?: number;
  /** Whether this course is marked as a best seller. */
  isBestSeller: boolean;
  /** Gradient colours for the hero card background. */
  gradientColors: [string, string, ...string[]];
  /** Emoji or icon name for the course illustration placeholder. */
  illustration: string;
  /** Callback when the card is pressed. */
  onPress?: () => void;
  /** Callback when the bookmark icon is pressed. */
  onBookmarkPress?: () => void;
}

// ─── Bottom Navigation Tab ────────────────────────────────────────

export interface BottomNavTab {
  /** Unique key. */
  key: string;
  /** Icon name. */
  iconName: string;
  /** Tab label. */
  label: string;
  /** Whether this tab is the currently active (home) tab. */
  isActive: boolean;
  /** Callback when the tab is pressed. */
  onPress?: () => void;
}
