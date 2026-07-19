import React from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../home/Icons';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 280;

interface CourseDetailHeroProps {
  title: string;
  category: string;
  instructor: string;
  rating: number;
  imageUrl?: string | null;
  onBackPress: () => void;
  onSharePress: () => void;
  scrollY: SharedValue<number>;
}

export default function CourseDetailHero({
  title,
  category,
  instructor,
  rating,
  imageUrl,
  onBackPress,
  onSharePress,
  scrollY,
}: CourseDetailHeroProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const animatedImageStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0, HERO_HEIGHT],
      [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.4]
    );
    const scale = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0],
      [1.3, 1]
    );

    return {
      transform: [
        { translateY },
        { scale },
      ],
    };
  });

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT - 100],
      [1, 0]
    );
    return {
      opacity,
    };
  });

  // Resolve category gradients
  const catKey = (category || 'all').toLowerCase().trim();
  let catColors: { accent: string; gradient: readonly string[] } = coursesDark.categories.all;
  if (catKey.includes('neet')) catColors = coursesDark.categories.medical;
  else if (catKey.includes('jee')) catColors = coursesDark.categories.engineering;
  else if (catKey.includes('school') || catKey.includes('class')) catColors = coursesDark.categories.school;
  else if (catKey.includes('clat') || catKey.includes('law')) catColors = coursesDark.categories.law;
  else if (catKey.includes('cuet')) catColors = coursesDark.categories.cuet;

  return (
    <View style={styles.container}>
      {/* Background Image/Gradient with Parallax */}
      <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <LinearGradient
            colors={[...catColors.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        )}
        <LinearGradient
          colors={['rgba(30, 41, 59, 0.4)', 'transparent', 'rgba(30, 41, 59, 0.85)']}
          style={styles.gradientOverlay}
        />
      </Animated.View>

      {/* Floating Action Buttons */}
      <Animated.View style={[styles.headerActions, { top: insets.top + spacing[12] }, animatedHeaderStyle]}>
        <TouchableOpacity
          onPress={onBackPress}
          activeOpacity={0.7}
          style={styles.frostedButton}
        >
          <Icon name="arrow-left" color="#FFFFFF" width={18} height={18} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSharePress}
          activeOpacity={0.7}
          style={styles.frostedButton}
        >
          <Icon name="bookmark" color="#FFFFFF" width={18} height={18} />
        </TouchableOpacity>
      </Animated.View>

      {/* Hero Metadata Info (Overlaid on bottom) */}
      <View style={styles.metaContainer}>
        <View style={styles.tagsRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Icon name="star" color="#FBBF24" width={11} height={11} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        </View>
        
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        
        <Text style={styles.instructor}>
          By <Text style={styles.instructorName}>{instructor}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: coursesDark.base,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
  },
  headerActions: {
    position: 'absolute',
    left: spacing[16],
    right: spacing[16],
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  frostedButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  metaContainer: {
    position: 'absolute',
    bottom: spacing[16],
    left: spacing[16],
    right: spacing[16],
    gap: spacing[8],
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  categoryText: {
    ...typography.badgeLabelCustom,
    color: '#FFFFFF',
    fontSize: 9,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  ratingText: {
    ...typography.badgeLabelCustom,
    color: '#FFFFFF',
    fontSize: 9,
  },
  title: {
    ...typography.heroTitle,
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  instructor: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  instructorName: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
