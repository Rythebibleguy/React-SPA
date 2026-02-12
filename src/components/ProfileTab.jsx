import './ProfileTab.css'
import AuthScreen from './AuthScreen'
import ProfileScreen from './ProfileScreen'
import SettingsModal from './SettingsModal'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

function ProfileTab({ isTransitioning }) {
  const { currentUser, userProfile, updateUserProfile } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [isModalActive, setIsModalActive] = useState(false)

  return (
    <>
      <div className={`profile-tab ${isTransitioning ? 'fade-out' : 'fade-in'} ${isModalActive ? 'profile-tab--stacked-modal-active' : ''}`}>
        {currentUser ? <ProfileScreen showSettings={showSettings} setShowSettings={(show) => { setShowSettings(show); setIsModalActive(show); }} /> : <AuthScreen />}
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onCloseStart={() => setIsModalActive(false)}
        userProfile={userProfile}
        currentUser={currentUser}
        updateUserProfile={updateUserProfile}
      />
    </>
  )
}

export default ProfileTab
