import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Text } from '@/components/ui';
import { colors, motion } from '@/theme';
import { kcal, ratio } from '@/utils/format';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CalorieGaugeProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  /** Caption under the big number; defaults to "left" / "over". */
  caption?: string;
  /** Ring only — for when the numbers are printed beside it. */
  bare?: boolean;
}

/**
 * The hero element of the client's log screen: a single circular gauge showing
 * calories consumed against target, with the remainder as the headline number.
 */
export function CalorieGauge({
  consumed,
  target,
  size = 190,
  strokeWidth = 16,
  caption,
  bare,
}: CalorieGaugeProps) {
  const gradientId = `gauge-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = ratio(consumed, target);
  const remaining = target - consumed;
  const over = remaining < 0;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(filled, {
      duration: motion.slow + 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [filled, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={over ? colors.warning : colors.primary} />
            <Stop offset="1" stopColor={over ? colors.danger : colors.primaryGlow} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {bare ? null : (
      <View style={styles.center} pointerEvents="none">
        <Text variant="display" style={styles.value}>
          {kcal(Math.abs(remaining))}
        </Text>
        <Text variant="label" tone={over ? 'warning' : 'secondary'}>
          {caption ?? (over ? 'kcal over' : 'kcal left')}
        </Text>
        <Text variant="micro" tone="tertiary" style={styles.sub}>
          {kcal(consumed)} of {kcal(target)}
        </Text>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
  },
  sub: {
    marginTop: 4,
  },
});
