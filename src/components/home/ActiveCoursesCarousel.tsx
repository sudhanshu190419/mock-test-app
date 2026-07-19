import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { coursesDark, typographyV5 } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { getCourseProgress } from '../../utils/courseProgress';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // Full width minus horizontal margins

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ActiveCourseCardProps {
  course: any;
  userId: string | undefined;
}

const ActiveCourseCard = React.memo(({ course, userId }: ActiveCourseCardProps) => {
  const [progress, setProgress] = useState(0);
  const navigation = useNavigation<NavigationProp>();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (userId && course.courseId) {
      getCourseProgress(userId, course.courseId)
        .then((p) => setProgress(p))
        .catch(() => setProgress(0));
    }
  }, [userId, course.courseId]);

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 200 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 200 });
  };

  const handlePress = () => {
    navigation.navigate('CourseDetail', { courseId: course.courseId });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedTouchableOpacity
      style={[styles.cardContainer, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MY COURSE</Text>
        </View>
      </View>
      
      <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
      
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{progress}%</Text>
          <Text style={styles.progressLabel}>Completed</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
});

export default function ActiveCoursesCarousel({ courses }: { courses: any[] }) {
  const user = { id: 'mock-user-123' };

  if (!courses || courses.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>ACTIVE COURSES</Text>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.courseId}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH + 16} // card width + margin between items if any
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ActiveCourseCard course={item} userId={user?.id} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  heading: {
    color: coursesDark.textOnDark,
    fontFamily: typographyV5.cardTitleHero.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 16,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 16, // Assuming gap is supported, otherwise we need item margins
  },
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: coursesDark.surfaceCardDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'space-between',
    minHeight: 140,
    marginRight: 16, // fallback if gap isn't supported in all RN versions
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#10B981',
    fontFamily: typographyV5.buttonLabel.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  courseTitle: {
    color: coursesDark.textOnDark,
    fontFamily: typographyV5.cardTitleHero.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  progressSection: {
    marginTop: 'auto',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressText: {
    color: coursesDark.accentPrimary,
    fontFamily: typographyV5.cardTitleHero.fontFamily,
    fontVariant: ['tabular-nums'],
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  progressLabel: {
    color: coursesDark.textMutedOnDark,
    fontFamily: typographyV5.metadata.fontFamily,
    fontSize: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: coursesDark.accentPrimary,
    borderRadius: 3,
  },
});
