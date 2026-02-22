import { getTodayString } from './csvParser'

const STORAGE_KEY = 'quiz_completion'
let _loggedCheck = false

/**
 * Get today's quiz completion from localStorage (for any user, auth or guest).
 * Used so we can show "already completed today" without waiting for Firebase.
 * @returns {{ date: string, answers: number[], score: number, totalQuestions: number, timestamp?: string, duration?: number } | null}
 */
export function getTodayCompletion() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      if (import.meta.env.DEV && !_loggedCheck) {
        _loggedCheck = true
        console.log(`[${Math.round(performance.now())}ms] localStorage check (not found)`)
      }
      return null
    }
    const data = JSON.parse(raw)
    const today = getTodayString()
    if (data?.date !== today || !Array.isArray(data.answers) || data.answers.length !== 4) {
      if (import.meta.env.DEV && !_loggedCheck) {
        _loggedCheck = true
        console.log(`[${Math.round(performance.now())}ms] localStorage check (not found)`)
      }
      return null
    }
    if (import.meta.env.DEV && !_loggedCheck) {
      _loggedCheck = true
      console.log(`[${Math.round(performance.now())}ms] localStorage check (found)`)
    }
    if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Today completion from localStorage`, data.date)
    return data
  } catch {
    if (import.meta.env.DEV && !_loggedCheck) {
      _loggedCheck = true
      console.log(`[${Math.round(performance.now())}ms] localStorage check (not found)`)
    }
    return null
  }
}

/**
 * Save today's quiz completion to localStorage (called for every user on quiz complete).
 * Auth users also get synced to Firebase via completeQuiz().
 */
export function setTodayCompletion({ score, totalQuestions, duration, selectedAnswers }) {
  try {
    const date = getTodayString()
    const now = new Date()
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const data = {
      date,
      score,
      totalQuestions,
      timestamp,
      duration: duration ?? null,
      answers: selectedAnswers
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Today completion saved to localStorage`)
  } catch {
    // ignore
  }
}
