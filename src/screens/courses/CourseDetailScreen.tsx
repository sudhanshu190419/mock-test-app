/**
 * CourseDetailScreen
 *
 * Production-optimised course details page — zero animation overhead,
 * instant render, minimal re-renders. Preserves the original visual
 * design exactly.
 *
 * @module screens/courses/CourseDetailScreen
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import type { CourseDetail, CurriculumSubject, FaqItem, Instructor, CourseMetric } from '../../types/courseDetail';

// ═══════════════════════════════════════════════════════════════════════════
//  Mock Data
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_COURSE: CourseDetail = {
  courseId: 'jee-advanced-2025',
  category: 'Engineering Entrance',
  title: 'JEE Advanced 2025: Ultimate Ranker Batch',
  rating: 4.9,
  reviewCount: 2400,
  studentCount: 15000,
  badgeLabel: 'Best Seller',
  price: 4999,
  originalPrice: 9999,
  discountLabel: '50% OFF',
  offerMessage: 'Limited time offer. Enroll before the batch starts!',
  metrics: [
    { key: 'mock-tests', iconName: 'clipboard-list', value: '180+', label: 'Full-length Mock Tests', accentColor: colors.secondary },
    { key: 'pyqs', iconName: 'book-open', value: '15 Years', label: 'Previous Year Questions', accentColor: colors.primary },
    { key: 'hours', iconName: 'video', value: '900+ Hours', label: 'Live & Recorded Content', accentColor: '#F59E0B' },
    { key: 'notes', iconName: 'description', value: '300+', label: 'Comprehensive PDF Notes', accentColor: '#DC2626' },
  ],
  aboutDescription:
    'Unlock your engineering potential with the most comprehensive JEE Advanced 2025 preparation batch. Our curriculum is meticulously designed by top educators and IIT alumni to provide an edge in one of the world\'s most competitive exams.',
  aboutFeatures: [
    'Daily Live Classes: Interactive sessions with real-time doubt clearing.',
    'Personalized Mentorship: Weekly 1-on-1 strategy sessions with dedicated mentors.',
    'Complete Syllabus: Deep-dive coverage from Class 11th basics to advanced concepts.',
    'Mock Test Series: Full-length tests simulating actual JEE Advanced pattern.',
  ],
  curriculum: [
    {
      key: 'physics',
      name: 'Physics',
      iconName: 'atom',
      accentColor: colors.secondary,
      chapterCount: '28 Chapters',
      hours: '250+ Hours',
      chapters: [
        { name: 'Kinematics & Mechanics', isLocked: false },
        { name: 'Laws of Motion', isLocked: true },
        { name: 'Work, Energy & Power', isLocked: true },
        { name: 'Rotational Motion', isLocked: true },
        { name: 'Gravitation', isLocked: true },
      ],
    },
    {
      key: 'chemistry',
      name: 'Chemistry',
      iconName: 'science',
      accentColor: colors.primary,
      chapterCount: '32 Chapters',
      hours: '220+ Hours',
      chapters: [
        { name: 'Some Basic Concepts', isLocked: false },
        { name: 'Atomic Structure', isLocked: true },
        { name: 'Chemical Bonding', isLocked: true },
        { name: 'Thermodynamics', isLocked: true },
        { name: 'Equilibrium', isLocked: true },
      ],
    },
    {
      key: 'mathematics',
      name: 'Mathematics',
      iconName: 'layers',
      accentColor: '#F59E0B',
      chapterCount: '25 Chapters',
      hours: '300+ Hours',
      chapters: [
        { name: 'Sets & Functions', isLocked: false },
        { name: 'Trigonometry', isLocked: true },
        { name: 'Algebra', isLocked: true },
        { name: 'Calculus', isLocked: true },
        { name: 'Coordinate Geometry', isLocked: true },
      ],
    },
  ],
  instructors: [
    {
      key: 'sameer-verma',
      name: 'Dr. Sameer Verma',
      credential: 'IIT Delhi Alumni',
      experience: '15+ Years Experience (Physics)',
      accentColor: colors.secondary,
      initials: 'SV',
      avatarBg: colors.tint.blue,
    },
    {
      key: 'priya-sharma',
      name: 'Priya Sharma',
      credential: 'Gold Medalist (Chemistry)',
      experience: '10+ Years Experience',
      accentColor: colors.primary,
      initials: 'PS',
      avatarBg: colors.tint.green,
    },
    {
      key: 'ankit-kapoor',
      name: 'Ankit Kapoor',
      credential: 'Mathematics Wizard',
      experience: 'AIR 420 in JEE ADV',
      accentColor: '#F59E0B',
      initials: 'AK',
      avatarBg: colors.tint.amber,
    },
  ],
  faqs: [
    {
      key: 'beginner',
      question: 'Is this course for beginners?',
      answer:
        'Yes, we start from basic concepts of Class 11th and progress to advanced JEE Advanced problems. No prior JEE preparation is required.',
    },
    {
      key: 'offline',
      question: 'Can I watch offline?',
      answer:
        'Yes, you can download all recorded lectures and PDF notes in our mobile app for offline study. Available on both Android and iOS.',
    },
    {
      key: 'validity',
      question: 'How long is the course valid?',
      answer:
        'The course is valid until JEE Advanced 2025. You get full access to all live sessions, recordings, and materials throughout your preparation journey.',
    },
    {
      key: 'doubt',
      question: 'How do I get my doubts cleared?',
      answer:
        'You can ask doubts during live classes via chat, book 1-on-1 mentorship sessions, or post in the community forum where educators respond within 24 hours.',
    },
  ],
};

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

// ─── Module-level constants ──────────────────────────────────────────────────

/** Placeholder for future enrollment navigation. */
function handleEnroll(): void {
  /* TODO: Navigate to enrollment/payment flow */
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════════════

export default function CourseDetailScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // ── Share handler ─────────────────────────────────────────────
  async function handleShare(): Promise<void> {
    try {
      await Share.share({
        title: MOCK_COURSE.title,
        message: `Check out "${MOCK_COURSE.title}" on MockPrep! 🎓\n\nPrice: ${formatPrice(MOCK_COURSE.price)} (${MOCK_COURSE.discountLabel} OFF)\n\nDownload the app now!`,
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
          <Text style={styles.categoryBadge}>{MOCK_COURSE.category}</Text>
          <Text style={styles.courseTitle}>{MOCK_COURSE.title}</Text>

          {/* Rating & Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="star" color="#FBBF24" width={16} height={16} />
              <Text style={styles.statText}>
                {MOCK_COURSE.rating} ({formatCount(MOCK_COURSE.reviewCount)} Reviews)
              </Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Icon name="users" color={colors.text.secondary} width={16} height={16} />
              <Text style={styles.statText}>{formatCount(MOCK_COURSE.studentCount)}+ Students</Text>
            </View>
          </View>

          {/* Best Seller Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.bestSellerBadge}>
              <Icon name="trophy" color="#FBBF24" width={12} height={12} />
              <Text style={styles.bestSellerText}>{MOCK_COURSE.badgeLabel}</Text>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.pricingDivider} />
          <View style={styles.pricingRow}>
            <View style={styles.pricingLeft}>
              <Text style={styles.currentPrice}>{formatPrice(MOCK_COURSE.price)}</Text>
              <Text style={styles.originalPrice}>{formatPrice(MOCK_COURSE.originalPrice)}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{MOCK_COURSE.discountLabel}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.offerText}>{MOCK_COURSE.offerMessage}</Text>
        </View>

        {/* ─── Metrics Bento Grid ────────────────────────────────── */}
        <View style={styles.metricsGrid}>
          {MOCK_COURSE.metrics.map((metric) => (
            <MetricGridItem key={metric.key} metric={metric} />
          ))}
        </View>

        {/* ─── About Section ─────────────────────────────────────── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>About this Course</Text>
          <Text style={styles.aboutText}>{MOCK_COURSE.aboutDescription}</Text>
          <View style={styles.featureList}>
            {MOCK_COURSE.aboutFeatures.map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={styles.featureBullet}>
                  <Icon name="badge-check" color={colors.primary} width={16} height={16} />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* ─── Curriculum Section ────────────────────────────────── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Course Curriculum</Text>
          <View style={styles.accordionList}>
            {MOCK_COURSE.curriculum.map((subject) => (
              <CurriculumAccordion key={subject.key} subject={subject} />
            ))}
          </View>
        </SectionCard>

        {/* ─── Instructors Section ───────────────────────────────── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Your Mentors</Text>
          <View style={styles.instructorsList}>
            {MOCK_COURSE.instructors.map((instructor) => (
              <InstructorCard key={instructor.key} instructor={instructor} />
            ))}
          </View>
        </SectionCard>

        {/* ─── FAQ Section ───────────────────────────────────────── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Frequently Asked</Text>
          <View style={styles.faqList}>
            {MOCK_COURSE.faqs.map((faq, idx) => (
              <FaqItemBlock key={faq.key} faq={faq} index={idx} />
            ))}
          </View>
        </SectionCard>
      </ScrollView>

      {/* ═══ Fixed Bottom Bar ═══ */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <View style={styles.bottomBar}>
          <View style={styles.bottomPriceWrap}>
            <Text style={styles.bottomPrice}>{formatPrice(MOCK_COURSE.price)}</Text>
            <Text style={styles.bottomOriginalPrice}>{formatPrice(MOCK_COURSE.originalPrice)}</Text>
          </View>
          <View style={styles.bottomButtons}>
            <TouchableOpacity
              onPress={handleEnroll}
              style={styles.enrollButton}
              activeOpacity={0.85}
              accessibilityLabel="Enroll now"
              accessibilityRole="button"
            >
              <Icon name="badge-check" color={colors.text.inverse} width={16} height={16} />
              <Text style={styles.enrollButtonText}>Enroll Now</Text>
            </TouchableOpacity>
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
});
