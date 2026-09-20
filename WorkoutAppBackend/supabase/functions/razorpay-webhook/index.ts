/**
 * Razorpay's webhook. The only thing that moves money-backed state -- which
 * now includes `plan_code`: the plan a user is on is the plan Razorpay says it
 * charged them for, read back off the charged subscription's own plan_id, not
 * something the app wrote hopefully when checkout opened.
 *
 * No JWT (Razorpay has none) — the HMAC over the raw body is the auth, so the
 * body is read as text once and parsed only after it verifies.
 *
 * Point Razorpay at:  <project>/functions/v1/razorpay-webhook
 * Events:             subscription.charged, .halted, .pending, .cancelled, .completed
 * Secret:             RAZORPAY_WEBHOOK_SECRET
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const enc = new TextEncoder();

async function verify(raw: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(raw));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // Constant-time-ish: same length, compare every byte.
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const raw = await req.text();
  const ok = await verify(raw, req.headers.get('x-razorpay-signature') ?? '',
                          Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!);
  if (!ok) return new Response('bad signature', { status: 401 });

  const body = JSON.parse(raw);
  const entity = body?.payload?.subscription?.entity;
  if (!entity?.id) return new Response('ignored', { status: 200 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const patch: Record<string, unknown> = {};

  switch (body.event) {
    case 'subscription.charged': {
      patch.status = 'active';
      // current_end is the epoch second the paid period runs to. That single
      // value is the entitlement -- see the migration header. If Razorpay ever
      // sends the event without one, leave the date alone rather than writing
      // 1970 and lapsing someone who has just paid.
      if (entity.current_end) {
        patch.current_period_end = new Date(entity.current_end * 1000).toISOString();
      }
      // What they were actually charged for. The plan object is the authority;
      // the app never writes plan_code for a paid tier.
      if (entity.plan_id) {
        const { data: plan } = await admin
          .from('plans').select('code').eq('razorpay_plan_id', entity.plan_id).maybeSingle();
        if (plan) patch.plan_code = plan.code;
      }
      break;
    }
    case 'subscription.halted':
    case 'subscription.pending':
      // Razorpay is retrying. Leave the date alone: they keep what they paid
      // for and lapse on their own if the retries never land.
      patch.status = 'past_due';
      break;
    case 'subscription.cancelled':
    case 'subscription.completed':
      patch.status = 'cancelled';
      break;
    default:
      return new Response('ignored', { status: 200 });
  }

  // Matched on the id we stored when we created it -- not on notes, which the
  // dashboard can edit.
  const { data: hit, error } = await admin
    .from('subscriptions').update(patch)
    .eq('razorpay_subscription_id', entity.id).select('user_id');
  if (error) return new Response(error.message, { status: 500 });
  if (hit?.length) return new Response('ok', { status: 200 });

  // Nothing matched. For a charge that means real money moved against a
  // subscription this row no longer points at -- an abandoned checkout tab
  // paid after a second one replaced the stored id. Fall back to the user in
  // notes and adopt the id, so every later event finds it. Only for a charge:
  // a cancellation of a superseded subscription is exactly what we do NOT
  // want applied to the live one.
  const notesUser = entity.notes?.user_id;
  if (body.event === 'subscription.charged' && notesUser) {
    const { error: e2 } = await admin.from('subscriptions')
      .update({ ...patch, razorpay_subscription_id: entity.id })
      .eq('user_id', notesUser);
    if (e2) return new Response(e2.message, { status: 500 });
    return new Response('ok (adopted)', { status: 200 });
  }

  return new Response('no match', { status: 200 });
});
