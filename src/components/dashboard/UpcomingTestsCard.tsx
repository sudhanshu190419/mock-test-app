/**
 * UpcomingTestsCard
 *
 * Horizontal scrollable list of upcoming test cards, each showing
 * test name, date, time, duration, and a "Start Test" CTA button.
 *
 * Matches the HTML design reference exactly.
 *
 * @module components/dashboard/UpcomingTestsCard
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { shadows } from '../../theme/shadows';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UpcomingTestItem {
  /** Unique key. */
  key: string;
  /** Test name. */
  testName: string;
  /** Date string (e.g. "30 May 2025"). */
  date: string;
  /** Time string (e.g. "10:00 AM"). */
  time: string;
  /** Duration string (e.g. "3 Hours"). */
  duration: string;
  /** Callback when the card is pressed / "Start Test" pressed. */
  onPress?: () => void;
}

export interface UpcomingTestsCardProps {
  /** Array of upcoming test items. */
  items: UpcomingTestItem[];
  /** Callback when "View All" is pressed. */
  onViewAll?: () => void;
}

// ─── Single Test Card ────────────────────────────────────────────────────────

const TestCard = React.memo(function TestCard({
  testName,
  date,
  time,
  duration,
  onPress,
}: UpcomingTestItem): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.calendarIcon}>
          <Text style={styles.calendarEmoji}>📅</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTestName} numberOfLines={2}>
            {testName}
          </Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>{date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕐</Text>
            <Text style={styles.detailText}>{time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⏱</Text>
            <Text style={styles.detailText}>{duration}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.startButton}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={`Start ${testName}`}
        accessibilityRole="button"
      >
        <Text style={styles.startButtonText}>Start Test</Text>
      </TouchableOpacity>
    </View>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

const UpcomingTestsCard = React.memo(function UpcomingTestsCard({
  items,
  onViewAll,
}: UpcomingTestsCardProps): React.JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionOuter}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Upcoming Tests</Text>
        <TouchableOpacity
          onPress={onViewAll}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityLabel="View All"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        decelerationRate="fast"
        snapToInterval={296}
        snapToAlignment="start"
      >
        {items.map((item) => (
          <TestCard
            key={item.key}
            testName={item.testName}
            date={item.date}
            time={item.time}
            duration={item.duration}
            onPress={item.onPress}
          />
        ))}
      </ScrollView>
    </View>
  );
});

export default UpcomingTestsCard;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionOuter: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F5132',
  },
  scrollView: {
    marginHorizontal: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: 280,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...shadows.small,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  calendarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  calendarEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  cardInfo: {
    flex: 1,
    gap: 5,
  },
  cardTestName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    fontSize: 11,
    width: 14,
    textAlign: 'center',
    lineHeight: 14,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 14,
  },
  startButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F5132',
  },
});
