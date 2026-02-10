import { useState } from 'react'
import './BottomNav.css'
import { FileText, Users, CircleUser } from 'lucide-react'

function BottomNav() {
  const [activeTab, setActiveTab] = useState('quiz')

  const tabs = [
    { id: 'quiz', icon: <FileText />, label: 'Quiz' },
    { id: 'friends', icon: <Users />, label: 'Friends' },
    { id: 'profile', icon: <CircleUser />, label: 'Profile' }
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
