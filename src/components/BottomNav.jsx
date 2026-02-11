import './BottomNav.css'
import { FileText, Users, CircleUser } from 'lucide-react'

function BottomNav({ currentScreen, onNavigate, show = false }) {
  const tabs = [
    { id: 'quiz', icon: <FileText />, label: 'Quiz' },
    { id: 'friends', icon: <Users />, label: 'Friends' },
    { id: 'profile', icon: <CircleUser />, label: 'Profile' }
  ]

  return (
    <nav className={`bottom-nav ${show ? 'show' : ''}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-item ${currentScreen === tab.id ? 'active' : ''}`}
          onClick={() => onNavigate(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
