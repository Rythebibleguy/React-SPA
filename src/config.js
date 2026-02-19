// src/config.js

// This checks if the app is running in production (on Cloudflare)
// In production, use /quiz path so everything is served through rythebibleguy.com
// The Cloudflare Worker proxies these requests to Pages behind the scenes
export const BASE_DATA_URL = import.meta.env.PROD 
  ? '/quiz' 
  : '';

// Stats cache API (Cloudflare Worker). When set, app fetches stats from here first; falls back to RTDB if needed.
// In prod with Worker on same origin use e.g. '/quiz/api/quiz-stats', or set VITE_STATS_API_URL when building.
export const STATS_API_URL = import.meta.env.VITE_STATS_API_URL ?? (import.meta.env.PROD ? '/quiz/api/quiz-stats' : '');

// App URL (Cloudflare enforces HTTPS)
export const BASE_SITE_URL = 'rythebibleguy.com/quiz/';

// Share URL
export const BASE_SHARE_URL = 'rythebibleguy.com/quiz';
