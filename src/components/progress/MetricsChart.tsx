/**
 * MetricsChart – simple SVG line chart for weight and adherence trends.
 */
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface DataPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  color: string;
  unit?: string;
  width?: number;
  height?: number;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const PAD_H = 8;
const PAD_V = 16;

function LineChart({ data, color, unit = '', width = CHART_WIDTH, height = CHART_HEIGHT }: LineChartProps) {
  const theme = useTheme();
  if (data.length < 2) return null;

  const values = data.map(d => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const chartW = width - PAD_H * 2;
  const chartH = height - PAD_V * 2;

  const toX = (i: number) => PAD_H + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD_V + chartH - ((v - minV) / range) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');

  // Build fill path
  const fillPath = [
    `M ${toX(0)},${toY(data[0].value)}`,
    ...data.slice(1).map((d, i) => `L ${toX(i + 1)},${toY(d.value)}`),
    `L ${toX(data.length - 1)},${height}`,
    `L ${toX(0)},${height}`,
    'Z',
  ].join(' ');

  return (
    <Svg width="100%" viewBox={`0 0 ${width} ${height}`} height={height}>
      {/* Fill area */}
      <Path d={fillPath} fill={color + '1A'} />
      {/* Line */}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Data points */}
      {data.map((d, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(d.value)} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
      ))}
      {/* X-axis labels */}
      {data.map((d, i) => (
        <SvgText
          key={i}
          x={toX(i)}
          y={height - 2}
          textAnchor="middle"
          fontSize={9}
          fill={theme.textTertiary}>
          {d.date}
        </SvgText>
      ))}
    </Svg>
  );
}

interface MetricsChartProps {
  title: string;
  data: DataPoint[];
  color: string;
  unit?: string;
  latestLabel?: string;
}

export function MetricsChart({ title, data, color, unit = '', latestLabel }: MetricsChartProps) {
  const theme = useTheme();
  const latest = data[data.length - 1]?.value;
  const prev = data[data.length - 2]?.value;
  const delta = latest !== undefined && prev !== undefined ? latest - prev : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {latest}{unit}
            {delta !== null && (
              <Text style={{ color: delta < 0 ? Brand.primary : '#DC2626', fontSize: FontSizes.sm }}>
                {' '}{delta > 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(1)}{unit}
              </Text>
            )}
          </Text>
          {latestLabel && (
            <Text style={[styles.latestLabel, { color: theme.textTertiary }]}>{latestLabel}</Text>
          )}
        </View>
      </View>
      <LineChart data={data} color={color} unit={unit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
    marginTop: 2,
  },
  latestLabel: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
