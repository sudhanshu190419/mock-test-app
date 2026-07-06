/**
 * Course Detail Types
 *
 * Production-ready type definitions for the Course Detail screen — pricing,
 * curriculum, instructors, metrics, and FAQs.
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
  /** Unique course identifier. */
  courseId: string;
  /** Category badge (e.g. "Engineering Entrance"). */
  category: string;
  /** Course title. */
  title: string;
  /** Average rating (0–5). */
  rating: number;
  /** Number of reviews. */
  reviewCount: number;
  /** Number of enrolled students. */
  studentCount: number;
  /** Premium badge label (e.g. "Best Seller"). */
  badgeLabel: string;
  /** Current price in ₹. */
  price: number;
  /** Original price before discount. */
  originalPrice: number;
  /** Discount percentage string (e.g. "50% OFF"). */
  discountLabel: string;
  /** Limited time offer message. */
  offerMessage: string;
  /** Metrics grid items. */
  metrics: CourseMetric[];
  /** About description in paragraphs or bullet items. */
  aboutDescription: string;
  /** About features list (bullet points). */
  aboutFeatures: string[];
  /** Curriculum subjects with chapters. */
  curriculum: CurriculumSubject[];
  /** Instructor profiles. */
  instructors: Instructor[];
  /** Frequently asked questions. */
  faqs: FaqItem[];
}
