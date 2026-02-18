import { useState, useEffect } from 'react'
import './App.css'
import WelcomeScreen from './components/WelcomeScreen'
import QuizScreen from './components/QuizScreen'
import { useViewportUnits } from './hooks/useViewportUnits'
import { useAuth } from './contexts/AuthContext'
import { BASE_DATA_URL } from './config'

// Clear quiz state on page load (before any components mount)
sessionStorage.removeItem('quizState')
sessionStorage.removeItem('welcomeAnimated')

function App() {
  useViewportUnits()
  const { currentUser } = useAuth()
  const [showWelcome, setShowWelcome] = useState(true)
  const [welcomeExiting, setWelcomeExiting] = useState(false)
  const [welcomeAnimated, setWelcomeAnimated] = useState(() => sessionStorage.getItem('welcomeAnimated') === 'true')
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false)
  const [animationData, setAnimationData] = useState(null)
  const [statisticsAnimationData, setStatisticsAnimationData] = useState(null)
  const [lottieInstance, setLottieInstance] = useState(null)

  const handleWelcomeStart = () => {
    sessionStorage.setItem('welcomeAnimated', 'true')
    setWelcomeAnimated(true)
    setWelcomeExiting(true)
    setTimeout(() => {
      setShowWelcome(false)
      if (window.clarity) window.clarity('event', 'quiz_started')
    }, 250)
  }

  // Load Lottie animations once on app mount
  useEffect(() => {
    // Load Bible animation
    fetch(`${BASE_DATA_URL}/assets/animations/Book with bookmark.json`)
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => {/* Failed to load animation */})
    
    // Load Statistics animation for Stats modal guest content
    fetch(`${BASE_DATA_URL}/assets/animations/Statistics.json`)
      .then(res => res.json())
      .then(data => setStatisticsAnimationData(data))
      .catch(err => {/* Failed to load animation */})
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
    <>
      {showWelcome ? (
        <WelcomeScreen
          onStart={handleWelcomeStart}
          skipAnimations={welcomeAnimated}
          animationData={animationData}
          lottieInstance={lottieInstance}
          setLottieInstance={setLottieInstance}
          animationComplete={welcomeAnimationComplete}
          setAnimationComplete={setWelcomeAnimationComplete}
          isExiting={welcomeExiting}
        />
      ) : (
        <>
          <QuizScreen
            statisticsAnimationData={statisticsAnimationData}
          />
        </>
      )}
    </>
  )
}

export default App
