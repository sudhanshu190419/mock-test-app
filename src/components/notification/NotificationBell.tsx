/**
 * NotificationBell
 *
 * Reusable notification bell icon with:
 * - Animated unread count badge
 * - Pulse animation when unread > 0
 * - Composable for use in headers, nav bars, etc.
 *
 * @module components/notification/NotificationBell
 */

import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';

import Icon from '../home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

// ═════════════════════════════════════════════════════════════════
//  Props
// ═════════════════════════════════════════════════════════════════

export interface NotificationBellProps {
  /** Number of unread notifications. */
  unreadCount: number;
  /** Callback when the bell is pressed. */
  onPress: () => void;
  /** Icon colour. Defaults to text primary. */
  color?: string;
  /** Icon size. Defaults to 24. */
  size?: number;
}

// ═════════════════════════════════════════════════════════════════
//  Component
// ═════════════════════════════════════════════════════════════════

const NotificationBell = React.memo(function NotificationBell({
  unreadCount,
  onPress,
  color = colors.text.primary,
  size = 24,
}: NotificationBellProps): React.JSX.Element {
  const hasUnread = unreadCount > 0;

  // Pulse animation for the bell when there are unread notifications
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (hasUnread) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withTiming(1, {
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = 1;
    }

    return () => {
      cancelAnimation(pulseScale);
    };
  }, [pulseScale, hasUnread]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Notifications${hasUnread ? `, ${unreadCount} unread` : ''}`}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={animatedStyle}>
        <Icon name="bell" color={color} width={size} height={size} />
      </Animated.View>

      {/* Badge */}
      {hasUnread && (
        <Animated.View style={[styles.badge]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
});

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  badgeText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 10,
  },
});

export default NotificationBell;
