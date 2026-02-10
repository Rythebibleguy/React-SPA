import { useState, useRef, useEffect } from 'react'
import './QuizView.css'

// Mock quiz data for now
const mockQuestions = [
  {
    difficulty: 'easy',
    question: 'Who was the first man created by God?',
    answers: [
      { text: 'Adam', isCorrect: true, id: 0 },
      { text: 'Noah', isCorrect: false, id: 1 },
      { text: 'Moses', isCorrect: false, id: 2 },
      { text: 'Abraham', isCorrect: false, id: 3 }
    ],
    referenceCitation: 'Genesis 2:7',
    referenceVerse: 'Then the Lord God formed a man from the dust of the ground and breathed into his nostrils the breath of life, and the man became a living being.'
  },
  {
    difficulty: 'medium',
    question: 'How many days and nights did it rain during the flood?',
    answers: [
      { text: '40', isCorrect: true, id: 0 },
      { text: '7', isCorrect: false, id: 1 },
      { text: '100', isCorrect: false, id: 2 },
      { text: '30', isCorrect: false, id: 3 }
    ],
    referenceCitation: 'Genesis 7:12',
    referenceVerse: 'And rain fell on the earth forty days and forty nights.'
  },
  {
    difficulty: 'hard',
    question: 'What did Jacob give to Joseph that sparked jealousy from his siblings?',
    answers: [
      { text: 'A coat of many colors', isCorrect: true, id: 0 },
      { text: 'A flock of sheep', isCorrect: false, id: 1 },
      { text: 'A gold ring', isCorrect: false, id: 2 },
      { text: 'A staff', isCorrect: false, id: 3 }
    ],
    referenceCitation: 'Genesis 37:3',
    referenceVerse: 'Now Israel loved Joseph more than any of his other sons, because he had been born to him in his old age; and he made an ornate robe for him.'
  },
  {
    difficulty: 'impossible',
    question: 'In Ezekiel\'s vision, how many wings did each cherubim have?',
    answers: [
      { text: 'Four', isCorrect: true, id: 0 },
      { text: 'Two', isCorrect: false, id: 1 },
      { text: 'Six', isCorrect: false, id: 2 },
      { text: 'Eight', isCorrect: false, id: 3 }
    ],
    referenceCitation: 'Ezekiel 1:6',
    referenceVerse: 'Each of the cherubim had four faces and four wings.'
  }
]

const difficultyLabels = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  impossible: 'Impossible'
}

function QuizView() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState([])
  const [showReference, setShowReference] = useState(false)
  const containerRef = useRef(null)
  const cardsRef = useRef([])

  // Navigate programmatically (from buttons/dots) with scroll
  const navigateToIndex = (index) => {
    setCurrentIndex(index)
    if (containerRef.current) {
      const questionCard = cardsRef.current[index]
      if (questionCard) {
        questionCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
      }
    }
  }

  // Intersection Observer to detect swipe navigation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.75) {
            const index = cardsRef.current.findIndex((ref) => ref === entry.target)
            if (index !== -1 && index !== currentIndex) {
              setCurrentIndex(index)
              setShowReference(false)
            }
          }
        })
      },
      {
        root: containerRef.current,
        threshold: [0.5, 0.75, 1.0],
      }
    )

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card)
    })

    return () => observer.disconnect()
  }, [currentIndex])

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    const newSelectedAnswers = [...selectedAnswers]
    newSelectedAnswers[questionIndex] = answerIndex
    setSelectedAnswers(newSelectedAnswers)

    // Unlock next question if available
    if (questionIndex < mockQuestions.length - 1) {
      // Auto-advance after short delay
      setTimeout(() => {
        navigateToIndex(questionIndex + 1)
      }, 600)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      navigateToIndex(currentIndex - 1)
      setShowReference(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < mockQuestions.length - 1) {
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

  return (
    <div className="quiz-view">
      <div className="quiz-view__questions" ref={containerRef}>
        {mockQuestions.map((question, qIndex) => {
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
                        const isSelected = selectedAnswers[qIndex] === aIndex
                        const showResult = isAnswered

                        return (
                          <label
                            key={aIndex}
                            className={`
                              ${isSelected ? 'selected' : ''}
                              ${showResult && answer.isCorrect ? 'correct' : ''}
                              ${showResult && isSelected && !answer.isCorrect ? 'wrong' : ''}
                            `}
                          >
                            <input
                              type="radio"
                              name={`q${qIndex}`}
                              checked={isSelected}
                              onChange={() => handleAnswerSelect(qIndex, aIndex)}
                              disabled={isAnswered || isQuestionLocked}
                            />
                            <span className="quiz-view__answer-text">
                              <span>{answer.text}</span>
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

      {/* Action Buttons */}
      <div className="quiz-view__actions">
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
          <button className="quiz-view__next-button" onClick={handleNext} disabled={currentIndex === mockQuestions.length - 1}>
            <span>Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Difficulty Dots */}
      <div className="quiz-view__difficulty-dots">
        {mockQuestions.map((question, index) => (
          <span
            key={index}
            className={`quiz-view__difficulty-dot quiz-view__difficulty-dot--${question.difficulty} ${index === currentIndex ? 'active' : ''}`}
            onClick={() => handleDotClick(index)}
          >
            <span className="quiz-view__difficulty-dot-text">{difficultyLabels[question.difficulty]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default QuizView
