import { useState } from 'react'
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
  const [currentScreen, setCurrentScreen] = useState('quiz') // 'quiz', 'friends', 'profile'

  const handleStartQuiz = () => {
    setShowWelcome(false)
    setCurrentScreen('quiz')
  }

  const handleNavigation = (screen) => {
    setShowWelcome(false)
    setCurrentScreen(screen)
  }

  return (
    <>
      {showWelcome ? (
        <WelcomeScreen onStart={handleStartQuiz} />
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
