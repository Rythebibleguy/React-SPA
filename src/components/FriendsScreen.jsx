import './FriendsScreen.css'
import { useState, useEffect, useRef } from 'react'
import { firestore, doc, getDoc } from '../config/firebase'
import { BASE_SITE_URL } from '../config'
import { useAuth } from '../contexts/AuthContext'
import { getBadgeById } from '../config/badges'
import { Link2, UserMinus, UserPlus } from 'lucide-react'

const DEFAULT_AVATAR_COLOR = '#64B5F6'

function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function FriendsScreen() {
  const { currentUser, userProfile, addFriend, removeFriend } = useAuth()
  const [friendProfiles, setFriendProfiles] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [message, setMessage] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)
  const shareSectionRef = useRef(null)

  const friendUids = userProfile?.friends || []

  useEffect(() => {
    if (!friendUids.length) {
      setFriendProfiles([])
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
  }, [friendUids.join(',')])

    const shareUrl = currentUser ? `${BASE_SITE_URL}?friend=${currentUser.uid}` : ''

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

  if (!userProfile) {
    return (
      <div className="friends-screen">
        <div className="friends-screen__loading">
          <span className="friends-screen__spinner" />
        </div>
      </div>
    )
  }

  const hasFriends = friendProfiles.length > 0

  function scrollToAddFriends() {
    shareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="friends-screen">
      <header className="friends-screen__header">
        <h1 className="friends-screen__header-title">Friends</h1>
        <button type="button" className="friends-screen__header-add-btn" onClick={scrollToAddFriends} title="Add friends">
          <UserPlus size={22} />
        </button>
      </header>
      <div className="friends-screen__content">
        <section className="friends-screen__share" ref={shareSectionRef}>
          <h2 className="friends-screen__heading">Add friends</h2>
          <p className="friends-screen__share-text">Share your link. When they open it and sign in, you’ll be connected.</p>
          <button type="button" className="friends-screen__copy-btn" onClick={handleCopyLink} disabled={!shareUrl}>
            <Link2 size={18} />
            {copySuccess ? 'Copied!' : 'Copy link'}
          </button>
        </section>

        <section className="friends-screen__list-section">
          <h2 className="friends-screen__heading">Friends</h2>
          {loadingFriends && friendUids.length > 0 ? (
            <div className="friends-screen__loading-list"><span className="friends-screen__spinner" /> Loading…</div>
          ) : !hasFriends ? (
            <p className="friends-screen__empty">No friends yet. Share your link above to connect.</p>
          ) : (
            <ul className="friends-screen__list">
              {friendProfiles.map((friend) => {
                const color = friend.avatarColor || DEFAULT_AVATAR_COLOR
                const light = lightenColor(color, 15)
                const letterColor = color === '#424242' ? 'white' : '#444'
                const badge = friend.avatarBadge && friend.avatarBadge !== 'letter' ? getBadgeById(friend.avatarBadge) : null
                return (
                  <li key={friend.uid} className="friends-screen__item">
                    <div
                      className="friends-screen__avatar"
                      style={{ background: `linear-gradient(135deg, ${color} 0%, ${light} 100%)` }}
                    >
                      {badge ? (
                        <img src={badge.icon} alt="" className="friends-screen__avatar-icon" />
                      ) : (
                        <span className="friends-screen__avatar-letter" style={{ color: letterColor }}>
                          {(friend.displayName || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="friends-screen__name">{(friend.displayName || 'unknown').toLowerCase()}</span>
                    <button
                      type="button"
                      className={`friends-screen__remove-btn ${confirmRemoveId === friend.uid ? 'friends-screen__remove-btn--confirm' : ''}`}
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
          <div className={`friends-screen__toast friends-screen__toast--${message.type}`}>{message.text}</div>
        )}
      </div>
    </div>
  )
}

export default FriendsScreen
