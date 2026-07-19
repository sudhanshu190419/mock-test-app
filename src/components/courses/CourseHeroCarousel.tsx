import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../home/Icons';

const { width } = Dimensions.get('window');
const CAROUSEL_WIDTH = width - 32;

export interface FeaturedCourse {
  courseId: string;
  title: string;
  category: string;
  instructor: string;
  totalStudents: number;
  price: number;
  originalPrice?: number;
  discountLabel?: string;
}

interface CourseHeroCarouselProps {
  courses: FeaturedCourse[];
  onCoursePress: (courseId: string) => void;
}

function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function CourseHeroCarousel({
  courses,
  onCoursePress,
}: CourseHeroCarouselProps): React.JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<any>(null);

  useEffect(() => {
    if (courses.length <= 1) return;

    const startAutoScroll = () => {
      autoScrollTimer.current = setInterval(() => {
        let nextIndex = activeIndex + 1;
        if (nextIndex >= courses.length) {
          nextIndex = 0;
        }
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        setActiveIndex(nextIndex);
      }, 4000);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [activeIndex, courses.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / CAROUSEL_WIDTH);
    if (index !== activeIndex && index >= 0 && index < courses.length) {
      setActiveIndex(index);
    }
  };

  if (!courses || courses.length === 0) return null;

  const renderItem = ({ item, index }: { item: FeaturedCourse; index: number }) => {
    // Resolve category gradients
    const catKey = (item.category || 'all').toLowerCase().trim();
    let catColors: { accent: string; gradient: readonly string[] } = coursesDark.categories.all;
    if (catKey.includes('neet')) catColors = coursesDark.categories.medical;
    else if (catKey.includes('jee')) catColors = coursesDark.categories.engineering;
    else if (catKey.includes('school') || catKey.includes('class')) catColors = coursesDark.categories.school;
    else if (catKey.includes('clat') || catKey.includes('law')) catColors = coursesDark.categories.law;
    else if (catKey.includes('cuet')) catColors = coursesDark.categories.cuet;

    const discountPercent =
      item.originalPrice && item.originalPrice > item.price
        ? Math.round((1 - item.price / item.originalPrice) * 100)
        : 0;

    const displayDiscount =
      item.discountLabel ?? (discountPercent > 0 ? `${discountPercent}% OFF` : undefined);

    return (
      <Animated.View
        entering={FadeInRight.delay(index * 100).duration(200)}
        style={styles.cardWrapper}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onCoursePress(item.courseId)}
          style={styles.cardTouch}
        >
          <LinearGradient
            colors={[...catColors.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Top Row with Badge & Rating */}
            <View style={styles.topRow}>
              <View style={styles.featuredBadge}>
                <Icon name="trophy" color={coursesDark.accentPrimary} width={12} height={12} />
                <Text style={styles.featuredBadgeText}>FEATURED BATCH</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
              </View>
            </View>

            {/* Title & Instructor */}
            <View style={styles.middleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.instructorText}>
                By {item.instructor} • {item.totalStudents.toLocaleString('en-IN')}+ enrolled
              </Text>
            </View>

            {/* Bottom Row with pricing and CTA */}
            <View style={styles.bottomRow}>
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                  {displayDiscount && (
                    <View style={styles.discountPill}>
                      <Text style={styles.discountText}>{displayDiscount}</Text>
                    </View>
                  )}
                </View>
                {item.originalPrice && item.originalPrice > item.price && (
                  <Text style={styles.originalPriceText}>
                    {formatPrice(item.originalPrice)}
                  </Text>
                )}
              </View>

              <View style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>Enroll Now</Text>
                <Icon name="arrow-right" color="#FFFFFF" width={14} height={14} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={courses}
        renderItem={renderItem}
        keyExtractor={(item) => item.courseId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={CAROUSEL_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContainer}
      />
      {courses.length > 1 && (
        <View style={styles.pagination}>
          {courses.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[8],
  },
  flatListContainer: {
    paddingHorizontal: spacing[16],
  },
  cardWrapper: {
    width: CAROUSEL_WIDTH,
    paddingRight: spacing[12],
  },
  cardTouch: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    height: 194,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardGradient: {
    flex: 1,
    padding: spacing[16],
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: coursesDark.dividerOnDark,
  },
  featuredBadgeText: {
    ...typography.badgeLabelCustom,
    color: coursesDark.accentPrimary,
    fontWeight: '800',
    fontSize: 9,
  },
  categoryBadge: {
    backgroundColor: 'rgba(11, 87, 208, 0.08)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  categoryBadgeText: {
    ...typography.badgeLabelCustom,
    color: coursesDark.accentPrimary,
    fontWeight: '800',
    fontSize: 9,
  },
  middleContainer: {
    gap: spacing[4],
    marginVertical: spacing[8],
  },
  title: {
    ...typography.heroTitle,
    fontSize: 20,
    color: coursesDark.textOnDark,
    fontWeight: '900',
    lineHeight: 26,
  },
  instructorText: {
    ...typography.bodySmall,
    color: coursesDark.textMutedOnDark,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  priceText: {
    ...typography.priceTag,
    color: coursesDark.textOnDark,
    fontSize: 20,
  },
  discountPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountText: {
    ...typography.badgeLabelCustom,
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
  },
  originalPriceText: {
    ...typography.bodySmall,
    color: coursesDark.textMutedOnDark,
    textDecorationLine: 'line-through',
    fontSize: 12,
  },
  ctaButton: {
    backgroundColor: coursesDark.accentPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.lg,
  },
  ctaButtonText: {
    ...typography.buttonSmall,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[8],
    marginTop: spacing[12],
  },
  dot: {
    height: 6,
    borderRadius: radius.full,
  },
  dotActive: {
    width: 16,
    backgroundColor: coursesDark.accentPrimary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(11, 87, 208, 0.15)',
  },
});
