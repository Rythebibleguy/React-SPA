import { useState, useEffect, useRef } from 'react';
import { getCachedStats, getStatsPromise } from '../utils/dataPreloader';

/**
 * Hook to fetch all quiz statistics for today
 * Uses preloaded data if available, otherwise fetches on demand
 * Returns stats object structured as: { q0: { answerId: count }, q1: { answerId: count }, ... }
 */
export function useQuizStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    // Check if data is already cached
    const cachedStats = getCachedStats();
    if (cachedStats !== null) {
      setStats(cachedStats);
      setLoading(false);
      return;
    }

    // Check if preload is in progress
    const statsPromise = getStatsPromise();
    if (statsPromise) {
      statsPromise
        .then(stats => {
          setStats(stats);
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    // Fallback: this shouldn't happen if preload was called, but handle it
    setStats({});
    setLoading(false);
  }, []);

  return { stats, loading };
}
