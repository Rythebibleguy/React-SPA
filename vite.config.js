import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
    ],
    // Production: app is served at /quiz/ on the origin (Siteground/WordPress)
    base: mode === 'production' 
      ? '/quiz/' 
      : '/',
    server: {
      host: '0.0.0.0',
      port: 5173
    }
  }
})
 