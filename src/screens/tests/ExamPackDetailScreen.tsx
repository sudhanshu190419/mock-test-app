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
import Animated, { SlideInDown, SlideOutDown, FadeInUp, FadeIn, ZoomIn, LinearTransition, useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import Icon from '../../components/home/Icons';
import CourseDetailHero from '../../components/courses/CourseDetailHero';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { useAppDispatch } from '../../store/hooks';
import { setPurchaseInProgress } from '../../store/purchaseSlice';
import { usePracticeDetail } from '../../hooks/practice/usePractice';
import { useCreatePaymentOrder } from '../../hooks/payment/useCreatePaymentOrder';
import { usePurchaseStatus } from '../../hooks/payment/usePurchaseStatus';
import { openCheckout } from '../../services/payment/razorpayService';
import { checkPyqPurchase } from '../../services/payment/paymentService';
import { supabase } from '../../config/supabase';
import { UUID_REGEX } from '../../utils/supabase';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { PracticePaper } from '../../types/practice';
import type { PurchaseStateContext } from '../../types/payment';

export type ExamPackDetailParams = { packageId: string; };

type ExamPackDetailRouteProp = RouteProp<AppStackParamList, 'ExamPackDetail'>;

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

// ─── Section Card Wrapper ───────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View style={styles.sectionCard}>{children}</View>;
}

// ─── Metric Grid Item Component ─────────────────────────────────────────────
const MetricGridItem = React.memo(function MetricGridItem({
  metric,
}: {
  metric: { key: string; label: string; value: string; iconName: string; accentColor: string; };
}): React.JSX.Element {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: metric.accentColor + '15' }]}>
        <Icon name={metric.iconName as any} color={metric.accentColor} width={20} height={20} />
      </View>
      <View style={styles.metricTextWrap}>
        <Text style={styles.metricValue}>{metric.value}</Text>
        <Text style={styles.metricLabel}>{metric.label}</Text>
      </View>
    </View>
  );
});

// ─── Curriculum Accordion Component ─────────────────────────────────────────
const CurriculumAccordion = React.memo(function CurriculumAccordion({
  subject,
}: {
  subject: {
    key: string;
    name: string;
    chapterCount: string;
    hours: string;
    iconName: string;
    accentColor: string;
    chapters: Array<{ paperId: string, name: string, isLocked: boolean, duration?: number | null, questions?: number | null }>;
  };
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
      >
        <View style={styles.accordionHeaderLeft}>
          <View style={[styles.accordionIcon, { backgroundColor: subject.accentColor + '15' }]}>
            <Icon name={subject.iconName as any} color={subject.accentColor} width={18} height={18} />
          </View>
          <View style={styles.accordionHeaderText}>
            <Text style={styles.accordionTitle}>{subject.name}</Text>
            <Text style={styles.accordionSubtitle}>
              {subject.chapterCount} • {subject.hours}
            </Text>
          </View>
        </View>
        <View style={isOpen ? styles.chevronRotated : styles.chevronDefault}>
          <Icon name="chevron-right" color={coursesDark.textMutedOnCard} width={20} height={20} />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.accordionContent}>
          {subject.chapters.map((ch, chIdx) => (
            <View
              key={`${subject.key}-ch-${ch.paperId}`}
              style={[
                styles.chapterRow,
                chIdx < subject.chapters.length - 1 && styles.chapterRowBorder,
              ]}
            >
              <View style={styles.chapterRowLeft}>
                {ch.isLocked ? (
                  <Icon name="shield-check" color={coursesDark.textMutedOnCard} width={16} height={16} />
                ) : (
                  <Icon name="description" color={coursesDark.accentPrimary} width={16} height={16} />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.chapterName, ch.isLocked && styles.chapterLocked]}
                    numberOfLines={1}
                  >
                    {ch.name}
                  </Text>
                  {(ch.duration || ch.questions) && (
                     <Text style={[styles.chapterMeta, ch.isLocked && styles.chapterLocked]}>
                       {ch.questions ? `${ch.questions} Qs` : ''}
                       {ch.questions && ch.duration ? ' • ' : ''}
                       {ch.duration ? `${ch.duration} mins` : ''}
                     </Text>
                   )}
                </View>
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

// ─── Purchase Flow Overlay (Modal) ───────────────────────────────────────────
function PurchaseOverlay({
  purchaseState,
  onDismiss,
  onRetry,
  onConfirmPurchase,
}: {
  purchaseState: PurchaseStateContext;
  onDismiss: () => void;
  onRetry: () => void;
  onConfirmPurchase: () => void;
}): React.JSX.Element | null {
  const { state, errorMessage, courseName, formattedAmount } = purchaseState;

  if (state === 'idle' || state === 'enrolled') {
    return null;
  }

  const isSummary = state === 'order_summary';
  const isProcessing = state === 'creating_order' || state === 'checkout_open' || state === 'payment_received' || state === 'polling_enrollment';
  const isFailed = state === 'failed';

  const getTitle = () => {
    if (isSummary) return 'Order Summary';
    if (isFailed) return 'Payment Failed';
    switch (state) {
      case 'creating_order': return 'Setting up payment…';
      case 'checkout_open': return 'Complete payment in checkout';
      case 'payment_received': return 'Payment received';
      case 'polling_enrollment': return 'Confirming purchase…';
      default: return 'Processing...';
    }
  };

  const getMessage = () => {
    if (isFailed) return errorMessage ?? 'An unexpected error occurred. Please try again.';
    switch (state) {
      case 'creating_order': return 'Please wait while we prepare your checkout.';
      case 'checkout_open': return 'Follow instructions in checkout to complete payment.';
      case 'payment_received': return `Confirming payment${courseName ? ` for ${courseName}` : ''}${formattedAmount ? ` of ${formattedAmount}` : ''}...`;
      case 'polling_enrollment': return `Verifying your purchase${courseName ? ` for ${courseName}` : ''}. You will get access shortly.`;
      default: return '';
    }
  };

  return (
    <Modal transparent animationType="fade" visible>
      <Animated.View style={styles.overlayBackdrop} entering={FadeIn}>
        <Animated.View 
          style={styles.checkoutSheet} 
          entering={SlideInDown.duration(200)} 
          exiting={SlideOutDown}
        >
          {isProcessing && (
            <View style={styles.overlaySpinnerWrap}>
              <ActivityIndicator size="large" color={coursesDark.accentPrimary} />
            </View>
          )}
          {isFailed && (
            <View style={styles.overlaySpinnerWrap}>
              <Icon name="x-circle" color={coursesDark.categories.law.accent} width={40} height={40} />
            </View>
          )}
          
          <Text style={styles.checkoutTitle}>{getTitle()}</Text>
          
          {isSummary && (
            <View style={styles.checkoutDetailsBox}>
              <Text style={styles.checkoutCourseName}>{courseName}</Text>
              <View style={styles.checkoutDivider} />
              <View style={styles.checkoutPriceRow}>
                <Text style={styles.checkoutTotalLabel}>Total to pay</Text>
                <Text style={styles.checkoutTotalValue}>{formattedAmount}</Text>
              </View>
            </View>
          )}
          
          {!isSummary && (
             <Text style={styles.overlayMessage}>{getMessage()}</Text>
          )}

          {isFailed && (
            <View style={styles.overlayActions}>
              <TouchableOpacity
                style={[styles.overlayBtn, styles.overlayBtnOutline]}
                onPress={onDismiss}
              >
                <Text style={styles.overlayBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.overlayBtn, styles.overlayBtnPrimary]}
                onPress={onRetry}
              >
                <Text style={styles.overlayBtnPrimaryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isFailed && (
             <View style={styles.checkoutPayAction}>
               <TouchableOpacity 
                 style={[styles.checkoutPayButton, isProcessing && styles.checkoutPayButtonLoading]}
                 onPress={isSummary ? onConfirmPurchase : undefined}
                 disabled={isProcessing}
                 activeOpacity={0.8}
               >
                 {isProcessing ? (
                   <ActivityIndicator color="#FFF" />
                 ) : (
                   <Text style={styles.checkoutPayText}>Pay Now</Text>
                 )}
               </TouchableOpacity>
             </View>
           )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Exam Pack Detail Screen ───────────────────────────────────────────────
export default function ExamPackDetailScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ExamPackDetailRouteProp>();
  const dispatch = useAppDispatch();

  const { packageId } = route.params;
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Validate UUID format
  const isValidUuid = UUID_REGEX.test(packageId);
  if (!isValidUuid) {
    console.warn('[PYQ_UI] WARNING: packageId is not a valid UUID:', packageId);
  }

  // Fetch practice details (package info + papers)
  const {
    data: packageData,
    isLoading: packageLoading,
    error: packageError,
    refetch: refetchPackage,
  } = usePracticeDetail(packageId);

  const packageName = packageData?.package?.name ?? '';
  const packagePrice = packageData?.package?.price ?? 0;
  const dbPackageId = packageData?.package?.packageId ?? packageId;
  const isFree = packagePrice === 0;

  // Purchase State
  const [purchaseState, setPurchaseState] = useState<PurchaseStateContext>({
    state: 'idle',
  });

  // Check enrollment/purchase
  useEffect(() => {
    if (!isValidUuid || isFree) return;

    const checkInitialPurchase = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const profileId = sessionData?.session?.user?.id;

        if (!profileId) return;

        const purchased = await checkPyqPurchase(profileId, packageId);
        if (purchased) {
          setPurchaseState({ state: 'enrolled' });
        }
      } catch (err) {
        console.log('[PYQ_DETAIL] Purchase check error:', err);
      }
    };

    checkInitialPurchase();
  }, [packageId, isValidUuid, isFree]);

  const [studentId, setStudentId] = useState<string | null>(null);
  const createOrderMutation = useCreatePaymentOrder();

  const isPolling =
    purchaseState.state === 'payment_received' ||
    purchaseState.state === 'polling_enrollment';

  const { pollStatus, reset: resetPoll } = usePurchaseStatus({
    studentId,
    courseId: dbPackageId, // Use courseId for the hook, but it checks purchase
    enabled: isPolling,
    checkFn: checkPyqPurchase,
    config: {
      intervalMs: 2500,
      timeoutMs: 120000,
    },
  });

  useEffect(() => {
    if (pollStatus.status === 'enrolled') {
      dispatch(setPurchaseInProgress(false));
      setPurchaseState((prev) => ({ ...prev, state: 'enrolled' }));
    } else if (pollStatus.status === 'timeout') {
      dispatch(setPurchaseInProgress(false));
      setPurchaseState({
        state: 'failed',
        errorMessage:
          'Payment confirmation is taking longer than expected. Access will be activated shortly.',
        courseName: packageName,
        formattedAmount: formatPrice(packagePrice),
      });
    } else if (pollStatus.status === 'error') {
      dispatch(setPurchaseInProgress(false));
      setPurchaseState({
        state: 'failed',
        errorMessage: pollStatus.message,
      });
    }
  }, [pollStatus, packageName, packagePrice]);

  const handleEnrollInit = useCallback(() => {
    if (purchaseState.state !== 'idle' && purchaseState.state !== 'failed') return;
    
    if (!dbPackageId || !UUID_REGEX.test(dbPackageId)) {
      setPurchaseState({
        state: 'failed',
        errorMessage: 'Invalid package data. Please go back and try again.',
      });
      return;
    }
    
    setPurchaseState({
      state: 'order_summary',
      courseName: packageName,
      formattedAmount: formatPrice(packagePrice),
    });
  }, [purchaseState.state, dbPackageId, packageName, packagePrice]);

  const handleConfirmPurchase = useCallback(async () => {
    try {
      dispatch(setPurchaseInProgress(true));
      setPurchaseState((prev) => ({ ...prev, state: 'creating_order' }));

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const profileId = sessionData?.session?.user?.id;
      if (!profileId || sessionError) {
        setPurchaseState({
          state: 'failed',
          errorMessage: 'Please sign in to purchase packages.',
        });
        return;
      }
      setStudentId(profileId);

      const result = await createOrderMutation.mutateAsync({
        packageId: dbPackageId,
        studentId: profileId,
        instituteId: '',
      });

      setPurchaseState((prev) => ({
        ...prev,
        state: 'checkout_open',
        razorpayOrderId: result.razorpayOrderId,
        orderId: result.orderId,
      }));

      const razorpayResult = await openCheckout(result);

      if (razorpayResult.success) {
        setPurchaseState((prev) => ({
          ...prev,
          state: 'polling_enrollment',
          razorpayOrderId: result.razorpayOrderId,
          orderId: result.orderId,
        }));
      } else {
        const errorInfo = razorpayResult.error;
        const errMsg = typeof errorInfo === 'string' 
          ? errorInfo 
          : errorInfo.code === 2 
            ? 'Payment was cancelled.' 
            : errorInfo.description || 'Payment failed.';
            
        dispatch(setPurchaseInProgress(false));
        setPurchaseState({
          state: 'failed',
          errorMessage: errMsg,
          razorpayOrderId: result.razorpayOrderId,
        });
      }
    } catch (err) {
      dispatch(setPurchaseInProgress(false));
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setPurchaseState({
        state: 'failed',
        errorMessage: message,
        courseName: packageName,
        formattedAmount: formatPrice(packagePrice),
      });
    }
  }, [createOrderMutation, dbPackageId, packageName, packagePrice]);

  const resetPurchase = useCallback(() => {
    dispatch(setPurchaseInProgress(false));
    resetPoll();
    setStudentId(null);
    setPurchaseState({ state: 'idle' });
  }, [resetPoll, dispatch]);

  async function handleShare(): Promise<void> {
    if (!packageData) return;
    try {
      await Share.share({
        title: packageData.package.name,
        message: `Check out "${packageData.package.name}" PYQs on MockPrep! 🎓

Price: ${formatPrice(packageData.package.price)}

Download now!`,
      });
    } catch {}
  }

  const isEnrolled = purchaseState.state === 'enrolled' || isFree;
  const isPurchasing = purchaseState.state !== 'idle' && purchaseState.state !== 'failed' && purchaseState.state !== 'enrolled';
  const buyDisabled = !packageData || isPurchasing || !!packageError || packageLoading;

  if (packageLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={coursesDark.accentPrimary} />
        <Text style={styles.loadingText}>Loading package details…</Text>
      </View>
    );
  }

  if (packageError || !packageData) {
    return (
      <View style={styles.errorScreen}>
        <Icon name="alert-triangle" color={coursesDark.categories.law.accent} width={56} height={56} />
        <Text style={styles.errorTitle}>Could not load details</Text>
        <Text style={styles.errorText}>
          {packageError instanceof Error ? packageError.message : 'Please check your connection and try again.'}
        </Text>
        <TouchableOpacity onPress={() => refetchPackage()} style={styles.retryButton}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const info = packageData.package;
  
  // Create metrics
  const totalQuestions = packageData.papers.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
  const totalDuration = packageData.papers.reduce((sum, p) => sum + (p.durationMin || 0), 0);
  const hours = Math.round(totalDuration / 60);

  const metrics: Array<{ key: string; label: string; value: string; iconName: string; accentColor: string; }> = [
    {
      key: 'papers',
      label: 'Total Papers',
      value: String(info.totalPapers),
      iconName: 'description',
      accentColor: coursesDark.accentPrimary,
    },
    {
      key: 'questions',
      label: 'Questions',
      value: formatCount(totalQuestions),
      iconName: 'clipboard-list',
      accentColor: coursesDark.categories.engineering.accent,
    },
    {
      key: 'years',
      label: 'Year Coverage',
      value: info.yearFrom && info.yearTo ? `${info.yearFrom}-${info.yearTo}` : (info.yearFrom ? String(info.yearFrom) : 'All Years'),
      iconName: 'calendar',
      accentColor: coursesDark.categories.medical.accent,
    }
  ];

  if (hours > 0) {
    metrics.push({
      key: 'duration',
      label: 'Total Duration',
      value: `${hours} hrs`,
      iconName: 'clock',
      accentColor: coursesDark.categories.law.accent,
    });
  }

  // Group papers by year
  const papersByYear = packageData.papers.reduce((acc, paper) => {
    const year = paper.examYear || 0;
    if (!acc[year]) acc[year] = [];
    acc[year].push(paper);
    return acc;
  }, {} as Record<number, PracticePaper[]>);

  const curriculum = Object.entries(papersByYear)
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA)) // Latest first
    .map(([yearStr, papers]) => {
      const year = Number(yearStr);
      const isLatest = year === info.yearTo;
      
      const yearDuration = papers.reduce((sum, p) => sum + (p.durationMin || 0), 0);
      const formattedDuration = yearDuration > 60 
        ? `${Math.floor(yearDuration/60)}h ${yearDuration%60}m` 
        : `${yearDuration}m`;

      return {
        key: `year-${year}`,
        name: year === 0 ? 'General / Misc' : `${year} Papers`,
        chapterCount: `${papers.length} Papers`,
        hours: formattedDuration,
        iconName: 'calendar',
        accentColor: isLatest ? coursesDark.categories.engineering.accent : coursesDark.accentPrimary,
        chapters: papers.map(p => ({
          paperId: p.paperId,
          name: p.title,
          isLocked: !isEnrolled,
          duration: p.durationMin,
          questions: p.totalQuestions,
        }))
      };
    });

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        bounces
      >
        <CourseDetailHero
          title={info.name}
          category={info.streamName}
          instructor="Previous Year Papers"
          rating={info.rating || 4.8}
          imageUrl={info.thumbnailUrl}
          onBackPress={() => navigation.goBack()}
          onSharePress={handleShare}
          scrollY={scrollY}
        />

        <View style={styles.quickInfoCard}>
          <View style={styles.metricsGrid}>
            {metrics.slice(0, 4).map((metric) => (
              <MetricGridItem key={metric.key} metric={metric} />
            ))}
          </View>
        </View>

        {info.description && (
          <SectionCard>
            <Text style={styles.sectionTitle}>Package Description</Text>
            <Text style={styles.descriptionText}>{info.description}</Text>
          </SectionCard>
        )}

        <SectionCard>
          <Text style={styles.sectionTitle}>Papers Included</Text>
          <View style={styles.curriculumList}>
            {curriculum.map((subj) => (
              <CurriculumAccordion key={subj.key} subject={subj} />
            ))}
          </View>
        </SectionCard>
      </Animated.ScrollView>

      <PurchaseOverlay
        purchaseState={purchaseState}
        onDismiss={resetPurchase}
        onRetry={handleConfirmPurchase}
        onConfirmPurchase={handleConfirmPurchase}
      />

      <SafeAreaView edges={['bottom']} style={styles.bottomBarContainer}>
        <View style={styles.bottomBar}>
          <View style={styles.priceWrap}>
            {isEnrolled ? (
              <Text style={styles.enrolledLabel}>Purchased</Text>
            ) : (
              <>
                <View style={styles.bottomPriceRow}>
                  <Text style={styles.bottomPrice}>{formatPrice(info.price)}</Text>
                  {info.badgeLabel && (
                    <View style={styles.discountPill}>
                      <Text style={styles.discountPillText}>{info.badgeLabel}</Text>
                    </View>
                  )}
                </View>
                {info.originalPrice && info.originalPrice > info.price && (
                  <Text style={styles.bottomOriginalPrice}>{formatPrice(info.originalPrice)}</Text>
                )}
              </>
            )}
          </View>

          <View style={styles.bottomButtons}>
            {isEnrolled ? (
              <TouchableOpacity
                style={[styles.btnEnroll, styles.btnEnrolled]}
                activeOpacity={0.8}
              >
                <Icon name="play-circle" color="#FFFFFF" width={16} height={16} />
                <Text style={styles.btnEnrollText}>Start Practicing</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnEnroll, buyDisabled && styles.btnEnrollDisabled]}
                onPress={handleEnrollInit}
                disabled={buyDisabled}
                activeOpacity={0.9}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="badge-check" color="#FFFFFF" width={16} height={16} />
                    <Text style={styles.btnEnrollText}>Buy Now</Text>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: coursesDark.base,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: coursesDark.base,
    gap: spacing[12],
  },
  loadingText: {
    ...typography.body,
    color: coursesDark.textMutedOnDark,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: coursesDark.base,
    padding: spacing[32],
    gap: spacing[12],
  },
  errorTitle: {
    ...typography.sectionTitle,
    color: coursesDark.textOnDark,
  },
  errorText: {
    ...typography.body,
    color: coursesDark.textMutedOnDark,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing[12],
    backgroundColor: coursesDark.accentPrimary,
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  quickInfoCard: {
    marginHorizontal: spacing[16],
    marginTop: -spacing[24],
    backgroundColor: coursesDark.surfaceCard,
    borderRadius: radius.xl,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing[12],
  },
  metricCard: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextWrap: {
    flex: 1,
  },
  metricValue: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: coursesDark.textOnCard,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 10,
    color: coursesDark.textMutedOnCard,
  },
  sectionCard: {
    marginHorizontal: spacing[16],
    marginTop: spacing[12],
    backgroundColor: coursesDark.surfaceCard,
    borderRadius: radius.xl,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: coursesDark.textOnCard,
    marginBottom: spacing[12],
  },
  featureGrid: {
    gap: spacing[8],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  featureText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: coursesDark.textOnCard,
  },
  descriptionText: {
    ...typography.bodySmall,
    fontSize: 13,
    lineHeight: 20,
    color: coursesDark.textMutedOnCard,
  },
  curriculumList: {
    gap: spacing[8],
  },
  accordionWrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[12],
    backgroundColor: '#F8FAFC',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    flex: 1,
  },
  accordionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionHeaderText: {
    flex: 1,
  },
  accordionTitle: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: coursesDark.textOnCard,
  },
  accordionSubtitle: {
    ...typography.caption,
    fontSize: 10,
    color: coursesDark.textMutedOnCard,
  },
  chevronDefault: {},
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  accordionContent: {
    paddingHorizontal: spacing[12],
    backgroundColor: '#FFFFFF',
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
  },
  chapterRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDF2F7',
  },
  chapterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    flex: 1,
  },
  chapterName: {

    ...typography.caption,
    fontSize: 12,
    color: coursesDark.textOnCard,
    flex: 1,
  
  },
  chapterMeta: {
    ...typography.caption,
    fontSize: 10,
    color: coursesDark.textMutedOnCard,
    marginTop: 2,
  },
  chapterLocked: {
    color: coursesDark.textMutedOnCard,
  },
  lockedBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  lockedBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: coursesDark.textMutedOnCard,
  },
  instructorList: {
    gap: spacing[12],
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  instructorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorInitials: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '700',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: coursesDark.textOnCard,
  },
  instructorCredential: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  instructorExperience: {
    ...typography.caption,
    fontSize: 10,
    color: coursesDark.textMutedOnCard,
  },
  faqContainer: {
    gap: spacing[4],
  },
  faqItem: {
    paddingVertical: spacing[4],
  },
  faqItemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
    gap: spacing[8],
  },
  faqQuestion: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: coursesDark.textOnCard,
    flex: 1,
  },
  faqAnswerWrap: {
    paddingBottom: spacing[12],
  },
  faqAnswer: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    color: coursesDark.textMutedOnCard,
  },
  bottomBarContainer: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: coursesDark.dividerOnDark,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: '#FFFFFF',
  },
  priceWrap: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  bottomPrice: {
    ...typography.priceTag,
    color: coursesDark.textOnCard,
  },
  discountPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountPillText: {
    ...typography.badgeLabelCustom,
    color: '#059669',
    fontSize: 8,
    fontWeight: '800',
  },
  bottomOriginalPrice: {
    ...typography.caption,
    fontSize: 11,
    color: coursesDark.textMutedOnCard,
    textDecorationLine: 'line-through',
  },
  enrolledLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: coursesDark.accentPrimary,
  },
  bottomButtons: {
    flex: 1,
    alignItems: 'flex-end',
  },
  btnEnroll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: coursesDark.accentPrimary,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    borderRadius: radius.lg,
    minWidth: 120,
  },
  btnEnrolled: {
    backgroundColor: '#10B981',
  },
  btnEnrollDisabled: {
    opacity: 0.6,
  },
  btnEnrollText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  checkoutSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing[20],
    paddingBottom: spacing[40],
  },
  overlaySpinnerWrap: {
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  checkoutTitle: {
    ...typography.cardTitle,
    color: coursesDark.textOnCard,
    textAlign: 'center',
    fontSize: 18,
    marginBottom: spacing[16],
  },
  checkoutDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    padding: spacing[12],
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing[16],
  },
  checkoutCourseName: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: coursesDark.textOnCard,
    marginBottom: spacing[8],
  },
  checkoutDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: spacing[8],
  },
  checkoutPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkoutTotalLabel: {
    ...typography.caption,
    fontSize: 12,
    color: coursesDark.textMutedOnCard,
  },
  checkoutTotalValue: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '800',
    color: coursesDark.accentPrimary,
  },
  overlayMessage: {
    ...typography.bodySmall,
    color: coursesDark.textMutedOnCard,
    textAlign: 'center',
    marginBottom: spacing[16],
  },
  overlayActions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  overlayBtn: {
    flex: 1,
    paddingVertical: spacing[12],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  overlayBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  overlayBtnOutlineText: {
    ...typography.buttonSmall,
    color: coursesDark.textOnCard,
    fontWeight: '700',
  },
  overlayBtnPrimary: {
    backgroundColor: coursesDark.accentPrimary,
  },
  overlayBtnPrimaryText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkoutPayAction: {
    marginTop: spacing[4],
  },
  checkoutPayButton: {
    backgroundColor: coursesDark.accentPrimary,
    borderRadius: radius.lg,
    paddingVertical: spacing[12],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutPayButtonLoading: {
    opacity: 0.7,
  },
  checkoutPayText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
