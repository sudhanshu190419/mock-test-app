/**
 * UpcomingLiveClassCard
 *
 * Clean HomeScreen Hero card representing a live or upcoming class schedule
 * following the "Confident Depth" (v2) design aesthetic.
 *
 * Visual & Architectural Highlights:
 * - Double-bezel tray architecture with outer container shadow/elevation and
 *   inner border/padding (`borderWidth: 1`, `borderColor: '#E2E8F0'`,
 *   `borderRadius: radius.xl`, exact spacing tokens).
 * - Dynamic Live Badge Row: pulsing `LIVE` pill (`0.6 -> 1.0` opacity repeat
 *   animation) plus `"STREAMING NOW"` when active, or clean calendar/clock
 *   badges (`⏳ UPCOMING CLASS`, `📅 SCHEDULED`) when scheduled.
 * - Bold `#0F172A` title typography (`fontSize: 17`, `fontWeight: '700'`).
 * - Instructor & Time info box with clean rows (`👨‍🏫 ${instructorName}`,
 *   `🕒 ${startTimeFormatted}`).
 * - Kinetic press CTA button (`0.97` on press in, `1.0` on press out) with
 *   solid fill (`#4F46E5` for live, `#0F172A` for upcoming), visual opacity
 *   reduction when disabled, and safe `cancelAnimation` cleanup.
 * - 100% tokenized spacing (ZERO hardcoded margins/paddings).
 *
 * @module components/home/UpcomingLiveClassCard
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, cancelAnimation, type WithSpringConfig } from 'react-native-reanimated';

import Icon from './Icons';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';

// ─── Spring Configuration ────────────────────────────────────────────────────

const KINETIC_SPRING_CONFIG: WithSpringConfig = { duration: 200 };

// ─── Props Interface ─────────────────────────────────────────────────────────

export interface UpcomingLiveClassCardProps {
  classTitle: string;
  instructorName: string;
  startTimeFormatted: string; // e.g. "Today, 6:00 PM" or "LIVE NOW"
  isLiveNow?: boolean;
  onJoinPress?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const UpcomingLiveClassCard = React.memo(function UpcomingLiveClassCard({
  classTitle,
  instructorName,
  startTimeFormatted,
  isLiveNow = false,
  onJoinPress,
}: UpcomingLiveClassCardProps): React.JSX.Element {
  // Kinetic button press animation shared value
  const scale = useSharedValue(1);

  // Pulsing opacity for live badge
  const pulseOpacity = useSharedValue(isLiveNow ? 0.6 : 1.0);

  useEffect(() => {
    if (isLiveNow) {
      pulseOpacity.value = withRepeat(
        withTiming(1.0, { duration: 800 }),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = 1.0;
    }
    return () => {
      cancelAnimation(pulseOpacity);
    };
  }, [isLiveNow, pulseOpacity]);

  useEffect(() => {
    return () => {
      cancelAnimation(scale);
    };
  }, [scale]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onJoinPress) return;
    scale.value = withTiming(0.97, KINETIC_SPRING_CONFIG);
  }, [onJoinPress, scale]);

  const handlePressOut = useCallback(() => {
    if (!onJoinPress) return;
    scale.value = withTiming(1.0, KINETIC_SPRING_CONFIG);
  }, [onJoinPress, scale]);

  const ctaText = isLiveNow
    ? 'Join Live Class'
    : `Set Reminder • ${startTimeFormatted}`;

  return (
    <View style={styles.outerContainer}>
      <View style={styles.innerContainer}>
        {/* Live / Upcoming Badge Row */}
        <View style={styles.headerRow}>
          {isLiveNow ? (
            <Animated.View style={[styles.liveBadgeRow, pulseAnimatedStyle]}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE</Text>
              </View>
              <Text style={styles.streamingNowText}>STREAMING NOW</Text>
            </Animated.View>
          ) : (
            <View style={styles.upcomingBadgeRow}>
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>⏳ UPCOMING CLASS</Text>
              </View>
              <View style={styles.scheduledBadge}>
                <Text style={styles.scheduledBadgeText}>📅 SCHEDULED</Text>
              </View>
            </View>
          )}
        </View>

        {/* Class Title */}
        <Text style={styles.classTitle} numberOfLines={2}>
          {classTitle}
        </Text>

        {/* Instructor Info Row */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoText} numberOfLines={1}>
              👨‍🏫 <Text style={styles.infoHighlight}>{instructorName}</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText} numberOfLines={1}>
              🕒 <Text style={styles.infoHighlight}>{startTimeFormatted}</Text>
            </Text>
          </View>
        </View>

        {/* Kinetic CTA Button */}
        <Animated.View style={[styles.ctaButtonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              isLiveNow ? styles.ctaButtonLive : styles.ctaButtonUpcoming,
              !onJoinPress && styles.ctaButtonDisabled,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onJoinPress}
            disabled={!onJoinPress}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={ctaText}
            accessibilityHint={
              isLiveNow
                ? 'Navigates to the live streaming room for this class'
                : 'Sets a reminder and notification for this scheduled class'
            }
            accessibilityState={{ disabled: !onJoinPress }}
          >
            <Text style={styles.ctaButtonText} numberOfLines={1}>
              {ctaText}
            </Text>
            <Icon
              name={isLiveNow ? 'video' : 'bell'}
              color="#FFFFFF"
              width={18}
              height={18}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
});

export default UpcomingLiveClassCard;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
    marginBottom: spacing[20],
  },
  innerContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.xl, // 20px
    backgroundColor: '#FFFFFF',
    padding: spacing[16],
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[12],
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: spacing[4],
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  streamingNowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  upcomingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  upcomingBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  upcomingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  scheduledBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  scheduledBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.5,
  },
  classTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: spacing[12],
  },
  infoBox: {
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
    padding: spacing[12],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: spacing[16],
    gap: spacing[8],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  infoHighlight: {
    fontWeight: '600',
    color: '#1E293B',
  },
  ctaButtonContainer: {
    width: '100%',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: radius.lg,
  },
  ctaButtonLive: {
    backgroundColor: '#4F46E5',
  },
  ctaButtonUpcoming: {
    backgroundColor: '#0F172A',
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: spacing[8],
    letterSpacing: 0.25,
  },
});
