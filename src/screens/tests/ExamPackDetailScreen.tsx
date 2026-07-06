/**
 * ExamPackDetailScreen
 *
 * Premium pack detail screen shown when a user taps an exam card from the
 * MockTests tab. Displays:
 * - Sticky header with back button and title
 * - Hero section with stats grid, price, and unlock CTA
 * - "View Papers" CTA that navigates to PyqPapersScreen
 * - Preview locked year cards
 * - What's Included checklist
 * - Sticky bottom bar with price and unlock button
 *
 * @module screens/tests/ExamPackDetailScreen
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from '../../components/home/Icons';
import type { IconName } from '../../components/home/Icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface ExamPackDetailParams {
  /** Display title for the exam (e.g. "JEE Main"). */
  examTitle: string;
  /** Icon name for the exam. */
  examIcon: IconName;
}

interface FeatureItem {
  icon: IconName;
  label: string;
  value: string;
}

interface IncludedItem {
  label: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Constants & Data
// ═══════════════════════════════════════════════════════════════════

const CTA_BLUE = '#005bbf';

const FEATURES: FeatureItem[] = [
  { icon: 'calendar', label: 'Coverage', value: '12 Years Official PYQs' },
  { icon: 'timer', label: 'Practice', value: '150+ Timed Mock Tests' },
  { icon: 'bar-chart-2', label: 'Insights', value: 'AI Analytics' },
  { icon: 'trophy', label: 'Goal', value: 'Rank Prediction' },
];

const INCLUDED_ITEMS: IncludedItem[] = [
  { label: 'Official Previous Year Questions' },
  { label: 'Real Exam Timer' },
  { label: 'AI Analytics' },
  { label: 'Performance Report' },
  { label: 'Rank Prediction' },
  { label: 'Unlimited Attempts' },
];

const LOCKED_YEARS = ['2025', '2024'];

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

// ── Sticky Header ─────────────────────────────────────────────────

interface HeaderProps {
  safeAreaTop: number;
  examTitle: string;
  onBackPress: () => void;
}

const Header = React.memo(function Header({
  safeAreaTop,
  examTitle,
  onBackPress,
}: HeaderProps): React.JSX.Element {
  return (
    <View style={[styles.header, { paddingTop: safeAreaTop + spacing[12] }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.6}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" color={CTA_BLUE} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Premium {examTitle} Prep
        </Text>
      </View>
    </View>
  );
});

// ── Hero Section ──────────────────────────────────────────────────

interface HeroSectionProps {
  examTitle: string;
  examIcon: IconName;
}

const HeroSection = React.memo(function HeroSection({
  examTitle,
  examIcon,
}: HeroSectionProps): React.JSX.Element {
  return (
    <View style={styles.heroCard}>
      {/* Bestseller badge */}
      <View style={styles.bestsellerBadge}>
        <Icon name="star" color={CTA_BLUE} width={14} height={14} />
        <Text style={styles.bestsellerText}>Bestseller</Text>
      </View>

      {/* Title */}
      <Text style={styles.heroTitle}>
        📘 {examTitle} PYQ + Mock Test Pack
      </Text>

      {/* Feature grid */}
      <View style={styles.featureGrid}>
        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Icon
                name={feature.icon}
                color={CTA_BLUE}
                width={18}
                height={18}
              />
            </View>
            <View style={styles.featureTextGroup}>
              <Text style={styles.featureLabel}>{feature.label}</Text>
              <Text style={styles.featureValue}>{feature.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Price & CTA for scroll view area */}
      <View style={styles.heroCtaArea}>
        <View style={styles.priceRow}>
          <Text style={styles.priceCurrent}>₹299</Text>
          <Text style={styles.priceOriginal}>₹999</Text>
        </View>
        <TouchableOpacity
          style={styles.unlockButton}
          activeOpacity={0.85}
          accessibilityLabel="Unlock exam pack"
          accessibilityRole="button"
        >
          <Text style={styles.unlockButtonText}>
            Unlock {examTitle} Pack
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ── View Papers CTA ───────────────────────────────────────────────

interface ViewPapersCtaProps {
  examTitle: string;
  onPress: () => void;
}

const ViewPapersCta = React.memo(function ViewPapersCta({
  examTitle,
  onPress,
}: ViewPapersCtaProps): React.JSX.Element {
  return (
    <View style={styles.viewPapersSection}>
      <TouchableOpacity
        style={styles.viewPapersCta}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel={`View previous year papers for ${examTitle}`}
        accessibilityRole="button"
      >
        <View style={styles.viewPapersCtaContent}>
          <View style={styles.viewPapersCtaTextGroup}>
            <Text style={styles.viewPapersCtaTitle}>
              Preview Official Papers
            </Text>
            <Text style={styles.viewPapersCtaSubtitle}>
              Browse all {examTitle} previous year question papers
            </Text>
          </View>
          <View style={styles.viewPapersCtaArrow}>
            <Icon
              name="arrow-right"
              color={colors.text.inverse}
              width={20}
              height={20}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ── Locked Preview Card ───────────────────────────────────────────

interface LockedCardProps {
  year: string;
}

const LockedCard = React.memo(function LockedCard({
  year,
}: LockedCardProps): React.JSX.Element {
  return (
    <View style={styles.lockedCard}>
      {/* Top row: title + badge */}
      <View style={styles.lockedCardTop}>
        <View style={styles.lockedCardTitleRow}>
          <Icon name="eye" color={colors.error} width={18} height={18} />
          <Text style={styles.lockedCardTitle}>JEE Main {year}</Text>
        </View>
        <View style={styles.officialBadgeFlat}>
          <Text style={styles.officialBadgeFlatText}>Official PYQ</Text>
        </View>
      </View>

      {/* Blurred content placeholder */}
      <View style={styles.lockedContent}>
        <View style={styles.lockedLine} />
        <View style={[styles.lockedLine, { width: '50%' }]} />
        <View style={styles.lockedStatsRow}>
          <View style={styles.lockedStat}>
            <Icon
              name="description"
              color={palette.slate300}
              width={14}
              height={14}
            />
            <Text style={styles.lockedStatText}>90 Questions</Text>
          </View>
          <View style={styles.lockedStat}>
            <Icon
              name="timer"
              color={palette.slate300}
              width={14}
              height={14}
            />
            <Text style={styles.lockedStatText}>180 Minutes</Text>
          </View>
        </View>
      </View>

      {/* Overlay button */}
      <View style={styles.lockedOverlay}>
        <TouchableOpacity
          style={styles.unlockPracticeButton}
          activeOpacity={0.8}
          accessibilityLabel={`Unlock to practice JEE Main ${year}`}
          accessibilityRole="button"
        >
          <Icon name="eye" color={CTA_BLUE} width={16} height={16} />
          <Text style={styles.unlockPracticeText}>Unlock to Practice</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ── Preview Section ───────────────────────────────────────────────

const PreviewSection = React.memo(function PreviewSection(): React.JSX.Element {
  return (
    <View style={styles.previewSection}>
      <Text style={styles.sectionTitle}>Preview Official Papers</Text>
      <View style={styles.lockedCardsGrid}>
        {LOCKED_YEARS.map((year) => (
          <LockedCard key={year} year={year} />
        ))}
      </View>
    </View>
  );
});

// ── What's Included Section ───────────────────────────────────────

const IncludedSection = React.memo(function IncludedSection(): React.JSX.Element {
  return (
    <View style={styles.includedSection}>
      <Text style={styles.sectionTitle}>What's Included</Text>
      <View style={styles.includedGrid}>
        {INCLUDED_ITEMS.map((item, index) => (
          <View key={index} style={styles.includedRow}>
            <Icon
              name="badge-check"
              color={colors.primary}
              width={20}
              height={20}
            />
            <Text style={styles.includedText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ── Sticky Bottom Bar ─────────────────────────────────────────────

interface BottomBarProps {
  examTitle: string;
  safeAreaBottom: number;
}

const BottomBar = React.memo(function BottomBar({
  examTitle,
  safeAreaBottom,
}: BottomBarProps): React.JSX.Element {
  return (
    <View style={[styles.bottomBar, { paddingBottom: safeAreaBottom + spacing[12] }]}>
      <View style={styles.bottomBarInner}>
        <View style={styles.bottomPriceGroup}>
          <Text style={styles.bottomPrice}>₹299</Text>
          <Text style={styles.bottomPriceOriginal}>₹999</Text>
        </View>
        <TouchableOpacity
          style={styles.bottomUnlockButton}
          activeOpacity={0.85}
          accessibilityLabel={`Unlock ${examTitle} pack`}
          accessibilityRole="button"
        >
          <Text style={styles.bottomUnlockText}>Unlock Pack</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ── Bottom Spacer for list ────────────────────────────────────────

const BottomSpacer = React.memo(function BottomSpacer(): React.JSX.Element {
  return <View style={styles.scrollBottomSpacer} />;
});

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

interface ExamPackDetailScreenProps {
  route: { params: ExamPackDetailParams };
  navigation: { goBack: () => void };
}

export default function ExamPackDetailScreen({
  route,
  navigation,
}: ExamPackDetailScreenProps): React.JSX.Element {
  const { examTitle, examIcon } = route.params;
  const insets = useSafeAreaInsets();
  const stackNavigation = useNavigation<NavigationProp>();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewPapers = useCallback(() => {
    stackNavigation.navigate('PyqPapers', {
      examTitle,
      examIcon,
    });
  }, [stackNavigation, examTitle, examIcon]);

  // Header height: safeAreaTop + spacing[12] (paddingTop)
  //                + 40 (back button height)
  //                + spacing[12] (paddingBottom)
  //                + 1 (borderBottom)
  const headerHeight =
    insets.top + spacing[12] + 40 + spacing[12] + 1;

  // Bottom bar height: spacing[16] (paddingTop) + 52 (button height)
  //                    + spacing[12] (extra bottom padding) + safeAreaBottom
  const bottomBarHeight = spacing[16] + 52 + spacing[12] + insets.bottom;

  return (
    <View style={styles.screen}>
      {/* Sticky header */}
      <Header
        safeAreaTop={insets.top}
        examTitle={examTitle}
        onBackPress={handleBackPress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: bottomBarHeight + spacing[16],
        }}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
      >
        {/* Hero Section */}
        <HeroSection examTitle={examTitle} examIcon={examIcon} />

        {/* View Papers CTA — middle of page */}
        <ViewPapersCta
          examTitle={examTitle}
          onPress={handleViewPapers}
        />

        {/* Preview Locked Cards */}
        <PreviewSection />

        {/* What's Included */}
        <IncludedSection />

        {/* Bottom spacer */}
        <BottomSpacer />
      </ScrollView>

      {/* Sticky bottom bar */}
      <BottomBar
        examTitle={examTitle}
        safeAreaBottom={insets.bottom}
      />
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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },

  // ── Sticky Header ───────────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[12],
    flexShrink: 0,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: CTA_BLUE,
    lineHeight: 24,
    flex: 1,
  },

  // ── Hero Card ───────────────────────────────────────────────────
  heroCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing[16],
    marginTop: spacing[16],
    borderRadius: radius.xl + 4,
    padding: spacing[20],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bestsellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: '#E8F0FE',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
    alignSelf: 'flex-start',
    marginBottom: spacing[12],
  },
  bestsellerText: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '600',
    color: CTA_BLUE,
  },
  heroTitle: {
    ...typography.title,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 32,
    marginBottom: spacing[16],
  },

  // ── Feature Grid ────────────────────────────────────────────────
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
    marginBottom: spacing[20],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    width: '47%',
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTextGroup: {
    flex: 1,
  },
  featureLabel: {
    ...typography.caption,
    fontSize: 11,
    color: palette.slate500,
    lineHeight: 14,
  },
  featureValue: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 16,
  },

  // ── Hero CTA Area ───────────────────────────────────────────────
  heroCtaArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceRow: {
    flexDirection: 'column',
  },
  priceCurrent: {
    ...typography.title,
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 34,
  },
  priceOriginal: {
    ...typography.bodySmall,
    fontSize: 14,
    color: palette.slate400,
    textDecorationLine: 'line-through',
    lineHeight: 18,
  },
  unlockButton: {
    backgroundColor: CTA_BLUE,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    ...Platform.select({
      ios: {
        shadowColor: CTA_BLUE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  unlockButtonText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.inverse,
  },

  // ── View Papers CTA ─────────────────────────────────────────────
  viewPapersSection: {
    marginHorizontal: spacing[16],
    marginTop: spacing[20],
  },
  viewPapersCta: {
    backgroundColor: '#1a73e8',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1a73e8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  viewPapersCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[20],
    gap: spacing[12],
  },
  viewPapersCtaTextGroup: {
    flex: 1,
  },
  viewPapersCtaTitle: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.inverse,
    lineHeight: 24,
    marginBottom: 2,
  },
  viewPapersCtaSubtitle: {
    ...typography.bodySmall,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  viewPapersCtaArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Preview Section ─────────────────────────────────────────────
  previewSection: {
    marginHorizontal: spacing[16],
    marginTop: spacing[24],
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: spacing[16],
  },
  lockedCardsGrid: {
    gap: spacing[16],
  },

  // ── Locked Card ─────────────────────────────────────────────────
  lockedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.md,
    padding: spacing[16],
    position: 'relative',
    overflow: 'hidden',
  },
  lockedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  lockedCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  lockedCardTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  officialBadgeFlat: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radius.sm - 3,
  },
  officialBadgeFlatText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: '#008c3a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  lockedContent: {
    gap: spacing[8],
    opacity: 0.4,
  },
  lockedLine: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 7,
    width: '75%',
  },
  lockedStatsRow: {
    flexDirection: 'row',
    gap: spacing[20],
    marginTop: spacing[12],
  },
  lockedStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockedStatText: {
    ...typography.bodySmall,
    fontSize: 12,
    color: palette.slate400,
    lineHeight: 16,
  },
  lockedOverlay: {
    marginTop: spacing[16],
    alignItems: 'center',
  },
  unlockPracticeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: CTA_BLUE,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[8],
    borderRadius: radius.xxl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  unlockPracticeText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '600',
    color: CTA_BLUE,
  },

  // ── What's Included Section ─────────────────────────────────────
  includedSection: {
    marginHorizontal: spacing[16],
    marginTop: spacing[24],
    backgroundColor: colors.surface,
    borderRadius: radius.xl + 2,
    padding: spacing[20],
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  includedGrid: {
    gap: spacing[12],
  },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  includedText: {
    ...typography.body,
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    flex: 1,
  },

  // ── Bottom Sticky Bar ───────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPriceGroup: {
    flexDirection: 'column',
  },
  bottomPrice: {
    ...typography.title,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 30,
  },
  bottomPriceOriginal: {
    ...typography.bodySmall,
    fontSize: 13,
    color: palette.slate400,
    textDecorationLine: 'line-through',
    lineHeight: 16,
  },
  bottomUnlockButton: {
    backgroundColor: CTA_BLUE,
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    minWidth: 140,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: CTA_BLUE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bottomUnlockText: {
    ...typography.buttonSmall,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.inverse,
  },

  // ── Scroll Bottom Spacer ────────────────────────────────────────
  scrollBottomSpacer: {
    height: spacing[24],
  },
});
