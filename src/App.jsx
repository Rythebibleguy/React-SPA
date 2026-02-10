import { useState } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import WelcomeScreen from './components/WelcomeScreen'
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
        <>
          <h1>Daily Bible Quiz</h1>
          <p>Ready to build your quiz!</p>
        </>
      )}
      <BottomNav />
    </>
  )
}

export default App
