/**
 * CalendarScreen
 *
 * A premium, highly interactive calendar and timetable viewer for students.
 * Displays daily schedules, live classes, mock tests, and study sessions.
 *
 * Design Highlights:
 * - Clean Outfit typography and modern dark/light contrast (Style C theme).
 * - Staggered horizontal day selection carousel (highlights current day).
 * - Timeline-based event cards showing status (Live, Completed, Upcoming).
 * - Slide and fade entrance animations for timeline list items using react-native-reanimated.
 *
 * @module screens/home/CalendarScreen
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, interpolate } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import type { AppStackParamList } from '../../navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface TimetableEvent {
  id: string;
  time: string;
  duration: string;
  title: string;
  instructor?: string;
  type: 'live' | 'test' | 'study';
  status: 'live' | 'completed' | 'upcoming';
  accentColor: string;
}

interface DayItem {
  date: number;
  dayName: string;
  fullDateString: string;
  isToday?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS_OF_WEEK: DayItem[] = [
  { date: 13, dayName: 'Mon', fullDateString: 'Monday, July 13' },
  { date: 14, dayName: 'Tue', fullDateString: 'Tuesday, July 14' },
  { date: 15, dayName: 'Wed', fullDateString: 'Wednesday, July 15' },
  { date: 16, dayName: 'Thu', fullDateString: 'Thursday, July 16', isToday: true },
  { date: 17, dayName: 'Fri', fullDateString: 'Friday, July 17' },
  { date: 18, dayName: 'Sat', fullDateString: 'Saturday, July 18' },
  { date: 19, dayName: 'Sun', fullDateString: 'Sunday, July 19' },
];

const SCHEDULE_DATA: Record<number, TimetableEvent[]> = {
  13: [
    { id: '1', time: '09:00 AM', duration: '1.5 hrs', title: 'Calculus Limits & Continuity', instructor: 'Prof. Alok Verma', type: 'study', status: 'completed', accentColor: '#3B82F6' },
    { id: '2', time: '02:00 PM', duration: '1 hr', title: 'Chapter Test: Kinematics', type: 'test', status: 'completed', accentColor: '#22C55E' },
  ],
  14: [
    { id: '1', time: '11:00 AM', duration: '2 hrs', title: 'Organic Chemistry Revision', instructor: 'Dr. Meera Iyer', type: 'live', status: 'completed', accentColor: '#05C46B' },
  ],
  15: [
    { id: '1', time: '10:00 AM', duration: '1 hr', title: 'Newton laws of Motion', instructor: 'Prof. Arvind Mukerjee', type: 'study', status: 'completed', accentColor: '#3B82F6' },
    { id: '2', time: '04:00 PM', duration: '1.5 hrs', title: 'UPSC Daily News Analysis', instructor: 'Vikram Joshi', type: 'live', status: 'completed', accentColor: '#7C3AED' },
  ],
  16: [ // Today
    { id: '1', time: '09:30 AM', duration: '1 hr', title: 'NEET 2024 Biology Mock Paper', type: 'test', status: 'completed', accentColor: '#22C55E' },
    { id: '2', time: '03:00 PM', duration: '1.5 hrs', title: 'Inorganic Chemistry Live Prep', instructor: 'Dr. Meera Iyer', type: 'live', status: 'upcoming', accentColor: '#7C3AED' },
    { id: '3', time: '06:00 PM', duration: '2 hrs', title: 'Live Strategy & PYQ Marathon', instructor: 'Dr. Sudhanshu Sharma', type: 'live', status: 'live', accentColor: '#DC2626' },
  ],
  17: [
    { id: '1', time: '10:00 AM', duration: '1.5 hrs', title: 'UPSC CSAT Quantitative Ability', instructor: 'Rohan Desai', type: 'live', status: 'upcoming', accentColor: '#0284C7' },
    { id: '2', time: '02:30 PM', duration: '1 hr', title: 'Full Syllabus Mock Test #4', type: 'test', status: 'upcoming', accentColor: '#22C55E' },
  ],
  18: [
    { id: '1', time: '09:00 AM', duration: '3 hrs', title: 'Self-Study: Modern Physics Notes', type: 'study', status: 'upcoming', accentColor: '#3B82F6' },
  ],
  19: [
    { id: '1', time: '11:00 AM', duration: '1 hr', title: 'Weekly Performance Assessment', type: 'test', status: 'upcoming', accentColor: '#22C55E' },
  ],
};

// ─── Timeline Item component ──────────────────────────────────────────────────

const TimelineEventCard = memo(function TimelineEventCard({
  event,
  index,
}: {
  event: TimetableEvent;
  index: number;
}) {
  const isLive = event.status === 'live';
  const isCompleted = event.status === 'completed';

  // Staggered entry animation shared values
  const animProgress = useSharedValue(0);

  React.useEffect(() => {
    animProgress.value = withDelay(
      index * 80,
      withTiming(1, { duration: 200 })
    );
  }, [index, animProgress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: animProgress.value,
    transform: [
      { translateY: interpolate(animProgress.value, [0, 1], [30, 0]) },
    ],
  }));

  const getIconName = () => {
    switch (event.type) {
      case 'live': return 'play-circle';
      case 'test': return 'clipboard-list';
      default: return 'book-open';
    }
  };

  return (
    <Animated.View style={[styles.timelineItem, cardStyle]}>
      {/* Time column */}
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{event.time}</Text>
        <Text style={styles.durationText}>{event.duration}</Text>
      </View>

      {/* Indicator node */}
      <View style={styles.nodeColumn}>
        <View
          style={[
            styles.nodeCircle,
            { borderColor: event.accentColor },
            isCompleted && { backgroundColor: event.accentColor },
          ]}
        >
          {isCompleted && <Icon name="shield-check" color="#FFFFFF" width={10} height={10} />}
          {isLive && <View style={[styles.pulseDot, { backgroundColor: liveRed }]} />}
        </View>
        <View style={styles.nodeLine} />
      </View>

      {/* Card details */}
      <View
        style={[
          styles.eventCard,
          isLive && styles.eventCardLive,
        ]}
      >
        {/* Status Indicator */}
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isLive ? 'rgba(220, 38, 38, 0.1)' : '#F1F5F9' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isLive ? liveRed : '#475569' },
              ]}
            >
              {event.status.toUpperCase()}
            </Text>
          </View>
          <Icon name={getIconName() as any} color={event.accentColor} width={15} height={15} />
        </View>

        {/* Title */}
        <Text style={styles.eventTitle}>{event.title}</Text>

        {/* Instructor */}
        {event.instructor && (
          <Text style={styles.eventInstructor}>👨‍🏫 {event.instructor}</Text>
        )}

        {/* Action Button */}
        {isLive && (
          <TouchableOpacity style={styles.joinButton} activeOpacity={0.8}>
            <Text style={styles.joinButtonText}>Join Class Now</Text>
            <Icon name="arrow-right" color="#FFFFFF" width={12} height={12} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

// ─── Main Screen Component ───────────────────────────────────────────────────

const liveRed = '#DC2626';

export default function CalendarScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [selectedDay, setSelectedDay] = useState<DayItem>(
    DAYS_OF_WEEK.find((d) => d.isToday) || DAYS_OF_WEEK[3]
  );

  const events = useMemo(
    () => SCHEDULE_DATA[selectedDay.date] || [],
    [selectedDay]
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
          <Icon name="arrow-left" color="#0F172A" width={20} height={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Timetable</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Weekly Carousel */}
      <View style={styles.carouselWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysContainer}
        >
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = day.date === selectedDay.date;
            return (
              <TouchableOpacity
                key={day.date}
                style={[
                  styles.dayCard,
                  isSelected && styles.dayCardSelected,
                ]}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayNameText,
                    isSelected && styles.dayNameTextSelected,
                  ]}
                >
                  {day.dayName}
                </Text>
                <Text
                  style={[
                    styles.dayDateText,
                    isSelected && styles.dayDateTextSelected,
                  ]}
                >
                  {day.date}
                </Text>
                {day.isToday && <View style={[styles.todayIndicator, isSelected && styles.todayIndicatorSelected]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Day Info */}
      <View style={styles.dayInfoSection}>
        <Text style={styles.dateLabel}>{selectedDay.fullDateString}</Text>
        <Text style={styles.eventCountText}>
          {events.length} {events.length === 1 ? 'session' : 'sessions'} scheduled
        </Text>
      </View>

      {/* Timetable Events Timeline */}
      <ScrollView contentContainerStyle={styles.timelineScroll} showsVerticalScrollIndicator={false}>
        {events.length > 0 ? (
          <View style={styles.timelineContainer}>
            {events.map((event, index) => (
              <TimelineEventCard key={event.id} event={event} index={index} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍃</Text>
            <Text style={styles.emptyTitle}>No Sessions Scheduled</Text>
            <Text style={styles.emptySubtitle}>
              You have a free day! Use this time to catch up on pending lectures or take mock tests.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    transform: [{ rotate: '180deg' }], // reverse arrow direction for back button
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  placeholder: {
    width: 38,
  },
  carouselWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: spacing[12],
    backgroundColor: '#F8FAFC',
  },
  daysContainer: {
    paddingHorizontal: spacing[16],
    gap: spacing[8],
  },
  dayCard: {
    width: 50,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayCardSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  dayNameText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  dayNameTextSelected: {
    color: '#94A3B8',
  },
  dayDateText: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  dayDateTextSelected: {
    color: '#FFFFFF',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00D09E',
    marginTop: 4,
  },
  todayIndicatorSelected: {
    backgroundColor: '#00D09E',
  },
  dayInfoSection: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  eventCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  timelineScroll: {
    paddingBottom: 40,
  },
  timelineContainer: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 100,
  },
  timeColumn: {
    width: 65,
    paddingTop: 14,
  },
  timeText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  durationText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  nodeColumn: {
    alignItems: 'center',
    width: 30,
    marginHorizontal: 4,
  },
  nodeCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nodeLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: -14, // overlaps next timeline row line
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    padding: spacing[12],
    marginBottom: spacing[16],
    marginLeft: 4,
  },
  eventCardLive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  eventInstructor: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  joinButton: {
    backgroundColor: liveRed,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing[12],
    alignSelf: 'flex-start',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[32],
    marginTop: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing[12],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Outfit' : 'sans-serif',
  },
});
