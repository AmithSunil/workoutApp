/**
 * CalorieRing – large SVG circular progress ring showing remaining calories.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Brand, Colors, FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 240;
const STROKE_WIDTH = 20;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingProps {
  consumed: number;
  target: number;
}

export function CalorieRing({ consumed, target }: CalorieRingProps) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  const ratio = Math.min(consumed / target, 1);
  const remaining = Math.max(target - consumed, 0);
  const isOver = consumed > target;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: ratio,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [ratio]);

  const strokeOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const ringColor = isOver ? Colors.light.danger : Brand.primary;

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={theme.backgroundElement}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
        />
      </Svg>

      {/* Center content */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <Text style={[styles.remainingLabel, { color: theme.textSecondary }]}>
            {isOver ? 'Over by' : 'Remaining'}
          </Text>
          <Text style={[styles.remainingValue, { color: isOver ? theme.danger : theme.text }]}>
            {isOver ? consumed - target : remaining}
          </Text>
          <Text style={[styles.remainingUnit, { color: theme.textSecondary }]}>kcal</Text>
          <Text style={[styles.consumedText, { color: theme.textTertiary }]}>
            {consumed} / {target}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  remainingLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  remainingValue: {
    fontSize: FontSizes['4xl'],
    fontWeight: '700',
    lineHeight: FontSizes['4xl'] * 1.1,
  },
  remainingUnit: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    marginTop: -Spacing.one,
  },
  consumedText: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.one,
  },
});
