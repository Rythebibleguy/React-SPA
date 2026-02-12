import { useState, useEffect, useMemo } from 'react'
import { Check, X, Send } from 'lucide-react'
import './ResultsModal.css'

function ResultsModal({ score, total, stats, onClose, onShare, showCopied, showShareFailed }) {

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
          <button className="results-modal__btn" onClick={onShare}>
            {showCopied ? (
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
                <Send size={20} />
                Send Challenge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultsModal


