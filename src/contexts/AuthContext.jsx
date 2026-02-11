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
  const [loading, setLoading] = useState(true)
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
      return await signInWithEmailAndPassword(auth, email, password)
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
      
      // Check if user profile exists, create if not
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
      return await signOut(auth)
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Migrate old profile data structure to new format
  function migrateProfileData(oldData) {
    // Calculate score distribution from history array
    const scoreDistribution = [
      { score: 4, count: 0, label: 'Perfect' },
      { score: 3, count: 0, label: '3 Right' },
      { score: 2, count: 0, label: '2 Right' },
      { score: 1, count: 0, label: '1 Right' },
      { score: 0, count: 0, label: '0 Right' }
    ]
    
    // Count scores from history if available
    if (oldData.history && Array.isArray(oldData.history)) {
      oldData.history.forEach(quiz => {
        if (quiz.score !== undefined) {
          const scoreIndex = scoreDistribution.findIndex(s => s.score === quiz.score)
          if (scoreIndex !== -1) {
            scoreDistribution[scoreIndex].count++
          }
        }
      })
    }
    
    // Calculate average score percentage
    const averageScore = oldData.totalQuestionsAnswered > 0 ? 
      Math.round((oldData.totalScore / oldData.totalQuestionsAnswered) * 100) : 0
    
    const migratedData = {
      // Keep existing fields that match
      displayName: oldData.displayName || 'User',
      email: oldData.email,
      photoURL: oldData.photoURL || null,
      avatarColor: oldData.avatarColor,
      createdAt: oldData.createdAt || oldData.createdOn,
      signUpMethod: oldData.signUpMethod,
      
      // Map old fields to new structure 
      totalQuizzesCompleted: oldData.quizzesTaken || 0,
      averageScore: averageScore,
      currentStreak: oldData.currentStreak || 0,
      maxStreak: oldData.maxStreak || 0,
      shares: oldData.shares || 0,
      
      // Use calculated score distribution
      scoreDistribution: scoreDistribution,
      
      // Map history and preserve all quiz data
      quizHistory: oldData.history || [],
      badges: oldData.badges || [],
      friends: oldData.friends || [],
      
      // Preserve any other existing data
      totalScore: oldData.totalScore,
      totalQuestionsAnswered: oldData.totalQuestionsAnswered,
      ...oldData
    }
    
    return migratedData
  }

  // Create or update user profile in Firestore
  async function createUserProfile(user, additionalData = {}) {
    if (!user) return
    
    const userRef = doc(firestore, 'users', user.uid)
    
    try {
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) {
        const { displayName, email, photoURL } = user
        const createdAt = new Date()
        
        const profileData = {
          displayName: additionalData.displayName || displayName || 'Anonymous',
          email,
          photoURL: photoURL || null,
          createdAt,
          totalQuizzesCompleted: 0,
          averageScore: 0,
          currentStreak: 0,
          maxStreak: 0,
          shares: 0,
          scoreDistribution: [
            { score: 4, count: 0, label: 'Perfect' },
            { score: 3, count: 0, label: '3 Right' },
            { score: 2, count: 0, label: '2 Right' },
            { score: 1, count: 0, label: '1 Right' },
            { score: 0, count: 0, label: '0 Right' }
          ],
          quizHistory: [],
          badges: [],
          friends: [],
          ...additionalData
        }
        
        await setDoc(userRef, profileData)
        setUserProfile(profileData)
      } else {
        const rawData = userSnap.data()
        
        // Check if this is old format data that needs migration
        const hasNewFormat = rawData.hasOwnProperty('totalQuizzesCompleted')
        
        if (hasNewFormat) {
          setUserProfile(rawData)
        } else {
          const migratedData = migrateProfileData(rawData)
          
          // Save the migrated data back to Firestore
          try {
            await setDoc(userRef, migratedData, { merge: true })
            setUserProfile(migratedData)
          } catch (error) {
            console.error('Error saving migrated data:', error)
            // Still use the migrated data locally even if save fails
            setUserProfile(migratedData)
          }
        }
      }
    } catch (error) {
      console.error('Error in createUserProfile:', error)
      setError('Failed to load user profile: ' + error.message)
    }
  }

  // Load user profile from Firestore
  async function loadUserProfile(user, abortController = null) {
    if (!user) return
    
    try {
      const userRef = doc(firestore, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      
      // Check if request was aborted
      if (abortController?.signal.aborted) {
        return
      }
      
      if (userSnap.exists()) {
        const rawData = userSnap.data()
        
        // Check if this is old format data that needs migration
        const hasNewFormat = rawData.hasOwnProperty('totalQuizzesCompleted')
        
        if (hasNewFormat) {
          setUserProfile(rawData)
        } else {
          const migratedData = migrateProfileData(rawData)
          setUserProfile(migratedData)
        }
      } else {
        setUserProfile(null)
      }
    } catch (error) {
      // Ignore AbortError - this is expected when requests are cancelled
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return
      }
      console.error('Error loading user profile:', error)
      setError('Failed to load user profile: ' + error.message)
    }
  }

  // Complete quiz and update user profile with streaks, badges, and stats
  async function completeQuiz(score, totalQuestions, duration, selectedAnswers) {
    if (!currentUser || !userProfile) return { success: false, error: 'Not logged in' }
    
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
      const existingHistory = userProfile.quizHistory || []
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
      const newTotalQuizzesCompleted = alreadyCompleted ? 
        userProfile.totalQuizzesCompleted : 
        (userProfile.totalQuizzesCompleted || 0) + 1
      
      // Update score distribution
      const newScoreDistribution = [...(userProfile.scoreDistribution || [])]
      const scoreEntry = newScoreDistribution.find(s => s.score === score)
      if (scoreEntry && !alreadyCompleted) {
        scoreEntry.count += 1
      }
      
      // Calculate average score
      const totalScore = alreadyCompleted ? 
        userProfile.averageScore * userProfile.totalQuizzesCompleted : 
        (userProfile.averageScore * (userProfile.totalQuizzesCompleted || 0)) + score
      const newAverageScore = Math.round((totalScore / newTotalQuizzesCompleted) * 100) / 100
      
      // Check for newly unlocked badges
      const statsForBadgeCheck = {
        quizzesTaken: newTotalQuizzesCompleted,
        maxStreak: newMaxStreak,
        currentStreak: newStreak,
        history: fullHistory,
        shares: userProfile.shares || 0
      }
      
      const newlyUnlockedBadges = checkNewlyUnlockedBadges(
        userProfile,
        statsForBadgeCheck,
        dateKey
      )
      
      const updatedBadges = [...(userProfile.badges || []), ...newlyUnlockedBadges]
      
      // Prepare complete profile update
      const profileUpdates = {
        quizHistory: fullHistory,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        totalQuizzesCompleted: newTotalQuizzesCompleted,
        averageScore: newAverageScore,
        scoreDistribution: newScoreDistribution,
        badges: updatedBadges
      }
      
      // Update local state immediately for instant UI feedback
      setUserProfile(prev => ({ ...prev, ...profileUpdates }))
      
      // Push to Firebase in background (non-blocking)
      const userRef = doc(firestore, 'users', currentUser.uid)
      const firebaseUpdates = {
        quizHistory: fullHistory,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        totalQuizzesCompleted: newTotalQuizzesCompleted,
        averageScore: newAverageScore,
        scoreDistribution: newScoreDistribution
      }
      
      // Add newly unlocked badges to Firebase update if any exist
      if (newlyUnlockedBadges.length > 0) {
        firebaseUpdates.badges = arrayUnion(...newlyUnlockedBadges)
      }
      
      // Background Firebase sync with error handling
      updateDoc(userRef, firebaseUpdates).catch(error => {
        console.error('Error syncing quiz completion to Firebase:', error)
        // Don't throw - local state is already updated
      })
      
      return { 
        success: true, 
        newlyUnlockedBadges,
        newStreak,
        newMaxStreak
      }
      
    } catch (error) {
      console.error('Error completing quiz:', error)
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
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      setCurrentUser(user)
      setLoading(false) // Set loading false immediately after auth state is determined
      
      if (user) {
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController()
        // Load profile in background - don't block app rendering
        loadUserProfile(user, abortControllerRef.current)
      } else {
        setUserProfile(null)
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