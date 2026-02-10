import { useState, useEffect, useRef } from 'react'
import { SHEET_URLS } from '../config/sheets'
import { parseSingleQuestionForDate, getTodayString } from '../utils/csvParser'

/**
 * Custom hook to fetch and manage quiz questions from Google Sheets
 * Progressively loads questions: Easy first, then Medium, Hard, Impossible
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
    const difficulties = ['easy', 'medium', 'hard', 'impossible']
    const loadedQuestions = [null, null, null, null] // Placeholder array to maintain order
    
    async function fetchQuestion(difficulty, index) {
      try {
        const response = await fetch(SHEET_URLS[difficulty])
        if (!response.ok) throw new Error(`Failed to fetch ${difficulty} question`)
        
        const csvText = await response.text()
        const question = parseSingleQuestionForDate(csvText, todayString, difficulty)
        
        if (question) {
          loadedQuestions[index] = question
        }
      } catch (err) {
        console.error(`Error loading ${difficulty} question:`, err)
        setError(err.message)
      }
    }

    async function loadQuestions() {
      setLoading(true)
      
      // Load all questions in parallel
      await Promise.all([
        fetchQuestion('easy', 0),
        fetchQuestion('medium', 1),
        fetchQuestion('hard', 2),
        fetchQuestion('impossible', 3)
      ])
      
      // Set all questions at once in correct order
      setQuestions(loadedQuestions.filter(q => q !== null))
      setLoading(false)
    }

    loadQuestions()
  }, [])

  return { questions, loading, error }
}
