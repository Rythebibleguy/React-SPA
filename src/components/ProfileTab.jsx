import './ProfileTab.css'
import AuthScreen from './AuthScreen'
import ProfileScreen from './ProfileScreen'

function ProfileTab({ isTransitioning }) {
  // TODO: Replace with actual auth state check
  const isAuthenticated = true

  return (
    <div className={`profile-tab ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
      {isAuthenticated ? <ProfileScreen /> : <AuthScreen />}
    </div>
  )
}

export default ProfileTab
