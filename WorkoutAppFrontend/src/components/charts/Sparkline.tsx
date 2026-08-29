import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme';

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  filled?: boolean;
}

/** Tiny inline trend used inside roster rows and stat tiles. */
export function Sparkline({
  values,
  width = 64,
  height = 24,
  color = colors.primary,
  filled = true,
}: SparklineProps) {
  // SVG ids share one global namespace, so every instance needs its own or all
  // sparklines on screen inherit the first one's gradient.
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  if (values.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * (width - 4) + 2,
    y: height - 3 - ((v - min) / span) * (height - 6),
  }));

  const d = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );
  const area = `${d} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const last = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.24} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {filled ? <Path d={area} fill={`url(#${gradientId})`} /> : null}
      <Path d={d} stroke={color} strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={2.25} fill={color} />
    </Svg>
  );
}
