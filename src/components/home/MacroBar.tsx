/**
 * MacroBar – flat rectangular progress bar with monochromatic brand-accent fills.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';

import { FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, consumed, target, color, unit = 'g' }: MacroBarProps) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const ratio = Math.min(consumed / target, 1);
  const remaining = Math.max(target - consumed, 0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: ratio,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [ratio, progress]);

  const widthStyle = {
    width: progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>
          {label.toUpperCase()}
        </Text>
        <Text style={[styles.values, { color: theme.textSecondary }]}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{consumed}</Text>
          {'/'}{target}{unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, widthStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one + 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  values: {
    fontSize: FontSizes.sm,
  },
  track: {
    height: 6,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.sm,
  },
});
