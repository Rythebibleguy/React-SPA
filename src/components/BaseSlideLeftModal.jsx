import './BaseSlideLeftModal.css'
import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'

/**
 * Base slide-left modal: sheet that slides in from the right, with overlay, header (back button), and content area.
 * Blank base; pass children for content.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose - called after close animation
 * @param {() => void} [onCloseStart] - called when close is triggered
 * @param {React.ReactNode} [children] - content to render inside the content container
 */
const BaseSlideLeftModal = forwardRef(function BaseSlideLeftModal({ isOpen, onClose, onCloseStart, children }, ref) {
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
      className={`base-slide-left-modal__overlay ${isActive ? 'base-slide-left-modal__overlay--active' : ''}`}
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="base-slide-left-modal__sheet">
        <div className="base-slide-left-modal__header">
          <button
            type="button"
            className="base-slide-left-modal__back"
            onClick={handleClose}
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
        <div className="base-slide-left-modal__content">
          {children}
        </div>
      </div>
    </div>
  )
})

export default BaseSlideLeftModal
