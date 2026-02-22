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
        const answersMs = t?.answers_data_fetch_Cloudflare ?? t?.answers_data_fetch_Firebase
        const steps = []
        if (authMs != null) steps.push({ ms: authMs, props: { auth_completed_ms: authMs, auth_type: t?.auth_type } })
        if (t?.lottie_animation_started != null) steps.push({ ms: t.lottie_animation_started, props: { time_to_lottie_ms: t.lottie_animation_started } })
        if (answersMs != null) steps.push({ ms: answersMs, props: { answers_data_fetch_ms: answersMs, answers_data_source: t?.answers_data_source } })
        if (t?.loading_button_shown != null) steps.push({ ms: t.loading_button_shown, props: { time_to_loading_button_ms: t.loading_button_shown } })
        if (t?.profile_fetch_finished != null) steps.push({ ms: t.profile_fetch_finished, props: { profile_fetch_ms: t.profile_fetch_finished } })
        if (t?.play_button_shown != null) steps.push({ ms: t.play_button_shown, props: { time_to_play_button_ms: t.play_button_shown } })
        steps.sort((a, b) => a.ms - b.ms)
        const payload = {}
        steps.forEach((s, i) => {
          const prefix = `step_${i + 1}_`
          Object.entries(s.props).forEach(([k, v]) => { if (v != null) payload[prefix + k] = v })
        })
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
