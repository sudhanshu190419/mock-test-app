/**
 * NotificationCard
 *
 * Premium notification card with:
 * - Type-specific icon with colour-coded background
 * - Title, description, relative timestamp
 * - Unread indicator (coloured dot on the left)
 * - Optional thumbnail image
 * - Chevron on the right
 * - Zero latency — no entrance animation (instant render)
 * - Press scale feedback via Reanimated (UI thread)
 *
 * @module components/notification/NotificationCard
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import Icon from '../home/Icons';
import type { IconName } from '../home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { getNotificationTypeConfig } from '../../constants/notificationIcons';
import type { Notification } from '../../types/notification';

// ═════════════════════════════════════════════════════════════════
//  Props
// ═════════════════════════════════════════════════════════════════

export interface NotificationCardProps {
  notification: Notification;
  /** Callback when the card is pressed/tapped. */
  onPress: (notification: Notification) => void;
}

// ═════════════════════════════════════════════════════════════════
//  Time Format Helper
// ═════════════════════════════════════════════════════════════════

function formatRelativeTime(createdAt: string): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

// ═════════════════════════════════════════════════════════════════
//  Component
// ═════════════════════════════════════════════════════════════════

const NotificationCard = React.memo(function NotificationCard({
  notification,
  onPress,
}: NotificationCardProps): React.JSX.Element {
  const { id, title, description, type, isRead, createdAt, image, priority } = notification;

  // ── Press scale (UI thread, no jank) ─────────────────────────
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, {
      damping: 20,
      mass: 0.25,
      stiffness: 300,
      overshootClamping: true,
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 20,
      mass: 0.25,
      stiffness: 300,
      overshootClamping: true,
    });
  }, [scale]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    onPress(notification);
  }, [onPress, notification]);

  const typeConfig = getNotificationTypeConfig(type);
  const relativeTime = formatRelativeTime(createdAt);
  const isHighPriority = priority === 'high' || priority === 'urgent';

  return (
    <Animated.View style={[styles.shadowWrapper, animatedCardStyle]}>
      <TouchableOpacity
        style={[styles.card, !isRead && styles.unreadCard]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.96}
        accessibilityRole="button"
        accessibilityLabel={`${isRead ? '' : 'Unread '}Notification: ${title}`}
        accessibilityState={{ selected: !isRead }}
      >
        {/* Unread indicator dot */}
        {!isRead && (
          <View style={[styles.unreadDot, { backgroundColor: typeConfig.color }]} />
        )}

        {/* Type icon */}
        <View style={[styles.iconContainer, { backgroundColor: typeConfig.bg }]}>
          <Icon name={typeConfig.icon as IconName} color={typeConfig.color} width={20} height={20} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !isRead && styles.unreadTitle]} numberOfLines={1}>
              {title}
            </Text>
            {isHighPriority && !isRead && <View style={styles.priorityDot} />}
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
          <Text style={styles.time}>{relativeTime}</Text>
        </View>

        {/* Optional thumbnail */}
        {image && (
          <View style={styles.thumbnail}>
            <View style={styles.thumbnailPlaceholder}>
              <Icon name="bookmark" color={colors.text.secondary} width={16} height={16} />
            </View>
          </View>
        )}

        {/* Chevron */}
        <Icon name="chevron-right" color={colors.text.secondary} width={16} height={16} />
      </TouchableOpacity>
    </Animated.View>
  );
});

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  shadowWrapper: {
    marginHorizontal: spacing[16],
    marginBottom: spacing[12],
    borderRadius: radius.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    gap: spacing[12],
    ...shadows.small,
    ...Platform.select({
      ios: { shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  unreadCard: {
    backgroundColor: '#F8FAFF',
    ...Platform.select({
      ios: { shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -3,
    zIndex: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  title: {
    ...typography.subtitle,
    fontSize: 14,
    color: colors.text.primary,
    flexShrink: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  description: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
  time: {
    ...typography.caption,
    color: colors.disabled,
    marginTop: 4,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotificationCard;
