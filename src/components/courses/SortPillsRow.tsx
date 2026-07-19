import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

export type SortOptionValue = 'popular' | 'price_asc' | 'price_desc' | 'newest' | 'duration';

export interface SortOption {
  key: SortOptionValue;
  label: string;
  icon?: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'popular', label: 'Popular' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'newest', label: 'Newest' },
  { key: 'duration', label: 'Duration' },
];

interface SortPillProps {
  option: SortOption;
  isActive: boolean;
  onPress: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const SortPill = React.memo(({ option, isActive, onPress }: SortPillProps) => {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.92, { duration: 200 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 200 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedTouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.pill, isActive && styles.pillActive, animatedStyle]}
    >
      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
        {option.label}
      </Text>
      {isActive && <View style={styles.dot} />}
    </AnimatedTouchableOpacity>
  );
});

interface SortPillsRowProps {
  activeSort: SortOptionValue;
  onSortSelect: (sortOption: SortOptionValue) => void;
}

export default function SortPillsRow({
  activeSort,
  onSortSelect,
}: SortPillsRowProps): React.JSX.Element {
  return (
    <View style={styles.outerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {SORT_OPTIONS.map((option) => (
          <SortPill
            key={option.key}
            option={option}
            isActive={activeSort === option.key}
            onPress={() => onSortSelect(option.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: coursesDark.dividerOnDark,
    backgroundColor: coursesDark.base,
  },
  scrollView: {
    marginVertical: spacing[4],
  },
  scrollContainer: {
    paddingHorizontal: spacing[16],
    gap: spacing[16],
    alignItems: 'center',
    height: 38,
  },
  pill: {
    position: 'relative',
    paddingVertical: spacing[8],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  pillActive: {},
  pillText: {
    ...typography.caption,
    fontSize: 12,
    color: coursesDark.textMutedOnDark,
    fontWeight: '600',
  },
  pillTextActive: {
    color: coursesDark.textOnDark,
    fontWeight: '800',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: coursesDark.accentPrimary,
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -2,
  },
});
