-- Billing fixes. Two things, both found by reading 20260920000001 back against
-- what the edge functions actually do.
--
-- 1. `subscriptions` was left on the dev-posture `using (true)` select policy
--    like every other table, which for a money table means every signed-in
--    user can read every other user's plan, status and billing date. It also
--    broke the app the moment a second person subscribed: the transport's
--    `GET /subscription` has no `user_id` filter -- by design, it leans on RLS
--    to scope the read -- so `.maybeSingle()` would see N rows and error. The
--    pending RLS set already carries the right policy; it is pulled forward
--    here because the table it protects is live now.
--
-- 2. The seeded coach's grandfathered row was damaged by the optimistic
--    `plan_code` write in the razorpay function (fixed in that function).

-- ---------------------------------------------------------------------------
-- Read your own subscription, and nothing else
-- ---------------------------------------------------------------------------

drop policy if exists subscriptions_dev_select on public.subscriptions;

-- Identical to `subscriptions_self_read` in future/20260901000001_auth_rls.sql.pending,
-- which keeps its copy so the pending set still applies cleanly on a fresh DB.
create policy subscriptions_self_read on public.subscriptions for select to authenticated
  using (user_id = public.app_user_id());

-- The price list stays readable by anyone: the paywall has to render it, and
-- there is nothing in it that is not on the marketing page.

-- ---------------------------------------------------------------------------
-- Repair the grandfathered fixture
-- ---------------------------------------------------------------------------

-- t-001 was grandfathered onto perpetual coach_pro. Opening checkout for
-- Starter rewrote plan_code before a rupee moved -- 50 seats down to 15, and a
-- subscription id left behind pointing at a mandate that was then cancelled.
-- The `current_period_end is null` guard makes this a no-op on any row that
-- has ever actually been charged, here or anywhere else.
update public.subscriptions
   set plan_code = 'coach_pro',
       status = 'active',
       razorpay_subscription_id = null
 where user_id = 't-001'
   and current_period_end is null;
