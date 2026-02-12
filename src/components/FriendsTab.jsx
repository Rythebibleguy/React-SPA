import './FriendsTab.css'
import GuestScreen from './GuestScreen'
import AuthModal from './AuthModal'
import FriendsScreen from './FriendsScreen'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

function FriendsTab({ isTransitioning, statisticsAnimationData }) {
  const { currentUser } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [closeStarted, setCloseStarted] = useState(false)
  const isStacked = showAuth && !closeStarted

  return (
    <>
      <div className={`friends-tab ${isTransitioning ? 'fade-out' : 'fade-in'} ${isStacked ? 'friends-tab--stacked-modal-active' : ''}`}>
        {currentUser ? (
          <FriendsScreen />
        ) : (
          <GuestScreen
            variant="friends"
            onSignIn={() => { setShowAuth(true); setCloseStarted(false); }}
            animationData={statisticsAnimationData}
          />
        )}
      </div>
      <AuthModal
        isOpen={showAuth}
        onClose={() => { setShowAuth(false); setCloseStarted(false); }}
        onCloseStart={() => setCloseStarted(true)}
      />
    </>
  )
}

export default FriendsTab
