import './ProfileScreen.css'
import { Trophy, Award, Flame } from 'lucide-react'
import { useState } from 'react'
import { getAllBadgesWithProgress } from '../config/badges'

function ProfileScreen() {
  // Badge details modal state
  const [selectedBadge, setSelectedBadge] = useState(null)

  // Mock data
  const stats = {
    played: 47,
    perfectPercentage: 68,
    currentStreak: 12,
    maxStreak: 18
  }

  const scoreDistribution = [
    { score: 4, count: 12, label: 'Perfect' },
    { score: 3, count: 34, label: '3 Right' },
    { score: 2, count: 20, label: '2 Right' },
    { score: 1, count: 7, label: '1 Right' },
    { score: 0, count: 2, label: '0 Right' }
  ]

  const maxCount = Math.max(...scoreDistribution.map(s => s.count))

  // Mock user data for badge checking
  const userData = {
    quizzesTaken: stats.played,
    maxStreak: stats.maxStreak,
    shares: 2, // Mock shares
    history: [
      { score: 4, totalQuestions: 4, date: '2024-02-10', timestamp: '14:30', duration: 45 },
      { score: 3, totalQuestions: 4, date: '2024-02-09', timestamp: '09:15', duration: 62 },
      { score: 4, totalQuestions: 4, date: '2024-02-08', timestamp: '05:45', duration: 8 },
      // More mock history...
    ]
  }

  // Get all badges with calculated progress (array order determines display order)
  const badges = getAllBadgesWithProgress(userData)

  return (
    <div className="profile-screen">
      <div className="profile-screen__header">
        <div className="profile-screen__avatar">
          <span className="profile-screen__avatar-letter">R</span>
        </div>
        <h2 className="profile-screen__name">Ryan</h2>
      </div>

      <div className="profile-screen__stats-grid">
        <div className="profile-screen__stat">
          <div className="profile-screen__stat-value">{stats.played}</div>
          <div className="profile-screen__stat-label">Played</div>
        </div>
        <div className="profile-screen__stat">
          <div className="profile-screen__stat-value">{stats.perfectPercentage}%</div>
          <div className="profile-screen__stat-label">Perfect %</div>
        </div>
        <div className="profile-screen__stat">
          <div className="profile-screen__stat-value">{stats.currentStreak}</div>
          <div className="profile-screen__stat-label">Current Streak</div>
        </div>
        <div className="profile-screen__stat">
          <div className="profile-screen__stat-value">{stats.maxStreak}</div>
          <div className="profile-screen__stat-label">Best Streak</div>
        </div>
      </div>

      <div className="profile-screen__section">
        <h3 className="profile-screen__section-title">SCORE DISTRIBUTION</h3>
        <div className="profile-screen__distribution">
          {scoreDistribution.map(item => {
            const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0
            const isPerfect = item.score === 4
            return (
              <div key={item.score} className="profile-screen__distribution-row">
                <div className="profile-screen__distribution-score">{item.score}</div>
                <div className="profile-screen__distribution-bar-container">
                  <div 
                    className={`profile-screen__distribution-bar ${
                      isPerfect ? 'profile-screen__distribution-bar--perfect' : ''
                    }`}
                    style={{ width: `${barWidth}%` }}
                  >
                    {item.count > 0 && (
                      <span className="profile-screen__distribution-count">{item.count}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="profile-screen__section">
        <h3 className="profile-screen__section-title">BADGES</h3>
        <p className="profile-screen__section-subtitle">Tap any badge to view details</p>
        <div className="profile-screen__badges">
          {badges.map(badge => (
            <div 
              key={badge.id} 
              className={`profile-screen__badge ${
                badge.unlocked 
                  ? 'profile-screen__badge--unlocked' 
                  : 'profile-screen__badge--locked'
              }`}
              onClick={() => setSelectedBadge(badge)}
            >
              <img 
                src={badge.icon} 
                alt={badge.name}
                className="profile-screen__badge-icon"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Badge Details Modal */}
      {selectedBadge && (
        <div className="profile-screen__modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div className="profile-screen__modal">
            <div className="profile-screen__modal-header">
              <img 
                src={selectedBadge.icon} 
                alt={selectedBadge.name}
                className="profile-screen__modal-icon"
              />
            </div>
            <h3 className="profile-screen__modal-title">{selectedBadge.name}</h3>
            <p className="profile-screen__modal-description">{selectedBadge.description}</p>
            
            {selectedBadge.progress && (
              <div className="profile-screen__modal-progress">
                <div className="profile-screen__modal-progress-text">
                  Progress: {selectedBadge.progress.current}/{selectedBadge.progress.total} {selectedBadge.progress.type}
                </div>
                <div className="profile-screen__modal-progress-bar">
                  <div 
                    className="profile-screen__modal-progress-fill"
                    style={{ width: `${selectedBadge.progressPercent}%` }}
                  />
                </div>
                <div className="profile-screen__modal-progress-percent">
                  {Math.round(selectedBadge.progressPercent)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileScreen
