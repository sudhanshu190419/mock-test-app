/**
 * MainTabNavigator
 *
 * Bottom tab navigator with instant tab switching:
 * - Tabs mount lazily (lazy: true) — only the active tab screen mounts
 * - Freeze inactive screens to preserve their state without JS thread overhead
 * - Active icon gets a highlighted background
 * - Focused label uses bold weight for clear visual state
 * - Optimised for instant response — no tab-icon animations
 *
 * @module navigation/MainTabNavigator
 */

import React from 'react';
import {
  Text,
  StyleSheet,
  Platform,
  View,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { TabScrollProvider, useTabScrollContext } from '../context/TabScrollContext';

import HomeScreen from '../screens/home/HomeScreen';
import CoursesScreen from '../screens/courses/CoursesScreen';
import MockTestsTabScreen from '../screens/tabs/MockTestsTabScreen';
import LiveClassesTabScreen from '../screens/tabs/LiveClassesTabScreen';
import ProfileTabScreen from '../screens/tabs/ProfileTabScreen';
import Icon from '../components/home/Icons';
import type { IconName } from '../components/home/Icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

// ─── Tab param list ─────────────────────────────────────────────────────────

export type MainTabParamList = {
  Home: undefined;
  Courses: undefined;
  MockTests: undefined;
  LiveClasses: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab configuration ──────────────────────────────────────────────────────

interface TabConfig {
  label: string;
  icon: IconName;
}

const TAB_CONFIG: Record<keyof MainTabParamList, TabConfig> = {
  Home: { label: 'Home', icon: 'home' },
  Courses: { label: 'Courses', icon: 'book-open' },
  MockTests: { label: 'Practice', icon: 'clipboard-list' },
  LiveClasses: { label: 'Live', icon: 'video' },
  Profile: { label: 'Profile', icon: 'user' },
};

// ─── Tab Icon ──────────────────────────────────────────────────────────────

function TabIcon({
  routeName,
  focused,
  color,
  size,
}: {
  routeName: keyof MainTabParamList;
  focused: boolean;
  color: string;
  size: number;
}): React.JSX.Element {
  const config = TAB_CONFIG[routeName];
  return (
    <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
      <Icon name={config.icon} color={color} width={size} height={size} />
    </View>
  );
}

// ─── Tab Label ─────────────────────────────────────────────────────────────

function TabLabel({
  routeName,
  focused,
  color,
}: {
  routeName: keyof MainTabParamList;
  focused: boolean;
  color: string;
}): React.JSX.Element {
  const config = TAB_CONFIG[routeName];
  return (
    <Text style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '500' }]}>
      {config.label}
    </Text>
  );
}

// ─── Animated Tab Bar ────────────────────────────────────────────────────────
function AnimatedTabBar(props: BottomTabBarProps) {
  const context = useTabScrollContext();
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: context?.tabBarTranslateY?.value ?? 0 }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

// ─── Navigator ──────────────────────────────────────────────────────────────

export default function MainTabNavigator(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <TabScrollProvider>
      <Tab.Navigator
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenOptions={({ route }) => ({
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              routeName={route.name as keyof MainTabParamList}
              focused={focused}
              color={color}
              size={size}
            />
          ),
          tabBarLabel: ({ focused, color }) => (
            <TabLabel
              routeName={route.name as keyof MainTabParamList}
              focused={focused}
              color={color}
            />
          ),
          tabBarActiveTintColor: '#0284C7',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabBarItem,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Courses" component={CoursesScreen} />
        <Tab.Screen name="MockTests" component={MockTestsTabScreen} />
        <Tab.Screen name="LiveClasses" component={LiveClassesTabScreen} />
        <Tab.Screen name="Profile" component={ProfileTabScreen} />
      </Tab.Navigator>
    </TabScrollProvider>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    paddingTop: spacing[12],
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[4],
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBarItem: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  iconContainer: {
    padding: spacing[4],
  },
  activeIconContainer: {
    backgroundColor: colors.sky.tint,
    borderRadius: 16,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    marginTop: 2,
  },
});
