import { useState, useEffect } from 'react'
import './App.css'
import WelcomeScreen from './components/WelcomeScreen'
import QuizScreen from './components/QuizScreen'
import { useViewportUnits } from './hooks/useViewportUnits'
import { useAuth } from './contexts/AuthContext'
import { BASE_DATA_URL } from './config'
import { preloadQuizData } from './utils/dataPreloader'
import { usePostHog } from 'posthog-js/react'

function App({ onPlayReady }) {
  useViewportUnits()
  const { currentUser } = useAuth()
  const posthog = usePostHog()
  const [showWelcome, setShowWelcome] = useState(true)
  const [welcomeExiting, setWelcomeExiting] = useState(false)
  const [animationData, setAnimationData] = useState(null)
  const [lottieInstance, setLottieInstance] = useState(null)
  const [backgroundFetchesStarted, setBackgroundFetchesStarted] = useState(false)

  const handleWelcomeStart = () => {
    setWelcomeExiting(true)
    posthog?.capture('quiz_started')
    setTimeout(() => {
      setShowWelcome(false)
      if (window.clarity) window.clarity('event', 'quiz_started')
    }, 250)
  }

  // Load Bible Lottie first (critical for visual chain); only then start other fetches so Lottie gets full network
  useEffect(() => {
    if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Lottie loading`)
    fetch(`${BASE_DATA_URL}/assets/animations/Book with bookmark.json`)
      .then(res => res.json())
      .then(data => {
        setAnimationData(data)
        setBackgroundFetchesStarted(true)
        if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Lottie ready`)
        preloadQuizData()
      })
      .catch(() => {
        setBackgroundFetchesStarted(true)
        preloadQuizData()
      })
  }, [])

  // Prevent pinch zoom on mobile
  useEffect(() => {
    const preventPinchZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    const preventGesture = (e) => {
      e.preventDefault()
    }

    document.addEventListener('touchstart', preventPinchZoom, { passive: false })
    document.addEventListener('gesturestart', preventGesture, { passive: false })

    return () => {
      document.removeEventListener('touchstart', preventPinchZoom)
      document.removeEventListener('gesturestart', preventGesture)
    }
  }, [])

  return (
    <main>
      {showWelcome ? (
        <WelcomeScreen
          onStart={handleWelcomeStart}
          onPlayReady={onPlayReady}
          animationData={animationData}
          backgroundFetchesStarted={backgroundFetchesStarted}
          lottieInstance={lottieInstance}
          setLottieInstance={setLottieInstance}
          isExiting={welcomeExiting}
        />
      ) : (
        <>
          <QuizScreen />
        </>
      )}
    </main>
  )
}

export default App
