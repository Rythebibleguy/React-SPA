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

  // Load Lottie animation once on app mount
  useEffect(() => {
    fetch('/assets/animations/Book with bookmark.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err))
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
