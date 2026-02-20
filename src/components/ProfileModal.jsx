import './ProfileModal.css'
import BaseSlideUpModal from './BaseSlideUpModal'
import { useState, useEffect, useRef } from 'react'
import { LogOut, Edit } from 'lucide-react'
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

function ProfileModal({ isOpen, onClose, onCloseStart, userProfile, currentUser, updateUserProfile }) {
  const modalRef = useRef(null)
  const afterCloseRef = useRef(null)

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
  const { isDisplayNameExists, userPrivateData, loadUserPrivateData, logout } = useAuth()

  // If modal opens and private data isn't loaded yet (e.g. opened before preload), fetch it
  useEffect(() => {
    if (isOpen && currentUser && userPrivateData === null) {
      loadUserPrivateData().catch(() => {})
    }
  }, [isOpen, currentUser, userPrivateData, loadUserPrivateData])

  const handleCloseProfile = () => {
    modalRef.current?.close()
  }

  const handleStackedClose = () => {
    setIsEditing(false)
    setEditedName('')
    setNameError('')
    onClose()
    afterCloseRef.current?.()
    afterCloseRef.current = null
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
    const normalizedName = editedName.trim().toLowerCase()

    // Validate length
    if (!normalizedName || normalizedName.length > 15) {
      setNameError('Name must be 1-15 characters')
      return
    }

    // Check if name is unchanged
    if (normalizedName === (userProfile?.displayName || '').toLowerCase()) {
      setIsEditing(false)
      setEditedName('')
      setNameError('')
      return
    }

    // Check if name is already taken
    try {
      const nameExists = await isDisplayNameExists(normalizedName)
      if (nameExists) {
        setNameError('This name is already taken')
        return
      }

      await updateUserProfile({ displayName: normalizedName })
      setIsEditing(false)
      setEditedName('')
      setNameError('')
    } catch (error) {
      console.error('Failed to update name:', error)
      setNameError('Failed to save name')
    }
  }

  const handleLogout = () => {
    afterCloseRef.current = () => logout().catch((err) => console.error('Logout failed:', err))
    handleCloseProfile()
  }

  return (
    <BaseSlideUpModal
      ref={modalRef}
      isOpen={isOpen}
      onClose={handleStackedClose}
      onCloseStart={onCloseStart}
      title="Profile"
      footer={
        <button
          type="button"
          className="profile-modal__logout-btn"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      }
    >
      <div className="profile-modal__content">
          {/* Avatar Section */}
          <div className="profile-modal__avatar-section">
            <div className="profile-modal__avatar-wrapper">
              <div
                className="profile-modal__avatar"
                style={{
                  background: `linear-gradient(135deg, ${userProfile?.avatarColor || AVATAR_COLORS[0]} 0%, ${lightenColor(userProfile?.avatarColor || AVATAR_COLORS[0], 15)} 100%)`
                }}
              >
                {avatarBadge && avatarBadge.id !== 'avatar-unlocked' ? (
                  <img
                    src={avatarBadge.icon}
                    alt="Avatar badge"
                    className="profile-modal__avatar-badge-icon"
                  />
                ) : (
                  <span
                    className="profile-modal__avatar-letter"
                    style={{ color: (userProfile?.avatarColor || AVATAR_COLORS[0]) === '#424242' ? 'var(--text-on-dark)' : 'var(--text-primary)' }}
                  >
                    {(userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U').toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-modal__field">
            <label className="profile-modal__label">Display Name</label>
            {!isEditing ? (
              <div className="profile-modal__name-container">
                <div className="profile-modal__value">
                  <span>{(userProfile?.displayName || currentUser?.displayName || 'User').toLowerCase()}</span>
                  <button
                    className="profile-modal__edit-btn"
                    onClick={handleEditName}
                    title="Edit name"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-modal__edit-container">
                <div className="profile-modal__input-wrapper">
                  <input
                    type="text"
                    className="profile-modal__input"
                    value={editedName}
                    onChange={(e) => {
                      setEditedName(e.target.value)
                      setNameError('')
                    }}
                    maxLength={15}
                    autoFocus
                  />
                  {nameError && (
                    <div className="profile-modal__input-error">
                      <span className="profile-modal__input-error-text">{nameError}</span>
                    </div>
                  )}
                </div>
                <div className="profile-modal__edit-actions">
                  <button
                    className="profile-modal__action-btn profile-modal__action-btn--save"
                    onClick={handleSaveName}
                  >
                    Save
                  </button>
                  <button
                    className="profile-modal__action-btn profile-modal__action-btn--cancel"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="profile-modal__field">
            <label className="profile-modal__label">Email</label>
            <div className="profile-modal__value profile-modal__value--email">
              {(() => {
                const email = userPrivateData?.email || currentUser?.email || ''
                if (!email) return 'No email'
                const [local, domain] = email.split('@')
                if (!domain) return email
                return <><span>{local}</span><span>@</span><span>{domain}</span></>
              })()}
            </div>
          </div>
      </div>
    </BaseSlideUpModal>
  )
}

export default ProfileModal
