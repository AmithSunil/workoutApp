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

import { HomeIcon, LogIcon, ProgressIcon, WorkoutsIcon } from '@/components/ui/TabIcons';
import { Brand, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import React, { forwardRef } from 'react';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme ?? 'light'];

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon={(focused) => <HomeIcon color={focused ? colors.accent : colors.textSecondary} size={18} focused={focused} />}>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="log" href="/log" asChild>
            <TabButton icon={(focused) => <LogIcon color={focused ? colors.accent : colors.textSecondary} size={18} focused={focused} />}>Log</TabButton>
          </TabTrigger>
          <TabTrigger name="workouts" href="/workouts" asChild>
            <TabButton icon={(focused) => <WorkoutsIcon color={focused ? colors.accent : colors.textSecondary} size={18} focused={focused} />}>Workouts</TabButton>
          </TabTrigger>
          <TabTrigger name="progress" href="/progress" asChild>
            <TabButton icon={(focused) => <ProgressIcon color={focused ? colors.accent : colors.textSecondary} size={18} focused={focused} />}>Progress</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends React.PropsWithChildren<TabTriggerSlotProps> {
  icon: (focused: boolean) => React.ReactNode;
}

export const TabButton = forwardRef<View, TabButtonProps>(
  ({ children, icon, isFocused, ...props }, ref) => {
    return (
      <Pressable ref={ref} {...props} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView
          type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.tabButtonView, isFocused && { borderBottomWidth: 2, borderBottomColor: Brand.primary }]}>
          <View style={styles.tabButtonContent}>
            {icon(!!isFocused)}
            <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
              {children}
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    );
  }
);

export const CustomTabList = forwardRef<View, TabListProps>(
  ({ children, ...props }, ref) => {
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
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
