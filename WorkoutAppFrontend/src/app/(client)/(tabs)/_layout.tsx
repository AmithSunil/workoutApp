import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ChatFab } from '@/components/common/ChatFab';
import { createAppTabBar, type TabMeta } from '@/components/navigation/AppTabBar';
import { useClientThread, useSession } from '@/hooks/useSession';
import { routes } from '@/navigation/routes';
import { colors } from '@/theme';

export const unstable_settings = {
  initialRouteName: 'explore',
};

const TABS: TabMeta[] = [
  { name: 'explore', label: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'log', label: 'Log', icon: 'restaurant-outline', iconActive: 'restaurant' },
  { name: 'workouts', label: 'Workouts', icon: 'barbell-outline', iconActive: 'barbell' },
  { name: 'progress', label: 'Progress', icon: 'trending-up-outline', iconActive: 'trending-up' },
];

const AppTabBar = createAppTabBar(TABS);

/**
 * The client shell. The chat FAB lives here rather than on individual screens so
 * the route to the coach is one tap away from every tab, exactly as specified.
 */
export default function ClientTabsLayout() {
  const { clientId } = useSession();
  const thread = useClientThread(clientId);

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
