/**
 * Color Tokens — Freebuff Design System
 *
 * The single source of truth for every colour used in the application.
 * Every screen, component, and utility MUST import colours from this
 * file. Hardcoded hex values outside this file are forbidden.
 *
 * ─── Architecture ──────────────────────────────────────────────
 *  1. Brand palette   – raw brand colours (never consumed directly)
 *  2. Semantic tokens  – purpose-mapped colours consumed by screens
 *  3. Raw palette      – full extended palette for edge cases
 *
 * ─── Usage ─────────────────────────────────────────────────────
 *   import { colors } from '../theme';
 *   backgroundColor: colors.background,
 *   color: colors.text.primary,
 *
 * @module theme/colors
 */

// ═════════════════════════════════════════════════════════════════
//  1. Brand Palette (raw values)
// ═════════════════════════════════════════════════════════════════



// ═════════════════════════════════════════════════════════════════
//  2. Semantic Tokens (consumed by screens & components)
// ═════════════════════════════════════════════════════════════════

export const colors = {
  // ── Brand ─────────────────────────────────────────────────────
  /** Primary brand colour (Sky Blue) — used for success states, progress indicators. */
  primary: '#0284C7',
  /** Secondary brand colour (Sky Blue) — used for primary CTAs, links, navigation. */
  secondary: '#0284C7',

  // ── Mint & Pine Surface Tokens (Aligned to Sky Blue for Redesign) ─────────────
  mint: {
    /** Fresh Sky Blue (#0284C7) — Top header background & active bottom nav pill. */
    primary: '#0284C7',
    /** Soft Sky Sheet (#F0F9FF) — Main curved content sheet background. */
    sheet: '#F0F9FF',
    /** Sky Blue Tint (#E0F2FE) — Curved bottom nav background & notification badge. */
    tint: '#E0F2FE',
    /** Deep Slate (#0F172A) — High-contrast text and active course card. */
    dark: '#0F172A',
    /** Card background for crisp white containers. */
    cardBg: '#FFFFFF',
  },

  // ── Sky Blue & Airy Surface Tokens (Clean high-ratio design) ──
  sky: {
    /** Fresh Sky Blue (#0284C7) — Primary header, vibrant accents & active states. */
    primary: '#0284C7',
    /** Light Sky Sheet (#F0F9FF) — Soft airy base background tone for main sheet. */
    sheet: '#F0F9FF',
    /** Sky Blue Tint (#E0F2FE) — Subtle container fills, badges, and soft highlights. */
    tint: '#E0F2FE',
    /** Deep Slate (#0F172A) — High-contrast readable typography and icons. */
    dark: '#0F172A',
    /** Crisp White (#FFFFFF) — Clean card surfaces for optimal contrast ratios. */
    cardBg: '#FFFFFF',
    /** Soft Sky Border (#BAE6FD) — Subtle structural separation without heavy lines. */
    border: '#BAE6FD',
  },

  // ── Backgrounds ───────────────────────────────────────────────
  /** App-level page background - set to soft sky blue. */
  background: '#F0F9FF',
  /** Elevated surface colour (cards, sheets, modals). */
  surface: '#FFFFFF',

  // ── Text ──────────────────────────────────────────────────────
  text: {
    /** Primary content text — headings, body copy. */
    primary: '#0F172A',
    /** Secondary / subdued text — labels, hints, metadata. */
    secondary: '#475569',
    /** Text on brand-coloured backgrounds. */
    inverse: '#FFFFFF',
  },

  // ── Semantic States ───────────────────────────────────────────
  /** Success / positive state — emerald green. */
  success: '#059669',
  /** Error / destructive state. */
  error: '#DC2626',
  /** Warning / caution state. */
  warning: '#F59E0B',
  /** Informational state. */
  info: '#0284C7',

  // ── Interactive States ────────────────────────────────────────
  /** Disabled elements — buttons, inputs, chips. */
  disabled: '#CBD5E1',

  // ── Borders & Dividers ────────────────────────────────────────
  /** Default border colour for inputs, cards, outlined elements. */
  border: '#BAE6FD',
  /** Light separator colour for dividers, list item separators. */
  divider: '#E0F2FE',

  // ── Feedback / Overlay ────────────────────────────────────────
  /** Overlay scrim (semi-transparent black). */
  scrim: 'rgba(0, 0, 0, 0.4)',
  /** Highlight tint for selected / focused states. */
  highlight: 'rgba(2, 132, 199, 0.08)',

  // ── Brand Tints (for backgrounds, badges, chips) ──────────────
  tint: {
    /** Light green tint — success pill backgrounds. */
    green: '#E6F4EA',
    /** Light blue tint — info pill backgrounds. */
    blue: '#E0F2FE',
    /** Light red tint — error / destructive pill backgrounds. */
    red: '#FCE8E6',
    /** Light amber tint — warning pill backgrounds. */
    amber: '#FEF7E0',
  },
} as const;

// ═════════════════════════════════════════════════════════════════
//  3. Raw Palette (for custom / one-off uses)
// ═════════════════════════════════════════════════════════════════

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  green: '#155215',
  blue: '#194080',
  successBlue: '#092F6E',
  red500: '#DC2626',
  amber400: '#F59E0B',
} as const;

/** Type helper — extract a text colour key. */
export type TextColorKey = keyof typeof colors.text;

/** Type helper — extract a tint colour key. */
export type TintColorKey = keyof typeof colors.tint;

// ═════════════════════════════════════════════════════════════════
//  4. V5 Premium Tokens (Single-accent, Glassmorphism, Zinc scale)
// ═════════════════════════════════════════════════════════════════

export const colorsV5 = {
  // ── Glass Surfaces ──────────────────────────────────────────────
  surface: {
    glassLight: 'rgba(255, 255, 255, 0.72)',
    glassDark: 'rgba(15, 23, 42, 0.72)',
    glassBorderLight: 'rgba(255, 255, 255, 0.12)',
    glassBorderDark: 'rgba(255, 255, 255, 0.08)',
    glassInnerLight: 'rgba(255, 255, 255, 0.1)',
    glassInnerDark: 'rgba(255, 255, 255, 0.06)',
  },

  // ── Single Accent System (Emerald) ──────────────────────────────
  accent: {
    primary: '#05C46B',
    primaryHover: '#04A65A',
    primaryPress: '#038A4D',
    primarySoft: 'rgba(5, 196, 107, 0.12)',
    primarySoftHover: 'rgba(5, 196, 107, 0.18)',
    onPrimary: '#FFFFFF',
  },

  // ── Status Colors ───────────────────────────────────────────────
  status: {
    live: '#05C46B',
    livePulse: 'rgba(5, 196, 107, 0.4)',
    bestseller: '#F59E0B',
    bestsellerSoft: 'rgba(245, 158, 11, 0.12)',
    bestsellerBorder: 'rgba(245, 158, 11, 0.3)',
  },

  // ── Text (Zinc Scale — No Blue/Purple Grays) ────────────────────
  textV5: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    quaternary: '#CBD5E1',
    inverse: '#FFFFFF',
    onGlassLight: '#F8FAFC',
    onGlassDark: '#FFFFFF',
  },

  // ── Shadows (Diffusion — wide, subtle) ──────────────────────────
  shadow: {
    diffusionLight: 'rgba(15, 23, 42, 0.06)',
    diffusionDark: 'rgba(0, 0, 0, 0.25)',
    cardLight: 'rgba(15, 23, 42, 0.04)',
    cardDark: 'rgba(0, 0, 0, 0.15)',
  },
} as const;

export type ColorsV5Key = keyof typeof colorsV5;

// ═════════════════════════════════════════════════════════════════
//  5. Courses Redesign Dark Theme Tokens
// ═════════════════════════════════════════════════════════════════

export const coursesDark = {
  /** Page background — Material 3 light sky blue */
  base: '#F4F8FC',
  /** Elevated containers (search, input fields, collapsible panel) */
  surfaceElevated: '#FFFFFF',
  /** Clean white cards */
  surfaceCard: '#FFFFFF',
  /** Light sky-blue tinted card containers */
  surfaceCardDark: '#EBF3FC',
  /** MD3 Brand Blue (Google Primary Blue) */
  accentPrimary: '#0B57D0',
  /** Secondary sky-blue highlight for progress & ratings */
  accentCyan: '#0284C7',
  /** Subtle hover/highlight shadow glow */
  accentGlow: 'rgba(11, 87, 208, 0.08)',
  /** Page text primary (Slate 800) */
  textOnDark: '#1E293B',
  /** Page text secondary (Slate 500) */
  textMutedOnDark: '#64748B',
  /** Card text primary */
  textOnCard: '#1E293B',
  /** Card text secondary */
  textMutedOnCard: '#64748B',
  /** Very light blue borders */
  dividerOnDark: '#E2EEFC',
  /** Tinted skeleton shimmer */
  shimmer: 'rgba(11, 87, 208, 0.05)',
  
  // Category pop accents and M3 light gradients
  categories: {
    all: { accent: '#0B57D0', gradient: ['#E0EEFF', '#B3D7FF'] as [string, string] },
    school: { accent: '#6D28D9', gradient: ['#F3E8FF', '#DDD6FE'] as [string, string] },
    engineering: { accent: '#B45309', gradient: ['#FEF3C7', '#FDE68A'] as [string, string] },
    medical: { accent: '#047857', gradient: ['#D1FAE5', '#A7F3D0'] as [string, string] },
    law: { accent: '#B91C1C', gradient: ['#FEE2E2', '#FECACA'] as [string, string] },
    cuet: { accent: '#BE185D', gradient: ['#FCE7F3', '#FBCFE8'] as [string, string] },
  }
} as const;

export type CoursesDark = typeof coursesDark;

export const coursesLightM3 = {
  /** Page background — Material 3 light sky blue */
  base: '#F4F8FC',
  /** Elevated containers (search, input fields) */
  surfaceElevated: '#FFFFFF',
  /** Clean white cards */
  surfaceCard: '#FFFFFF',
  /** Light sky-blue tinted card containers */
  surfaceCardDark: '#EBF3FC',
  /** MD3 Brand Blue (Google Primary Blue) */
  accentPrimary: '#0B57D0',
  /** Secondary sky-blue highlight for progress & ratings */
  accentCyan: '#0284C7',
  /** Subtle hover/highlight shadow glow */
  accentGlow: 'rgba(11, 87, 208, 0.08)',
  /** Page text primary (Slate 800) */
  textOnDark: '#1E293B',
  /** Page text secondary (Slate 500) */
  textMutedOnDark: '#64748B',
  /** Card text primary */
  textOnCard: '#1E293B',
  /** Card text secondary */
  textMutedOnCard: '#64748B',
  /** Very light blue borders */
  dividerOnDark: '#E2EEFC',
  /** Tinted skeleton shimmer */
  shimmer: 'rgba(11, 87, 208, 0.05)',
  
  // Category accents and M3 light gradients
  categories: {
    all:         { accent: '#0B57D0', gradient: ['#E0EEFF', '#B3D7FF'] as [string, string] },
    school:      { accent: '#6D28D9', gradient: ['#F3E8FF', '#DDD6FE'] as [string, string] },
    engineering: { accent: '#B45309', gradient: ['#FEF3C7', '#FDE68A'] as [string, string] },
    medical:     { accent: '#047857', gradient: ['#D1FAE5', '#A7F3D0'] as [string, string] },
    law:         { accent: '#B91C1C', gradient: ['#FEE2E2', '#FECACA'] as [string, string] },
    cuet:        { accent: '#BE185D', gradient: ['#FCE7F3', '#FBCFE8'] as [string, string] },
  }
} as const;

export type CoursesLightM3 = typeof coursesLightM3;

