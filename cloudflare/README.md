# Cloudflare setup

This folder is the source of truth for the worker and how the app is served. **Cloudflare does not pull from this repo** — worker code is pasted into the dashboard when you update it.

## Structure

- **Production app (SPA):** Built by Vite, deployed to **Cloudflare Pages**.
  - Pages URL: `https://react-spa-57t.pages.dev/`
  - That deployment is the static build of this React app (HTML, JS, CSS, assets).
  - **Auto-deploy:** Pushing to the connected GitHub repo triggers a Vite build and updates the Pages site automatically. No manual deploy needed for the SPA.

- **Custom domain path:** The app is also served at **`https://rythebibleguy.com/quiz/`**.
  - The main site at `rythebibleguy.com` is WordPress (or other).
  - A **Cloudflare Worker** runs on the same zone and handles only requests under `/quiz` and `/quiz/*`.

- **Worker (`worker.js`):**
  1. **`/quiz`** → 301 redirect to **`/quiz/`** (trailing slash).
  2. **`/quiz/` and `/quiz/*`** → Proxied to Pages: path is rewritten (e.g. `/quiz/assets/foo.js` → `https://react-spa-57t.pages.dev/assets/foo.js`), response is returned with CORS header.
  3. **SPA fallback:** If the path has no file extension and Pages returns 404, the worker serves `index.html` so the React router can handle the URL.
  4. **All other paths** → Passed through (e.g. to WordPress).

## What uses the worker vs. Pages directly

- **Worker is used for:** Any request to **`https://rythebibleguy.com/quiz`** or **`https://rythebibleguy.com/quiz/*`**. That includes the initial page load, all JS/CSS/assets loaded from that origin, and any in-app navigation or fetches that stay under `/quiz/`. The worker rewrites the path, fetches from Pages, and returns the response (with SPA fallback for client-side routes).

- **Pages is used directly (worker not involved):** Any request to **`https://react-spa-57t.pages.dev/*`**. That includes visiting that URL in a browser, or any script/link that points at `react-spa-57t.pages.dev` (e.g. bookmarks, shared links, or config that uses the Pages URL instead of the custom domain).

## Updating the worker

1. Edit `worker.js` in this folder.
2. In Cloudflare Dashboard: Workers & Pages → your worker → Edit code.
3. Paste the full contents of `worker.js` and save/deploy.

## Where each URL appears in the repo

**Custom domain / worker path — `https://rythebibleguy.com/quiz` or `/quiz`**

| File | Usage |
|------|--------|
| `cloudflare/README.md` | Docs (structure, worker behavior). |
| `cloudflare/worker.js` | Comment; path checks for `/quiz` and `/quiz/`. |
| `index.html` | Canonical URL, favicon paths (`/quiz/assets/...`), og:url, og:image, twitter:url, twitter:image, schema.org `url`. |
| `vite.config.js` | Production `base: '/quiz/'` so assets are under `/quiz/`. |
| `src/config.js` | Production `BASE_DATA_URL = '/quiz'` so data/animations load under `/quiz`. |
| `src/components/AuthModal.jsx` | Links to `https://rythebibleguy.com/terms/` and `https://rythebibleguy.com/privacy/` (main site, not worker). |
| `src/components/ResultsModal.jsx` | Share text: `https://rythebibleguy.com/quiz/`. |
| `src/components/WelcomeScreen.jsx` | Link to `https://rythebibleguy.com/` (main site). |

**Pages URL (direct) — `https://react-spa-57t.pages.dev`**

| File | Usage |
|------|--------|
| `cloudflare/README.md` | Docs (Pages URL, worker proxy target). |
| `cloudflare/worker.js` | `pagesHost = 'react-spa-57t.pages.dev'` (proxy target). |
| `AI_AGENT_INSTRUCTIONS.md` | Production URL for reference. |
