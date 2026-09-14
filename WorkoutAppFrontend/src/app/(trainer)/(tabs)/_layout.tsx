import { Tabs } from 'expo-router';
import { useMemo } from 'react';

import { useGetAlertsQuery, useGetTrainerSummaryQuery } from '@/api/endpoints/trainerApi';
import { createAppTabBar, type TabMeta } from '@/components/navigation/AppTabBar';
import { useTracking } from '@/hooks/useTracking';
import { ALERT_DOMAIN, shows, type TrackingDomain } from '@/utils/tracking';

export const unstable_settings = {
  initialRouteName: 'dashboard',
};

const BASE_TABS: Array<TabMeta & { domain?: TrackingDomain }> = [
  { name: 'dashboard', label: 'Triage', icon: 'pulse-outline', iconActive: 'pulse' },
  { name: 'roster', label: 'Clients', icon: 'people-outline', iconActive: 'people' },
  {
    name: 'routines',
    label: 'Routines',
    icon: 'clipboard-outline',
    iconActive: 'clipboard',
    domain: 'workout',
  },
  { name: 'messages', label: 'Messages', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
];

export default function TrainerTabsLayout() {
  const { data: summary } = useGetTrainerSummaryQuery();
  const { data: alerts } = useGetAlertsQuery();
  const { mode } = useTracking();

  // Same filter as the dashboard: a badge must not count a flag that is hidden.
  const criticalAlerts = (alerts ?? []).filter(
    (a) => a.severity === 'critical' && shows(mode, ALERT_DOMAIN[a.kind])
  ).length;

  // Badges are derived from live summary data, so the bar rebuilds when it moves.
  const visibleTabs = BASE_TABS.filter((tab) => shows(mode, tab.domain ?? 'both'));

  const AppTabBar = useMemo(
    () =>
      createAppTabBar(
        visibleTabs.map((tab) =>
          tab.name === 'messages'
            ? { ...tab, badge: summary?.unreadMessages }
            : tab.name === 'dashboard'
              ? { ...tab, badge: criticalAlerts }
              : tab
        )
      ),
    [summary?.unreadMessages, criticalAlerts, mode]
  );

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={AppTabBar}>
      {BASE_TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
