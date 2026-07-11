/**
 * PyqPracticeCard
 *
 * Premium PYQ practice card with:
 * - Full-bleed background image (pyq.png)
 * - Floating badge: "🔥 Most Attempted" or "⭐ Student Favorite"
 * - Category chip
 * - PYQ title + premium feature icon rows (description, timer, analytics, trophy)
 * - Glass-morphism icon containers with soft inner glow
 * - Feature pills: Timed Test, Analytics, Previous Papers
 * - Price with discount strikethrough
 * - Two CTA buttons: Preview + Start Practice
 * - Subtle educational background decorations
 *
 * @module components/home/PyqPracticeCard
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Platform,
} from 'react-native';

import Icon from './Icons';
import type { PyqItem, PyqFeature } from './types';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Background image for the PYQ card (full-bleed). */
const CARD_BACKGROUND = require('../../../assets/pyq.png');

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PyqPracticeCardProps extends PyqItem {
  /** Callback when Preview is pressed. */
  onPreviewPress?: () => void;
  /** Callback when Start Practice is pressed. */
  onStartPracticePress?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format price with Indian number formatting. */
function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Subtle educational background decorations. */
const BackgroundDecorations = React.memo(function BackgroundDecorations(): React.JSX.Element {
  return (
    <View style={styles.decorationsContainer} pointerEvents="none">
      {/* Question mark — top right */}
      <Text style={[styles.decoText, { top: '8%', right: '12%', fontSize: 28 }]}>?</Text>
      {/* Question mark — bottom right */}
      <Text style={[styles.decoText, { bottom: '25%', right: '8%', fontSize: 18 }]}>?</Text>
      {/* Circular ring — middle right */}
      <View style={[styles.decoCircle, { top: '30%', right: '18%', width: 50, height: 50 }]} />
      {/* Circular ring — bottom */}
      <View style={[styles.decoCircle, { bottom: '15%', right: '25%', width: 30, height: 30 }]} />
      {/* Stopwatch outline — top area */}
      <Text style={[styles.decoText, { top: '40%', right: '8%', fontSize: 16 }]}>⏱</Text>
      {/* Analytics graph — middle area */}
      <Text style={[styles.decoText, { top: '55%', right: '22%', fontSize: 14 }]}>📊</Text>
    </View>
  );
});

// ─── Premium Feature Row ───────────────────────────────────────────────────

interface PremiumFeatureRowProps {
  feature: PyqFeature;
}

const PremiumFeatureRow = React.memo(function PremiumFeatureRow({
  feature,
}: PremiumFeatureRowProps): React.JSX.Element {
  return (
    <View style={styles.featureRow}>
      {/* Rounded-square icon container with dark green glass background */}
      <View style={styles.featureIconContainer}>
        <View style={styles.featureIconGlow} />
        <Icon
          name={feature.icon as any}
          color="rgba(255,255,255,0.95)"
          width={18}
          height={18}
        />
      </View>
      {/* Feature text */}
      <Text style={styles.featureText}>{feature.text}</Text>
    </View>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

const PyqPracticeCard = React.memo(function PyqPracticeCard({
  title,
  category,
  features = [],
  price,
  originalPrice,
  badgeLabel,
  onPreviewPress,
  onStartPracticePress,
  onPress,
}: PyqPracticeCardProps): React.JSX.Element {
  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : 0;

  return (
    <View
      style={styles.shadowWrapper}
      accessibilityRole="summary"
      accessibilityLabel={`PYQ practice: ${title}`}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.95}
        style={styles.touchable}
      >
        <ImageBackground
          source={CARD_BACKGROUND}
          resizeMode="cover"
          style={styles.card}
        >
          {/* Background decorations */}
          <BackgroundDecorations />

          {/* Content (on top of gradient) */}
          <View style={styles.content}>
            {/* Top section */}
            <View style={styles.topSection}>
              {/* Top row: badge only */}
              <View style={styles.topRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeLabel}</Text>
                </View>
                <View style={styles.topSpacer} />
              </View>

              {/* Content row */}
              <View style={styles.contentRow}>
                <View style={styles.textColumn}>
                  {/* Title */}
                  <Text style={styles.title} numberOfLines={2}>
                    <Text style={styles.titleHighlight}>
                      {title.split(' ')[0]}{' '}
                    </Text>
                    <Text style={styles.titleWhite}>
                      {title.split(' ').slice(1).join(' ')}
                    </Text>
                  </Text>

                  {/* Premium feature icon rows */}
                  <View style={styles.featuresList}>
                    {features.map((feature) => (
                      <PremiumFeatureRow
                        key={feature.icon}
                        feature={feature}
                      />
                    ))}
                  </View>
                </View>

                {/* Illustration placeholder */}
                <View style={styles.illustrationPlaceholder}>
                  <Text style={styles.illustrationPlaceholderIcon}>📄</Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Bottom section: price + CTA buttons */}
            <View>
              {/* Price row */}
              <View style={styles.priceRow}>
                <View style={styles.priceLeft}>
                  <Text style={styles.currentPrice}>{formatPrice(price)}</Text>
                  {originalPrice && originalPrice > price && (
                    <Text style={styles.originalPrice}>
                      {formatPrice(originalPrice)}
                    </Text>
                  )}
                  {discountPercent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* CTA buttons */}
              <View style={styles.ctaRow}>
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={onPreviewPress}
                  activeOpacity={0.8}
                  accessibilityLabel="Preview PYQ"
                  accessibilityRole="button"
                >
                  <Icon
                    name="eye"
                    color="rgba(255,255,255,1)"
                    width={16}
                    height={16}
                  />
                  <Text style={styles.previewText}>Preview</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={onStartPracticePress}
                  activeOpacity={0.8}
                  accessibilityLabel="Start Practice"
                  accessibilityRole="button"
                >
                  <Text style={styles.startText}>Start Practice</Text>
                  <Icon
                    name="arrow-right"
                    color="#1E1B4B"
                    width={16}
                    height={16}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shadowWrapper: {
    marginHorizontal: spacing[16],
    marginBottom: spacing[8],
    borderRadius: radius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#155215',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  touchable: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    minHeight: 400,
  },
  decorationsContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  decoText: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.08)',
    fontWeight: '800',
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  content: {
    flex: 1,
    padding: spacing[20],
    justifyContent: 'space-between',
  },
  topSection: {
    flexShrink: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  badgeText: {
    ...typography.caption,
    color: '#FBBF24',
    fontWeight: '700',
    fontSize: 10,
  },
  topSpacer: {
    width: 32,
    height: 32,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[12],
  },
  textColumn: {
    width: '65%',
  },
  illustrationPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[12],
  },
  illustrationPlaceholderIcon: {
    fontSize: 40,
    opacity: 0.25,
  },
  titleHighlight: {
    color: '#75D453',
    fontWeight: '800',
  },
  titleWhite: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  title: {
    ...typography.title,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: spacing[8],
  },
  featuresList: {
    gap: spacing[8],
    marginBottom: spacing[12],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(21, 82, 21, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  featureIconGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 11,
    backgroundColor: 'rgba(144, 238, 144, 0.08)',
  },
  featureText: {
    ...typography.bodySmall,
    flex: 1,
    fontSize: 12,
    color: 'rgba(240,255,245,0.95)',
    fontWeight: '500',
    lineHeight: 16,
  },
  divider: {
    alignSelf: 'center',
    width: '87%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  currentPrice: {
    ...typography.title,
    fontSize: 20,
    color: '#75D453',
    fontWeight: '800',
  },
  originalPrice: {
    ...typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: spacing[4],
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  discountText: {
    ...typography.caption,
    color: '#FBBF24',
    fontWeight: '800',
    fontSize: 9,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  previewText: {
    ...typography.buttonSmall,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  startButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
  startText: {
    ...typography.buttonSmall,
    fontSize: 13,
    color: '#155215',
    fontWeight: '800',
  },
});

export default PyqPracticeCard;
