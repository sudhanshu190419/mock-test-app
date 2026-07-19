/**
 * QuickStatsCards
 *
 * A premium glassmorphic 4-column grid of compact stat cards with subtle gradients,
 * glowing icons, and smooth entrance animations.
 *
 * @module components/dashboard/QuickStatsCards
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import Icon from '../home/Icons';
import type { IconName } from '../home/Icons';
import { coursesLightM3 } from '../../theme/colors';
import { typographyV5 } from '../../theme/typography';
import AnimatedPressable from '../AnimatedPressable';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuickStatItem {
  key: string;
  iconName: IconName;
  label: string;
  value: string;
  gradientStart: string;
  gradientEnd: string;
}

export interface QuickStatsCardsProps {
  items: QuickStatItem[];
}

// ─── Single Stat Card (Animated & Glassmorphic) ──────────────────────────────

const StatCard = React.memo(function StatCard({
  item,
  index,
}: {
  item: QuickStatItem;
  index: number;
}): React.JSX.Element {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 200 })
    );
    translateY.value = withDelay(
      index * 100,
      withTiming(0, { duration: 200 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <AnimatedPressable style={styles.cardPressable}>
        <LinearGradient
          colors={['#FFFFFF', 'rgba(255,255,255,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Subtle inner glass border */}
          <View style={styles.innerBorder} pointerEvents="none" />

          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[item.gradientStart, item.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <Icon name={item.iconName} color="#FFFFFF" width={22} height={22} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {item.label}
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {item.value}
          </Text>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
});

// ─── Grid Component ──────────────────────────────────────────────────────────

const QuickStatsCards = React.memo(function QuickStatsCards({
  items,
}: QuickStatsCardsProps): React.JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <StatCard key={item.key} item={item} index={index} />
      ))}
    </View>
  );
});

export default QuickStatsCards;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  cardWrapper: {
    width: '48%',
  },
  cardPressable: {
    flex: 1,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 0,
      },
    }),
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: 135,
    position: 'relative',
  },
  innerBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  innerBorderGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#05C46B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  gradientBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    opacity: 0.8,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  label: {
    ...typographyV5.metadataSmall,
    height: 32,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...typographyV5.cardTitleHero,
    fontSize: 20,
    height: 28,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
