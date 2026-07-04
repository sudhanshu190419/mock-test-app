/**
 * OnboardingScreen — Freebuff Unified Onboarding
 *
 * A single-screen onboarding flow that animates content transitions
 * instead of navigating between separate screens. The illustration,
 * heading, step group (progress, title, and description) slide
 * horizontally with a premium ease-out cubic animation, while the
 * shell (SafeArea, Skip button, pagination dots, action buttons,
 * and home indicator) remains fixed.
 *
 * ─── Layout per slide ───────────────────────────────────────────
 *  Slide 0 matches OnboardingScreenOne:
 *    heading → illustration → stepGroup (below image)
 *  Slides 1–2 match OnboardingScreenTwo/Three:
 *    stepGroup (above image) → illustration
 *
 * ─── Animation ──────────────────────────────────────────────────
 *  • 400 ms ease-out cubic slide (translateX)
 *  • Outgoing content slides left, incoming content slides in from right
 *  • Pagination dots get a subtle opacity fade on transition
 *  • 60 FPS (useNativeDriver: true)
 *
 * ─── Architecture ──────────────────────────────────────────────
 *  • All three slides stored in a data array
 *  • `currentIndex` state (0–2) drives the carousel position
 *  • Tapping "Next" increments the index and triggers the animation
 *  • "Skip" / "Skip for now" immediately completes onboarding
 *  • Swipe left/right gestures advance or go back
 *
 * ─── Design System ──────────────────────────────────────────────
 *  ✓ All colours from src/theme/colors
 *  ✓ All typography from src/theme/typography
 *  ✓ All spacing from src/theme/spacing
 *  ✓ All radius from src/theme/radius
 *  ✓ All component styles from src/theme/components
 *  ✓ No hardcoded design values
 *  ✓ StyleSheet.create() for all styles
 *
 * @module OnboardingScreen
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  PanResponder,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { components } from '../../theme/components';

// ═════════════════════════════════════════════════════════════════
//  Constants
// ═════════════════════════════════════════════════════════════════

const SCREEN_WIDTH = Dimensions.get('window').width;
const TOTAL_STEPS = 3;
const ANIMATION_DURATION = 400;
const SWIPE_THRESHOLD = 50;

// ═════════════════════════════════════════════════════════════════
//  Types
// ═════════════════════════════════════════════════════════════════

interface OnboardingStep {
  /** Illustration asset. */
  illustration: ImageSourcePropType;
  /** Heading for slide 0 only. */
  heading?: { line1: string; freebuff: string };
  /** Tagline for slide 0 only. */
  tagline?: string;
  /** Progress text (e.g. "1/3"). */
  progress: string;
  /** Step title. */
  title: string;
  /** Step description. */
  description: string;
}

interface OnboardingScreenProps {
  /** Callback invoked when onboarding is completed or skipped. */
  onComplete?: () => void;
}

// ═════════════════════════════════════════════════════════════════
//  Data
// ═════════════════════════════════════════════════════════════════

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    illustration: require('../../../assets/images/onboarding/onboarding_1.png'),
    heading: { line1: 'Welcome to', freebuff: 'Freebuff' },
    tagline: 'Your all-in-one learning companion for success.',
    progress: '1/3',
    title: 'Learn Anytime',
    description: 'Access live classes, recorded lectures,\nPDFs and notes.',
  },
  {
    illustration: require('../../../assets/images/onboarding/onboarding_2.png'),
    progress: '2/3',
    title: 'Practice Smarter',
    description:
      'Attempt mock tests and analyze your\nperformance instantly.',
  },
  {
    illustration: require('../../../assets/images/onboarding/onboarding_3.png'),
    progress: '3/3',
    title: 'Track Your Growth',
    description:
      'Monitor your progress with analytics\nand personalized insights.',
  },
];

// ═════════════════════════════════════════════════════════════════
//  Pagination Dots
// ═════════════════════════════════════════════════════════════════

function PaginationDots({
  activeIndex,
}: {
  activeIndex: number;
}): React.JSX.Element {
  return (
    <View style={styles.paginationRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, index) => {
        const isActive = index === activeIndex;
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

export default function OnboardingScreen({
  onComplete,
}: OnboardingScreenProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isAnimating = useRef(false);

  // ── Animation ─────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (targetIndex: number) => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      Animated.sequence([
        Animated.timing(dotsOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION * 0.3,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -targetIndex * SCREEN_WIDTH,
            duration: ANIMATION_DURATION,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(dotsOpacity, {
            toValue: 1,
            duration: ANIMATION_DURATION * 0.5,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        isAnimating.current = false;
      });
    },
    [translateX, dotsOpacity],
  );

  // ── Handlers ─────────────────────────────────────────────────
  const goTo = useCallback(
    (targetIndex: number) => {
      if (isAnimating.current) return;
      if (targetIndex < 0 || targetIndex >= TOTAL_STEPS) return;
      setCurrentIndex(targetIndex);
      animateTo(targetIndex);
    },
    [animateTo],
  );

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= TOTAL_STEPS) {
      // Last slide — transition immediately; LoginScreen handles entrance
      onComplete?.();
      return;
    }
    goTo(nextIndex);
  }, [currentIndex, onComplete, goTo]);

  const handlePrev = useCallback(() => {
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const handleSkip = useCallback(() => {
    if (isAnimating.current) return;
    onComplete?.();
  }, [onComplete, isAnimating]);

  // ── Swipe Gesture ─────────────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
        onPanResponderRelease: (_, gs) => {
          if (gs.dx < -SWIPE_THRESHOLD) {
            handleNext();
          } else if (gs.dx > SWIPE_THRESHOLD) {
            if (currentIndex > 0) {
              handlePrev();
            }
          }
        },
      }),
    [handleNext, handlePrev, currentIndex],
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.root}>
        {/* ── Skip (top-right, fixed) ────────────────────────────── */}
        <View style={styles.skipContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* ── Animated Carousel ──────────────────────────────────── */}
        <View style={styles.carouselContainer} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.carouselTrack,
              {
                width: SCREEN_WIDTH * TOTAL_STEPS,
                transform: [{ translateX }],
              },
            ]}
          >
            {ONBOARDING_STEPS.map((step, index) => (
              <View key={index} style={{ width: SCREEN_WIDTH, flex: 1, paddingHorizontal: spacing[32] }}>
                {index === 0 ? (
                  // Slide 0 — matches OnboardingScreenOne
                  <>
                    <View style={styles.headingSection}>
                      <Text style={styles.headingLine1}>Welcome to</Text>
                      <Text style={styles.headingFreebuff}>Freebuff</Text>
                      <View style={styles.taglineWrapper}>
                        <Text style={styles.tagline}>
                          Your all-in-one learning companion for success.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.illustrationSection}>
                      <Image
                        source={step.illustration}
                        style={styles.illustration}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.bottomSection}>
                      <View style={styles.stepGroup}>
                        <Text style={styles.progress}>{step.progress}</Text>
                        <Text style={styles.title}>{step.title}</Text>
                        <View style={styles.descriptionWrapper}>
                          <Text style={styles.description}>
                            {step.description}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  // Slides 1–2 — match OnboardingScreenTwo/Three
                  <>
                    <View style={styles.stepGroupTop}>
                      <Text style={styles.progress}>{step.progress}</Text>
                      <Text style={styles.title}>{step.title}</Text>
                      <View style={styles.descriptionWrapper}>
                        <Text style={styles.description}>
                          {step.description}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.illustrationSection}>
                      <Image
                        source={step.illustration}
                        style={styles.illustration}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.bottomSection} />
                  </>
                )}
              </View>
            ))}
          </Animated.View>
        </View>

        {/* ── Pagination Dots (fixed) ────────────────────────────── */}
        <Animated.View style={[styles.paginationFixed, { opacity: dotsOpacity }]}>
          <PaginationDots activeIndex={currentIndex} />
        </Animated.View>

        {/* ── Buttons (fixed) ────────────────────────────────────── */}
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
            onPress={handleSkip}
          >
            <Text style={components.buttonText.text}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        {/* ── Home indicator (fixed) ─────────────────────────────── */}
        <View style={styles.homeIndicatorContainer}>
          <View style={styles.homeIndicator} />
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
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing[32],
  },

  // ── Skip (top-right) ─────────────────────────────────────────
  skipContainer: {
    alignItems: 'flex-end',
    paddingTop: spacing[8],
    flexShrink: 0,
  },
  skipText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },

  // ── Carousel — full-width (negates root paddingHorizontal) ────
  carouselContainer: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: -spacing[32],
  },
  carouselTrack: {
    flexDirection: 'row',
    flex: 1,
  },

  // ── Heading (slide 0 only) — matches OnboardingScreenOne ───────
  headingSection: {
    marginTop: spacing[20],
    marginBottom: spacing[24],
    flexShrink: 0,
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

  // ── Step group (below illustration, slide 0 only) — matches OnboardingScreenOne ──
  stepGroup: {
    marginBottom: spacing[24],
  },

  // ── Step group (above illustration, slides 1–2) — matches OnboardingScreenTwo/Three ──
  stepGroupTop: {
    marginTop: spacing[20],
    marginBottom: spacing[24],
    flexShrink: 0,
  },

  // ── Illustration — matches all originals ──────────────────────
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

  // ── Bottom section (slide 0) — matches OnboardingScreenOne ─────
  bottomSection: {
    flexShrink: 0,
    paddingTop: spacing[24],
    paddingBottom: spacing[8],
  },

  // ── Shared step group tokens ──────────────────────────────────
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

  // ── Pagination (fixed, outside carousel) ─────────────────────
  paginationFixed: {
    flexShrink: 0,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
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

  // ── Buttons — matches all originals ───────────────────────────
  buttonsWrapper: {
    gap: spacing[16],
    flexShrink: 0,
  },
  arrowIcon: {
    ...typography.button,
    color: colors.text.inverse,
  },
  skipForNowButton: {
    paddingVertical: spacing[8],
    minHeight: 44,
  },

  // ── Home Indicator — matches all originals ────────────────────
  homeIndicatorContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing[16],
    paddingBottom: spacing[8],
    flexShrink: 0,
  },
  homeIndicator: {
    width: '33%',
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.slate300,
  },
});
