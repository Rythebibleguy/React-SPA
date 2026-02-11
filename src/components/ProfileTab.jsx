import './ProfileTab.css'
import ProfileScreen from './ProfileScreen'

function ProfileTab({ isTransitioning }) {
  return (
    <div className={`profile-tab ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
      <ProfileScreen />
    </div>
  )
}

export default ProfileTab
