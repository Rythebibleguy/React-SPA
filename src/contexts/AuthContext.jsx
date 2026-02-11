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
  arrayUnion
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

  /**
   * FIREBASE USER PROFILE SCHEMA
   * 
   * Standard user profile structure stored in Firestore.
   * Uses existing legacy field names and formats.
   * 
   * @typedef {Object} UserProfile
   * @property {string} displayName - User's display name (from auth or 'Anonymous')
   * @property {string} avatarColor - Generated color for avatar (e.g. "#74b9ff")
   * @property {string} signUpMethod - How user signed up ("google", "email")
   * @property {string} createdOn - Account creation date as string (YYYY-MM-DD)
   * @property {number} quizzesTaken - Total unique quizzes completed
   * @property {number} totalScore - Sum of all quiz scores
   * @property {number} totalQuestionsAnswered - Total questions across all quizzes
   * @property {number} currentStreak - Current consecutive days with quiz completion
   * @property {number} maxStreak - Highest streak ever achieved
   * @property {Array<Object>} history - Array of completed quizzes:
   *   - {date: string (YYYY-MM-DD), score: number, totalQuestions: number,
   *     timestamp: string (HH:MM), duration: number, answers: Array<number>, shared?: boolean}
   * @property {Array<Object>} badges - Array of unlocked badges:
   *   - {id: string, unlockedOn: string (YYYY-MM-DD)}
   * @property {Array<string>} friends - Array of friend user IDs
   */
  
  // Create or update user profile in Firestore
  async function createUserProfile(user, additionalData = {}) {
    if (!user) {
      return
    }
    const userRef = doc(firestore, 'users', user.uid)
    
    try {
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) {
        const { displayName } = user
        const createdOnDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        
        // Generate random avatar color
        const colors = ['#74b9ff', '#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894', '#e17055']
        const randomColor = colors[Math.floor(Math.random() * colors.length)]
        
        const profileData = {
          displayName: additionalData.displayName || displayName || 'Anonymous',
          avatarColor: additionalData.avatarColor || randomColor,
          signUpMethod: additionalData.signUpMethod || 'google',
          createdOn: createdOnDate,
          quizzesTaken: 0,
          totalScore: 0,
          totalQuestionsAnswered: 0,
          currentStreak: 0,
          maxStreak: 0,
          history: [],
          badges: [],
          friends: [],
          ...additionalData
        }
        
        await setDoc(userRef, profileData)
        setUserProfile(profileData)
      } else {
        const rawData = userSnap.data()
        setUserProfile(rawData)
      }
    } catch (error) {
      setError('Failed to load user profile: ' + error.message)
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
    setError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}