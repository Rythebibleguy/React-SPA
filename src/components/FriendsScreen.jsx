import './FriendsScreen.css'
import { useState, useEffect, useMemo } from 'react'
import { firestore, doc, getDoc } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { getBadgeById } from '../config/badges'
import { getTodayString } from '../utils/csvParser'
import { UserPlus, ChevronLeft, ChevronRight, Check, X, Minus } from 'lucide-react'

const DEFAULT_AVATAR_COLOR = '#64B5F6'

// Cache friend profiles (by friend UIDs) so we don't refetch every time the tab is opened.
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

function dateStringToYMD(dateStr) {
  if (dateStr == null || typeof dateStr !== 'string') return dateStr
  const d = new Date(dateStr + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr, delta) {
  if (dateStr == null || typeof dateStr !== 'string') return dateStr
  const d = new Date(dateStr + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  d.setDate(d.getDate() + delta)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const result = `${y}-${m}-${day}`
  return result
}

function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function FriendsScreen({ onOpenManageFriends }) {
  const { currentUser, userProfile } = useAuth()
  const today = useMemo(() => getTodayString(), [])
  const [selectedDate, setSelectedDate] = useState(() => getTodayString())
  const [friendProfiles, setFriendProfiles] = useState([])
  const [loading, setLoading] = useState(true)

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

  // Load current user + all friends' profiles (with history). Use cache when reopening tab.
  useEffect(() => {
    if (!userProfile || !currentUser) return
    const currentUserRow = buildCurrentUserRow()
    if (!currentUserRow) return

    // Cache hit: same friend list as last load — use cached friend profiles and fresh current user
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
  const canGoPrev = true

  const handlePrevDay = () => {
    setSelectedDate((d) => addDays(d, -1))
  }
  const handleNextDay = () => {
    if (!canGoNext) return
    setSelectedDate((d) => addDays(d, 1))
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

  return (
    <div className="friends-screen">
      <header className="friends-screen__header">
        <h1 className="friends-screen__header-title">Friends</h1>
        <button type="button" className="friends-screen__header-add-btn" onClick={onOpenManageFriends} title="Add friends">
          <UserPlus size={22} />
        </button>
      </header>

      <div className="friends-screen__content">
        <div className="friends-screen__date-row">
          <button type="button" className="friends-screen__date-nav" onClick={handlePrevDay} aria-label="Previous day">
            <ChevronLeft size={22} />
          </button>
          <div className="friends-screen__date-display">
            <span className="friends-screen__date-text">{formatDateLabel(selectedDate ?? today)}</span>
          </div>
          <button type="button" className="friends-screen__date-nav" onClick={handleNextDay} disabled={!canGoNext} aria-label="Next day">
            <ChevronRight size={22} />
          </button>
        </div>

        {loading ? (
          <div className="friends-screen__loading-wrap">
            <div className="friends-screen__loading-list">
              <span className="friends-screen__spinner" /> Loading…
            </div>
          </div>
        ) : (
          <ul className="friends-screen__score-list">
            {rankedRows.map((row) => {
              const color = row.avatarColor || DEFAULT_AVATAR_COLOR
              const light = lightenColor(color, 15)
              const letterColor = color === '#424242' ? 'white' : '#444'
              const badge = row.avatarBadge && row.avatarBadge !== 'letter' ? getBadgeById(row.avatarBadge) : null
              const scoreLabel = row.hasScore ? `${row.score}/${row.total}` : null
              return (
                <li key={row.uid} className="friends-screen__score-item">
                  <div className="friends-screen__score-rank">
                    {row.rank != null ? row.rank : <span className="friends-screen__score-dot" />}
                  </div>
                  <div
                    className="friends-screen__score-avatar"
                    style={{ background: `linear-gradient(135deg, ${color} 0%, ${light} 100%)` }}
                  >
                    {badge ? (
                      <img src={badge.icon} alt="" className="friends-screen__score-avatar-icon" />
                    ) : (
                      <span className="friends-screen__score-avatar-letter" style={{ color: letterColor }}>
                        {(row.displayName || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="friends-screen__score-name-wrap">
                    <span className="friends-screen__score-name">
                      {row.isCurrentUser ? 'Me' : (row.displayName || '').toLowerCase()}
                    </span>
                  </div>
                  <div className="friends-screen__score-right">
                    <span className="friends-screen__score-value">
                      {row.hasScore ? scoreLabel : <Minus size={16} className="friends-screen__score-pending" aria-label="Not completed yet" />}
                    </span>
                    {row.hasScore && (
                      <div className="friends-screen__score-performance" aria-label={`${row.score} correct, ${row.total - row.score} wrong`}>
                        {Array.from({ length: row.total }, (_, i) =>
                          i < row.score ? (
                            <Check key={i} size={14} className="friends-screen__score-check" />
                          ) : (
                            <X key={i} size={14} className="friends-screen__score-x" />
                          )
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && (
          <button type="button" className="friends-screen__manage-btn" onClick={onOpenManageFriends}>
            <UserPlus size={20} />
            Manage friends
          </button>
        )}
      </div>
    </div>
  )
}

export default FriendsScreen
