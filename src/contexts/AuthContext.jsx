import { createContext, useContext, useEffect, useState } from 'react'
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
  getDoc
} from '../config/firebase'

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
  async function loadUserProfile(user) {
    if (!user) return
    
    try {
      const userRef = doc(firestore, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      
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
      console.error('Error loading user profile:', error)
      setError('Failed to load user profile: ' + error.message)
    }
  }

  // Update user profile data (for quiz completions, etc.)
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
      setCurrentUser(user)
      
      if (user) {
        await loadUserProfile(user)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
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
    setError
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}