/**
 * TestInstructionsScreen
 *
 * Pre-test instructions screen shown when a user taps "View Papers" on a
 * year card from PyqPapersScreen. Displays:
 * - Sticky header with back button, exam title, and more menu
 * - Hero banner with exam year
 * - Summary grid (Duration, Questions, Marks, Negative Marking)
 * - Instructions list
 * - Syllabus Covered section with tags
 * - Fixed bottom bar with "Start Test" button
 *
 * @module screens/tests/TestInstructionsScreen
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
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface TestInstructionsParams {
  /** Display title for the exam (e.g. "JEE Main"). */
  examTitle: string;
  /** Year identifier, e.g. "2025". */
  year: string;
  /** Full display label, e.g. "JEE Main 2025". */
  displayLabel: string;
  /** Duration in minutes. */
  durationMin: number;
  /** Number of questions. */
  questions: number;
  /** Total marks. */
  totalMarks: number;
  /** Negative marking per wrong answer. */
  negativeMarking: number;
}

interface SummaryItem {
  label: string;
  value: string;
  subtitle?: string;
  icon: IconName;
  iconBg: string;
  iconColor: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const BRAND_GREEN = '#006948';

const INSTRUCTIONS: string[] = [
  'The test contains 90 multiple-choice questions.',
  'The total duration of the test is 180 minutes.',
  '+4 marks for each correct answer and -1 mark for each incorrect answer.',
  'You can mark a question for review and revisit it later.',
  'Once started, the timer cannot be paused.',
  'Do not refresh or leave the test screen during the test.',
];

const SYLLABUS_TAGS: string[] = ['Physics', 'Chemistry', 'Mathematics'];

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
          style={styles.headerIconButton}
          onPress={onBackPress}
          activeOpacity={0.6}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" color={BRAND_GREEN} width={24} height={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {examTitle} Prep
        </Text>

        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.6}
          accessibilityLabel="More options"
          accessibilityRole="button"
        >
          <Icon
            name="more-vertical"
            color={BRAND_GREEN}
            width={24}
            height={24}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ── Hero Banner ───────────────────────────────────────────────────

interface HeroBannerProps {
  displayLabel: string;
}

const HeroBanner = React.memo(function HeroBanner({
  displayLabel,
}: HeroBannerProps): React.JSX.Element {
  return (
    <View style={styles.heroBanner}>
      <Text style={styles.heroTitle}>{displayLabel}</Text>
    </View>
  );
});

// ── Summary Grid ──────────────────────────────────────────────────

interface SummaryGridProps {
  durationMin: number;
  questions: number;
  totalMarks: number;
  negativeMarking: number;
}

const SummaryGrid = React.memo(function SummaryGrid({
  durationMin,
  questions,
  totalMarks,
  negativeMarking,
}: SummaryGridProps): React.JSX.Element {
  const summaryItems: SummaryItem[] = [
    {
      label: 'Duration',
      value: `${durationMin} Mins`,
      icon: 'timer',
      iconBg: 'rgba(0, 105, 72, 0.12)',
      iconColor: BRAND_GREEN,
    },
    {
      label: 'Questions',
      value: `${questions} Qs`,
      icon: 'description',
      iconBg: '#DAE2FD',
      iconColor: '#2170E4',
    },
    {
      label: 'Marks',
      value: `${totalMarks}`,
      icon: 'trophy',
      iconBg: '#D8E2FF',
      iconColor: '#0058BE',
    },
    {
      label: 'Neg. Marking',
      value: `${negativeMarking}`,
      subtitle: '(per wrong answer)',
      icon: 'shield-check',
      iconBg: '#FFDAD6',
      iconColor: '#BA1A1A',
    },
  ];

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryGrid}>
        {summaryItems.map((item, index) => (
          <View key={index} style={styles.summaryItem}>
            <View
              style={[
                styles.summaryIconContainer,
                { backgroundColor: item.iconBg },
              ]}
            >
              <Icon
                name={item.icon}
                color={item.iconColor}
                width={22}
                height={22}
              />
            </View>
            <Text style={styles.summaryLabel}>
              {item.label.toUpperCase()}
            </Text>
            <Text style={styles.summaryValue}>{item.value}</Text>
            {item.subtitle && (
              <Text style={styles.summarySubtitle}>{item.subtitle}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
});

// ── Instructions Section ──────────────────────────────────────────

const InstructionsSection = React.memo(function InstructionsSection(): React.JSX.Element {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Icon name="clipboard-list" color={BRAND_GREEN} width={22} height={22} />
        <Text style={styles.sectionTitle}>Instructions</Text>
      </View>
      <View style={styles.instructionsList}>
        {INSTRUCTIONS.map((instruction, index) => (
          <View key={index} style={styles.instructionRow}>
            <View style={styles.bullet} />
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ── Syllabus Section ──────────────────────────────────────────────

const SyllabusSection = React.memo(function SyllabusSection(): React.JSX.Element {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Icon name="book" color={BRAND_GREEN} width={22} height={22} />
        <Text style={styles.sectionTitle}>Syllabus Covered</Text>
      </View>
      <View style={styles.tagRow}>
        {SYLLABUS_TAGS.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.syllabusDescription}>
        Full JEE Main Class 11th & 12th Syllabus as per NTA.
      </Text>
    </View>
  );
});

// ── Sticky Bottom Bar ─────────────────────────────────────────────

interface BottomBarProps {
  safeAreaBottom: number;
  onStartPress: () => void;
}

const BottomBar = React.memo(function BottomBar({
  safeAreaBottom,
  onStartPress,
}: BottomBarProps): React.JSX.Element {
  return (
    <View style={[styles.bottomBar, { paddingBottom: safeAreaBottom + spacing[16] }]}>
      <View style={styles.bottomBarInner}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={onStartPress}
          activeOpacity={0.85}
          accessibilityLabel="Start test"
          accessibilityRole="button"
        >
          <Icon
            name="play-circle"
            color={colors.text.inverse}
            width={22}
            height={22}
          />
          <Text style={styles.startButtonText}>Start Test</Text>
        </TouchableOpacity>

        <View style={styles.lockNotice}>
          <Icon
            name="eye"
            color={palette.slate500}
            width={14}
            height={14}
          />
          <Text style={styles.lockNoticeText}>
            Your test will start immediately
          </Text>
        </View>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

interface TestInstructionsScreenProps {
  route: { params: TestInstructionsParams };
  navigation: { goBack: () => void };
}

export default function TestInstructionsScreen({
  route,
  navigation,
}: TestInstructionsScreenProps): React.JSX.Element {
  const {
    examTitle,
    displayLabel,
    durationMin,
    questions,
    totalMarks,
    negativeMarking,
  } = route.params;
  const insets = useSafeAreaInsets();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleStartTest = useCallback(() => {
    stackNavigation.navigate('TestEngine', {
      testId: 'test_jee_main_2025',
      paperId: 'jee_main_2025_shift1',
      title: 'JEE Advanced: Practice Test 01',
      shortTitle: 'Test 01',
      durationMin,
      totalQuestions: questions,
      totalMarks,
      negativeMarking,
    });
  }, [stackNavigation, durationMin, questions, totalMarks, negativeMarking]);

  // Header height: safeAreaTop + spacing[12] (paddingTop)
  //                + 40 (icon height)
  //                + spacing[12] (paddingBottom)
  //                + 1 (borderBottom)
  const headerHeight =
    insets.top + spacing[12] + 40 + spacing[12] + 1;

  // Bottom bar height: 52 (button height) + spacing[12] (gap)
  //                    + 16 (lock notice height) + spacing[16] (padding)
  //                    + safeAreaBottom
  const bottomBarHeight = 52 + spacing[12] + 16 + spacing[16] + insets.bottom;

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
          paddingTop: headerHeight + spacing[16],
          paddingBottom: bottomBarHeight + spacing[16],
        }}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
      >
        

        {/* Summary Grid */}
        <SummaryGrid
          durationMin={durationMin}
          questions={questions}
          totalMarks={totalMarks}
          negativeMarking={negativeMarking}
        />

        {/* Instructions */}
        <InstructionsSection />

        {/* Syllabus */}
        <SyllabusSection />
      </ScrollView>

      {/* Fixed bottom bar */}
      <BottomBar
        safeAreaBottom={insets.bottom}
        onStartPress={handleStartTest}
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
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.slate100,
  },
  headerTitle: {
    ...typography.heading3,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: spacing[8],
  },

  // ── Hero Banner ─────────────────────────────────────────────────
  heroBanner: {
    marginHorizontal: spacing[16],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[24],
    marginBottom: spacing[20],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  heroTitle: {
    ...typography.heading2,
    fontSize: 28,
    fontWeight: '700',
    color: BRAND_GREEN,
    lineHeight: 36,
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  // ── Summary Card ────────────────────────────────────────────────
  summaryCard: {
    marginHorizontal: spacing[16],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing[16],
    marginBottom: spacing[20],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[16],
  },
  summaryItem: {
    width: '46%',
    alignItems: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    borderRadius: radius.sm,
    backgroundColor: palette.slate50,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: palette.slate500,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryValue: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
  },
  summarySubtitle: {
    ...typography.caption,
    fontSize: 10,
    color: palette.slate500,
    lineHeight: 12,
    marginTop: 1,
  },

  // ── Section Card (Instructions & Syllabus) ──────────────────────
  sectionCard: {
    marginHorizontal: spacing[16],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing[16],
    marginBottom: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[16],
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
  },

  // ── Instructions ────────────────────────────────────────────────
  instructionsList: {
    gap: spacing[12],
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_GREEN,
    marginTop: spacing[8],
    flexShrink: 0,
  },
  instructionText: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate600,
    lineHeight: 20,
    flex: 1,
  },

  // ── Syllabus ────────────────────────────────────────────────────
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginBottom: spacing[12],
  },
  tag: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
    backgroundColor: palette.slate50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagText: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '600',
    color: '#2170E4',
    lineHeight: 16,
  },
  syllabusDescription: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate500,
    lineHeight: 20,
  },

  // ── Sticky Bottom Bar ───────────────────────────────────────────
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
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  bottomBarInner: {
    alignItems: 'center',
    gap: spacing[12],
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: BRAND_GREEN,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: radius.md,
    width: '100%',
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
  startButtonText: {
    ...typography.button,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  lockNoticeText: {
    ...typography.caption,
    fontSize: 12,
    color: palette.slate500,
    lineHeight: 16,
  },
});
