import { useState, useEffect } from 'react'
import './QuizTab.css'
import WelcomeScreen from './WelcomeScreen'
import QuizScreen from './QuizScreen'

function QuizTab({ isTransitioning, welcomeAnimated, setWelcomeAnimated }) {
  const [showWelcome, setShowWelcome] = useState(true)
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false)
  const [welcomeExiting, setWelcomeExiting] = useState(false)
  const [quizEntering, setQuizEntering] = useState(false)
  const [animationData, setAnimationData] = useState(null)
  const [lottieInstance, setLottieInstance] = useState(null)

  // Check sessionStorage on mount to restore state
  useEffect(() => {
    const savedQuizState = sessionStorage.getItem('quizState')
    
    // If quiz already started, skip welcome screen
    if (savedQuizState) {
      setShowWelcome(false)
    }
  }, [])

  // Load Lottie animation once on tab mount
  useEffect(() => {
    fetch('/assets/animations/Book with bookmark.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err))
  }, [])

  // Set welcomeAnimated when animation completes
  useEffect(() => {
    if (welcomeAnimationComplete) {
      sessionStorage.setItem('welcomeAnimated', 'true')
      setWelcomeAnimated(true)
    }
  }, [welcomeAnimationComplete, setWelcomeAnimated])

  // Set welcomeAnimated when user navigates away from quiz tab
  useEffect(() => {
    return () => {
      if (showWelcome && !welcomeAnimated) {
        sessionStorage.setItem('welcomeAnimated', 'true')
        setWelcomeAnimated(true)
      }
    }
  }, [showWelcome, welcomeAnimated, setWelcomeAnimated])

  const handleStartQuiz = () => {
    // Mark welcome as animated when user starts quiz
    sessionStorage.setItem('welcomeAnimated', 'true')
    setWelcomeAnimated(true)
    
    // Start exit animation
    setWelcomeExiting(true)
    
    // Wait for exit animation to complete
    setTimeout(() => {
      setShowWelcome(false)
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

  return (
    <div className={`quiz-tab ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
      {showWelcome ? (
        <WelcomeScreen 
          onStart={handleStartQuiz} 
          skipAnimations={welcomeAnimated}
          animationData={animationData}
          lottieInstance={lottieInstance}
          setLottieInstance={setLottieInstance}
          animationComplete={welcomeAnimationComplete}
          setAnimationComplete={setWelcomeAnimationComplete}
          isExiting={welcomeExiting}
        />
      ) : (
        <QuizScreen isEntering={quizEntering} />
      )}
    </div>
  )
}

export default QuizTab

