import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gaId = env.VITE_GA_MEASUREMENT_ID ?? 'G-L1W79PVGP6'
  const clarityId = env.VITE_CLARITY_PROJECT_ID ?? 'vflpooktqj'

  return {
    plugins: [
      react(),
      {
        name: 'inject-env-into-html',
        transformIndexHtml(html) {
          return html
            .replaceAll('__VITE_GA_MEASUREMENT_ID__', gaId)
            .replaceAll('__VITE_CLARITY_PROJECT_ID__', clarityId)
        },
      },
      // Load main stylesheet async so it doesn't block first paint (helps LCP)
      {
        name: 'async-css',
        apply: 'build',
        closeBundle() {
          const outDir = join(process.cwd(), 'dist')
          const htmlPath = join(outDir, 'index.html')
          let html = readFileSync(htmlPath, 'utf-8')
          html = html.replace(
            /<link rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)\s*\/?>/g,
            (_m, before, href, after) =>
              `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'">\n    <noscript><link rel="stylesheet" href="${href}"></noscript>`
          )
          writeFileSync(htmlPath, html)
        },
      },
    ],
    // Production: app is served at /quiz/ on the origin (Siteground/WordPress)
    base: mode === 'production' 
      ? '/quiz/' 
      : '/',
    // Target modern browsers only so we don't ship legacy polyfills (e.g. Math.trunc)
    build: {
      target: ['es2022', 'chrome93', 'safari15.4', 'firefox91', 'edge93'],
    },
    server: {
      host: '0.0.0.0',
      port: 5173
    }
  }
})
 