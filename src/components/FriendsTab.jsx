import './FriendsTab.css'
import GuestScreen from './GuestScreen'
import AuthModal from './AuthModal'
import FriendsScreen from './FriendsScreen'
import ManageFriendsModal from './ManageFriendsModal'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

function FriendsTab({ isTransitioning, animationData }) {
  const { currentUser } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [closeStarted, setCloseStarted] = useState(false)
  const [showManageFriends, setShowManageFriends] = useState(false)
  const [manageFriendsCloseStarted, setManageFriendsCloseStarted] = useState(false)
  const isStacked = (showAuth && !closeStarted) || (showManageFriends && !manageFriendsCloseStarted)

  return (
    <>
      <div className={`friends-tab ${isTransitioning ? 'fade-out' : 'fade-in'} ${isStacked ? 'friends-tab--stacked-modal-active' : ''}`}>
        {currentUser ? (
          <FriendsScreen onOpenManageFriends={() => { setShowManageFriends(true); setManageFriendsCloseStarted(false); }} />
        ) : (
          <GuestScreen
            variant="friends"
            onSignIn={() => { setShowAuth(true); setCloseStarted(false); }}
            animationData={animationData}
          />
        )}
      </div>
      <AuthModal
        isOpen={showAuth}
        onClose={() => { setShowAuth(false); setCloseStarted(false); }}
        onCloseStart={() => setCloseStarted(true)}
      />
      <ManageFriendsModal
        isOpen={showManageFriends}
        onClose={() => { setShowManageFriends(false); setManageFriendsCloseStarted(false); }}
        onCloseStart={() => setManageFriendsCloseStarted(true)}
      />
    </>
  )
}

export default FriendsTab
