# Config & secrets – one place to look

All environment-dependent and secret values are listed here. **Never commit real secrets to the repo.**

---

## 1. App (Vite / React)

**Where:** `.env` (copy from `.env.example`). `.env` is gitignored.

| Variable | Used in | Notes |
|--------|--------|--------|
| `VITE_FIREBASE_*` | `src/config/firebase.js` | Firebase client config. Get from Firebase Console → Project settings → Your apps. |
| `VITE_STATS_API_URL` | `src/config.js` | Optional; stats API base (e.g. `/quiz/api/quiz-stats`). |
| `VITE_BASE_SITE_URL` | `src/config.js` | Base site URL for share links (e.g. `https://rythebibleguy.com/quiz/`). |
| `VITE_BASE_SHARE_URL` | `src/config.js` | Base URL for share links without trailing slash. |
| `VITE_GA_MEASUREMENT_ID` | `index.html` (injected at build) | Google Analytics 4 measurement ID (e.g. `G-XXXXXXXXXX`). |
| `VITE_CLARITY_PROJECT_ID` | `index.html` (injected at build) | Microsoft Clarity project ID (from Clarity script URL). |

---

## 2. Local HTML tools (e.g. Update User Profiles Tool)

**Where:** `tools/firebase-config.local.js` (copy from `tools/firebase-config.local.example.js`). This file is gitignored.

- Same Firebase config as the app (apiKey, authDomain, projectId, etc.).
- Used only when opening the HTML tool in a browser locally.

---

## 3. Cloudflare Worker (quiz-answerstats-worker.js)

**Where:** Cloudflare Dashboard → Worker → Settings → Variables and Secrets.

| Name | Type | Notes |
|------|------|--------|
| `FIREBASE_RTDB_SECRET` | **Secret** | Firebase RTDB auth token for server access. **Required** for cron. |
| `FIREBASE_RTDB_BASE` | Variable (optional) | RTDB base URL. Default: `https://rythebibleguy-app-default-rtdb.firebaseio.com`. |

Also: KV namespace binding `QUIZ_STATS_KV`.

---

## 4. Firebase / Google Cloud

- **Client API key:** Use env vars (see above). Regenerate in [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) if it was ever exposed.
- **RTDB secret (server):** Used only in the Cloudflare Worker as `FIREBASE_RTDB_SECRET`. Create in Firebase Console → Realtime Database → (gear) → Generate secret.
- **Service account:** If you use Admin SDK in Node scripts, put the JSON key in `service-account.json` or `tools/service-account.json` (both gitignored). Do not commit.

### API key restrictions (Browser key)

When creating or editing the Firebase/Google Cloud API key used by this app, restrict it to **only** these APIs:

| API | Purpose |
|-----|---------|
| Cloud Firestore API | Firestore (profiles, etc.) |
| Identity Toolkit API | Firebase Auth |
| Token Service API | Auth (Google sign-in, etc.) |
| Firebase Installations API | Used by the Firebase JS SDK |
| Firebase Realtime Database API | Client access to Realtime Database (quiz/stats) |

Do **not** enable extra APIs (e.g. Cloud Storage, FCM, Hosting, ML). Use **HTTP referrers** to allow only your site and `localhost` (see same doc or earlier in this file).

---

## 5. Other config (non-secret, in repo)

- **Google Sheets URLs** in `tools/generateQuestions.js`: Public “published” CSV URLs for question data. Safe to commit.
- **Site URLs** in `index.html` (canonical, OG, etc.): Can stay hardcoded or be driven by build; defaults are in `src/config.js` via env.

---

## Quick checklist

- [ ] `.env` created from `.env.example` and filled (app + optional GA/Clarity).
- [ ] `tools/firebase-config.local.js` created from example if you use local HTML tools.
- [ ] Cloudflare Worker has `FIREBASE_RTDB_SECRET` (and optional `FIREBASE_RTDB_BASE`) set.
- [ ] No API keys or RTDB secrets committed in repo or history (regenerate if they were).
