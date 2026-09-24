import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChatFab } from '@/components/common/ChatFab';
import { createAppTabBar, type TabMeta } from '@/components/navigation/AppTabBar';
import { useClientThread, useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { colors } from '@/theme';
import { shows, type TrackingDomain } from '@/utils/tracking';

export const unstable_settings = {
  initialRouteName: 'explore',
};

const TABS: Array<TabMeta & { domain?: TrackingDomain }> = [
  { name: 'explore', label: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  {
    name: 'log',
    label: 'Log',
    icon: 'restaurant-outline',
    iconActive: 'restaurant',
    domain: 'nutrition',
  },
  {
    name: 'workouts',
    label: 'Workouts',
    icon: 'barbell-outline',
    iconActive: 'barbell',
    domain: 'workout',
  },
  { name: 'progress', label: 'Progress', icon: 'trending-up-outline', iconActive: 'trending-up' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

/**
 * The client shell. The chat FAB lives here rather than on individual screens so
 * the route to the coach is one tap away from every tab, exactly as specified.
 */
export default function ClientTabsLayout() {
  const { clientId } = useSession();
  const thread = useClientThread(clientId);
  const { mode } = useTracking();

  // A client only tracks what their coach chose; the hidden tab's screen also redirects.
  const AppTabBar = useMemo(
    () => createAppTabBar(TABS.filter((tab) => shows(mode, tab.domain ?? 'both'))),
    [mode]
  );

  return (
    <View style={styles.root}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={AppTabBar}>
        {TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
        ))}
      </Tabs>
      <ChatFab href={routes.client.chat()} unread={thread?.unreadForClient ?? 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
