/**
 * HeroBanner
 *
 * Large visually prominent card with:
 * - Left side: headline, subtitle, and "Explore Mock Tests" CTA
 * - Right side: hero illustration image
 *
 * @module components/home/HeroBanner
 */

import React, { useEffect, useRef } from 'react';
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
import LinearGradient from 'react-native-linear-gradient';


// ─── Constants ───────────────────────────────────────────────────────────────

/** Hero illustration asset. */
const HERO_IMAGE = require('../../../assets/hero-banner.png');

/** Soft lavender background matching the reference design. */
const HERO_BG = '#F7F5FF';
/** Primary purple colour for highlighted text and CTA button. */
const HERO_PRIMARY = '#4A3AFF';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface HeroBannerProps {
  /** Callback when the "Explore Mock Tests" button is pressed. */
  onExplorePress?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const HeroBanner = React.memo(function HeroBanner({
  onExplorePress,
}: HeroBannerProps): React.JSX.Element {
  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    // Outer wrapper carries the shadow. Shadows and `overflow: hidden`
    // don't mix in React Native — putting overflow on this view would
    // silently clip the shadow, so the radius+clip lives on the inner card.
    <Animated.View
      style={[
        styles.shadowWrapper,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="summary"
      accessibilityLabel="Hero banner: Ready to achieve your goals?"
    >
      <LinearGradient
  colors={[
  '#FFFFFF',
  '#FFFFFF',
  '#FBFAFF',
  '#F3EEFF',
]}
start={{ x: 1, y: 0.5 }}
end={{ x: 1, y: 0.5 }}
  style={styles.card}
>
        {/* Left content */}
        <View style={styles.content}>
          <Text style={styles.headline}>
            Ready to achieve{' '}
            <Text style={styles.highlight}>your goals</Text>?
          </Text>

          <Text style={styles.description}>
            Practice with the best mock tests and track your performance.
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onExplorePress}
            activeOpacity={0.85}
            accessibilityLabel="Explore PYQ's"
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Explore PYQ's</Text>
            <Icon
              name="arrow-right"
              color={colors.text.inverse}
              width={16}
              height={16}
            />
          </TouchableOpacity>
        </View>

        {/* Right: illustration */}
        <View style={styles.imageWrapper}>
          
          <Image
            source={HERO_IMAGE}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Carries margin + shadow only — no overflow, no borderRadius clipping,
  // so the shadow can render outside the card's bounds.
  shadowWrapper: {
    marginHorizontal: spacing[16],
    borderRadius: 20,
    
    shadowColor: '#4A3AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  // Carries the actual layout. Height is intentionally NOT fixed —
  // it sizes to its content, which is what prevents the clipping seen
  // in the previous version (fixed height 160 vs. ~190+ of real content).
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: HERO_BG,
    paddingVertical: spacing[20],
    paddingLeft: spacing[20],
    paddingRight: spacing[12],
  },
  content: {
    flex: 1.05,
    paddingRight: spacing[8],
  },
  headline: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '800' as const,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing[8],
  },
  highlight: {
    color: HERO_PRIMARY,
  },
  description: {
    ...typography.body,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
    marginBottom: spacing[16],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: HERO_PRIMARY,
    paddingHorizontal: spacing[16],
    paddingVertical: 11,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  ctaText: {
    ...typography.buttonSmall,
    fontSize: 12,
    color: colors.text.inverse,
    fontWeight: '700' as const,
  },
  imageWrapper: {
    flex: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 140,
  },
});

export default HeroBanner;