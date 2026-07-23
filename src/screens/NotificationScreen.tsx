/**
 * NotificationScreen
 *
 * Full-screen notification centre with:
 * - Header with unread badge and "Mark all as read"
 * - Horizontal scrollable filter chips
 * - FlatList with grouped sections (Today / Yesterday / Earlier)
 * - Premium notification cards with swipe actions
 * - Skeleton loading state
 * - Empty state (no notifications)
 * - Pull-to-refresh
 *
 * Performance:
 * - Stable view hierarchy: SafeAreaView → FlatList (never swapped)
 * - InteractionManager.runAfterInteractions defers card rendering
 *   until the navigation animation completes (no JS thread contention)
 * - ListHeaderComponent remains mounted across loading/content transitions
 *
 * Architecture:
 *   NotificationScreen
 *     → useNotifications() hook
 *       → notificationService (mock)
 *         → real API later
 *
 * @module screens/NotificationScreen
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  Platform,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import NotificationHeader from '../components/notification/NotificationHeader';
import NotificationFilterChip from '../components/notification/NotificationFilterChip';
import NotificationCard from '../components/notification/NotificationCard';
import NotificationSection from '../components/notification/NotificationSection';
import NotificationEmptyState from '../components/notification/NotificationEmptyState';
import { ListItemSkeleton } from '../components/SkeletonLoader';
import { useNotifications, FILTER_TYPES, FILTER_LABELS } from '../hooks/useNotifications';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { navigateFromNotification } from '../services/navigation/navigationService';
import type { Notification, NotificationGroup } from '../types/notification';

// ═════════════════════════════════════════════════════════════════
//  FlatList Item Type (discriminated union — no `any`)
// ═════════════════════════════════════════════════════════════════

type FlatListItem =
  | { kind: 'skeleton'; id: string }
  | { kind: 'empty'; id: string }
  | { kind: 'group'; id: string; section: NotificationGroup };

// ═════════════════════════════════════════════════════════════════
//  Props
// ═════════════════════════════════════════════════════════════════

export interface NotificationScreenProps {
  navigation?: {
    goBack?: () => void;
    navigate?: (screen: string, params?: Record<string, unknown>) => void;
  };
}

// ═════════════════════════════════════════════════════════════════
//  Main Screen
// ═════════════════════════════════════════════════════════════════

export default function NotificationScreen({
  navigation,
}: NotificationScreenProps): React.JSX.Element {
  const {
    groups,
    filter,
    setFilterType,
    markAsRead,
    markAllAsRead,
    refresh,
    unreadCount,
    isLoading,
    isRefreshing,
  } = useNotifications();

  // ── Defer card rendering until navigation animation completes ─
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  const showContent = isReady && !isLoading;
  const isEmpty =
    groups.length === 0 || groups.every((g) => g.data.length === 0);

  // ── Stable FlatList data — never a full tree swap ─────────────
  const flatListData = useMemo((): FlatListItem[] => {
    if (!showContent) {
      // Show skeletons while loading or before animation completes
      return Array.from({ length: 6 }, (_, i) => ({
        kind: 'skeleton' as const,
        id: `skeleton-${i}`,
      }));
    }
    if (isEmpty) {
      return [{ kind: 'empty' as const, id: 'empty' }];
    }
    return groups.map((g) => ({
      kind: 'group' as const,
      id: g.section,
      section: g,
    }));
  }, [showContent, groups, isEmpty]);

  // ── Navigation handler ──────────────────────────────────────
  //
  // Delegates ALL navigation to navigationService.ts which uses the
  // shared navigationRef (from AuthNavigator) for type-safe navigation.
  //
  // This is the SINGLE source of truth for notification-driven navigation.
  // Both push notifications (FCM handlers) and in-app notifications
  // (this handler) call navigateFromNotification() with the same args.
  //
  // To add a new notification type:
  //   1. Add the mapping in notificationService.ts (mapReferenceType)
  //   2. Add a case in navigationService.ts (navigateFromNotification)
  //   3. No changes needed here.

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markAsRead(notification.id);
      }

      navigateFromNotification(notification.actionType, notification.actionId);
    },
    [markAsRead],
  );

  // ── Handlers ────────────────────────────────────────────────

  const handleBackPress = useCallback(() => {
    navigation?.goBack?.();
  }, [navigation]);

  // ── Filter chips ────────────────────────────────────────────

  const renderFilterChips = useCallback(
    () => (
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          style={styles.filterScroll}
        >
          {FILTER_TYPES.map((type) => (
            <NotificationFilterChip
              key={type}
              label={FILTER_LABELS[type]}
              isActive={filter.activeType === type}
              onPress={() => setFilterType(type)}
            />
          ))}
        </ScrollView>
      </View>
    ),
    [filter.activeType, setFilterType],
  );

  // ── List header — stable reference across loading/content ────

  const ListHeaderComponent = useCallback(
    () => (
      <>
        <NotificationHeader
          unreadCount={unreadCount}
          onMarkAllRead={markAllAsRead}
          onBackPress={handleBackPress}
        />
        {renderFilterChips()}
      </>
    ),
    [unreadCount, markAllAsRead, renderFilterChips, handleBackPress],
  );

  // ── FlatList renderers ──────────────────────────────────────

  const renderFlatListItem = useCallback(
    ({ item }: { item: FlatListItem }) => {
      switch (item.kind) {
        case 'skeleton':
          return <ListItemSkeleton />;
        case 'empty':
          return <NotificationEmptyState />;
        case 'group':
          return (
            <View>
              <NotificationSection label={item.section.label} />
              {item.section.data.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onPress={handleNotificationPress}
                />
              ))}
            </View>
          );
      }
    },
    [handleNotificationPress],
  );

  const keyExtractor = useCallback((item: FlatListItem) => item.id, []);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <FlatList
        data={flatListData}
        renderItem={renderFlatListItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={<View style={styles.footer} />}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={refresh}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    paddingBottom: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterScroll: {
    marginBottom: -spacing[8],
  },
  filterContent: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  footer: {
    height: spacing[32],
  },
});
