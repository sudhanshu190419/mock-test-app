/**
 * BottomNav
 *
 * Bottom navigation bar with five tabs:
 * Home, Courses, Mock Tests, Live Classes, Profile
 *
 * Home is highlighted as the active (current) tab by default unless configured.
 * Wired to navigate across Courses, MockTests, Profile, Home, and LiveClasses.
 *
 * @module components/home/BottomNav
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Icon from './Icons';
import type { IconName } from './Icons';
import type { BottomNavTab } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { sizes } from '../../theme/sizes';
import { shadows } from '../../theme/shadows';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Constants ───────────────────────────────────────────────────────────────

/** Tab definitions — single source of truth. */
const TABS: BottomNavTab[] = [
  { key: 'home', iconName: 'home', label: 'Home', isActive: true },
  { key: 'courses', iconName: 'book-open', label: 'Courses', isActive: false },
  { key: 'mock-tests', iconName: 'clipboard-list', label: 'Mock Tests', isActive: false },
  { key: 'live-classes', iconName: 'play-circle', label: 'Live Classes', isActive: false },
  { key: 'profile', iconName: 'user', label: 'Profile', isActive: false },
];

const ROUTE_MAP: Record<string, string> = {
  'home': 'Home',
  'courses': 'Courses',
  'mock-tests': 'MockTests',
  'live-classes': 'LiveClasses',
  'profile': 'Profile',
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BottomNavProps {
  /** Callback when a tab is pressed. Receives the tab key. */
  onTabPress?: (tabKey: string) => void;
  /** Optional active tab key override. */
  activeTab?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const BottomNav = React.memo(function BottomNav({
  onTabPress,
  activeTab = 'home',
}: BottomNavProps): React.JSX.Element {
  const navigation = useNavigation<any>();

  const handleTabPress = useCallback((tabKey: string) => {
    onTabPress?.(tabKey);
    const routeName = ROUTE_MAP[tabKey];
    if (routeName && navigation) {
      try {
        // Try navigating within tab or parent stack
        navigation.navigate(routeName);
      } catch (e) {
        console.warn('[BottomNav] Navigation error:', e);
      }
    }
  }, [onTabPress, navigation]);

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel="Bottom navigation"
    >
      {TABS.map((tab) => (
        <NavTab
          key={tab.key}
          tab={{ ...tab, isActive: tab.key === activeTab }}
          onPress={handleTabPress}
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
  const mintDark = (colors as any).mint?.dark || '#052224';
  const mintPrimary = (colors as any).mint?.primary || colors.secondary;
  const color = isActive ? mintPrimary : colors.text.secondary;

  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.85, { duration: 200 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 200 });
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress?.(key);
  }, [key, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[styles.tab, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityLabel={`${label} tab${isActive ? ', active' : ''}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      hitSlop={sizes.hitSlop}
    >
      {isActive && (
        <Animated.View
          sharedTransitionTag="activeNavIndicator"
          style={[StyleSheet.absoluteFill, styles.activeTabContainer]}
        />
      )}
      <Icon
        name={iconName as IconName}
        color={color}
        width={22}
        height={22}
      />
      <Text style={[styles.label, isActive && { color: mintDark, fontWeight: '700' }]}>
        {label}
      </Text>
    </AnimatedTouchableOpacity>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: spacing[16],
    marginBottom: spacing[24],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
    backgroundColor: '#FFFFFF',
    borderRadius: 32, // floating pill
    ...shadows.medium,
    shadowColor: '#0284C7',
    shadowOpacity: 0.12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[4],
    minWidth: 54,
    minHeight: 46,
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: 16,
    overflow: 'hidden',
  },
  activeTabContainer: {
    backgroundColor: 'rgba(0, 208, 158, 0.12)',
    borderRadius: 16,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500' as const,
  },
});

export default BottomNav;
