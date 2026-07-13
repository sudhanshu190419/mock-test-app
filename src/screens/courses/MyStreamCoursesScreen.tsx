/**
 * MyStreamCoursesScreen
 *
 * Displays all published courses filtered specifically to the user's
 * active target exam stream.
 *
 * Features:
 * - Dynamic list of course cards matching the selected stream
 * - Premium empty state ("Coming Soon") if no courses exist for this stream yet
 * - Inline/Footer Call-to-Action to browse the global course catalog
 *
 * @module screens/courses/MyStreamCoursesScreen
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../store/hooks';
import { selectUser, selectSelectedStreamId } from '../../store/authSlice';
import { useCoursesByStream } from '../../hooks/home/useCourses';
import { useStreams } from '../../hooks/academic/useStreams';
import CourseCard from '../../components/courses/CourseCard';
import type { CourseItem, CourseCategory } from '../../components/home/types';
import type { TrendingCourse } from '../../types/home';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

export default function MyStreamCoursesScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const user = useAppSelector(selectUser);
  const selectedStreamId = useAppSelector(selectSelectedStreamId);

  // ── Fetch active streams to resolve the stream's name ───────────
  const { data: streamsData } = useStreams({
    isActive: true,
    instituteId: user?.instituteId ?? undefined,
  });

  const currentStreamName = useMemo(() => {
    const streams = streamsData?.data ?? [];
    const matched = streams.find((s) => s.streamId === selectedStreamId);
    return matched ? matched.name : 'Your Target Exam';
  }, [streamsData, selectedStreamId]);

  // ── Fetch courses filtered by active stream ─────────────────────
  const { data: coursesData, isLoading, error, refetch } = useCoursesByStream(
    selectedStreamId ?? ''
  );

  const courses = useMemo<CourseItem[]>(() => {
    const backendData = coursesData?.data ?? [];
    return backendData.map((course: TrendingCourse) => ({
      key: course.courseId,
      title: course.title,
      subtitle: `${course.difficultyLevel || 'All Levels'} | ${course.language || 'English'}`,
      description: course.description,
      category: course.category as CourseCategory,
      badgeLabel: course.badgeLabel || (course.isBestSeller ? 'Best Seller' : 'Popular'),
      badgeType: course.isBestSeller ? 'Best Seller' : 'Popular',
      stats: {
        duration: course.duration ? `${course.duration} Months` : 'Self-Paced',
        hasLiveClasses: true,
        hasRecorded: true,
      },
      price: course.price,
      originalPrice: course.originalPrice || undefined,
      isBookmarked: course.isBookmarked,
    }));
  }, [coursesData]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCoursePress = useCallback(
    (courseId: string) => {
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation]
  );

  const handleExploreGlobalPress = useCallback(() => {
    // Navigate to the global Courses tab screen in MainTabs
    (navigation as any).navigate('MainTabs', { screen: 'Courses' });
  }, [navigation]);

  // ── Render Helpers ─────────────────────────────────────────────
  const renderHeaderComponent = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listSubtitle}>
        Dynamic courses handpicked for your preparation.
      </Text>
    </View>
  );

  const renderFooterComponent = () => {
    if (courses.length === 0) return null;
    return (
      <View style={[styles.globalCtaCard, shadows.small]}>
        <View style={styles.ctaHeader}>
          <Text style={styles.ctaEmoji}>🎓</Text>
          <Text style={styles.ctaTitle}>Explore all courses we offer</Text>
        </View>
        <Text style={styles.ctaDescription}>
          Preparing for multiple goals or school boards? Browse our entire catalog to find the
          perfect match.
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleExploreGlobalPress}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaButtonText}>Browse Global Catalog</Text>
          <Icon name="arrow-right" color={colors.text.inverse} width={16} height={16} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Fetching relevant courses...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load courses</Text>
          <Text style={styles.errorText}>{error.message || 'Something went wrong.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (courses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIllustrationCard}>
            <Text style={styles.stateEmoji}>🚀</Text>
            <Text style={styles.emptyTitle}>Coming Soon</Text>
            <Text style={styles.emptyText}>
              We are currently designing premium batches and study materials for {currentStreamName}.
            </Text>
            <Text style={styles.emptySubtext}>
              In the meantime, explore our other published courses in the global catalog.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleExploreGlobalPress}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Explore More Courses</Text>
              <Icon name="arrow-right" color={colors.text.inverse} width={16} height={16} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <FlatList
        data={courses}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const { key, ...rest } = item;
          return (
            <CourseCard key={key} {...rest} onPress={() => handleCoursePress(key)} />
          );
        }}
        ListHeaderComponent={renderHeaderComponent}
        ListFooterComponent={renderFooterComponent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-left" color={colors.text.primary} width={24} height={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerLabel}>Target Exam Program</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentStreamName} Courses
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing[4],
    marginRight: spacing[12],
  },
  headerTitleWrapper: {
    flex: 1,
  },
  headerLabel: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 1,
  },
  headerTitle: {
    ...typography.title,
    fontWeight: '800',
    color: colors.text.primary,
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[40],
  },
  listHeader: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  listSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing[16],
  },
  stateEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing[12],
  },
  errorTitle: {
    ...typography.title,
    color: colors.text.primary,
    fontWeight: '800',
    marginTop: spacing[8],
  },
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[8],
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: radius.lg,
    marginTop: spacing[20],
  },
  retryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  emptyContainer: {
    flex: 1,
    padding: spacing[24],
    justifyContent: 'center',
  },
  emptyIllustrationCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing[32],
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyTitle: {
    ...typography.heading3,
    color: colors.text.primary,
    fontWeight: '800',
    marginBottom: spacing[12],
  },
  emptyText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing[24],
  },
  emptyButton: {
    backgroundColor: colors.secondary,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
    gap: spacing[8],
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 14,
  },
  globalCtaCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginHorizontal: spacing[16],
    marginTop: spacing[12],
    padding: spacing[20],
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[8],
  },
  ctaEmoji: {
    fontSize: 20,
  },
  ctaTitle: {
    ...typography.title,
    fontWeight: '800',
    color: colors.text.primary,
  },
  ctaDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing[16],
  },
  ctaButton: {
    backgroundColor: colors.secondary,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  ctaButtonText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 14,
  },
});
