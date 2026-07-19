/**
 * ProfileTabScreen
 *
 * Premium profile screen with:
 * - M3 Hero profile header
 * - StudentAnalyticsDashboard acting as the core Hub
 * - Settings menu list with active mock alert and logout integration
 *
 * @module screens/tabs/ProfileTabScreen
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';

const AVATAR_BG = colors.secondary;

interface SettingsItem {
  key: string;
  icon: 'user' | 'download' | 'description' | 'bell' | 'headphones' | 'log-out' | 'bar-chart-2' | 'clipboard-list';
  label: string;
  isDestructive?: boolean;
}

const SETTINGS_ITEMS: SettingsItem[] = [
  { key: 'personal-info', icon: 'user', label: 'Personal Information' },
  { key: 'analytics', icon: 'bar-chart-2', label: 'Detailed Analytics' },
  { key: 'results', icon: 'clipboard-list', label: 'My Test Results' },
  { key: 'downloads', icon: 'download', label: 'My Downloads' },
  { key: 'payment-history', icon: 'description', label: 'Payment History' },
  { key: 'notifications', icon: 'bell', label: 'Notification Settings' },
  { key: 'help', icon: 'headphones', label: 'Help & Support' },
  { key: 'logout', icon: 'log-out', label: 'Logout', isDestructive: true },
];

const getInitials = (name?: string): string => {
  if (!name) return 'GS';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

interface SettingRowProps {
  item: SettingsItem;
  index: number;
  onPress: () => void;
}

const SettingRow = React.memo(function SettingRow({
  item,
  index,
  onPress,
}: SettingRowProps): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 200 + index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 200 + index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fadeAnim, slideAnim]);

  const iconColor = item.isDestructive ? colors.error : '#6B7280';
  const labelColor = item.isDestructive ? colors.error : '#111827';
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
        onPress={onPress}
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
      {item.key !== SETTINGS_ITEMS[SETTINGS_ITEMS.length - 1].key && (
        <View style={styles.settingDivider} />
      )}
    </Animated.View>
  );
});

export default function ProfileTabScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const user = useAppSelector(selectUser);
  const { logout } = useAuth();

  const displayName = user?.name || 'Guest Student';
  const displayEmail = user?.email || 'guest@mockprep.com';
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const handleSettingPress = useCallback(
    (item: SettingsItem) => {
      if (item.key === 'logout') {
        Alert.alert(
          'Logout',
          'Are you sure you want to log out of your account?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Logout',
              style: 'destructive',
              onPress: async () => {
                try {
                  await logout();
                } catch (err) {
                  console.warn('[ProfileTabScreen] Logout failed:', err);
                  Alert.alert('Error', 'Failed to log out. Please try again.');
                }
              },
            },
          ]
        );
      } else if (item.key === 'personal-info') {
        navigation.navigate('PersonalInfo' as any);
      } else if (item.key === 'analytics') {
        navigation.navigate('DetailedAnalytics' as any);
      } else if (item.key === 'results') {
        navigation.navigate('MyResults' as any);
      } else if (item.key === 'payment-history') {
        navigation.navigate('PaymentHistory' as any);
      } else if (item.key === 'downloads') {
        navigation.navigate('Downloads' as any);
      } else if (item.key === 'notifications') {
        navigation.navigate('NotificationSettings' as any);
      } else if (item.key === 'help') {
        navigation.navigate('HelpSupport' as any);
      } else {
        Alert.alert(item.label, `${item.label} feature is coming soon!`);
      }
    },
    [logout, navigation]
  );

  return (
    <View style={styles.root}>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing[8] }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.topBarAvatar}>
            <Text style={styles.topBarAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.topBarTitle}>EduMastery</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Notification')}
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
        {/* M3 Hero Profile Header */}
        <View style={styles.heroHeader}>
          <View style={styles.heroAvatarContainer}>
            <Text style={styles.heroAvatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroEmail}>{displayEmail}</Text>
            <View style={styles.heroBadge}>
              <Icon name="badge-check" color={colors.secondary} width={14} height={14} />
              <Text style={styles.heroBadgeText}>Premium Student</Text>
            </View>
          </View>
        </View>

        {/* Settings Card */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.settingsCard}>
            {SETTINGS_ITEMS.map((item, index) => (
              <SettingRow
                key={item.key}
                item={item}
                index={index}
                onPress={() => handleSettingPress(item)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0, 
    paddingTop: spacing[16],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[20],
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

  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: spacing[20],
    marginBottom: spacing[8],
    ...shadows.medium,
  },
  heroAvatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroAvatarText: {
    ...typography.heading2,
    color: '#FFFFFF',
    fontSize: 28,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  heroName: {
    ...typography.title,
    color: '#FFFFFF',
    fontSize: 22,
    marginBottom: 4,
  },
  heroEmail: {
    ...typography.body,
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 4,
  },
  heroBadgeText: {
    ...typography.labelSmall,
    color: '#10B981',
    fontWeight: '700',
  },

  settingsSection: {
    gap: spacing[12],
    marginHorizontal: spacing[20],
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
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
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingIconWrapper: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing[16] + 24 + spacing[12],
  },
});
