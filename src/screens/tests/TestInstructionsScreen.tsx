/**
 * TestInstructionsScreen
 *
 * Pre-test instructions screen matching the Figma design system. Displays:
 * - Sticky header with back button and title
 * - Scrollable body with:
 *   - Hero Card containing Title and 2x2 Summary Grid (Duration, Questions, Marks, Negative)
 *   - Syllabus Coverage card with colored subject pills
 *   - Marking Scheme card (Correct, Wrong, Unattempted)
 *   - Instructions & Guidelines numbered list
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
  /** UUID of the linked mock test (from pyq_mock_mappings). */
  testId: string;
  /** UUID of the PYQ paper. */
  paperId: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Constants & Helpers
// ═══════════════════════════════════════════════════════════════════

const EXAM_GREEN = '#006948';
const EXAM_BLUE = '#0058BE';
const EXAM_BG = '#F8FAFC';

const getSubjectsForExam = (examTitle: string): string[] => {
  const titleUpper = examTitle.toUpperCase();
  if (titleUpper.includes('NEET')) {
    return ['Physics', 'Chemistry', 'Biology'];
  }
  if (titleUpper.includes('JEE') || titleUpper.includes('GATE')) {
    return ['Physics', 'Chemistry', 'Maths'];
  }
  return ['Physics', 'Chemistry', 'Maths'];
};

const getInstructions = (
  questions: number,
  durationMin: number,
  negativeMarking: number,
  totalMarks: number
): string[] => {
  const marksPerCorrect = questions > 0 ? Math.round(totalMarks / questions) : 4;
  return [
    `The test contains ${questions} multiple-choice questions.`,
    `The total duration of the test is ${durationMin} minutes.`,
    `+${Math.abs(marksPerCorrect)} marks for each correct answer and ${Math.abs(negativeMarking)} mark for each incorrect answer.`,
    'You can mark a question for review and revisit it later.',
    'Once started, the timer cannot be paused.',
    'Do not close or leave the test screen during the test.',
  ];
};

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

// ── Sticky Header ─────────────────────────────────────────────────
interface HeaderProps {
  safeAreaTop: number;
  onBackPress: () => void;
}

const Header = React.memo(function Header({
  safeAreaTop,
  onBackPress,
}: HeaderProps): React.JSX.Element {
  return (
    <View style={[styles.header, { paddingTop: safeAreaTop + spacing[12] }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={onBackPress}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" color="#FFFFFF" width={18} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exam Instructions</Text>
      </View>
    </View>
  );
});

// ── Hero Card with Summary Grid ──────────────────────────────────
interface HeroCardProps {
  title: string;
  durationMin: number;
  questions: number;
  totalMarks: number;
  negativeMarking: number;
}

const HeroCard = React.memo(function HeroCard({
  title,
  durationMin,
  questions,
  totalMarks,
  negativeMarking,
}: HeroCardProps): React.JSX.Element {
  const summaryBlocks = [
    { icon: 'timer' as const, label: 'Duration', value: `${durationMin} Mins` },
    { icon: 'book-open' as const, label: 'Questions', value: `${questions} Qs` },
    { icon: 'trophy' as const, label: 'Max Marks', value: `${totalMarks}` },
    { icon: 'minus' as const, label: 'Negative', value: `-${Math.abs(negativeMarking)} per wrong` },
  ];

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>Computer-Based Test • National Level</Text>
      </View>

      <View style={styles.gridContainer}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCell, styles.cellRightBorder]}>
            <View style={styles.cellIconRow}>
              <Icon name={summaryBlocks[0].icon} color={palette.slate400} width={15} height={15} />
              <Text style={styles.cellLabel}>{summaryBlocks[0].label}</Text>
            </View>
            <Text style={styles.cellValue}>{summaryBlocks[0].value}</Text>
          </View>
          <View style={styles.gridCell}>
            <View style={styles.cellIconRow}>
              <Icon name={summaryBlocks[1].icon} color={palette.slate400} width={15} height={15} />
              <Text style={styles.cellLabel}>{summaryBlocks[1].label}</Text>
            </View>
            <Text style={styles.cellValue}>{summaryBlocks[1].value}</Text>
          </View>
        </View>

        {/* Row 2 */}
        <View style={[styles.gridRow, styles.cellTopBorder]}>
          <View style={[styles.gridCell, styles.cellRightBorder]}>
            <View style={styles.cellIconRow}>
              <Icon name={summaryBlocks[2].icon} color={palette.slate400} width={15} height={15} />
              <Text style={styles.cellLabel}>{summaryBlocks[2].label}</Text>
            </View>
            <Text style={styles.cellValue}>{summaryBlocks[2].value}</Text>
          </View>
          <View style={styles.gridCell}>
            <View style={styles.cellIconRow}>
              <Icon name={summaryBlocks[3].icon} color={palette.slate400} width={15} height={15} />
              <Text style={styles.cellLabel}>{summaryBlocks[3].label}</Text>
            </View>
            <Text style={styles.cellValue}>{summaryBlocks[3].value}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

// ── Syllabus Coverage Card ───────────────────────────────────────
interface SyllabusCardProps {
  examTitle: string;
  questions: number;
}

const SyllabusCard = React.memo(function SyllabusCard({
  examTitle,
  questions,
}: SyllabusCardProps): React.JSX.Element {
  const subjects = getSubjectsForExam(examTitle);
  const qPerSubject = subjects.length > 0 ? Math.round(questions / subjects.length) : 30;

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case 'Physics':
        return { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' };
      case 'Chemistry':
        return { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' };
      case 'Maths':
        return { bg: '#F5F3FF', text: '#6D28D9', dot: '#7C3AED' };
      case 'Biology':
        return { bg: '#FFF5F5', text: '#C53030', dot: '#E53E3E' };
      default:
        return { bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' };
    }
  };

  return (
    <View style={styles.contentCard}>
      <Text style={styles.sectionHeaderTitle}>Syllabus Coverage</Text>
      <View style={styles.pillsContainer}>
        {subjects.map((subject) => {
          const colors = getSubjectColor(subject);
          return (
            <View key={subject} style={[styles.pill, { backgroundColor: colors.bg }]}>
              <View style={[styles.pillDot, { backgroundColor: colors.dot }]} />
              <Text style={[styles.pillText, { color: colors.text }]}>{subject}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.syllabusFooterText}>
        {qPerSubject} questions from each subject • Full {examTitle} syllabus
      </Text>
    </View>
  );
});

// ── Marking Scheme Card ──────────────────────────────────────────
interface MarkingSchemeCardProps {
  totalMarks: number;
  questions: number;
  negativeMarking: number;
}

const MarkingSchemeCard = React.memo(function MarkingSchemeCard({
  totalMarks,
  questions,
  negativeMarking,
}: MarkingSchemeCardProps): React.JSX.Element {
  const marksPerCorrect = questions > 0 ? Math.round(totalMarks / questions) : 4;

  return (
    <View style={styles.contentCard}>
      <Text style={styles.sectionHeaderTitle}>Marking Scheme</Text>
      <View style={styles.schemeContainer}>
        {/* Correct */}
        <View style={[styles.schemeRow, { backgroundColor: '#F0FDF4' }]}>
          <View style={styles.schemeLeft}>
            <Icon name="check-circle" color="#15803D" width={16} height={16} />
            <Text style={[styles.schemeLabelText, { color: '#166534' }]}>Correct Answer</Text>
          </View>
          <Text style={[styles.schemeMarkText, { color: '#15803D' }]}>+{marksPerCorrect} marks</Text>
        </View>

        {/* Wrong */}
        <View style={[styles.schemeRow, { backgroundColor: '#FEF2F2' }]}>
          <View style={styles.schemeLeft}>
            <Icon name="x-circle" color="#EF4444" width={16} height={16} />
            <Text style={[styles.schemeLabelText, { color: '#991B1B' }]}>Wrong Answer</Text>
          </View>
          <Text style={[styles.schemeMarkText, { color: '#DC2626' }]}>-{Math.abs(negativeMarking)} mark</Text>
        </View>

        {/* Unattempted */}
        <View style={[styles.schemeRow, { backgroundColor: '#F9FAFB' }]}>
          <View style={styles.schemeLeft}>
            <Icon name="info" color="#9CA3AF" width={16} height={16} />
            <Text style={[styles.schemeLabelText, { color: '#4B5563' }]}>Unattempted</Text>
          </View>
          <Text style={[styles.schemeMarkText, { color: '#6B7280' }]}>0 marks</Text>
        </View>
      </View>
    </View>
  );
});

// ── Instructions & Guidelines Card ───────────────────────────────
interface GuidelinesCardProps {
  questions: number;
  durationMin: number;
  negativeMarking: number;
  totalMarks: number;
}

const GuidelinesCard = React.memo(function GuidelinesCard({
  questions,
  durationMin,
  negativeMarking,
  totalMarks,
}: GuidelinesCardProps): React.JSX.Element {
  const instructions = getInstructions(questions, durationMin, negativeMarking, totalMarks);

  return (
    <View style={styles.contentCard}>
      <Text style={styles.sectionHeaderTitle}>Instructions & Guidelines</Text>
      <View style={styles.guidelinesContainer}>
        {instructions.map((instruction, index) => (
          <View key={index} style={styles.guidelineRow}>
            <View style={styles.guidelineBadge}>
              <Text style={styles.guidelineBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.guidelineText}>{instruction}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ── Fixed Bottom Bar ──────────────────────────────────────────────
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
          <Text style={styles.startButtonText}>Start Test</Text>
        </TouchableOpacity>
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
    year,
    displayLabel,
    durationMin,
    questions,
    totalMarks,
    negativeMarking,
    testId,
    paperId,
  } = route.params;

  const insets = useSafeAreaInsets();
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleStartTest = useCallback(() => {
    stackNavigation.navigate('TestEngine', {
      testId,
      paperId,
      title: displayLabel,
      shortTitle: `${examTitle} ${year}`,
      durationMin,
      totalQuestions: questions,
      totalMarks,
      negativeMarking,
    });
  }, [stackNavigation, testId, paperId, displayLabel, examTitle, year, durationMin, questions, totalMarks, negativeMarking]);

  // Header dimensions
  const headerHeight = insets.top + 48 + spacing[12];
  // Bottom bar height
  const bottomBarHeight = 54 + spacing[16] + insets.bottom;

  return (
    <View style={styles.screen}>
      <Header safeAreaTop={insets.top} onBackPress={handleBackPress} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing[16],
          paddingBottom: bottomBarHeight + spacing[16],
          paddingHorizontal: spacing[16],
        }}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
      >
        {/* Hero & Summary */}
        <HeroCard
          title={displayLabel}
          durationMin={durationMin}
          questions={questions}
          totalMarks={totalMarks}
          negativeMarking={negativeMarking}
        />

        {/* Syllabus Coverage */}
        <SyllabusCard examTitle={examTitle} questions={questions} />

        {/* Marking Scheme */}
        <MarkingSchemeCard
          totalMarks={totalMarks}
          questions={questions}
          negativeMarking={negativeMarking}
        />

        {/* Instructions */}
        <GuidelinesCard
          questions={questions}
          durationMin={durationMin}
          negativeMarking={negativeMarking}
          totalMarks={totalMarks}
        />

        {/* Agreement note */}
        <Text style={styles.agreementText}>
          By starting the test, you agree to follow all the instructions above.
        </Text>
      </ScrollView>

      <BottomBar safeAreaBottom={insets.bottom} onStartPress={handleStartTest} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: EXAM_BG,
  },
  scrollView: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: EXAM_GREEN,
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    gap: spacing[12],
  },
  headerBackButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },

  // ── Hero Card ─────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heroHeader: {
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  heroTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  heroSubtitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: spacing[4],
  },
  gridContainer: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    width: '100%',
  },
  gridCell: {
    flex: 1,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
  },
  cellRightBorder: {
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  cellTopBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cellIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[4],
  },
  cellLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellValue: {
    ...typography.title,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  // ── General Content Cards ─────────────────────────────────────────
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    marginBottom: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeaderTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing[12],
  },

  // ── Syllabus ──────────────────────────────────────────────────────
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginBottom: spacing[12],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '700',
  },
  syllabusFooterText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },

  // ── Marking Scheme ────────────────────────────────────────────────
  schemeContainer: {
    gap: spacing[8],
  },
  schemeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.md,
  },
  schemeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  schemeLabelText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
  },
  schemeMarkText: {
    ...typography.title,
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Guidelines List ───────────────────────────────────────────────
  guidelinesContainer: {
    gap: spacing[12],
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  guidelineBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: EXAM_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  guidelineBadgeText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guidelineText: {
    ...typography.body,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    flex: 1,
  },

  // ── Agreement ─────────────────────────────────────────────────────
  agreementText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: spacing[8],
    marginBottom: spacing[24],
  },

  // ── Sticky Bottom Bar ─────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomBarInner: {
    width: '100%',
  },
  startButton: {
    backgroundColor: EXAM_BLUE,
    paddingVertical: spacing[12],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: EXAM_BLUE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  startButtonText: {
    ...typography.button,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
