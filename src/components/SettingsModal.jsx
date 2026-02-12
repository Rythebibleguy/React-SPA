import './SettingsModal.css'
import { useState, useEffect } from 'react'

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
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [nameError, setNameError] = useState(false)

  // Trigger slide-up animation when modal opens
  useEffect(() => {
    if (isOpen) {
      // Wait a frame for DOM to update, then activate
      requestAnimationFrame(() => {
        setIsActive(true)
      })
    }
  }, [isOpen])

  const handleCloseSettings = () => {
    setIsActive(false)
    onCloseStart?.()
    setTimeout(() => {
      onClose()
      setIsEditing(false)
      setEditedName('')
      setNameError(false)
    }, 400)
  }

  const handleEditName = () => {
    setEditedName(userProfile?.displayName || '')
    setIsEditing(true)
    setNameError(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedName('')
    setNameError(false)
  }

  const handleSaveName = async () => {
    const trimmedName = editedName.trim()
    
    if (!trimmedName || trimmedName.length > 15) {
      setNameError(true)
      return
    }

    try {
      await updateUserProfile({ displayName: trimmedName })
      setIsEditing(false)
      setEditedName('')
      setNameError(false)
    } catch (error) {
      console.error('Failed to update name:', error)
      setNameError(true)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className={`settings-modal__overlay ${isActive ? 'settings-modal__overlay--active' : ''}`}
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      onClick={(e) => {
        if (e.target.className.includes('settings-modal__overlay')) {
          handleCloseSettings()
        }
      }}
    >
      <div className="settings-modal__sheet">
        <div className="settings-modal__header">
          <button 
            className="settings-modal__close"
            onClick={handleCloseSettings}
            title="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h3 className="settings-modal__title">Settings</h3>
        </div>
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
                <span 
                  className="settings-modal__avatar-letter"
                  style={{ color: (userProfile?.avatarColor || AVATAR_COLORS[0]) === '#424242' ? 'white' : '#444' }}
                >
                  {(userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U').toUpperCase()}
                </span>
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
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
                      setNameError(false)
                    }}
                    maxLength={15}
                    autoFocus
                  />
                  {nameError && (
                    <div className="settings-modal__input-error">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
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
              {currentUser?.email || 'No email'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
