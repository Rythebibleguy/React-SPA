import { useState, useEffect, useMemo } from 'react'
import { Check, X, Share2 } from 'lucide-react'
import { BASE_SHARE_URL } from '../config'
import { usePostHog } from 'posthog-js/react'
import './ResultsModal.css'

function ResultsModal({ score, total, questionResults, stats, onClose }) {
  const posthog = usePostHog()
  const [showCopied, setShowCopied] = useState(false)
  const [showShareFailed, setShowShareFailed] = useState(false)
  const [showShareLoading, setShowShareLoading] = useState(false)

  const handleShareChallenge = async () => {
    posthog?.capture('results_share_clicked')
    if (window.clarity) {
      window.clarity("event", "share_clicked")
    }
    
    // Create share text with emoji indicators in order (correct question = ✅, wrong = ❌)
    const squares = Array.isArray(questionResults) && questionResults.length > 0
      ? questionResults.map(correct => correct ? '✅' : '❌').join('')
      : '✅'.repeat(score) + '❌'.repeat(total - score)
    const shareUrlDisplay = BASE_SHARE_URL.replace(/^https?:\/\//, '')
    const shareText = `I got ${score}/${total} on Daily Bible Quiz\n${squares}\n\nGo try\n${shareUrlDisplay}`
    
    // Try Web Share API first (mobile/modern browsers)
    if (navigator.share) {
      try {
        setShowShareLoading(true)
        await navigator.share({
          title: 'Daily Bible Quiz',
          text: shareText
        })
        // If share was successful, don't show copied message
        return
      } catch (error) {
        // User cancelled - don't show error
        if (error.name === 'AbortError') {
          return
        }
        // Otherwise fall through to clipboard fallback
      } finally {
        setShowShareLoading(false)
      }
    }
    
    // Fall back to clipboard for browsers without share API or if share failed
    copyToClipboard(shareText)
  }

  const copyToClipboard = async (text) => {
    // Try modern Clipboard API first (only if secure context)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 2000)
        return
      } catch (error) {
        console.warn("Clipboard API failed, trying execCommand")
      }
    }

    // Fallback: execCommand (works in Instagram/restricted browsers)
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      
      // Style to be invisible but technically interactable
      Object.assign(textArea.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        opacity: '0.01',
        fontSize: '16px'
      })
      
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      textArea.setSelectionRange(0, 99999) // Force selection for mobile
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 2000)
      } else {
        throw new Error('Copy failed')
      }
    } catch (fallbackError) {
      // Ultimate fallback: Let user manually copy
      window.prompt("Copy your results to share:", text)
    }
  }

  // Calculate score distribution from stats
  const scoreDistribution = useMemo(() => {
    if (!stats || !stats.scores) {
      return null
    }

    const scoreCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
    Object.keys(stats.scores).forEach(scoreKey => {
      scoreCounts[scoreKey] = stats.scores[scoreKey] || 0
    })

    // Add the current user's score to the distribution
    scoreCounts[score] = (scoreCounts[score] || 0) + 1

    const totalPlayers = Object.values(scoreCounts).reduce((sum, count) => sum + count, 0)

    return { scoreCounts, total: totalPlayers }
  }, [stats, score])

  return (
    <div className="results-modal">
      <div className="results-modal__overlay" onClick={onClose}></div>
      <div className="results-modal__content">
        <button className="results-modal__close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>
        <div className="results-modal__score">
          <div className="results-modal__score-number">{score}</div>
          <div className="results-modal__score-divider">/</div>
          <div className="results-modal__score-total">{total}</div>
        </div>

        <div className="results-modal__global">
          <div className="results-modal__global-header">
            Global Stats
          </div>
          <div className="results-modal__score-distribution">
            <div className="results-modal__scores-column">
              {[4, 3, 2, 1].map(scoreValue => {
                const isUserScore = scoreValue === score
                const scoreLabel = `${scoreValue}/${total}`
                return (
                  <span
                    key={scoreValue}
                    className={`results-modal__score-label ${isUserScore ? 'results-modal__score-label--highlight' : ''}`}
                  >
                    {scoreLabel}
                  </span>
                )
              })}
            </div>
            <div className="results-modal__divider"></div>
            <div className="results-modal__bars-column">
              {[4, 3, 2, 1].map(scoreValue => {
                const count = scoreDistribution?.scoreCounts?.[scoreValue] || 0
                const maxCount = scoreDistribution?.scoreCounts ? Math.max(...Object.values(scoreDistribution.scoreCounts)) : 0
                const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
                const percentage = scoreDistribution?.total > 0 ? Math.round((count / scoreDistribution.total) * 100) : 0
                const isUserScore = scoreValue === score
                return (
                  <div
                    key={scoreValue}
                    className={`results-modal__bar-row ${isUserScore ? 'results-modal__bar-row--highlight' : ''}`}
                  >
                    <div className="results-modal__score-bar-container">
                      <div className="results-modal__score-bar" style={{ width: `${barWidth}%` }}></div>
                    </div>
                    <span className="results-modal__score-percentage">{percentage}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="results-modal__action">
          <button className="results-modal__btn" onClick={handleShareChallenge} disabled={showShareLoading}>
            {showShareLoading ? (
              <span className="results-modal__spinner"></span>
            ) : showCopied ? (
              <>
                <Check size={20} />
                Copied!
              </>
            ) : showShareFailed ? (
              <>
                <X size={20} />
                Share Failed
              </>
            ) : (
              <>
                <Share2 size={20} />
                Share Results
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultsModal


