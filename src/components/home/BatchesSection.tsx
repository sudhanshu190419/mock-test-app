/**
 * BatchesSection
 *
 * Premium horizontal carousel of batch cards showing 2.5 cards on screen.
 *
 * Features:
 * - Horizontal FlatList with snap-to-card animation
 * - Shows 2 full cards + preview of 3rd to encourage scrolling
 * - Fade-in/slide entrance animation
 * - View All header (matching other sections)
 *
 * @module components/home/BatchesSection
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

import BatchCard from './BatchCard';
import Icon from './Icons';
import type { BatchItem } from './types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CONTENT_PADDING_LEFT = spacing[16];

/** Card width: shows 2 full cards + half of 3rd card on screen. */
const CARD_WIDTH = Math.round((SCREEN_WIDTH - CONTENT_PADDING_LEFT - CARD_GAP * 1 - CARD_GAP * 0.5) / 2.5);

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BatchesSectionProps {
  /** All batches to display in the carousel. */
  batches: BatchItem[];
  /** Callback when "View All" is pressed. */
  onViewAllPress?: () => void;
  /** Callback when a batch card is pressed. */
  onBatchPress?: (key: string) => void;
}

// ─── Section Component ──────────────────────────────────────────────────────

const BatchesSection = React.memo(function BatchesSection({
  batches,
  onViewAllPress,
  onBatchPress,
}: BatchesSectionProps): React.JSX.Element {
  // ── Entrance animation for the whole section ────────────────
  const sectionFadeAnim = useRef(new Animated.Value(0)).current;
  const sectionSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sectionFadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sectionSlideAnim, {
        toValue: 0,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sectionFadeAnim, sectionSlideAnim]);

  // ── FlatList renderers ─────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: BatchItem; index: number }) => {
      const { key: _key, ...cardProps } = item;
      return (
        <View style={styles.cardWrapper}>
          <BatchCard
            key={_key}
            {...cardProps}
            animationDelay={100 + index * 80}
            onPress={() => onBatchPress?.(item.key)}
          />
        </View>
      );
    },
    [onBatchPress],
  );

  const keyExtractor = useCallback(
    (item: BatchItem, index: number) => `${item.key}-${index}`,
    [],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: sectionFadeAnim,
          transform: [{ translateY: sectionSlideAnim }],
        },
      ]}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Our Batches</Text>
          <Text style={styles.headerSubtitle}>
            Learn from India's top educators with structured batches.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={onViewAllPress}
          activeOpacity={0.7}
          accessibilityLabel="View all batches"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Icon
            name="arrow-right"
            color={colors.secondary}
            width={14}
            height={14}
          />
        </TouchableOpacity>
      </View>

      {/* ── Horizontal Carousel ──────────────────────────────── */}
      <FlatList
        data={batches}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={3}
      />
    </Animated.View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[20],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[16],
    marginBottom: spacing[12],
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing[12],
  },
  headerTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    ...typography.body,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[12],
    borderRadius: radius.xxl,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing[4],
  },
  viewAllText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '700',
  },
  listContent: {
    paddingLeft: CONTENT_PADDING_LEFT,
    paddingRight: spacing[8],
    paddingVertical: spacing[4],
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
});

export default BatchesSection;
