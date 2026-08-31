import { useId, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { monthDay } from '@/utils/date';

export interface LinePoint {
  /** ISO date, used for the axis label and the callout. */
  date: string;
  value: number;
}

export interface LineChartProps {
  data: LinePoint[];
  height?: number;
  color?: string;
  /** Draws a dashed horizontal goal line. */
  target?: number;
  targetLabel?: string;
  unit?: string;
  /** Overlays a 7-point moving average to damp daily noise. */
  showTrend?: boolean;
  onSelect?: (point: LinePoint | null) => void;
}

const PAD_LEFT = 38;
const PAD_RIGHT = 10;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

/** Catmull-Rom → cubic bézier, so the line reads smooth without overshooting. */
const smoothPath = (pts: Array<{ x: number; y: number }>): string => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

const movingAverage = (values: number[], window = 7): number[] =>
  values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

export function LineChart({
  data,
  height = 200,
  color = colors.primary,
  target,
  targetLabel,
  unit = '',
  showTrend = true,
  onSelect,
}: LineChartProps) {
  // Unique per instance — SVG ids are global to the document.
  const gradientId = `line-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const widthRef = useRef(0);
  const countRef = useRef(0);
  countRef.current = data.length;

  const geometry = useMemo(() => {
    if (width === 0 || data.length === 0) return null;
    const values = data.map((d) => d.value);
    const candidates = target !== undefined ? [...values, target] : values;
    const rawMin = Math.min(...candidates);
    const rawMax = Math.max(...candidates);
    const pad = Math.max((rawMax - rawMin) * 0.18, 0.5);
    const min = rawMin - pad;
    const max = rawMax + pad;
    const innerW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
    const innerH = Math.max(height - PAD_TOP - PAD_BOTTOM, 1);

    const x = (i: number) => PAD_LEFT + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => PAD_TOP + innerH - ((v - min) / (max - min || 1)) * innerH;

    const points = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
    const trendPoints = showTrend
      ? movingAverage(values).map((v, i) => ({ x: x(i), y: y(v) }))
      : [];

    const line = smoothPath(points);
    const area = `${line} L ${points[points.length - 1].x} ${PAD_TOP + innerH} L ${points[0].x} ${PAD_TOP + innerH} Z`;

    const ticks = [max, (max + min) / 2, min];

    return { min, max, x, y, points, trendPoints, line, area, ticks, innerH, innerW };
  }, [data, width, height, target, showTrend]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX),
        onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX),
        onPanResponderRelease: () => {
          setActiveIndex(null);
          onSelect?.(null);
        },
        onPanResponderTerminate: () => {
          setActiveIndex(null);
          onSelect?.(null);
        },
      }),
    // handleTouch reads from refs, so the responder never needs rebuilding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleTouch = (locationX: number) => {
    const count = countRef.current;
    const w = widthRef.current;
    if (count === 0 || w === 0) return;
    const innerW = Math.max(w - PAD_LEFT - PAD_RIGHT, 1);
    const ratioX = Math.min(1, Math.max(0, (locationX - PAD_LEFT) / innerW));
    const index = Math.round(ratioX * (count - 1));
    setActiveIndex(index);
    onSelect?.(data[index] ?? null);
  };

  const active = activeIndex !== null && geometry ? geometry.points[activeIndex] : null;
  const activePoint = activeIndex !== null ? data[activeIndex] : null;

  return (
    <View
      style={{ height }}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      {...panResponder.panHandlers}>
      {geometry ? (
        <>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.22} />
                <Stop offset="1" stopColor={color} stopOpacity={0.01} />
              </LinearGradient>
            </Defs>

            {/* Grid + y-axis labels */}
            <G>
              {geometry.ticks.map((tick, i) => {
                const ty = geometry.y(tick);
                return (
                  <G key={i}>
                    <Line
                      x1={PAD_LEFT}
                      y1={ty}
                      x2={width - PAD_RIGHT}
                      y2={ty}
                      stroke={colors.divider}
                      strokeWidth={1}
                    />
                    <SvgText
                      x={PAD_LEFT - 8}
                      y={ty + 3}
                      fontSize={9}
                      fill={colors.textTertiary}
                      textAnchor="end">
                      {tick.toFixed(1)}
                    </SvgText>
                  </G>
                );
              })}
            </G>

            {target !== undefined ? (
              <G>
                <Line
                  x1={PAD_LEFT}
                  y1={geometry.y(target)}
                  x2={width - PAD_RIGHT}
                  y2={geometry.y(target)}
                  stroke={colors.success}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={width - PAD_RIGHT}
                  y={geometry.y(target) - 5}
                  fontSize={9}
                  fill={colors.success}
                  textAnchor="end">
                  {targetLabel ?? `Goal ${target}${unit}`}
                </SvgText>
              </G>
            ) : null}

            <Path d={geometry.area} fill={`url(#${gradientId})`} />
            {showTrend && geometry.trendPoints.length > 1 ? (
              <Path
                d={smoothPath(geometry.trendPoints)}
                stroke={colors.textTertiary}
                strokeWidth={1.5}
                strokeDasharray="3 5"
                fill="none"
              />
            ) : null}
            <Path
              d={geometry.line}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Latest value marker */}
            <Circle
              cx={geometry.points[geometry.points.length - 1].x}
              cy={geometry.points[geometry.points.length - 1].y}
              r={4}
              fill={color}
              stroke={colors.surface}
              strokeWidth={2}
            />

            {active ? (
              <G>
                <Line
                  x1={active.x}
                  y1={PAD_TOP}
                  x2={active.x}
                  y2={PAD_TOP + geometry.innerH}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Circle cx={active.x} cy={active.y} r={6} fill={color} stroke={colors.surface} strokeWidth={2.5} />
              </G>
            ) : null}

            {/* x-axis labels: first, middle, last */}
            {[0, Math.floor((data.length - 1) / 2), data.length - 1]
              .filter((v, i, arr) => arr.indexOf(v) === i && v >= 0)
              .map((i) => (
                <SvgText
                  key={i}
                  x={geometry.points[i].x}
                  y={height - 6}
                  fontSize={9}
                  fill={colors.textTertiary}
                  textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
                  {monthDay(data[i].date)}
                </SvgText>
              ))}
          </Svg>

          {activePoint && active ? (
            <View
              pointerEvents="none"
              style={[
                styles.callout,
                {
                  left: Math.min(Math.max(active.x - 46, 0), Math.max(width - 92, 0)),
                  top: Math.max(active.y - 52, 0),
                },
              ]}>
              <Text variant="micro" tone="secondary">
                {monthDay(activePoint.date)}
              </Text>
              <Text variant="bodyStrong">
                {activePoint.value.toFixed(1)}
                {unit}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    position: 'absolute',
    width: 92,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    alignItems: 'center',
    shadowColor: '#1A1F2B',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
