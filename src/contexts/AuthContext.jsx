import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { 
  auth, 
  firestore, 
  googleProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
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
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)

  // Sign up with email and password
  async function signUp(email, password, displayName) {
    try {
      setError(null)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      // Create user profile in Firestore
      await createUserProfile(result.user, { displayName })
      
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
      
      // Create user profile if needed
      await createUserProfile(result.user)
      
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
      const result = await signOut(auth)
      return result
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Check if displayName already exists
  async function isDisplayNameExists(displayName) {
    try {
      const usersRef = collection(firestore, 'users')
      const q = query(usersRef, where('displayName', '==', displayName))
      const querySnapshot = await getDocs(q)
      return !querySnapshot.empty
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
   * @property {string} displayName - Random username (user12345) for Google signups, custom name for others
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
   * @typedef {Object} UserPrivateData (Private Data - userPrivate/{uid})
   * @property {string|null} email - User's email address from authentication
   * @property {string|null} googlePhotoURL - User's profile photo URL from Google
   * @property {string|null} googleName - User's original name from Google profile (not used as display name)
   * @property {string} signUpMethod - How user signed up ("google", "email")
   * @property {string} timezone - User's timezone in UTC±X format (e.g., "UTC-5", "UTC+0")
   * @property {Object} preferences - User preferences and private settings
   */
  
  // Create or update user profile in Firestore (public + private data)
  async function createUserProfile(user, additionalData = {}) {
    if (!user) {
      return
    }
    
    const userRef = doc(firestore, 'users', user.uid)
    const userPrivateRef = doc(firestore, 'userPrivate', user.uid)
    
    try {
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) {
        // Try to get email from multiple sources
        const userEmail = user.email || auth.currentUser?.email || user.providerData?.[0]?.email || null
        
        const { displayName, photoURL } = user
        const createdOnDate = getTodayString() // YYYY-MM-DD format (local timezone)
        
        // Generate random avatar color
        const colors = ['#74b9ff', '#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894', '#e17055']
        const randomColor = colors[Math.floor(Math.random() * colors.length)]
        
        // Generate random displayName for Google signups, use provided name for others
        const isGoogleSignup = additionalData.signUpMethod === 'google' || !additionalData.signUpMethod
        const publicDisplayName = isGoogleSignup ? 
          await generateRandomDisplayName() : 
          (additionalData.displayName || displayName || 'Anonymous')
        
        // Public profile data (readable by friends)
        const profileData = {
          displayName: publicDisplayName,
          avatarColor: additionalData.avatarColor || randomColor,
          createdOn: createdOnDate,
          quizzesTaken: 0,
          totalScore: 0,
          totalQuestionsAnswered: 0,
          maxStreak: 0,
          history: [],
          badges: [],
          friends: [],
          shares: 0,
          ...additionalData
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
          setDoc(userPrivateRef, privateData)
        ])
        
        setUserProfile(profileData)
      } else {
        const rawData = userSnap.data()
        setUserProfile(rawData)
      }
    } catch (error) {
      setError('Failed to load user profile: ' + error.message)
    }
  }

  // Get user's private data (email, preferences, etc.)
  async function getUserPrivateData(userId = null) {
    const uid = userId || currentUser?.uid
    if (!uid) return null
    
    try {
      const privateRef = doc(firestore, 'userPrivate', uid)
      const privateSnap = await getDoc(privateRef)
      return privateSnap.exists() ? privateSnap.data() : null
    } catch (error) {
      return null
    }
  }

  // Update user's private data
  async function updateUserPrivateData(updates) {
    if (!currentUser) return
    
    try {
      const privateRef = doc(firestore, 'userPrivate', currentUser.uid)
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
    } catch (error) {
      // Ignore AbortError - this is expected when requests are cancelled
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return
      }
      setError('Failed to load user profile: ' + error.message)
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
    
    try {
      const userRef = doc(firestore, 'users', currentUser.uid)
      await updateDoc(userRef, updates)
      
      // Update local state
      setUserProfile(prev => ({ ...prev, ...updates }))
    } catch (error) {
      throw error
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
        setLoading(false) // Set loading false immediately after auth state is determined
        
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController()
        // Load profile in background - don't block app rendering
        loadUserProfile(user, abortControllerRef.current)
      } else {
        setCurrentUser(null)
        setUserProfile(null)
        setLoading(false)
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
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    updateUserProfile,
    completeQuiz,
    getUserPrivateData,
    updateUserPrivateData,
    setError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}