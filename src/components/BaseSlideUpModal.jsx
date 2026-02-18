import './BaseSlideUpModal.css'
import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Base slide-up modal: bottom sheet with overlay, default header (title + close), content area, and optional footer.
 * The modal provides an empty content container; each use passes its own content as children.
 * Parent should apply *--base-slide-up-modal-active when this modal is open.
 *
 * Ref exposes close() so parents can trigger the same close animation (e.g. after sign-in).
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose - called after close animation
 * @param {() => void} [onCloseStart] - called when close is triggered
 * @param {string} [title='Base'] - header title
 * @param {React.ReactNode} children - content to render inside the default content container
 * @param {React.ReactNode} [footer] - optional fixed bottom content (e.g. Sign Out)
 * @param {boolean} [compact] - if true, sheet height is content-sized instead of 90dvh
 */
const BaseSlideUpModal = forwardRef(function BaseSlideUpModal({ isOpen, onClose, onCloseStart, title = 'Base', children, footer, compact }, ref) {
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
    setTimeout(() => onCloseRef.current(), 300) /* match --modal-duration (0.3s) */
  }

  useImperativeHandle(ref, () => ({
    close: handleClose
  }), [])

  if (!isOpen) return null

  return (
    <div
      className={`base-slide-up-modal__overlay ${isActive ? 'base-slide-up-modal__overlay--active' : ''}`}
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className={`base-slide-up-modal__sheet ${compact ? 'base-slide-up-modal__sheet--compact' : ''}`}>
        <div className="base-slide-up-modal__header">
          <h2 className="base-slide-up-modal__title">{title}</h2>
          <button
            type="button"
            className="base-slide-up-modal__close"
            onClick={handleClose}
            title="Close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="base-slide-up-modal__content">
          {children}
        </div>
        {footer != null && <div className="base-slide-up-modal__footer">{footer}</div>}
      </div>
    </div>
  )
})

export default BaseSlideUpModal
