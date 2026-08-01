/**
 * Web tab navigation for the WorkoutApp – 4 tabs.
 */
import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { Brand, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import React, { forwardRef } from 'react';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>🏠 Home</TabButton>
          </TabTrigger>
          <TabTrigger name="log" href="/log" asChild>
            <TabButton>📷 Log</TabButton>
          </TabTrigger>
          <TabTrigger name="workouts" href="/workouts" asChild>
            <TabButton>💪 Workouts</TabButton>
          </TabTrigger>
          <TabTrigger name="progress" href="/progress" asChild>
            <TabButton>📈 Progress</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export const TabButton = forwardRef<View, React.PropsWithChildren<TabTriggerSlotProps>>(
  ({ children, isFocused, ...props }, ref) => {
    return (
      <Pressable ref={ref} {...props} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView
          type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.tabButtonView, isFocused && { borderBottomWidth: 2, borderBottomColor: Brand.primary }]}>
          <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
            {children}
          </ThemedText>
        </ThemedView>
      </Pressable>
    );
  }
);

export const CustomTabList = forwardRef<View, TabListProps>(
  ({ children, ...props }, ref) => {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme ?? 'light'];

    return (
      <View ref={ref} {...props} style={styles.tabListContainer}>
        <ThemedView type="backgroundElement" style={styles.innerContainer}>
          <ThemedText type="smallBold" style={styles.brandText}>
            FitCoach
          </ThemedText>
          {children}
        </ThemedView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
