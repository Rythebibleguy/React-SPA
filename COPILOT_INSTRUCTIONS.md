## 🎯 ALWAYS REFERENCE THESE INSTRUCTIONS
**CRITICAL**: Read and consider ALL instructions in this file before every single chat response. These guidelines should influence how you:
- Communicate with me
- Approach problem-solving  
- Make code changes
- Handle requests and questions

## Session Setup
- **Always start dev server**: Run `npm run dev` at the beginning of each chat session

## Communication Style
- Keep it simple: Concise responses
- Don't show code snippets in chat unless critical for explanation
- Ask, don't assume: Clarify anything ambiguous rather than guessing

## Discussing Changes
- **Reuse existing code**: Search for existing functions, patterns, or utilities before writing new code
- **Pitch multiple options**: When discussing ways to add or change something, present 3 different approaches with pros/cons so I can choose (when possible). After presenting options, state your recommended option and briefly explain why.
- **Debug persistent bugs**: If we're experiencing bugs and haven't solved them after several code changes, suggest adding debug logs to find the root issue rather than continuing to guess

## 🚨 CRITICAL: Before Making ANY Code Changes
**STOP AND CONFIRM FIRST** - You must ALWAYS:
1. Explain what you want to change and why
2. Show or describe the specific changes you'll make
3. Wait for explicit approval ("do it", "implement it", "yes", "go ahead", etc.)
4. NEVER make edits without confirmation, even if the request seems clear

## React Best Practices
- **No DOM manipulation**: This is a React project - use state and props, not `querySelector`, `getElementById`, `classList`, etc.
- Keep components declarative and let React handle the DOM

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
- Production: 
  - Live site: https://react-spa-57t.pages.dev/ (Cloudflare Pages)