/**
 * PyqPapersScreen
 *
 * Screen shown when a user taps an exam card (e.g. "JEE Main") from the
 * MockTests tab. Displays a searchable, filterable list of previous-year
 * papers grouped by year, matching the reference HTML/CSS design.
 *
 * Features:
 * - Sticky header with back button, exam title, and subtitle
 * - Search bar and filter chips scroll with the list content
 * - FlatList of year cards with calendar icon, badge, stats, and CTA
 * - Info footer explaining PYQ content
 *
 * @module screens/tests/PyqPapersScreen
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  type ListRenderItemInfo,
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

export interface PyqPapersScreenParams {
  /** Display title for the exam (e.g. "JEE Main"). */
  examTitle: string;
  /** Icon name for the exam. */
  examIcon: IconName;
}

interface PyqYearData {
  /** Year identifier, e.g. "2025". */
  year: string;
  /** Display label, e.g. "JEE Main 2025". */
  displayLabel: string;
  /** Paper description, e.g. "Paper 1" or "Paper 1 & Paper 2". */
  papers: string;
  /** Number of questions. */
  questions: number;
  /** Duration in minutes. */
  durationMin: number;
}

type FilterKey = 'all' | 'paper1' | 'paper2' | 'latest' | 'oldest';

interface FilterChip {
  key: FilterKey;
  label: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Constants & Data
// ═══════════════════════════════════════════════════════════════════

/** Brand green from the reference HTML design. */
const BRAND_GREEN = '#008c3a';

const FILTER_CHIPS: FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'paper1', label: 'Paper 1' },
  { key: 'paper2', label: 'Paper 2' },
  { key: 'latest', label: 'Latest' },
  { key: 'oldest', label: 'Oldest' },
];

const MOCK_PYQ_DATA: PyqYearData[] = [
  {
    year: '2025',
    displayLabel: 'JEE Main 2025',
    papers: 'Paper 1',
    questions: 90,
    durationMin: 180,
  },
  {
    year: '2024',
    displayLabel: 'JEE Main 2024',
    papers: 'Paper 1 & Paper 2',
    questions: 90,
    durationMin: 180,
  },
  {
    year: '2023',
    displayLabel: 'JEE Main 2023',
    papers: 'Paper 1 & Paper 2',
    questions: 90,
    durationMin: 180,
  },
  {
    year: '2022',
    displayLabel: 'JEE Main 2022',
    papers: 'Paper 1 & Paper 2',
    questions: 90,
    durationMin: 180,
  },
  {
    year: '2021',
    displayLabel: 'JEE Main 2021',
    papers: 'Paper 1 & Paper 2',
    questions: 90,
    durationMin: 180,
  },
  {
    year: '2020',
    displayLabel: 'JEE Main 2020',
    papers: 'Paper 1 & Paper 2',
    questions: 90,
    durationMin: 180,
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

// ── Header ────────────────────────────────────────────────────────

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
          <Icon
            name="arrow-left"
            color={colors.text.primary}
            width={24}
            height={24}
          />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {examTitle} Previous Year Papers
          </Text>
          <Text style={styles.headerSubtitle}>
            Practice official PYQs with real exam timing
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
        placeholder="Search by year or paper..."
        placeholderTextColor={palette.slate400}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search by year or paper"
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

// ── Year Card ─────────────────────────────────────────────────────

interface YearCardProps {
  item: PyqYearData;
  onViewPapers: (item: PyqYearData) => void;
}

const YearCard = React.memo(function YearCard({
  item,
  onViewPapers,
}: YearCardProps): React.JSX.Element {
  // Split "JEE Main 2025" into exam name and year
  const lastSpaceIndex = item.displayLabel.lastIndexOf(' ');
  const examName = lastSpaceIndex >= 0 ? item.displayLabel.slice(0, lastSpaceIndex) : item.displayLabel;
  const year = lastSpaceIndex >= 0 ? item.displayLabel.slice(lastSpaceIndex + 1) : '';

  return (
    <View style={styles.card}>
      {/* Official PYQ badge — top-right of the card */}
      <View style={styles.officialBadge}>
        <Text style={styles.officialBadgeText}>Official PYQ</Text>
      </View>

      <View style={styles.cardInner}>
        {/* Left: Calendar icon */}
        <View style={styles.cardIconContainer}>
          <Icon name="calendar" color={BRAND_GREEN} width={24} height={24} />
        </View>

        {/* Right column: content stacked above, action at bottom */}
        <View style={styles.cardRightCol}>
          {/* Content area */}
          <View style={styles.cardContent}>
            {/* Title: exam name on one line, year on next */}
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {examName}
              </Text>
              <View style={styles.cardYearRow}>
                <Text style={styles.cardYear}>{year}</Text>
              </View>
            </View>

            {/* Paper info */}
            <Text style={styles.cardPapers}>{item.papers}</Text>

            {/* Stats: questions + duration */}
            <View style={styles.cardStatsRow}>
              <View style={styles.cardStat}>
                <Icon
                  name="description"
                  color={palette.slate400}
                  width={14}
                  height={14}
                />
                <Text style={styles.cardStatText}>
                  {item.questions} Questions
                </Text>
              </View>
              <View style={styles.cardStat}>
                <Icon
                  name="timer"
                  color={palette.slate400}
                  width={14}
                  height={14}
                />
                <Text style={styles.cardStatText}>
                  {item.durationMin} Minutes
                </Text>
              </View>
            </View>

            {/* Real Exam Pattern tag */}
            <View style={styles.examPatternTag}>
              <Icon
                name="shield-check"
                color={BRAND_GREEN}
                width={12}
                height={12}
              />
              <Text style={styles.examPatternText}>Real Exam Pattern</Text>
            </View>
          </View>

          {/* View Papers — bottom-right */}
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={styles.viewPapersButton}
              onPress={() => onViewPapers(item)}
              activeOpacity={0.7}
              accessibilityLabel={`View papers for ${item.displayLabel}`}
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
          Tap any year to access all shifts and start the timed PYQ mock test.
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
  const { examTitle } = route.params;
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleFilterPress = useCallback((key: FilterKey) => {
    setActiveFilter(key);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Filtered & sorted data based on search query and filter selection
  const filteredData = useMemo(() => {
    let data = MOCK_PYQ_DATA;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      data = data.filter(
        (item) =>
          item.year.includes(query) ||
          item.displayLabel.toLowerCase().includes(query) ||
          item.papers.toLowerCase().includes(query),
      );
    }

    // Apply sort/filter by active chip
    switch (activeFilter) {
      case 'paper1':
        data = data.filter((item) => item.papers.includes('Paper 1'));
        break;
      case 'paper2':
        data = data.filter((item) => item.papers.includes('Paper 2'));
        break;
      case 'latest':
        data = [...data].sort(
          (a, b) => parseInt(b.year, 10) - parseInt(a.year, 10),
        );
        break;
      case 'oldest':
        data = [...data].sort(
          (a, b) => parseInt(a.year, 10) - parseInt(b.year, 10),
        );
        break;
      case 'all':
      default:
        // Default: newest first
        data = [...data].sort(
          (a, b) => parseInt(b.year, 10) - parseInt(a.year, 10),
        );
        break;
    }

    return data;
  }, [searchQuery, activeFilter]);

  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleViewPapers = useCallback(
    (item: PyqYearData) =>
      stackNavigation.navigate('TestInstructions', {
        examTitle,
        year: item.year,
        displayLabel: item.displayLabel,
        durationMin: item.durationMin,
        questions: item.questions,
        totalMarks: 300,
        negativeMarking: -1,
      }),
    [stackNavigation, examTitle],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PyqYearData>) => (
      <YearCard item={item} onViewPapers={handleViewPapers} />
    ),
    [handleViewPapers],
  );

  const keyExtractor = useCallback((item: PyqYearData) => item.year, []);

  // Header height used to offset list content below the sticky header.
  // Header has: safeAreaTop + spacing[12] (paddingTop)
  //             + 40 (back button height)
  //             + 20 (subtitle lineHeight)
  //             + spacing[12] (paddingBottom)
  //             + 1 (borderBottom)
  const headerHeight =
    insets.top + spacing[12] + 40 + 20 + spacing[12] + 1;

  return (
    <View style={styles.screen}>
      {/* Sticky header */}
      <Header
        safeAreaTop={insets.top}
        examTitle={examTitle}
        onBackPress={handleBackPress}
      />

      <FlatList
        data={filteredData}
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

  // ── Header ──────────────────────────────────────────────────────
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
    borderBottomColor: '#F0F0F0',
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
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    fontSize: 13,
    color: palette.slate500,
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
    backgroundColor: '#F3F4F6',
    borderRadius: radius.lg,
    marginBottom: spacing[16],
  },
  searchIconWrapper: {
    marginRight: spacing[12],
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: '#111827',
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
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: BRAND_GREEN,
    borderColor: BRAND_GREEN,
  },
  chipText: {
    ...typography.labelSmall,
    fontSize: 13,
    fontWeight: '500',
    color: palette.slate500,
  },
  chipTextActive: {
    color: colors.text.inverse,
  },

  // ── Card ────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: radius.lg + 2,
    padding: spacing[16],
    marginBottom: spacing[16],
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
  cardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#F0FDF4',
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
  cardTitleBlock: {
    marginBottom: 4,
  },
  cardTitle: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  cardYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: spacing[8],
  },
  cardYear: {
    ...typography.bodySmall,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },
  officialBadge: {
    position: 'absolute',
    top: spacing[12],
    right: spacing[12],
    backgroundColor: '#F0FDF4',
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
  cardPapers: {
    ...typography.bodySmall,
    fontSize: 13,
    color: palette.slate500,
    marginBottom: spacing[8],
    lineHeight: 18,
  },
  cardStatsRow: {
    flexDirection: 'row',
    gap: spacing[16],
    marginBottom: spacing[8],
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardStatText: {
    ...typography.caption,
    fontSize: 12,
    color: palette.slate400,
    lineHeight: 16,
  },
  examPatternTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  examPatternText: {
    ...typography.caption,
    fontSize: 11,
    color: palette.slate500,
    lineHeight: 14,
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
    borderRadius: radius.xxl - 2,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_GREEN,
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

  // ── Info Footer ─────────────────────────────────────────────────
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F4FAF6',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: radius.lg,
    padding: spacing[16],
    gap: spacing[12],
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
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
    color: '#111827',
    lineHeight: 18,
    marginBottom: 2,
  },
  infoSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: palette.slate500,
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
    color: palette.slate400,
  },
});
