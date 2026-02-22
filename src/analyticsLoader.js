/**
 * Load analytics and third-party scripts only after the critical path is done
 * (when the Play button is ready). Called from WelcomeScreen when play becomes available.
 */
import posthog from 'posthog-js'

let loaded = false

export function loadAnalytics(setPostHogClient) {
  if (loaded) return
  loaded = true
  if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Analytics loading (GA, PostHog, Clarity)`)

  const gaId = (import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-L1W79PVGP6').toString().trim()
  const clarityId = (import.meta.env.VITE_CLARITY_PROJECT_ID || '').toString().trim()
  const posthogKey = (import.meta.env.VITE_POSTHOG_KEY || '').toString().trim()

  // Google Analytics
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', gaId)
  const ga = document.createElement('script')
  ga.async = true
  ga.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(ga)

  // PostHog
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'always',
      capture_pageview: true,
    })
    window.__posthog = posthog
    if (typeof setPostHogClient === 'function') setPostHogClient(posthog)
    if (window.__pendingWelcomeFlowPayload) {
      posthog.capture('welcome_flow_ready', window.__pendingWelcomeFlowPayload)
      window.__pendingWelcomeFlowPayload = null
    } else if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] PostHog ready`)
  }

  // Microsoft Clarity (skip in dev when project often only allows production domain → 400)
  if (clarityId && !import.meta.env.DEV) {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.clarity.ms/tag/${clarityId}`
    const f = document.getElementsByTagName('script')[0]
    if (f && f.parentNode) f.parentNode.insertBefore(s, f)
  }

  if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Analytics finished`)
}
