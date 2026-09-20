import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import {
  useCancelSubscriptionMutation,
  useGetPlansQuery,
  useGetSubscriptionQuery,
  useStartCheckoutMutation,
} from '@/api/endpoints/billingApi';
import { Button, Card, Screen, SkeletonCard, Text } from '@/components/ui';
import { useAppSelector } from '@/store/hooks';
import { colors, radius, spacing } from '@/theme';
import { planActive, price, seatsLabel, statusLine } from '@/utils/plan';

/**
 * The price list, for both roles.
 *
 * Checkout is Razorpay's own hosted page, opened in a browser — there is no
 * payments SDK in this app and nothing about a card ever touches it. The
 * webhook is what activates a plan, so when the browser closes this screen
 * simply refetches and believes the server rather than the return URL.
 */
export default function PlansScreen() {
  const role = useAppSelector((s) => s.session.role);
  const plans = useGetPlansQuery();
  // On android the browser closes back into this screen and the refetch at the
  // end of `buy` is enough. On web checkout is a separate tab, so that refetch
  // runs while the card is still being typed -- `refetchOnFocus` (the store
  // already calls setupListeners) asks again when the tab comes back, which is
  // the only way this screen learns the webhook has landed.
  const sub = useGetSubscriptionQuery(undefined, { refetchOnFocus: true });
  const clients = useGetClientsQuery(undefined, { skip: role !== 'trainer' });
  const [checkout, checkoutState] = useStartCheckoutMutation();
  const [cancel, cancelState] = useCancelSubscriptionMutation();
  const [error, setError] = useState<string | null>(null);
  // One confirm slot for both two-tap actions: 'cancel', or the plan code of a
  // downgrade that costs the rest of a paid month.
  const [confirming, setConfirming] = useState<string | null>(null);

  const mine = (plans.data ?? []).filter((p) => p.role === role);
  const current = sub.data ?? null;
  const active = planActive(current);
  const currentPlan = mine.find((p) => p.code === current?.planCode);
  const seatsUsed = clients.data?.length ?? 0;

  const buy = async (code: string) => {
    setError(null);
    setConfirming(null);
    try {
      const { shortUrl } = await checkout(code).unwrap();
      // No URL means nothing to pay: the free tier, and the mock transport,
      // which activates instantly.
      if (shortUrl) await WebBrowser.openBrowserAsync(shortUrl);
      await sub.refetch();
    } catch (e) {
      // The server's own words when it has some -- "That plan covers 2 clients
      // and you have 8" is worth more than "try again".
      const message = (e as { data?: { message?: string } })?.data?.message;
      setError(message ?? 'We could not start that payment. Try again in a moment.');
    }
  };

  return (
    <Screen title="Plan" showBack subtitle={role === 'trainer' ? 'Priced by roster size' : undefined}>
      {current ? (
        <Card style={styles.status}>
          <Text variant="label" tone="secondary">
            {active ? 'Current plan' : 'Lapsed'}
          </Text>
          <Text variant="h2">{mine.find((p) => p.code === current.planCode)?.name ?? current.planCode}</Text>
          <Text variant="body" tone="secondary">
            {statusLine(current, role === 'trainer' ? seatsUsed : undefined)}
          </Text>
        </Card>
      ) : null}

      {plans.isLoading ? (
        <>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </>
      ) : (
        mine.map((p) => {
          // A cancelled plan is not one you are "on" -- it is running out, and
          // re-taking it has to be offered or there is no way back.
          const isCurrent = p.code === current?.planCode && active && current?.status !== 'cancelled';
          // A coach already over a cheaper tier's cap would lose access to
          // clients they have; say so rather than selling them a dead end.
          const tooSmall =
            role === 'trainer' && p.maxClients !== null && seatsUsed > p.maxClients;
          return (
            <Card key={p.code} style={isCurrent ? styles.planCurrent : styles.plan}>
              <View style={styles.planHead}>
                <Text variant="h2">{p.name}</Text>
                <Text variant="h2">
                  {price(p.pricePaise)}
                  {p.pricePaise > 0 ? (
                    <Text variant="caption" tone="secondary">
                      {' '}
                      / month
                    </Text>
                  ) : null}
                </Text>
              </View>
              {role === 'trainer' ? (
                <Text variant="body" tone="secondary">
                  {seatsLabel(p)}
                </Text>
              ) : null}
              {isCurrent ? (
                <Text variant="caption" tone="secondary" style={styles.note}>
                  Your plan
                </Text>
              ) : tooSmall ? (
                <Text variant="caption" tone="secondary" style={styles.note}>
                  You have {seatsUsed} clients — this plan covers {p.maxClients}.
                </Text>
              ) : (
                <>
                  {/*
                    The free tier is choosable, not just a row on a price list.
                    Without it a coach who cancels has no way back into the app
                    at all, and a coach over the free cap cannot land on it --
                    which is the `tooSmall` branch above, now enforced by the
                    edge function too.
                  */}
                  <Button
                    label={
                      confirming === p.code
                        ? 'Tap again to confirm'
                        : p.pricePaise === 0
                          ? 'Switch to Free'
                          : 'Choose'
                    }
                    size="sm"
                    onPress={() => {
                      // Dropping to free ends a paid period there and then, so
                      // it confirms itself the way Cancel does.
                      if (p.pricePaise === 0 && active && confirming !== p.code) {
                        return setConfirming(p.code);
                      }
                      void buy(p.code);
                    }}
                    loading={checkoutState.isLoading && checkoutState.originalArgs === p.code}
                    style={styles.cta}
                  />
                  {confirming === p.code ? (
                    <Text variant="caption" tone="secondary" style={styles.note}>
                      You drop to {p.maxClients} clients now and lose the rest of this paid period.
                    </Text>
                  ) : null}
                </>
              )}
            </Card>
          );
        })
      )}

      {error ? (
        <Text variant="caption" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {/*
        Two taps, not one. A confirm dialog would be the usual answer but
        `Alert.alert` is a no-op on react-native-web (project memory
        `architecture`), so the button confirms itself. `past_due` is included:
        that account has a live mandate and is exactly who wants out.
      */}
      {(current?.status === 'active' || current?.status === 'past_due') &&
      (currentPlan?.pricePaise ?? 0) > 0 ? (
        <Button
          label={confirming === 'cancel' ? 'Tap again to confirm' : 'Cancel subscription'}
          variant="ghost"
          onPress={() => {
            if (confirming !== 'cancel') return setConfirming('cancel');
            setConfirming(null);
            void cancel();
          }}
          loading={cancelState.isLoading}
          style={styles.cancel}
        />
      ) : null}
      {confirming === 'cancel' ? (
        <Text variant="caption" tone="secondary" style={styles.confirmNote}>
          {current?.currentPeriodEnd
            ? `You keep everything until ${new Date(current.currentPeriodEnd).toLocaleDateString()}.`
            : 'You keep everything until the end of this period.'}
        </Text>
      ) : null}

      <Text variant="caption" tone="secondary" style={styles.fineprint}>
        Payments are handled by Razorpay. Cancelling keeps your plan running to the end of the period
        you have already paid for.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: spacing.xs, marginBottom: spacing.md },
  plan: { gap: spacing.xs, marginBottom: spacing.sm },
  planCurrent: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  note: { marginTop: spacing.xs },
  cta: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  cancel: { marginTop: spacing.md },
  confirmNote: { marginTop: spacing.xs, textAlign: 'center' },
  error: { color: colors.danger, marginTop: spacing.sm },
  fineprint: { marginTop: spacing.lg },
});
