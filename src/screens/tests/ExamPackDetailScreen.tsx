/**
 * ExamPackDetailScreen
 *
 * Premium pack detail screen that fetches package info + papers from the
 * backend via `usePracticeDetail(packageId)`.
 *
 * Layout:
 * - Sticky header with package name
 * - Hero card with package summary, pricing
 * - Papers list (with question count, duration, year)
 * - Sticky bottom bar with price
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from '../../components/home/Icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { usePracticeDetail } from '../../hooks/practice/usePractice';
import { getPaperMockMapping } from '../../services/practice/practiceService';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import type { PracticePaper } from '../../types/practice';
import { Alert } from 'react-native';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface ExamPackDetailParams {
  /** UUID of the PYQ package to display. */
  packageId: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const CTA_BLUE = '#005bbf';

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

// ── Sticky Header ─────────────────────────────────────────────────

interface HeaderProps {
  safeAreaTop: number;
  packageName: string;
  onBackPress: () => void;
}

const Header = React.memo(function Header({
  safeAreaTop,
  packageName,
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
          {packageName}
        </Text>
      </View>
    </View>
  );
});

// ── Hero Section ──────────────────────────────────────────────────

interface HeroSectionProps {
  packageName: string;
  streamName: string;
  totalPapers: number;
  yearRange: string;
  price: number;
  originalPrice: number | null;
  description: string | null;
}

const HeroSection = React.memo(function HeroSection({
  packageName,
  streamName,
  totalPapers,
  yearRange,
  price,
  originalPrice,
  description,
}: HeroSectionProps): React.JSX.Element {
  const discountPercent =
    originalPrice && originalPrice > price
      ? Math.round((1 - price / originalPrice) * 100)
      : 0;

  return (
    <View style={styles.heroCard}>
      {/* Stream badge */}
      <View style={styles.bestsellerBadge}>
        <Icon name="star" color={CTA_BLUE} width={14} height={14} />
        <Text style={styles.bestsellerText}>{streamName}</Text>
      </View>

      {/* Title */}
      <Text style={styles.heroTitle}>{packageName}</Text>

      {/* Description */}
      {description ? (
        <Text style={styles.heroDescription}>{description}</Text>
      ) : null}

      {/* Stats grid */}
      <View style={styles.featureGrid}>
        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Icon name="calendar" color={CTA_BLUE} width={18} height={18} />
          </View>
          <View style={styles.featureTextGroup}>
            <Text style={styles.featureLabel}>Coverage</Text>
            <Text style={styles.featureValue}>{yearRange || 'All Years'}</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Icon name="description" color={CTA_BLUE} width={18} height={18} />
          </View>
          <View style={styles.featureTextGroup}>
            <Text style={styles.featureLabel}>Papers</Text>
            <Text style={styles.featureValue}>{totalPapers} Papers</Text>
          </View>
        </View>
      </View>

      {/* Price & CTA */}
      <View style={styles.heroCtaArea}>
        <View style={styles.priceRow}>
          <Text style={styles.priceCurrent}>₹{price}</Text>
          {originalPrice && originalPrice > price && (
            <Text style={styles.priceOriginal}>₹{originalPrice}</Text>
          )}
          {discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

// ── Paper Card ────────────────────────────────────────────────────

interface PaperCardProps {
  paper: PracticePaper;
  onPress: () => void;
}

const PaperCard = React.memo(function PaperCard({
  paper,
  onPress,
}: PaperCardProps): React.JSX.Element {
  return (
    <View style={styles.paperCard}>
      <View style={styles.paperCardInner}>
        {/* Left: Calendar icon */}
        <View style={styles.paperIconContainer}>
          <Icon name="calendar" color={CTA_BLUE} width={24} height={24} />
        </View>

        {/* Right column */}
        <View style={styles.paperRightCol}>
          <View style={styles.paperContent}>
            <View style={styles.paperTitleRow}>
              <Text style={styles.paperTitle} numberOfLines={1}>
                {paper.title}
              </Text>
              <View style={styles.officialBadgeFlat}>
                <Text style={styles.officialBadgeFlatText}>Official PYQ</Text>
              </View>
            </View>

            <Text style={styles.paperYear}>Year: {paper.examYear}</Text>

            <View style={styles.paperStatsRow}>
              <View style={styles.paperStat}>
                <Icon
                  name="description"
                  color={palette.slate400}
                  width={14}
                  height={14}
                />
                <Text style={styles.paperStatText}>
                  {paper.totalQuestions} Questions
                </Text>
              </View>
              {paper.durationMin ? (
                <View style={styles.paperStat}>
                  <Icon
                    name="timer"
                    color={palette.slate400}
                    width={14}
                    height={14}
                  />
                  <Text style={styles.paperStatText}>
                    {paper.durationMin} Minutes
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* View Papers button */}
          <View style={styles.paperActionRow}>
            <TouchableOpacity
              style={styles.viewPapersButton}
              onPress={onPress}
              activeOpacity={0.7}
              accessibilityLabel={`View ${paper.title}`}
              accessibilityRole="button"
            >
              <Text style={styles.viewPapersText}>View Papers</Text>
              <Icon
                name="arrow-right"
                color={colors.text.inverse}
                width={14}
                height={14}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

// ── Papers Section ────────────────────────────────────────────────

interface PapersSectionProps {
  papers: PracticePaper[];
  onPaperPress: (paper: PracticePaper) => void;
}

const PapersSection = React.memo(function PapersSection({
  papers,
  onPaperPress,
}: PapersSectionProps): React.JSX.Element {
  if (papers.length === 0) {
    return (
      <View style={styles.papersSection}>
        <Text style={styles.sectionTitle}>Papers</Text>
        <View style={styles.emptyPapers}>
          <Text style={styles.emptyPapersText}>
            No papers available in this package yet.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.papersSection}>
      <Text style={styles.sectionTitle}>
        Papers ({papers.length})
      </Text>
      <View style={styles.papersList}>
        {papers.map((paper) => (
          <PaperCard
            key={paper.paperId}
            paper={paper}
            onPress={() => onPaperPress(paper)}
          />
        ))}
      </View>
    </View>
  );
});

// ── Loading State ─────────────────────────────────────────────────

const LoadingState = React.memo(function LoadingState(): React.JSX.Element {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={CTA_BLUE} />
      <Text style={styles.loadingText}>Loading package details...</Text>
    </View>
  );
});

// ── Error State ───────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
}

const ErrorState = React.memo(function ErrorState({
  message,
}: ErrorStateProps): React.JSX.Element {
  return (
    <View style={styles.centerState}>          <Icon name="bell" color={colors.error} width={40} height={40} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
});

// ── Sticky Bottom Bar ─────────────────────────────────────────────

interface BottomBarProps {
  price: number;
  safeAreaBottom: number;
}

const BottomBar = React.memo(function BottomBar({
  price,
  safeAreaBottom,
}: BottomBarProps): React.JSX.Element {
  return (
    <View style={[styles.bottomBar, { paddingBottom: safeAreaBottom + spacing[12] }]}>
      <View style={styles.bottomBarInner}>
        <View style={styles.bottomPriceGroup}>
          <Text style={styles.bottomPrice}>₹{price}</Text>
        </View>
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
  const { packageId } = route.params;
  const insets = useSafeAreaInsets();
  const stackNavigation = useNavigation<NavigationProp>();

  const {
    data: detail,
    isLoading,
    error,
  } = usePracticeDetail(packageId);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePaperPress = useCallback(
    async (paper: PracticePaper) => {
      try {
        const result = await getPaperMockMapping(paper.paperId);

        if (!result.success) {
          Alert.alert('Error', 'Failed to load mock test details. Please try again.');
          return;
        }

        if (!result.data) {
          // No mock test has been generated for this paper
          Alert.alert(
            'Not Available',
            'This paper does not have a mock test generated yet. Please check back later.',
          );
          return;
        }

        if (!result.data.isPublished) {
          Alert.alert(
            'Not Available',
            'The mock test for this paper is not yet published. Please check back later.',
          );
          return;
        }

        const { testId } = result.data;

        stackNavigation.navigate('TestInstructions', {
          examTitle: detail?.package.name ?? 'Practice',
          year: String(paper.examYear),
          displayLabel: paper.title,
          durationMin: paper.durationMin ?? 60,
          questions: paper.totalQuestions,
          totalMarks: paper.totalMarks ?? paper.totalQuestions * 4,
          negativeMarking: -1,
          testId,
          paperId: paper.paperId,
        });
      } catch {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    },
    [stackNavigation, detail],
  );

  // Header height: safeAreaTop + spacing[12] (paddingTop)
  //                + 40 (back button height)
  //                + spacing[12] (paddingBottom)
  //                + 1 (borderBottom)
  const headerHeight =
    insets.top + spacing[12] + 40 + spacing[12] + 1;

  // Bottom bar height: spacing[16] (paddingTop) + 24 (price height)
  //                    + spacing[12] (padding) + safeAreaBottom
  const bottomBarHeight = spacing[16] + 24 + spacing[12] + insets.bottom;

  // ── Loading / Error / Empty ──────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Header
          safeAreaTop={insets.top}
          packageName="Loading..."
          onBackPress={handleBackPress}
        />
        <LoadingState />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.screen}>
        <Header
          safeAreaTop={insets.top}
          packageName="Package"
          onBackPress={handleBackPress}
        />
        <ErrorState message={error?.message ?? 'Failed to load package details.'} />
      </View>
    );
  }

  const { package: pkg, papers } = detail;
  const yearRange =
    pkg.yearFrom && pkg.yearTo
      ? `${pkg.yearFrom}–${pkg.yearTo}`
      : pkg.yearFrom
        ? `Since ${pkg.yearFrom}`
        : null;

  return (
    <View style={styles.screen}>
      {/* Sticky header */}
      <Header
        safeAreaTop={insets.top}
        packageName={pkg.name}
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
        <HeroSection
          packageName={pkg.name}
          streamName={pkg.streamName}
          totalPapers={pkg.totalPapers}
          yearRange={yearRange ?? ''}
          price={pkg.price}
          originalPrice={pkg.originalPrice}
          description={pkg.description}
        />

        {/* Papers List */}
        <PapersSection
          papers={papers}
          onPaperPress={handlePaperPress}
        />

        {/* Bottom spacer */}
        <BottomSpacer />
      </ScrollView>

      {/* Sticky bottom bar */}
      <BottomBar
        price={pkg.price}
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

  // ── Center State (loading/error) ────────────────────────────────
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[48],
    paddingHorizontal: spacing[16],
  },
  loadingText: {
    ...typography.body,
    color: palette.slate500,
    marginTop: spacing[12],
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing[12],
    textAlign: 'center',
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
  heroDescription: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate600,
    lineHeight: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
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
  discountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing[4],
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  discountBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },

  // ── Papers Section ──────────────────────────────────────────────
  papersSection: {
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
  papersList: {
    gap: spacing[12],
  },
  emptyPapers: {
    paddingVertical: spacing[24],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  emptyPapersText: {
    ...typography.body,
    color: palette.slate400,
    textAlign: 'center',
  },

  // ── Paper Card ──────────────────────────────────────────────────
  paperCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: radius.lg + 2,
    padding: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  paperCardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
  },
  paperIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[16],
    flexShrink: 0,
    alignSelf: 'center',
  },
  paperRightCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  paperContent: {
    flex: 0,
  },
  paperTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paperTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    flex: 1,
    marginRight: spacing[8],
  },
  officialBadgeFlat: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radius.sm - 3,
    flexShrink: 0,
  },
  officialBadgeFlatText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: '#008c3a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  paperYear: {
    ...typography.bodySmall,
    fontSize: 13,
    color: palette.slate500,
    marginBottom: spacing[8],
    lineHeight: 18,
  },
  paperStatsRow: {
    flexDirection: 'row',
    gap: spacing[16],
    marginBottom: spacing[8],
  },
  paperStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paperStatText: {
    ...typography.caption,
    fontSize: 12,
    color: palette.slate400,
    lineHeight: 16,
  },
  paperActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing[8],
  },
  viewPapersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: CTA_BLUE,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.xxl - 2,
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
  viewPapersText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.inverse,
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

  // ── Scroll Bottom Spacer ────────────────────────────────────────
  scrollBottomSpacer: {
    height: spacing[24],
  },
});
