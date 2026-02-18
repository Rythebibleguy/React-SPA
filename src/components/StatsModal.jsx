import './StatsModal.css'
import BaseSlideUpModal from './BaseSlideUpModal'
import { Palette, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { getAllBadgesWithProgress, calculateCurrentStreakFromHistory, getTodayString } from '../config/badges'
import { useAuth } from '../contexts/AuthContext'

const AVATAR_COLORS = [
  '#E57373', '#FFB74D', '#FFF176', '#81C784', '#64B5F6', '#424242'
]

function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/**
 * Stats slide-up modal. Renders only when the user is logged in.
 * Call site should show GuestModal when not logged in.
 */
function StatsModal({
  isOpen,
  onClose,
  onCloseStart,
  title = 'Stats',
  onOpenProfile
}) {
  const { currentUser, userProfile, updateUserProfile } = useAuth()
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [showColorPalette, setShowColorPalette] = useState(false)
  const avatarRef = useRef(null)
  const paletteRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (showColorPalette && paletteRef.current && !paletteRef.current.contains(event.target) &&
          avatarRef.current && !avatarRef.current.contains(event.target)) {
        setShowColorPalette(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPalette])

  async function handleColorSelect(color) {
    if (!currentUser || !userProfile) return
    setShowColorPalette(false)
    try {
      await updateUserProfile({ avatarColor: color })
    } catch (err) {
      console.error('Error saving avatar color:', err)
    }
  }

  async function handleSetBadgeAsAvatar(badgeId) {
    if (!currentUser || !userProfile) return
    try {
      await updateUserProfile({ avatarBadge: badgeId === 'letter' ? 'letter' : badgeId })
    } catch (err) {
      console.error('Error setting badge as avatar:', err)
    }
  }

  if (!userProfile) {
    return (
      <BaseSlideUpModal
        isOpen={isOpen}
        onClose={onClose}
        onCloseStart={onCloseStart}
        title={title}
      >
        <div className="stats-modal__content">
          <div className="stats-modal__loading">
            <span className="stats-modal__spinner" />
          </div>
        </div>
      </BaseSlideUpModal>
    )
  }

  const played = userProfile.quizzesTaken
  const history = userProfile.history || []
  const scoreDistribution = [
    { score: 4, count: 0, label: 'Perfect' },
    { score: 3, count: 0, label: '3 Right' },
    { score: 2, count: 0, label: '2 Right' },
    { score: 1, count: 0, label: '1 Right' },
    { score: 0, count: 0, label: '0 Right' }
  ]
  history.forEach(entry => {
    const item = scoreDistribution.find(s => s.score === entry.score)
    if (item) item.count++
  })

  const averageScore = userProfile.totalQuestionsAnswered > 0
    ? ((userProfile.totalScore / userProfile.totalQuestionsAnswered) * 4).toFixed(1)
    : '0.0'
  const currentStreak = userProfile.currentStreak ?? calculateCurrentStreakFromHistory(history)
  const stats = { played, averageScore, currentStreak, maxStreak: userProfile.maxStreak }
  const maxCount = Math.max(...scoreDistribution.map(s => s.count), 1)
  const today = getTodayString()
  const todayEntry = history.find(entry => entry.date === today)
  const todayScore = todayEntry?.score

  const userData = {
    quizzesTaken: stats.played,
    maxStreak: stats.maxStreak,
    shares: userProfile.shares,
    history,
    perfectQuizzes: scoreDistribution.find(s => s.score === 4)?.count || 0,
    badges: userProfile.badges
  }
  const badges = getAllBadgesWithProgress(userData)
  const avatarColor = userProfile?.avatarColor || AVATAR_COLORS[0]
  const avatarColorLight = lightenColor(avatarColor, 15)
  const letterColor = avatarColor === '#424242' ? 'var(--text-on-dark)' : 'var(--text-primary)'
  const avatarBadgeId = userProfile?.avatarBadge
  const avatarBadge = avatarBadgeId ? badges.find(b => b.id === avatarBadgeId && b.unlocked) : null

  const showSettingsButton = false

  return (
    <BaseSlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseStart={onCloseStart}
      title={title}
    >
      <div className="stats-modal__content">
        <div className="stats-modal__header">
          <div className="stats-modal__header-left">
            <div className="stats-modal__avatar-wrapper">
              <div
                ref={avatarRef}
                className="stats-modal__avatar"
                style={{ background: `linear-gradient(135deg, ${avatarColor} 0%, ${avatarColorLight} 100%)` }}
                onClick={() => setShowColorPalette(!showColorPalette)}
                title="Click to change color"
              >
                {avatarBadge && avatarBadge.id !== 'avatar-unlocked' ? (
                  <img src={avatarBadge.icon} alt="Avatar badge" className="stats-modal__avatar-icon" />
                ) : (
                  <span className="stats-modal__avatar-icon" style={{ color: letterColor }}>
                    {(userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U').toUpperCase()}
                  </span>
                )}
                <div className="stats-modal__avatar-paint-badge">
                  <Palette size={14} />
                </div>
              </div>
            </div>
            <h2 className="stats-modal__name">
              {(userProfile?.displayName || currentUser?.displayName || 'User').toLowerCase()}
            </h2>
          </div>
          {showSettingsButton && (
            <div className="stats-modal__header-buttons">
              <button
                type="button"
                className="stats-modal__header-button"
                onClick={() => { onClose?.(); onOpenProfile?.() }}
                title="Profile"
              >
                <Settings size={20} />
              </button>
            </div>
          )}
        </div>

        {showColorPalette && (
          <div ref={paletteRef} className="stats-modal__color-palette">
            {AVATAR_COLORS.map(color => (
              <div
                key={color}
                className={`stats-modal__color-swatch ${color === avatarColor ? 'stats-modal__color-swatch--selected' : ''}`}
                style={{ background: `linear-gradient(135deg, ${color} 0%, ${lightenColor(color, 15)} 100%)` }}
                onClick={() => handleColorSelect(color)}
                title={color}
                role="button"
                tabIndex={0}
              />
            ))}
          </div>
        )}

        <div className="stats-modal__stats-grid">
          <div className="stats-modal__stat">
            <div className="stats-modal__stat-value">{stats.played}</div>
            <div className="stats-modal__stat-label">Played</div>
          </div>
          <div className="stats-modal__stat">
            <div className="stats-modal__stat-value">{stats.averageScore}</div>
            <div className="stats-modal__stat-label">Avg Score</div>
          </div>
          <div className="stats-modal__stat">
            <div className="stats-modal__stat-value">{stats.currentStreak}</div>
            <div className="stats-modal__stat-label">Current Streak</div>
          </div>
          <div className="stats-modal__stat">
            <div className="stats-modal__stat-value">{stats.maxStreak}</div>
            <div className="stats-modal__stat-label">Best Streak</div>
          </div>
        </div>

        {stats.played === 0 ? (
          <div className="stats-modal__welcome">
            <div className="stats-modal__welcome-icon">🎯</div>
            <h3 className="stats-modal__welcome-title">Welcome!</h3>
            <p className="stats-modal__welcome-text">
              Take your first quiz to start tracking your progress and earning badges.
            </p>
            <p className="stats-modal__welcome-hint">Head to the Quiz to get started!</p>
          </div>
        ) : (
          <>
            <div className="stats-modal__section">
              <h3 className="stats-modal__section-title">SCORE DISTRIBUTION</h3>
              <div className="stats-modal__distribution">
                <div className="stats-modal__scores-column">
                  {scoreDistribution.map(item => (
                    <div key={item.score} className="stats-modal__distribution-score">{item.score}</div>
                  ))}
                </div>
                <div className="stats-modal__distribution-divider" />
                <div className="stats-modal__bars-column">
                  {scoreDistribution.map(item => {
                    const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    const isToday = todayScore !== undefined && item.score === todayScore
                    return (
                      <div key={item.score} className="stats-modal__distribution-bar-container">
                        <div
                          className={`stats-modal__distribution-bar ${isToday ? 'stats-modal__distribution-bar--perfect' : ''}`}
                          style={{ width: `${barWidth}%` }}
                        >
                          <span className="stats-modal__distribution-count">{item.count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="stats-modal__section">
              <h3 className="stats-modal__section-title">BADGES</h3>
              <p className="stats-modal__section-subtitle">Tap any badge to view details</p>
              <div className="stats-modal__badges">
                {badges.map(badge => (
                  <div
                    key={badge.id}
                    className={`stats-modal__badge ${badge.unlocked ? 'stats-modal__badge--unlocked' : 'stats-modal__badge--locked'}`}
                    onClick={() => setSelectedBadge(badge)}
                  >
                    {badge.id === 'avatar-unlocked' ? (
                      <span className="stats-modal__badge-letter">
                        {(userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U').toUpperCase()}
                      </span>
                    ) : (
                      <img src={badge.icon} alt={badge.name} className="stats-modal__badge-icon" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedBadge && (
          <div className="stats-modal__modal-overlay" onClick={() => setSelectedBadge(null)}>
            <div className="stats-modal__modal" onClick={e => e.stopPropagation()}>
              <div className="stats-modal__modal-header">
                <img src={selectedBadge.icon} alt={selectedBadge.name} className="stats-modal__modal-icon" />
              </div>
              <h3 className="stats-modal__modal-title">{selectedBadge.name}</h3>
              <p className="stats-modal__modal-description">{selectedBadge.description}</p>
              {selectedBadge.progress && (
                <div className="stats-modal__modal-progress">
                  <div className="stats-modal__modal-progress-text">
                    Progress: {selectedBadge.progress.current}/{selectedBadge.progress.total} {selectedBadge.progress.type}
                  </div>
                  <div className="stats-modal__modal-progress-bar">
                    <div className="stats-modal__modal-progress-fill" style={{ width: `${selectedBadge.progressPercent}%` }} />
                  </div>
                  <div className="stats-modal__modal-progress-percent">{Math.round(selectedBadge.progressPercent)}%</div>
                </div>
              )}
              {selectedBadge.unlocked && (
                <div className="stats-modal__modal-actions">
                  {avatarBadgeId === selectedBadge.id ? (
                    <button type="button" className="stats-modal__modal-button stats-modal__modal-button--current" disabled>Current Avatar</button>
                  ) : (
                    <button
                      type="button"
                      className="stats-modal__modal-button stats-modal__modal-button--primary"
                      onClick={e => { e.stopPropagation(); handleSetBadgeAsAvatar(selectedBadge.id) }}
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
    </BaseSlideUpModal>
  )
}

export default StatsModal
