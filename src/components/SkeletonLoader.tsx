/**
 * SkeletonLoader
 *
 * Premium shimmer skeleton loaders for cards, lists, and profiles.
 * Replaces standard ActivityIndicator spinners with a graceful
 * shimmer effect that communicates progress without distraction.
 *
 * @module components/SkeletonLoader
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  type ViewStyle,
  type DimensionValue,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing, interpolateColor } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';

// ─── Constants ───────────────────────────────────────────────────────────────

const SHIMMER_LIGHT = '#E8ECF0';
const SHIMMER_DARK = '#D1D5DB';
const SHIMMER_DURATION = 1500;

// ─── Animated Shimmer Block ──────────────────────────────────────────────────

interface ShimmerBlockProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const ShimmerBlock = React.memo(function ShimmerBlock({
  width = '100%',
  height = 16,
  borderRadius: blockRadius = 4,
  style,
}: ShimmerBlockProps): React.JSX.Element {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {
        duration: SHIMMER_DURATION,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: blockRadius,
          backgroundColor: SHIMMER_LIGHT,
        },
        animatedStyle,
        style,
      ]}
    />
  );
});

// ─── Variants ────────────────────────────────────────────────────────────────

/** Card skeleton — mimics a full course card with banner + details. */
export const CardSkeleton = React.memo(function CardSkeleton(): React.JSX.Element {
  return (
    <View style={cardSkeletonStyles.container}>
      {/* Banner area */}
      <ShimmerBlock height={160} borderRadius={radius.lg} />
      {/* Details area */}
      <View style={cardSkeletonStyles.details}>
        <ShimmerBlock width="60%" height={18} />
        <View style={{ height: 8 }} />
        <ShimmerBlock width="40%" height={14} />
        <View style={{ height: 12 }} />
        <ShimmerBlock width="100%" height={12} />
        <View style={{ height: 4 }} />
        <ShimmerBlock width="90%" height={12} />
        <View style={{ height: 16 }} />
        {/* Stats row */}
        <View style={cardSkeletonStyles.statsRow}>
          <ShimmerBlock width="30%" height={12} />
          <ShimmerBlock width="30%" height={12} />
        </View>
        <View style={{ height: 16 }} />
        {/* Price + CTA */}
        <View style={cardSkeletonStyles.bottomRow}>
          <ShimmerBlock width="35%" height={20} />
          <ShimmerBlock width="30%" height={36} borderRadius={8} />
        </View>
      </View>
    </View>
  );
});

const cardSkeletonStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing[16],
    marginBottom: spacing[20],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  details: {
    padding: spacing[16],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[16],
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

/** List item skeleton — for simple list rows. */
export const ListItemSkeleton = React.memo(function ListItemSkeleton(): React.JSX.Element {
  return (
    <View style={listSkeletonStyles.container}>
      <ShimmerBlock width={40} height={40} borderRadius={20} />
      <View style={listSkeletonStyles.textBlock}>
        <ShimmerBlock width="70%" height={14} />
        <View style={{ height: 6 }} />
        <ShimmerBlock width="45%" height={12} />
      </View>
      <ShimmerBlock width={24} height={24} borderRadius={12} />
    </View>
  );
});

const listSkeletonStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    gap: spacing[12],
  },
  textBlock: {
    flex: 1,
  },
});

/** Profile skeleton — for profile screen loading state. */
export const ProfileSkeleton = React.memo(function ProfileSkeleton(): React.JSX.Element {
  return (
    <View style={profileSkeletonStyles.container}>
      {/* Avatar */}
      <ShimmerBlock width={96} height={96} borderRadius={48} />
      <View style={{ height: spacing[16] }} />
      {/* Name */}
      <ShimmerBlock width="45%" height={24} />
      <View style={{ height: spacing[8] }} />
      {/* Role */}
      <ShimmerBlock width="30%" height={16} />
      <View style={{ height: spacing[24] }} />
      {/* Stats widget */}
      <View style={profileSkeletonStyles.statsRow}>
        <ShimmerBlock width={80} height={48} borderRadius={12} />
        <ShimmerBlock width={80} height={48} borderRadius={12} />
        <ShimmerBlock width={80} height={48} borderRadius={12} />
      </View>
      <View style={{ height: spacing[20] }} />
      {/* Subscription card */}
      <ShimmerBlock width="100%" height={72} borderRadius={16} />
      <View style={{ height: spacing[24] }} />
      {/* Progress bars */}
      <ShimmerBlock width="40%" height={16} />
      <View style={{ height: 16 }} />        
        <ShimmerBlock width="100%" height={4} />
        <View style={{ height: 16 }} />
        <ShimmerBlock width="100%" height={4} />
        <View style={{ height: 16 }} />
        <ShimmerBlock width="100%" height={4} />
    </View>
  );
});

const profileSkeletonStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingTop: spacing[24],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
});

/** MockTests skeleton — for exam list loading. */
export const MockTestsSkeleton = React.memo(function MockTestsSkeleton(): React.JSX.Element {
  return (
    <View style={mockTestSkeletonStyles.container}>
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={mockTestSkeletonStyles.card}>
          <View style={mockTestSkeletonStyles.topRow}>
            <ShimmerBlock width={48} height={48} borderRadius={12} />
            <View style={mockTestSkeletonStyles.titleBlock}>
              <ShimmerBlock width="60%" height={18} />
              <View style={{ height: spacing[4] }} />
              <ShimmerBlock width="40%" height={14} />
            </View>
          </View>
          <View style={{ height: spacing[16] }} />
          <View style={mockTestSkeletonStyles.statsRow}>
            <ShimmerBlock width="30%" height={32} borderRadius={8} />
            <ShimmerBlock width="30%" height={32} borderRadius={8} />
            <ShimmerBlock width="30%" height={32} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );
});

const mockTestSkeletonStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[20],
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing[16],
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
});

export default ShimmerBlock;
