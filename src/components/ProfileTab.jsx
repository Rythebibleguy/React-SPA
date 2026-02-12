import './ProfileTab.css'
import AuthScreen from './AuthScreen'
import ProfileScreen from './ProfileScreen'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'

function ProfileTab({ isTransitioning }) {
  const { currentUser } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [isActive, setIsActive] = useState(false)

  // Trigger slide-up animation when modal opens
  useEffect(() => {
    if (showSettings) {
      // Wait a frame for DOM to update, then activate
      requestAnimationFrame(() => {
        setIsActive(true)
      })
    }
  }, [showSettings])

  const handleCloseSettings = () => {
    setIsActive(false)
    setTimeout(() => {
      setShowSettings(false)
    }, 400)
  }

  return (
    <>
      <div className={`profile-tab ${isTransitioning ? 'fade-out' : 'fade-in'} ${isActive ? 'profile-tab--stacked-modal-active' : ''}`}>
        {currentUser ? <ProfileScreen showSettings={showSettings} setShowSettings={setShowSettings} /> : <AuthScreen />}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className={`profile-tab__settings-overlay ${isActive ? 'profile-tab__settings-overlay--active' : ''}`}
          onClick={(e) => {
            if (e.target.className.includes('profile-tab__settings-overlay')) {
              handleCloseSettings()
            }
          }}
        >
          <div className="profile-tab__settings-sheet">
            <div className="profile-tab__settings-header">
              <button 
                className="profile-tab__settings-close"
                onClick={handleCloseSettings}
                title="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <h3 className="profile-tab__settings-title">Settings</h3>
            </div>
            <div className="profile-tab__settings-content">
              {/* Settings content will go here */}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProfileTab
