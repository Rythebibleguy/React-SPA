import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { Lock, Book, ChevronLeft, List, ChevronRight, BarChart2, UserCircle, Settings } from 'lucide-react'
import { ref, runTransaction } from 'firebase/database'
import { db } from '../config/firebase'
import './QuizScreen.css'
import { useQuizData } from '../hooks/useQuizData'
import { useQuizStats } from '../hooks/useQuizStats'
import { useAuth } from '../contexts/AuthContext'
import { getTodayString } from '../utils/csvParser'
import { BASE_DATA_URL } from '../config'

const StatsModal = lazy(() => import('./StatsModal'))
const GuestModal = lazy(() => import('./GuestModal'))
const ProfileModal = lazy(() => import('./ProfileModal'))
const SettingsModal = lazy(() => import('./SettingsModal'))
const ResultsModal = lazy(() => import('./ResultsModal'))

const difficultyLabels = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  impossible: 'Impossible'
}

function QuizScreen() {
  const { questions, loading, error } = useQuizData()
  const { stats, loading: statsLoading } = useQuizStats()
  const { currentUser, completeQuiz, userProfile, updateUserProfile } = useAuth()

  const [quizEntering, setQuizEntering] = useState(false)
  const [headerModal, setHeaderModal] = useState(null)
  const [statisticsAnimationData, setStatisticsAnimationData] = useState(null)

  useEffect(() => {
    setQuizEntering(true)
    const t = setTimeout(() => setQuizEntering(false), 1100)
    return () => clearTimeout(t)
  }, [])

  // Prepare non-critical quiz components: modal chunks + Statistics Lottie for GuestModal (runs when idle after mount)
  useEffect(() => {
    const preload = () => {
      import('./StatsModal')
      import('./GuestModal')
      import('./ProfileModal')
      import('./SettingsModal')
      import('./ResultsModal')
      fetch(`${BASE_DATA_URL}/assets/animations/Statistics.json`)
        .then(res => res.json())
        .then(data => setStatisticsAnimationData(data))
        .catch(() => {})
    }
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(preload, { timeout: 2000 })
      return () => cancelIdleCallback(id)
    }
    const t = setTimeout(preload, 500)
    return () => clearTimeout(t)
  }, [])

  const closeHeaderModal = () => setHeaderModal(null)

  
  // Load saved state from user's history if they completed today's quiz (logged-in only)
  const loadSavedState = () => {
    try {
      if (userProfile?.history) {
        const todayString = getTodayString()
        const todayEntry = userProfile.history.find(entry => entry.date === todayString)
        if (todayEntry?.answers) {
          return {
            currentIndex: 0,
            selectedAnswers: todayEntry.answers,
            answerPercentages: {},
            hasSubmitted: true
          }
        }
      }
      return null
    } catch (e) {
      return null
    }
  }
  
  const savedState = loadSavedState()
  
  const [currentIndex, setCurrentIndex] = useState(savedState?.currentIndex ?? 0)
  const [selectedAnswers, setSelectedAnswers] = useState(savedState?.selectedAnswers ?? [])
  const [answerPercentages, setAnswerPercentages] = useState(savedState?.answerPercentages ?? {})
  const [showReference, setShowReference] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const containerRef = useRef(null)
  const cardsRef = useRef([])
  const hasSubmittedRef = useRef(savedState?.hasSubmitted ?? false)
  const quizStartTimeRef = useRef(null)

  // Start timing when component first mounts (quiz becomes visible)
  useEffect(() => {
    if (!quizStartTimeRef.current) {
      quizStartTimeRef.current = Date.now()
    }
  }, [])

  // Auto-open results modal when navigating back to quiz after completion
  useEffect(() => {
    const isQuizComplete = questions.length === 4 && selectedAnswers.length === 4 && !selectedAnswers.includes(undefined)
    // Only auto-open if quiz was already submitted (navigating back), not during first completion
    if (isQuizComplete && hasSubmittedRef.current) {
      setTimeout(() => {
        setShowResultsModal(true)
      }, 100)
    }
  }, [questions.length, selectedAnswers])

  // Calculate answer percentages for pre-loaded answers (when user views completed quiz)
  useEffect(() => {
    // Only run if we loaded from history (hasSubmitted but no percentages yet)
    if (!hasSubmittedRef.current) return
    if (!stats || statsLoading) return
    if (!questions.length || !selectedAnswers.length) return
    if (Object.keys(answerPercentages).length > 0) return // Already have percentages
    
    // Calculate percentages for each answered question
    const newPercentages = {}
    
    selectedAnswers.forEach((answerId, qIndex) => {
      if (answerId === undefined) return
      
      const question = questions[qIndex]
      if (!question) return
      
      const questionStats = stats[`q${qIndex}`] || {}
      
      // Calculate total votes for this question
      let totalVotes = 0
      Object.values(questionStats).forEach(count => totalVotes += count)
      
      // Calculate percentages for all answers in this question
      const percentages = {}
      question.answers.forEach(answer => {
        const count = questionStats[answer.id] || 0
        const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
        percentages[answer.id] = percentage
      })
      
      newPercentages[qIndex] = percentages
    })
    
    setAnswerPercentages(newPercentages)
  }, [stats, statsLoading, questions, selectedAnswers, hasSubmittedRef.current])

  // Restore scroll position on mount
  useEffect(() => {
    if (questions.length > 0 && containerRef.current) {
      // Scroll to saved index without animation
      const targetCard = cardsRef.current[currentIndex]
      if (targetCard) {
        containerRef.current.scrollLeft = targetCard.offsetLeft
      }
    }
  }, [questions.length])

  // Unified scroll animation function
  const scrollToIndex = (index) => {
    if (!containerRef.current || !cardsRef.current[index]) return
    
    const container = containerRef.current
    const targetCard = cardsRef.current[index]
    
    // Calculate target scroll position
    const targetLeft = targetCard.offsetLeft
    const startLeft = container.scrollLeft
    const distance = targetLeft - startLeft
    const duration = 300
    
    let startTime = null
    
    const animateScroll = (currentTime) => {
      if (startTime === null) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      container.scrollLeft = startLeft + (distance * easeOut)
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      }
    }
    
    requestAnimationFrame(animateScroll)
  }

  // Navigate to index (used by buttons, dots, swipes)
  const navigateToIndex = (index) => {
    if (index < 0 || index >= questions.length) return
    setCurrentIndex(index)
    scrollToIndex(index)
  }

  // Detect swipe gestures
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let startX = 0
    let isDragging = false
    let hasTriggered = false

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX
      isDragging = true
      hasTriggered = false
    }

    const handleTouchMove = (e) => {
      if (!isDragging || hasTriggered) return
      
      const currentX = e.touches[0].clientX
      const deltaX = currentX - startX
      
      // Trigger navigation as soon as we detect 50px swipe
      if (Math.abs(deltaX) > 50) {
        hasTriggered = true
        isDragging = false
        
        if (deltaX > 0) {
          navigateToIndex(currentIndex - 1)
        } else {
          navigateToIndex(currentIndex + 1)
        }
        setShowReference(false)
      }
    }

    const handleTouchEnd = (e) => {
      isDragging = false
      hasTriggered = false
    }

    const handleMouseDown = (e) => {
      startX = e.clientX
      isDragging = true
      hasTriggered = false
      e.preventDefault()
    }

    const handleMouseMove = (e) => {
      if (!isDragging || hasTriggered) return
      
      const currentX = e.clientX
      const deltaX = currentX - startX
      
      // Trigger navigation as soon as we detect 50px swipe
      if (Math.abs(deltaX) > 50) {
        hasTriggered = true
        isDragging = false
        
        if (deltaX > 0) {
          navigateToIndex(currentIndex - 1)
        } else {
          navigateToIndex(currentIndex + 1)
        }
        setShowReference(false)
      }
    }

    const handleMouseUp = (e) => {
      isDragging = false
      hasTriggered = false
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseup', handleMouseUp)
    }
  }, [currentIndex, questions.length])

  // Submit all answers and score to Firebase when quiz is complete
  const submitQuizResults = async () => {
    const todayString = getTodayString()
    const score = calculateScore()
    const quizEndTime = Date.now()
    const duration = quizStartTimeRef.current ? Math.floor((quizEndTime - quizStartTimeRef.current) / 1000) : null

    try {
      // Submit global quiz stats first (existing logic)
      const promises = selectedAnswers.map((answerId, qIndex) => {
        const answerRef = ref(db, `quiz_stats/${todayString}/q${qIndex}/${answerId}`)
        return runTransaction(answerRef, (currentCount) => {
          return (currentCount || 0) + 1
        })
      })

      // Also update score distribution
      const scoreRef = ref(db, `quiz_stats/${todayString}/scores/${score}`)
      promises.push(
        runTransaction(scoreRef, (currentCount) => {
          return (currentCount || 0) + 1
        })
      )

      await Promise.all(promises)
      
      // Complete quiz profile update if user is logged in
      if (currentUser) {
        const result = await completeQuiz(score, 4, duration, selectedAnswers)
        if (!result.success) {
          // Handle error silently, local state already updated
        }
      }
      
    } catch (error) {
      // Continue to show results even if Firebase write fails
    }
  }

  // Check if all questions are answered and show results modal
  useEffect(() => {
    if (questions.length === 4 && selectedAnswers.length === 4 && !selectedAnswers.includes(undefined) && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true
      
      // Save updated hasSubmitted status
      // Submit results to Firebase first
      submitQuizResults().then(() => {
        // Track quiz completion
        if (window.clarity) {
          window.clarity("event", "quiz_completed")
        }
        
        // Small delay for better UX
        setTimeout(() => {
          setShowResultsModal(true)
        }, 800)
      })
    }
  }, [selectedAnswers, questions.length])

  const handleAnswerSelect = (questionIndex, answerId) => {
    if (selectedAnswers[questionIndex] !== undefined) return

    const newSelectedAnswers = [...selectedAnswers]
    newSelectedAnswers[questionIndex] = answerId
    setSelectedAnswers(newSelectedAnswers)

    // Get current stats for this question or initialize empty object
    const questionStats = stats?.[`q${questionIndex}`] || {}
    
    // Calculate percentages using existing stats only (don't include user's answer yet)
    let totalVotes = 0
    Object.values(questionStats).forEach(count => totalVotes += count)

    // Calculate percentages for all answers (using answer IDs)
    const question = questions[questionIndex]
    const percentages = {}
    
    question.answers.forEach(answer => {
      const count = questionStats[answer.id] || 0
      const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
      percentages[answer.id] = percentage
    })

    setAnswerPercentages(prev => ({
      ...prev,
      [questionIndex]: percentages
    }))
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      navigateToIndex(currentIndex - 1)
      setShowReference(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      navigateToIndex(currentIndex + 1)
      setShowReference(false)
    }
  }

  const handleToggleReference = () => {
    setShowReference(!showReference)
  }

  const handleDotClick = (index) => {
    navigateToIndex(index)
    setShowReference(false)
  }

  const handleCloseResults = () => {
    setShowResultsModal(false)
  }

  const calculateScore = () => {
    if (!questions || questions.length === 0) return 0
    let correct = 0
    selectedAnswers.forEach((answerId, qIndex) => {
      const question = questions[qIndex]
      const answer = question?.answers.find(a => a.id === answerId)
      if (answer?.isCorrect) correct++
    })
    return correct
  }

  const isQuizComplete = questions.length === 4 && selectedAnswers.length === 4 && !selectedAnswers.includes(undefined)
  const hasQuestions = questions && questions.length > 0

  return (
    <>
      <div className="quiz-screen">
        <header className="quiz-screen__header">
          <h1 className="quiz-screen__header-title">Daily Bible Quiz</h1>
          <div className="quiz-screen__header-actions">
            <button type="button" className="quiz-screen__header-icon-btn" onClick={() => setHeaderModal('stats')} aria-label="Stats">
              <BarChart2 className="quiz-screen__header-icon" aria-hidden />
            </button>
            <button type="button" className="quiz-screen__header-icon-btn" onClick={() => setHeaderModal('profile')} aria-label="Profile">
              <UserCircle className="quiz-screen__header-icon" aria-hidden />
            </button>
            <button type="button" className="quiz-screen__header-icon-btn" onClick={() => setHeaderModal('settings')} aria-label="Settings">
              <Settings className="quiz-screen__header-icon" aria-hidden />
            </button>
          </div>
        </header>
        {!hasQuestions ? null : (
          <>
      <div className="quiz-screen__content">
        <div className="quiz-screen__actions-counter-buffer">
          {isQuizComplete && (
            <button type="button" className="quiz-screen__show-results-btn" onClick={() => setShowResultsModal(true)}>
              Show Results
            </button>
          )}
        </div>
        <div className={`quiz-screen__cards ${quizEntering ? 'entering' : ''}`} ref={containerRef}>
          {questions.map((question, qIndex) => {
          const isQuestionLocked = qIndex > 0 && selectedAnswers[qIndex - 1] === undefined
          const isAnswered = selectedAnswers[qIndex] !== undefined

          return (
            <div 
              key={qIndex} 
              className="quiz-screen__card" 
              id={`block-q${qIndex}`}
              ref={(el) => (cardsRef.current[qIndex] = el)}
            >
              <div className={`quiz-screen__card-flipper ${showReference && qIndex === currentIndex ? 'flipped' : ''}`}>
                <div className="quiz-screen__card-inner">
                  {/* Front - Question */}
                  <div className={`quiz-screen__card-front quiz-screen__question ${question.difficulty} ${isQuestionLocked ? 'locked' : ''}`}>
                    <h3>{question.question}</h3>
                    <div className="quiz-screen__options">
                      {question.answers.map((answer, aIndex) => {
                        const isSelected = selectedAnswers[qIndex] === answer.id
                        const showResult = isAnswered
                        const percentages = answerPercentages[qIndex] || {}
                        const percentage = percentages[answer.id] || 0

                        return (
                          <label
                            key={aIndex}
                            className={`
                              ${isSelected ? 'selected' : ''}
                              ${showResult && answer.isCorrect ? 'correct' : ''}
                              ${showResult && isSelected && !answer.isCorrect ? 'wrong' : ''}
                              ${Object.keys(percentages).length > 0 ? 'answered' : ''}
                            `}
                          >
                            <input
                              type="radio"
                              name={`q${qIndex}`}
                              checked={isSelected}
                              onChange={() => handleAnswerSelect(qIndex, answer.id)}
                              disabled={isAnswered || isQuestionLocked}
                            />
                            <div className="quiz-screen__percent-bar" style={{ width: `${percentage}%` }}></div>
                            <span className="quiz-screen__answer-text">
                              <span>{answer.text}</span>
                              <span className="quiz-screen__percent-text">{percentage}%</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    {isQuestionLocked && (
                      <div className="quiz-screen__lock-overlay">
                        <div className="quiz-screen__lock-box">
                          <div className="quiz-screen__lock-icon">
                            <Lock size={20} color="var(--border-strong)" />
                          </div>
                          <div className="quiz-screen__lock-text">Complete previous question<br />to unlock</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Back - Reference */}
                  <div className={`quiz-screen__card-back quiz-screen__question ${question.difficulty}`}>
                    <div className="quiz-screen__reference-display">
                      <div className="quiz-screen__reference-header">
                        <Book size={20} />
                        <h3>{question.referenceCitation}</h3>
                      </div>
                      <p className="quiz-screen__reference-text">{question.referenceVerse}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        </div>

        {/* Action Buttons */}
        <div className={`quiz-screen__actions ${quizEntering ? 'entering' : ''}`}>
        <div className="quiz-screen__actions-buttons">
            <button className={`quiz-screen__prev-button ${currentIndex === 0 || selectedAnswers[currentIndex] === undefined ? 'hidden' : ''}`} onClick={handlePrev}>
              <ChevronLeft size={20} />
              <span>Prev</span>
            </button>
            <button className={`quiz-screen__reference-button ${selectedAnswers[currentIndex] === undefined ? 'hidden' : ''}`} onClick={handleToggleReference}>
              {!showReference ? (
                <>
                  <Book size={20} />
                  Show Reference
                </>
              ) : (
                <>
                  <List size={20} />
                  Back to Question
                </>
              )}
            </button>
            <button className={`quiz-screen__next-button ${currentIndex === questions.length - 1 || selectedAnswers[currentIndex] === undefined ? 'hidden' : ''}`} onClick={handleNext}>
              <span>Next</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Results Modal (lazy; own Suspense so quiz content doesn't disappear while loading) */}
      {showResultsModal && (
        <Suspense fallback={null}>
          <ResultsModal 
          score={calculateScore()} 
          total={questions.length}
          questionResults={questions.map((q, i) => {
            const answerId = selectedAnswers[i]
            const answer = q?.answers?.find(a => a.id === answerId)
            return !!answer?.isCorrect
          })}
          stats={stats}
          onClose={handleCloseResults}
        />
        </Suspense>
      )}

      {/* Difficulty Dots */}
      <div className={`quiz-screen__difficulty-dots ${quizEntering ? 'entering' : ''}`}>
        {['easy', 'medium', 'hard', 'impossible'].map((difficulty, index) => {
          const question = questions[index]
          return (
            <span
              key={difficulty}
              className={`quiz-screen__difficulty-dot quiz-screen__difficulty-dot--${difficulty} ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
            >
              <span className="quiz-screen__difficulty-dot-text">{difficultyLabels[difficulty]}</span>
            </span>
          )
        })}
      </div>
        </>
        )}
      </div>

      <Suspense fallback={null}>
      {headerModal === 'stats' && (
        currentUser ? (
          <StatsModal
            isOpen
            onClose={closeHeaderModal}
            onCloseStart={null}
            title="Stats"
            onOpenProfile={() => setHeaderModal('profile')}
          />
        ) : (
          <GuestModal
            isOpen
            onClose={closeHeaderModal}
            onCloseStart={null}
            title="Stats"
            variant="profile"
            animationData={statisticsAnimationData}
          />
        )
      )}

      {headerModal === 'settings' && (
        <SettingsModal
          isOpen
          onClose={closeHeaderModal}
          onCloseStart={null}
        />
      )}

      {headerModal === 'profile' && (
        currentUser ? (
          <ProfileModal
            isOpen
            onClose={closeHeaderModal}
            onCloseStart={null}
            userProfile={userProfile}
            currentUser={currentUser}
            updateUserProfile={updateUserProfile}
          />
        ) : (
          <GuestModal
            isOpen
            onClose={closeHeaderModal}
            onCloseStart={null}
            title="Profile"
            variant="profile"
            animationData={statisticsAnimationData}
          />
        )
      )}
      </Suspense>
    </>
  )
}

export default QuizScreen

