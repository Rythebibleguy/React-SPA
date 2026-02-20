import './GuestModal.css'
import { useState } from 'react'
import BaseSlideUpModal from './BaseSlideUpModal'
import BaseSlideLeftModal from './BaseSlideLeftModal'
import AuthModal from './AuthModal'
import Lottie from 'lottie-react'

const COPY = {
  profile: {
    title: 'Ready to track your Bible progress?',
    description: 'View your streaks, badges and stats as you grow in Biblical understanding.'
  },
  friends: {
    title: 'Ready to play with friends?',
    description: 'Keep up with friends and play the daily quiz together.'
  }
}

function GuestModal({
  isOpen,
  onClose,
  onCloseStart,
  title = 'Sign in',
  variant = 'profile',
  animationData,
  onSignIn
}) {
  const { title: copyTitle, description } = COPY[variant] || COPY.profile
  const [slideLeftOpen, setSlideLeftOpen] = useState(false)

  return (
    <BaseSlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseStart={onCloseStart}
      title={title}
    >
      <div className="guest-modal__content">
        {animationData && variant === 'profile' && (
          <div className={`guest-modal__animation guest-modal__animation--${variant}`}>
            <Lottie
              animationData={animationData}
              loop={true}
              autoplay={true}
            />
          </div>
        )}
        {variant === 'friends' && (
          <div className="guest-modal__graphic">
            <img src={`${import.meta.env.BASE_URL}assets/images/friends-graphic.png`} alt="" className="guest-modal__graphic-img" />
          </div>
        )}

        <h2 className="guest-modal__title">{copyTitle}</h2>
        <p className="guest-modal__description">{description}</p>

        <div className="guest-modal__actions">
          <button
            type="button"
            className="guest-modal__primary-btn"
            onClick={() => setSlideLeftOpen(true)}
          >
            Create a free account
          </button>
          <button
            type="button"
            className="guest-modal__secondary-btn"
            onClick={() => setSlideLeftOpen(true)}
          >
            Log In
          </button>
        </div>
      </div>

      <BaseSlideLeftModal
        isOpen={slideLeftOpen}
        onClose={() => setSlideLeftOpen(false)}
      >
        <AuthModal onClose={() => setSlideLeftOpen(false)} />
      </BaseSlideLeftModal>
    </BaseSlideUpModal>
  )
}

export default GuestModal
