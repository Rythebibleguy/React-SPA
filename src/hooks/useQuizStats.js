import { useState, useEffect, useRef } from 'react';
import { getCachedStats, getStatsPromise } from '../utils/dataPreloader';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to fetch quiz statistics for today. Stats are started only in the deferred path (WelcomeScreen);
 * this hook just consumes getStatsPromise() / getCachedStats() and re-runs when auth updates so we
 * pick up the promise after deferred runs.
 */
export function useQuizStats() {
  const { profileLoaded } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const cached = getCachedStats();
    if (cached !== null) {
      hasLoadedRef.current = true;
      setStats(cached);
      setLoading(false);
      return;
    }

    const statsPromise = getStatsPromise();
    if (statsPromise) {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        statsPromise.then(setStats).finally(() => setLoading(false));
      }
    } else {
      setLoading(true);
      setStats(null);
    }
  }, [profileLoaded]);

  return { stats, loading };
}
