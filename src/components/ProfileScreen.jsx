import './ProfileScreen.css'
import { Trophy, Award, Flame, Settings, Palette } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { getAllBadgesWithProgress, calculateCurrentStreakFromHistory, getTodayString } from '../config/badges'
import { useAuth } from '../contexts/AuthContext'

// Available avatar colors
const AVATAR_COLORS = [
  '#E57373', // Coral Red
  '#FFB74D', // Orange
  '#FFF176', // Sunny Yellow
  '#81C784', // Fresh Green
  '#64B5F6', // Sky Blue
  '#424242'  // Dark Gray/Black
]

// Helper to lighten color for gradient
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function ProfileScreen({ showSettings, setShowSettings }) {
  const { currentUser, userProfile, updateUserProfile } = useAuth()
  // Badge details modal state
  const [selectedBadge, setSelectedBadge] = useState(null)
  // Color palette state
  const [showColorPalette, setShowColorPalette] = useState(false)
  const avatarRef = useRef(null)
  const paletteRef = useRef(null)

  // Handle click outside to close color palette
  useEffect(() => {
    function handleClickOutside(event) {
      if (showColorPalette && 
          paletteRef.current && 
          !paletteRef.current.contains(event.target) &&
          avatarRef.current &&
          !avatarRef.current.contains(event.target)) {
        setShowColorPalette(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPalette])

  // Handle color selection
  async function handleColorSelect(color) {
    if (!currentUser || !userProfile) return
    
    // Close palette immediately
    setShowColorPalette(false)
    
    try {
      await updateUserProfile({ avatarColor: color })
    } catch (error) {
      console.error('Error saving avatar color:', error)
    }
  }

  // Handle badge selection as avatar
  async function handleSetBadgeAsAvatar(badgeId) {
    if (!currentUser || !userProfile) return
    
    try {
      await updateUserProfile({ avatarBadge: badgeId === 'letter' ? 'letter' : badgeId })
    } catch (error) {
      console.error('Error setting badge as avatar:', error)
    }
  }

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
          <span className="profile-screen__spinner"></span>
        </div>
      </div>
    )
  }

  // Use real data from Firebase
  const played = userProfile.quizzesTaken
  
  // Build score distribution from history
  const history = userProfile.history
  const scoreDistribution = [
    { score: 4, count: 0, label: 'Perfect' },
    { score: 3, count: 0, label: '3 Right' },
    { score: 2, count: 0, label: '2 Right' },
    { score: 1, count: 0, label: '1 Right' },
    { score: 0, count: 0, label: '0 Right' }
  ]
  
  history.forEach(entry => {
    const scoreItem = scoreDistribution.find(s => s.score === entry.score)
    if (scoreItem) scoreItem.count++
  })
  
  // Calculate average score
  const averageScore = userProfile.totalQuestionsAnswered > 0 
    ? ((userProfile.totalScore / userProfile.totalQuestionsAnswered) * 4).toFixed(1) 
    : '0.0'
  
  // Calculate current streak if not stored (for legacy profiles)
  const currentStreak = userProfile.currentStreak ?? calculateCurrentStreakFromHistory(history)
  
  const stats = {
    played,
    averageScore,
    currentStreak,
    maxStreak: userProfile.maxStreak
  }

  const maxCount = Math.max(...scoreDistribution.map(s => s.count), 1) // Avoid division by zero

  // Check if user completed today's quiz
  const today = getTodayString() // Format: YYYY-MM-DD (local timezone)
  const todayEntry = history.find(entry => entry.date === today)
  const todayScore = todayEntry?.score // Will be undefined if no quiz today

  // Real user data for badge checking
  const userData = {
    quizzesTaken: stats.played,
    maxStreak: stats.maxStreak,
    shares: userProfile.shares,
    history: history,
    perfectQuizzes: scoreDistribution.find(s => s.score === 4)?.count || 0,
    badges: userProfile.badges
  }

  // Get all badges with calculated progress (array order determines display order)
  const badges = getAllBadgesWithProgress(userData)

  // Get current avatar color and badge
  const avatarColor = userProfile?.avatarColor || AVATAR_COLORS[0]
  const avatarColorLight = lightenColor(avatarColor, 15)
  const letterColor = avatarColor === '#424242' ? 'white' : '#444'
  const avatarBadgeId = userProfile?.avatarBadge
  const avatarBadge = avatarBadgeId ? badges.find(b => b.id === avatarBadgeId && b.unlocked) : null

  return (
    <>
      <div className="profile-screen">
      <div className="profile-screen__header">
        <div className="profile-screen__header-left">
          <div className="profile-screen__avatar-wrapper">
            <div 
              ref={avatarRef}
              className="profile-screen__avatar"
              style={{
                background: `linear-gradient(135deg, ${avatarColor} 0%, ${avatarColorLight} 100%)`
              }}
              onClick={() => setShowColorPalette(!showColorPalette)}
              title="Click to change color"
            >
              {avatarBadge && avatarBadge.id !== 'avatar-unlocked' ? (
                <img 
                  src={avatarBadge.icon} 
                  alt="Avatar badge"
                  className="profile-screen__avatar-icon"
                />
              ) : (
                <span className="profile-screen__avatar-icon" style={{ color: letterColor }}>
                  {(userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U').toUpperCase()}
                </span>
              )}
              <div className="profile-screen__avatar-paint-badge">
                <Palette size={14} />
              </div>
            </div>
          </div>
          <h2 className="profile-screen__name">
            {(userProfile?.displayName || currentUser?.displayName || 'User').toLowerCase()}
          </h2>
        </div>
        <div className="profile-screen__header-buttons">
          <button 
            className="profile-screen__header-button"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {showColorPalette && (
        <div ref={paletteRef} className="profile-screen__color-palette">
          {AVATAR_COLORS.map(color => (
            <div
              key={color}
              className={`profile-screen__color-swatch ${
                color === avatarColor ? 'profile-screen__color-swatch--selected' : ''
              }`}
              style={{
                background: `linear-gradient(135deg, ${color} 0%, ${lightenColor(color, 15)} 100%)`
              }}
              onClick={() => handleColorSelect(color)}
              title={color}
              role="button"
              tabIndex={0}
            />
          ))}
        </div>
      )}

      <div className="profile-screen__stats-grid">
        <div className="profile-screen__stat">
          <div className="profile-screen__stat-value">{stats.played}</div>
          <div className="profile-screen__stat-label">Played</div>
        </div>
        <div className="profile-screen__stat">
          <div className="profile-screen__stat-value">{stats.averageScore}</div>
          <div className="profile-screen__stat-label">Avg Score</div>
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
              <div className="profile-screen__scores-column">
                {scoreDistribution.map(item => (
                  <div key={item.score} className="profile-screen__distribution-score">{item.score}</div>
                ))}
              </div>
              <div className="profile-screen__distribution-divider"></div>
              <div className="profile-screen__bars-column">
                {scoreDistribution.map(item => {
                  const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                  const isToday = todayScore !== undefined && item.score === todayScore
                  return (
                    <div key={item.score} className="profile-screen__distribution-bar-container">
                      <div 
                        className={`profile-screen__distribution-bar ${
                          isToday ? 'profile-screen__distribution-bar--perfect' : ''
                        }`}
                        style={{ width: `${barWidth}%` }}
                      >
                        <span className="profile-screen__distribution-count">{item.count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
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
                  {badge.id === 'avatar-unlocked' ? (
                    <span className="profile-screen__badge-letter">
                      {(userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  ) : (
                    <img 
                      src={badge.icon} 
                      alt={badge.name}
                      className="profile-screen__badge-icon"
                    />
                  )}
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

            {selectedBadge.unlocked && (
              <div className="profile-screen__modal-actions">
                {avatarBadgeId === selectedBadge.id ? (
                  <button 
                    className="profile-screen__modal-button profile-screen__modal-button--current"
                    disabled
                  >
                    Current Avatar
                  </button>
                ) : (
                  <button 
                    className="profile-screen__modal-button profile-screen__modal-button--primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetBadgeAsAvatar(selectedBadge.id)
                    }}
                  >
                    Use as Avatar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

    </>
  )
}

export default ProfileScreen
