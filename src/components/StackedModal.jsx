import './StackedModal.css'
import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Base stacked modal: bottom sheet with overlay, close button, and optional footer.
 * Use for Auth, Settings, Manage Friends, etc. Parent should apply *--stacked-modal-active
 * to its container when this modal is open (e.g. profile-tab--stacked-modal-active).
 *
 * Ref exposes close() so parents can trigger the same close animation (e.g. after sign-in).
 *
 * Callers must pass a single content container as children (with flex: 1, overflow-y: auto, etc.).
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose - called after close animation
 * @param {() => void} [onCloseStart] - called when close is triggered (e.g. to set stacked state false)
 * @param {React.ReactNode} children - main content (one scrollable container)
 * @param {React.ReactNode} [footer] - optional fixed bottom content (e.g. Sign Out)
 */
const StackedModal = forwardRef(function StackedModal({ isOpen, onClose, onCloseStart, children, footer }, ref) {
  const [isActive, setIsActive] = useState(false)
  const onCloseRef = useRef(onClose)
  const onCloseStartRef = useRef(onCloseStart)
  onCloseRef.current = onClose
  onCloseStartRef.current = onCloseStart

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsActive(true))
    }
  }, [isOpen])

  const handleClose = () => {
    setIsActive(false)
    onCloseStartRef.current?.()
    setTimeout(() => onCloseRef.current(), 400)
  }

  useImperativeHandle(ref, () => ({
    close: handleClose
  }), [])

  if (!isOpen) return null

  return (
    <div
      className={`stacked-modal__overlay ${isActive ? 'stacked-modal__overlay--active' : ''}`}
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="stacked-modal__sheet">
        <button
          type="button"
          className="stacked-modal__close"
          onClick={handleClose}
          title="Close"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        {children}
        {footer != null && <div className="stacked-modal__footer">{footer}</div>}
      </div>
    </div>
  )
})

export default StackedModal
