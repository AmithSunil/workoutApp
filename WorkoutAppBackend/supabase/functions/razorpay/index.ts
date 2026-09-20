/**
 * Razorpay, the parts that need a secret: starting a subscription, switching
 * to the free tier, and cancelling. Called with the user's JWT; nothing here
 * trusts the body for identity.
 *
 * Checkout itself is Razorpay's own hosted page — the `short_url` a created
 * subscription comes back with. The app opens it with expo-web-browser, which
 * is already a dependency, so there is no native SDK and web and android take
 * exactly the same path.
 *
 * THE RULE THIS FUNCTION OBEYS: it never writes `plan_code`, `status` or
 * `current_period_end` for a plan that has been *paid for*. Only the webhook
 * does, off what Razorpay says it actually charged. Writing the plan optimistically
 * here was a free upgrade: start checkout for Elite, close the browser, and a
 * perpetual free row kept its perpetual date with unlimited seats attached.
 * The single exception is the free tier, which is a downgrade and costs nothing.
 *
 * Secrets (supabase secrets set):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RZP = 'https://api.razorpay.com/v1';
const auth = 'Basic ' + btoa(`${Deno.env.get('RAZORPAY_KEY_ID')}:${Deno.env.get('RAZORPAY_KEY_SECRET')}`);

// The app calls this from a browser (expo web, and localhost during dev), so
// every response needs CORS and the OPTIONS preflight needs an answer.
// Origin `*` is safe here and avoids an allowlist that would need a new entry
// for every dev port and deploy domain: the auth is the JWT in the
// Authorization header, not an ambient cookie, so a hostile origin has nothing
// to replay -- and without Allow-Credentials the browser will not send cookies
// anyway.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

class RzpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function razorpay(path: string, init?: RequestInit) {
  const res = await fetch(`${RZP}${path}`, {
    ...init,
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new RzpError(body?.error?.description ?? `Razorpay ${res.status}`, res.status);
  return body;
}

// Razorpay refuses to cancel anything that is not currently billing, and says
// so with a 400 ("no billing cycle is going on"). `created` is the common one:
// a mandate that was never authorised, which is where every abandoned checkout
// ends up. Asking for the status first turns that 400 into a branch.
const BILLING = new Set(['authenticated', 'active', 'pending', 'halted', 'paused']);

/** Cancels at cycle end if it is live. Returns whether anything was cancelled. */
async function cancelAtRazorpay(id: string): Promise<boolean> {
  const sub = await razorpay(`/subscriptions/${id}`);
  if (!BILLING.has(sub?.status)) return false;
  // They paid for this period and keep it: the row's current_period_end is
  // what lets them in until it passes.
  await razorpay(`/subscriptions/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancel_at_cycle_end: 1 }),
  });
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  const token = req.headers.get('Authorization') ?? '';
  // The caller's own client: app_user_id() reads the token, so who they are is
  // never a parameter. Same rule as create_profile.
  const asUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: token } } },
  );
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: userId } = await asUser.rpc('app_user_id');
  if (!userId) return json({ message: 'Sign in first' }, 401);

  let body: { action?: string; planCode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ message: 'Bad request' }, 400);
  }

  const { data: current } = await admin
    .from('subscriptions')
    .select('razorpay_subscription_id, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  try {
    if (body.action === 'cancel') {
      if (!current?.razorpay_subscription_id) return json({ message: 'Nothing to cancel' }, 404);
      if (await cancelAtRazorpay(current.razorpay_subscription_id)) {
        await admin.from('subscriptions').update({ status: 'cancelled' }).eq('user_id', userId);
      } else {
        // An abandoned checkout. Nothing was ever billing, so nothing about
        // the plan changes -- just drop the dead id so Cancel stops offering
        // itself and a later charge cannot land on a stale row.
        await admin.from('subscriptions')
          .update({ razorpay_subscription_id: null }).eq('user_id', userId);
      }
      return json({ ok: true });
    }

    const { data: plan } = await admin
      .from('plans').select('code, role, max_clients, razorpay_plan_id')
      .eq('code', body.planCode ?? '').single();
    if (!plan) return json({ message: 'Unknown plan' }, 404);

    // planCode comes off the request, so the plan's role has to be checked
    // against the caller's. Otherwise a client asks for `coach_free` and the
    // free branch below hands them a perpetual row -- an account that never
    // expires, for nothing.
    const { data: me } = await admin.from('users').select('role').eq('id', userId).single();
    if (!me || me.role !== plan.role) return json({ message: 'That plan is not for this account' }, 403);

    // A coach cannot move to a plan that does not cover the roster they already
    // have -- otherwise the free tier is a way to keep forty clients forever,
    // since the seat cap only ever bit at invite time. The app hides these
    // plans; this is the same rule where it cannot be talked out of.
    if (plan.role === 'trainer' && plan.max_clients !== null) {
      const { count } = await admin
        .from('client_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', userId);
      if ((count ?? 0) > plan.max_clients) {
        return json({ message: `That plan covers ${plan.max_clients} clients and you have ${count}.` }, 409);
      }
    }

    // Stop the old mandate before starting a new one, or an upgrade quietly
    // bills twice for ever. A 404 means the id is from another Razorpay
    // account -- a test id after a switch to live keys -- and there is nothing
    // to stop; anything else is a real failure and must not be swallowed,
    // because the row is about to forget this id.
    if (current?.razorpay_subscription_id) {
      try {
        await cancelAtRazorpay(current.razorpay_subscription_id);
      } catch (e) {
        if (!(e instanceof RzpError && e.status === 404)) throw e;
      }
    }

    // The free tier is the one plan this function may grant: no money moves, so
    // no webhook will ever speak for it. It is also the only way back in for a
    // coach who has lapsed or wants out without losing the app entirely.
    if (!plan.razorpay_plan_id) {
      await admin.from('subscriptions').upsert({
        user_id: userId,
        plan_code: plan.code,
        status: 'active',
        current_period_end: null,
        razorpay_subscription_id: null,
      }, { onConflict: 'user_id' });
      return json({ shortUrl: null });
    }

    // Start the new mandate where the paid one runs out, so an upgrade does not
    // charge twice for the same month. Entitlement carries on off the old date
    // until then, and the webhook moves the plan when the first charge lands.
    const paidUntil = current?.current_period_end
      ? Math.floor(new Date(current.current_period_end).getTime() / 1000)
      : 0;
    const startAt = paidUntil > Math.floor(Date.now() / 1000) + 300 ? paidUntil : undefined;

    const created = await razorpay('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: plan.razorpay_plan_id,
        // ponytail: 120 monthly cycles is Razorpay's way of saying "until
        // cancelled" — it has no open-ended total_count.
        total_count: 120,
        customer_notify: 1,
        ...(startAt ? { start_at: startAt } : {}),
        notes: { user_id: userId },
      }),
    });

    // A user with no row at all would otherwise pay into nothing: the update
    // below would match zero rows and the webhook would have nothing to find.
    // The row starts already-expired, so it grants nothing until a charge lands.
    if (!current) {
      await admin.from('subscriptions').insert({
        user_id: userId,
        plan_code: plan.code,
        status: 'past_due',
        current_period_end: new Date().toISOString(),
      });
    }

    // The id, and nothing else -- see the header.
    await admin.from('subscriptions').update({
      razorpay_subscription_id: created.id,
      razorpay_customer_id: created.customer_id ?? null,
    }).eq('user_id', userId);

    return json({ shortUrl: created.short_url });
  } catch (e) {
    return json({ message: e instanceof Error ? e.message : 'Payment setup failed' }, 502);
  }
});
