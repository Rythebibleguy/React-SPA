// src/config.js

// In production the app is served at /quiz on the origin (Siteground/WordPress).
export const BASE_DATA_URL = import.meta.env.PROD 
  ? '/quiz' 
  : '';

// Optional stats API. When set, app fetches stats from here first; falls back to Firebase RTDB if missing.
// Set VITE_STATS_API_URL at build time if you have a separate stats endpoint (e.g. /quiz/api/quiz-stats).
export const STATS_API_URL = import.meta.env.VITE_STATS_API_URL ?? (import.meta.env.PROD ? '/quiz/api/quiz-stats' : '');

// Full app URL (used for share links; site is served over HTTPS)
export const BASE_SITE_URL = 'https://rythebibleguy.com/quiz/';

// Share URL (full URL for pasting in shares)
export const BASE_SHARE_URL = 'https://rythebibleguy.com/quiz';
