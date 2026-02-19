import { useState, useEffect, useRef } from 'react'
import { getTodayString } from '../utils/csvParser'
import { getCachedQuestions, getQuestionsPromise } from '../utils/dataPreloader'
import { BASE_DATA_URL } from '../config'

/**
 * Custom hook to fetch and manage quiz questions from static JSON
 * Uses preloaded data if available, otherwise fetches on demand
 */
export function useQuizData() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    // Prevent double-loading in React Strict Mode
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    // Check if data is already cached
    const cachedQuestions = getCachedQuestions()
    if (cachedQuestions) {
      setQuestions(cachedQuestions)
      setLoading(false)
      return
    }

    // Check if preload is in progress
    const questionsPromise = getQuestionsPromise()
    if (questionsPromise) {
      questionsPromise
        .then(questions => {
          setQuestions(questions)
        })
        .catch(err => {
          console.error('Error loading questions:', err)
          setError(err.message)
        })
        .finally(() => {
          setLoading(false)
        })
      return
    }

    // Fallback: fetch if no preload was started
    const todayString = getTodayString()

    async function loadQuestions() {
      setLoading(true)
      
      try {
        const response = await fetch(`${BASE_DATA_URL}/data/questions.json`)
        if (!response.ok) throw new Error('Failed to fetch questions')
        
        const allQuestions = await response.json()
        const todaysQuestions = allQuestions[todayString] || []
        
        // Shuffle answers for each question
        const shuffledQuestions = todaysQuestions.map(q => ({
          ...q,
          answers: [...q.answers].sort(() => Math.random() - 0.5)
        }))
        
        setQuestions(shuffledQuestions)
      } catch (err) {
        console.error('Error loading questions:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [])

  return { questions, loading, error }
}
