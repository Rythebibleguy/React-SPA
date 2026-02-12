import './GuestScreen.css'
import Lottie from 'lottie-react'

function GuestScreen({ onSignIn, animationData }) {

  return (
    <div className="guest-screen">
      <div className="guest-screen__content">
        {animationData && (
          <div className="guest-screen__animation">
            <Lottie
              animationData={animationData}
              loop={true}
              autoplay={true}
            />
          </div>
        )}

        <h2 className="guest-screen__title">
          Ready to track your Bible knowledge?
        </h2>
        
        <p className="guest-screen__description">
          View your streaks, badges and stats as you grow in Biblical understanding.
        </p>

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
