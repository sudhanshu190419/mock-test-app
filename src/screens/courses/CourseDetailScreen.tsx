/**
 * CourseDetailScreen
 *
 * Production-optimised course details page — zero animation overhead,
 * instant render, minimal re-renders.
 *
 * Loads the course from the `courses` table via `useCourse(courseId)` and
 * populates every UI field from the live database response. The Buy button
 * passes the real course UUID to `create-payment-order`.
 *
 * @module screens/courses/CourseDetailScreen
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Share,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { useCourse } from '../../hooks/course/useCourse';
import { useCreatePaymentOrder } from '../../hooks/payment/useCreatePaymentOrder';
import { usePurchaseStatus } from '../../hooks/payment/usePurchaseStatus';
import { openCheckout } from '../../services/payment/razorpayService';
import { checkCourseEnrollment } from '../../services/payment/paymentService';
import { supabase } from '../../config/supabase';
import { UUID_REGEX } from '../../utils/supabase';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { CourseDetail, CurriculumSubject, FaqItem, Instructor, CourseMetric } from '../../types/courseDetail';
import type { PurchaseStateContext } from '../../types/payment';

// ─── Navigation Route Type ──────────────────────────────────────────────────

type CourseDetailRouteProp = RouteProp<AppStackParamList, 'CourseDetail'>;

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return String(n);
}

// ─── Section Card ───────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View style={styles.sectionCard}>{children}</View>;
}

// ─── Metric Grid Item ───────────────────────────────────────────────────────

const MetricGridItem = React.memo(function MetricGridItem({
  metric,
}: {
  metric: CourseMetric;
}): React.JSX.Element {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: metric.accentColor + '15' }]}>
        <Icon name={metric.iconName as any} color={metric.accentColor} width={22} height={22} />
      </View>
      <Text style={styles.metricValue}>{metric.value}</Text>
      <Text style={styles.metricLabel}>{metric.label}</Text>
    </View>
  );
});

// ─── Curriculum Accordion ────────────────────────────────────────────────────

const CurriculumAccordion = React.memo(function CurriculumAccordion({
  subject,
}: {
  subject: CurriculumSubject;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.accordionWrap}>
      <TouchableOpacity
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
        style={styles.accordionHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${subject.name} curriculum, ${subject.chapterCount}`}
      >
        <View style={styles.accordionHeaderLeft}>
          <View style={[styles.accordionIcon, { backgroundColor: subject.accentColor + '15' }]}>
            <Icon name={subject.iconName as any} color={subject.accentColor} width={18} height={18} />
          </View>
          <View style={styles.accordionHeaderText}>
            <Text style={styles.accordionTitle}>{subject.name}</Text>
            <Text style={styles.accordionSubtitle}>
              {subject.chapterCount} &bull; {subject.hours}
            </Text>
          </View>
        </View>
        <View style={isOpen ? styles.chevronRotated : styles.chevronDefault}>
          <Icon name="chevron-right" color={colors.text.secondary} width={20} height={20} />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.accordionContent}>
          {subject.chapters.map((ch, chIdx) => (
            <View
              key={`${subject.key}-ch-${chIdx}`}
              style={[
                styles.chapterRow,
                chIdx < subject.chapters.length - 1 && styles.chapterRowBorder,
              ]}
            >
              <View style={styles.chapterRowLeft}>
                {ch.isLocked ? (
                  <Icon name="shield-check" color={colors.disabled} width={16} height={16} />
                ) : (
                  <Icon name="play-circle" color={colors.primary} width={16} height={16} />
                )}
                <Text
                  style={[styles.chapterName, ch.isLocked && styles.chapterLocked]}
                  numberOfLines={1}
                >
                  {ch.name}
                </Text>
              </View>
              {ch.isLocked && (
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>Locked</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Instructor Card ────────────────────────────────────────────────────────

const InstructorCard = React.memo(function InstructorCard({
  instructor,
}: {
  instructor: Instructor;
}): React.JSX.Element {
  return (
    <View style={styles.instructorCard}>
      <View style={[styles.instructorAvatar, { borderColor: instructor.accentColor, backgroundColor: instructor.avatarBg }]}>
        <Text style={[styles.instructorInitials, { color: instructor.accentColor }]}>
          {instructor.initials}
        </Text>
      </View>
      <View style={styles.instructorInfo}>
        <Text style={styles.instructorName}>{instructor.name}</Text>
        <Text style={[styles.instructorCredential, { color: instructor.accentColor }]}>
          {instructor.credential}
        </Text>
        <Text style={styles.instructorExperience}>{instructor.experience}</Text>
      </View>
    </View>
  );
});

// ─── FAQ Item ────────────────────────────────────────────────────────────────

const FaqItemBlock = React.memo(function FaqItemBlock({
  faq,
  index,
}: {
  faq: FaqItem;
  index: number;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.faqItem, index > 0 && styles.faqItemBorder]}>
      <TouchableOpacity
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
        style={styles.faqQuestionRow}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.faqQuestion} numberOfLines={isOpen ? undefined : 2}>
          {faq.question}
        </Text>
        <View style={isOpen ? styles.chevronRotated : styles.chevronDefault}>
          <Icon name="chevron-right" color={colors.text.secondary} width={18} height={18} />
        </View>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.faqAnswerWrap}>
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        </View>
      )}
    </View>
  );
});

// ─── Purchase Flow ──────────────────────────────────────────────────────────

/**
 * Payment Status Overlay shown during the purchase flow.
 * Displays different messages for each state of the purchase.
 */
function PurchaseOverlay({
  purchaseState,
  onDismiss,
  onRetry,
}: {
  purchaseState: PurchaseStateContext;
  onDismiss: () => void;
  onRetry: () => void;
}): React.JSX.Element | null {
  const { state, errorMessage, courseName, formattedAmount } = purchaseState;

  if (state === 'idle' || state === 'enrolled') {
    return null;
  }

  const isProcessing = state === 'creating_order' || state === 'checkout_open' || state === 'payment_received' || state === 'polling_enrollment';
  const isFailed = state === 'failed';

  const getTitle = () => {
    switch (state) {
      case 'creating_order':
        return 'Setting up payment…';
      case 'checkout_open':
        return 'Complete payment in the checkout';
      case 'payment_received':
        return 'Payment received';
      case 'polling_enrollment':
        return 'Confirming your enrollment…';
      case 'failed':
        return 'Payment failed';
      default:
        return '';
    }
  };

  const getMessage = () => {
    switch (state) {
      case 'creating_order':
        return 'Please wait while we prepare your checkout.';
      case 'checkout_open':
        return 'Follow the instructions in the Razorpay checkout to complete your payment.';
      case 'payment_received':
        return `We're confirming your payment${courseName ? ` for ${courseName}` : ''}${formattedAmount ? ` of ${formattedAmount}` : ''}. This usually takes a few seconds.`;
      case 'polling_enrollment':
        return `Your payment is being verified by our system${courseName ? ` for ${courseName}` : ''}. You'll get access to the course once the confirmation is complete.`;
      case 'failed':
        return errorMessage ?? 'An unexpected error occurred. Please try again.';
      default:
        return '';
    }
  };

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlayBackdrop}>
        <View style={styles.overlayCard}>
          {isProcessing && (
            <ActivityIndicator size="large" color={colors.secondary} style={styles.overlaySpinner} />
          )}
          {isFailed && (
            <View style={styles.overlayIconWrap}>
              <Icon name="x-circle" color="#DC2626" width={40} height={40} />
            </View>
          )}
          <Text style={styles.overlayTitle}>{getTitle()}</Text>
          <Text style={styles.overlayMessage}>{getMessage()}</Text>

          {isFailed && (
            <View style={styles.overlayActions}>
              <TouchableOpacity
                onPress={onRetry}
                style={styles.overlayRetryButton}
                activeOpacity={0.85}
              >
                <Text style={styles.overlayRetryText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDismiss}
                style={styles.overlayDismissButton}
                activeOpacity={0.7}
              >
                <Text style={styles.overlayDismissText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════════════

export default function CourseDetailScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<CourseDetailRouteProp>();

  // ── Get courseId from navigation params ───────────────────────
  const { courseId } = route.params;
  console.log('[COURSE_UI] CourseDetailScreen mounted with courseId:', courseId);

  // Validate UUID format
  const isValidUuid = UUID_REGEX.test(courseId);
  if (!isValidUuid) {
    console.warn('[COURSE_UI] WARNING: courseId is not a valid UUID:', courseId);
  }

  // ── Fetch course from Supabase ─────────────────────────────────
  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
    refetch: refetchCourse,
  } = useCourse(courseId);

  // ── Stable course values for hooks ─────────────────────────────
  const courseTitle = course?.title ?? '';
  const coursePrice = course?.price ?? 0;
  const dbCourseId = course?.courseId ?? courseId;

  // ── Purchase state ────────────────────────────────────────────
  const [purchaseState, setPurchaseState] = useState<PurchaseStateContext>({
    state: 'idle',
  });

  // ── Check enrollment on screen mount ──────────────────────────
  // Query `course_enrollments` directly so the button always reflects
  // the live database state — even after app restart or navigation back.
  useEffect(() => {
    console.log('[COURSE_DETAIL] Screen mounted');
    console.log('[COURSE_DETAIL] courseId:', courseId);

    if (!isValidUuid) {
      console.log('[COURSE_DETAIL] Skipping enrollment check — invalid UUID');
      return;
    }

    const checkInitialEnrollment = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const profileId = sessionData?.session?.user?.id;

        if (!profileId) {
          console.log('[COURSE_DETAIL] No authenticated session — skipping enrollment check');
          return;
        }

        console.log('[COURSE_DETAIL] Checking enrollment for profile:', profileId);

        const enrollment = await checkCourseEnrollment(profileId, courseId);
        console.log('[COURSE_DETAIL] Enrollment check result:', enrollment);

        if (enrollment) {
          console.log('[COURSE_DETAIL] User is already enrolled — showing Start Learning');
          setPurchaseState({ state: 'enrolled' });
        }
      } catch (err) {
        console.log('[COURSE_DETAIL] Enrollment check error:', err);
      }
    };

    checkInitialEnrollment();
  }, [courseId, isValidUuid]);

  // Resolved student ID — stored in state so usePurchaseStatus can
  // react to it when it changes (useRef would be stale at render time).
  const [studentId, setStudentId] = useState<string | null>(null);

  // ── Payment hooks ─────────────────────────────────────────────
  const createOrderMutation = useCreatePaymentOrder();

  const isPolling =
    purchaseState.state === 'payment_received' ||
    purchaseState.state === 'polling_enrollment';

  const { pollStatus, reset: resetPoll } = usePurchaseStatus({
    studentId,
    courseId: dbCourseId,
    enabled: isPolling,
    config: {
      intervalMs: 2500,
      timeoutMs: 120000,
    },
  });

  // ── React to poll status changes ──────────────────────────────
  useEffect(() => {
    if (pollStatus.status === 'enrolled') {
      console.log('[PAYMENT_FLOW] Enrollment confirmed via polling!');
      setPurchaseState((prev) => ({ ...prev, state: 'enrolled' }));
    } else if (pollStatus.status === 'timeout') {
      console.log('[PAYMENT_FLOW] Polling timed out');
      setPurchaseState({
        state: 'failed',
        errorMessage:
          'Payment confirmation is taking longer than expected. Your enrollment will be activated shortly. Please check back later or contact support.',
        courseName: courseTitle,
        formattedAmount: formatPrice(coursePrice),
      });
    } else if (pollStatus.status === 'error') {
      setPurchaseState({
        state: 'failed',
        errorMessage: pollStatus.message,
      });
    }
  }, [pollStatus, courseTitle, coursePrice]);

  // ── Enroll handler ────────────────────────────────────────────
  const handleEnroll = useCallback(async () => {
    if (purchaseState.state !== 'idle' && purchaseState.state !== 'failed') {
      return;
    }

    try {
      console.log('[PAYMENT_FLOW] Buy button pressed');
      console.log('[PAYMENT_FLOW] Course UUID being used:', dbCourseId);

      // Verify course ID is valid before proceeding
      if (!dbCourseId || !UUID_REGEX.test(dbCourseId)) {
        console.error('[PAYMENT_FLOW] Invalid course UUID:', dbCourseId);
        setPurchaseState({
          state: 'failed',
          errorMessage: 'The course data is not valid. Please go back and try again.',
        });
        return;
      }

      setPurchaseState({
        state: 'creating_order',
        courseName: courseTitle,
        formattedAmount: formatPrice(coursePrice),
      });

      // 1. Verify the user is authenticated (no student_details required)
      console.log('[PAYMENT_FLOW] Checking authentication...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const profileId = sessionData?.session?.user?.id;
      if (!profileId || sessionError) {
        console.log('[PAYMENT_FLOW] No authenticated session found');
        setPurchaseState({
          state: 'failed',
          errorMessage: 'Please sign in to enroll in courses.',
        });
        return;
      }
      console.log('[PAYMENT_FLOW] Authenticated profile_id:', profileId);
      setStudentId(profileId);

      // 2. Create payment order via Edge Function
      // The Edge Function receives the profile_id and resolves instituteId
      // server-side. student_details is created post-purchase by the webhook.
      console.log('[PAYMENT_FLOW] Creating payment order for course UUID:', dbCourseId);
      const result = await createOrderMutation.mutateAsync({
        courseId: dbCourseId,
        studentId: profileId,
        instituteId: '', // Resolved server-side by the Edge Function
      });

      console.log('[PAYMENT_FLOW] Payment order created:', result.razorpayOrderId);

      // 3. Open Razorpay checkout
      setPurchaseState((prev) => ({
        ...prev,
        state: 'checkout_open',
        razorpayOrderId: result.razorpayOrderId,
        orderId: result.orderId,
      }));
      console.log('[PAYMENT_FLOW] Opening Razorpay checkout...');

      const razorpayResult = await openCheckout(result);

      if (razorpayResult.success) {
        console.log('[PAYMENT_FLOW] Razorpay payment succeeded:', razorpayResult.data.razorpay_payment_id);
        // Payment received — start polling for enrollment.
        // The backend webhook handles verification and enrollment creation.
        // Do NOT call complete-course-purchase from the mobile app.
        setPurchaseState((prev) => ({
          ...prev,
          state: 'polling_enrollment',
          razorpayOrderId: result.razorpayOrderId,
          orderId: result.orderId,
        }));
      } else {
        const errorInfo = razorpayResult.error;
        if (typeof errorInfo === 'string') {
          console.log('[PAYMENT_FLOW] Razorpay SDK error:', errorInfo);
          setPurchaseState({
            state: 'failed',
            errorMessage: errorInfo,
            razorpayOrderId: result.razorpayOrderId,
          });
        } else {
          const code = errorInfo.code;
          const description = errorInfo.description;

          console.log('[PAYMENT_FLOW] Razorpay error:', code, description);

          if (code === 2) {
            setPurchaseState({
              state: 'failed',
              errorMessage:
                "Payment was cancelled. You can try again whenever you're ready.",
              razorpayOrderId: result.razorpayOrderId,
            });
          } else {
            setPurchaseState({
              state: 'failed',
              errorMessage: description || 'Payment failed. Please try again.',
              razorpayOrderId: result.razorpayOrderId,
            });
          }
        }
      }
    } catch (err) {
      // Catch any unhandled error (network failure, mutation reject, etc.)
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.log('[PAYMENT_FLOW] Unhandled error:', message);
      setPurchaseState({
        state: 'failed',
        errorMessage: message,
        courseName: courseTitle,
        formattedAmount: formatPrice(coursePrice),
      });
    }
  }, [purchaseState.state, createOrderMutation, dbCourseId, courseTitle, coursePrice]);

  // ── Reset purchase flow ───────────────────────────────────────
  const resetPurchase = useCallback(() => {
    resetPoll();
    setStudentId(null);
    setPurchaseState({ state: 'idle' });
  }, [resetPoll]);

  // ── Share handler ─────────────────────────────────────────────
  async function handleShare(): Promise<void> {
    if (!course) return;
    try {
      await Share.share({
        title: course.title,
        message: `Check out "${course.title}" on MockPrep! 🎓\n\nPrice: ${formatPrice(course.price)}${course.discountLabel ? ` (${course.discountLabel} OFF)` : ''}\n\nDownload the app now!`,
      });
    } catch {
      // User cancelled share
    }
  }

  // ── Stable content container style ────────────────────────────
  const contentContainerStyle = useMemo(
    () => ({ paddingBottom: insets.bottom + 100 }),
    [insets.bottom],
  );

  // ── Determine button state ────────────────────────────────────
  const isEnrolled = purchaseState.state === 'enrolled';
  const isPurchasing = purchaseState.state !== 'idle' && purchaseState.state !== 'failed' && purchaseState.state !== 'enrolled';
  const buyDisabled = !course || isPurchasing || !!courseError || courseLoading;

  // Log current CTA state for debugging
  console.log('[COURSE_DETAIL] CTA state:', purchaseState.state);

  // ── Loading State ─────────────────────────────────────────────
  if (courseLoading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={navigation.goBack}
              style={styles.headerButton}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Icon name="arrow-left" color={colors.text.primary} width={22} height={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>Course Details</Text>
            <View style={styles.headerButton} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Loading course details…</Text>
        </View>
      </View>
    );
  }

  // ── Error State ───────────────────────────────────────────────
  if (courseError || !course) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={navigation.goBack}
              style={styles.headerButton}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Icon name="arrow-left" color={colors.text.primary} width={22} height={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>Course Details</Text>
            <View style={styles.headerButton} />
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Icon name="alert-triangle" color="#DC2626" width={48} height={48} />
          </View>
          <Text style={styles.errorTitle}>Could not load course</Text>
          <Text style={styles.errorText}>
            {courseError instanceof Error ? courseError.message : 'The course you\'re looking for could not be found. It may have been removed or is no longer available.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetchCourse()}
            style={styles.retryButton}
            activeOpacity={0.85}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render Course Data ────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* ═══ Fixed Header ═══ */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={navigation.goBack}
            style={styles.headerButton}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-left" color={colors.text.primary} width={22} height={22} />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Course Details
          </Text>

          <TouchableOpacity
            onPress={handleShare}
            style={styles.headerButton}
            activeOpacity={0.7}
            accessibilityLabel="Share this course"
            accessibilityRole="button"
          >
            <Icon name="bookmark" color={colors.text.primary} width={20} height={20} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ═══ Scrollable Content ═══ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ─── Course Info Card ──────────────────────────────────── */}
        <View style={styles.infoCard}>
          <Text style={styles.categoryBadge}>{course.category}</Text>
          <Text style={styles.courseTitle}>{course.title}</Text>

          {/* Rating & Stats Row — only show when there's data */}
          {(course.rating > 0 || course.studentCount > 0) && (
            <View style={styles.statsRow}>
              {course.rating > 0 && (
                <View style={styles.statItem}>
                  <Icon name="star" color="#FBBF24" width={16} height={16} />
                  <Text style={styles.statText}>
                    {course.rating} {course.reviewCount > 0 ? `(${formatCount(course.reviewCount)} Reviews)` : ''}
                  </Text>
                </View>
              )}
              {course.rating > 0 && course.studentCount > 0 && <View style={styles.statDot} />}
              {course.studentCount > 0 && (
                <View style={styles.statItem}>
                  <Icon name="users" color={colors.text.secondary} width={16} height={16} />
                  <Text style={styles.statText}>{formatCount(course.studentCount)}+ Students</Text>
                </View>
              )}
            </View>
          )}

          {/* Badge — only show when badgeLabel exists */}
          {course.badgeLabel && (
            <View style={styles.badgeRow}>
              <View style={styles.bestSellerBadge}>
                <Icon name="trophy" color="#FBBF24" width={12} height={12} />
                <Text style={styles.bestSellerText}>{course.badgeLabel}</Text>
              </View>
            </View>
          )}

          {/* Pricing */}
          <View style={styles.pricingDivider} />
          <View style={styles.pricingRow}>
            <View style={styles.pricingLeft}>
              <Text style={styles.currentPrice}>{formatPrice(course.price)}</Text>
              {course.originalPrice > course.price && (
                <Text style={styles.originalPrice}>{formatPrice(course.originalPrice)}</Text>
              )}
              {course.discountLabel && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{course.discountLabel}</Text>
                </View>
              )}
            </View>
          </View>
          {course.offerMessage && (
            <Text style={styles.offerText}>{course.offerMessage}</Text>
          )}
        </View>

        {/* ─── Metrics Bento Grid — only when data exists ──────────── */}
        {course.metrics.length > 0 && (
          <View style={styles.metricsGrid}>
            {course.metrics.map((metric) => (
              <MetricGridItem key={metric.key} metric={metric} />
            ))}
          </View>
        )}

        {/* ─── About Section ─────────────────────────────────────── */}
        {course.aboutDescription && (
          <SectionCard>
            <Text style={styles.sectionTitle}>About this Course</Text>
            <Text style={styles.aboutText}>{course.aboutDescription}</Text>
            {course.aboutFeatures.length > 0 && (
              <View style={styles.featureList}>
                {course.aboutFeatures.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <View style={styles.featureBullet}>
                      <Icon name="badge-check" color={colors.primary} width={16} height={16} />
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {/* ─── Curriculum Section — only when data exists ──────────── */}
        {course.curriculum.length > 0 && (
          <SectionCard>
            <Text style={styles.sectionTitle}>Course Curriculum</Text>
            <View style={styles.accordionList}>
              {course.curriculum.map((subject) => (
                <CurriculumAccordion key={subject.key} subject={subject} />
              ))}
            </View>
          </SectionCard>
        )}

        {/* ─── Instructors Section — only when data exists ──────────── */}
        {course.instructors.length > 0 && (
          <SectionCard>
            <Text style={styles.sectionTitle}>Your Mentors</Text>
            <View style={styles.instructorsList}>
              {course.instructors.map((instructor) => (
                <InstructorCard key={instructor.key} instructor={instructor} />
              ))}
            </View>
          </SectionCard>
        )}

        {/* ─── FAQ Section — only when data exists ───────────────── */}
        {course.faqs.length > 0 && (
          <SectionCard>
            <Text style={styles.sectionTitle}>Frequently Asked</Text>
            <View style={styles.faqList}>
              {course.faqs.map((faq, idx) => (
                <FaqItemBlock key={faq.key} faq={faq} index={idx} />
              ))}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      {/* ═══ Payment Overlay ═══ */}
      <PurchaseOverlay
        purchaseState={purchaseState}
        onDismiss={resetPurchase}
        onRetry={handleEnroll}
      />

      {/* ═══ Fixed Bottom Bar ═══ */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <View style={styles.bottomBar}>
          <View style={styles.bottomPriceWrap}>
            {isEnrolled ? (
              <Text style={styles.bottomEnrolledLabel}>Enrolled</Text>
            ) : (
              <>
                <Text style={styles.bottomPrice}>{formatPrice(course.price)}</Text>
                {course.originalPrice > course.price && (
                  <Text style={styles.bottomOriginalPrice}>{formatPrice(course.originalPrice)}</Text>
                )}
              </>
            )}
          </View>
          <View style={styles.bottomButtons}>
            {isEnrolled ? (
              <TouchableOpacity
                style={[styles.enrollButton, styles.enrolledButton]}
                activeOpacity={0.85}
                accessibilityLabel="Start learning"
                accessibilityRole="button"
              >
                <Icon name="play-circle" color={colors.text.inverse} width={16} height={16} />
                <Text style={styles.enrollButtonText}>Start Learning</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleEnroll}
                style={[styles.enrollButton, buyDisabled && styles.enrollButtonDisabled]}
                activeOpacity={0.85}
                disabled={buyDisabled}
                accessibilityLabel={isPurchasing ? 'Processing payment' : 'Enroll now'}
                accessibilityRole="button"
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <>
                    <Icon name="badge-check" color={colors.text.inverse} width={16} height={16} />
                    <Text style={styles.enrollButtonText}>
                      {courseLoading ? 'Loading…' : 'Enroll Now'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ────────────────────────────────────────────────────
  headerSafeArea: {
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing[8],
  },

  // ── Loading State ─────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[16],
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
  },

  // ── Error State ───────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[32],
    gap: spacing[12],
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  errorTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    marginTop: spacing[8],
  },
  retryButtonText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.inverse,
  },

  // ── Scroll View ───────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },

  // ── Course Info Card ──────────────────────────────────────────
  infoCard: {
    marginHorizontal: spacing[16],
    marginTop: spacing[16],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[20],
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  categoryBadge: {
    ...typography.labelSmall,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing[8],
  },
  courseTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    lineHeight: 30,
    marginBottom: spacing[12],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[8],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  statText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.disabled,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: spacing[12],
  },
  bestSellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.xxl,
  },
  bestSellerText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },

  // ── Pricing ───────────────────────────────────────────────────
  pricingDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: spacing[12],
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  pricingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  currentPrice: {
    ...typography.heading3,
    fontSize: 26,
    fontWeight: '800',
    color: colors.secondary,
  },
  originalPrice: {
    ...typography.body,
    fontSize: 15,
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.tint.green,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.sm,
  },
  discountText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  offerText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // ── Metrics Grid ──────────────────────────────────────────────
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[16],
    marginTop: spacing[12],
    gap: spacing[8],
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  metricValue: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    lineHeight: 26,
  },
  metricLabel: {
    ...typography.bodySmall,
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.secondary,
    lineHeight: 15,
    marginTop: spacing[4],
  },

  // ── Section Card ──────────────────────────────────────────────
  sectionCard: {
    marginHorizontal: spacing[16],
    marginTop: spacing[12],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[20],
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[12],
  },

  // ── About Section ─────────────────────────────────────────────
  aboutText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[12],
  },
  featureList: {
    gap: spacing[8],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  featureBullet: {
    marginTop: 3,
  },
  featureText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 22,
    flex: 1,
  },

  // ── Curriculum Accordion ──────────────────────────────────────
  accordionList: {
    gap: spacing[8],
  },
  accordionWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    backgroundColor: colors.background,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    flex: 1,
  },
  accordionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionHeaderText: {
    flex: 1,
  },
  accordionTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  accordionSubtitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: 2,
  },
  chevronDefault: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  accordionContent: {
    paddingHorizontal: spacing[12],
    paddingBottom: spacing[8],
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[8],
  },
  chapterRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  chapterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    flex: 1,
  },
  chapterName: {
    ...typography.body,
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
  },
  chapterLocked: {
    color: colors.disabled,
  },
  lockedBadge: {
    backgroundColor: colors.divider,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  lockedBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.secondary,
  },

  // ── Instructors ───────────────────────────────────────────────
  instructorsList: {
    gap: spacing[12],
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  instructorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorInitials: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  instructorCredential: {
    ...typography.labelSmall,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  instructorExperience: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 1,
  },

  // ── FAQ ───────────────────────────────────────────────────────
  faqList: {},
  faqItem: {
    paddingVertical: spacing[4],
  },
  faqItemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
    gap: spacing[8],
  },
  faqQuestion: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  faqAnswerWrap: {
    paddingBottom: spacing[12],
  },
  faqAnswer: {
    ...typography.body,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // ── Bottom Bar ────────────────────────────────────────────────
  bottomSafeArea: {
    backgroundColor: colors.surface,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[12],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  bottomPriceWrap: {
    alignItems: 'flex-start',
  },
  bottomPrice: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
    color: colors.secondary,
  },
  bottomOriginalPrice: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: spacing[8],
    flex: 1,
    justifyContent: 'flex-end',
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    minWidth: 120,
  },
  enrollButtonText: {
    ...typography.buttonSmall,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  enrollButtonDisabled: {
    opacity: 0.7,
  },
  enrolledButton: {
    backgroundColor: colors.primary,
  },
  bottomEnrolledLabel: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Purchase Overlay ─────────────────────────────────────────
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[24],
  },
  overlayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[24],
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
    }),
  },
  overlaySpinner: {
    marginBottom: spacing[16],
  },
  overlayIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[16],
  },
  overlayTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  overlayMessage: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[20],
  },
  overlayActions: {
    flexDirection: 'column',
    gap: spacing[8],
    width: '100%',
  },
  overlayRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  overlayRetryText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  overlayDismissButton: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  overlayDismissText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
