// GET  /api/state?from=AAAA-MM-DD&to=AAAA-MM-DD  → { template, days: { fecha: items } }
// POST /api/state  { kind: "day", date, items } | { kind: "template", items }
// Todas las llamadas llevan el header  x-clave: <APP_SECRET>
import { createHash, timingSafeEqual } from 'node:crypto';
import { store, hasRedis } from './_store.js';

const P = 'plantilla:';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BYTES = 200_000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const digest = (s) => createHash('sha256').update(String(s)).digest();

function check(request) {
  const secret = process.env.APP_SECRET;
  if (!secret) return json({ error: 'Falta configurar APP_SECRET en Vercel (Settings → Environment Variables).' }, 500);
  if (process.env.VERCEL && !hasRedis) return json({ error: 'Falta conectar la base Redis en Vercel (Storage → Upstash for Redis).' }, 500);
  const given = request.headers.get('x-clave') || '';
  if (!timingSafeEqual(digest(given), digest(secret))) return json({ error: 'Clave incorrecta.' }, 401);
  return null;
}

function datesBetween(from, to) {
  const out = [];
  const d = new Date(from + 'T12:00:00Z'), end = new Date(to + 'T12:00:00Z');
  while (d <= end && out.length < 62) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const validItems = (items) => Array.isArray(items) && items.length <= 100 && items.every((x) =>
  x && typeof x.id === 'string' && typeof x.text === 'string' && (x.subs === undefined || (Array.isArray(x.subs) && x.subs.length <= 100)));

export async function GET(request) {
  const denied = check(request);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const from = q.get('from'), to = q.get('to');
  if (!DATE.test(from || '') || !DATE.test(to || '') || from > to) return json({ error: 'Fechas inválidas.' }, 400);
  const dates = datesBetween(from, to);
  const [template, ...vals] = await store.mget(P + 'template', ...dates.map((d) => P + 'day:' + d));
  const days = {};
  dates.forEach((d, i) => { if (vals[i] && Array.isArray(vals[i].items)) days[d] = vals[i].items; });
  return json({ template: template && Array.isArray(template.items) ? template.items : null, days });
}

export async function POST(request) {
  const denied = check(request);
  if (denied) return denied;
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return json({ error: 'Demasiado grande.' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'JSON inválido.' }, 400); }
  if (!body || !validItems(body.items)) return json({ error: 'Ítems inválidos.' }, 400);
  const value = { items: body.items, updatedAt: Date.now() };
  if (body.kind === 'template') {
    await store.set(P + 'template', value);
  } else if (body.kind === 'day' && DATE.test(body.date || '')) {
    await store.set(P + 'day:' + body.date, value);
  } else {
    return json({ error: 'Tipo inválido.' }, 400);
  }
  return json({ ok: true, updatedAt: value.updatedAt });
}
