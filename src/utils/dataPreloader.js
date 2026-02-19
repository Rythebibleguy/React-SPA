import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';
import { getTodayString } from './csvParser';
import { BASE_DATA_URL } from '../config';

// Cache to store preloaded data
const cache = {
  questions: null,
  stats: null,
  questionsPromise: null,
  statsPromise: null
};

/**
 * Preload both questions and stats - starts fetching immediately
 * Returns promises that resolve when data is ready
 */
export function preloadQuizData() {
  const todayString = getTodayString();

  // Only start fetch if not already loading/loaded
  if (!cache.questionsPromise) {
    cache.questionsPromise = fetch(`${BASE_DATA_URL}/data/questions.json`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch questions');
        return response.json();
      })
      .then(allQuestions => {
        const todaysQuestions = allQuestions[todayString] || [];
        
        // Shuffle answers for each question
        const shuffledQuestions = todaysQuestions.map(q => ({
          ...q,
          answers: [...q.answers].sort(() => Math.random() - 0.5)
        }));
        
        cache.questions = shuffledQuestions;
        window.__perfLog?.('questions fetch finished')
        return shuffledQuestions;
      })
      .catch(error => {
        cache.questionsPromise = null; // Reset on error so it can retry
        throw error;
      });
  }

  if (!cache.statsPromise) {
    const testLog = (label) => console.log(`[testing][${Math.round(performance.now())}ms] ${label}`)
    testLog('stats: ref created, get() starting')
    const statsRef = ref(db, `quiz_stats/${todayString}`)

    cache.statsPromise = get(statsRef)
      .then(snapshot => {
        testLog('stats: get() resolved, snapshot received')
        if (snapshot.exists()) {
          testLog('stats: snapshot.exists() true, calling val()')
          const data = snapshot.val()
          const payloadStr = JSON.stringify(data)
          testLog(`stats: val() returned, payload ~${(payloadStr.length / 1024).toFixed(2)} KB (${payloadStr.length} chars), ${Object.keys(data).length} top-level keys - normalizing`)
          // Normalize old format keys (2026-02-11_q0_a0) to new format (0)
          const normalizedData = {}
          Object.keys(data).forEach(questionKey => {
            if (questionKey === 'scores') {
              normalizedData[questionKey] = data[questionKey]
              return
            }
            const questionStats = data[questionKey]
            const normalizedQuestionStats = {}
            Object.keys(questionStats).forEach(answerKey => {
              const match = answerKey.match(/_a(\d+)$/)
              if (match) {
                const answerId = match[1]
                normalizedQuestionStats[answerId] = (normalizedQuestionStats[answerId] || 0) + questionStats[answerKey]
              } else {
                normalizedQuestionStats[answerKey] = (normalizedQuestionStats[answerKey] || 0) + questionStats[answerKey]
              }
            })
            normalizedData[questionKey] = normalizedQuestionStats
          })
          testLog('stats: normalization done, writing cache')
          cache.stats = normalizedData
          return normalizedData
        } else {
          testLog('stats: snapshot.exists() false, empty cache')
          cache.stats = {}
          return {}
        }
      })
      .then(data => {
        testLog('stats: promise chain done')
        window.__perfLog?.('stats fetch finished')
        return data
      })
      .catch(error => {
        testLog(`stats: get() failed - ${error?.message || error}`)
        cache.stats = {}
        cache.statsPromise = null
        window.__perfLog?.('stats fetch finished')
        return {}
      })
  }

  return {
    questionsPromise: cache.questionsPromise,
    statsPromise: cache.statsPromise
  };
}

/**
 * Get cached questions (if available)
 */
export function getCachedQuestions() {
  return cache.questions;
}

/**
 * Get cached stats (if available)
 */
export function getCachedStats() {
  return cache.stats;
}

/**
 * Get the questions promise (if preloading started)
 */
export function getQuestionsPromise() {
  return cache.questionsPromise;
}

/**
 * Get the stats promise (if preloading started)
 */
export function getStatsPromise() {
  return cache.statsPromise;
}

/**
 * Clear the cache (useful for testing or force refresh)
 */
export function clearCache() {
  cache.questions = null;
  cache.stats = null;
  cache.questionsPromise = null;
  cache.statsPromise = null;
}
