/**
 * HeroBanner
 *
 * Premium hero banner with:
 * - Gradient background card
 * - CTA button with native press feedback
 * - Static illustration (no animations)
 *
 * @module components/home/HeroBanner
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
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
  return (
    <View
      style={styles.shadowWrapper}
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

        {/* Right: static illustration */}
        <View style={styles.imageWrapper}>
          <Image
            source={HERO_IMAGE}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shadowWrapper: {
    marginHorizontal: spacing[16],
    borderRadius: 20,
    shadowColor: '#4A3AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
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
