/**
 * AI meal parsing: a description, a photo, or both in -> the meal's items with
 * an estimated weight and the macros for that weight out. Nothing is written
 * here; the app shows the result on the confirmation card and only logs what
 * the client confirms (and re-weighs with the sliders).
 *
 * THE SWAP POINT. The model is expected to change. Everything provider-shaped
 * lives in `callModel()` — the request, the schema, the response unwrapping.
 * The app only knows `POST /ai/parse` and the AiFoodSuggestion shape, so a
 * different model or vendor is a change to this file and the secrets, never an
 * app release.
 *
 * Secrets (supabase secrets set):
 *   AI_API_KEY   required — Google AI Studio key (never in the app bundle)
 *   AI_MODEL     optional — defaults to gemini-3.5-flash
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

// ~5 MB of image once decoded. The app sends a compressed JPEG well under this.
const MAX_IMAGE_B64 = 7_000_000;
const MAX_TEXT = 1000;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const PROMPT = `You are a precise sports nutritionist logging a client's meal.
Identify each distinct food or drink from the photo and/or the description.
For each item estimate the amount actually eaten in grams (ml for drinks) and the
calories and grams of protein, carbs and fat FOR THAT AMOUNT.
Use the client's description to correct portion sizes, hidden ingredients
(oil, ghee, butter, sugar, sauces) and anything the photo cannot show.
Keep mixed dishes as one item unless components are clearly separate on the plate.
Prefer common Indian and international serving conventions for servingLabel
(e.g. "2 pieces", "1 katori", "1 cup cooked").
confidence is 0 to 1 for the estimate as a whole.
If there is no food, return an empty items list.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    confidence: { type: 'NUMBER' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          emoji: { type: 'STRING' },
          servingLabel: { type: 'STRING' },
          grams: { type: 'NUMBER' },
          calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
        },
        required: ['name', 'emoji', 'servingLabel', 'grams', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
  },
  required: ['confidence', 'items'],
};

type Image = { base64: string; mimeType: string };

class ModelError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function callModel(text: string, image: Image | null): Promise<unknown> {
  const key = Deno.env.get('AI_API_KEY');
  if (!key) throw new ModelError('AI is not configured', 503);

  const parts: unknown[] = [];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  parts.push({ text: text ? `Client's description: ${text}` : 'No description; use the photo.' });
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
  });

  // Flash models 503 under load often enough to matter; one lighter fallback
  // turns most of those into an answer instead of an error.
  // ponytail: one fallback, no backoff; add retries if 503s still surface.
  const models = [Deno.env.get('AI_MODEL') || 'gemini-3.5-flash', 'gemini-flash-lite-latest'];
  let last = 502;
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body },
    );
    if (res.status === 429 || res.status === 503) { last = res.status; continue; }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('model error', model, res.status, JSON.stringify(data?.error ?? data));
      throw new ModelError('Could not analyse that meal', 502);
    }
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      return JSON.parse(raw);
    } catch {
      throw new ModelError('Could not read the meal from that', 422);
    }
  }
  throw new ModelError('The AI is busy right now — try again in a moment', last === 429 ? 429 : 503);
}

const n = (v: unknown, max: number) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(Math.max(x, 0), max) : 0;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  // Signed-in users only: the gateway already verified the JWT; this makes sure
  // it belongs to an app user and not just the anon key.
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userId } = await asUser.rpc('app_user_id');
  if (!userId) return json({ message: 'Sign in first' }, 401);
  // ponytail: no per-user rate limit; add a daily counter if the AI bill says so.

  let body: { text?: unknown; image?: Partial<Image> | null };
  try {
    body = await req.json();
  } catch {
    return json({ message: 'Bad request' }, 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : '';
  let image: Image | null = null;
  if (body.image) {
    const { base64, mimeType } = body.image;
    if (typeof base64 !== 'string' || !base64 || typeof mimeType !== 'string' || !IMAGE_TYPES.has(mimeType)) {
      return json({ message: 'That photo format is not supported' }, 400);
    }
    if (base64.length > MAX_IMAGE_B64) return json({ message: 'That photo is too large' }, 413);
    image = { base64, mimeType };
  }
  if (!text && !image) return json({ message: 'Describe the meal or add a photo' }, 400);

  try {
    const out = (await callModel(text, image)) as { confidence?: unknown; items?: unknown[] };
    const items = (Array.isArray(out?.items) ? out.items : [])
      .map((i) => i as Record<string, unknown>)
      .filter((i) => typeof i.name === 'string' && n(i.grams, 5000) > 0)
      .slice(0, 20)
      .map((i) => ({
        name: String(i.name).slice(0, 80),
        emoji: typeof i.emoji === 'string' && i.emoji ? i.emoji.slice(0, 8) : '🍽️',
        servingLabel: String(i.servingLabel ?? '').slice(0, 60),
        servings: 1,
        grams: Math.round(n(i.grams, 5000)),
        calories: Math.round(n(i.calories, 10000)),
        protein: Math.round(n(i.protein, 1000)),
        carbs: Math.round(n(i.carbs, 1000)),
        fat: Math.round(n(i.fat, 1000)),
      }));
    if (items.length === 0) return json({ message: "Couldn't spot any food — add a description?" }, 422);

    return json({
      id: crypto.randomUUID(),
      transcript: text || 'From your photo',
      confidence: n(out.confidence, 1),
      items,
    });
  } catch (e) {
    if (e instanceof ModelError) return json({ message: e.message }, e.status);
    console.error(e);
    return json({ message: 'Could not analyse that meal' }, 500);
  }
});
