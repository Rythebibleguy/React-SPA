import './AuthScreen.css'
import { Trophy, Users, BarChart3 } from 'lucide-react'

function AuthScreen() {
  const handleGoogleSignIn = () => {
    // TODO: Implement Google sign-in
    console.log('Google sign-in clicked')
  }

  const handleEmailSignIn = () => {
    // TODO: Implement email sign-in
    console.log('Email sign-in clicked')
  }

  return (
    <div className="auth-screen">
      <div className="auth-screen__header">
        <h2 className="auth-screen__title">Sign up to save your progress</h2>
        <p className="auth-screen__subtitle">Create a free account in seconds</p>
      </div>
      
      <div className="auth-screen__features">
        <div className="auth-screen__feature-list">
          <div className="auth-screen__feature">
            <div className="auth-screen__feature-icon auth-screen__feature-icon--trophy">
              <Trophy size={24} strokeWidth={2} />
            </div>
            <div className="auth-screen__feature-text">
              <h3>Track Your Stats</h3>
              <p>See your scores, streaks, and progress over time</p>
            </div>
          </div>
          
          <div className="auth-screen__feature">
            <div className="auth-screen__feature-icon auth-screen__feature-icon--users">
              <Users size={24} strokeWidth={2} />
            </div>
            <div className="auth-screen__feature-text">
              <h3>Add Friends</h3>
              <p>Compare scores and compete with friends</p>
            </div>
          </div>
          
          <div className="auth-screen__feature">
            <div className="auth-screen__feature-icon auth-screen__feature-icon--chart">
              <BarChart3 size={24} strokeWidth={2} />
            </div>
            <div className="auth-screen__feature-text">
              <h3>View History</h3>
              <p>Access your quiz history and review past quizzes</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="auth-screen__actions">
        <button 
          className="auth-screen__btn auth-screen__btn--google"
          onClick={handleGoogleSignIn}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="auth-screen__google-icon">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        
        <button 
          className="auth-screen__btn auth-screen__btn--email"
          onClick={handleEmailSignIn}
        >
          Continue with Email
        </button>
        
        <p className="auth-screen__terms">
          By continuing, you agree to our{' '}
          <a href="https://rythebibleguy.com/terms/" target="_blank" rel="noopener noreferrer">Terms</a>
          {' '}and{' '}
          <a href="https://rythebibleguy.com/privacy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}

export default AuthScreen
