/**
 * BatchCard
 *
 * Premium compact batch card with:
 * - White background, soft shadow, thin border, rounded corners
 * - Subject icon in a coloured rounded square
 * - Badge (Popular / New / Best Seller)
 * - Batch name (2 lines max) + subtitle
 * - Stats row: student count, start date, duration (emoji + text)
 * - Full-width "Explore Batch" CTA button
 *
 * @module components/home/BatchCard
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

import Icon from './Icons';
import type { BatchItem } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BatchCardProps extends BatchItem {
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format student count in compact form (e.g. 12.5k, 28.3k). */
function formatStudentCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace('.0', '')}k`;
  }
  return String(count);
}

// ─── Component ───────────────────────────────────────────────────────────────

const BatchCard = React.memo(function BatchCard({
  name,
  subtitle,
  accentColor,
  badgeLabel,
  studentCount,
  startDate,
  duration,
  iconName,
  onPress,
}: BatchCardProps): React.JSX.Element {
  return (
    <View
      style={styles.shadowWrapper}
      accessibilityRole="summary"
      accessibilityLabel={`Batch: ${name}`}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.touchable}
      >
        <View style={styles.card}>
          {/* Top: Icon + Badge */}
          <View style={styles.topRow}>
            <View style={[styles.iconContainer, { backgroundColor: accentColor + '18' }]}>
              <Icon
                name={iconName as any}
                color={accentColor}
                width={20}
                height={20}
              />
            </View>
            <View style={[styles.badge, { backgroundColor: accentColor + '15' }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>{badgeLabel}</Text>
            </View>
          </View>

          {/* Middle: Name + Subtitle */}
          <Text style={styles.batchName} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.batchSubtitle}>{subtitle}</Text>

          {/* Bottom: Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statEmoji}>👥</Text>
              <Text style={styles.statText}>{formatStudentCount(studentCount)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statEmoji}>📅</Text>
              <Text style={styles.statText}>{startDate}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statEmoji}>⏱</Text>
              <Text style={styles.statText}>{duration}</Text>
            </View>
          </View>

          {/* CTA Button */}
          <View style={styles.ctaButton}>
            <Text style={[styles.ctaText, { color: accentColor }]}>Explore Batch</Text>
            <Icon
              name="arrow-right"
              color={accentColor}
              width={14}
              height={14}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shadowWrapper: {
    marginBottom: spacing[4],
    borderRadius: radius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  touchable: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#F1F3F7',
    paddingHorizontal: spacing[12],
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radius.xxl,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  batchName: {
    ...typography.subtitle,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 17,
    marginTop: spacing[8],
  },
  batchSubtitle: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.secondary,
    lineHeight: 14,
    marginTop: 2,
  },
  statsContainer: {
    gap: spacing[4],
    marginTop: spacing[4],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  statEmoji: {
    fontSize: 11,
    lineHeight: 14,
  },
  statText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    lineHeight: 14,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F1F3F7',
    backgroundColor: '#FAFBFC',
    marginTop: spacing[4],
  },
  ctaText: {
    ...typography.buttonSmall,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default BatchCard;
