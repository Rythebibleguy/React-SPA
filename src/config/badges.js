// Badge system configuration and helpers

export const BADGES = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first quiz',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4d6/512.png',
    requirement: 1,
    checkUnlocked: (userData) => (userData.quizzesTaken || 0) >= 1
  },
  {
    id: 'fellowship',
    name: 'Fellowship',
    description: 'Challenge a friend to play the daily quiz',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f91d/512.png',
    requirement: 1,
    checkUnlocked: (userData) => (userData.shares || 0) >= 1
  },
  {
    id: 'lightning-fast',
    name: 'Lightning Fast',
    description: 'Complete a quiz in under 10 seconds',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/26a1/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => {
        return entry.duration && entry.duration < 10;
      });
    }
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete a quiz before 6 AM',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f305/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => {
        if (entry.timestamp) {
          const hour = parseInt(entry.timestamp.slice(0, 2));
          return hour >= 0 && hour < 6;
        }
        return false;
      });
    }
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete a quiz between 10 PM and midnight',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f989/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => {
        if (entry.timestamp) {
          const hour = parseInt(entry.timestamp.slice(0, 2));
          return hour >= 22 && hour <= 23;
        }
        return false;
      });
    }
  },
  {
    id: 'slow-and-steady',
    name: 'Slow & Steady',
    description: 'Take over 10 minutes to complete a quiz',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f40c/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => {
        return entry.duration && entry.duration > 600;
      });
    }
  },
  {
    id: 'dedicated-scholar',
    name: 'Dedicated Student',
    description: 'Complete 10 quizzes',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4da/512.png',
    requirement: 10,
    checkUnlocked: (userData) => (userData.quizzesTaken || 0) >= 10
  },
  {
    id: 'perfect-quiz',
    name: 'Perfect Score',
    description: 'Complete a quiz with all questions correct',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => entry.score === entry.totalQuestions && entry.totalQuestions > 0);
    }
  },
  {
    id: 'streak-7',
    name: '7-Day Streak',
    description: 'Complete quizzes 7 days in a row',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.png',
    requirement: 7,
    checkUnlocked: (userData) => (userData.maxStreak || 0) >= 7
  },
  {
    id: 'make-a-wish',
    name: 'Make a Wish',
    description: 'Complete a quiz at exactly 11:11',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/23f0/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => {
        if (entry.timestamp) {
          return entry.timestamp.startsWith('11:11') || entry.timestamp.startsWith('23:11');
        }
        return false;
      });
    }
  },
  {
    id: 'never-give-up',
    name: 'Never Give Up',
    description: 'Get 0/4 on a quiz but come back the next day',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4aa/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      for (let i = 0; i < history.length - 1; i++) {
        const entry = history[i];
        if (entry.score === 0 && entry.totalQuestions === 4) {
          const [year, month, day] = entry.date.split('-').map(Number);
          const nextDay = new Date(year, month - 1, day + 1);
          const nextDayString = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
          
          const cameBackNextDay = history.slice(i + 1).some(laterEntry => 
            laterEntry.date === nextDayString
          );
          
          if (cameBackNextDay) {
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    id: 'master-scholar',
    name: 'Master Scholar',
    description: 'Complete 50 quizzes',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f393/512.png',
    requirement: 50,
    checkUnlocked: (userData) => (userData.quizzesTaken || 0) >= 50
  },
  {
    id: 'community-builder',
    name: 'Community Builder',
    description: 'Share the daily quiz with 10 friends',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3d8/512.png',
    requirement: 10,
    checkUnlocked: (userData) => (userData.shares || 0) >= 10
  },
  {
    id: 'streak-30',
    name: '30-Day Streak',
    description: 'Complete quizzes 30 days in a row',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f31f/512.png',
    requirement: 30,
    checkUnlocked: (userData) => (userData.maxStreak || 0) >= 30
  },
  {
    id: 'double-threat',
    name: 'Double Threat',
    description: 'Complete a quiz when the month and day match',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2696_fe0f/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => {
        if (entry.date) {
          const parts = entry.date.split('-');
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          return month === day && month <= 12;
        }
        return false;
      });
    }
  },
  {
    id: 'century-mark',
    name: 'Century Mark',
    description: 'Complete a quiz on the 100th day of the year',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4c5/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => {
        if (entry.date) {
          const date = new Date(entry.date);
          const startOfYear = new Date(date.getFullYear(), 0, 1);
          const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
          return dayOfYear === 100;
        }
        return false;
      });
    }
  },
  {
    id: 'bible-champion',
    name: 'Bible Champion',
    description: 'Complete 100 quizzes',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.png',
    requirement: 100,
    checkUnlocked: (userData) => (userData.quizzesTaken || 0) >= 100
  },
  {
    id: 'streak-100',
    name: '100-Day Streak',
    description: 'Complete quizzes 100 days in a row',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.png',
    requirement: 100,
    checkUnlocked: (userData) => (userData.maxStreak || 0) >= 100
  },
  {
    id: 'christmas-spirit',
    name: 'Christmas Spirit',
    description: 'Complete a quiz on December 25th',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f384/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      return history.some(entry => entry.date && entry.date.endsWith('-12-25'));
    }
  },
  {
    id: 'easter-devotion',
    name: 'Easter Devotion',
    description: 'Complete a quiz on Easter Sunday',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/271d_fe0f/512.png',
    requirement: 1,
    checkUnlocked: (userData) => {
      const history = userData.history || [];
      const easterDates = [
        '2024-03-31', '2025-04-20', '2026-04-05', '2027-03-28', '2028-04-16',
        '2029-04-01', '2030-04-21', '2031-04-13', '2032-03-28', '2033-04-17'
      ];
      return history.some(entry => entry.date && easterDates.includes(entry.date));
    }
  },
  {
    id: 'streak-365',
    name: '365-Day Streak',
    description: 'Complete quizzes for an entire year',
    icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.png',
    requirement: 365,
    checkUnlocked: (userData) => (userData.maxStreak || 0) >= 365
  }
];

// Helper function to calculate badge progress
export function calculateBadgeProgress(badge, userData) {
  const unlocked = badge.checkUnlocked(userData);
  
  // Calculate progress for progression badges
  let progress = null;
  let progressPercent = 0;
  
  // Quiz-based badges
  if (['dedicated-scholar', 'master-scholar', 'bible-champion'].includes(badge.id)) {
    progress = { current: userData.quizzesTaken || 0, total: badge.requirement, type: 'quizzes' };
    progressPercent = Math.min((progress.current / progress.total) * 100, 100);
  }
  // Share-based badges  
  else if (['community-builder'].includes(badge.id)) {
    progress = { current: userData.shares || 0, total: badge.requirement, type: 'shares' };
    progressPercent = Math.min((progress.current / progress.total) * 100, 100);
  }
  // Streak-based badges
  else if (['streak-7', 'streak-30', 'streak-100', 'streak-365'].includes(badge.id)) {
    progress = { current: userData.maxStreak || 0, total: badge.requirement, type: 'streak' };
    progressPercent = Math.min((progress.current / progress.total) * 100, 100);
  }
  
  return {
    ...badge,
    unlocked,
    progress,
    progressPercent
  };
}

// Helper function to process all badges for a user
export function getAllBadgesWithProgress(userData) {
  return BADGES.map(badge => calculateBadgeProgress(badge, userData));
}

// Helper function to get a specific badge by ID
export function getBadgeById(badgeId) {
  return BADGES.find(badge => badge.id === badgeId);
}

// Helper function to get unlocked badges for a user
export function getUnlockedBadges(userData) {
  return BADGES.filter(badge => badge.checkUnlocked(userData));
}

// Helper function to check for newly unlocked badges after quiz completion
export function checkNewlyUnlockedBadges(currentUserData, newStats, dateKey) {
  const currentBadges = currentUserData.badges || []
  const newlyUnlocked = []
  
  // Create combined data for checking
  const checkData = {
    ...currentUserData,
    ...newStats
  }
  
  BADGES.forEach(badge => {
    // Check if badge is already unlocked
    const alreadyHas = currentBadges.some(b => b.id === badge.id)
    
    if (!alreadyHas) {
      // Check if badge criteria is now met
      const isUnlocked = badge.checkUnlocked(checkData)
      
      if (isUnlocked) {
        newlyUnlocked.push({
          id: badge.id,
          unlockedOn: dateKey || getTodayString()
        })
      }
    }
  })
  
  return newlyUnlocked
}

// Helper function to calculate current streak from quiz history
export function calculateCurrentStreakFromHistory(history) {
  if (!history || history.length === 0) {
    return 0
  }
  
  // Sort by date (most recent first)
  const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date))
  
  let streak = 0
  let checkDate = getTodayString() // Use local timezone
  
  // Check each consecutive day going backwards
  for (let i = 0; i < sortedHistory.length; i++) {
    if (sortedHistory[i].date === checkDate) {
      streak++
      // Move to previous day
      const prevDate = new Date(checkDate + 'T00:00:00') // Parse as local date
      prevDate.setDate(prevDate.getDate() - 1)
      const year = prevDate.getFullYear()
      const month = String(prevDate.getMonth() + 1).padStart(2, '0')
      const day = String(prevDate.getDate()).padStart(2, '0')
      checkDate = `${year}-${month}-${day}`
    } else {
      break
    }
  }
  
  return streak
}

// Helper function to get today's date string in YYYY-MM-DD format (local timezone)
export function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to get badge categories for organization
export const BADGE_CATEGORIES = {
  MILESTONES: ['first-steps', 'dedicated-scholar', 'master-scholar', 'bible-champion'],
  PERFORMANCE: ['perfect-quiz'],
  COMMUNITY: ['fellowship', 'community-builder'],
  STREAKS: ['streak-7', 'streak-30', 'streak-100', 'streak-365'],
  TIME_BASED: ['early-bird', 'night-owl', 'make-a-wish', 'lightning-fast', 'slow-and-steady'],
  SPECIAL: ['never-give-up'],
  HOLIDAYS: ['christmas-spirit', 'easter-devotion', 'double-threat', 'century-mark']
};