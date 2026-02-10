import { useState } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import WelcomeScreen from './components/WelcomeScreen'
import QuizView from './components/QuizView'
import { useViewportUnits } from './hooks/useViewportUnits'

function App() {
  useViewportUnits()
  const [showWelcome, setShowWelcome] = useState(true)

  const handleStartQuiz = () => {
    setShowWelcome(false)
  }

  return (
    <>
      {showWelcome ? (
        <WelcomeScreen onStart={handleStartQuiz} />
      ) : (
        <QuizView />
      )}
      <BottomNav />
    </>
  )
}

export default App
