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

// ─── PYQ (Previous Year Questions) ────────────────────────────────────

/** A single feature row inside a PYQ card (icon + text). */
export interface PyqFeature {
  /** Icon name (maps to the Icon component). */
  icon: string;
  /** Feature label text. */
  text: string;
}

export interface PyqItem {
  /** Unique key. */
  key: string;
  /** PYQ title. */
  title: string;
  /** Exam category chip label (e.g. NEET, JEE, UPSC). */
  category: string;
  /** Premium feature rows with icon + text (replaces plain description). */
  features: PyqFeature[];
  /** Numeric rating (0–5). */
  rating: number;
  /** Number of students. */
  totalStudents: number;
  /** Current price in ₹. */
  price: number;
  /** Original price before discount (optional). */
  originalPrice?: number;
  /** Badge label — "🔥 Most Attempted" or "⭐ Student Favorite". */
  badgeLabel: string;
  /** Gradient colours for the card background. */
  gradientColors: [string, string, ...string[]];
  /** Emoji / icon placeholder for illustration (image asset later). */
  illustration: string;
  /** Callback when the card is pressed. */
  onPress?: () => void;
}

// ─── Batches ─────────────────────────────────────────────────────────

export interface BatchItem {
  /** Unique key. */
  key: string;
  /** Batch name (e.g. "JEE Main 2026"). */
  name: string;
  /** Subtitle (e.g. "Foundation Batch", "Rank Booster", "Crash Course"). */
  subtitle: string;
  /** Accent colour for this batch (hex). */
  accentColor: string;
  /** Badge label ("Popular", "New", "Best Seller"). */
  badgeLabel: string;
  /** Number of enrolled students. */
  studentCount: number;
  /** Start date string (e.g. "Jan 2025"). */
  startDate: string;
  /** Duration string (e.g. "6 Months"). */
  duration: string;
  /** Icon name from the Icon component for the subject. */
  iconName: string;
  /** Callback when the card is pressed. */
  onPress?: () => void;
}

// ─── Course Card (Courses Screen) ──────────────────────────────

/** Premium badge type for course cards. */
export type CourseBadgeType = 'Best Seller' | 'Popular' | 'New Launch';

/** Subject-specific category for banner images. */
export type CourseCategory =
  | 'JEE'
  | 'NEET'
  | 'Class 9'
  | 'Class 10'
  | 'Class 11'
  | 'Class 12'
  | 'CUET'
  | 'CLAT'
  | 'UPSC'
  | 'SSC'
  | 'Banking'
  | 'MBA'
  | string;

/** Statistics row data for a course card. */
export interface CourseStats {
  /** Duration string (e.g. "6 Months", "12 Months"). */
  duration: string;
  /** Whether live classes are included. */
  hasLiveClasses: boolean;
  /** Whether recorded sessions are included. */
  hasRecorded: boolean;
}

/** A single course item for the Courses screen card list. */
export interface CourseItem {
  /** Unique key. */
  key: string;
  /** Course title. */
  title: string;
  /** Subtitle / target audience (e.g. "Class 12 | NEET Aspirants"). */
  subtitle: string;
  /** Short 2-line description. */
  description: string;
  /** Category for banner image selection. */
  category: CourseCategory;
  /** Premium badge label. */
  badgeLabel: string;
  /** Badge type for styling. */
  badgeType: CourseBadgeType;
  /** Statistics row data. */
  stats: CourseStats;
  /** Current price in ₹. */
  price: number;
  /** Original price before discount (optional). */
  originalPrice?: number;
  /** Discount percentage badge (e.g. "75% Off"). */
  discountLabel?: string;
  /** Whether the course is bookmarked by the user. */
  isBookmarked?: boolean;
  /** Callback when the card is pressed. */
  onPress?: () => void;
  /** Callback when Explore is pressed. */
  onExplorePress?: () => void;
  /** Callback when bookmark is toggled. */
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
