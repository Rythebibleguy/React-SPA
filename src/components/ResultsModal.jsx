import { useState, useEffect } from 'react'
import './ResultsModal.css'

function ResultsModal({ score, total, onClose, onShare }) {
  const [countdown, setCountdown] = useState('00:00:00')

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      const diff = tomorrow - now
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      setCountdown(formatted)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="results-modal">
      <div className="results-modal__overlay" onClick={onClose}></div>
      <div className="results-modal__content">
        <div className="results-modal__header">
          <h2 className="results-modal__title">Quiz Complete!</h2>
        </div>

        <div className="results-modal__score-section">
          <div className="results-modal__score-display">
            <span className="results-modal__score">{score}/{total}</span>
          </div>
        </div>

        <div className="results-modal__leaderboard-section">
          {/* Blank leaderboard section - to be filled later */}
        </div>

        <div className="results-modal__countdown-section">
          <p className="results-modal__countdown-label">Next quiz in:</p>
          <div className="results-modal__countdown">{countdown}</div>
        </div>

        <div className="results-modal__actions">
          <button className="results-modal__btn results-modal__btn--primary" onClick={onShare}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"></path>
              <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
            </svg>
            Send Challenge
          </button>
          <button className="results-modal__btn results-modal__btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultsModal
