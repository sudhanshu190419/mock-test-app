import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Icon from './Icons';
import { coursesDark, typographyV5 } from '../../theme';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useLiveClasses, LiveClass } from '../../hooks/useLiveClasses';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function ConnectLiveClassBanner() {
  const { data: liveClasses, isLoading } = useLiveClasses();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleTimetablePress = () => {
    navigation.navigate('Timetable');
  };

  const accordionStyle = useAnimatedStyle(() => {
    return {
      maxHeight: withTiming(isExpanded ? 200 : 0, { duration: 200 }),
      opacity: withTiming(isExpanded ? 1 : 0, { duration: 200 }),
      overflow: 'hidden',
    };
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={coursesDark.accentPrimary} />
      </View>
    );
  }

  const hasClasses = liveClasses && liveClasses.length > 0;
  const earliestClass = hasClasses ? liveClasses[0] : null;
  const remainingClasses = hasClasses ? liveClasses.slice(1) : [];

  return (
    <View style={styles.container}>
      {hasClasses && earliestClass ? (
        <>
          <TouchableOpacity 
            style={styles.bannerButton} 
            onPress={toggleExpand}
            activeOpacity={0.8}
          >
            <View style={styles.bannerContent}>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  {earliestClass.isLiveNow ? 'LIVE NOW' : 'UPCOMING'}
                </Text>
              </View>
              <Text style={styles.classTitle} numberOfLines={1}>{earliestClass.title}</Text>
              <Text style={styles.classSubtitle}>{earliestClass.startTime} • {earliestClass.instructor}</Text>
            </View>

            <TouchableOpacity 
              style={styles.timetableButton} 
              onPress={handleTimetablePress}
              activeOpacity={0.7}
            >
              <Icon name="calendar" color={coursesDark.accentPrimary} width={20} height={20} />
            </TouchableOpacity>
          </TouchableOpacity>

          <Animated.View style={[styles.accordionContainer, accordionStyle]}>
            <ScrollView 
              style={styles.scrollList}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {remainingClasses.length > 0 ? (
                remainingClasses.map((cls: LiveClass) => (
                  <View key={cls.id} style={styles.listItem}>
                    <Text style={styles.listTitle} numberOfLines={1}>{cls.title}</Text>
                    <Text style={styles.listSubtitle}>{cls.startTime} • {cls.instructor}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noMoreClassesText}>No more live classes today.</Text>
              )}
            </ScrollView>
          </Animated.View>
        </>
      ) : (
        <View style={styles.noClassContainer}>
          <Text style={styles.noClassText}>No live class today</Text>
          <TouchableOpacity 
            style={styles.timetableButton} 
            onPress={handleTimetablePress}
            activeOpacity={0.7}
          >
            <Icon name="calendar" color={coursesDark.accentPrimary} width={20} height={20} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: coursesDark.surfaceCardDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerContent: {
    flex: 1,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveText: {
    color: '#EF4444',
    fontFamily: typographyV5.buttonLabel.fontFamily,
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  classTitle: {
    color: coursesDark.textOnDark,
    fontFamily: typographyV5.cardTitleHero.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  classSubtitle: {
    color: coursesDark.textMutedOnDark,
    fontFamily: typographyV5.metadata.fontFamily,
    fontSize: 12,
  },
  timetableButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  accordionContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  scrollList: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  listTitle: {
    color: coursesDark.textOnDark,
    fontFamily: typographyV5.cardTitle.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  listSubtitle: {
    color: coursesDark.textMutedOnDark,
    fontFamily: typographyV5.metadata.fontFamily,
    fontSize: 12,
  },
  noMoreClassesText: {
    color: coursesDark.textMutedOnDark,
    fontFamily: typographyV5.metadata.fontFamily,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  noClassContainer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noClassText: {
    color: coursesDark.textOnDark,
    fontFamily: typographyV5.cardTitleHero.fontFamily,
    fontSize: 15,
    fontWeight: '500',
  }
});
