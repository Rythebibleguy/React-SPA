import './ManageFriendsModal.css'
import StackedModal from './StackedModal'
import { useState, useEffect } from 'react'
import { firestore, doc, getDoc } from '../config/firebase'
import { BASE_SITE_URL } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { getBadgeById } from '../config/badges'
import { Link2, UserMinus } from 'lucide-react'

const DEFAULT_AVATAR_COLOR = '#64B5F6'

function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function ManageFriendsModal({ isOpen, onClose, onCloseStart }) {
  const { currentUser, userProfile, removeFriend } = useAuth()
  const [friendProfiles, setFriendProfiles] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [message, setMessage] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)

  const friendUids = userProfile?.friends || []
  const shareUrl = currentUser ? `${BASE_SITE_URL}?friend=${currentUser.uid}` : ''

  useEffect(() => {
    if (!isOpen || !friendUids.length) {
      if (!isOpen) setFriendProfiles([])
      return
    }
    let cancelled = false
    setLoadingFriends(true)
    Promise.all(
      friendUids.map(async (uid) => {
        const ref = doc(firestore, 'users', uid)
        const snap = await getDoc(ref)
        if (!snap.exists() || cancelled) return null
        const d = snap.data()
        return { uid, displayName: d.displayName, avatarColor: d.avatarColor || DEFAULT_AVATAR_COLOR, avatarBadge: d.avatarBadge }
      })
    ).then((list) => {
      if (cancelled) return
      setFriendProfiles(list.filter(Boolean))
      setLoadingFriends(false)
    })
    return () => { cancelled = true }
  }, [isOpen, friendUids.join(',')])

  async function handleCopyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      setMessage({ text: 'Could not copy', type: 'error' })
      setTimeout(() => setMessage(null), 2000)
    }
  }

  function handleRemoveClick(uid) {
    if (confirmRemoveId !== uid) {
      setConfirmRemoveId(uid)
      return
    }
    setConfirmRemoveId(null)
    setRemovingId(uid)
    removeFriend(uid).then((result) => {
      setRemovingId(null)
      if (result.success) setMessage({ text: 'Friend removed', type: 'info' })
      else setMessage({ text: result.error || 'Failed to remove', type: 'error' })
      setTimeout(() => setMessage(null), 2000)
    })
  }

  const hasFriends = friendProfiles.length > 0

  return (
    <StackedModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseStart={onCloseStart}
      contentClassName="manage-friends-modal__content"
    >
      <div className="manage-friends-modal__inner">
        <section className="manage-friends-modal__share">
          <h2 className="manage-friends-modal__heading">Add friends</h2>
          <p className="manage-friends-modal__share-text">Share your link. When they open it and sign in, you’ll be connected.</p>
          <button type="button" className="manage-friends-modal__copy-btn" onClick={handleCopyLink} disabled={!shareUrl}>
            <Link2 size={18} />
            {copySuccess ? 'Copied!' : 'Copy link'}
          </button>
        </section>

        <section className="manage-friends-modal__list-section">
          <h2 className="manage-friends-modal__heading">Friends</h2>
          {loadingFriends && friendUids.length > 0 ? (
            <div className="manage-friends-modal__loading-list"><span className="manage-friends-modal__spinner" /> Loading…</div>
          ) : !hasFriends ? (
            <p className="manage-friends-modal__empty">No friends yet. Share your link above to connect.</p>
          ) : (
            <ul className="manage-friends-modal__list">
              {friendProfiles.map((friend) => {
                const color = friend.avatarColor || DEFAULT_AVATAR_COLOR
                const light = lightenColor(color, 15)
                const letterColor = color === '#424242' ? 'white' : '#444'
                const badge = friend.avatarBadge && friend.avatarBadge !== 'letter' ? getBadgeById(friend.avatarBadge) : null
                return (
                  <li key={friend.uid} className="manage-friends-modal__item">
                    <div
                      className="manage-friends-modal__avatar"
                      style={{ background: `linear-gradient(135deg, ${color} 0%, ${light} 100%)` }}
                    >
                      {badge ? (
                        <img src={badge.icon} alt="" className="manage-friends-modal__avatar-icon" />
                      ) : (
                        <span className="manage-friends-modal__avatar-letter" style={{ color: letterColor }}>
                          {(friend.displayName || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="manage-friends-modal__name">{(friend.displayName || 'unknown').toLowerCase()}</span>
                    <button
                      type="button"
                      className={`manage-friends-modal__remove-btn ${confirmRemoveId === friend.uid ? 'manage-friends-modal__remove-btn--confirm' : ''}`}
                      onClick={() => handleRemoveClick(friend.uid)}
                      disabled={removingId === friend.uid}
                      title={confirmRemoveId === friend.uid ? 'Click again to remove' : 'Remove friend'}
                    >
                      {confirmRemoveId === friend.uid ? 'Remove' : <UserMinus size={18} />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {message && (
          <div className={`manage-friends-modal__toast manage-friends-modal__toast--${message.type}`}>{message.text}</div>
        )}
      </div>
    </StackedModal>
  )
}

export default ManageFriendsModal
