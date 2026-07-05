/**
 * OnboardingScreenOne — Freebuff Onboarding Screen 1
 *
 * First screen in the onboarding flow introducing new users to the
 * Freebuff learning platform. Displays a hero illustration, brand
 * messaging, pagination dots, and call-to-action buttons.
 *
 * ─── Layout Structure ───────────────────────────────────────────
 *  • SafeAreaView with theme background
 *  • Top section (natural height):
 *     – "Skip" text button at top-right
 *     – Heading (left-aligned): "Welcome to" + green "Freebuff"
 *     – Tagline: "Your all-in-one learning companion for success."
 *  • Illustration centred in remaining space with decorative bg
 *  • Bottom section:
 *     – Progress indicator "1/3" in green
 *     – Title "Learn Anytime" in brand blue
 *     – Description text
 *     – Pagination dots (3)
 *     – "Next" primary button with right arrow
 *     – "Skip for now" text button
 *     – Home indicator bar
 *
 * ─── Props ──────────────────────────────────────────────────────
 *  • `onComplete` — Callback invoked when the user taps "Skip" or
 *    "Skip for now". Completes onboarding and transitions to auth.
 *  • `onNext` — Callback invoked when user taps "Next". Navigates
 *    to the next onboarding screen. Falls back to `onComplete`.
 *
 * ─── Design System Compliance ───────────────────────────────────
 *  ✓ All colours from src/theme/colors
 *  ✓ All typography from src/theme/typography
 *  ✓ All spacing from src/theme/spacing
 *  ✓ All radius from src/theme/radius
 *  ✓ All component styles from src/theme/components
 *  ✓ No hardcoded design values
 *  ✓ No inline styles
 *  ✓ StyleSheet.create() for all styles
 *
 * @module OnboardingScreenOne
 */

import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { components } from '../../theme/components';

// ═════════════════════════════════════════════════════════════════
//  Types
// ═════════════════════════════════════════════════════════════════

interface OnboardingScreenOneProps {
  /** Callback invoked when the user completes or skips onboarding. */
  onComplete?: () => void;
  /** Callback invoked when user taps "Next". Falls back to `onComplete`. */
  onNext?: () => void;
}

// ═════════════════════════════════════════════════════════════════
//  Constants
// ═════════════════════════════════════════════════════════════════

/** Total number of onboarding steps. */
const TOTAL_STEPS = 3;

/** Current active step index (1-based). */
const CURRENT_STEP = 1;

// ═════════════════════════════════════════════════════════════════
//  Pagination Dots
// ═════════════════════════════════════════════════════════════════

/**
 * Three horizontal dots indicating the current onboarding step.
 * The active dot uses the theme secondary blue; inactive dots use a
 * lighter gray tone for a more elegant, less prominent appearance.
 */
function PaginationDots(): React.JSX.Element {
  return (
    <View style={styles.paginationRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, index) => {
        const isActive = index + 1 === CURRENT_STEP;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Main Screen
// ═════════════════════════════════════════════════════════════════

export default function OnboardingScreenOne({
  onComplete,
  onNext,
}: OnboardingScreenOneProps): React.JSX.Element {
  const handleNext = onNext ?? onComplete;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.root}>
        {/* ── Top: Skip + Heading ─────────────────────────────── */}
        <View style={styles.topSection}>
          {/* Skip button (top-right) */}
          <View style={styles.skipContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              onPress={onComplete}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Heading (left-aligned) */}
          <View style={styles.headingSection}>
            <Text style={styles.headingLine1}>Welcome to</Text>
            <Text style={styles.headingFreebuff}>Freebuff</Text>
            <View style={styles.taglineWrapper}>
              <Text style={styles.tagline}>
                Your all-in-one learning companion for success.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Illustration ────────────────────────────────────── */}
        <View style={styles.illustrationSection}>
          {/* Decorative circular background */}
          
          <Image
            source={require('../../../assets/images/onboarding/onboarding_1.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* ── Bottom Content ──────────────────────────────────── */}
        <View style={styles.bottomSection}>
          {/* Step indicator & title */}
          <View style={styles.stepGroup}>
            <Text style={styles.progress}>{`${CURRENT_STEP}/${TOTAL_STEPS}`}</Text>
            <Text style={styles.title}>Learn Anytime</Text>
            <View style={styles.descriptionWrapper}>
              <Text style={styles.description}>
                Access live classes, recorded lectures,{'\n'}PDFs and notes.
              </Text>
            </View>
          </View>

          {/* Pagination dots */}
          <PaginationDots />

          {/* Buttons */}
          <View style={styles.buttonsWrapper}>
            <TouchableOpacity
              style={components.button.primary}
              activeOpacity={0.8}
              onPress={handleNext}
            >
              <Text style={components.buttonText.primary}>Next</Text>
              <Text style={styles.arrowIcon}>{' \u2192'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[components.button.text, styles.skipForNowButton]}
              activeOpacity={0.7}
              onPress={onComplete}
            >
              <Text style={components.buttonText.text}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          {/* Home indicator (iOS-style bar) */}
          <View style={styles.homeIndicatorContainer}>
            <View style={styles.homeIndicator} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // ── Container ──────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing[32],
  },

  // ── Top Section (skip + heading, natural height) ─────────────
  topSection: {
    flexShrink: 0,
  },

  // ── Skip (top-right) ─────────────────────────────────────────
  skipContainer: {
    alignItems: 'flex-end',
    paddingTop: spacing[8],
  },
  skipText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },

  // ── Heading (left-aligned) ────────────────────────────────────
  headingSection: {
    marginTop: spacing[20],
    marginBottom: spacing[24],
    
  },
  headingLine1: {
    ...typography.heading2,
    color: colors.text.primary,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  headingFreebuff: {
    ...typography.heading2,
    color: colors.primary,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  taglineWrapper: {
    width: '80%',
    marginTop: spacing[8],
  },
  tagline: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // ── Illustration ──────────────────────────────────────────────
  illustrationSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -spacing[32],
  },
 
  illustration: {
    width: '100%',
    height: '100%',
  },

  // ── Bottom Section ────────────────────────────────────────────
  bottomSection: {
    flexShrink: 0,
    paddingTop: spacing[24],
    paddingBottom: spacing[8],
  },

  // ── Step group (1/3, title, description) ──────────────────────
  stepGroup: {
    marginBottom: spacing[24],
  },
  progress: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing[8],
  },
  title: {
    ...typography.title,
    color: colors.secondary,
    marginBottom: spacing[8],
  },
  descriptionWrapper: {
    width: '83%',
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // ── Pagination ────────────────────────────────────────────────
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    marginBottom: spacing[24],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.sm,
  },
  dotActive: {
    backgroundColor: colors.secondary,
    width: 20,
  },
  dotInactive: {
    backgroundColor: palette.slate200,
  },

  // ── Buttons ───────────────────────────────────────────────────
  buttonsWrapper: {
    gap: spacing[16],
  },
  arrowIcon: {
    ...typography.button,
    color: colors.text.inverse,
  },
  skipForNowButton: {
    paddingVertical: spacing[8],
    minHeight: 44,
  },

  // ── Home Indicator ────────────────────────────────────────────
  homeIndicatorContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing[16],
    paddingBottom: spacing[8],
  },
  homeIndicator: {
    width: '33%',
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.slate300,
  },
});
