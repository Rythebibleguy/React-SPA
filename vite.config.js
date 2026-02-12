import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // If we are building for production, use the absolute URL. 
    // Otherwise (dev mode), use the standard local path.
    base: mode === 'production' 
      ? 'https://react-spa-57t.pages.dev/' 
      : '/',
    server: {
      host: '0.0.0.0',
      port: 5173
    }
  }
})
 