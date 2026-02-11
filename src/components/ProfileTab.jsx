import './ProfileTab.css'
import AuthScreen from './AuthScreen'
import ProfileScreen from './ProfileScreen'
import { useAuth } from '../contexts/AuthContext'

function ProfileTab({ isTransitioning }) {
  const { currentUser } = useAuth()

  return (
    <div className={`profile-tab ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
      {currentUser ? <ProfileScreen /> : <AuthScreen />}
    </div>
  )
}

export default ProfileTab
