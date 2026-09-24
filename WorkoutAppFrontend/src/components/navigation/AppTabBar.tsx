import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { colors, elevation, radius, spacing } from '@/theme';

export interface TabMeta {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  /** Renders a numeric badge — unread messages, open alerts. */
  badge?: number;
}

/**
 * Shared bottom bar for both role shells. Custom rather than the stock bar so
 * the active pill, badge treatment and spacing match the rest of the system.
 *
 * Tab switches never animate — they happen dozens of times a session. Only the
 * press itself gives feedback (the shared scale).
 *
 * NOTE: react-navigation invokes the `tabBar` prop as a plain function rather
 * than rendering it as a component, so nothing in here may call a hook. Safe
 * area values arrive through `props.insets` for exactly that reason.
 */
export function createAppTabBar(tabs: TabMeta[]) {
  return function AppTabBar({ state, navigation, insets }: BottomTabBarProps) {
    return (
      <View style={[styles.bar, { paddingBottom: insets.bottom || spacing.sm }]}>
        {state.routes.map((route, index) => {
          const meta = tabs.find((t) => t.name === route.name);
          if (!meta) return null;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              style={styles.tab}>
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons
                  name={focused ? meta.iconActive : meta.icon}
                  size={21}
                  color={focused ? colors.primary : colors.textTertiary}
                />
                {meta.badge ? (
                  <View style={styles.badge}>
                    <Text variant="micro" color={colors.textInverse} style={styles.badgeText}>
                      {meta.badge > 9 ? '9+' : meta.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                variant="micro"
                tone={focused ? 'default' : 'tertiary'}
                weight={focused ? '700' : '500'}
                numberOfLines={1}>
                {meta.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    );
  };
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    ...elevation.card,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: spacing.md - 2,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 12,
  },
});
