/**
 * Premium Colors — "Confident Depth" Design System (v2)
 *
 * OKLCH-mapped color tokens specifically tuned for Indian competitive exam prep (JEE/NEET).
 * Base: Warm off-white (oklch(0.98 0.005 260)) for browse surfaces.
 * Primary: Deep Indigo (oklch(0.35 0.15 270)) — Trust, institutional authority.
 * Accent: Warm Amber/Gold (oklch(0.78 0.15 75)) — Achievement, toppers, medals.
 * Success: Emerald (oklch(0.55 0.15 155)) — Growth, correct answers.
 * Urgency: Coral (oklch(0.65 0.18 25)) — Limited seats, expiring offers.
 */

export const colors = {
  // Brand Core (Converted from OKLCH to exact Hex values for React Native)
  indigo: {
    DEFAULT: '#1E1B4B', // oklch(0.25 0.12 270) - Deep navy/indigo hero base
    light: '#312E81',   // oklch(0.35 0.15 270) - Primary interactive indigo
    dark: '#0F172A',    // oklch(0.18 0.08 260) - Ultra-deep slate/navy
    border: '#C7D2FE',
  },
  amber: {
    DEFAULT: '#F59E0B', // oklch(0.78 0.15 75) - Warm Gold / Topper yellow
    light: '#FBBF24',
    dark: '#D97706',
    border: '#FDE68A',
  },
  emerald: {
    DEFAULT: '#10B981', // oklch(0.65 0.15 155) - True success / progress
    light: '#34D399',
    dark: '#059669',
    border: '#A7F3D0',
  },
  coral: {
    DEFAULT: '#F97316', // oklch(0.65 0.18 25) - Urgency / discount badge
    light: '#FB923C',
    dark: '#EA580C',
    border: '#FED7AA',
  },

  // Base & Surfaces
  background: '#F8FAFC', // oklch(0.98 0.005 260) - Warm off-white base
  surface: '#FFFFFF',    // Pure white card core
  surfaceElevated: '#FFFFFF',
  outerShell: '#F1F5F9', // Subtle outer tray for double-bezel cards

  // Text Hierarchy
  text: {
    primary: '#0F172A',   // High contrast slate-900
    secondary: '#475569', // Slate-600
    tertiary: '#64748B',  // Slate-500
    disabled: '#94A3B8',  // Slate-400
    inverse: '#FFFFFF',   // On dark hero/CTAs
    accent: '#D97706',    // Amber text
  },

  // Surface Tints (For badges, pills, and highlights)
  tint: {
    indigo: '#EEF2FF',
    amber: '#FFFBEB',
    emerald: '#ECFDF5',
    coral: '#FFF7ED',
    slate: '#F1F5F9',
  },

  // Feedback & Semantic
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Borders & Dividers
  border: {
    DEFAULT: '#E2E8F0',
    subtle: '#F1F5F9',
    strong: '#CBD5E1',
    innerHighlight: '#FFFFFF',
  },

  // Scrim & Overlays
  overlay: {
    dark: 'rgba(15, 23, 42, 0.75)',
    light: 'rgba(255, 255, 255, 0.85)',
    heroScrim: 'rgba(30, 27, 75, 0.4)',
  },
} as const;

export type PremiumColors = typeof colors;
