import { useState, useEffect, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../config/firebase';
import { getTodayString } from '../utils/csvParser';

/**
 * Hook to fetch all quiz statistics for today
 * Returns stats object structured as: { q0: { answerId: count }, q1: { answerId: count }, ... }
 */
export function useQuizStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const todayString = getTodayString();
    const statsRef = ref(db, `quiz_stats/${todayString}`);

    get(statsRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // Normalize old format keys (2026-02-11_q0_a0) to new format (0)
          const normalizedData = {};
          Object.keys(data).forEach(questionKey => {
            if (questionKey === 'scores') {
              normalizedData[questionKey] = data[questionKey];
              return;
            }
            
            const questionStats = data[questionKey];
            const normalizedQuestionStats = {};
            
            Object.keys(questionStats).forEach(answerKey => {
              // Check if it's old format: YYYY-MM-DD_qN_aN
              const match = answerKey.match(/_a(\d+)$/);
              if (match) {
                // Old format - extract just the answer ID
                const answerId = match[1];
                normalizedQuestionStats[answerId] = (normalizedQuestionStats[answerId] || 0) + questionStats[answerKey];
              } else {
                // New format - use as is
                normalizedQuestionStats[answerKey] = (normalizedQuestionStats[answerKey] || 0) + questionStats[answerKey];
              }
            });
            
            normalizedData[questionKey] = normalizedQuestionStats;
          });
          
          setStats(normalizedData);
        } else {
          setStats({});
        }
      })
      .catch((error) => {
        console.warn('Could not fetch stats:', error);
        setStats({});
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { stats, loading };
}
