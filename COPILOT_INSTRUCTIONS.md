## Instructions
- Keep it simple: Concise responses, no unnecessary code snippets
- Ask, don't assume: Clarify anything ambiguous rather than guessing
- **No code changes without explicit approval**: Propose changes, explain the approach, and wait for me to explicitly say "do it", "implement it", or similar before making any edits
- Pitch multiple options: When discussing ways to add or change something, present 2-3 different approaches with pros/cons so I can choose
- Reuse existing code: Search for existing functions, patterns, or utilities before writing new code
- **Always start dev server**: Run `npm run dev` at the beginning of each chat session

## Design Reference
- UI/UX inspired by NY Times Games (Wordle, Connections, etc.)

## Hosting Setup
- Development: 
  - `npm run dev` → starts server on localhost:5173 + exposes on network for mobile testing
  - Server automatically accessible from other devices on same WiFi
  - Mobile access: http://192.168.1.4:5173/
- Production: `npm run build` → creates `dist/` folder → upload dist contents to WordPress /react directory