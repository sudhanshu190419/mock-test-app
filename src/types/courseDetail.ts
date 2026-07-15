/**
 * Course Detail Types
 *
 * Production-ready type definitions for the Course Detail screen — pricing,
 * curriculum, instructors, metrics, and FAQs.
 *
 * Sections that depend on data not yet available in the database
 * (curriculum, instructors, FAQs, metrics, reviews) are marked as optional
 * so the detail screen gracefully degrades when those features are absent.
 *
 * @module types/courseDetail
 */

// ─── Metric Item (Bento Grid) ───────────────────────────────────────────────

export interface CourseMetric {
  /** Unique key. */
  key: string;
  /** Icon name from the Icon component. */
  iconName: string;
  /** Metric value (e.g. "180+", "15 Years"). */
  value: string;
  /** Metric label (e.g. "Full-length Mock Tests"). */
  label: string;
  /** Accent colour for the icon (hex). */
  accentColor: string;
}

// ─── Curriculum Chapter ────────────────────────────────────────────────────

export interface CurriculumChapter {
  /** Chapter name (e.g. "Kinematics & Mechanics"). */
  name: string;
  /** Whether the chapter is locked (requires enrollment). */
  isLocked: boolean;
}

// ─── Curriculum Subject ─────────────────────────────────────────────────────

export interface CurriculumSubject {
  /** Unique key. */
  key: string;
  /** Subject display name (e.g. "Physics"). */
  name: string;
  /** Icon name from the Icon component. */
  iconName: string;
  /** Accent colour for the icon. */
  accentColor: string;
  /** Chapter count string (e.g. "28 Chapters"). */
  chapterCount: string;
  /** Hours string (e.g. "250+ Hours"). */
  hours: string;
  /** Chapters within this subject. */
  chapters: CurriculumChapter[];
}

// ─── Instructor ─────────────────────────────────────────────────────────────

export interface Instructor {
  /** Unique key. */
  key: string;
  /** Full name. */
  name: string;
  /** Credential / tagline (e.g. "IIT Delhi Alumni"). */
  credential: string;
  /** Experience string (e.g. "15+ Years Experience"). */
  experience: string;
  /** Accent colour for the avatar border. */
  accentColor: string;
  /** Initials for the avatar placeholder. */
  initials: string;
  /** Avatar colour background. */
  avatarBg: string;
}

// ─── FAQ Item ───────────────────────────────────────────────────────────────

export interface FaqItem {
  /** Unique key. */
  key: string;
  /** Question text. */
  question: string;
  /** Answer text. */
  answer: string;
}

// ─── Course Detail (top-level) ──────────────────────────────────────────────

export interface CourseDetail {
  /** Unique course identifier (UUID from the database). */
  courseId: string;
  /** Category badge (stream name, e.g. "Engineering Entrance"). */
  category: string;
  /** Course title. */
  title: string;
  /** Average rating (0–5). Defaults to 0 when course_reviews table is absent. */
  rating: number;
  /** Number of reviews. Defaults to 0 when course_reviews table is absent. */
  reviewCount: number;
  /** Number of enrolled students. Defaults to 0 when enrollment count query not run. */
  studentCount: number;
  /** Premium badge label (e.g. "Best Seller", "Featured"). Null when not applicable. */
  badgeLabel: string | null;
  /** Current selling price in ₹ (discounted_price if available, else original_price). */
  price: number;
  /** Original price before discount. */
  originalPrice: number;
  /** Discount percentage string (e.g. "50% OFF"). Undefined when no discount. */
  discountLabel?: string;
  /** Limited time offer message. Undefined when not available from DB. */
  offerMessage?: string;
  /** Metrics grid items. Empty array when not available from DB. */
  metrics: CourseMetric[];
  /** About description in paragraphs or bullet items. */
  aboutDescription: string;
  /** About features list (bullet points). Empty when not available. */
  aboutFeatures: string[];
  /** Curriculum subjects with chapters. Empty when curriculum not available. */
  curriculum: CurriculumSubject[];
  /** Instructor profiles. Empty when instructors not available. */
  instructors: Instructor[];
  /** Frequently asked questions. Empty when FAQs not available. */
  faqs: FaqItem[];

  // ── Optional fields from the database ──────────────────────────
  /** Language of instruction (e.g. "Hindi", "English"). */
  language?: string;
  /** Difficulty level (e.g. "beginner", "intermediate", "advanced"). */
  difficultyLevel?: string;
  /** Course duration in days. */
  duration?: number | null;
}
