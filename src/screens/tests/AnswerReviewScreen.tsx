/**
 * AnswerReviewScreen
 *
 * Displays a lightweight scrollable list of every attempted question.
 * Each card shows the question number, subject, status (Correct/Incorrect/Skipped),
 * and marks awarded. Tapping a card navigates to AnswerReviewDetailScreen.
 *
 * Design principle: keep the list lightweight — no full question content here.
 *
 * @module screens/tests/AnswerReviewScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
import * as reviewService from '../../services/reviewService';
import type { ReviewItem } from '../../types/review';
import type { AnswerReviewParams } from '../../types/review';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════
//  Navigation Params
// ═══════════════════════════════════════════════════════════════════

export type { AnswerReviewParams };

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  correct: {
    label: 'Correct',
    icon: 'check-circle' as const,
    color: colors.success,
    bgColor: '#E8F5E9',
  },
  incorrect: {
    label: 'Incorrect',
    icon: 'x-circle' as const,
    color: colors.error,
    bgColor: '#FFEBEE',
  },
  skipped: {
    label: 'Skipped',
    icon: 'minus-circle' as const,
    color: palette.slate400,
    bgColor: '#F1F5F9',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: ReviewItem['status'] }): React.JSX.Element {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
      <Icon name={config.icon} color={config.color} width={14} height={14} />
      <Text style={[styles.statusBadgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

interface QuestionCardProps {
  item: ReviewItem;
  onPress: (index: number) => void;
}

const QuestionCard = React.memo(function QuestionCard({
  item,
  onPress,
}: QuestionCardProps): React.JSX.Element {
  const config = STATUS_CONFIG[item.status];

  const marksColor =
    item.marksAwarded > 0
      ? colors.success
      : item.marksAwarded < 0
        ? colors.error
        : palette.slate400;

  const marksPrefix = item.marksAwarded > 0 ? '+' : '';

  return (
    <TouchableOpacity
      style={styles.questionCard}
      onPress={() => onPress(item.index - 1)}
      activeOpacity={0.7}
      accessibilityLabel={`Question ${item.index}, ${config.label}`}
      accessibilityRole="button"
    >
      <View style={styles.cardLeft}>
        {/* Question number circle */}
        <View style={[styles.questionNumberCircle, { borderColor: config.color }]}>
          <Text style={[styles.questionNumberText, { color: config.color }]}>
            {item.index}
          </Text>
        </View>

        <View style={styles.cardInfo}>
          {/* Subject label */}
          {item.subjectName ? (
            <Text style={styles.subjectLabel} numberOfLines={1}>
              {item.subjectName}
            </Text>
          ) : null}

          {/* Status badge */}
          <StatusBadge status={item.status} />
        </View>
      </View>

      <View style={styles.cardRight}>
        <Text style={[styles.marksText, { color: marksColor }]}>
          {marksPrefix}{item.marksAwarded} Marks
        </Text>
        <View style={styles.viewSolutionRow}>
          <Text style={styles.viewSolutionText}>View Solution</Text>
          <Icon name="chevron-right" color={colors.primary} width={14} height={14} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Summary Header ───────────────────────────────────────────────

function ReviewSummary({
  items,
}: {
  items: ReviewItem[];
}): React.JSX.Element {
  const correct = items.filter((i) => i.status === 'correct').length;
  const incorrect = items.filter((i) => i.status === 'incorrect').length;
  const skipped = items.filter((i) => i.status === 'skipped').length;

  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryDot, { backgroundColor: colors.success }]} />
        <Text style={styles.summaryLabel}>Correct</Text>
        <Text style={[styles.summaryValue, { color: colors.success }]}>{correct}</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryDot, { backgroundColor: colors.error }]} />
        <Text style={styles.summaryLabel}>Incorrect</Text>
        <Text style={[styles.summaryValue, { color: colors.error }]}>{incorrect}</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryDot, { backgroundColor: palette.slate400 }]} />
        <Text style={styles.summaryLabel}>Skipped</Text>
        <Text style={[styles.summaryValue, { color: palette.slate400 }]}>{skipped}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

interface AnswerReviewScreenProps {
  route: { params: AnswerReviewParams };
  navigation: { goBack: () => void };
}

export default function AnswerReviewScreen({
  route,
  navigation,
}: AnswerReviewScreenProps): React.JSX.Element {
  const { testId, attemptId } = route.params;
  const insets = useSafeAreaInsets();
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await reviewService.getAnswerReviewList(testId, attemptId);
        if (!isMounted) return;

        if (result.success) {
          setItems(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load review data.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [testId, attemptId]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleQuestionPress = useCallback(
    (questionIndex: number) => {
      stackNavigation.navigate('AnswerReviewDetail', {
        testId,
        attemptId,
        questionIndex,
        totalQuestions: items.length,
      });
    },
    [stackNavigation, testId, attemptId, items.length],
  );

  const renderItem = useCallback(
    ({ item }: { item: ReviewItem }) => (
      <QuestionCard item={item} onPress={handleQuestionPress} />
    ),
    [handleQuestionPress],
  );

  const keyExtractor = useCallback(
    (item: ReviewItem) => String(item.index),
    [],
  );

  // ── Loading State ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-left" color={colors.text.primary} width={24} height={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Answers</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading answers...</Text>
        </View>
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────

  if (error) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-left" color={colors.text.primary} width={24} height={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Answers</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Icon name="bell" color={colors.error} width={40} height={40} />
          </View>
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              setError(null);
              reviewService.getAnswerReviewList(testId, attemptId).then((res) => {
                if (res.success) setItems(res.data);
                else setError(res.error);
                setIsLoading(false);
              });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Empty State ────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-left" color={colors.text.primary} width={24} height={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Answers</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No questions available for review.</Text>
        </View>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-left" color={colors.text.primary} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Answers</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Summary */}
      <ReviewSummary items={items} />

      {/* Question List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.slate100,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: palette.slate800,
  },
  headerSpacer: {
    width: 40,
  },

  // ── Summary ────────────────────────────────────────────────────
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.slate100,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 12,
    color: palette.slate500,
  },
  summaryValue: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── List ───────────────────────────────────────────────────────
  listContent: {
    padding: spacing[16],
    gap: spacing[8],
    paddingBottom: spacing[32],
  },

  // ── Question Card ──────────────────────────────────────────────
  questionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[12],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    flex: 1,
  },
  questionNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
  },
  cardInfo: {
    gap: 4,
    flex: 1,
  },
  subjectLabel: {
    ...typography.caption,
    fontSize: 11,
    color: palette.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  marksText: {
    ...typography.subtitle,
    fontSize: 13,
    fontWeight: '700',
  },
  viewSolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewSolutionText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Status Badge ──────────────────────────────────────────────
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },

  // ── States ─────────────────────────────────────────────────────
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[32],
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: palette.slate500,
    marginTop: spacing[16],
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[24],
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[16],
  },
  errorTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: '600',
    color: palette.slate800,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: radius.md,
  },
  retryButtonText: {
    ...typography.button,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyText: {
    ...typography.body,
    fontSize: 15,
    color: palette.slate500,
    textAlign: 'center',
  },
});
