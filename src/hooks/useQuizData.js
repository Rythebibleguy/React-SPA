import { useState, useEffect, useRef } from 'react'
import { getTodayString } from '../utils/csvParser'

/**
 * Custom hook to fetch and manage quiz questions from static JSON
 * Loads all questions for today's date
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

    const todayString = getTodayString()

    async function loadQuestions() {
      setLoading(true)
      
      try {
        const response = await fetch('/data/questions.json')
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
