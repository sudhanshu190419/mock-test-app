/**
 * AnswerReviewDetailScreen
 *
 * Displays the full question with all options, student's selected answer,
 * correct answer, marks awarded, and explanation.
 *
 * Supports:
 * - Text-only, image-only, and text+image options
 * - Blue outline for student selection
 * - Green outline for correct answer
 * - Red outline for wrong selected answer
 * - Previous/Next navigation at the bottom
 * - Lazy-loaded images
 * - Error handling for missing data
 *
 * @module screens/tests/AnswerReviewDetailScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
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
import type {
  ReviewQuestionDetail,
  ReviewOptionDisplay,
  AnswerReviewDetailParams,
  ReviewQuestionStatus,
} from '../../types/review';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════
//  Navigation Params
// ═══════════════════════════════════════════════════════════════════

export type { AnswerReviewDetailParams };

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const OPTION_COLORS = {
  selected: {
    border: colors.primary,  // Blue outline
    bg: 'rgba(0, 105, 72, 0.05)',
    label: 'Your Answer',
  },
  correct: {
    border: colors.success,  // Green outline
    bg: 'rgba(34, 197, 94, 0.08)',
    label: 'Correct Answer',
  },
  wrong: {
    border: colors.error,  // Red outline
    bg: 'rgba(220, 38, 38, 0.08)',
    label: 'Your Answer',
  },
  neutral: {
    border: palette.slate200,
    bg: colors.surface,
    label: '',
  },
} as const;

const STATUS_CONFIG: Record<ReviewQuestionStatus, { label: string; color: string; bg: string }> = {
  correct: { label: 'Correct', color: colors.success, bg: '#E8F5E9' },
  incorrect: { label: 'Incorrect', color: colors.error, bg: '#FFEBEE' },
  skipped: { label: 'Skipped', color: palette.slate400, bg: '#F1F5F9' },
};

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════

// ── Status Banner ────────────────────────────────────────────────

function StatusBanner({
  status,
  marksAwarded,
  marks,
}: {
  status: ReviewQuestionStatus;
  marksAwarded: number;
  marks: number;
}): React.JSX.Element {
  const config = STATUS_CONFIG[status];
  const marksPrefix = marksAwarded > 0 ? '+' : '';

  return (
    <View style={[styles.statusBanner, { backgroundColor: config.bg }]}>
      <View style={styles.statusBannerLeft}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusBannerLabel, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
      <Text style={[styles.statusBannerMarks, { color: config.color }]}>
        {marksPrefix}{marksAwarded} / {marks} Marks
      </Text>
    </View>
  );
}

// ── Option Row ───────────────────────────────────────────────────

function ReviewOption({
  option,
}: {
  option: ReviewOptionDisplay;
}): React.JSX.Element {
  const colorConfig = OPTION_COLORS[option.feedback];

  return (
    <View
      style={[
        styles.optionContainer,
        {
          borderColor: colorConfig.border,
          backgroundColor: colorConfig.bg,
        },
        option.feedback === 'selected' && styles.optionContainerSelected,
      ]}
      accessibilityLabel={`Option ${option.label}: ${option.text}`}
    >
      <Text style={styles.optionLabel}>{option.label}.</Text>

      <View style={styles.optionContent}>
        {option.text ? (
          <Text
            style={[
              styles.optionText,
              option.feedback !== 'neutral' && styles.optionTextHighlighted,
            ]}
          >
            {option.text}
          </Text>
        ) : null}

        {option.imageUrl ? (
          <View style={styles.optionImageContainer}>
            <Image
              source={{ uri: option.imageUrl }}
              style={styles.optionImage}
              resizeMode="contain"
              accessibilityLabel={`Option ${option.label} image`}
            />
          </View>
        ) : null}

        {/* Feedback label */}
        {colorConfig.label ? (
          <View
            style={[
              styles.optionFeedbackBadge,
              {
                backgroundColor:
                  option.feedback === 'correct'
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(0, 105, 72, 0.1)',
              },
            ]}
          >
            <Text
              style={[
                styles.optionFeedbackText,
                { color: colorConfig.border },
              ]}
            >
              {colorConfig.label}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Explanation Section ──────────────────────────────────────────

function ExplanationSection({
  text,
  images,
  videoUrl,
  isLoading,
  hasError,
}: {
  text: string | null;
  images: string[];
  videoUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}): React.JSX.Element {
  if (isLoading) {
    return (
      <View style={styles.explanationContainer}>
        <Text style={styles.sectionTitle}>Explanation</Text>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.explanationContainer}>
        <Text style={styles.sectionTitle}>Explanation</Text>
        <Text style={styles.explanationUnavailable}>
          Explanation unavailable. It may not have been added yet.
        </Text>
      </View>
    );
  }

  if (!text && images.length === 0 && !videoUrl) {
    return (
      <View style={styles.explanationContainer}>
        <Text style={styles.sectionTitle}>Explanation</Text>
        <Text style={styles.explanationUnavailable}>
          No explanation available for this question.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.explanationContainer}>
      <Text style={styles.sectionTitle}>Explanation</Text>

      {text ? (
        <Text style={styles.explanationText} selectable>
          {text}
        </Text>
      ) : null}

      {images.map((url, idx) => (
        <View key={`exp-img-${idx}`} style={styles.explanationImageContainer}>
          <Image
            source={{ uri: url }}
            style={styles.explanationImage}
            resizeMode="contain"
            accessibilityLabel={`Explanation image ${idx + 1}`}
          />
        </View>
      ))}

      {videoUrl ? (
        <TouchableOpacity
          style={styles.videoButton}
          onPress={() => {
            Linking.openURL(videoUrl).catch(() => {
              // Silently fail if URL cannot be opened
            });
          }}
          activeOpacity={0.8}
          accessibilityLabel="Watch explanation video"
          accessibilityRole="link"
        >
          <Icon name="play-circle" color="#FFFFFF" width={20} height={20} />
          <Text style={styles.videoButtonText}>Watch Video Explanation</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Question Metadata ────────────────────────────────────────────

function QuestionMetadata({
  index,
  subjectName,
  chapterName,
  difficulty,
  marks,
  negativeMarks,
}: {
  index: number;
  subjectName: string | null;
  chapterName: string | null;
  difficulty: string | null;
  marks: number;
  negativeMarks: number;
}): React.JSX.Element {
  return (
    <View style={styles.metadataContainer}>
      <Text style={styles.metadataQuestionNum}>Question {index}</Text>

      <View style={styles.metadataBadges}>
        {subjectName ? (
          <View style={styles.metadataBadge}>
            <Text style={styles.metadataBadgeText}>{subjectName}</Text>
          </View>
        ) : null}

        {difficulty ? (
          <View
            style={[
              styles.metadataBadge,
              difficulty === 'easy'
                ? styles.difficultyEasy
                : difficulty === 'hard'
                  ? styles.difficultyHard
                  : styles.difficultyMedium,
            ]}
          >
            <Text
              style={[
                styles.metadataBadgeText,
                difficulty === 'easy'
                  ? { color: colors.success }
                  : difficulty === 'hard'
                    ? { color: colors.error }
                    : { color: '#D97706' },
              ]}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Text>
          </View>
        ) : null}

        <View style={styles.metadataBadge}>
          <Text style={styles.metadataBadgeText}>
            +{marks} / -{negativeMarks}
          </Text>
        </View>
      </View>

      {chapterName ? (
        <Text style={styles.metadataChapter}>{chapterName}</Text>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

interface AnswerReviewDetailScreenProps {
  route: { params: AnswerReviewDetailParams };
  navigation: { goBack: () => void };
}

export default function AnswerReviewDetailScreen({
  route,
  navigation,
}: AnswerReviewDetailScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const { testId, attemptId, questionIndex, totalQuestions } = route.params;
  const [detail, setDetail] = useState<ReviewQuestionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const result = await reviewService.getReviewQuestionDetail(
          testId,
          attemptId,
          questionIndex,
        );

        if (!isMounted) return;

        if (result.success) {
          setDetail(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load question detail.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [testId, attemptId, questionIndex]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePrevious = useCallback(() => {
    if (questionIndex > 0) {
      stackNavigation.replace('AnswerReviewDetail', {
        testId,
        attemptId,
        questionIndex: questionIndex - 1,
        totalQuestions,
      });
    }
  }, [questionIndex, stackNavigation, testId, attemptId, totalQuestions]);

  const handleNext = useCallback(() => {
    stackNavigation.replace('AnswerReviewDetail', {
      testId,
      attemptId,
      questionIndex: questionIndex + 1,
      totalQuestions,
    });
  }, [questionIndex, stackNavigation, testId, attemptId, totalQuestions]);

  // Both back button and list button navigate to the list screen
  const handleBackToList = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
          <Text style={styles.headerTitle}>Question Review</Text>
          <TouchableOpacity
            onPress={handleBackToList}
            style={styles.listButton}
            accessibilityLabel="Back to question list"
            accessibilityRole="button"
          >
            <Icon name="list" color={colors.primary} width={22} height={22} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading question...</Text>
        </View>
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────

  if (error || !detail) {
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
          <Text style={styles.headerTitle}>Question Review</Text>
          <TouchableOpacity
            onPress={handleBackToList}
            style={styles.listButton}
            accessibilityLabel="Back to question list"
            accessibilityRole="button"
          >
            <Icon name="list" color={colors.primary} width={22} height={22} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Icon name="bell" color={colors.error} width={40} height={40} />
          </View>
          <Text style={styles.errorTitle}>Cannot Load Question</Text>
          <Text style={styles.errorText}>{error ?? 'Question data is missing.'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              setError(null);
              reviewService
                .getReviewQuestionDetail(testId, attemptId, questionIndex)
                .then((res) => {
                  if (res.success) setDetail(res.data);
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

  // ── Render ─────────────────────────────────────────────────────

  const isFirst = questionIndex === 0;
  const isLast = questionIndex >= totalQuestions - 1;

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
        <Text style={styles.headerTitle}>
          Question {questionIndex + 1} of {totalQuestions}
        </Text>
        <TouchableOpacity
          onPress={handleBackToList}
          style={styles.listButton}
          accessibilityLabel="Back to question list"
          accessibilityRole="button"
        >
          <Icon name="list" color={colors.primary} width={22} height={22} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
      >
        {/* Status Banner */}
        <StatusBanner
          status={detail.status}
          marksAwarded={detail.marksAwarded}
          marks={detail.marks}
        />

        {/* Question Metadata */}
        <QuestionMetadata
          index={detail.index}
          subjectName={detail.subjectName}
          chapterName={detail.chapterName}
          difficulty={detail.difficulty}
          marks={detail.marks}
          negativeMarks={detail.negativeMarks}
        />

        {/* Question Stem */}
        <View style={styles.questionStemContainer}>
          {detail.text ? (
            <Text style={styles.questionText} selectable>
              {detail.text}
            </Text>
          ) : null}

          {detail.imageUrl ? (
            <View style={styles.questionImageContainer}>
              <Image
                source={{ uri: detail.imageUrl }}
                style={styles.questionImage}
                resizeMode="contain"
                accessibilityLabel={detail.imageAlt ?? 'Question diagram'}
              />
            </View>
          ) : null}
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          {detail.options.map((option) => (
            <ReviewOption key={option.id} option={option} />
          ))}
        </View>

        {/* Explanation */}
        <ExplanationSection
          text={detail.explanationText}
          images={detail.explanationImages}
          videoUrl={detail.explanationVideoUrl}
          isLoading={detail.explanationLoading}
          hasError={detail.explanationError}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom:
              insets.bottom > 0 ? insets.bottom + spacing[8] : spacing[16],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.navButton, isFirst && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={isFirst}
          activeOpacity={0.75}
          accessibilityLabel="Previous question"
          accessibilityRole="button"
        >
          <Icon
            name="chevron-left"
            color={isFirst ? palette.slate300 : colors.primary}
            width={20}
            height={20}
          />
          <Text
            style={[
              styles.navButtonText,
              isFirst && styles.navButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <Text style={styles.navPosition}>
          {questionIndex + 1} / {totalQuestions}
        </Text>

        <TouchableOpacity
          style={[styles.navButton, isLast && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={isLast}
          activeOpacity={0.75}
          accessibilityLabel="Next question"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.navButtonText,
              isLast && styles.navButtonTextDisabled,
            ]}
          >
            Next
          </Text>
          <Icon
            name="chevron-right"
            color={isLast ? palette.slate300 : colors.primary}
            width={20}
            height={20}
          />
        </TouchableOpacity>
      </View>
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
    fontSize: 16,
    fontWeight: '700',
    color: palette.slate800,
  },
  listButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  // ── Scroll Content ────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[16],
    paddingBottom: spacing[24],
    gap: spacing[12],
  },

  // ── Status Banner ─────────────────────────────────────────────
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: radius.md,
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusBannerLabel: {
    ...typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
  },
  statusBannerMarks: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Question Metadata ─────────────────────────────────────────
  metadataContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[12],
    gap: spacing[8],
  },
  metadataQuestionNum: {
    ...typography.title,
    fontSize: 17,
    fontWeight: '700',
    color: palette.slate800,
  },
  metadataBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  metadataBadge: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
    backgroundColor: palette.slate100,
  },
  metadataBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: palette.slate600,
  },
  difficultyEasy: {
    backgroundColor: '#E8F5E9',
  },
  difficultyMedium: {
    backgroundColor: '#FEF3C7',
  },
  difficultyHard: {
    backgroundColor: '#FFEBEE',
  },
  metadataChapter: {
    ...typography.caption,
    fontSize: 12,
    color: palette.slate500,
    marginTop: 2,
  },

  // ── Question Stem ─────────────────────────────────────────────
  questionStemContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[16],
    gap: spacing[12],
  },
  questionText: {
    ...typography.bodyLarge,
    fontSize: 16,
    color: palette.slate800,
    lineHeight: 26,
  },
  questionImageContainer: {
    backgroundColor: palette.slate50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.slate200,
    overflow: 'hidden',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },

  // ── Options Section ───────────────────────────────────────────
  optionsSection: {
    gap: spacing[8],
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[12],
    borderRadius: radius.sm,
    borderWidth: 2,
    position: 'relative',
  },
  optionContainerSelected: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  optionLabel: {
    ...typography.labelSmall,
    fontSize: 14,
    fontWeight: '700',
    color: palette.slate500,
    width: 24,
    flexShrink: 0,
    marginTop: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    ...typography.body,
    fontSize: 15,
    color: palette.slate700,
    lineHeight: 22,
  },
  optionTextHighlighted: {
    fontWeight: '600',
    color: palette.slate800,
  },
  optionImageContainer: {
    marginTop: spacing[8],
    backgroundColor: palette.slate50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.slate200,
    overflow: 'hidden',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  optionFeedbackBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
    marginTop: spacing[4],
  },
  optionFeedbackText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Explanation ───────────────────────────────────────────────
  explanationContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[16],
    gap: spacing[12],
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '700',
    color: palette.slate800,
    marginBottom: spacing[4],
  },
  explanationText: {
    ...typography.body,
    fontSize: 15,
    color: palette.slate700,
    lineHeight: 24,
  },
  explanationUnavailable: {
    ...typography.body,
    fontSize: 14,
    fontStyle: 'italic',
    color: palette.slate400,
    lineHeight: 22,
  },
  explanationImageContainer: {
    backgroundColor: palette.slate50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.slate200,
    overflow: 'hidden',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  explanationImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: colors.primary,
    paddingVertical: spacing[12],
    borderRadius: radius.md,
  },
  videoButtonText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Bottom Navigation ─────────────────────────────────────────
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: palette.slate100,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 105, 72, 0.06)',
    minWidth: 110,
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: palette.slate100,
    opacity: 0.6,
  },
  navButtonText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  navButtonTextDisabled: {
    color: palette.slate300,
  },
  navPosition: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: palette.slate500,
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
});
