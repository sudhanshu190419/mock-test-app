/**
 * ProfileTabScreen
 *
 * Premium profile screen with:
 * - Profile header (avatar, name, role, premium badge)
 * - Quick stats widget (questions, accuracy, streak)
 * - Dark subscription/VIP card
 * - Course progress bars (Physics, Chemistry, Maths)
 * - Account settings list with navigation icons
 *
 * @module screens/tabs/ProfileTabScreen
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Placeholder avatar colours for the initials circle. */
const AVATAR_BG = colors.secondary;

/** Subscription card background (dark inverse surface). */
const SUBSCRIPTION_BG = '#1E293B';

/** User data — replace with real data from auth/API later. */
const USER = {
  name: 'Aman Sharma',
  role: 'JEE Aspirant 2025',
  avatarInitials: 'AS',
  isPremium: true,
  stats: {
    questions: '1,240',
    accuracy: '84%',
    dayStreak: '21',
  },
  subscription: {
    plan: 'EduMaster Pro',
    validUntil: 'July 2026',
  },
  courseProgress: [
    { subject: 'Physics', percent: 65 },
    { subject: 'Chemistry', percent: 42 },
    { subject: 'Mathematics', percent: 88 },
  ] as const,
} as const;

/** Settings menu items. */
interface SettingsItem {
  key: string;
  icon: 'user' | 'download' | 'description' | 'bell' | 'headphones' | 'log-out';
  label: string;
  isDestructive?: boolean;
  onPress?: () => void;
}

const SETTINGS_ITEMS: SettingsItem[] = [
  { key: 'personal-info', icon: 'user', label: 'Personal Information' },
  { key: 'downloads', icon: 'download', label: 'My Downloads' },
  { key: 'payment-history', icon: 'description', label: 'Payment History' },
  { key: 'notifications', icon: 'bell', label: 'Notification Settings' },
  { key: 'help', icon: 'headphones', label: 'Help & Support' },
  { key: 'logout', icon: 'log-out', label: 'Logout', isDestructive: true },
];

// ─── Animated Progress Bar ───────────────────────────────────────────────────

interface ProgressBarProps {
  label: string;
  percent: number;
  index: number;
}

const ProgressBar = React.memo(function ProgressBar({
  label,
  percent,
  index,
}: ProgressBarProps): React.JSX.Element {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percent,
      duration: 800,
      delay: 200 + index * 120,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, index]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const isHighlighted = percent >= 80;

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressPercent}>{percent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: animatedWidth,
              backgroundColor: isHighlighted ? colors.primary : colors.text.primary,
              opacity: isHighlighted ? 1 : 0.55,
            },
          ]}
        />
      </View>
    </View>
  );
});

// ─── Setting Row ─────────────────────────────────────────────────────────────

interface SettingRowProps {
  item: SettingsItem;
  index: number;
}

const SettingRow = React.memo(function SettingRow({
  item,
  index,
}: SettingRowProps): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 300 + index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 300 + index * 60,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const iconColor = '#6B7280';
  const labelColor = '#111827';
const chevronColor = '#BFC4CC';

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.settingRow}
        onPress={item.onPress}
        activeOpacity={0.6}
        accessibilityLabel={item.label}
        accessibilityRole="button"
      >
        <View style={styles.settingLeft}>
          <View style={styles.settingIconWrapper}>
            <Icon name={item.icon} color={iconColor} width={20} height={20} />
          </View>
          <Text style={[styles.settingLabel, { color: labelColor }]}>
            {item.label}
          </Text>
        </View>
        <Icon name="chevron-right" color={chevronColor} width={18} height={18} />
      </TouchableOpacity>
      {/* Divider between settings rows (except last) */}
      {item.key !== SETTINGS_ITEMS[SETTINGS_ITEMS.length - 1].key && (
        <View style={styles.settingDivider} />
      )}
    </Animated.View>
  );
});

// ─── Profile Header ─────────────────────────────────────────────────────────

const ProfileHeader = React.memo(function ProfileHeader(): React.JSX.Element {
  return (
    <View style={styles.profileHeader}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{USER.avatarInitials}</Text>
        </View>
        {/* Premium Badge */}
        {USER.isPremium && (
          <View style={styles.premiumBadge}>
            <Icon name="badge-check" color={colors.secondary} width={14} height={14} />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
      </View>

      {/* Name & Role */}
      <Text style={styles.userName}>{USER.name}</Text>
      <Text style={styles.userRole}>{USER.role}</Text>
    </View>
  );
});

// ─── Quick Stats Widget ──────────────────────────────────────────────────────

const StatsWidget = React.memo(function StatsWidget(): React.JSX.Element {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const STATS_DATA: { label: string; value: string }[] = [
    { label: 'Questions', value: USER.stats.questions },
    { label: 'Accuracy', value: USER.stats.accuracy },
    { label: 'Day Streak', value: USER.stats.dayStreak },
  ];

  return (
    <Animated.View
      style={[
        styles.statsWidget,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {STATS_DATA.map((stat, index) => (
        <React.Fragment key={stat.label}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
          {index < STATS_DATA.length - 1 && (
            <View style={styles.statDivider} />
          )}
        </React.Fragment>
      ))}
    </Animated.View>
  );
});



// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfileTabScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing[8] }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.topBarAvatar}>
            <Text style={styles.topBarAvatarText}>AS</Text>
          </View>
          <Text style={styles.topBarTitle}>EduMastery</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Icon name="bell" color={colors.text.secondary} width={22} height={22} />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable Content ──────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing[32] + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <ProfileHeader />

        {/* Quick Stats */}
        <StatsWidget />

       

        

        {/* Settings List */}
        <View style={styles.settingsCard}>
          {SETTINGS_ITEMS.map((item, index) => (
            <SettingRow key={item.key} item={item} index={index} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },

  // ── Top Bar ───────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[12],
    backgroundColor: colors.background,
    ...Platform.select({
      ios: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  topBarAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AVATAR_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarAvatarText: {
    ...typography.labelSmall,
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 12,
  },
  topBarTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.small,
  },

  // ── Profile Header ────────────────────────────────────────
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing[12],
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: AVATAR_BG,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  avatarText: {
    ...typography.heading1,
    fontSize: 36,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  premiumBadgeText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '600',
    color: colors.secondary,
  },
  userName: {
    ...typography.title,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
    marginBottom: spacing[4],
  },
  userRole: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '400',
  },

  // ── Stats Widget ──────────────────────────────────────────
  statsWidget: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
    marginBottom: spacing[20],
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  statValue: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  statLabel: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
    alignSelf: 'center',
    height: 32,
  },

  // ── Subscription Card ─────────────────────────────────────
  subscriptionCard: {
    backgroundColor: SUBSCRIPTION_BG,
    borderRadius: radius.lg,
    padding: spacing[16],
    marginBottom: spacing[20],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  subscriptionGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.secondary,
    opacity: 0.08,
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    flex: 1,
  },
  subscriptionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionPlan: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subscriptionDate: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontSize: 13,
  },
  managePlanButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing[16],
    paddingVertical: 22,
    borderRadius: radius.sm,
    alignSelf: 'center',
  },
  managePlanText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '600',
    color: SUBSCRIPTION_BG,
  },

  // ── Section ───────────────────────────────────────────────
  sectionContainer: {
    marginBottom: spacing[20],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing[16],
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  sectionAction: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },

  // ── Progress Bars ─────────────────────────────────────────
  progressList: {
    gap: spacing[16],
  },
  progressRow: {
    gap: spacing[8],
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  progressPercent: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    fontFamily: Platform.select({ ios: 'JetBrains Mono', android: 'monospace' }),
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ── Settings List ─────────────────────────────────────────
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 34,
  },
  settingIconWrapper: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
     marginLeft: 6,
  },
  settingLabel: {
  fontSize: 16,
  fontWeight: '400',
  color: '#111827',
  
},
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing[16] + 20 + spacing[12], // align with label start (icon + gap)
  },
});
