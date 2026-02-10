## Instructions
- Keep it simple: Concise responses, no unnecessary code snippets
- Ask, don't assume: Clarify anything ambiguous rather than guessing
- **No code changes without explicit approval**: Propose changes, explain the approach, and wait for me to explicitly say "do it", "implement it", or similar before making any edits
- Pitch multiple options: When discussing ways to add or change something, present 2-3 different approaches with pros/cons so I can choose
- Reuse existing code: Search for existing functions, patterns, or utilities before writing new code
- **Always start dev server**: Run `npm run dev` at the beginning of each chat session

## React Best Practices
- **No DOM manipulation**: This is a React project - use state and props, not `querySelector`, `getElementById`, `classList`, etc.
- Keep components declarative and let React handle the DOM

## Design Reference
- UI/UX inspired by NY Times Games (Wordle, Connections, etc.)

## Legacy Code
- `Old Code/` folder contains the original HTML/CSS/JS implementation
- Use as reference for ideas and approach, not for copy-pasting code directly
- Only reference this code when explicitly asked to do so

## Hosting Setup
- Development: 
  - `npm run dev` → starts server on localhost:5173 + exposes on network for mobile testing
  - Server automatically accessible from other devices on same WiFi
  - Mobile access: http://192.168.1.4:5173/
  - React DevTools browser extension installed for debugging
- Production: `npm run build` → creates `dist/` folder → upload dist contents to WordPress /react directory