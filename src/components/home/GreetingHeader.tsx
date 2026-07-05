/**
 * GreetingHeader
 *
 * Top section of the home screen showing:
 * - Greeting ("Good Morning! 👋")
 * - Welcome title ("Welcome to MockPrep")
 * - Motivational subtitle
 * - Notification bell icon with badge
 * - Profile avatar
 *
 * @module components/home/GreetingHeader
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import Icon from './Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { sizes } from '../../theme/sizes';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface GreetingHeaderProps {
  /** User's display name (e.g. "Sudhanshu"). */
  userName?: string;
  /** Callback when the notification bell is pressed. */
  onNotificationPress?: () => void;
  /** Callback when the profile avatar is pressed. */
  onProfilePress?: () => void;
  /** Whether to show the notification dot indicator. */
  hasUnreadNotifications?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const GreetingHeader = React.memo(function GreetingHeader({
  userName = 'Sudhanshu',
  onNotificationPress,
  onProfilePress,
  hasUnreadNotifications = false,
}: GreetingHeaderProps): React.JSX.Element {
  return (
    <View style={[styles.container, { paddingTop: spacing[12] }]}>
      {/* Left: Greeting text */}
      <View style={styles.textSection}>
        <View style={styles.greetingRow}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Good Morning!</Text>
        </View>
        <Text style={styles.title}>{userName}!</Text>
        <Text style={styles.subtitle}>
          Keep learning, keep growing! 
        </Text>
      </View>

      {/* Right: Notification + Avatar */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          hitSlop={sizes.hitSlop}
        >
          <Icon name="bell" color={colors.text.primary} width={24} height={24} />
          {hasUnreadNotifications && <View style={styles.badgeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatar}
          onPress={onProfilePress}
          activeOpacity={0.8}
          accessibilityLabel="Profile"
          accessibilityRole="button"
        >
          <Icon name="user" color={colors.text.inverse} width={20} height={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[12],
  },
  textSection: {
    flex: 1,
    marginRight: spacing[12],
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[4],
  },
  emoji: {
    fontSize: 20,
  },
  greeting: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingTop: spacing[4],
  },
  iconButton: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
});

export default GreetingHeader;
