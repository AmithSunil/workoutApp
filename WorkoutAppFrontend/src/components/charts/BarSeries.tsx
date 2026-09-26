import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Optional per-bar colour override — used for over/under target shading. */
  color?: string;
  caption?: string;
}

export interface BarSeriesProps {
  data: BarDatum[];
  height?: number;
  target?: number;
  color?: string;
  onPressBar?: (datum: BarDatum) => void;
  activeKey?: string;
}

/**
 * Compact vertical bar series — weekly calorie compliance, sessions per week,
 * habit completion. Deliberately layout-based rather than SVG so labels stay
 * crisp and hit targets stay large.
 */
export function BarSeries({
  data,
  height = 120,
  target,
  color = colors.primary,
  onPressBar,
  activeKey,
}: BarSeriesProps) {
  const max = Math.max(...data.map((d) => d.value), target ?? 0, 1);

  return (
    <View style={styles.wrapper}>
      {target !== undefined ? (
        <View
          style={[styles.targetLine, { pointerEvents: 'none', top: height - (target / max) * height }]}
        />
      ) : null}
      <View style={styles.row}>
        {data.map((d) => {
          const active = d.key === activeKey;
          const barHeight = Math.max(4, (d.value / max) * height);
          const Wrapper = onPressBar ? Pressable : View;
          return (
            <Wrapper
              key={d.key}
              onPress={onPressBar ? () => onPressBar(d) : undefined}
              accessibilityRole={onPressBar ? 'button' : undefined}
              accessibilityState={onPressBar ? { selected: active } : undefined}
              style={styles.column}>
              <View style={[styles.barArea, { height }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: d.color ?? color,
                      opacity: activeKey && !active ? 0.4 : 1,
                    },
                  ]}
                />
              </View>
              <Text variant="micro" tone={active ? 'default' : 'tertiary'} numberOfLines={1}>
                {d.label}
              </Text>
              {d.caption ? (
                <Text variant="micro" tone="tertiary" numberOfLines={1}>
                  {d.caption}
                </Text>
              ) : null}
            </Wrapper>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  barArea: {
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bar: {
    width: '78%',
    maxWidth: 34,
    borderRadius: radius.xs,
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.borderStrong,
    zIndex: 1,
  },
});
