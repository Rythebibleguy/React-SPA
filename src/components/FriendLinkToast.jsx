import { useEffect, useRef } from 'react'
import './FriendLinkToast.css'

function FriendLinkToast({ message, type = 'info', persistent = false, onDismiss }) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!message || persistent) return
    timerRef.current = setTimeout(() => {
      onDismiss?.()
    }, 3000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [message, persistent, onDismiss])

  if (!message) return null

  return (
    <div
      role="status"
      className={`friend-link-toast friend-link-toast--${type} friend-link-toast--visible ${persistent ? 'friend-link-toast--persistent' : ''}`}
      onClick={persistent ? onDismiss : undefined}
      onKeyDown={(e) => persistent && e.key === 'Enter' && onDismiss?.()}
    >
      {type === 'loading' && <span className="friend-link-toast__spinner" aria-hidden />}
      <span className="friend-link-toast__message">{message}</span>
    </div>
  )
}

export default FriendLinkToast
