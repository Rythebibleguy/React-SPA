import { createRoot } from 'react-dom/client'
import { useState, useCallback } from 'react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PostHogProvider } from 'posthog-js/react'

// Track timings for PostHog welcome_flow_ready event (no Firebase Performance)
if (typeof performance !== 'undefined') {
  window.__perfStart = performance.timeOrigin
  window.__perfTimings = { page_navigated_to: 0 }

  const labelToKey = (label) => label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')

  window.__perfLog = (label) => {
    const ms = Math.round(performance.now())
    const key = labelToKey(label)
    if (key && window.__perfTimings) window.__perfTimings[key] = ms
    if (label === 'play button shown') {
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
      if (window.__posthog) {
        if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] welcome_flow_ready sent`)
        window.__posthog.capture('welcome_flow_ready', payload)
      } else {
        window.__pendingWelcomeFlowPayload = payload
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

// Clarity stub queues events until real script loads (after Play is ready)
if (window.clarity) {
  window.clarity('event', 'page_loaded')
}

// No-op PostHog client so PostHogProvider never receives null (avoids "no apiKey/client" and "init without token" warnings until loadAnalytics runs).
const posthogNoop = {
  capture: () => {},
  identify: () => {},
  reset: () => {},
  group: () => {},
  getFeatureFlag: () => undefined,
  getFeatureFlagPayload: () => undefined,
  isFeatureEnabled: () => false,
  reloadFeatureFlags: () => Promise.resolve(),
}

// Analytics (GA, PostHog, Clarity) load after Play is ready via loadAnalytics(setPosthogClient)
function Root() {
  const [posthogClient, setPosthogClient] = useState(null)
  const onPlayReady = useCallback(() => {
    const analyticsDone = import('./analyticsLoader').then((m) => {
      m.loadAnalytics(setPosthogClient)
    })
    const statsDone = import('./utils/dataPreloader').then((d) => d.getStatsPromise() || Promise.resolve())
    const authDone = window.__deferredAuthReady || Promise.resolve()
    Promise.all([analyticsDone, statsDone, authDone]).then(() => {
      if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] === DEFERRED PATH FINISHED ===`)
    })
  }, [])
  return (
    <AuthProvider>
      <ThemeProvider>
        <PostHogProvider client={posthogClient ?? posthogNoop}>
          <App onPlayReady={onPlayReady} />
        </PostHogProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<Root />)
