import './FriendsTab.css'
import FriendsScreen from './FriendsScreen'

function FriendsTab({ isTransitioning }) {
  return (
    <div className={`friends-tab ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
      <FriendsScreen />
    </div>
  )
}

export default FriendsTab
