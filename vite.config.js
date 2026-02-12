import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // Use /quiz/ as base path so all assets are served through rythebibleguy.com
    // The Cloudflare Worker proxies these requests to Pages behind the scenes
    base: mode === 'production' 
      ? '/quiz/' 
      : '/',
    server: {
      host: '0.0.0.0',
      port: 5173
    }
  }
})
 