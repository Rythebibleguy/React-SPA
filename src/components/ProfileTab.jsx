import './ProfileTab.css'
import GuestScreen from './GuestScreen'
import AuthModal from './AuthModal'
import ProfileScreen from './ProfileScreen'
import SettingsModal from './SettingsModal'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

function ProfileTab({ isTransitioning, statisticsAnimationData }) {
  const { currentUser, userProfile, updateUserProfile } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [isModalActive, setIsModalActive] = useState(false)

  return (
    <>
      <div className={`profile-tab ${isTransitioning ? 'fade-out' : 'fade-in'} ${isModalActive ? 'profile-tab--stacked-modal-active' : ''}`}>
        {currentUser ? (
          <ProfileScreen 
            showSettings={showSettings} 
            setShowSettings={(show) => { 
              setShowSettings(show); 
              setIsModalActive(show); 
            }} 
          />
        ) : (
          <GuestScreen onSignIn={() => { setShowAuth(true); setIsModalActive(true); }} animationData={statisticsAnimationData} />
        )}
      </div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onCloseStart={() => setIsModalActive(false)}
      />

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
