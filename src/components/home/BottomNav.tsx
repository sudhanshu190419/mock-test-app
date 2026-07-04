/**
 * BottomNav
 *
 * Bottom navigation bar with five tabs:
 * Home, Courses, Mock Tests, Live Classes, Profile
 *
 * Home is highlighted as the active (current) tab.
 *
 * NOTE: This is a visual-only component that reflects the home
 * screen design. The actual navigation wiring should be replaced
 * with React Navigation's bottom tab navigator when the app
 * grows beyond a single screen.
 *
 * @module components/home/BottomNav
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import Icon from './Icons';
import type { IconName } from './Icons';
import type { BottomNavTab } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { sizes } from '../../theme/sizes';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Tab definitions — single source of truth. */
const TABS: BottomNavTab[] = [
  { key: 'home', iconName: 'home', label: 'Home', isActive: true },
  { key: 'courses', iconName: 'book-open', label: 'Courses', isActive: false },
  { key: 'mock-tests', iconName: 'clipboard-list', label: 'Mock Tests', isActive: false },
  { key: 'live-classes', iconName: 'play-circle', label: 'Live Classes', isActive: false },
  { key: 'profile', iconName: 'user', label: 'Profile', isActive: false },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BottomNavProps {
  /** Callback when a tab is pressed. Receives the tab key. */
  onTabPress?: (tabKey: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const BottomNav = React.memo(function BottomNav({
  onTabPress,
}: BottomNavProps): React.JSX.Element {
  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel="Bottom navigation"
    >
      {TABS.map((tab) => (
        <NavTab
          key={tab.key}
          tab={tab}
          onPress={onTabPress}
        />
      ))}
    </View>
  );
});

// ─── NavTab (internal) ───────────────────────────────────────────────────────

interface NavTabProps {
  tab: BottomNavTab;
  onPress?: (tabKey: string) => void;
}

const NavTab = React.memo(function NavTab({
  tab,
  onPress,
}: NavTabProps): React.JSX.Element {
  const { key, iconName, label, isActive } = tab;
  const color = isActive ? colors.secondary : colors.text.secondary;

  const handlePress = useCallback(() => {
    onPress?.(key);
  }, [key, onPress]);

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`${label} tab${isActive ? ', active' : ''}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      hitSlop={sizes.hitSlop}
    >
      <Icon
        name={iconName as IconName}
        color={color}
        width={22}
        height={22}
      />
      <Text style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[12],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[4],
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500' as const,
  },
  activeLabel: {
    color: colors.secondary,
    fontWeight: '600' as const,
  },
});

export default BottomNav;
