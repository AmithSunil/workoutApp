import { Tabs } from 'expo-router';
import { useMemo } from 'react';

import { useGetTrainerSummaryQuery } from '@/api/endpoints/trainerApi';
import { createAppTabBar, type TabMeta } from '@/components/navigation/AppTabBar';

export const unstable_settings = {
  initialRouteName: 'dashboard',
};

const BASE_TABS: TabMeta[] = [
  { name: 'dashboard', label: 'Triage', icon: 'pulse-outline', iconActive: 'pulse' },
  { name: 'roster', label: 'Clients', icon: 'people-outline', iconActive: 'people' },
  { name: 'routines', label: 'Routines', icon: 'clipboard-outline', iconActive: 'clipboard' },
  { name: 'messages', label: 'Messages', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
];

export default function TrainerTabsLayout() {
  const { data: summary } = useGetTrainerSummaryQuery();

  // Badges are derived from live summary data, so the bar rebuilds when it moves.
  const AppTabBar = useMemo(
    () =>
      createAppTabBar(
        BASE_TABS.map((tab) =>
          tab.name === 'messages'
            ? { ...tab, badge: summary?.unreadMessages }
            : tab.name === 'dashboard'
              ? { ...tab, badge: summary?.criticalAlerts }
              : tab
        )
      ),
    [summary?.unreadMessages, summary?.criticalAlerts]
  );

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={AppTabBar}>
      {BASE_TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
