import { useState, useEffect, useRef } from 'react'
import Lottie from 'lottie-react'
import { getQuestionsPromise, getStatsPromise } from '../utils/dataPreloader'
import { useAuth } from '../contexts/AuthContext'
import './WelcomeScreen.css'

function WelcomeScreen({ onStart, animationData, backgroundFetchesStarted, lottieInstance, setLottieInstance, isExiting = false }) {
  const { currentUser, profileLoaded } = useAuth()
  const [showLoadingBtn, setShowLoadingBtn] = useState(false)
  const [showReadyBtn, setShowReadyBtn] = useState(false)
  const [showQuizNumber, setShowQuizNumber] = useState(false)
  const [animateTitle, setAnimateTitle] = useState(false)
  const [animateTagline, setAnimateTagline] = useState(false)
  const [showCredit, setShowCredit] = useState(false)
  const [quizDataReady, setQuizDataReady] = useState(false)
  const lottieRef = useRef(null)

  // Wait for quiz data (App starts preload only after Lottie finishes; promises exist once background fetches have started)
  useEffect(() => {
    if (!animationData && !backgroundFetchesStarted) return
    const questionsPromise = getQuestionsPromise()
    const statsPromise = getStatsPromise()
    if (!questionsPromise || !statsPromise) return
    Promise.all([questionsPromise, statsPromise])
      .then(() => setQuizDataReady(true))
      .catch(() => setQuizDataReady(true))
  }, [animationData, backgroundFetchesStarted])

  // Run Lottie and sequence when Lottie is ready
  useEffect(() => {
    if (!lottieInstance) return
    window.__perfLog?.('lottie animation begins')
    lottieInstance.play()
    const creditTimer = setTimeout(() => setShowCredit(true), 500)
    const titleTimer = setTimeout(() => {
      setAnimateTitle(true)
      setAnimateTagline(true)
    }, 500)
    const loadingBtnTimer = setTimeout(() => {
      window.__perfLog?.('loading button shown')
      setShowLoadingBtn(true)
    }, 1000)
    const pauseTimer = setTimeout(() => {
      if (lottieInstance && animationData) {
        const fps = animationData.fr || 30
        const pauseFrame = Math.floor((2667 / 1000) * fps)
        lottieInstance.goToAndStop(pauseFrame, true)
      }
    }, 2667)
    return () => {
      clearTimeout(creditTimer)
      clearTimeout(titleTimer)
      clearTimeout(loadingBtnTimer)
      clearTimeout(pauseTimer)
    }
  }, [lottieInstance, animationData])

  // Switch to clickable Play when preload is done, loading button has been shown, and (guest or profile loaded)
  const authReady = !currentUser || profileLoaded
  useEffect(() => {
    if (quizDataReady && showLoadingBtn && authReady) {
      window.__perfLog?.('play button shown')
      setShowLoadingBtn(false)
      setShowReadyBtn(true)
      setShowQuizNumber(true)
    }
  }, [quizDataReady, showLoadingBtn, authReady])

  const getTextClass = (isAnimating, variant = 'title') => {
    if (!isAnimating) return ''
    return variant === 'tagline' ? 'welcome-screen__header-tagline--animate' : 'welcome-screen__header-title--animate'
  }

  return (
    <div className="welcome-screen">
      <div className={`welcome-screen__content ${isExiting ? 'exiting' : ''}`}>
        <div className="welcome-screen__header">
          {animationData && (
            <Lottie
              lottieRef={lottieRef}
              animationData={animationData}
              loop={false}
              autoplay={false}
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
          <p className={`welcome-screen__header-tagline ${getTextClass(animateTagline, 'tagline')}`}>
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
              <button className="welcome-screen__ready-btn" onClick={onStart}>
                Play
              </button>
              {showQuizNumber && (
                <span className="welcome-screen__ready-date">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="welcome-screen__footer">
        <div className={`welcome-screen__credit ${showCredit ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}>
          <a href="https://rythebibleguy.com/" target="_blank" rel="noopener">
            Made by Rythebibleguy
          </a>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
