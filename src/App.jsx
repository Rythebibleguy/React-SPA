import { useState, useEffect } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import QuizTab from './components/QuizTab'
import FriendsTab from './components/FriendsTab'
import ProfileTab from './components/ProfileTab'
import { useViewportUnits } from './hooks/useViewportUnits'

// Clear quiz state on page load (before any components mount)
sessionStorage.removeItem('quizState')
sessionStorage.removeItem('welcomeAnimated')

function App() {
  useViewportUnits()
  const [currentScreen, setCurrentScreen] = useState('quiz')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showBottomNav, setShowBottomNav] = useState(false)
  const [welcomeAnimated, setWelcomeAnimated] = useState(() => {
    return sessionStorage.getItem('welcomeAnimated') === 'true'
  })
  const [animationData, setAnimationData] = useState(null)
  const [lottieInstance, setLottieInstance] = useState(null)

  // Load Lottie animation once on app mount
  useEffect(() => {
    fetch('/assets/animations/Book with bookmark.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => {/* Failed to load animation */})
  }, [])

  // Start bottom nav animation immediately
  useEffect(() => {
    setShowBottomNav(true)
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

  const handleNavigation = (screen) => {
    if (screen === currentScreen) return
    
    setIsTransitioning(true)
    
    setTimeout(() => {
      setCurrentScreen(screen)
      
      setTimeout(() => {
        setIsTransitioning(false)
      }, 10)
    }, 100)
  }

  return (
    <>
      {currentScreen === 'quiz' && (
        <QuizTab 
          isTransitioning={isTransitioning} 
          welcomeAnimated={welcomeAnimated}
          setWelcomeAnimated={setWelcomeAnimated}
          animationData={animationData}
          lottieInstance={lottieInstance}
          setLottieInstance={setLottieInstance}
        />
      )}
      {currentScreen === 'friends' && <FriendsTab isTransitioning={isTransitioning} />}
      {currentScreen === 'profile' && <ProfileTab isTransitioning={isTransitioning} />}
      <BottomNav currentScreen={currentScreen} onNavigate={handleNavigation} show={showBottomNav} />
    </>
  )
}

export default App
