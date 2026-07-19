/**
 * PyqPapersScreen
 *
 * Screen that displays the list of papers for a PYQ package, fetched
 * from the backend via `usePracticeDetail(packageId)`.
 *
 * Features:
 * - Sticky header with package name and subtitle
 * - Search bar and filter chips (operate on loaded papers)
 * - FlatList of paper cards with stats and CTA
 *
 * @module screens/tests/PyqPapersScreen
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from '../../components/home/Icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { usePracticeDetail } from '../../hooks/practice/usePractice';
import { getPaperMockMapping } from '../../services/practice/practiceService';
import { coursesDark, colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import type { PracticePaper } from '../../types/practice';
import { Alert } from 'react-native';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface PyqPapersScreenParams {
  /** UUID of the PYQ package whose papers to display. */
  packageId: string;
  /** Display name of the package (for the header). */
  packageName: string;
}

type FilterKey = 'all' | 'latest' | 'oldest';

interface FilterChip {
  key: FilterKey;
  label: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const BRAND_GREEN = coursesDark.accentPrimary;

const FILTER_CHIPS: FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'latest', label: 'Latest' },
  { key: 'oldest', label: 'Oldest' },
];

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

// ── Header ────────────────────────────────────────────────────────

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
          <Icon
            name="arrow-left"
            color={colors.text.primary}
            width={24}
            height={24}
          />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {packageName}
          </Text>
          <Text style={styles.headerSubtitle}>
            Previous Year Papers
          </Text>
        </View>
      </View>
    </View>
  );
});

// ── Search Bar ────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

const SearchBar = React.memo(function SearchBar({
  value,
  onChangeText,
}: SearchBarProps): React.JSX.Element {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchIconWrapper}>
        <Icon name="search" color={palette.slate400} width={18} height={18} />
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by year or title..."
        placeholderTextColor={palette.slate400}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search by year or title"
      />
    </View>
  );
});

// ── Filter Chips ──────────────────────────────────────────────────

interface FilterChipsProps {
  activeFilter: FilterKey;
  onFilterPress: (key: FilterKey) => void;
}

const FilterChips = React.memo(function FilterChips({
  activeFilter,
  onFilterPress,
}: FilterChipsProps): React.JSX.Element {
  return (
    <View style={styles.filterRow}>
      {FILTER_CHIPS.map((chip) => {
        const isActive = chip.key === activeFilter;
        return (
          <TouchableOpacity
            key={chip.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onFilterPress(chip.key)}
            activeOpacity={0.7}
            accessibilityLabel={`Filter: ${chip.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[styles.chipText, isActive && styles.chipTextActive]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

// ── Paper Card ────────────────────────────────────────────────────

interface PaperCardProps {
  paper: PracticePaper;
  onViewPapers: (paper: PracticePaper) => void;
}

const PaperCard = React.memo(function PaperCard({
  paper,
  onViewPapers,
}: PaperCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      {/* Official PYQ badge */}
      <View style={styles.officialBadge}>
        <Text style={styles.officialBadgeText}>Official PYQ</Text>
      </View>

      <View style={styles.cardInner}>
        {/* Left: Calendar icon */}
        <View style={styles.cardIconContainer}>
          <Icon name="calendar" color={BRAND_GREEN} width={24} height={24} />
        </View>

        {/* Right column */}
        <View style={styles.cardRightCol}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {paper.title}
            </Text>

            <View style={styles.cardYearRow}>
              <Text style={styles.cardYear}>Year: {paper.examYear}</Text>
            </View>

            <View style={styles.cardStatsRow}>
              <View style={styles.cardStat}>
                <Icon
                  name="description"
                  color={palette.slate400}
                  width={14}
                  height={14}
                />
                <Text style={styles.cardStatText}>
                  {paper.totalQuestions} Questions
                </Text>
              </View>
              {paper.durationMin ? (
                <View style={styles.cardStat}>
                  <Icon
                    name="timer"
                    color={palette.slate400}
                    width={14}
                    height={14}
                  />
                  <Text style={styles.cardStatText}>
                    {paper.durationMin} Minutes
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* View Papers */}
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={styles.viewPapersButton}
              onPress={() => onViewPapers(paper)}
              activeOpacity={0.7}
              accessibilityLabel={`View ${paper.title}`}
              accessibilityRole="button"
            >
              <Text style={styles.viewPapersText}>Attempt Paper</Text>
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

// ── Info Footer ───────────────────────────────────────────────────

const InfoFooter = React.memo(function InfoFooter(): React.JSX.Element {
  return (
    <View style={styles.infoFooter}>
      <View style={styles.infoIconContainer}>
        <Icon name="description" color={BRAND_GREEN} width={16} height={16} />
      </View>
      <View style={styles.infoTextGroup}>
        <Text style={styles.infoTitle}>
          Every paper contains official previous year questions.
        </Text>
        <Text style={styles.infoSubtitle}>
          Tap any paper to start the timed PYQ mock test.
        </Text>
      </View>
    </View>
  );
});

// ── List Header (search + filters) ────────────────────────────────

interface ListHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  activeFilter: FilterKey;
  onFilterPress: (key: FilterKey) => void;
}

const ListHeader = React.memo(function ListHeader({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterPress,
}: ListHeaderProps): React.JSX.Element {
  return (
    <View style={styles.listHeader}>
      <SearchBar value={searchQuery} onChangeText={onSearchChange} />
      <FilterChips activeFilter={activeFilter} onFilterPress={onFilterPress} />
    </View>
  );
});

// ── Empty State ───────────────────────────────────────────────────

const ListEmptyState = React.memo(function ListEmptyState(): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No papers found</Text>
    </View>
  );
});

// ── List Footer ───────────────────────────────────────────────────

const ListFooter = React.memo(function ListFooter(): React.JSX.Element {
  return (
    <View style={styles.listFooter}>
      <InfoFooter />
    </View>
  );
});

// ── Loading State ─────────────────────────────────────────────────

const LoadingState = React.memo(function LoadingState(): React.JSX.Element {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={BRAND_GREEN} />
      <Text style={styles.loadingText}>Loading papers...</Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

interface PyqPapersScreenProps {
  route: { params: PyqPapersScreenParams };
  navigation: { goBack: () => void };
}

export default function PyqPapersScreen({
  route,
  navigation,
}: PyqPapersScreenProps): React.JSX.Element {
  const { packageId, packageName } = route.params;
  const insets = useSafeAreaInsets();
  const scrollOffset = useRef(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const {
    data: detail,
    isLoading,
    error,
  } = usePracticeDetail(packageId);

  const papers = detail?.papers ?? [];

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleFilterPress = useCallback((key: FilterKey) => {
    setActiveFilter(key);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Filtered & sorted papers
  const filteredPapers = useMemo(() => {
    let data = [...papers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      data = data.filter(
        (item) =>
          String(item.examYear).includes(query) ||
          item.title.toLowerCase().includes(query),
      );
    }

    // Apply sort
    switch (activeFilter) {
      case 'latest':
        data.sort((a, b) => b.examYear - a.examYear);
        break;
      case 'oldest':
        data.sort((a, b) => a.examYear - b.examYear);
        break;
      case 'all':
      default:
        data.sort((a, b) => b.examYear - a.examYear);
        break;
    }

    return data;
  }, [papers, searchQuery, activeFilter]);

  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleViewPapers = useCallback(
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
          examTitle: packageName,
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
    [stackNavigation, packageName],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PracticePaper>) => (
      <PaperCard paper={item} onViewPapers={handleViewPapers} />
    ),
    [handleViewPapers],
  );

  const keyExtractor = useCallback((item: PracticePaper) => item.paperId, []);

  // Header height
  const headerHeight =
    insets.top + spacing[12] + 40 + 20 + spacing[12] + 1;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.current = e.nativeEvent.contentOffset.y;
    },
    [],
  );

  // ── Loading / Error ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Header
          safeAreaTop={insets.top}
          packageName={packageName}
          onBackPress={handleBackPress}
        />
        <LoadingState />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <Header
          safeAreaTop={insets.top}
          packageName={packageName}
          onBackPress={handleBackPress}
        />
        <View style={styles.loadingContainer}>
          <Icon name="bell" color={colors.error} width={40} height={40} />
          <Text style={styles.errorText}>
            Failed to load papers. Please try again.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Sticky header */}
      <Header
        safeAreaTop={insets.top}
        packageName={packageName}
        onBackPress={handleBackPress}
      />

      <FlatList
        data={filteredPapers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight },
        ]}
        ListHeaderComponent={
          <ListHeader
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            activeFilter={activeFilter}
            onFilterPress={handleFilterPress}
          />
        }
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmptyState}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
    backgroundColor: coursesDark.base,
  },

  // ── Loading / Error ─────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[48],
  },
  loadingText: {
    ...typography.body,
    color: coursesDark.textMutedOnDark,
    marginTop: spacing[12],
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing[12],
    textAlign: 'center',
    paddingHorizontal: spacing[16],
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
    backgroundColor: coursesDark.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: coursesDark.dividerOnDark,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: coursesDark.surfaceCardDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[12],
    flexShrink: 0,
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '700',
    color: coursesDark.textOnDark,
    lineHeight: 28,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    fontSize: 13,
    color: coursesDark.textMutedOnDark,
    lineHeight: 20,
    marginTop: 1,
  },

  // ── List ────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: spacing[16],
  },
  listHeader: {
    paddingTop: spacing[16],
    paddingBottom: spacing[4],
  },

  // ── Search Bar ──────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    height: 48,
    backgroundColor: coursesDark.surfaceElevated,
    borderRadius: radius.full,
    marginBottom: spacing[16],
    borderWidth: 1.5,
    borderColor: coursesDark.dividerOnDark,
  },
  searchIconWrapper: {
    marginRight: spacing[12],
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: coursesDark.textOnDark,
    paddingVertical: 0,
    lineHeight: 20,
  },

  // ── Filter Chips ────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    gap: spacing[8],
    marginBottom: spacing[12],
  },
  chip: {
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
    backgroundColor: coursesDark.surfaceCard,
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
  },
  chipActive: {
    backgroundColor: BRAND_GREEN,
    borderColor: BRAND_GREEN,
  },
  chipText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '500',
    color: coursesDark.textMutedOnDark,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // ── Card ────────────────────────────────────────────────────────
  card: {
    backgroundColor: coursesDark.surfaceCard,
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
    borderRadius: radius.xl,
    padding: spacing[16],
    marginBottom: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: coursesDark.surfaceCardDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[16],
    flexShrink: 0,
    alignSelf: 'center',
  },
  cardRightCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 0,
  },
  cardTitle: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: coursesDark.textOnDark,
    lineHeight: 22,
  },
  cardYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardYear: {
    ...typography.bodySmall,
    fontSize: 14,
    fontWeight: '700',
    color: coursesDark.textOnDark,
    lineHeight: 18,
  },
  officialBadge: {
    position: 'absolute',
    top: spacing[12],
    right: spacing[12],
    backgroundColor: coursesDark.surfaceCardDark,
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radius.sm - 3,
    zIndex: 10,
  },
  officialBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: BRAND_GREEN,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardStatsRow: {
    flexDirection: 'row',
    gap: spacing[16],
    marginBottom: spacing[8],
    marginTop: spacing[4],
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardStatText: {
    ...typography.caption,
    fontSize: 12,
    color: coursesDark.textMutedOnDark,
    lineHeight: 16,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing[8],
  },
  viewPapersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_GREEN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  viewPapersText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Info Footer ─────────────────────────────────────────────────
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: coursesDark.surfaceCardDark,
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
    borderRadius: radius.xl,
    padding: spacing[16],
    gap: spacing[12],
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: coursesDark.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
    marginTop: 1,
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  infoTextGroup: {
    flex: 1,
  },
  infoTitle: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
    color: coursesDark.textOnDark,
    lineHeight: 18,
    marginBottom: 2,
  },
  infoSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: coursesDark.textMutedOnDark,
    lineHeight: 16,
  },

  // ── Footer spacer ───────────────────────────────────────────────
  listFooter: {
    paddingVertical: spacing[24],
  },

  // ── Empty State ─────────────────────────────────────────────────
  emptyState: {
    paddingVertical: spacing[48],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: coursesDark.textMutedOnDark,
  },
});
