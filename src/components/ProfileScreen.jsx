import './ProfileScreen.css'
import { Trophy, Award, Flame, LogOut } from 'lucide-react'
import { useState } from 'react'
import { getAllBadgesWithProgress } from '../config/badges'
import { useAuth } from '../contexts/AuthContext'

function ProfileScreen() {
  const { logout, currentUser, userProfile } = useAuth()
  // Badge details modal state
  const [selectedBadge, setSelectedBadge] = useState(null)

  // Show different states based on auth status
  if (!currentUser) {
    // User is not logged in - show auth prompt instead of loading
    return (
      <div className="profile-screen">
        <div className="profile-screen__welcome">
          <div className="profile-screen__welcome-icon">👤</div>
          <h3 className="profile-screen__welcome-title">Sign In Required</h3>
          <p className="profile-screen__welcome-text">
            Sign in to track your progress, earn badges, and compete with friends!
          </p>
          <p className="profile-screen__welcome-hint">
            Click the user icon in any tab to sign in.
          </p>
        </div>
      </div>
    )
  }

  // User is logged in but profile is still loading
  if (!userProfile) {
    return (
      <div className="profile-screen">
        <div className="profile-screen__loading">
          <div>Loading profile...</div>
        </div>
      </div>
    )
  }

  // Use real data from Firebase or defaults for new users
  const stats = {
    played: userProfile.totalQuizzesCompleted || 0,
    perfectPercentage: userProfile.averageScore || 0,
    currentStreak: userProfile.currentStreak || 0,
    maxStreak: userProfile.maxStreak || 0
  }

  // Generate score distribution from user's quiz history or use defaults
  const scoreDistribution = userProfile.scoreDistribution || [
    { score: 4, count: 0, label: 'Perfect' },
    { score: 3, count: 0, label: '3 Right' },
    { score: 2, count: 0, label: '2 Right' },
    { score: 1, count: 0, label: '1 Right' },
    { score: 0, count: 0, label: '0 Right' }
  ]

  const maxCount = Math.max(...scoreDistribution.map(s => s.count), 1) // Avoid division by zero

  // Real user data for badge checking
  const userData = {
    quizzesTaken: stats.played,
    maxStreak: stats.maxStreak,
    shares: userProfile.shares || 0,
    history: userProfile.quizHistory || [],
    perfectQuizzes: scoreDistribution.find(s => s.score === 4)?.count || 0,
    badges: userProfile.badges || []
  }

  // Get all badges with calculated progress (array order determines display order)
  const badges = getAllBadgesWithProgress(userData)

  return (
    <div className="profile-screen">
      <div className="profile-screen__header">
        <div className="profile-screen__header-left">
          <div className="profile-screen__avatar">
            <span className="profile-screen__avatar-letter">
              {userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
            </span>
          </div>
          <h2 className="profile-screen__name">
            {userProfile?.displayName || currentUser?.displayName || 'User'}
          </h2>
        </div>
        <button 
          className="profile-screen__sign-out"
          onClick={logout}
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
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

      {stats.played === 0 ? (
        <div className="profile-screen__welcome">
          <div className="profile-screen__welcome-icon">🎯</div>
          <h3 className="profile-screen__welcome-title">Welcome!</h3>
          <p className="profile-screen__welcome-text">
            Take your first quiz to start tracking your progress and earning badges.
          </p>
          <p className="profile-screen__welcome-hint">
            Head to the Quiz tab to get started!
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}

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
