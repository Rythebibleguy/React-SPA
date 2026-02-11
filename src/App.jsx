import { useState, useEffect } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import WelcomeScreen from './components/WelcomeScreen'
import QuizScreen from './components/QuizScreen'
import FriendsScreen from './components/FriendsScreen'
import ProfileScreen from './components/ProfileScreen'
import { useViewportUnits } from './hooks/useViewportUnits'

function App() {
  useViewportUnits()
  const [showWelcome, setShowWelcome] = useState(true)
  const [welcomeShownBefore, setWelcomeShownBefore] = useState(false)
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false)
  const [welcomeExiting, setWelcomeExiting] = useState(false)
  const [currentScreen, setCurrentScreen] = useState('quiz') // 'quiz', 'friends', 'profile'
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [quizEntering, setQuizEntering] = useState(false)
  const [showBottomNav, setShowBottomNav] = useState(false)
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
    
    // Start bottom nav animation immediately
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

  const handleStartQuiz = () => {
    // Start exit animation
    setWelcomeExiting(true)
    
    // Wait for exit animation to complete
    setTimeout(() => {
      setShowWelcome(false)
      setWelcomeShownBefore(true)
      setCurrentScreen('quiz')
      setQuizEntering(true)
      
      // Reset entering state after animation completes (250ms cards + 500ms last dot delay + 300ms dot animation)
      setTimeout(() => {
        setQuizEntering(false)
      }, 1100)
      
      // Track quiz start in Clarity
      if (window.clarity) {
        window.clarity("event", "quiz_started")
      }
    }, 250)
  }

  const handleNavigation = (screen) => {
    if (screen === currentScreen) return
    
    setIsTransitioning(true)
    
    setTimeout(() => {
      if (!welcomeShownBefore && showWelcome) {
        setWelcomeShownBefore(true)
      }
      setCurrentScreen(screen)
      
      setTimeout(() => {
        setIsTransitioning(false)
      }, 50)
    }, 200)
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
          isExiting={welcomeExiting}
        />
      ) : (
        <div className={`screen-container ${isTransitioning ? 'fade-out' : quizEntering ? '' : 'fade-in'}`}>
          {currentScreen === 'quiz' && <QuizScreen isEntering={quizEntering} />}
          {currentScreen === 'friends' && <FriendsScreen />}
          {currentScreen === 'profile' && <ProfileScreen />}
        </div>
      )}
      <BottomNav currentScreen={currentScreen} onNavigate={handleNavigation} show={showBottomNav} />
    </>
  )
}

export default App
