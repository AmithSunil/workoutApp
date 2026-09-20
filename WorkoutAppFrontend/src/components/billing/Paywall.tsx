import { useRouter } from 'expo-router';

import { Card, EmptyState, Screen } from '@/components/ui';
import { routes } from '@/navigation/routes';

/**
 * What a screen renders instead of itself when the plan has lapsed.
 *
 * It renders its own `Screen`, so gating a route costs one early return rather
 * than a wrapper around everything below it — and no `Alert.alert`, which is a
 * no-op on web (project memory `architecture`).
 *
 * Nothing is deleted behind this: clients keep training and logging while their
 * coach is not paying, and everything is exactly where it was on the day the
 * plan comes back.
 */
export function Paywall({
  title = 'Your plan has ended',
  message = 'Your clients and their history are all still here. Pick a plan to open the roster again.',
}: {
  title?: string;
  message?: string;
}) {
  const router = useRouter();
  return (
    <Screen title="Plan" tabBarPadding>
      <Card>
        <EmptyState
          icon="lock-closed-outline"
          title={title}
          message={message}
          actionLabel="See plans"
          onAction={() => router.push(routes.plans())}
        />
      </Card>
    </Screen>
  );
}
