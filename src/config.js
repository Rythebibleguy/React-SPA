// src/config.js

// This checks if the app is running in production (on Cloudflare)
// If yes, it uses the hard link. If no (local dev), it uses a relative path.
export const BASE_DATA_URL = import.meta.env.PROD 
  ? 'https://react-spa-57t.pages.dev' 
  : '';
