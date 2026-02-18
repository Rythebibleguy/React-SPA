import './AuthModal.css'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { Mail } from 'lucide-react'

/**
 * Auth content for use inside BaseSlideLeftModal (e.g. from GuestModal).
 * Renders login/signup/email/Google UI only; parent owns the slide-out chrome and onClose.
 */
function AuthModal({ onClose }) {
  const { signInWithGoogle, signIn, signUp, checkEmailExists, error, setError } = useAuth()
  const [loadingAction, setLoadingAction] = useState(null) // 'email', 'google', 'login', 'signup'
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  const handleGoogleSignIn = async () => {
    try {
      setLoadingAction('google')
      setError(null)
      await signInWithGoogle()
      onClose?.()
    } catch (error) {
      // Error is handled by auth context
    } finally {
      setLoadingAction(null)
    }
  }

  const handleEmailContinue = async () => {
    if (!email) {
      setError('Please enter your email')
      return
    }

    try {
      setLoadingAction('email')
      setError(null)
      
      // Check if email exists
      const emailExists = await checkEmailExists(email)
      
      if (emailExists) {
        // Show login form
        setShowLogin(true)
        setShowSignup(false)
      } else {
        // Show signup form
        setShowSignup(true)
        setShowLogin(false)
      }
    } catch (error) {
      setError('Unable to check email. Please try again.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoadingAction('login')
      setError(null)
      await signIn(email, password)
      onClose?.()
    } catch (error) {
      // Error is handled by auth context
    } finally {
      setLoadingAction(null)
    }
  }

  const handleSignup = async () => {
    if (!email || !password || !displayName) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoadingAction('signup')
      setError(null)
      await signUp(email, password, displayName)
      onClose?.()
    } catch (error) {
      // Error is handled by auth context
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="auth-modal__content">
          <h2 className="auth-modal__title">Log in or create an account</h2>
          <p className="auth-modal__subtitle">
            By continuing, you agree to the{' '}
            <a href="https://rythebibleguy.com/terms/" target="_blank" rel="noopener noreferrer">Terms of Service</a>
            {' '}and{' '}
            <a href="https://rythebibleguy.com/privacy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </p>

          {/* Email Section (Always Visible) */}
          <div className="auth-modal__email-section">
            <label className="auth-modal__label" htmlFor="auth-email">Email address</label>
            <input
              type="email"
              id="auth-email"
              className="auth-modal__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={showLogin || showSignup}
            />
            {!showLogin && !showSignup && (
              <button 
                className={`auth-modal__btn auth-modal__btn--primary ${loadingAction === 'email' ? 'auth-modal__btn--loading' : ''}`}
                onClick={handleEmailContinue}
                disabled={loadingAction !== null}
              >
                {loadingAction === 'email' ? <span className="auth-modal__spinner"></span> : (<><Mail size={20} /> Continue with email</>)}
              </button>
            )}
          </div>

          {/* Login Container */}
          {showLogin && (
            <div className="auth-modal__auth-container">
              <label className="auth-modal__label" htmlFor="auth-login-password">Password</label>
              <input
                type="password"
                id="auth-login-password"
                className="auth-modal__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button 
                className={`auth-modal__btn auth-modal__btn--primary ${loadingAction === 'login' ? 'auth-modal__btn--loading' : ''}`}
                onClick={handleLogin}
                disabled={loadingAction !== null}
              >
                {loadingAction === 'login' ? <span className="auth-modal__spinner"></span> : 'Log In'}
              </button>
            </div>
          )}

          {/* Signup Container */}
          {showSignup && (
            <div className="auth-modal__auth-container">
              <label className="auth-modal__label" htmlFor="auth-signup-name">Display Name</label>
              <input
                type="text"
                id="auth-signup-name"
                className="auth-modal__input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                maxLength={15}
              />
              <label className="auth-modal__label" htmlFor="auth-signup-password">Create Password</label>
              <input
                type="password"
                id="auth-signup-password"
                className="auth-modal__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button 
                className={`auth-modal__btn auth-modal__btn--primary ${loadingAction === 'signup' ? 'auth-modal__btn--loading' : ''}`}
                onClick={handleSignup}
                disabled={loadingAction !== null}
              >
                {loadingAction === 'signup' ? <span className="auth-modal__spinner"></span> : 'Sign Up'}
              </button>
            </div>
          )}

          {error && <div className="auth-modal__error">{error}</div>}

          {!showLogin && !showSignup && (
            <>
              <div className="auth-modal__divider">
                <span>OR</span>
              </div>

              <div className="auth-modal__social-btns">
                <button 
                  className={`auth-modal__btn auth-modal__btn--outline ${loadingAction === 'google' ? 'auth-modal__btn--loading' : ''}`}
                  onClick={handleGoogleSignIn}
                  disabled={loadingAction !== null}
                >
                  {loadingAction === 'google' ? (
                    <span className="auth-modal__spinner"></span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
              </div>
            </>
          )}
    </div>
  )
}

export default AuthModal
