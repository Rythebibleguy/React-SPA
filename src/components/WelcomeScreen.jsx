import { useState, useEffect, useRef } from 'react'
import Lottie from 'lottie-react'
import { preloadQuizData } from '../utils/dataPreloader'
import './WelcomeScreen.css'

function WelcomeScreen({ onStart }) {
  const [showLoadingBtn, setShowLoadingBtn] = useState(false)
  const [showReadyBtn, setShowReadyBtn] = useState(false)
  const [showQuizNumber, setShowQuizNumber] = useState(false)
  const [animateTitle, setAnimateTitle] = useState(false)
  const [animateTagline, setAnimateTagline] = useState(false)
  const [showCredit, setShowCredit] = useState(false)
  const [quizDataReady, setQuizDataReady] = useState(false)
  const [animationData, setAnimationData] = useState(null)
  const lottieRef = useRef(null)

  useEffect(() => {
    // Load Lottie animation first (high priority - welcome screen needs this)
    fetch('/assets/animations/Book with bookmark.json')
      .then(res => res.json())
      .then(data => {
        setAnimationData(data)
        
        // Once Lottie is loaded, start preloading quiz data
        const { questionsPromise, statsPromise } = preloadQuizData()
        
        Promise.all([questionsPromise, statsPromise])
          .then(() => {
            setQuizDataReady(true)
          })
          .catch(err => {
            console.error('Error preloading data:', err)
            // Still allow quiz to start even if preload failed
            setQuizDataReady(true)
          })
      })
      .catch(err => console.error('Failed to load animation:', err))

    // Animation timeline
    const creditTimer = setTimeout(() => setShowCredit(true), 500)
    const titleTimer = setTimeout(() => {
      setAnimateTitle(true)
      setAnimateTagline(true)
    }, 700)
    const loadingBtnTimer = setTimeout(() => setShowLoadingBtn(true), 1000)

    // Pause animation at 2.667s
    const pauseTimer = setTimeout(() => {
      if (lottieRef.current) {
        lottieRef.current.pause()
      }
    }, 2667)

    return () => {
      clearTimeout(creditTimer)
      clearTimeout(titleTimer)
      clearTimeout(loadingBtnTimer)
      clearTimeout(pauseTimer)
    }
  }, [])
  useEffect(() => {
    // Switch to ready button when data is ready and timer has passed
    if (quizDataReady && showLoadingBtn) {
      setShowLoadingBtn(false)
      setShowReadyBtn(true)
      setShowQuizNumber(true)
    }
  }, [quizDataReady, showLoadingBtn])

  const handleStart = () => {
    if (onStart) {
      onStart()
    }
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__header">
        {animationData && (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={false}
            className="welcome-screen__header-icon"
          />
        )}
        <h1 className={`welcome-screen__header-title ${animateTitle ? 'welcome-screen__header-title--animate' : ''}`}>
          Daily Bible Quiz
        </h1>
        <p className={`welcome-screen__header-tagline ${animateTagline ? 'welcome-screen__header-tagline--animate' : ''}`}>
          Test your knowledge of scripture.
        </p>
      </div>

      <div className="welcome-screen__ready">
        {showLoadingBtn && (
          <button className="welcome-screen__loading-btn welcome-screen__loading-btn--visible">
            <span className="welcome-screen__loading-btn-text">Play</span>
            <div className="welcome-screen__loading-btn-shimmer"></div>
          </button>
        )}
        
        {showReadyBtn && (
          <>
            <button 
              className="welcome-screen__ready-btn"
              onClick={handleStart}
            >
              Play
            </button>
            {showQuizNumber && (
              <span className="welcome-screen__ready-date">
                Quiz #1
              </span>
            )}
          </>
        )}
      </div>

      <div className={`welcome-screen__credit ${showCredit ? 'visible' : ''}`}>
        <a href="https://rythebibleguy.com/" target="_blank" rel="noopener noreferrer">
          Made by Rythebibleguy
        </a>
      </div>
    </div>
  )
}

export default WelcomeScreen
