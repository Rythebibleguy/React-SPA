import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Critical-path perf logging: each part logs as it happens with [xxxxms]
if (typeof performance !== 'undefined') {
  window.__perfStart = performance.timeOrigin
  console.log('[0ms] page navigated to')
  window.__perfLog = (label) => {
    const ms = Math.round(performance.now())
    console.log(`[${ms}ms] ${label}`)
  }
}

// Suppress Firebase AbortError warnings in development
if (import.meta.env.DEV) {
  const originalError = console.error
  
  console.error = (...args) => {
    // Filter out Firebase AbortError warnings
    const message = args[0]
    if (typeof message === 'string' && message.includes('AbortError')) {
      return
    }
    // Also filter out "Uncaught (in promise) AbortError" that show in console
    if (args.some(arg => 
      (typeof arg === 'object' && arg?.name === 'AbortError') ||
      (typeof arg === 'string' && arg.includes('AbortError: The user aborted a request'))
    )) {
      return
    }
    originalError.apply(console, args)
  }

  // Suppress unhandled promise rejections for AbortErrors
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.name === 'AbortError' || 
        event.reason?.message?.includes('aborted a request')) {
      event.preventDefault()
    }
  })
}

// Track page load (Clarity stub is in index.html head and queues events)
if (window.clarity) {
  window.clarity("event", "page_loaded")
}

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </AuthProvider>
)
