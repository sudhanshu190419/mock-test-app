import React, { useCallback } from 'react';
import Svg, { Path } from 'react-native-svg';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon, { type IconName } from '../home/Icons';

export interface CategoryGroup {
  key: string;
  label: string;
  icon: IconName;
  filterValue: string | null; // NEET, JEE, School, CLAT, CUET, or null for All
  color: string;
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { key: 'all', label: 'All', icon: 'book-open', filterValue: null, color: coursesDark.categories.all.accent },
  { key: 'school', label: 'School', icon: 'school', filterValue: 'School', color: coursesDark.categories.school.accent },
  { key: 'engineering', label: 'Engineering', icon: 'atom', filterValue: 'JEE', color: coursesDark.categories.engineering.accent },
  { key: 'medical', label: 'Medical', icon: 'stethoscope', filterValue: 'NEET', color: coursesDark.categories.medical.accent },
  { key: 'law', label: 'Law', icon: 'shield-check', filterValue: 'CLAT', color: coursesDark.categories.law.accent },
  { key: 'cuet', label: 'CUET', icon: 'clipboard-list', filterValue: 'CUET', color: coursesDark.categories.cuet.accent },
];

interface CategoryChipProps {
  item: CategoryGroup;
  isActive: boolean;
  onPress: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const CategoryChip = React.memo(({ item, isActive, onPress }: CategoryChipProps) => {
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

  const catKey = item.key as keyof typeof coursesDark.categories;
  const itemColor = coursesDark.categories[catKey]?.accent || coursesDark.categories.all.accent;

  return (
    <AnimatedTouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.chip,
        isActive ? { backgroundColor: itemColor, borderColor: itemColor } : styles.chipInactive,
        animatedStyle,
      ]}
    >
      <Icon
        name={item.icon}
        color={isActive ? '#FFFFFF' : coursesDark.textMutedOnDark}
        width={14}
        height={14}
      />
      <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
        {item.label}
      </Text>
    </AnimatedTouchableOpacity>
  );
});

interface CategoryChipStripProps {
  activeCategory: string | null;
  onCategorySelect: (category: string | null) => void;
}

export default function CategoryChipStrip({
  activeCategory,
  onCategorySelect,
}: CategoryChipStripProps): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      style={styles.scrollView}
    >
      {CATEGORY_GROUPS.map((item) => (
        <CategoryChip
          key={item.key}
          item={item}
          isActive={activeCategory === item.filterValue}
          onPress={() => onCategorySelect(item.filterValue)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginVertical: spacing[8],
  },
  scrollContainer: {
    paddingHorizontal: spacing[16],
    gap: spacing[8],
    alignItems: 'center',
    height: 48,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
    borderWidth: 1.5,
    gap: spacing[8],
  },
  chipInactive: {
    backgroundColor: coursesDark.surfaceElevated,
    borderColor: coursesDark.dividerOnDark,
  },
  chipText: {
    ...typography.chipLabel,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTextInactive: {
    color: coursesDark.textMutedOnDark,
    fontWeight: '600',
  },
});
