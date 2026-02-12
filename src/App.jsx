import { useState, useEffect } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import QuizTab from './components/QuizTab'
import FriendsTab from './components/FriendsTab'
import ProfileTab from './components/ProfileTab'
import FriendLinkToast from './components/FriendLinkToast'
import { useViewportUnits } from './hooks/useViewportUnits'
import { useAuth } from './contexts/AuthContext'
import { BASE_DATA_URL } from './config'

const PENDING_FRIEND_KEY = 'pendingFriendUid'

function clearFriendParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete('friend')
  window.history.replaceState({}, document.title, url.pathname + url.search)
  sessionStorage.removeItem(PENDING_FRIEND_KEY)
}

// Clear quiz state on page load (before any components mount)
sessionStorage.removeItem('quizState')
sessionStorage.removeItem('welcomeAnimated')

function App() {
  useViewportUnits()
  const { currentUser, userProfile, addFriend } = useAuth()
  const [currentScreen, setCurrentScreen] = useState(() => {
    if (typeof window === 'undefined') return 'quiz'
    const hasFriend = new URLSearchParams(window.location.search).get('friend') || sessionStorage.getItem(PENDING_FRIEND_KEY)
    return hasFriend ? 'friends' : 'quiz'
  })
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showBottomNav, setShowBottomNav] = useState(false)
  const [welcomeAnimated, setWelcomeAnimated] = useState(() => {
    return sessionStorage.getItem('welcomeAnimated') === 'true'
  })
  const [animationData, setAnimationData] = useState(null)
  const [statisticsAnimationData, setStatisticsAnimationData] = useState(null)
  const [friendsAnimationData, setFriendsAnimationData] = useState(null)
  const [lottieInstance, setLottieInstance] = useState(null)
  const [friendToast, setFriendToast] = useState(null)

  // Load Lottie animations once on app mount
  useEffect(() => {
    // Load Bible animation
    fetch(`${BASE_DATA_URL}/assets/animations/Book with bookmark.json`)
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => {/* Failed to load animation */})
    
    // Load Statistics animation for Profile GuestScreen
    fetch(`${BASE_DATA_URL}/assets/animations/Statistics.json`)
      .then(res => res.json())
      .then(data => setStatisticsAnimationData(data))
      .catch(err => {/* Failed to load animation */})
    // Load Girl animation for Friends tab GuestScreen
    fetch(`${BASE_DATA_URL}/assets/animations/Girl chatting with online friends..json`)
      .then(res => res.json())
      .then(data => setFriendsAnimationData(data))
      .catch(err => {/* Failed to load animation */})
  }, [])

  // Show bottom nav once Lottie DOM is ready (Quiz flow), or immediately when starting on Friends/Profile (e.g. friend link)
  useEffect(() => {
    if (lottieInstance || currentScreen === 'friends' || currentScreen === 'profile') {
      setShowBottomNav(true)
    }
  }, [lottieInstance, currentScreen])

  // Handle ?friend=uid in URL: show toasts and add friend when signed in
  useEffect(() => {
    const friendUid = new URLSearchParams(window.location.search).get('friend') || sessionStorage.getItem(PENDING_FRIEND_KEY)
    if (!friendUid || !friendUid.trim()) return

    if (window.clarity) window.clarity('event', 'friend_link_clicked')

    if (!currentUser) {
      sessionStorage.setItem(PENDING_FRIEND_KEY, friendUid)
      setFriendToast({ message: 'Sign in to connect with your friend!', type: 'info', persistent: true })
      setCurrentScreen('friends')
      return
    }

    if (!userProfile) return

    if (friendUid === currentUser.uid) {
      setFriendToast({ message: "You can't add yourself as a friend!", type: 'error' })
      clearFriendParam()
      return
    }

    const currentFriends = userProfile.friends || []
    if (currentFriends.includes(friendUid)) {
      setFriendToast({ message: "You're already friends!", type: 'info' })
      clearFriendParam()
      return
    }

    if (!friendUid || friendUid.length === 0) {
      setFriendToast({ message: 'Invalid friend link', type: 'error' })
      clearFriendParam()
      return
    }

    clearFriendParam()
    setFriendToast({ message: 'Adding friend...', type: 'loading', persistent: true })

    addFriend(friendUid).then((result) => {
      if (result.success) {
        setFriendToast({ message: 'Friend added successfully!', type: 'success' })
      } else {
        setFriendToast({ message: result.error || 'Failed to add friend. Please try again.', type: 'error' })
      }
    })
  }, [currentUser, userProfile, addFriend])

  // Prevent pinch zoom on mobile
  useEffect(() => {
    const preventPinchZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    const preventGesture = (e) => {
      e.preventDefault()
    }

    document.addEventListener('touchstart', preventPinchZoom, { passive: false })
    document.addEventListener('gesturestart', preventGesture, { passive: false })

    return () => {
      document.removeEventListener('touchstart', preventPinchZoom)
      document.removeEventListener('gesturestart', preventGesture)
    }
  }, [])

  const handleNavigation = (screen) => {
    if (screen === currentScreen) return
    
    setIsTransitioning(true)
    
    setTimeout(() => {
      setCurrentScreen(screen)
      
      setTimeout(() => {
        setIsTransitioning(false)
      }, 10)
    }, 100)
  }

  return (
    <>
      <FriendLinkToast
        message={friendToast?.message}
        type={friendToast?.type}
        persistent={friendToast?.persistent}
        onDismiss={() => setFriendToast(null)}
      />
      {currentScreen === 'quiz' && (
        <QuizTab 
          isTransitioning={isTransitioning} 
          welcomeAnimated={welcomeAnimated}
          setWelcomeAnimated={setWelcomeAnimated}
          animationData={animationData}
          lottieInstance={lottieInstance}
          setLottieInstance={setLottieInstance}
        />
      )}
      {currentScreen === 'friends' && <FriendsTab isTransitioning={isTransitioning} animationData={friendsAnimationData} />}
      {currentScreen === 'profile' && <ProfileTab isTransitioning={isTransitioning} statisticsAnimationData={statisticsAnimationData} />}
      <BottomNav currentScreen={currentScreen} onNavigate={handleNavigation} show={showBottomNav} />
    </>
  )
}

export default App
