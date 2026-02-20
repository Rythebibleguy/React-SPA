import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
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
 