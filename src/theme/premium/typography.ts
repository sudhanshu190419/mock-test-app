/**
 * Premium Typography — "Confident Depth" Design System (v2)
 *
 * Bold, confident typography using geometric grotesque (Plus Jakarta Sans / Outfit).
 * Large, heavy headings (700-800 weight) conveying authority and institutional credibility.
 */

import { Platform, type TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'Plus Jakarta Sans',
  android: 'PlusJakartaSans-Regular',
  default: undefined,
});

const fontFamilyBold = Platform.select({
  ios: 'Plus Jakarta Sans',
  android: 'PlusJakartaSans-Bold',
  default: undefined,
});

const fontFamilyExtraBold = Platform.select({
  ios: 'Plus Jakarta Sans',
  android: 'PlusJakartaSans-ExtraBold',
  default: undefined,
});

const fontFamilySemiBold = Platform.select({
  ios: 'Plus Jakarta Sans',
  android: 'PlusJakartaSans-SemiBold',
  default: undefined,
});

const fontFamilyMedium = Platform.select({
  ios: 'Plus Jakarta Sans',
  android: 'PlusJakartaSans-Medium',
  default: undefined,
});

export const typography = {
  display: {
    fontFamily: fontFamilyExtraBold,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
    letterSpacing: -1.0,
  } satisfies TextStyle,

  h1: {
    fontFamily: fontFamilyExtraBold,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -0.8,
  } satisfies TextStyle,

  h2: {
    fontFamily: fontFamilyBold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.6,
  } satisfies TextStyle,

  h3: {
    fontFamily: fontFamilyBold,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.4,
  } satisfies TextStyle,

  title: {
    fontFamily: fontFamilyBold,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  } satisfies TextStyle,

  subtitle: {
    fontFamily: fontFamilySemiBold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0,
  } satisfies TextStyle,

  body: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0,
  } satisfies TextStyle,

  bodySmall: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0.1,
  } satisfies TextStyle,

  caption: {
    fontFamily: fontFamilyMedium,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  button: {
    fontFamily: fontFamilyBold,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  buttonSmall: {
    fontFamily: fontFamilySemiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  label: {
    fontFamily: fontFamilyBold,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.1,
  } satisfies TextStyle,

  labelSmall: {
    fontFamily: fontFamilySemiBold,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  // Price-specific tokens per design brief
  priceHero: {
    fontFamily: fontFamilyExtraBold,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  priceStrike: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    textDecorationLine: 'line-through',
    color: '#64748B',
  } satisfies TextStyle,
} as const;

export type PremiumTypography = typeof typography;
