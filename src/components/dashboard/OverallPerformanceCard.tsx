/**
 * OverallPerformanceCard
 *
 * A jaw-dropping premium card showing overall accuracy with a sleek
 * gradient background, glowing circular SVG progress indicator, and micro-animations.
 *
 * @module components/dashboard/OverallPerformanceCard
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing, useAnimatedStyle, withDelay } from 'react-native-reanimated';
import { coursesLightM3 } from '../../theme/colors';
import { typographyV5 } from '../../theme/typography';
import AnimatedPressable from '../AnimatedPressable';

// ─── Constants ───────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 110;
const STROKE_WIDTH = 5;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface OverallPerformanceCardProps {
  accuracy: number;
  testsAttempted: number;
  averageScore: number;
  bestScore: number;
  improvementText?: string;
}

// ─── Circular Progress (Animated & Glowing) ───────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  percentage: number;
}

const CircularProgress = React.memo(function CircularProgress({
  percentage,
}: CircularProgressProps): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, percentage));
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withDelay(
      300,
      withTiming(clamped, {
        duration: 1500,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      })
    );
  }, [clamped]);

  const animatedProps = useAnimatedProps(() => {
    const offset = CIRCUMFERENCE - (animatedProgress.value / 100) * CIRCUMFERENCE;
    return {
      strokeDashoffset: offset,
    };
  });

  return (
    <View style={styles.circularProgressContainer}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
        <Defs>
          <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#A7F3D0" stopOpacity="1" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        {/* Background track — thin, sleek */}
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Glow Ring */}
        <AnimatedCircle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(52, 211, 153, 0.3)"
          strokeWidth={STROKE_WIDTH + 4}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
        />
        {/* Animated Progress Ring */}
        <AnimatedCircle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#grad)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
        />
        {/* Centre text */}
        <SvgText
          x={CIRCLE_SIZE / 2}
          y={(CIRCLE_SIZE / 2) + 6}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="24"
          fontWeight="800"
        >
          {Math.round(clamped)}%
        </SvgText>
        <SvgText
          x={CIRCLE_SIZE / 2}
          y={(CIRCLE_SIZE / 2) + 22}
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize="10"
          fontWeight="600"
        >
          Accuracy
        </SvgText>
      </Svg>
    </View>
  );
});

// ─── Stat Row (Animated) ─────────────────────────────────────────────────────

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  index: number;
}

const StatRow = React.memo(function StatRow({
  icon,
  label,
  value,
  index,
}: StatRowProps): React.JSX.Element {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  
  useEffect(() => {
    opacity.value = withDelay(
      400 + index * 150,
      withTiming(1, { duration: 200 })
    );
    translateY.value = withDelay(
      400 + index * 150,
      withTiming(0, { duration: 200 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View style={[styles.statRow, animatedStyle]}>
      <View style={styles.statIconWrapper}>
        <LinearGradient
          colors={['#F8FAFC', '#E2E8F0']}
          style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
        />
        {icon}
      </View>
      <View style={styles.statTextGroup}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </Animated.View>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

const OverallPerformanceCard = React.memo(function OverallPerformanceCard({
  accuracy,
  testsAttempted,
  averageScore,
  bestScore,
  improvementText = '12% improvement from last month',
}: OverallPerformanceCardProps): React.JSX.Element {
  const clampedAccuracy = Math.min(100, Math.max(0, accuracy));

  return (
    <AnimatedPressable style={styles.containerWrapper}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Subtle top-right glow */}
        <Animated.View
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={['rgba(52, 211, 153, 0.15)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        
        {/* Glassmorphic border overlay */}
        <View style={styles.glassBorder} pointerEvents="none" />

        <View style={styles.content}>
          {/* Left: Overall Accuracy column */}
          <View style={styles.leftColumn}>
            <Text style={styles.overallLabel}>Overall Accuracy</Text>
            <Text style={styles.overallValue}>{Math.round(clampedAccuracy)}%</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendArrow}>↗</Text>
              <Text style={styles.trendText}>{improvementText}</Text>
            </View>
          </View>

          {/* Center: Circular progress */}
          <View style={styles.centerColumn}>
            <CircularProgress percentage={clampedAccuracy} />
          </View>

          {/* Right: Stats list */}
          <View style={styles.rightColumn}>
            <StatRow
              index={0}
              icon={<Text style={styles.miniIconText}>📋</Text>}
              label="Tests Attempted"
              value={testsAttempted}
            />
            <StatRow
              index={1}
              icon={<Text style={styles.miniIconText}>📊</Text>}
              label="Average Score"
              value={averageScore}
            />
            <StatRow
              index={2}
              icon={<Text style={styles.miniIconText}>🏆</Text>}
              label="Best Score"
              value={bestScore}
            />
          </View>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
});

export default OverallPerformanceCard;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  containerWrapper: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  container: {
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  glowContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  // Left column
  leftColumn: {
    flex: 1,
    paddingRight: 4,
  },
  overallLabel: {
    ...typographyV5.metadataStrong,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  overallValue: {
    ...typographyV5.displayAsymmetric,
    fontSize: 48,
    lineHeight: 52,
    color: '#FFFFFF',
    marginBottom: 16,
    textShadowColor: 'rgba(52, 211, 153, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    fontVariant: ['tabular-nums'],
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    gap: 6,
  },
  trendArrow: {
    ...typographyV5.metadataStrong,
    color: '#34D399',
    fontSize: 14,
  },
  trendText: {
    ...typographyV5.metadataSmall,
    color: '#A7F3D0',
    maxWidth: 90,
  },
  // Center column
  centerColumn: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Right column
  rightColumn: {
    flex: 1,
    paddingLeft: 12,
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconWrapper: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIconText: {
    fontSize: 14,
    lineHeight: 16,
  },
  statTextGroup: {
    flex: 1,
  },
  statLabel: {
    ...typographyV5.metadataSmall,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...typographyV5.cardTitle,
    color: '#FFFFFF',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
});
