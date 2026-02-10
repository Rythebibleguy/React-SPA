import { useState, useRef, useEffect } from 'react'
import { ref, runTransaction } from 'firebase/database'
import { db } from '../config/firebase'
import './QuizView.css'
import { useQuizData } from '../hooks/useQuizData'
import { useQuizStats } from '../hooks/useQuizStats'
import { getTodayString } from '../utils/csvParser'
import ResultsModal from './ResultsModal'

const difficultyLabels = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  impossible: 'Impossible'
}

function QuizView() {
  const { questions, loading, error } = useQuizData()
  const { stats, loading: statsLoading } = useQuizStats()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState([]) // Store answer IDs
  const [answerPercentages, setAnswerPercentages] = useState({}) // Store percentages per question {qIndex: {answerId: percentage}}
  const [showReference, setShowReference] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const containerRef = useRef(null)
  const cardsRef = useRef([])
  const hasSubmittedRef = useRef(false)

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

    try {
      // Batch write all answers
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
    } catch (error) {
      console.error('Error submitting quiz results:', error)
      // Continue to show results even if Firebase write fails
    }
  }

  // Check if all questions are answered and show results modal
  useEffect(() => {
    if (questions.length === 4 && selectedAnswers.length === 4 && !selectedAnswers.includes(undefined) && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true
      
      // Submit results to Firebase first
      submitQuizResults().then(() => {
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

  const handleShareChallenge = () => {
    // TODO: Implement share functionality
    console.log('Share challenge clicked')
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

  if (loading || statsLoading) {
    return (
      <div className="quiz-view">
        <div className="quiz-view__loading">Loading quiz...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="quiz-view">
        <div className="quiz-view__error">Error: {error}</div>
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="quiz-view">
        <div className="quiz-view__loading">No questions available for today</div>
      </div>
    )
  }

  return (
    <div className="quiz-view">
      <div className="quiz-view__question-area">
        <div className="quiz-view__cards" ref={containerRef}>
          {questions.map((question, qIndex) => {
          const isQuestionLocked = qIndex > 0 && selectedAnswers[qIndex - 1] === undefined
          const isAnswered = selectedAnswers[qIndex] !== undefined

          return (
            <div 
              key={qIndex} 
              className="quiz-view__card" 
              id={`block-q${qIndex}`}
              ref={(el) => (cardsRef.current[qIndex] = el)}
            >
              <div className={`quiz-view__card-flipper ${showReference && qIndex === currentIndex ? 'flipped' : ''}`}>
                <div className="quiz-view__card-inner">
                  {/* Front - Question */}
                  <div className={`quiz-view__card-front quiz-view__question ${question.difficulty} ${isQuestionLocked ? 'locked' : ''}`}>
                    <h3>{question.question}</h3>
                    <div className="quiz-view__options">
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
                            <div className="quiz-view__percent-bar" style={{ width: `${percentage}%` }}></div>
                            <span className="quiz-view__answer-text">
                              <span>{answer.text}</span>
                              <span className="quiz-view__percent-text">{percentage}%</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    {isQuestionLocked && (
                      <div className="quiz-view__lock-overlay">
                        <div className="quiz-view__lock-box">
                          <div className="quiz-view__lock-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          </div>
                          <div className="quiz-view__lock-text">Complete previous question<br />to unlock</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Back - Reference */}
                  <div className={`quiz-view__card-back quiz-view__question ${question.difficulty}`}>
                    <div className="quiz-view__reference-display">
                      <div className="quiz-view__reference-header">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                        </svg>
                        <h3>{question.referenceCitation}</h3>
                      </div>
                      <p className="quiz-view__reference-text">{question.referenceVerse}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      </div>

      {/* Action Buttons */}
      <div className={`quiz-view__actions ${selectedAnswers[currentIndex] !== undefined ? 'visible' : 'hidden'}`}>
        <div className="quiz-view__actions-buttons">
            <button className="quiz-view__prev-button" onClick={handlePrev} disabled={currentIndex === 0}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>Prev</span>
            </button>
            <button className="quiz-view__reference-button" onClick={handleToggleReference}>
              {!showReference ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                  </svg>
                  Show Reference
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  Back to Question
                </>
              )}
            </button>
            <button className="quiz-view__next-button" onClick={handleNext} disabled={currentIndex === questions.length - 1}>
              <span>Next</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

      {/* Difficulty Dots */}
      <div className="quiz-view__difficulty-dots">
        {['easy', 'medium', 'hard', 'impossible'].map((difficulty, index) => {
          const question = questions[index]
          return (
            <span
              key={difficulty}
              className={`quiz-view__difficulty-dot quiz-view__difficulty-dot--${difficulty} ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
            >
              <span className="quiz-view__difficulty-dot-text">{difficultyLabels[difficulty]}</span>
            </span>
          )
        })}
      </div>

      {/* Results Modal */}
      {showResultsModal && (
        <ResultsModal 
          score={calculateScore()} 
          total={questions.length}
          stats={stats}
          onClose={handleCloseResults}
          onShare={handleShareChallenge}
        />
      )}
    </div>
  )
}

export default QuizView
