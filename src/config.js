// src/config.js

// In production the app is served at /quiz on the origin (Siteground/WordPress).
export const BASE_DATA_URL = import.meta.env.PROD 
  ? '/quiz' 
  : '';

// Optional stats API. When set, app fetches stats from here first; falls back to Firebase RTDB if missing.
export const STATS_API_URL = import.meta.env.VITE_STATS_API_URL ?? (import.meta.env.PROD ? '/quiz/api/quiz-stats' : '');

// Full app URL and share URL (used for share links, canonical, etc.). Set in .env or leave default.
export const BASE_SITE_URL = import.meta.env.VITE_BASE_SITE_URL ?? 'https://rythebibleguy.com/quiz/';
export const BASE_SHARE_URL = import.meta.env.VITE_BASE_SHARE_URL ?? 'https://rythebibleguy.com/quiz';
