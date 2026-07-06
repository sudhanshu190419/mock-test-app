/**
 * NotificationHeader
 *
 * Top section of the notification screen with:
 * - Large title "Notifications"
 * - Subtitle "Stay updated with your learning journey"
 * - Right-side "Mark all as read" button with unread badge
 * - No entrance animation — renders instantly
 *
 * @module components/notification/NotificationHeader
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '../home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

// ═════════════════════════════════════════════════════════════════
//  Props
// ═════════════════════════════════════════════════════════════════

export interface NotificationHeaderProps {
  /** Total unread count displayed as a badge on the mark-all button. */
  unreadCount: number;
  /** Callback when the "Mark all as read" button is pressed. */
  onMarkAllRead: () => void;
  /** Callback when the back button is pressed. */
  onBackPress?: () => void;
}

// ═════════════════════════════════════════════════════════════════
//  Component
// ═════════════════════════════════════════════════════════════════

const NotificationHeader = React.memo(function NotificationHeader({
  unreadCount,
  onMarkAllRead,
  onBackPress,
}: NotificationHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing[12] }]}>
      {/* Back button row */}
      {onBackPress && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" color={colors.text.primary} width={22} height={22} />
        </TouchableOpacity>
      )}

      {/* Title area */}
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>Stay updated with your learning journey</Text>

      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={onMarkAllRead}
            activeOpacity={0.7}
            accessibilityLabel="Mark all notifications as read"
            accessibilityRole="button"
          >
            <Icon name="badge-check" color={colors.secondary} width={16} height={16} />
            <Text style={styles.markAllText}>Mark all as read</Text>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[16],
    backgroundColor: colors.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[12],
    ...shadows.small,
  },
  title: {
    ...typography.heading2,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  buttonWrapper: {
    marginTop: spacing[16],
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[8],
    backgroundColor: colors.tint.blue,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: 20,
  },
  markAllText: {
    ...typography.labelSmall,
    color: colors.secondary,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 10,
  },
});

export default NotificationHeader;
