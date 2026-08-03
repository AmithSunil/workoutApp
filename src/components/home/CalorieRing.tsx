/**
 * CalorieRing – massive SVG circular progress gauge.
 * Flat stroke caps, thick track, instrument-grade precision aesthetic.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Brand, FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 280;
const STROKE_WIDTH = 24;
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

  const ringColor = isOver ? theme.danger : theme.accent;

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
        {/* Progress arc — flat butt caps, not rounded */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeOffset}
          strokeLinecap="butt"
        />
      </Svg>

      {/* Center content */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <Text style={[styles.remainingLabel, { color: theme.textTertiary }]}>
            {isOver ? 'OVER BY' : 'REMAINING'}
          </Text>
          <Text style={[styles.remainingValue, { color: isOver ? theme.danger : theme.text }]}>
            {isOver ? consumed - target : remaining}
          </Text>
          <Text style={[styles.consumedText, { color: theme.textSecondary }]}>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  remainingLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
  },
  remainingValue: {
    fontSize: FontSizes['5xl'],
    fontWeight: '800',
    lineHeight: FontSizes['5xl'] * 1.05,
    marginTop: Spacing.one,
  },
  consumedText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    marginTop: Spacing.half,
    letterSpacing: 0.5,
  },
});
