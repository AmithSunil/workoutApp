import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { colors, spacing } from '@/theme';

export const TAB_BAR_HEIGHT = 64;

export interface ScreenProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Right-hand slot in the large header — avatar, action button, etc. */
  headerRight?: ReactNode;
  showBack?: boolean;
  scroll?: boolean;
  /** Adds bottom padding so content clears the tab bar. */
  tabBarPadding?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentStyle?: ScrollViewProps['contentContainerStyle'];
}

/**
 * Page chrome: safe-area handling, the large title header and the scroll
 * container. Every route renders inside one of these.
 */
export function Screen({
  children,
  title,
  subtitle,
  headerRight,
  showBack,
  scroll = true,
  tabBarPadding = true,
  refreshControl,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const header =
    title || showBack ? (
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.headerText}>
          {title ? (
            <Text variant="title" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {headerRight}
      </View>
    ) : (
      <View style={{ height: insets.top }} />
    );

  const padding = {
    paddingBottom: (tabBarPadding ? TAB_BAR_HEIGHT + insets.bottom : insets.bottom) + spacing.xl,
  };

  if (!scroll) {
    return (
      <View style={styles.root}>
        {header}
        <View style={[styles.flexBody, padding]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, padding, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  back: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginLeft: -spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  flexBody: {
    flex: 1,
  },
});
