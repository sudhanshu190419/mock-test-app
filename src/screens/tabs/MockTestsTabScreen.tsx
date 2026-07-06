/**
 * MockTestsTabScreen
 *
 * Premium "Choose Your Exam" screen with glassmorphism cards matching the
 * reference design. Features:
 *
 * - Ambient background gradient layers for depth
 * - Glass card exam items with icon, title, subtitle, and chevron
 * - Stats grid (PYQs, Mock Tests, Year Range) per exam
 * - Color-coded themes per exam (purple, blue, green, cyan, amber, rose)
 * - Optimised with React.memo & useCallback
 * - Sticky translucent header with back button and descriptive subtitle
 *
 * @module screens/tabs/MockTestsTabScreen
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';

import Icon from '../../components/home/Icons';
import type { IconName } from '../../components/home/Icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

interface ExamStats {
  label: string;
  value: string;
  caption: string;
  icon: IconName;
}

interface ExamCardData {
  key: string;
  icon: IconName;
  title: string;
  subtitle: string;
  accentColor: string;
  iconBg: string;
  iconBorder: string;
  hoverTint: string;
  stats: ExamStats[];
}

// ═══════════════════════════════════════════════════════════════════
//  Data
// ═══════════════════════════════════════════════════════════════════

const EXAMS: ExamCardData[] = [
  {
    key: 'jee-main',
    icon: 'science',
    title: 'JEE Main',
    subtitle: 'PYQ + Mock Tests',
    accentColor: '#9333EA',
    iconBg: '#FFFFFF',
    iconBorder: '#E9D5FF',
    hoverTint: 'rgba(147, 51, 234, 0.05)',
    stats: [
      { label: 'PYQs', value: '12 Years', caption: 'PYQs', icon: 'calendar' },
      { label: 'Timed Mock Tests', value: '150+', caption: 'Timed Mock Tests', icon: 'description' },
      { label: 'Papers', value: '2013 - 2025', caption: 'Papers', icon: 'timer' },
    ],
  },
  {
    key: 'jee-advanced',
    icon: 'architecture',
    title: 'JEE Advanced',
    subtitle: 'PYQ + Mock Tests',
    accentColor: '#2563EB',
    iconBg: '#FFFFFF',
    iconBorder: '#BFDBFE',
    hoverTint: 'rgba(37, 99, 235, 0.05)',
    stats: [
      { label: 'PYQs', value: '11 Years', caption: 'PYQs', icon: 'calendar' },
      { label: 'Timed Mock Tests', value: '120+', caption: 'Timed Mock Tests', icon: 'description' },
      { label: 'Papers', value: '2014 - 2025', caption: 'Papers', icon: 'timer' },
    ],
  },
  {
    key: 'neet-ug',
    icon: 'stethoscope',
    title: 'NEET UG',
    subtitle: 'PYQ + Mock Tests',
    accentColor: '#16A34A',
    iconBg: '#FFFFFF',
    iconBorder: '#BBF7D0',
    hoverTint: 'rgba(22, 163, 74, 0.05)',
    stats: [
      { label: 'PYQs', value: '13 Years', caption: 'PYQs', icon: 'calendar' },
      { label: 'Timed Mock Tests', value: '180+', caption: 'Timed Mock Tests', icon: 'description' },
      { label: 'Papers', value: '2012 - 2025', caption: 'Papers', icon: 'timer' },
    ],
  },
  {
    key: 'cuet',
    icon: 'school',
    title: 'CUET',
    subtitle: 'PYQ + Mock Tests',
    accentColor: '#0891B2',
    iconBg: '#FFFFFF',
    iconBorder: '#A5F3FC',
    hoverTint: 'rgba(8, 145, 178, 0.05)',
    stats: [
      { label: 'PYQs', value: '6 Years', caption: 'PYQs', icon: 'calendar' },
      { label: 'Timed Mock Tests', value: '80+', caption: 'Timed Mock Tests', icon: 'description' },
      { label: 'Papers', value: '2019 - 2025', caption: 'Papers', icon: 'timer' },
    ],
  },
  {
    key: 'clat',
    icon: 'balance',
    title: 'CLAT',
    subtitle: 'PYQ + Mock Tests',
    accentColor: '#D97706',
    iconBg: '#FFFFFF',
    iconBorder: '#FDE68A',
    hoverTint: 'rgba(217, 119, 6, 0.05)',
    stats: [
      { label: 'PYQs', value: '10 Years', caption: 'PYQs', icon: 'calendar' },
      { label: 'Timed Mock Tests', value: '100+', caption: 'Timed Mock Tests', icon: 'description' },
      { label: 'Papers', value: '2015 - 2025', caption: 'Papers', icon: 'timer' },
    ],
  },
  {
    key: 'foundation',
    icon: 'menu-book',
    title: 'Foundation (8th - 10th)',
    subtitle: 'PYQ + Mock Tests',
    accentColor: '#E11D48',
    iconBg: '#FFFFFF',
    iconBorder: '#FECDD3',
    hoverTint: 'rgba(225, 29, 72, 0.05)',
    stats: [
      { label: 'PYQs', value: '8 Years', caption: 'PYQs', icon: 'calendar' },
      { label: 'Timed Mock Tests', value: '60+', caption: 'Timed Mock Tests', icon: 'description' },
      { label: 'Papers', value: '2018 - 2025', caption: 'Papers', icon: 'timer' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

// ── Ambient Background ────────────────────────────────────────────

/** Soft glowing gradient circles for depth. */
const AmbientBackground = React.memo(function AmbientBackground(): React.JSX.Element {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View/>
      <View/>
      <View/>
    </View>
  );
});

// ── Header ────────────────────────────────────────────────────────

interface HeaderProps {
  safeAreaTop: number;
}

const Header = React.memo(function Header({
  safeAreaTop,
}: HeaderProps): React.JSX.Element {
  return (
    <View style={[styles.header, { paddingTop: safeAreaTop + spacing[12] }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.6}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon
            name="arrow-left"
            color={colors.text.primary}
            width={24}
            height={24}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Exam</Text>
      </View>
      <Text style={styles.headerSubtitle}>
        Practice real PYQs in a timed environment with AI-powered analytics.
      </Text>
    </View>
  );
});

// ── Exam Stat Row ─────────────────────────────────────────────────

interface ExamStatItemProps {
  stat: ExamStats;
}

const ExamStatItem = React.memo(function ExamStatItem({
  stat,
}: ExamStatItemProps): React.JSX.Element {
  return (
    <View style={styles.statItem}>
      <View style={styles.statRow}>
        <Icon
          name={stat.icon}
          color={colors.text.secondary}
          width={16}
          height={16}
        />
        <Text style={styles.statValue}>{stat.value}</Text>
      </View>
      <Text style={styles.statCaption}>{stat.caption}</Text>
    </View>
  );
});

// ── Exam Card ─────────────────────────────────────────────────────

interface ExamCardProps {
  item: ExamCardData;
  onPress: () => void;
}

const ExamCard = React.memo(function ExamCard({
  item,
  onPress,
}: ExamCardProps): React.JSX.Element {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  return (
    <Animated.View
      style={[
        styles.cardOuterShadow,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`${item.title} - ${item.subtitle}`}
        accessibilityRole="button"
      >
        <View style={styles.card}>
          {/* Gradient overlay on press */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cardGradientOverlay,
              {
                opacity: pressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={[item.hoverTint, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientFill}
            />
          </Animated.View>

          {/* Top row: icon + title + chevron */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardLeftRow}>
              {/* Icon circle */}
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: item.iconBg,
                    borderColor: item.iconBorder,
                  },
                  {
                    shadowColor: item.accentColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 4,
                  },
                ]}
              >
                <Icon
                  name={item.icon}
                  color={item.accentColor}
                  width={32}
                  height={32}
                />
              </View>

              {/* Title & subtitle */}
              <View style={styles.titleGroup}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
            </View>

            {/* Chevron circle */}
            <View
              style={[
                styles.chevronCircle,
                {
                  backgroundColor: 'rgba(255,255,255,0.5)',
                },
              ]}
            >
              <Icon
                name="chevron-right"
                color={colors.text.secondary}
                width={20}
                height={20}
              />
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {item.stats.map((stat, i) => (
              <ExamStatItem key={`${item.key}-stat-${i}`} stat={stat} />
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function MockTestsTabScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleExamPress = useCallback(
    (exam: ExamCardData) =>
      navigation.navigate('ExamPackDetail', {
        examTitle: exam.title,
        examIcon: exam.icon,
      }),
    [navigation],
  );

  // The header's total visible height (from the screen's content area top):
  //   safeAreaTop + spacing[12] (dynamic paddingTop)
  //   + 40 (headerRow — tallest child)
  //   + spacing[8] (gap)
  //   + 20 (subtitle lineHeight)
  //   + spacing[12] (paddingBottom)
  //   + 1 (borderBottom)
  const headerHeight = insets.top + spacing[12] + 40 + spacing[8] + 20 + spacing[12] + 1;

  return (
    <View style={styles.screen}>
      {/* Ambient background blobs */}
      <AmbientBackground />

      {/* Sticky header */}
      <Header safeAreaTop={insets.top} />

      {/* Scrollable card list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing[40],
          paddingHorizontal: spacing[16],
          paddingBottom: spacing[8],
        }}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
      >
        {EXAMS.map((exam) => (
          <ExamCard
            key={exam.key}
            item={exam}
            onPress={() => handleExamPress(exam)}
          />
        ))}

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // ── Screen ──────────────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  scrollView: {
    flex: 1,
  },
  // ── Ambient Background ──────────────────────────────────────────
  ambientBlob: {
    position: 'absolute',
    borderRadius: 9999,
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
    gap: spacing[8],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    paddingLeft: spacing[4],
    maxWidth: '85%',
  },

  // ── Card ────────────────────────────────────────────────────────
  cardOuterShadow: {
    marginBottom: spacing[16],
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
shadowOpacity: 0.08,
shadowRadius: 10,
shadowOffset: {
    width:0,
    height:4,
},
elevation:6,
  },
  cardTouchable: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 24,
    padding: spacing[20],
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    gap: spacing[16],
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },

  // ── Card Top Row ────────────────────────────────────────────────
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  cardLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
    flex: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 24,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight:'700',
    color: colors.text.secondary,
    marginTop: 1,
  },
  chevronCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Divider ─────────────────────────────────────────────────────
  cardDivider: {
    height: 1,
    backgroundColor:'#EEF1F5',
    zIndex: 1,
  },

  // ── Stats Grid ──────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[8],
    zIndex: 1,
  },
  statItem: {
    flex: 1,
    gap: spacing[4],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
    lineHeight: 16,
  },
  statCaption: {
    ...typography.caption,
    fontSize: 9,
    
    color: '#727785',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginLeft: 22,
  },

  // ── Gradient Fill (for LinearGradient) ──────────────────────────
  gradientFill: {
    ...StyleSheet.absoluteFill,
  },

  // ── Bottom spacer ───────────────────────────────────────────────
  bottomSpacer: {
    height: spacing[24],
  },
});
