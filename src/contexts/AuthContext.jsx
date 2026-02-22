import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { usePostHog } from 'posthog-js/react'
import { 
  auth, 
  firestore, 
  googleProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs
} from '../config/firebase'
import { 
  checkNewlyUnlockedBadges, 
  calculateCurrentStreakFromHistory, 
  getTodayString 
} from '../config/badges'

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const posthog = usePostHog()
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [userPrivateData, setUserPrivateData] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)

  // Sign up with email and password
  async function signUp(email, password, displayName) {
    try {
      setError(null)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      // Create user profile in Firestore
      await createUserProfile(result.user, { displayName, signUpMethod: 'email' })
      
      posthog?.capture('email_signup_completed')
      if (window.clarity) {
        window.clarity("event", "signup_email")
      }
      
      return result
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Sign in with email and password
  async function signIn(email, password) {
    try {
      setError(null)
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Sign in with Google
  async function signInWithGoogle() {
    try {
      setError(null)
      const result = await signInWithPopup(auth, googleProvider)
      
      // Create user profile if needed; returns true if new user was created
      const isNewUser = await createUserProfile(result.user)
      if (isNewUser) {
        posthog?.capture('google_signup_completed')
      }
      if (window.clarity) {
        window.clarity("event", "signup_google")
      }
      
      return result
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Sign out
  async function logout() {
    try {
      setError(null)
      setUserProfile(null)
      setUserPrivateData(null)
      const result = await signOut(auth)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Check if email already exists
  async function checkEmailExists(email) {
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email)
      return signInMethods.length > 0
    } catch (error) {
      throw error
    }
  }

  // Check if displayName already exists (case-insensitive: "ryan" and "ryAn" are the same)
  async function isDisplayNameExists(displayName) {
    try {
      const normalized = (displayName || '').trim().toLowerCase()
      if (!normalized) return false
      const usersRef = collection(firestore, 'users')
      const q = query(usersRef, where('displayNameLower', '==', normalized))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) return true
      // Legacy: users created before displayNameLower may only have displayName; check that too
      const qLegacy = query(usersRef, where('displayName', '==', normalized))
      const snapshotLegacy = await getDocs(qLegacy)
      return !snapshotLegacy.empty
    } catch (error) {
      return false // If error, assume displayName doesn't exist
    }
  }

  // Generate unique random displayName
  async function generateRandomDisplayName() {
    let attempts = 0
    const maxAttempts = 50 // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      const randomNumber = Math.floor(Math.random() * 99999) + 1
      const displayName = `user${randomNumber.toString().padStart(5, '0')}`
      
      const exists = await isDisplayNameExists(displayName)
      if (!exists) {
        return displayName
      }
      
      attempts++
    }
    
    // Fallback: add timestamp if all attempts failed
    const timestamp = Date.now().toString().slice(-5)
    return `user${timestamp}`
  }

  /**
   * FIREBASE USER PROFILE SCHEMA
   * 
   * @typedef {Object} UserProfile (Public Profile - users/{uid})
   * @property {string} displayName - Display name as entered by user (any casing)
   * @property {string} displayNameLower - Lowercase copy for case-insensitive uniqueness checks
   * @property {string} avatarColor - Generated color for avatar (e.g. "#74b9ff")
   * @property {string} createdOn - Account creation date as string (YYYY-MM-DD)
   * @property {number} quizzesTaken - Total unique quizzes completed
   * @property {number} totalScore - Sum of all quiz scores
   * @property {number} totalQuestionsAnswered - Total questions across all quizzes
   * @property {number} currentStreak - Current consecutive days with quiz completion (calculated from history)
   * @property {number} maxStreak - Highest streak ever achieved
   * @property {Array<Object>} history - Array of completed quizzes:
   *   - {date: string (YYYY-MM-DD), score: number, totalQuestions: number,
   *     timestamp: string (HH:MM), duration: number, answers: Array<number>, shared?: boolean}
   * @property {Array<Object>} badges - Array of unlocked badges:
   *   - {id: string, unlockedOn: string (YYYY-MM-DD)}
   * @property {Array<string>} friends - Array of friend user IDs
   * 
   * @typedef {Object} UserPrivateData (Private Data - usersPrivate/{uid})
   * @property {string|null} email - User's email address from authentication
   * @property {string|null} googlePhotoURL - User's profile photo URL from Google
   * @property {string|null} googleName - User's original name from Google profile (not used as display name)
   * @property {string} signUpMethod - How user signed up ("google", "email")
   * @property {string} timezone - User's timezone in UTC±X format (e.g., "UTC-5", "UTC+0")
   * @property {Object} preferences - User preferences and private settings
   */
  
  // Create or update user profile in Firestore (public + private data). Returns true if a new profile was created.
  async function createUserProfile(user, additionalData = {}) {
    if (!user) {
      return false
    }
    
    const userRef = doc(firestore, 'users', user.uid)
    const usersPrivateRef = doc(firestore, 'usersPrivate', user.uid)
    
    try {
      const userSnap = await getDoc(userRef)
      const isNewUser = !userSnap.exists()
      
      if (!userSnap.exists()) {
        // Try to get email from multiple sources
        const userEmail = user.email || auth.currentUser?.email || user.providerData?.[0]?.email || null
        
        const { displayName, photoURL } = user
        const createdOnDate = getTodayString() // YYYY-MM-DD format (local timezone)
        
        // Default avatar color (Sky Blue)
        const defaultColor = '#64B5F6'
        
        // Generate random displayName for Google signups, use provided name for others (stored as entered; displayNameLower for case-insensitive uniqueness)
        const isGoogleSignup = additionalData.signUpMethod === 'google' || !additionalData.signUpMethod
        const rawName = isGoogleSignup ? await generateRandomDisplayName() : (additionalData.displayName || displayName || 'Anonymous')
        const publicDisplayName = rawName.trim()
        
        // Public profile data (readable by friends) — only public fields; do not spread additionalData (signUpMethod etc. go to usersPrivate only)
        const profileData = {
          displayName: publicDisplayName,
          displayNameLower: publicDisplayName.toLowerCase(),
          avatarColor: additionalData.avatarColor || defaultColor,
          avatarBadge: 'letter', // Badge ID to display in avatar ('letter' = show initial)
          createdOn: createdOnDate,
          quizzesTaken: 0,
          totalScore: 0,
          totalQuestionsAnswered: 0,
          maxStreak: 0,
          history: [],
          badges: [
            {
              id: 'avatar-unlocked',
              unlockedOn: createdOnDate
            }
          ],
          friends: [],
          shares: 0
        }
        
        // Private data (only readable by owner)
        const timezoneOffset = -new Date().getTimezoneOffset() / 60 // Convert to hours with correct sign
        const timezoneString = `UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`
        
        const privateData = {
          email: userEmail,
          googlePhotoURL: photoURL || null,
          googleName: displayName || null,
          signUpMethod: additionalData.signUpMethod || 'google',
          timezone: timezoneString,
          preferences: {}
        }
        
        // Create both documents
        await Promise.all([
          setDoc(userRef, profileData),
          setDoc(usersPrivateRef, privateData)
        ])
        
        setUserProfile(profileData)
      } else {
        const rawData = userSnap.data()
        setUserProfile(rawData)
      }
      return isNewUser
    } catch (error) {
      setError('Failed to load user profile: ' + error.message)
      return false
    }
  }

  // Get user's private data (email, preferences, etc.)
  async function getUserPrivateData(userId = null) {
    const uid = userId || currentUser?.uid
    if (!uid) return null
    
    try {
      const privateRef = doc(firestore, 'usersPrivate', uid)
      const privateSnap = await getDoc(privateRef)
      return privateSnap.exists() ? privateSnap.data() : null
    } catch (error) {
      return null
    }
  }

  // Load and store user's private data in context (for profile modal, etc.)
  async function loadUserPrivateData() {
    if (!currentUser?.uid) return null
    try {
      const data = await getUserPrivateData(currentUser.uid)
      setUserPrivateData(data)
      return data
    } catch (error) {
      return null
    }
  }

  // Update user's private data
  async function updateUserPrivateData(updates) {
    if (!currentUser) return
    
    try {
      const privateRef = doc(firestore, 'usersPrivate', currentUser.uid)
      await updateDoc(privateRef, updates)
    } catch (error) {
      throw error
    }
  }

  // Load user profile from Firestore
  async function loadUserProfile(user, abortController = null) {
    if (!user) {
      return
    }
    
    try {
      const userRef = doc(firestore, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      
      // Check if request was aborted
      if (abortController?.signal.aborted) {
        return
      }
      
      if (userSnap.exists()) {
        const rawData = userSnap.data()
        setUserProfile(rawData)
      } else {
        setUserProfile(null)
      }
      setProfileLoaded(true)
      if (window.__perfLog) window.__perfLog('profile fetch finished')
    } catch (error) {
      // Ignore AbortError - this is expected when requests are cancelled
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return
      }
      setError('Failed to load user profile: ' + error.message)
      setProfileLoaded(true)
      if (window.__perfLog) window.__perfLog('profile fetch finished')
    }
  }

  // Complete quiz and update user profile with streaks, badges, and stats
  async function completeQuiz(score, totalQuestions, duration, selectedAnswers) {
    if (!currentUser || !userProfile) {
      return { success: false, error: 'Not logged in' }
    }
    
    try {
      const dateKey = getTodayString()
      const now = new Date()
      const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      
      // Create history entry for this quiz
      const historyEntry = {
        date: dateKey,
        score,
        totalQuestions,
        timestamp,
        duration,
        answers: selectedAnswers,
        shared: false
      }
      
      // Get existing history and check if today's quiz already exists
      const existingHistory = userProfile.history || []
      const todayEntryIndex = existingHistory.findIndex(entry => entry.date === dateKey)
      const alreadyCompleted = todayEntryIndex >= 0
      
      // Build complete history (existing + new entry)
      let fullHistory
      if (alreadyCompleted) {
        fullHistory = [...existingHistory]
        fullHistory[todayEntryIndex] = {
          ...fullHistory[todayEntryIndex],
          duration,
          answers: selectedAnswers
        }
      } else {
        fullHistory = [...existingHistory, historyEntry]
      }
      
      // Calculate streak from history
      const newStreak = calculateCurrentStreakFromHistory(fullHistory)
      const newMaxStreak = Math.max(newStreak, userProfile.maxStreak || 0)
      
      // Calculate total stats
      const newQuizzesTaken = alreadyCompleted ? 
        userProfile.quizzesTaken : 
        (userProfile.quizzesTaken || 0) + 1
      
      const newTotalScore = alreadyCompleted ?
        userProfile.totalScore :
        (userProfile.totalScore || 0) + score
        
      const newTotalQuestionsAnswered = alreadyCompleted ?
        userProfile.totalQuestionsAnswered :
        (userProfile.totalQuestionsAnswered || 0) + totalQuestions
      
      // Check for newly unlocked badges
      const statsForBadgeCheck = {
        quizzesTaken: newQuizzesTaken,
        maxStreak: newMaxStreak,
        currentStreak: newStreak,
        history: fullHistory,
        shares: 0 // Legacy profiles don't track shares
      }
      
      const newlyUnlockedBadges = checkNewlyUnlockedBadges(
        userProfile,
        statsForBadgeCheck,
        dateKey
      )
      
      const updatedBadges = [...(userProfile.badges || []), ...newlyUnlockedBadges]
      
      // Prepare complete profile update
      const profileUpdates = {
        history: fullHistory,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        quizzesTaken: newQuizzesTaken,
        totalScore: newTotalScore,
        totalQuestionsAnswered: newTotalQuestionsAnswered,
        badges: updatedBadges
      }
      
      // Update local state immediately for instant UI feedback
      setUserProfile(prev => ({ ...prev, ...profileUpdates }))
      
      // Push to Firebase in background (non-blocking)
      const userRef = doc(firestore, 'users', currentUser.uid)
      const firebaseUpdates = {
        history: fullHistory,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        quizzesTaken: newQuizzesTaken,
        totalScore: newTotalScore,
        totalQuestionsAnswered: newTotalQuestionsAnswered
      }
      
      // Add newly unlocked badges to Firebase update if any exist
      if (newlyUnlockedBadges.length > 0) {
        firebaseUpdates.badges = arrayUnion(...newlyUnlockedBadges)
      }
      
      // Background Firebase sync with error handling
      updateDoc(userRef, firebaseUpdates).catch(error => {
        // Don't throw - local state is already updated
      })
      
      return { 
        success: true, 
        newlyUnlockedBadges,
        newStreak,
        newMaxStreak
      }
      
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  
  // Update user profile data (for other updates like sharing)
  async function updateUserProfile(updates) {
    if (!currentUser) return

    // When displayName is updated, also set displayNameLower so case-insensitive uniqueness checks work
    const applied = { ...updates }
    if (Object.prototype.hasOwnProperty.call(applied, 'displayName')) {
      const trimmed = (applied.displayName ?? '').trim()
      applied.displayName = trimmed
      applied.displayNameLower = trimmed.toLowerCase()
    }

    // Update local state immediately for instant feedback
    setUserProfile(prev => ({ ...prev, ...applied }))

    // Then update Firebase in background
    try {
      const userRef = doc(firestore, 'users', currentUser.uid)
      await updateDoc(userRef, applied)
    } catch (error) {
      // Revert local state on error
      setUserProfile(prev => {
        const reverted = { ...prev }
        Object.keys(applied).forEach(key => delete reverted[key])
        return reverted
      })
      throw error
    }
  }

  // Add friend (mutual). Call after validating not self and not already friends.
  async function addFriend(friendUid) {
    if (!currentUser || !userProfile) return { success: false, error: 'Not logged in' }
    if (friendUid === currentUser.uid) return { success: false, error: "Can't add yourself" }
    const currentFriends = userProfile.friends || []
    if (currentFriends.includes(friendUid)) return { success: false, error: 'Already friends' }
    try {
      const currentUserRef = doc(firestore, 'users', currentUser.uid)
      const friendUserRef = doc(firestore, 'users', friendUid)
      await Promise.all([
        updateDoc(currentUserRef, { friends: arrayUnion(friendUid) }),
        updateDoc(friendUserRef, { friends: arrayUnion(currentUser.uid) })
      ])
      await loadUserProfile(currentUser)
      if (window.clarity) window.clarity('event', 'friendship_created')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Remove friend (mutual).
  async function removeFriend(friendUid) {
    if (!currentUser || !userProfile) return { success: false, error: 'Not logged in' }
    const currentFriends = (userProfile.friends || []).filter(uid => uid !== friendUid)
    if (currentFriends.length === userProfile.friends?.length) return { success: false, error: 'Not friends' }
    try {
      const currentUserRef = doc(firestore, 'users', currentUser.uid)
      await updateDoc(currentUserRef, { friends: currentFriends })
      const friendRef = doc(firestore, 'users', friendUid)
      const friendSnap = await getDoc(friendRef)
      if (friendSnap.exists()) {
        const friendData = friendSnap.data()
        const friendUpdated = (friendData.friends || []).filter(uid => uid !== currentUser.uid)
        await updateDoc(friendRef, { friends: friendUpdated })
      }
      await loadUserProfile(currentUser)
      if (window.clarity) window.clarity('event', 'friendship_removed')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      if (user) {
        setCurrentUser(user)
        setProfileLoaded(false)
        setLoading(false) // Set loading false immediately after auth state is determined
        if (window.__perfLog) {
          window.__perfLog('auth completed (user)')
          if (window.__perfTimings) window.__perfTimings.auth_type = 'user'
        }
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController()
        // Load profile in background - don't block app rendering
        loadUserProfile(user, abortControllerRef.current)
      } else {
        setCurrentUser(null)
        setUserProfile(null)
        setUserPrivateData(null)
        setProfileLoaded(true) // No user = "profile" ready (guest)
        setLoading(false)
        if (window.__perfLog) {
          window.__perfLog('auth completed (guest)')
          if (window.__perfTimings) window.__perfTimings.auth_type = 'guest'
        }
      }
    })

    return () => {
      // Cancel any pending requests on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      unsubscribe()
    }
  }, [])

  const value = {
    currentUser,
    userProfile,
    userPrivateData,
    profileLoaded,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    checkEmailExists,
    updateUserProfile,
    addFriend,
    removeFriend,
    completeQuiz,
    getUserPrivateData,
    loadUserPrivateData,
    updateUserPrivateData,
    setError,
    isDisplayNameExists
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}