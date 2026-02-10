import { useState, useEffect } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import WelcomeScreen from './components/WelcomeScreen'
import QuizView from './components/QuizView'
import Friends from './components/Friends'
import Profile from './components/Profile'
import { useViewportUnits } from './hooks/useViewportUnits'

function App() {
  useViewportUnits()
  const [showWelcome, setShowWelcome] = useState(true)
  const [welcomeShownBefore, setWelcomeShownBefore] = useState(false)
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false)
  const [currentScreen, setCurrentScreen] = useState('quiz') // 'quiz', 'friends', 'profile'
  const [animationData, setAnimationData] = useState(null)
  const [lottieInstance, setLottieInstance] = useState(null)

  // Clear quiz state on fresh page load
  useEffect(() => {
    sessionStorage.removeItem('quizState')
  }, [])

  // Load Lottie animation once on app mount
  useEffect(() => {
    fetch('/assets/animations/Book with bookmark.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err))
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

  const handleStartQuiz = () => {
    setShowWelcome(false)
    setWelcomeShownBefore(true)
    setCurrentScreen('quiz')
  }

  const handleNavigation = (screen) => {
    if (!welcomeShownBefore && showWelcome) {
      setWelcomeShownBefore(true)
    }
    setCurrentScreen(screen)
  }

  return (
    <>
      {showWelcome && currentScreen === 'quiz' ? (
        <WelcomeScreen 
          onStart={handleStartQuiz} 
          skipAnimations={welcomeShownBefore}
          animationData={animationData}
          lottieInstance={lottieInstance}
          setLottieInstance={setLottieInstance}
          animationComplete={welcomeAnimationComplete}
          setAnimationComplete={setWelcomeAnimationComplete}
        />
      ) : (
        <>
          {currentScreen === 'quiz' && <QuizView />}
          {currentScreen === 'friends' && <Friends />}
          {currentScreen === 'profile' && <Profile />}
        </>
      )}
      <BottomNav currentScreen={currentScreen} onNavigate={handleNavigation} />
    </>
  )
}

export default App
