import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { colors, elevation, motion, radius, spacing } from '@/theme';

const EASE_DRAWER = Easing.bezier(...motion.easeDrawer);
/** Far enough to clear any sheet height; translate is in points, not %, so it animates on web too. */
const OFFSCREEN = 900;

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Fraction of the screen the sheet occupies. */
  height?: `${number}%`;
}

/**
 * Bottom sheet on the platform modal. The modal itself doesn't animate — the
 * backdrop fades while the sheet rises on a critically-damped spring, and on
 * close both run out faster than they came in before the modal unmounts.
 * Reduced motion: Reanimated's default `ReduceMotion.System` snaps both.
 */
export function Sheet({ visible, onClose, title, children, height = '72%' }: SheetProps) {
  const insets = useSafeAreaInsets();
  // Stay mounted through the exit animation; unmount when it lands.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.set(withSpring(1, { duration: 300, dampingRatio: 1 }));
    } else {
      progress.set(
        withTiming(0, { duration: 200, easing: EASE_DRAWER }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        })
      );
    }
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * OFFSCREEN }],
  }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
        </Animated.View>
        <Animated.View style={[styles.sheetWrap, { height }, sheetStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.grabber} />
          {title ? (
            <View style={styles.header}>
              <Text variant="h1">{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.body}>{children}</View>
        </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    ...elevation.floating,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
});
