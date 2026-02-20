/**
 * Cloudflare Worker: quiz answer stats cache (standalone).
 * - GET ?date=YYYY-MM-DD: return stats from KV (instant).
 * - Cron (hourly): fetch today's stats from Firebase RTDB, write to KV.
 *
 * Deploy: Paste this file into the Cloudflare Dashboard (Workers & Pages → Create/edit worker).
 * Add KV binding "QUIZ_STATS_KV", secret "FIREBASE_RTDB_SECRET", cron "0 * * * *", and route for /quiz/api/quiz-stats.
 * Optional env var: FIREBASE_RTDB_BASE (defaults to rythebibleguy-app RTDB URL).
 */

const DEFAULT_RTDB_BASE = 'https://rythebibleguy-app-default-rtdb.firebaseio.com';

function dateKey(dateStr) {
  return `stats:${dateStr}`;
}

function toYYYYMMDD(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchFromRTDB(rtdbBase, dateStr, secret) {
  const url = `${rtdbBase}/quiz_stats/${dateStr}.json?auth=${secret}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  if (text === 'null' || text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }
    const dateStr = url.searchParams.get('date') || toYYYYMMDD(new Date());
    const key = dateKey(dateStr);
    const value = await env.QUIZ_STATS_KV.get(key);
    if (value === null) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    return new Response(value, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },

  async scheduled(controller, env, ctx) {
    const secret = env.FIREBASE_RTDB_SECRET;
    if (!secret) return;
    const rtdbBase = env.FIREBASE_RTDB_BASE || DEFAULT_RTDB_BASE;
    const now = new Date();
    const dates = [
      toYYYYMMDD(now),
      toYYYYMMDD(new Date(now.getTime() - 86400000)),
      toYYYYMMDD(new Date(now.getTime() + 86400000)),
    ];
    for (const dateStr of dates) {
      const data = await fetchFromRTDB(rtdbBase, dateStr, secret);
      const key = dateKey(dateStr);
      await env.QUIZ_STATS_KV.put(key, JSON.stringify(data ?? {}));
    }
  },
};
