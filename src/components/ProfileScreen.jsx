import './ProfileScreen.css'
import { Trophy, Award, Flame } from 'lucide-react'

function ProfileScreen() {
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

  const badges = [
    { id: 1, icon: '🔥', name: 'Hot Streak', description: 'Complete 7 quizzes in a row', unlocked: true },
    { id: 2, icon: '⚡', name: 'Speed Demon', description: 'Finish quiz in under 2 minutes', unlocked: true },
    { id: 3, icon: '🎯', name: 'Perfect Score', description: 'Get all 4 questions correct', unlocked: true },
    { id: 4, icon: '📚', name: 'Scholar', description: 'Complete 50 quizzes', unlocked: false },
    { id: 5, icon: '👑', name: 'Quiz Master', description: 'Get 10 perfect scores', unlocked: false },
    { id: 6, icon: '💎', name: 'Diamond Streak', description: 'Complete 30 quizzes in a row', unlocked: false }
  ]

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
          <div className="profile-screen__stat-label">Max Streak</div>
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
            >
              <div className="profile-screen__badge-icon">{badge.icon}</div>
              {!badge.unlocked && (
                <div className="profile-screen__badge-lock">🔒</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProfileScreen
