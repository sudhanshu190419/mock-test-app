/**
 * QuickStatsCards
 *
 * A 4-column grid of compact white stat cards showing key metrics:
 * Tests Attempted, Best Score, Average Score, Overall Accuracy.
 *
 * Matches the HTML design reference exactly.
 *
 * @module components/dashboard/QuickStatsCards
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '../home/Icons';
import type { IconName } from '../home/Icons';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuickStatItem {
  /** Unique key. */
  key: string;
  /** Vector icon name from the project's Icon component. */
  iconName: IconName;
  /** Label text (supports \n for multi-line). */
  label: string;
  /** Value text. */
  value: string;
}

export interface QuickStatsCardsProps {
  /** Array of 4 stat items. */
  items: QuickStatItem[];
}

// ─── Single Stat Card ────────────────────────────────────────────────────────

const StatCard = React.memo(function StatCard({
  iconName,
  label,
  value,
}: QuickStatItem): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Icon name={iconName} color="#166534" width={22} height={22} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
});

// ─── Grid Component ──────────────────────────────────────────────────────────

const QuickStatsCards = React.memo(function QuickStatsCards({
  items,
}: QuickStatsCardsProps): React.JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <StatCard key={item.key} iconName={item.iconName} label={item.label} value={item.value} />
      ))}
    </View>
  );
});

export default QuickStatsCards;

// ─── Styles (matches HTML design exactly) ───────────────────────────────────

/** Tailwind `shadow-sm` equivalent. */
const SHADOW_SM = {
  shadowColor: '#000',
  
  shadowOpacity:0.03,
shadowRadius:8,
shadowOffset:{
   width:0,
   height:3,
},
elevation:2,
} as const;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    height: 125,
    ...SHADOW_SM,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    height: 34,
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 1,
  },
  value: {
    height: 26, 
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 24,
  },
});
