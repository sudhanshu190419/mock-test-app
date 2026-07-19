/**
 * Typography Tokens — Freebuff Design System
 *
 * Reusable text styles for the entire application. Every screen and
 * component MUST use these styles instead of hardcoded font sizes
 * and weights.
 *
 * ─── Font Stack ────────────────────────────────────────────────
 *  - Inter (preferred) — clean, modern, highly readable at every weight.
 *  - System fallback — SF Pro (iOS) / Roboto (Android).
 *
 * ─── Scale ─────────────────────────────────────────────────────
 *  Based on a 1.25 modular scale (16 × 1.25^n).
 *  10 → 12 → 14 → 16 → 20 → 24 → 28 → 36 → 44
 *
 * ─── Usage ─────────────────────────────────────────────────────
 *  import { typography } from '../theme';
 *  <Text style={typography.heading1}>Title</Text>
 *
 * @module theme/typography
 */

import { Platform, type TextStyle } from 'react-native';

// ─── Font Family ─────────────────────────────────────────────────

/**
 * Primary font family.
 * Inter is loaded at the native level in the Expo / bare RN app.
 * Falls back to system font if Inter is unavailable.
 *
 * NOTE: If the app bundle does not include Inter, the platform
 *       system font will be used automatically by React Native.
 */
const fontFamily = Platform.select({
  ios: 'Inter',
  android: 'Inter',
  default: undefined,
});

// ─── Typography Scale ────────────────────────────────────────────

/**
 * Reusable typography styles.
 *
 * Every style is a plain `TextStyle` object that can be spread or
 * used directly as a style prop.
 */
export const typography = {
  // ── Display ────────────────────────────────────────────────────
  /** Largest heading — splash screens, hero sections, empty states. */
  display: {
    fontFamily,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52.8,
    letterSpacing: -1.0,
  } satisfies TextStyle,

  // ── Headings ───────────────────────────────────────────────────
  /** Section-level heading — screen titles. */
  heading1: {
    fontFamily,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  /** Sub-section heading — card / panel titles. */
  heading2: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.25,
  } satisfies TextStyle,

  /** Group heading within a section. */
  heading3: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: 0,
  } satisfies TextStyle,

  // ── Titles ─────────────────────────────────────────────────────
  /** Card title, modal title, list item title. */
  title: {
    fontFamily,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: 0,
  } satisfies TextStyle,

  /** Small card / list subheading. */
  subtitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0,
  } satisfies TextStyle,

  // ── Body ───────────────────────────────────────────────────────
  /** Primary body text — paragraphs, descriptions. */
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    letterSpacing: 0.25,
  } satisfies TextStyle,

  /** Default body text. */
  body: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: 0.25,
  } satisfies TextStyle,

  /** Small body text — secondary information, summaries. */
  bodySmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0.25,
  } satisfies TextStyle,

  // ── Caption ────────────────────────────────────────────────────
  /** Smallest text — timestamps, legal text, metadata chips. */
  caption: {
    fontFamily,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.4,
  } satisfies TextStyle,

  // ── Button ─────────────────────────────────────────────────────
  /** Button label — used on all TouchableOpacity / Pressable labels. */
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 0.25,
  } satisfies TextStyle,

  /** Small button label — compact / secondary buttons. */
  buttonSmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.25,
  } satisfies TextStyle,

  // ── Label ──────────────────────────────────────────────────────
  /** Input label, form field label, section label. */
  label: {
    fontFamily,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.5,
  } satisfies TextStyle,

  /** Small label — tab labels, chip text, badge text. */
  labelSmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.5,
  } satisfies TextStyle,

  // ── Courses Redesign Custom Styles ──────────────────────────────
  heroTitle: {
    fontFamily,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  sectionTitle: {
    fontFamily,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.25,
  } satisfies TextStyle,

  cardTitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 0,
  } satisfies TextStyle,

  cardTitleCompact: {
    fontFamily,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0,
  } satisfies TextStyle,

  priceTag: {
    fontFamily,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: 0,
  } satisfies TextStyle,

  chipLabel: {
    fontFamily,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    letterSpacing: 0.25,
  } satisfies TextStyle,

  badgeLabelCustom: {
    fontFamily,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 14,
    letterSpacing: 0.5,
  } satisfies TextStyle,
} as const;

/** Type helper — extract a typography key. */
export type TypographyKey = keyof typeof typography;

/**
 * Returns the system-safe font family for use outside of typography
 * styles (e.g. custom fonts on canvas, SVG, or WebView).
 */
export function getFontFamily(): string | undefined {
  return fontFamily;
}

// ═════════════════════════════════════════════════════════════════
//  V5 Premium Typography Scale (Geist/Satoshi Stack)
// ═════════════════════════════════════════════════════════════════

/**
 * V5 Font Stack — Geist for UI, Geist Mono for numbers, Satoshi for display
 * Falls back to system fonts if custom fonts not loaded.
 */
const fontFamilyV5 = {
  display: Platform.select({ ios: 'Satoshi-SemiBold', android: 'Satoshi-SemiBold', default: fontFamily }),
  heading: Platform.select({ ios: 'Geist-SemiBold', android: 'Geist-SemiBold', default: fontFamily }),
  headingMedium: Platform.select({ ios: 'Geist-Medium', android: 'Geist-Medium', default: fontFamily }),
  body: Platform.select({ ios: 'Geist-Regular', android: 'Geist-Regular', default: fontFamily }),
  bodyMedium: Platform.select({ ios: 'Geist-Medium', android: 'Geist-Medium', default: fontFamily }),
  mono: Platform.select({ ios: 'GeistMono-Regular', android: 'GeistMono-Regular', default: fontFamily }),
  monoMedium: Platform.select({ ios: 'GeistMono-Medium', android: 'GeistMono-Medium', default: fontFamily }),
} as const;

export const typographyV5 = {
  // ── Asymmetric Display — Section headers, hero text ─────────────
  displayAsymmetric: {
    fontFamily: fontFamilyV5.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    fontWeight: '600',
  } satisfies TextStyle,

  // ── Card Titles ─────────────────────────────────────────────────
  cardTitleHero: {
    fontFamily: fontFamilyV5.heading,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontWeight: '600',
  } satisfies TextStyle,

  cardTitle: {
    fontFamily: fontFamilyV5.headingMedium,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
    fontWeight: '500',
  } satisfies TextStyle,

  cardTitleCompact: {
    fontFamily: fontFamilyV5.headingMedium,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.15,
    fontWeight: '500',
  } satisfies TextStyle,

  // ── Metadata / Secondary Text ───────────────────────────────────
  metadata: {
    fontFamily: fontFamilyV5.body,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
    fontWeight: '400',
  } satisfies TextStyle,

  metadataSmall: {
    fontFamily: fontFamilyV5.body,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
    fontWeight: '400',
  } satisfies TextStyle,

  metadataStrong: {
    fontFamily: fontFamilyV5.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
    fontWeight: '500',
  } satisfies TextStyle,

  // ── Price / Numbers (Tabular Monospace) ─────────────────────────
  priceCurrent: {
    fontFamily: fontFamilyV5.monoMedium,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  priceOriginal: {
    fontFamily: fontFamilyV5.mono,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  enrollmentCount: {
    fontFamily: fontFamilyV5.mono,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  ratingValue: {
    fontFamily: fontFamilyV5.monoMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  // ── Buttons / CTAs ──────────────────────────────────────────────
  buttonLabel: {
    fontFamily: fontFamilyV5.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
    fontWeight: '500',
  } satisfies TextStyle,

  buttonLabelSmall: {
    fontFamily: fontFamilyV5.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.3,
    fontWeight: '500',
  } satisfies TextStyle,

  // ── Badge / Chip Labels ─────────────────────────────────────────
  badgeLabel: {
    fontFamily: fontFamilyV5.bodyMedium,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.5,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,

  badgeLabelLarge: {
    fontFamily: fontFamilyV5.bodyMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.4,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,

  // ── Feature / Benefit Text ──────────────────────────────────────
  featureText: {
    fontFamily: fontFamilyV5.body,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    fontWeight: '400',
  } satisfies TextStyle,

  featureTextStrong: {
    fontFamily: fontFamilyV5.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    fontWeight: '500',
  } satisfies TextStyle,

  // ── Instructor / Author ─────────────────────────────────────────
  instructorName: {
    fontFamily: fontFamilyV5.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
    fontWeight: '500',
  } satisfies TextStyle,

  // ── Category / Chip ─────────────────────────────────────────────
  categoryLabel: {
    fontFamily: fontFamilyV5.bodyMedium,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.5,
    fontWeight: '700',
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,
} as const;

export type TypographyV5Key = keyof typeof typographyV5;
