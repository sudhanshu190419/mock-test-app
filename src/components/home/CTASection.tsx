/**
 * CTASection
 *
 * "New Here?" premium call-to-action card with:
 * - Headline and encouraging subtitle on the left
 * - "Start Free Test" button
 * - Gift-box illustration on the right
 *
 * Uses a warm golden background to draw attention.
 *
 * @module components/home/CTASection
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';

import Icon from './Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Gift-box illustration used in the CTA section. */
const CTA_ILLUSTRATION = require('../../../assets/images/onboarding/welcome.png');

/** Warm golden background for the CTA card. */
const CTA_BG = '#FFF8E7';
/** Amber / golden accent for the CTA button — uses the theme warning colour. */
const CTA_ACCENT = colors.warning;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CTASectionProps {
  /** Callback when the "Start Free Test" button is pressed. */
  onStartFreeTest?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const CTASection = React.memo(function CTASection({
  onStartFreeTest,
}: CTASectionProps): React.JSX.Element {
  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Button press animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="summary"
    >
      {/* Left content */}
      <View style={styles.content}>
        <Text style={styles.headline}>New Here?</Text>
        <Text style={styles.subtitle}>
          Take a free mock test and experience MockPrep
        </Text>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onStartFreeTest}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.85}
            accessibilityLabel="Start Free Test"
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Start Free Test</Text>
            <Icon
              name="arrow-right"
              color={colors.text.primary}
              width={18}
              height={18}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Right: gift-box illustration */}
      <View style={styles.imageWrapper}>
        <Image
          source={CTA_ILLUSTRATION}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel="Gift box illustration"
        />
      </View>
    </Animated.View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: spacing[16],
    backgroundColor: CTA_BG,
    borderRadius: radius.xl,
    overflow: 'hidden',
    minHeight: 120,
    ...shadows.small,
  },
  content: {
    flex: 1,
    padding: spacing[20],
    paddingRight: spacing[8],
    justifyContent: 'center',
  },
  headline: {
    ...typography.subtitle,
    fontWeight: '800' as const,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: CTA_ACCENT,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  ctaText: {
    ...typography.buttonSmall,
    color: colors.text.primary,
    fontWeight: '700' as const,
  },
  imageWrapper: {
    width: 110,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: spacing[8],
    paddingBottom: spacing[4],
  },
  image: {
    width: '100%',
    height: 100,
  },
});

export default CTASection;
