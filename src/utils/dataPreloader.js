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
 * Preload questions only (critical path). Stats load after Play is ready (see preloadStats).
 */
export function preloadQuizData() {
  const todayString = getTodayString();

  if (!cache.questionsPromise) {
    if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Questions loading`)
    cache.questionsPromise = fetch(`${BASE_DATA_URL}/data/questions.json`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch questions');
        return response.json();
      })
      .then(allQuestions => {
        const todaysQuestions = allQuestions[todayString] || [];
        const shuffledQuestions = todaysQuestions.map(q => ({
          ...q,
          answers: [...q.answers].sort(() => Math.random() - 0.5)
        }));
        cache.questions = shuffledQuestions;
        return shuffledQuestions;
      })
      .catch(error => {
        cache.questionsPromise = null;
        throw error;
      });
  }

  return { questionsPromise: cache.questionsPromise };
}

/**
 * Start stats fetch (Cloudflare then RTDB fallback). Call after Play is ready (e.g. from QuizScreen).
 */
export function preloadStats() {
  if (cache.statsPromise) return cache.statsPromise;

  const todayString = getTodayString();
  const recordAnswersDataTiming = (source) => {
    if (typeof performance !== 'undefined' && window.__perfTimings) {
      window.__perfTimings['answers_data_fetch_' + source.replace(/\s+/g, '_')] = Math.round(performance.now());
      window.__perfTimings.answers_data_source = source;
    }
  };

  const tryStatsApi = () => {
    if (!STATS_API_URL) return Promise.reject(new Error('no stats API'));
    return fetch(`${STATS_API_URL}?date=${encodeURIComponent(todayString)}`)
      .then(res => { if (!res.ok) throw new Error(`Stats API ${res.status}`); return res.json(); })
      .then(data => {
        const normalized = normalizeStatsData(data);
        cache.stats = normalized;
        recordAnswersDataTiming('Cloudflare');
        return normalized;
      });
  };

  const tryRTDB = () => {
    const statsRef = ref(db, `quiz_stats/${todayString}`);
    return get(statsRef)
      .then(snapshot => {
        const data = snapshot.exists() ? snapshot.val() : null;
        const normalized = normalizeStatsData(data || {});
        cache.stats = normalized;
        recordAnswersDataTiming('Firebase');
        return normalized;
      });
  };

  if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Stats loading`)
  cache.statsPromise = tryStatsApi()
    .catch(() => tryRTDB())
    .catch(() => {
      cache.stats = {};
      cache.statsPromise = null;
      return {};
    })
    .then((result) => {
      if (import.meta.env.DEV) console.log(`[${Math.round(performance.now())}ms] Stats finished`)
      return result
    })

  return cache.statsPromise
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
