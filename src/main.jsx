import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { perf } from './config/firebase'
import { trace } from 'firebase/performance'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

// Critical-path perf: track timings, send one PostHog event when welcome flow is ready + Firebase Performance trace
if (typeof performance !== 'undefined') {
  window.__perfStart = performance.timeOrigin
  window.__perfTimings = { page_navigated_to: 0 }
  console.log('[0ms] page navigated to')

  const welcomeTrace = trace(perf, 'welcome_flow')
  welcomeTrace.start()
  window.__perfTrace = welcomeTrace

  const labelToKey = (label) => label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')

  window.__perfLog = (label) => {
    const ms = Math.round(performance.now())
    const key = labelToKey(label)
    if (key && window.__perfTimings) window.__perfTimings[key] = ms
    if (window.__perfTrace) {
      if (key) window.__perfTrace.putMetric(key, ms)
      if (label === 'play button shown') {
        window.__perfTrace.stop()
        const t = window.__perfTimings
        const authMs = t?.auth_completed_guest ?? t?.auth_completed_user
        const payload = {
          step_1_time_to_lottie_ms: t?.lottie_animation_started,
          step_2_time_to_loading_button_ms: t?.loading_button_shown,
          step_3_time_to_play_button_ms: t?.play_button_shown,
          step_4_auth_completed_ms: authMs,
          step_4_auth_type: t?.auth_type,
          step_5_profile_fetch_ms: t?.profile_fetch_finished,
          step_6_answers_data_fetch_ms: t?.answers_data_fetch_Cloudflare ?? t?.answers_data_fetch_Firebase,
          step_6_answers_data_source: t?.answers_data_source,
        }
        posthog?.capture('welcome_flow_ready', payload)
      }
    }
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

// PostHog (only when key is set)
const posthogKey = (import.meta.env.VITE_POSTHOG_KEY || '').toString().trim()
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'always',
    capture_pageview: true,
  })
  if (import.meta.env.DEV) {
    console.log('[PostHog] initialized, requests go to', import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com')
  }
} else if (import.meta.env.DEV) {
  console.warn('[PostHog] not loaded: VITE_POSTHOG_KEY is missing or empty in .env')
}

const root = createRoot(document.getElementById('root'))
const app = (
  <AuthProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </AuthProvider>
)
root.render(
  posthogKey ? (
    <PostHogProvider client={posthog}>{app}</PostHogProvider>
  ) : (
    app
  )
)
