import './SettingsModal.css'
import { useState, useEffect } from 'react'
import { LogOut, Edit, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getAllBadgesWithProgress } from '../config/badges'

// Available avatar colors
const AVATAR_COLORS = [
  '#E57373', // Coral Red
  '#FFB74D', // Orange
  '#FFF176', // Sunny Yellow
  '#81C784', // Fresh Green
  '#64B5F6', // Sky Blue
  '#424242'  // Dark Gray/Black
]

// Helper to lighten color for gradient
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function SettingsModal({ isOpen, onClose, onCloseStart, userProfile, currentUser, updateUserProfile }) {
  const [isActive, setIsActive] = useState(false)
  
  // Get avatar badge info
  const userData = {
    quizzesTaken: userProfile?.quizzesTaken || 0,
    maxStreak: userProfile?.maxStreak || 0,
    currentStreak: userProfile?.currentStreak || 0,
    history: userProfile?.history || [],
    shares: userProfile?.shares || 0,
    badges: userProfile?.badges || []
  }
  const badges = getAllBadgesWithProgress(userData)
  const avatarBadgeId = userProfile?.avatarBadge
  const avatarBadge = avatarBadgeId ? badges.find(b => b.id === avatarBadgeId && b.unlocked) : null
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [nameError, setNameError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const { isDisplayNameExists, getUserPrivateData, logout } = useAuth()

  // Trigger slide-up animation when modal opens
  useEffect(() => {
    if (isOpen) {
      // Wait a frame for DOM to update, then activate
      requestAnimationFrame(() => {
        setIsActive(true)
      })
      
      // Fetch email from private data
      if (currentUser) {
        getUserPrivateData().then(privateData => {
          setUserEmail(privateData?.email || '')
        }).catch(err => {
          console.error('Failed to load private data:', err)
          setUserEmail('')
        })
      }
    }
  }, [isOpen, currentUser, getUserPrivateData])

  const handleCloseSettings = () => {
    setIsActive(false)
    onCloseStart?.()
    setTimeout(() => {
      onClose()
      setIsEditing(false)
      setEditedName('')
      setNameError('')
    }, 400)
  }

  const handleEditName = () => {
    setEditedName(userProfile?.displayName || '')
    setIsEditing(true)
    setNameError('')
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedName('')
    setNameError('')
  }

  const handleSaveName = async () => {
    const trimmedName = editedName.trim()
    
    // Validate length
    if (!trimmedName || trimmedName.length > 15) {
      setNameError('Name must be 1-15 characters')
      return
    }

    // Check if name is unchanged
    if (trimmedName === userProfile?.displayName) {
      setIsEditing(false)
      setEditedName('')
      setNameError('')
      return
    }

    // Check if name is already taken
    try {
      const nameExists = await isDisplayNameExists(trimmedName)
      if (nameExists) {
        setNameError('This name is already taken')
        return
      }

      await updateUserProfile({ displayName: trimmedName })
      setIsEditing(false)
      setEditedName('')
      setNameError('')
    } catch (error) {
      console.error('Failed to update name:', error)
      setNameError('Failed to save name')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      handleCloseSettings()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className={`settings-modal__overlay ${isActive ? 'settings-modal__overlay--active' : ''}`}
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseSettings()
        }
      }}
    >
      <div className="settings-modal__sheet">
        <button 
          className="settings-modal__close"
          onClick={handleCloseSettings}
          title="Close"
        >
          <X size={20} />
        </button>
        <div className="settings-modal__content">
          {/* Avatar Section */}
          <div className="settings-modal__avatar-section">
            <div className="settings-modal__avatar-wrapper">
              <div 
                className="settings-modal__avatar"
                style={{
                  background: `linear-gradient(135deg, ${userProfile?.avatarColor || AVATAR_COLORS[0]} 0%, ${lightenColor(userProfile?.avatarColor || AVATAR_COLORS[0], 15)} 100%)`
                }}
              >
                {avatarBadge && avatarBadge.id !== 'avatar-unlocked' ? (
                  <img 
                    src={avatarBadge.icon} 
                    alt="Avatar badge"
                    className="settings-modal__avatar-badge-icon"
                  />
                ) : (
                  <span 
                    className="settings-modal__avatar-letter"
                    style={{ color: (userProfile?.avatarColor || AVATAR_COLORS[0]) === '#424242' ? 'white' : '#444' }}
                  >
                    {(userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U').toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="settings-modal__field">
            <label className="settings-modal__label">Display Name</label>
            {!isEditing ? (
              <div className="settings-modal__name-container">
                <div className="settings-modal__value">
                  <span>{userProfile?.displayName || currentUser?.displayName || 'User'}</span>
                  <button 
                    className="settings-modal__edit-btn"
                    onClick={handleEditName}
                    title="Edit name"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-modal__edit-container">
                <div className="settings-modal__input-wrapper">
                  <input 
                    type="text"
                    className="settings-modal__input"
                    value={editedName}
                    onChange={(e) => {
                      setEditedName(e.target.value)
                      setNameError('')
                    }}
                    maxLength={15}
                    autoFocus
                  />
                  {nameError && (
                    <div className="settings-modal__input-error">
                      <span className="settings-modal__input-error-text">{nameError}</span>
                    </div>
                  )}
                </div>
                <div className="settings-modal__edit-actions">
                  <button 
                    className="settings-modal__action-btn settings-modal__action-btn--save"
                    onClick={handleSaveName}
                  >
                    Save
                  </button>
                  <button 
                    className="settings-modal__action-btn settings-modal__action-btn--cancel"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="settings-modal__field">
            <label className="settings-modal__label">Email</label>
            <div className="settings-modal__value">
              {userEmail || 'No email'}
            </div>
          </div>
        </div>

        <div className="settings-modal__logout-section">
          <button 
            className="settings-modal__logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
