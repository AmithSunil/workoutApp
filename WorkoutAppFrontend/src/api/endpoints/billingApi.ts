import { baseApi } from '../baseApi';

import type { Plan, Subscription } from '@/types/models';

/**
 * Plans and the signed-in user's subscription.
 *
 * There is no id anywhere in these paths on purpose: the server reads the
 * caller off the token (`subscriptions_self_read`), so no client can ask about
 * anyone else's billing, and no screen has to remember whose it is asking for.
 */
export const billingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPlans: build.query<Plan[], void>({
      query: () => ({ url: '/plans' }),
      // The price list changes when Sneha changes it, not during a session.
      keepUnusedDataFor: 3600,
    }),

    getSubscription: build.query<Subscription | null, void>({
      query: () => ({ url: '/subscription' }),
      providesTags: ['Subscription'],
    }),

    /**
     * Starts a Razorpay subscription and returns its hosted checkout URL.
     *
     * It does **not** invalidate: the mandate is not authorised yet when this
     * resolves, and the webhook is what makes it real. The caller refetches
     * once the browser closes — see `plans.tsx`. `shortUrl` is null for the
     * free tier, which is granted outright: no money, so no checkout.
     */
    startCheckout: build.mutation<{ shortUrl: string | null }, string>({
      query: (planCode) => ({
        url: '/subscription/checkout',
        method: 'POST',
        body: { planCode },
      }),
    }),

    cancelSubscription: build.mutation<null, void>({
      query: () => ({ url: '/subscription/cancel', method: 'POST' }),
      invalidatesTags: ['Subscription'],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useGetSubscriptionQuery,
  useStartCheckoutMutation,
  useCancelSubscriptionMutation,
} = billingApi;
