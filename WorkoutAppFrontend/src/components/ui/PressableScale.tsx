import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = Easing.bezier(...motion.easeOut);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Static style only — the pressed state is the scale, not a style callback. */
  style?: StyleProp<ViewStyle>;
  /** Defaults to `motion.pressScale`. Big surfaces (cards) press less. */
  scaleTo?: number;
}

/**
 * The one tappable surface primitive: scales down on press-in (feedback before
 * the tap commits), back on release. A shared value on the UI thread, so a press
 * never re-renders what's inside — cards here hold whole charts.
 */
export function PressableScale({
  style,
  scaleTo = motion.pressScale,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: motion.fast - 40, easing: EASE_OUT }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: motion.fast, easing: EASE_OUT }));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
