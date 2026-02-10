## Instructions
- Keep it simple: Concise responses, no unnecessary code snippets
- Ask, don't assume: Clarify anything ambiguous rather than guessing
- **No code changes without explicit approval**: Propose changes, explain the approach, and wait for me to explicitly say "do it", "implement it", or similar before making any edits
- Pitch multiple options: When discussing ways to add or change something, present 2-3 different approaches with pros/cons so I can choose
- Reuse existing code: Search for existing functions, patterns, or utilities before writing new code

## Deployment Architecture
**Testing:**
- `rythebibleguy.com/test` - WordPress site (SiteGround) for testing before going live
- How it works: Files manually uploaded to `/test` folder for non-live testing

**Production:**
- `daily-bible-quiz-code.pages.dev` - Cloudflare Pages (auto-deploys from GitHub)
- `rythebibleguy.com/quiz` - What users access (proxied to Pages via Cloudflare Worker)
- How it works: Domain points to Cloudflare. Worker intercepts `/quiz` traffic and sends it to the Pages site. Everything else goes to WordPress.
