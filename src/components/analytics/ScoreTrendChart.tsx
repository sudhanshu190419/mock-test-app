/**
 * ScoreTrendChart
 *
 * Premium smooth line chart for the student score trend, rendered with
 * react-native-svg. Shows a curved line, data points, and an interactive
 * tooltip on touch.
 *
 * @module components/analytics/ScoreTrendChart
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  PanResponder,
  type GestureResponderEvent,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  G,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import type { ScoreTrendPoint } from '../../types/analytics';

// ─── Constants ──────────────────────────────────────────────────────────────

const CHART_HORIZONTAL_PADDING = 32;
const CHART_VERTICAL_PADDING = 24;
const CHART_MIN_HEIGHT = 200;
const DOT_RADIUS = 5;
const DOT_TOUCH_RADIUS = 20;
const LINE_WIDTH = 2.5;
const GRID_LINE_COUNT = 4;

/** Format an ISO timestamp to a compact date string (e.g. "28 May"). */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return iso.slice(5, 10);
  }
}

/** Format an ISO timestamp to a full date string (e.g. "28 May 2025, 3:45 PM"). */
function formatFullDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/** Compute cubic bezier control points for a smooth curve through points. */
function computeSmoothCurve(
  points: { x: number; y: number }[],
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M${points[0].x},${points[0].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p1.x - (p1.x - p0.x) / 2;
    const cp2y = p1.y;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
  }

  return d;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ScoreTrendChartProps {
  /** Chronologically ordered trend points (oldest first). */
  data: ScoreTrendPoint[];
  /** Chart width — defaults to screen width minus padding. */
  width?: number;
  /** Chart height — defaults to 220. */
  height?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

const ScoreTrendChart = React.memo(function ScoreTrendChart({
  data,
  width: propWidth,
  height = 220,
}: ScoreTrendChartProps): React.JSX.Element {
  const screenWidth = Dimensions.get('window').width;
  const width = propWidth ?? screenWidth - spacing[16] * 2;

  const chartWidth = width - CHART_HORIZONTAL_PADDING * 2;
  const chartHeight = height - CHART_VERTICAL_PADDING * 2;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // ── Compute scales ────────────────────────────────────────────────────
  const { minScore, maxScore, yRange, xPositions, mappedPoints } = useMemo(() => {
    if (data.length === 0) {
      return {
        minScore: 0,
        maxScore: 100,
        yRange: chartHeight,
        xPositions: [] as number[],
        mappedPoints: [] as { x: number; y: number; item: ScoreTrendPoint }[],
      };
    }

    const scores = data.map((d) => d.score);
    const minVal = Math.min(...scores);
    const maxVal = Math.max(...scores);
    // Add 10% padding to the top and bottom
    const padding = Math.max((maxVal - minVal) * 0.15, 20);
    const yMin = Math.max(0, minVal - padding);
    const yMax = maxVal + padding;
    const yR = yMax - yMin;

    const xPos = data.map((_, i) => {
      if (data.length === 1) return chartWidth / 2;
      return (i / (data.length - 1)) * chartWidth;
    });

    const mapped = data.map((item, i) => ({
      x: xPos[i],
      y: chartHeight - ((item.score - yMin) / yR) * chartHeight,
      item,
    }));

    return {
      minScore: yMin,
      maxScore: yMax,
      yRange: yR,
      xPositions: xPos,
      mappedPoints: mapped,
    };
  }, [data, chartWidth, chartHeight]);

  // ── Smooth path ───────────────────────────────────────────────────────
  const pathD = useMemo(() => {
    if (mappedPoints.length < 2) return '';
    return computeSmoothCurve(mappedPoints);
  }, [mappedPoints]);

  // ── Y-axis grid lines ──────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    const lines: { y: number; label: string }[] = [];
    for (let i = 0; i <= GRID_LINE_COUNT; i++) {
      const ratio = i / GRID_LINE_COUNT;
      const val = maxScore - ratio * (maxScore - minScore);
      const y = chartHeight - ratio * chartHeight;
      lines.push({ y, label: Math.round(val).toString() });
    }
    return lines;
  }, [minScore, maxScore, chartHeight]);

  // ── X-axis labels (show at most 5 evenly spaced labels) ───────────────
  const xLabels = useMemo(() => {
    if (data.length === 0) return [];
    const maxLabels = 5;
    const step = Math.max(1, Math.floor(data.length / maxLabels));
    return data
      .map((d, i) => ({ label: formatDate(d.attemptedOn), x: xPositions[i], index: i }))
      .filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data, xPositions]);

  // ── Touch handler ─────────────────────────────────────────────────────
  const handleTouch = useCallback(
    (event: GestureResponderEvent) => {
      if (mappedPoints.length === 0) return;

      const touchX = event.nativeEvent.locationX - CHART_HORIZONTAL_PADDING;

      // Find closest data point
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < mappedPoints.length; i++) {
        const dist = Math.abs(mappedPoints[i].x - touchX);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      // Only select if within touch radius
      if (closestDist > DOT_TOUCH_RADIUS * 3) {
        setSelectedIndex(null);
        setTooltipPos(null);
        return;
      }

      const pt = mappedPoints[closestIdx];
      setSelectedIndex(closestIdx);
      setTooltipPos({ x: pt.x, y: pt.y });
    },
    [mappedPoints],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: handleTouch,
        onPanResponderMove: handleTouch,
        onPanResponderRelease: () => {
          // Keep tooltip visible after release — user can tap again to dismiss
        },
      }),
    [handleTouch],
  );

  const selectedPoint = selectedIndex !== null ? mappedPoints[selectedIndex]?.item : null;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Score Trend</Text>
        {data.length >= 2 && (
          <Text style={styles.subtitle}>
            Last {data.length} tests
          </Text>
        )}
      </View>

      {/* Chart area */}
      <View
        style={[styles.chartWrapper, { width, height }]}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.15} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0.01} />
            </LinearGradient>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.secondary} stopOpacity={1} />
            </LinearGradient>
          </Defs>

          <G transform={`translate(${CHART_HORIZONTAL_PADDING}, ${CHART_VERTICAL_PADDING})`}>
            {/* Grid lines */}
            {gridLines.map((gl, i) => (
              <G key={`grid-${i}`}>
                <Line
                  x1={0}
                  y1={gl.y}
                  x2={chartWidth}
                  y2={gl.y}
                  stroke={palette.slate200}
                  strokeWidth={1}
                  strokeDasharray={i === 0 ? '0' : '4,4'}
                />
                <SvgText
                  x={-8}
                  y={gl.y + 4}
                  fill={palette.slate400}
                  fontSize={10}
                  textAnchor="end"
                  fontFamily="system"
                >
                  {gl.label}
                </SvgText>
              </G>
            ))}

            {/* Area under the curve */}
            {data.length >= 2 && (
              <Path
                d={`${pathD} L${chartWidth},${chartHeight} L0,${chartHeight} Z`}
                fill="url(#gradient)"
              />
            )}

            {/* Line */}
            {data.length >= 2 && (
              <Path
                d={pathD}
                stroke="url(#lineGrad)"
                strokeWidth={LINE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data points */}
            {mappedPoints.map((pt, i) => (
              <G key={`dot-${i}`}>
                {/* Outer glow for selected point */}
                {selectedIndex === i && (
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={DOT_RADIUS + 4}
                    fill={colors.primary}
                    opacity={0.2}
                  />
                )}
                {/* Dot itself */}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={selectedIndex === i ? DOT_RADIUS + 1 : DOT_RADIUS}
                  fill={selectedIndex === i ? colors.secondary : colors.surface}
                  stroke={selectedIndex === i ? colors.secondary : colors.primary}
                  strokeWidth={selectedIndex === i ? 2.5 : 2}
                />
              </G>
            ))}

            {/* X-axis labels */}
            {xLabels.map((xl, i) => (
              <SvgText
                key={`xl-${i}`}
                x={xl.x}
                y={chartHeight + 16}
                fill={palette.slate500}
                fontSize={10}
                textAnchor="middle"
                fontFamily="system"
              >
                {xl.label}
              </SvgText>
            ))}
          </G>
        </Svg>

        {/* Tooltip */}
        {selectedPoint && tooltipPos && (
          <View
            style={[
              styles.tooltip,
              {
                left: CHART_HORIZONTAL_PADDING + tooltipPos.x - 80,
                top: tooltipPos.y - 10,
              },
              // Keep tooltip within bounds
              CHART_HORIZONTAL_PADDING + tooltipPos.x - 80 < 0 && { left: spacing[8] },
              CHART_HORIZONTAL_PADDING + tooltipPos.x - 80 + 160 > width && {
                left: width - 168,
              },
            ]}
          >
            <Text style={styles.tooltipTestName} numberOfLines={1}>
              {selectedPoint.testName}
            </Text>
            <View style={styles.tooltipRow}>
              <View style={styles.tooltipStat}>
                <Text style={styles.tooltipLabel}>Score</Text>
                <Text style={styles.tooltipValue}>
                  {selectedPoint.score}/{selectedPoint.maxScore}
                </Text>
              </View>
              <View style={styles.tooltipStat}>
                <Text style={styles.tooltipLabel}>Percentage</Text>
                <Text style={[styles.tooltipValue, styles.tooltipPercent]}>
                  {selectedPoint.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
            <Text style={styles.tooltipDate}>
              {formatFullDate(selectedPoint.attemptedOn)}
            </Text>
          </View>
        )}
      </View>

      {/* Single data point fallback */}
      {data.length === 1 && (
        <View style={styles.singlePointContainer}>
          <View style={styles.singlePointRow}>
            <View style={styles.singlePointDot} />
            <View style={styles.singlePointInfo}>
              <Text style={styles.singlePointName} numberOfLines={1}>
                {data[0].testName}
              </Text>
              <Text style={styles.singlePointMeta}>
                Score: {data[0].score}/{data[0].maxScore} • {data[0].percentage.toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.singlePointDate}>
              {formatDate(data[0].attemptedOn)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing[16],
    marginBottom: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing[12],
  },
  title: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: '700',
    color: palette.slate800,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    color: palette.slate500,
  },
  chartWrapper: {
    overflow: 'visible',
    alignSelf: 'center',
  },
  tooltip: {
    position: 'absolute',
    width: 160,
    backgroundColor: palette.slate800,
    borderRadius: radius.sm,
    padding: spacing[8],
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tooltipTestName: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: spacing[4],
  },
  tooltipRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  tooltipStat: {
    flex: 1,
  },
  tooltipLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '500',
    color: palette.slate400,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tooltipValue: {
    ...typography.subtitle,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tooltipPercent: {
    color: colors.primary,
  },
  tooltipDate: {
    ...typography.caption,
    fontSize: 10,
    color: palette.slate400,
    marginTop: spacing[4],
  },
  singlePointContainer: {
    marginTop: spacing[8],
    paddingVertical: spacing[4],
  },
  singlePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  singlePointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  singlePointInfo: {
    flex: 1,
  },
  singlePointName: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: palette.slate700,
  },
  singlePointMeta: {
    ...typography.caption,
    fontSize: 11,
    color: palette.slate500,
  },
  singlePointDate: {
    ...typography.caption,
    fontSize: 10,
    color: palette.slate400,
  },
});

export default ScoreTrendChart;
