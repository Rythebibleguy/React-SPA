import { useState, useEffect, useRef } from 'react';
import { getCachedStats, getStatsPromise, preloadStats } from '../utils/dataPreloader';

/**
 * Hook to fetch all quiz statistics for today. Starts stats fetch when first needed (after Play).
 */
export function useQuizStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const cached = getCachedStats();
    if (cached !== null) {
      setStats(cached);
      setLoading(false);
      return;
    }

    preloadStats();
    const statsPromise = getStatsPromise();
    if (statsPromise) {
      statsPromise.then(setStats).finally(() => setLoading(false));
    } else {
      setStats({});
      setLoading(false);
    }
  }, []);

  return { stats, loading };
}
