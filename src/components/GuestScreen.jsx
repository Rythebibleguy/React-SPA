import './GuestScreen.css'
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

function GuestScreen({ onSignIn, animationData, variant = 'profile' }) {
  const { title, description } = COPY[variant] || COPY.profile

  return (
    <div className="guest-screen">
      <div className="guest-screen__content">
        {animationData && (
          <div className={`guest-screen__animation guest-screen__animation--${variant}`}>
            <Lottie
              animationData={animationData}
              loop={true}
              autoplay={true}
            />
          </div>
        )}

        <h2 className="guest-screen__title">{title}</h2>
        <p className="guest-screen__description">{description}</p>

        <div className="guest-screen__actions">
          <button 
            className="guest-screen__primary-btn"
            onClick={onSignIn}
          >
            Create a free account
          </button>

          <button 
            className="guest-screen__secondary-btn"
            onClick={onSignIn}
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  )
}

export default GuestScreen
