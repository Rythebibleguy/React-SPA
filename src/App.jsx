import { useState, useEffect } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import QuizTab from './components/QuizTab'
import FriendsTab from './components/FriendsTab'
import ProfileTab from './components/ProfileTab'
import { useViewportUnits } from './hooks/useViewportUnits'

function App() {
  useViewportUnits()
  const [currentScreen, setCurrentScreen] = useState('quiz') // 'quiz', 'friends', 'profile'
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showBottomNav, setShowBottomNav] = useState(false)

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
      }, 50)
    }, 200)
  }

  return (
    <>
      {currentScreen === 'quiz' && <QuizTab isTransitioning={isTransitioning} />}
      {currentScreen === 'friends' && <FriendsTab isTransitioning={isTransitioning} />}
      {currentScreen === 'profile' && <ProfileTab isTransitioning={isTransitioning} />}
      <BottomNav currentScreen={currentScreen} onNavigate={handleNavigation} show={showBottomNav} />
    </>
  )
}

export default App
