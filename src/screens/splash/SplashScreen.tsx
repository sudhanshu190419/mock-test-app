/**
 * SplashScreen — Freebuff Premium Launch Screen
 *
 * A premium, minimal, animated splash screen that communicates a
 * modern learning platform experience while the auth layer
 * initialises.
 *
 * ─── Animation Sequence ─────────────────────────────────────────
 *  0–500 ms   → Logo monogram + radial glow fade in
 *  500–900 ms → App name "Freebuff" fades in
 *  900–1300ms → Tagline "Learn. Practice. Succeed." fades in
 *  0–∞        → Loading dots pulse continuously
 *
 * ─── Visual Checkpoints ─────────────────────────────────────────
 *  ✓ Clean light background (#F8FAFC)
 *  ✓ Text-based logo monogram (FB) in brand blue
 *  ✓ Large bold "Freebuff" app name
 *  ✓ Tagline beneath the app name
 *  ✓ Generous whitespace using the 8-point spacing system
 *  ✓ Subtle green/blue decorative corner circles at 10% opacity
 *  ✓ Soft radial glow behind the logo
 *  ✓ Custom animated loading indicator (pulsing dots)
 *  ✓ All colours, spacing, typography from the design system
 *  ✓ No buttons, navigation, cards, login, or illustrations
 *
 * @module SplashScreen
 */

import React, { useRef, useEffect } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ═════════════════════════════════════════════════════════════════
//  Constants
// ═════════════════════════════════════════════════════════════════

/** Staggered delay offsets for each content layer (ms). */
const STAGGER = {
  logo: 0,
  appName: 500,
  tagline: 900,
} as const;

// ═════════════════════════════════════════════════════════════════
//  Loading Dots Component
// ═════════════════════════════════════════════════════════════════

/**
 * Three pulsing dots arranged in a row.
 * Each dot animates its opacity on a loop with a staggered delay,
 * creating a graceful wave effect.
 */
function LoadingDots(): React.JSX.Element {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );

    const anim1 = pulse(dot1, 0);
    const anim2 = pulse(dot2, 200);
    const anim3 = pulse(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3 }]} />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Decorative Corner Shapes
// ═════════════════════════════════════════════════════════════════

/**
 * Abstract decorative circles in brand colours placed at the screen
 * corners at low opacity. Adds a premium, modern feel without
 * distracting from the centred content.
 */
function DecorativeCorners(): React.JSX.Element {
  return (
    <>
      {/* Top-left — green */}
      <View style={styles.cornerTL} />
      {/* Top-right — blue */}
      <View style={styles.cornerTR} />
      {/* Bottom-left — blue */}
      <View style={styles.cornerBL} />
      {/* Bottom-right — green */}
      <View style={styles.cornerBR} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Logo Monogram
// ═════════════════════════════════════════════════════════════════

/**
 * Text-based logo: "FB" monogram centred inside a rounded rectangle.
 * The container uses the brand blue with an inner glow-like shadow.
 */
function LogoMonogram(): React.JSX.Element {
  return (
    <View style={styles.logoContainer}>
      <Text style={styles.logoText}>FB</Text>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Main Splash Screen
// ═════════════════════════════════════════════════════════════════

export default function SplashScreen(): React.JSX.Element {
  // ── Animated values for staggered fade-in ────────────────────
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const appNameOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run all animations in parallel with staggered delays.
    // Each animation's delay is relative to the parallel start time,
    // giving a clean staggered fade: logo → app name → tagline.
    const parallel = Animated.parallel([
      // Logo + glow (starts immediately)
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        delay: STAGGER.logo,
        useNativeDriver: true,
      }),
      Animated.timing(glowScale, {
        toValue: 1,
        duration: 600,
        delay: STAGGER.logo,
        useNativeDriver: true,
      }),
      // App name (starts at 500ms)
      Animated.timing(appNameOpacity, {
        toValue: 1,
        duration: 400,
        delay: STAGGER.appName,
        useNativeDriver: true,
      }),
      // Tagline (starts at 900ms)
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        delay: STAGGER.tagline,
        useNativeDriver: true,
      }),
    ]);

    parallel.start();

    return () => {
      parallel.stop();
    };
  }, [logoOpacity, glowScale, appNameOpacity, taglineOpacity]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Decorative elements ─────────────────────────────── */}
      <DecorativeCorners />

      {/* ── Radial glow behind the logo (scaled in) ────────── */}
      <Animated.View
        style={[
          styles.glowOuter,
          { opacity: logoOpacity, transform: [{ scale: glowScale }] },
        ]}
        pointerEvents="none"
      >
        <View style={styles.glowGreen} />
        <View style={styles.glowBlue} />
      </Animated.View>

      {/* ── Main content (centred) ─────────────────────────── */}
      <View style={styles.content}>
        {/* Logo monogram */}
        <Animated.View style={{ opacity: logoOpacity }}>
          <LogoMonogram />
        </Animated.View>

        {/* App name */}
        <Animated.View
          style={[styles.appNameWrapper, { opacity: appNameOpacity }]}
        >
          <Text style={styles.appName}>Freebuff</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[styles.taglineWrapper, { opacity: taglineOpacity }]}
        >
          <Text style={styles.tagline}>Learn. Practice. Succeed.</Text>
        </Animated.View>
      </View>

      {/* ── Loading indicator (bottom area) ────────────────── */}
      <View style={styles.loadingSection}>
        <LoadingDots />
        <Text style={styles.loadingText}>Getting ready</Text>
      </View>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const LOGO_SIZE = 88;
const GLOW_SIZE = 220;

const styles = StyleSheet.create({
  // ── Container ────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Decorative Corners ───────────────────────────────────────
  cornerTL: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },
  cornerTR: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.secondary,
    opacity: 0.08,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.secondary,
    opacity: 0.07,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -70,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },

  // ── Radial Glow ──────────────────────────────────────────────
  glowOuter: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    top: '38%',
    marginTop: -(GLOW_SIZE / 2),
  },
  glowGreen: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
  glowBlue: {
    position: 'absolute',
    width: GLOW_SIZE * 0.72,
    height: GLOW_SIZE * 0.72,
    borderRadius: (GLOW_SIZE * 0.72) / 2,
    backgroundColor: colors.secondary,
    opacity: 0.05,
  },

  // ── Content ──────────────────────────────────────────────────
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginBottom: spacing[48],
  },

  // ── Logo ─────────────────────────────────────────────────────
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft shadow
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.inverse,
    letterSpacing: 2,
    includeFontPadding: false,
  },

  // ── App Name ─────────────────────────────────────────────────
  appNameWrapper: {
    marginTop: spacing[24],
  },
  appName: {
    ...typography.display,
    color: colors.text.primary,
  },

  // ── Tagline ──────────────────────────────────────────────────
  taglineWrapper: {
    marginTop: spacing[12],
  },
  tagline: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },

  // ── Loading Section ──────────────────────────────────────────
  loadingSection: {
    position: 'absolute',
    bottom: spacing[56],
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  loadingText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing[12],
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
});
