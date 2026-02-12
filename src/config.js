// src/config.js

// This checks if the app is running in production (on Cloudflare)
// In production, use /quiz path so everything is served through rythebibleguy.com
// The Cloudflare Worker proxies these requests to Pages behind the scenes
export const BASE_DATA_URL = import.meta.env.PROD 
  ? '/quiz' 
  : '';

// Canonical app URL for share links (friends, results, etc.)
export const BASE_SITE_URL = 'https://rythebibleguy.com/quiz/';
