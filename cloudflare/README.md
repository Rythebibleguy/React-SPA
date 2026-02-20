# Cloudflare Workers (legacy)

These Worker scripts were used when the quiz was hosted on **Cloudflare Pages** and traffic to `rythebibleguy.com/quiz` was proxied through a Worker.

**Current setup:** The quiz is now served from the **Siteground/WordPress** origin at `/quiz/`. Cloudflare sits in front as CDN only (no Worker for `/quiz`). These files are kept for reference only and are **not deployed**.

- `quiz-proxy-worker.js` – previously proxied `/quiz` and `/quiz/*` to Pages.
- `quiz-answerstats-worker.js` – optional stats cache; app falls back to Firebase RTDB if no stats API is available.

See **MIGRATION-SITEGROUND.md** in the project root for the current hosting and deployment steps.
