import { useState } from 'react'
import './BottomNav.css'
import { FileText, Users, CircleUser } from 'lucide-react'

function BottomNav() {
  const [activeTab, setActiveTab] = useState('quiz')

  const tabs = [
    { id: 'quiz', icon: <FileText size={24} />, label: 'Quiz' },
    { id: 'friends', icon: <Users size={24} />, label: 'Friends' },
    { id: 'profile', icon: <CircleUser size={24} />, label: 'Profile' }
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
