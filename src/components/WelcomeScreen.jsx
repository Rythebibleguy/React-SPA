import { useState, useEffect, useRef } from 'react'
import Lottie from 'lottie-react'
import { preloadQuizData } from '../utils/dataPreloader'
import './WelcomeScreen.css'

function WelcomeScreen({ onStart, skipAnimations = false, animationData, lottieInstance, setLottieInstance, animationComplete, setAnimationComplete }) {
  const [showLoadingBtn, setShowLoadingBtn] = useState(false)
  const [showReadyBtn, setShowReadyBtn] = useState(skipAnimations)
  const [showQuizNumber, setShowQuizNumber] = useState(skipAnimations)
  const [animateTitle, setAnimateTitle] = useState(skipAnimations)
  const [animateTagline, setAnimateTagline] = useState(skipAnimations)
  const [showCredit, setShowCredit] = useState(skipAnimations)
  const [quizDataReady, setQuizDataReady] = useState(false)
  const lottieRef = useRef(null)

  // Preload quiz data on mount
  useEffect(() => {
    const { questionsPromise, statsPromise } = preloadQuizData()
    
    Promise.all([questionsPromise, statsPromise])
      .then(() => {
        setQuizDataReady(true)
      })
      .catch(err => {
        console.error('Error preloading data:', err)
        setQuizDataReady(true)
      })
  }, [])

  // Handle Lottie animation state
  useEffect(() => {
    if (!lottieInstance || !animationData) return

    if (skipAnimations || animationComplete) {
      // Convert 2667ms to frames: 2667ms / 1000 * fps
      const fps = animationData.fr || 30
      const pauseFrame = Math.floor((2667 / 1000) * fps)
      lottieInstance.goToAndStop(pauseFrame, true)
    }
  }, [skipAnimations, animationData, lottieInstance, animationComplete])

  // Run animations only if not skipping
  useEffect(() => {
    if (skipAnimations) return

    // Run animation sequence
    const creditTimer = setTimeout(() => setShowCredit(true), 500)
    const titleTimer = setTimeout(() => {
      setAnimateTitle(true)
      setAnimateTagline(true)
    }, 700)
    const loadingBtnTimer = setTimeout(() => setShowLoadingBtn(true), 1000)
    const pauseTimer = setTimeout(() => {
      if (lottieInstance) {
        lottieInstance.pause()
        setAnimationComplete(true)
      }
    }, 2667)

    return () => {
      clearTimeout(creditTimer)
      clearTimeout(titleTimer)
      clearTimeout(loadingBtnTimer)
      clearTimeout(pauseTimer)
    }
  }, [skipAnimations, lottieInstance, setAnimationComplete])
  useEffect(() => {
    // Switch to ready button when data is ready and timer has passed
    if (quizDataReady && showLoadingBtn) {
      setShowLoadingBtn(false)
      setShowReadyBtn(true)
      setShowQuizNumber(true)
    }
  }, [quizDataReady, showLoadingBtn])

  const getTextClass = (isAnimating) => {
    if (skipAnimations && isAnimating) return 'show-immediate'
    if (!skipAnimations && isAnimating) return 'welcome-screen__header-title--animate'
    return ''
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__content">
        <div className="welcome-screen__header">
          {animationData && (
            <Lottie
              lottieRef={lottieRef}
              animationData={animationData}
              loop={false}
              autoplay={!skipAnimations}
              onDOMLoaded={() => {
                if (lottieRef.current) {
                  setLottieInstance(lottieRef.current)
                }
              }}
              className="welcome-screen__header-icon"
            />
          )}
          <h1 className={`welcome-screen__header-title ${getTextClass(animateTitle)}`}>
            Daily Bible Quiz
          </h1>
          <p className={`welcome-screen__header-tagline ${getTextClass(animateTagline)}`}>
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
                className={`welcome-screen__ready-btn ${skipAnimations ? 'show-immediate' : ''}`}
                onClick={onStart}
              >
                Play
              </button>
              {showQuizNumber && (
                <span className={`welcome-screen__ready-date ${skipAnimations ? 'show-immediate' : ''}`}>
                  Quiz #1
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="welcome-screen__footer">
        <div className={`welcome-screen__credit ${showCredit ? 'visible' : ''}`}>
          <a href="https://rythebibleguy.com/" target="_blank" rel="noopener noreferrer">
            Made by Rythebibleguy
          </a>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
