import './FriendsModal.css'
import BaseSlideUpModal from './BaseSlideUpModal'
import { useState, useEffect, useMemo } from 'react'
import { firestore, doc, getDoc } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { getBadgeById } from '../config/badges'
import { getTodayString } from '../utils/csvParser'
import { BASE_SITE_URL } from '../config'
import { Share2, ChevronLeft, ChevronRight, Check, X, Minus } from 'lucide-react'

const DEFAULT_AVATAR_COLOR = '#64B5F6'
let friendProfilesCache = { key: null, profiles: [] }

function formatDateLabel(dateStr) {
  if (dateStr == null || typeof dateStr !== 'string') return '—'
  const d = new Date(dateStr + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const day = d.getDate()
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const year = d.getFullYear()
  return `${weekday}, ${day} ${month} ${year}`
}

function addDays(dateStr, delta) {
  if (dateStr == null || typeof dateStr !== 'string') return dateStr
  const d = new Date(dateStr + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  d.setDate(d.getDate() + delta)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function FriendsModal({
  isOpen,
  onClose,
  onCloseStart,
  title = 'Friends'
}) {
  const { currentUser, userProfile } = useAuth()
  const today = useMemo(() => getTodayString(), [])
  const [selectedDate, setSelectedDate] = useState(() => getTodayString())
  const [friendProfiles, setFriendProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [showShareLoading, setShowShareLoading] = useState(false)
  const [showShareFailed, setShowShareFailed] = useState(false)

  const shareUrl = currentUser ? `${BASE_SITE_URL}?friend=${currentUser.uid}` : ''

  const friendUids = userProfile?.friends || []
  const cacheKey = friendUids.join(',')

  function buildCurrentUserRow() {
    if (!currentUser || !userProfile) return null
    return {
      uid: currentUser.uid,
      displayName: userProfile.displayName || 'You',
      avatarColor: userProfile.avatarColor || DEFAULT_AVATAR_COLOR,
      avatarBadge: userProfile.avatarBadge,
      history: userProfile.history || [],
      isCurrentUser: true
    }
  }

  useEffect(() => {
    if (!userProfile || !currentUser) return
    const currentUserRow = buildCurrentUserRow()
    if (!currentUserRow) return

    if (friendProfilesCache.key === cacheKey && friendProfilesCache.profiles.length >= 0) {
      setFriendProfiles([currentUserRow, ...friendProfilesCache.profiles])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const load = async () => {
      const list = [currentUserRow]
      const friendOnly = []
      for (const uid of friendUids) {
        if (cancelled) return
        try {
          const snap = await getDoc(doc(firestore, 'users', uid))
          if (!snap.exists()) continue
          const d = snap.data()
          const profile = {
            uid,
            displayName: d.displayName || 'unknown',
            avatarColor: d.avatarColor || DEFAULT_AVATAR_COLOR,
            avatarBadge: d.avatarBadge,
            history: d.history || [],
            isCurrentUser: false
          }
          list.push(profile)
          friendOnly.push(profile)
        } catch {
          // skip
        }
      }
      if (!cancelled) {
        setFriendProfiles(list)
        setLoading(false)
        friendProfilesCache = { key: cacheKey, profiles: friendOnly }
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentUser?.uid, userProfile, cacheKey])

  const selectedDateEntry = (history) => (history || []).find((e) => e.date === selectedDate)
  const rows = useMemo(() => {
    return friendProfiles.map((p) => {
      const entry = selectedDateEntry(p.history)
      const score = entry?.score
      const total = entry?.totalQuestions ?? 4
      return {
        ...p,
        score: score != null ? score : null,
        total,
        hasScore: score != null
      }
    }).sort((a, b) => {
      if (a.hasScore && !b.hasScore) return -1
      if (!a.hasScore && b.hasScore) return 1
      if (a.hasScore && b.hasScore) return (b.score ?? 0) - (a.score ?? 0)
      return (a.displayName || '').localeCompare(b.displayName || '')
    })
  }, [friendProfiles, selectedDate])

  const rankedRows = useMemo(() => {
    let rank = 0
    return rows.map((r) => {
      if (r.hasScore) {
        rank += 1
        return { ...r, rank }
      }
      return { ...r, rank: null }
    })
  }, [rows])

  const tomorrow = addDays(today, 1)
  const canGoNext = selectedDate < tomorrow

  const handlePrevDay = () => setSelectedDate((d) => addDays(d, -1))
  const handleNextDay = () => {
    if (!canGoNext) return
    setSelectedDate((d) => addDays(d, 1))
  }

  const handleShareLink = async () => {
    if (!shareUrl) return
    if (window.clarity) window.clarity('event', 'friend_link_shared')
    const shareText = `Add me on Daily Bible Quiz – open this link and sign in to connect.\n${shareUrl}`
    if (navigator.share) {
      try {
        setShowShareLoading(true)
        setShowShareFailed(false)
        await navigator.share({ title: 'Daily Bible Quiz', text: shareText })
        return
      } catch (error) {
        if (error.name === 'AbortError') return
        setShowShareFailed(true)
        setTimeout(() => setShowShareFailed(false), 2000)
      } finally {
        setShowShareLoading(false)
      }
    }
    copyToClipboard(shareUrl)
  }

  const copyToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
        return
      } catch {
        // fall through
      }
    }
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      Object.assign(textArea.style, { position: 'fixed', left: '0', top: '0', opacity: '0.01', fontSize: '16px' })
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      textArea.setSelectionRange(0, 99999)
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (successful) {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        throw new Error('Copy failed')
      }
    } catch {
      window.prompt('Copy your friend link:', text)
    }
  }

  const renderBody = () => {

    if (!userProfile) {
      return (
        <div className="friends-modal__loading">
          <span className="friends-modal__spinner" />
        </div>
      )
    }

    return (
      <div className="friends-modal__content">
        <div className="friends-modal__header">
          <div className="friends-modal__date-row">
            <button type="button" className="friends-modal__date-nav" onClick={handlePrevDay} aria-label="Previous day">
              <ChevronLeft size={22} />
            </button>
            <div className="friends-modal__date-display">
              <span className="friends-modal__date-text">{formatDateLabel(selectedDate ?? today)}</span>
            </div>
            <button type="button" className="friends-modal__date-nav" onClick={handleNextDay} disabled={!canGoNext} aria-label="Next day">
              <ChevronRight size={22} />
            </button>
          </div>
        </div>

        <div className="friends-modal__scroll">
          {loading ? (
            <div className="friends-modal__loading-wrap">
              <div className="friends-modal__loading-list">
                <span className="friends-modal__spinner" /> Loading…
              </div>
            </div>
          ) : (
            <>
              <ul className="friends-modal__score-list">
                {rankedRows.map((row) => {
                  const color = row.avatarColor || DEFAULT_AVATAR_COLOR
                  const light = lightenColor(color, 15)
                  const letterColor = color === '#424242' ? 'var(--text-on-dark)' : 'var(--text-primary)'
                  const badge = row.avatarBadge && row.avatarBadge !== 'letter' ? getBadgeById(row.avatarBadge) : null
                  const scoreLabel = row.hasScore ? `${row.score}/${row.total}` : null
                  return (
                    <li key={row.uid} className="friends-modal__score-item">
                      <div className="friends-modal__score-rank">
                        {row.rank != null ? row.rank : <span className="friends-modal__score-dot" />}
                      </div>
                      <div
                        className="friends-modal__score-avatar"
                        style={{ background: `linear-gradient(135deg, ${color} 0%, ${light} 100%)` }}
                      >
                        {badge ? (
                          <img src={badge.icon} alt="" className="friends-modal__score-avatar-icon" />
                        ) : (
                          <span className="friends-modal__score-avatar-letter" style={{ color: letterColor }}>
                            {(row.displayName || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="friends-modal__score-name-wrap">
                        <span className="friends-modal__score-name">
                          {row.isCurrentUser ? 'Me' : (row.displayName || '').toLowerCase()}
                        </span>
                      </div>
                      <div className="friends-modal__score-right">
                        <span className="friends-modal__score-value">
                          {row.hasScore ? scoreLabel : <Minus size={16} className="friends-modal__score-pending" aria-label="Not completed yet" />}
                        </span>
                        {row.hasScore && (
                          <div className="friends-modal__score-performance" aria-label={`${row.score} correct, ${row.total - row.score} wrong`}>
                            {Array.from({ length: row.total }, (_, i) =>
                              i < row.score ? (
                                <Check key={i} size={14} className="friends-modal__score-check" />
                              ) : (
                                <X key={i} size={14} className="friends-modal__score-x" />
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="friends-modal__share">
                <button type="button" className="friends-modal__share-btn" onClick={handleShareLink} disabled={!shareUrl || showShareLoading}>
                  {showShareLoading ? (
                    <span className="friends-modal__share-spinner" aria-hidden />
                  ) : copySuccess ? (
                    <>
                      <Check size={18} />
                      Copied!
                    </>
                  ) : showShareFailed ? (
                    <>
                      <X size={18} />
                      Share failed
                    </>
                  ) : (
                    <>
                      <Share2 size={18} />
                      Add friends
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <BaseSlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseStart={onCloseStart}
      title={title}
    >
      {renderBody()}
    </BaseSlideUpModal>
  )
}

export default FriendsModal
