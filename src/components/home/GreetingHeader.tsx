/**
 * GreetingHeader
 *
 * Top section of the home screen showing:
 * - Greeting ("Good Morning! 👋") — calculated on the client from device time
 * - Welcome title ("Welcome to MockPrep")
 * - Motivational subtitle
 * - Notification bell icon with badge
 * - Profile avatar (real image or fallback icon)
 *
 * ─── Greeting Rules (calculated client-side) ────────────────────────────────
 *
 *   05:00–11:59  →  Good Morning
 *   12:00–16:59  →  Good Afternoon
 *   17:00–20:59  →  Good Evening
 *   21:00–04:59  →  Good Evening
 *
 * @module components/home/GreetingHeader
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';

import Icon from './Icons';
import NotificationBell from '../notification/NotificationBell';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { sizes } from '../../theme/sizes';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface GreetingHeaderProps {
  /** User's display name (e.g. "Sudhanshu"). */
  userName?: string;
  /** Optional avatar URL for the profile image. Falls back to icon when null. */
  avatarUrl?: string | null;
  /** Callback when the notification bell is pressed. */
  onNotificationPress?: () => void;
  /** Callback when the profile avatar is pressed. */
  onProfilePress?: () => void;
  /** Whether to show the notification dot indicator. */
  hasUnreadNotifications?: boolean;
  /** Number of unread notifications (for badge count). */
  unreadCount?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate a time-appropriate greeting based on the device's current hour.
 *
 * Rules:
 *   Morning   05:00–11:59   Good Morning
 *   Afternoon 12:00–16:59   Good Afternoon
 *   Evening   17:00–20:59   Good Evening
 *   Night     21:00–04:59   Good Evening
 */
function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good Morning!';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon!';
  }
  // 17:00–04:59 → Good Evening
  return 'Good Evening!';
}

// ─── Component ───────────────────────────────────────────────────────────────

const GreetingHeader = React.memo(function GreetingHeader({
  userName = 'Learner',
  onNotificationPress,
  hasUnreadNotifications = false,
  unreadCount = 0,
}: GreetingHeaderProps): React.JSX.Element {
  const greeting = useMemo(() => getGreeting(), []);
  const skyDark = colors.sky?.dark || '#0F172A';
  const skyTint = colors.sky?.tint || '#E0F2FE';
  const textSlateSub = '#475569';
  
  const dateString = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: spacing[8] }]}>
      {/* Left: Greeting text */}
      <View style={styles.textSection}>
        <View style={styles.dateBadge}>
          <Icon name="calendar" color="#0284C7" width={12} height={12} />
          <Text style={styles.dateText}>{dateString}</Text>
        </View>

        <Text style={[styles.title, { color: skyDark }]}>
          {greeting.replace('!', '')}, {userName} <Text style={styles.emoji}>👋</Text>
        </Text>
        
        <Text style={[styles.subtitle, { color: textSlateSub }]}>
          Ready to crush your goals today?
        </Text>
      </View>

      {/* Right: Notification */}
      <View style={styles.actions}>
        <View style={[styles.bellPill, { backgroundColor: '#FFFFFF', borderColor: skyTint, borderWidth: 1 }]}>
          <NotificationBell
            unreadCount={unreadCount}
            onPress={onNotificationPress ?? (() => {})}
            color={skyDark}
            size={22}
          />
        </View>
      </View>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
  },
  textSection: {
    flex: 1,
    marginRight: spacing[12],
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: spacing[12],
  },
  dateText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#0284C7',
    fontSize: 11,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    ...typography.title,
    fontWeight: '900',
    fontSize: 22,
    marginBottom: spacing[4],
    lineHeight: 28,
  },
  subtitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    justifyContent: 'center',
    paddingTop: spacing[8],
  },
  bellPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
    shadowColor: '#0284C7',
    shadowOpacity: 0.08,
  },
});

export default GreetingHeader;
