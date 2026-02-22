import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';
import { getTodayString } from './csvParser';
import { BASE_DATA_URL, STATS_API_URL } from '../config';

// Cache to store preloaded data
const cache = {
  questions: null,
  stats: null,
  questionsPromise: null,
  statsPromise: null
};

/** Normalize stats (same shape from Stats API or RTDB) */
function normalizeStatsData(data) {
  if (!data || typeof data !== 'object') return {};
  const normalizedData = {};
  Object.keys(data).forEach(questionKey => {
    if (questionKey === 'scores') {
      normalizedData[questionKey] = data[questionKey];
      return;
    }
    const questionStats = data[questionKey];
    if (!questionStats || typeof questionStats !== 'object') return;
    const normalizedQuestionStats = {};
    Object.keys(questionStats).forEach(answerKey => {
      const match = answerKey.match(/_a(\d+)$/);
      if (match) {
        const answerId = match[1];
        normalizedQuestionStats[answerId] = (normalizedQuestionStats[answerId] || 0) + questionStats[answerKey];
      } else {
        normalizedQuestionStats[answerKey] = (normalizedQuestionStats[answerKey] || 0) + questionStats[answerKey];
      }
    });
    normalizedData[questionKey] = normalizedQuestionStats;
  });
  return normalizedData;
}

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
        return shuffledQuestions;
      })
      .catch(error => {
        cache.questionsPromise = null; // Reset on error so it can retry
        throw error;
      });
  }

  if (!cache.statsPromise) {
    const finishStats = (data) => data;

    const tryStatsApi = () => {
      if (!STATS_API_URL) return Promise.reject(new Error('no stats API'));
      const url = `${STATS_API_URL}?date=${encodeURIComponent(todayString)}`;
      return fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`Stats API ${res.status}`);
          return res.json();
        })
        .then(data => {
          const normalized = normalizeStatsData(data);
          cache.stats = normalized;
          return normalized;
        })
        .then(data => finishStats(data));
    };

    const tryRTDB = () => {
      const statsRef = ref(db, `quiz_stats/${todayString}`);
      return get(statsRef)
        .then(snapshot => {
          const data = snapshot.exists() ? snapshot.val() : null;
          const normalized = normalizeStatsData(data || {});
          cache.stats = normalized;
          return normalized;
        })
        .then(data => finishStats(data));
    };

    cache.statsPromise = tryStatsApi()
      .catch(() => tryRTDB())
      .catch(() => {
        cache.stats = {};
        cache.statsPromise = null;
        return {};
      });
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
