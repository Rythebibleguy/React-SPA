import { db, ref, runTransaction, get, firestore, doc, updateDoc, arrayUnion, increment, getDoc } from "./firebase-config.js";
import { getCurrentUser, getCurrentUserProfile, updateLocalUserData, checkNewlyUnlockedBadges, shareFriendLink } from "./auth.js";

// Preloaded friends data for instant display in results modal
let preloadedFriendsData = null;

// Retry helper for Firestore operations with exponential backoff
async function firestoreWithRetry(operation, maxRetries = 3, baseDelay = 1000, operationName = 'firestore') {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            // Track first failure with Clarity
            if (attempt === 0 && window.trackClarityEvent) {
                window.trackClarityEvent('firestore_failed_first_attempt', {
                    operation: operationName,
                    error: error.message
                });
            }
            
            const isLastAttempt = attempt === maxRetries - 1;
            if (isLastAttempt) {
                throw error; // Re-throw on last attempt
            }
            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`Firestore operation attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Helper function to calculate current streak from history
function calculateCurrentStreakFromHistory(history) {
    if (!history || history.length === 0) return 0;
    
    // Sort by date descending (most recent first)
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let streak = 1; // Count the most recent entry
    
    for (let i = 0; i < sorted.length - 1; i++) {
        const currentDate = new Date(sorted[i].date);
        const nextDate = new Date(sorted[i + 1].date);
        
        const diffTime = currentDate - nextDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            streak++; // Consecutive day found
        } else {
            break; // Gap found, stop counting
        }
    }
    
    return streak;
}

let totalQuestions = 0;
let currentScore = 0;
let quizState = null; // Store quiz state for loading remaining questions
let questionResults = []; // Track per-question results: {correct: boolean, difficulty: string}
let quizStartTime = null; // Track when quiz starts for duration calculation
let selectedAnswerIds = []; // Track answer IDs selected for each question [0-3]
let pendingGuestStats = null; // Store complete calculated stats for guests who finish quiz before creating account
let dailyStats = {}; // Store daily stats fetched at quiz initialization
let blendedGlobalStats = null; // Store pre-calculated global stats for instant display

// Export function to get pending quiz data (for transferring guest data on account creation)
export function getPendingQuizData() {
    return pendingGuestStats;
}

// Apply saved answers for a user who signs in mid-session
export function applySavedAnswers() {
    const user = getCurrentUser();
    if (!user) return;
    
    const userData = getCurrentUserProfile();
    if (!userData || !userData.history) return;
    
    const todayString = window.todayString;
    const todayEntry = userData.history.find(entry => entry.date === todayString);
    
    if (!todayEntry || !todayEntry.answers) return;
    
    const savedAnswers = todayEntry.answers;
    
    // Apply each saved answer
    savedAnswers.forEach((answerId, questionIndex) => {
        if (answerId !== null && answerId !== undefined) {
            // Find the input with this answer ID for this question
            const targetInput = document.querySelector(`input[name="q${questionIndex}"][data-id$="_a${answerId}"]`);
            if (targetInput && !targetInput.disabled) {
                // Get the question stats - need to get from quizState
                const dailyStats = quizState?.dailyStats || {};
                const questionStats = dailyStats[`q${questionIndex}`] || {};
                // Call handleAnswerClick with isRestoringAnswer flag set to true
                handleAnswerClick(targetInput, db, questionStats, true);
            }
        }
    });
}

// Start preloading stats early (called from main.js before auth)
export function startStatsPreload() {
    const todayString = window.todayString;
    const statsRef = ref(db, `quiz_stats/${todayString}`);
    
    // Store the promise in preloadCache for later use
    window.preloadCache = window.preloadCache || {};
    window.preloadCache.dailyStats = get(statsRef).catch(e => {
        console.warn("Could not preload stats:", e);
        return null;
    });
}

// Map internal difficulty names to level system
function getDifficultyLevel(difficulty) {
    const diffMap = {
        'easy': { 
            level: 'easy', 
            text: 'Easy' 
        },
        'medium': { 
            level: 'medium', 
            text: 'Medium' 
        },
        'hard': { 
            level: 'hard', 
            text: 'Hard' 
        },
        'impossible': { 
            level: 'impossible', 
            text: 'Impossible' 
        }
    };
    return diffMap[difficulty.toLowerCase()] || { 
        level: 'easy', 
        text: 'Easy' 
    };
}

// Retry helper function with exponential backoff
async function fetchWithRetry(url, maxRetries = 3, baseDelay = 1000, operationName = 'fetch') {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
            // If not ok, throw to trigger retry
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            // Track first failure with Clarity
            if (attempt === 0 && window.trackClarityEvent) {
                window.trackClarityEvent('fetch_failed_first_attempt', {
                    operation: operationName,
                    error: error.message
                });
            }
            
            const isLastAttempt = attempt === maxRetries - 1;
            if (isLastAttempt) {
                throw error; // Re-throw on last attempt
            }
            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

export async function initQuiz() {
    currentScore = 0;
    questionResults = []; // Reset results tracking
    selectedAnswerIds = []; // Reset answer tracking
    const container = document.getElementById('quiz-content-container');
    const dotsContainer = document.getElementById('quiz-difficulty-dots');

    // Use pre-calculated date from background processes
    const todayString = window.todayString;

    // Check if user has already completed today's quiz
    let savedAnswers = null;
    const user = getCurrentUser();
    if (user) {
        const userData = getCurrentUserProfile();
        if (userData && userData.history) {
            const todayEntry = userData.history.find(entry => entry.date === todayString);
            if (todayEntry && todayEntry.answers) {
                savedAnswers = todayEntry.answers; // Array of answer IDs [0-3]
            }
        }
    }

    try {
        // Use preloaded stats if available, otherwise fetch now
        let statsPromise;
        if (window.preloadCache?.dailyStats) {
            statsPromise = window.preloadCache.dailyStats;
        } else {
            const statsRef = ref(db, `quiz_stats/${todayString}`);
            statsPromise = get(statsRef).catch(e => {
                console.warn("Could not fetch stats:", e);
                return null;
            });
        }

        // Reference global SHEET_URLS from index.html
        const SHEET_URLS = window.SHEET_URLS;
        
        let daysQuiz = { date: todayString, questions: [] };
        
        // Create placeholder dots for all difficulties immediately
        dotsContainer.innerHTML = '';
        const allDifficulties = ['easy', 'medium', 'hard', 'impossible'];
        allDifficulties.forEach((diff, idx) => {
            const navItem = document.createElement('span');
            const levelInfo = getDifficultyLevel(diff);
            navItem.className = idx === 0 ? `quiz-screen__difficulty-dot quiz-screen__difficulty-dot--active quiz-screen__difficulty-dot--${levelInfo.level}` : `quiz-screen__difficulty-dot quiz-screen__difficulty-dot--${levelInfo.level}`;
            navItem.innerHTML = `<span class="quiz-screen__difficulty-dot-text">${levelInfo.text}</span>`;
            navItem.onclick = () => {
                const block = document.getElementById(`block-q${idx}`);
                if (block) {
                    block.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                }
            };
            dotsContainer.appendChild(navItem);
        });

        try {
            // Fetch easy question first with retries (critical for quiz to start)
            try {
                let response;
                if (window.preloadCache?.easyQuiz) {
                    // Use preloaded fetch if available
                    response = await window.preloadCache.easyQuiz;
                } else {
                    // Fetch with retry logic for reliability
                    response = await fetchWithRetry(SHEET_URLS.easy, 3, 1000, 'easy_question');
                }
                    
                if (response.ok) {
                    const csvText = await response.text();
                    const question = parseSingleQuestionForDate(csvText, todayString, 'easy');
                    
                    if (question) {
                        daysQuiz.questions.push(question);
                    }
                }
            } catch (err) {
                console.error('[WelcomeScreen] ❌ Error loading easy question after retries:', err);
            }
            
            // Render quiz with easy question immediately (stats may still be loading)
            if (daysQuiz.questions.length > 0) {
                totalQuestions = 1; // Will be updated as more load
                
                // Ensure stats are loaded before rendering (should be ready by now or finishing soon)
                const statsSnapshot = await statsPromise;
                dailyStats = statsSnapshot?.val() || {};
                
                renderQuiz(daysQuiz.questions, container, dotsContainer, todayString, db, dailyStats, true, savedAnswers);
                
                // Mark data as ready
                window.quizDataReady = true;
                
                // Enable button if timer has already passed
                if (window.startButtonTimerPassed) {
                    const loadingBtn = document.getElementById('welcome-loading-button');
                    const readyBtn = document.getElementById('welcome-ready-button');
                    const dateText = document.getElementById('welcome-date');
                    if (loadingBtn && readyBtn) {
                        loadingBtn.style.display = 'none';
                        readyBtn.style.display = 'block';
                        if (dateText) {
                            dateText.style.display = 'block';
                            dateText.style.animation = 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
                        }
                    }
                }
            }
            
            // Store state for loading remaining questions later
            quizState = {
                daysQuiz,
                container,
                dotsContainer,
                todayString,
                db,
                dailyStats,
                SHEET_URLS
            };
            
        } catch (err) {
            console.error("Google Sheet load failed", err);
        }

        // Final check
        if (daysQuiz.questions.length === 0) {
            console.warn('⚠️ No quiz questions available for today');
            container.innerHTML = "<p>No quiz found for today.</p>";
        }
    } catch (error) {
        console.error(error);
    }
}

// Load remaining questions after page fully loads
export async function loadRemainingQuestions() {
    if (!quizState) {
        console.warn('⚠️ Quiz state not initialized');
        return;
    }

    const { daysQuiz, container, dotsContainer, todayString, db, dailyStats, SHEET_URLS } = quizState;

    try {
        // Process each difficulty sequentially - medium, then hard, then impossible
        // This ensures the next question is ready as user progresses
        const remainingDifficulties = ['medium', 'hard', 'impossible'];
        
        for (const difficulty of remainingDifficulties) {
            try {
                const cacheKey = `${difficulty}Quiz`;
                let response;
                if (window.preloadCache?.[cacheKey]) {
                    response = await window.preloadCache[cacheKey];
                } else {
                    // Use retry logic for remaining questions
                    response = await fetchWithRetry(SHEET_URLS[difficulty], 3, 1000, `${difficulty}_question`);
                }
                    
                if (!response.ok) throw new Error(`Failed to fetch ${difficulty} tab`);
                const csvText = await response.text();
                const question = parseSingleQuestionForDate(csvText, todayString, difficulty);
                
                if (question) {
                    daysQuiz.questions.push(question);
                    totalQuestions = daysQuiz.questions.length;
                    
                    // Re-render quiz with new question added
                    let savedAnswers = null;
                    const user = getCurrentUser();
                    if (user) {
                        const userData = getCurrentUserProfile();
                        if (userData && userData.history) {
                            const todayEntry = userData.history.find(entry => entry.date === todayString);
                            if (todayEntry && todayEntry.answers) {
                                savedAnswers = todayEntry.answers;
                            }
                        }
                    }
                    
                    container.innerHTML = '';
                    renderQuiz(daysQuiz.questions, container, dotsContainer, todayString, db, dailyStats, true, savedAnswers);
                }
            } catch (err) {
                console.error(`  ❌ Error loading ${difficulty} tab:`, err);
            }
        }
        
        // Final height adjustment after all questions loaded
        setTimeout(setQuestionContainerHeight, 250);
    } catch (err) {
        console.error("Error loading remaining questions:", err);
    }
}

// --- HELPER: Parse single question for a specific date from CSV ---
function parseSingleQuestionForDate(csvText, targetDate, difficulty) {
    const rows = [];
    let quote = false;
    let col = 0, row = 0;
    
    // Simple CSV Parser - parse row by row and check date immediately
    for (let c = 0; c < csvText.length; c++) {
        let cc = csvText[c], nc = csvText[c+1];
        rows[row] = rows[row] || [];
        rows[row][col] = rows[row][col] || '';

        if (cc == '"' && quote && nc == '"') { rows[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        
        // End of row - check if this is the row we're looking for
        if ((cc == '\r' && nc == '\n' && !quote) || (cc == '\n' && !quote) || (cc == '\r' && !quote)) {
            // Skip header row (row 0 if it contains "Date")
            if (row > 0 || (rows[0] && rows[0][0] && !rows[0][0].toLowerCase().includes("date"))) {
                const cols = rows[row];
                if (cols.length >= 6) { // Need at least: date, question, correct, wrong1, wrong2, wrong3
                    const date = cols[0].trim();
                    
                    // Found today's date - extract question and return immediately
                    if (date === targetDate) {
                        const questionText = cols[1].trim();
                        const correct = cols[2].trim();
                        const wrong1 = cols[3].trim();
                        const wrong2 = cols[4].trim();
                        const wrong3 = cols[5].trim();
                        
                        // Extract reference verse columns (6 and 7)
                        const referenceCitation = cols[6] ? cols[6].trim() : '';
                        const referenceVerse = cols[7] ? cols[7].trim() : '';

                        // Create answers array with permanent IDs
                        let answers = [
                            { text: correct, isCorrect: true, id: 0 },
                            { text: wrong1, isCorrect: false, id: 1 },
                            { text: wrong2, isCorrect: false, id: 2 },
                            { text: wrong3, isCorrect: false, id: 3 }
                        ];

                        // Shuffle answers so "Correct" isn't always first
                        answers = answers.sort(() => Math.random() - 0.5);

                        return {
                            difficulty: difficulty,
                            question: questionText,
                            answers: answers,
                            referenceCitation: referenceCitation,
                            referenceVerse: referenceVerse
                        };
                    }
                }
            }
            
            // Move to next row
            ++row; 
            col = 0; 
            if (cc == '\r' && nc == '\n') ++c;
            continue;
        }

        rows[row][col] += cc;
    }

    return null; // No question found for this date
}

// --- HELPER: Parse CSV from Google Sheets (OLD - kept for reference) ---
function parseCSVData(csvText) {
    const rows = [];
    let quote = false;
    let col = 0, row = 0;
    
    // Simple CSV Parser
    for (let c = 0; c < csvText.length; c++) {
        let cc = csvText[c], nc = csvText[c+1];
        rows[row] = rows[row] || [];
        rows[row][col] = rows[row][col] || '';

        if (cc == '"' && quote && nc == '"') { rows[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }

        rows[row][col] += cc;
    }

    const groupedData = {};
    // Assume Row 0 is header if it contains "Date"
    let startRow = 0;
    if(rows[0] && rows[0][0] && rows[0][0].toLowerCase().includes("date")) startRow = 1;

    for (let i = startRow; i < rows.length; i++) {
        const cols = rows[i];
        if(cols.length < 7) continue; // Ensure we have enough columns

        const date = cols[0].trim();
        if(!date) continue;

        const difficulty = cols[1].trim();
        const questionText = cols[2].trim();
        const correct = cols[3].trim();
        const wrong1 = cols[4].trim();
        const wrong2 = cols[5].trim();
        const wrong3 = cols[6].trim();

        if (!groupedData[date]) {
            groupedData[date] = { date: date, questions: [] };
        }

        // Create answers array with permanent IDs
        let answers = [
            { text: correct, isCorrect: true, id: 0 },
            { text: wrong1, isCorrect: false, id: 1 },
            { text: wrong2, isCorrect: false, id: 2 },
            { text: wrong3, isCorrect: false, id: 3 }
        ];

        // Shuffle answers so "Correct" isn't always first
        answers = answers.sort(() => Math.random() - 0.5);

        groupedData[date].questions.push({
            difficulty: difficulty,
            question: questionText,
            answers: answers
        });
    }

    // Convert to array and sort by date
    return Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderQuiz(questions, container, dotsContainer, dateKey, db, dailyStats, skipDots = false, savedAnswers = null) {
    questions.forEach((item, index) => {
        const questionStats = dailyStats[`q${index}`] || {};
        const wrapper = document.createElement('div');
        wrapper.className = 'quiz-screen__card';
        wrapper.id = `block-q${index}`;
        
        const levelInfo = getDifficultyLevel(item.difficulty);
        const diffClass = levelInfo.level;
        
        const isLocked = index > 0;

        // Only create dots if not skipping (dots already created)
        if (!skipDots) {
            const navItem = document.createElement('span');
            navItem.className = index === 0 ? `quiz-screen__difficulty-dot quiz-screen__difficulty-dot--active quiz-screen__difficulty-dot--${diffClass}` : `quiz-screen__difficulty-dot quiz-screen__difficulty-dot--${diffClass}`;
            navItem.innerHTML = `<span class="quiz-screen__difficulty-dot-text">${levelInfo.text}</span>`;
            navItem.onclick = () => {
                document.getElementById(`block-q${index}`).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            };
            dotsContainer.appendChild(navItem);
        }

        const title = `<h3>${item.question}</h3>`;
        
        let optionsHTML = '<div class="quiz-screen__options">';
        item.answers.forEach((ans, ansIndex) => {
            const val = ans.isCorrect ? 'correct' : 'wrong';
            // Use permanent ID (ans.id) for stats consistency across shuffles
            const answerId = `${dateKey}_q${index}_a${ans.id}`;
            
            optionsHTML += `
                <label id="label-${answerId}">
                    <input type="radio" name="q${index}" value="${val}" data-id="${answerId}" data-q-index="${index}" data-date="${dateKey}" data-difficulty="${item.difficulty}">
                    <div class="quiz-screen__percent-bar" style="width: 0%"></div>
                    <span class="quiz-screen__answer-text">
                        <span>${ans.text}</span>
                        <span class="percent-text" style="display:none">0%</span>
                    </span>
                </label>
            `;
        });
        optionsHTML += '</div>';
        
        // Lock overlay for locked questions
        const lockOverlayHTML = isLocked ? `
            <div class="quiz-screen__lock-overlay">
                <div class="quiz-screen__lock-box">
                    <div class="quiz-screen__lock-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <div class="quiz-screen__lock-text">Complete previous question<br>to unlock</div>
                </div>
            </div>
        ` : '';
        
        // Create reference content for back of card
        let backContentHTML = '';
        if (item.referenceCitation && item.referenceVerse) {
            backContentHTML = `
                <div class="quiz-screen__reference-display">
                    <div class="quiz-screen__reference-header">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                        </svg>
                        <h3>${item.referenceCitation}</h3>
                    </div>
                    <p class="quiz-screen__reference-text">${item.referenceVerse}</p>
                </div>
            `;
        }
        
        // Create flip container with front (question card) and back (reference card)
        const flipHTML = `
            <div class="quiz-screen__card-flipper">
                <div class="quiz-screen__card-inner">
                    <div class="quiz-screen__card-front quiz-screen__question ${diffClass} ${isLocked ? 'locked' : ''}">
                        ${title}
                        ${optionsHTML}
                        ${lockOverlayHTML}
                    </div>
                    <div class="quiz-screen__card-back quiz-screen__question ${diffClass}">
                        ${backContentHTML}
                    </div>
                </div>
            </div>
        `;

        wrapper.innerHTML = flipHTML;

        container.appendChild(wrapper);

        const inputs = wrapper.querySelectorAll('input[type="radio"]');
        inputs.forEach(input => {
            input.addEventListener('click', (e) => handleAnswerClick(e.target, db, questionStats));
        });
    });
    
    // Auto-select saved answers if they exist
    if (savedAnswers && savedAnswers.length > 0) {
        setTimeout(() => {
            savedAnswers.forEach((answerId, questionIndex) => {
                if (answerId !== null && answerId !== undefined) {
                    // Find the input with this answer ID for this question
                    const targetInput = document.querySelector(`input[name="q${questionIndex}"][data-id$="_a${answerId}"]`);
                    if (targetInput && !targetInput.disabled) {
                        // Get the question stats for this question
                        const questionStats = dailyStats[`q${questionIndex}`] || {};
                        // Call handleAnswerClick with isRestoringAnswer flag set to true
                        handleAnswerClick(targetInput, db, questionStats, true);
                    }
                }
            });
        }, 100);
    }
    
    // Create single shared button set
    const actionsContainer = document.getElementById('quiz-action-buttons');
    if (actionsContainer) {
        actionsContainer.innerHTML = `
            <div class="quiz-screen__actions-buttons">
                <button class="quiz-screen__prev-button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    <span>Prev</span>
                </button>
                <button class="quiz-screen__reference-button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                    </svg>
                    Show Reference
                </button>
                <button class="quiz-screen__next-button">
                    <span>Next</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
        `;
    }
    
    // Helper function to get active question index
    const getActiveQuestionIndex = () => {
        const scrollLeft = container.scrollLeft;
        const width = container.offsetWidth;
        return Math.round(scrollLeft / width);
    };
    
    // Add event listeners for action buttons
    if (actionsContainer) {
        const prevBtn = actionsContainer.querySelector('.quiz-screen__prev-button');
        const nextBtn = actionsContainer.querySelector('.quiz-screen__next-button');
        const refBtn = actionsContainer.querySelector('.quiz-screen__reference-button');
        
        prevBtn.addEventListener('click', () => {
            const activeIndex = getActiveQuestionIndex();
            if (activeIndex > 0) {
                const prevBlock = document.getElementById(`block-q${activeIndex - 1}`);
                if (prevBlock) {
                    prevBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                }
            }
        });
        
        nextBtn.addEventListener('click', () => {
            const activeIndex = getActiveQuestionIndex();
            if (activeIndex < questions.length - 1) {
                const nextBlock = document.getElementById(`block-q${activeIndex + 1}`);
                if (nextBlock) {
                    nextBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                }
            }
        });
        
        refBtn.addEventListener('click', () => {
            const activeIndex = getActiveQuestionIndex();
            const wrapper = document.getElementById(`block-q${activeIndex}`);
            const flipContainer = wrapper ? wrapper.querySelector('.quiz-screen__card-flipper') : null;
            
            if (flipContainer) {
                if (flipContainer.classList.contains('quiz-screen__card-flipper--flipped')) {
                    // Flip back to front
                    flipContainer.classList.remove('quiz-screen__card-flipper--flipped');
                    refBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                        </svg>
                        Show Reference
                    `;
                } else {
                    // Flip to back
                    flipContainer.classList.add('quiz-screen__card-flipper--flipped');
                    refBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                        Back to Question
                    `;
                }
            }
        });
    }
    
    container.addEventListener('scroll', () => {
        const activeIndex = getActiveQuestionIndex();
        
        document.querySelectorAll('.quiz-screen__difficulty-dot').forEach((d, idx) => {
            if(idx === activeIndex) {
                d.classList.add('quiz-screen__difficulty-dot--active');
            } else {
                d.classList.remove('quiz-screen__difficulty-dot--active');
            }
        });
        
        // Reset flipped cards and reference button when navigating away
        const refBtn = actionsContainer?.querySelector('.quiz-screen__reference-button');
        document.querySelectorAll('.quiz-screen__card-flipper').forEach((flipContainer, idx) => {
            if (idx !== activeIndex && flipContainer.classList.contains('quiz-screen__card-flipper--flipped')) {
                flipContainer.classList.remove('quiz-screen__card-flipper--flipped');
            }
        });
        
        // Update reference button text based on current card state
        const activeWrapper = document.getElementById(`block-q${activeIndex}`);
        const activeFlipContainer = activeWrapper?.querySelector('.quiz-screen__card-flipper');
        if (refBtn && activeFlipContainer) {
            if (activeFlipContainer.classList.contains('quiz-screen__card-flipper--flipped')) {
                refBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                    Back to Question
                `;
            } else {
                refBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                    </svg>
                    Show Reference
                `;
            }
        }
        
        // Update button states
        const prevBtn = actionsContainer?.querySelector('.quiz-screen__prev-button');
        const nextBtn = actionsContainer?.querySelector('.quiz-screen__next-button');
        const activeQuestionBlock = activeWrapper?.querySelector('.quiz-screen__question');
        const isAnswered = activeQuestionBlock?.classList.contains('answered');
        
        // Show/hide buttons based on answered state
        if (isAnswered) {
            if (prevBtn) prevBtn.classList.add('visible');
            if (nextBtn) nextBtn.classList.add('visible');
            if (refBtn) refBtn.classList.add('visible');
        } else {
            if (prevBtn) prevBtn.classList.remove('visible');
            if (nextBtn) nextBtn.classList.remove('visible');
            if (refBtn) refBtn.classList.remove('visible');
        }
        
        // Hide prev button on Q1, hide next button on Q4
        if (prevBtn) {
            prevBtn.style.visibility = activeIndex === 0 ? 'hidden' : 'visible';
        }
        if (nextBtn) {
            nextBtn.style.visibility = activeIndex === questions.length - 1 ? 'hidden' : 'visible';
        }
    });
    
    // Trigger scroll handler initially to set button states
    container.dispatchEvent(new Event('scroll'));
    
    // Calculate and set question container height
    setQuestionContainerHeight();
}

// Calculate tallest question and set container height
function setQuestionContainerHeight() {
    const questionWrappers = document.querySelectorAll('.quiz-screen__card');
    let maxHeight = 0;
    
    // Measure all questions
    questionWrappers.forEach(wrapper => {
        const height = wrapper.offsetHeight;
        if (height > maxHeight) {
            maxHeight = height;
        }
    });
    
    // Set CSS variable with tallest height
    // Calculate padding based on container query width (3.2cqw = 3.2% of container width)
    if (maxHeight > 0) {
        const container = document.querySelector('.app-container');
        const containerWidth = container ? container.offsetWidth : 0;
        const scaledPadding = containerWidth * 0.032; // 3.2cqw in pixels (fixed size)
        
        // Convert maxHeight to cqw (scales on resize), keep padding in pixels (fixed)
        const cqwValue = (maxHeight / containerWidth) * 100;
        
        document.documentElement.style.setProperty('--question-container-height', `calc(${cqwValue}cqw + ${scaledPadding}px)`);
    }
}

// Initialize quiz UI state (called when game becomes visible)
export function initQuizUI() {
    quizStartTime = Date.now(); // Record start time when user clicks Start
    const container = document.getElementById('quiz-content-container');
    const actionsContainer = document.getElementById('quiz-action-buttons');
    if (!container || !actionsContainer) return;

    // Ensure layout-dependent heights are recalculated now that the quiz is visible
    requestAnimationFrame(() => {
        setQuestionContainerHeight();
    });
    
    const activeIndex = 0; // Always start at first question
    
    // Set active dot
    document.querySelectorAll('.quiz-screen__difficulty-dot').forEach((d, idx) => {
        if(idx === activeIndex) {
            d.classList.add('quiz-screen__difficulty-dot--active');
        } else {
            d.classList.remove('quiz-screen__difficulty-dot--active');
        }
    });
    
    // Set initial button states
    const prevBtn = actionsContainer.querySelector('.quiz-screen__prev-button');
    const nextBtn = actionsContainer.querySelector('.quiz-screen__next-button');
    const refBtn = actionsContainer.querySelector('.quiz-screen__reference-button');
    const activeWrapper = document.getElementById(`block-q${activeIndex}`);
    const activeQuestionBlock = activeWrapper?.querySelector('.quiz-screen__question');
    const isAnswered = activeQuestionBlock?.classList.contains('answered');
    
    // Show/hide buttons based on answered state
    if (isAnswered) {
        if (prevBtn) prevBtn.classList.add('visible');
        if (nextBtn) nextBtn.classList.add('visible');
        if (refBtn) refBtn.classList.add('visible');
    } else {
        if (prevBtn) prevBtn.classList.remove('visible');
        if (nextBtn) nextBtn.classList.remove('visible');
        if (refBtn) refBtn.classList.remove('visible');
    }
    
    // Hide prev button on Q1
    if (prevBtn) prevBtn.style.visibility = 'hidden';
    if (nextBtn) nextBtn.style.visibility = 'visible';
    
    // Set reference button initial content
    if (refBtn) {
        refBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
            </svg>
            Show Reference
        `;
    }
}

function handleAnswerClick(selectedInput, db, stats, isRestoringAnswer = false) {
    if (selectedInput.disabled) return;
    
    selectedInput.parentElement.classList.add('selected');

    const questionIndex = parseInt(selectedInput.getAttribute('data-q-index'));
    const dateKey = selectedInput.getAttribute('data-date');
    const selectedAnswerId = selectedInput.getAttribute('data-id');
    const questionName = selectedInput.name;
    
    const allInputs = document.getElementsByName(questionName);
    allInputs.forEach(input => { 
        input.disabled = true; 
        input.parentElement.classList.add("disabled");
    });

    // Use pre-fetched stats and add user's vote locally (only if this is a new answer)
    const updatedStats = { ...stats };
    if (!isRestoringAnswer) {
        updatedStats[selectedAnswerId] = (updatedStats[selectedAnswerId] || 0) + 1;
    }

    let totalVotes = 0;
    Object.values(updatedStats).forEach(count => totalVotes += count);

    allInputs.forEach(input => {
        const aId = input.getAttribute('data-id');
        const count = updatedStats[aId] || 0;
        const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
        
        const label = input.parentElement;
        const bar = label.querySelector('.quiz-screen__percent-bar');
        const pText = label.querySelector('.percent-text');

        bar.style.width = percentage + "%";
        pText.innerText = percentage + "%";
        pText.style.display = "inline";
    });

    // Send vote to DB in background (fire and forget) - but ONLY for new answers
    if (!isRestoringAnswer) {
        const answerRef = ref(db, `quiz_stats/${dateKey}/q${questionIndex}/${selectedAnswerId}`);
        runTransaction(answerRef, (currentCount) => {
            return (currentCount || 0) + 1;
        }).catch(e => console.error("Vote error:", e));
    }

    const wrapper = document.getElementById(`block-q${questionIndex}`);
    const questionBlock = wrapper.querySelector('.quiz-screen__question');
    questionBlock.classList.add('answered');

    const selectedLabel = selectedInput.parentElement;
    
    const isCorrect = selectedInput.value === "correct";
    if (isCorrect) {
        selectedLabel.classList.add("correct-choice");
        currentScore++;
    } else {
        selectedLabel.classList.add("wrong-choice");
        allInputs.forEach(input => {
            if(input.value === "correct") input.parentElement.classList.add("correct-choice");
        });
    }
    
    // Record this question's result with difficulty
    const difficulty = selectedInput.getAttribute('data-difficulty');
    questionResults.push({
        difficulty: difficulty,
        correct: isCorrect
    });
    
    // Extract and store the answer ID (0-3) from data-id attribute (reuse selectedAnswerId from above)
    const answerIdMatch = selectedAnswerId.match(/_a(\d+)$/);
    if (answerIdMatch) {
        const answerId = parseInt(answerIdMatch[1]);
        selectedAnswerIds[questionIndex] = answerId;
    }
    
    // Trigger scroll handler to update button visibility
    const container = document.getElementById('quiz-content-container');
    if (container) {
        container.dispatchEvent(new Event('scroll'));
    }

    const nextWrapper = document.getElementById(`block-q${questionIndex + 1}`);
    if(nextWrapper) {
        const nextQuestionBlock = nextWrapper.querySelector('.quiz-screen__question');
        if (nextQuestionBlock) {
            nextQuestionBlock.classList.remove('locked');
            const overlay = nextQuestionBlock.querySelector('.quiz-screen__lock-overlay');
            if(overlay) overlay.remove();
        }
    } else {
        // Quiz Completed - but only show results if this is a new answer (not a restored one)
        if (!isRestoringAnswer) {
            setTimeout(() => finishQuiz(dateKey), 1000);
        }
    }
}

async function finishQuiz(dateKey) {
    // Calculate quiz completion data for EVERYONE (logged in or not)
    const quizEndTime = Date.now();
    const quizDuration = quizStartTime ? Math.floor((quizEndTime - quizStartTime) / 1000) : null;
    const localDate = window.getESTDate();
    const timestamp = `${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`;
    
    // Create history entry for this quiz
    const historyEntry = {
        date: dateKey,
        score: currentScore,
        totalQuestions: totalQuestions,
        timestamp: timestamp,
        duration: quizDuration,
        answers: selectedAnswerIds,
        shared: false
    };
    
    const user = getCurrentUser();
    
    // Get existing user data if logged in
    const userData = user ? getCurrentUserProfile() : null;
    const existingHistory = userData ? (userData.history || []) : [];
    const todayEntryIndex = existingHistory.findIndex(entry => entry.date === dateKey);
    const alreadyCompleted = todayEntryIndex >= 0;
    
    // Build complete history (existing + new entry)
    let fullHistory;
    if (alreadyCompleted && userData) {
        fullHistory = [...existingHistory];
        fullHistory[todayEntryIndex] = {
            ...fullHistory[todayEntryIndex],
            duration: quizDuration,
            answers: selectedAnswerIds
        };
    } else {
        fullHistory = [...existingHistory, historyEntry];
    }
    
    // Calculate streak from history
    const newStreak = calculateCurrentStreakFromHistory(fullHistory);
    const existingMaxStreak = userData ? (userData.maxStreak || 0) : 0;
    const newMaxStreak = Math.max(newStreak, existingMaxStreak);
    
    // Track quiz completion
    if (window.trackClarityEvent) {
        window.trackClarityEvent('quiz_completed', {
            score: currentScore,
            duration: quizDuration,
            userType: user ? 'user' : 'guest'
        });
    }
    
    // Track global score distribution (only if not already completed)
    if (!alreadyCompleted) {
        const scoreRef = ref(db, `quiz_stats/${dateKey}/scores/${currentScore}`);
        runTransaction(scoreRef, (count) => (count || 0) + 1).catch(e => console.error("Score tracking error:", e));
    }
    
    // Calculate total stats
    const existingTotalScore = userData ? (userData.totalScore || 0) : 0;
    const existingQuizzesTaken = userData ? (userData.quizzesTaken || 0) : 0;
    const existingTotalQuestionsAnswered = userData ? (userData.totalQuestionsAnswered || 0) : 0;
    
    const newTotalScore = alreadyCompleted ? existingTotalScore : existingTotalScore + currentScore;
    const newQuizzesTaken = alreadyCompleted ? existingQuizzesTaken : existingQuizzesTaken + 1;
    const newTotalQuestionsAnswered = alreadyCompleted ? existingTotalQuestionsAnswered : existingTotalQuestionsAnswered + totalQuestions;
    
    // Check for newly unlocked badges
    const statsForBadgeCheck = {
        maxStreak: newMaxStreak,
        quizzesTaken: newQuizzesTaken,
        totalQuestionsAnswered: newTotalQuestionsAnswered,
        history: fullHistory,
        currentStreak: newStreak
    };
    const existingBadges = userData ? (userData.badges || []) : [];
    const newlyUnlockedBadges = checkNewlyUnlockedBadges(
        userData || { badges: [] },
        statsForBadgeCheck,
        dateKey
    );
    const updatedBadges = [...existingBadges, ...newlyUnlockedBadges];
    
    // Create complete stats object
    const completeStats = {
        totalScore: newTotalScore,
        quizzesTaken: newQuizzesTaken,
        totalQuestionsAnswered: newTotalQuestionsAnswered,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        history: fullHistory,
        badges: updatedBadges,
        newlyUnlockedBadges: newlyUnlockedBadges,
        alreadyCompleted: alreadyCompleted
    };
    
    if (user) {
        // LOGGED-IN USER: Save to Firestore and update local cache
        try {
            if (!userData) {
                console.error('No user data in cache');
                return;
            }
            
            // Update local cache immediately
            updateLocalUserData({
                totalScore: newTotalScore,
                quizzesTaken: newQuizzesTaken,
                totalQuestionsAnswered: newTotalQuestionsAnswered,
                currentStreak: newStreak,
                maxStreak: newMaxStreak,
                history: fullHistory,
                badges: updatedBadges
            });
            
            // Prepare Firestore update
            const userRef = doc(firestore, "users", user.uid);
            const firestoreUpdate = {
                history: fullHistory,
                currentStreak: newStreak,
                maxStreak: newMaxStreak
            };
            
            // Only increment if not already completed
            if (!alreadyCompleted) {
                firestoreUpdate.totalScore = increment(currentScore);
                firestoreUpdate.quizzesTaken = increment(1);
                firestoreUpdate.totalQuestionsAnswered = increment(totalQuestions);
            }
            
            // Add newly unlocked badges to Firestore update
            if (newlyUnlockedBadges.length > 0) {
                firestoreUpdate.badges = arrayUnion(...newlyUnlockedBadges);
            }
            
            // Update Firestore with retry logic (non-blocking for UX)
            firestoreWithRetry(() => updateDoc(userRef, firestoreUpdate), 3, 1000, 'quiz_results_save').catch(error => {
                console.error("Error saving stats to Firestore after retries:", error);
                // Silently fail - user already has results locally
            });
            
            // Highlight the bar for the score just achieved (green feedback)
            const scoreRow = document.querySelector(`.stats-modal__distribution-row[data-score="${currentScore}"]`);
            if (scoreRow) {
                const bar = scoreRow.querySelector('.stats-modal__distribution-bar');
                if (bar) {
                    bar.setAttribute('data-highlight', 'true');
                }
            }
        } catch (error) {
            console.error("Error in finishQuiz:", error);
        }
    } else {
        // GUEST USER: Store stats in memory for later account creation
        pendingGuestStats = completeStats;
    }
    
    // Show results screen for everyone
    showResultsScreen(currentScore, totalQuestions);
}

async function updateShareTracking() {
    const user = getCurrentUser();
    if (!user) return;
    
    const userData = getCurrentUserProfile();
    if (!userData) return;
    
    // Get today's date (shares only happen same-day)
    const quizDate = window.todayString;
    
    // Find and update the history entry
    const history = userData.history || [];
    const entryIndex = history.findIndex(entry => entry.date === quizDate);
    if (entryIndex === -1) return;
    
    // Update shared field
    history[entryIndex].shared = true;
    
    // Update Firestore with retry logic
    const userRef = doc(firestore, "users", user.uid);
    try {
        await firestoreWithRetry(() => updateDoc(userRef, {
            history: history,
            shares: increment(1)
        }), 3, 1000, 'share_tracking');
    } catch (error) {
        console.error("Error updating share tracking after retries:", error);
        // Continue anyway - user still gets to share
    }
    
    // Update local cache
    updateLocalUserData({
        history: history,
        shares: (userData.shares || 0) + 1
    });
    
    // Check if Fellowship badge was just unlocked
    const newBadges = checkNewlyUnlockedBadges(userData, {
        shares: (userData.shares || 0) + 1
    }, quizDate);
    
    if (newBadges.length > 0) {
        // Update badges in Firestore with retry logic
        try {
            await firestoreWithRetry(() => updateDoc(userRef, {
                badges: arrayUnion(...newBadges)
            }), 3, 1000, 'badge_unlock');
        } catch (error) {
            console.error("Error updating badges after retries:", error);
            // Continue - badges will sync next time
        }
        // Update local cache with new badges
        updateLocalUserData({
            badges: [...(userData.badges || []), ...newBadges]
        });
    }
}

// --- Results Screen ---

// Load non-critical data after all essential quiz components are ready
export async function loadNonCriticalData() {
    // Prepare blended global stats for results modal
    await prepareGlobalStats();
    
    // Preload friends scores for instant display in results modal
    await preloadFriendsScores();
    
    // Future: Add other non-critical operations here
    // - Preload assets
    // - Analytics warm-up
}

// Prepare blended global stats at quiz load time for instant display
async function prepareGlobalStats() {
    try {
        // Get today's scores from cached stats
        const todayScores = dailyStats.scores || {};
        const todayTotal = Object.values(todayScores).reduce((sum, count) => sum + (count || 0), 0);
        
        // Use today's actual data only
        let displayedScoreCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
        for (let i = 0; i <= 4; i++) {
            displayedScoreCounts[i] = todayScores[i] || 0;
        }
        
        // Store for instant display later
        blendedGlobalStats = {
            scoreCounts: displayedScoreCounts,
            total: todayTotal,
            todayTotal: todayTotal
        };
        
    } catch (error) {
        blendedGlobalStats = null;
    }
}

// Fetch friends data from Firestore
async function fetchFriendsData(friends) {
    const friendsData = await Promise.all(
            friends.map(async (friendUid) => {
                try {
                    const friendDocRef = doc(firestore, 'users', friendUid);
                    const friendDoc = await getDoc(friendDocRef, { source: 'server' });
                    
                    if (!friendDoc.exists()) {
                        return null;
                    }
                    
                    const friendData = friendDoc.data();
                    const displayName = friendData.displayName || 'Anonymous';
                    const history = friendData.history || [];
                    
                    // Find today's entry
                    const todayEntry = history.find(entry => entry.date === window.todayString);
                    
                    if (todayEntry) {
                        return {
                            displayName,
                            score: todayEntry.score,
                            totalQuestions: todayEntry.totalQuestions,
                            answers: todayEntry.answers || [],
                            completed: true
                        };
                    } else {
                        return {
                            displayName,
                            score: null,
                            totalQuestions: null,
                            answers: [],
                            completed: false
                        };
                    }
                } catch (error) {
                    return null;
                }
            })
        );
        
    // Filter out null results (deleted users or fetch errors) and track valid UIDs
    const validFriends = [];
    const validFriendUids = [];
    friendsData.forEach((friendData, index) => {
        if (friendData !== null) {
            validFriends.push(friendData);
            validFriendUids.push(friends[index]);
        }
    });
    
    // Clean up deleted users from the friends array
    if (validFriendUids.length < friends.length && getCurrentUser()) {
        try {
            const currentUserId = getCurrentUser().uid;
            const currentUserRef = doc(firestore, 'users', currentUserId);
            await updateDoc(currentUserRef, {
                friends: validFriendUids
            });
        } catch (error) {
            // Failed to clean up deleted friends
        }
    }
    
    if (validFriends.length === 0) {
        return null;
    }
    
    // Sort: completed first (by score desc), then incomplete
    validFriends.sort((a, b) => {
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            if (a.completed && b.completed) return b.score - a.score;
        return a.displayName.localeCompare(b.displayName);
    });
    
    return validFriends;
}

// Preload friends scores in background for instant display
export async function preloadFriendsScores() {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        const currentProfile = getCurrentUserProfile();
        const friends = currentProfile?.friends || [];
        
        if (friends.length === 0) return;
        
        // Fetch and cache friends data
        preloadedFriendsData = await fetchFriendsData(friends);
    } catch (error) {
        // Silently fail - will fetch on demand if needed
    }
}

// Clear preloaded friends data (call on sign out)
export function clearPreloadedFriendsData() {
    preloadedFriendsData = null;
}

// Render friends scores in the UI
function renderFriendsScores(validFriends, scoresList) {
    scoresList.innerHTML = '';
    
    validFriends.forEach((friend, index) => {
            const item = document.createElement('div');
            item.className = 'friends-score-item';
            if (!friend.completed) {
                item.classList.add('friends-score-item--incomplete');
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'friends-score-name';
            nameSpan.textContent = friend.displayName;
            
            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'friends-score-value';
            if (friend.completed) {
                scoreSpan.textContent = `${friend.score}/${friend.totalQuestions}`;
            } else {
                scoreSpan.textContent = 'Not completed yet';
                scoreSpan.style.opacity = '0.5';
            }
            
            item.appendChild(nameSpan);
            item.appendChild(scoreSpan);
            
            // Add answer indicators if completed
            if (friend.completed && friend.answers && friend.answers.length > 0) {
                const answersContainer = document.createElement('div');
                answersContainer.className = 'friends-score-answers';
                
                friend.answers.forEach((answerId, qIndex) => {
                    const indicator = document.createElement('span');
                    indicator.className = 'friends-score-answer-indicator';
                    if (answerId === 0) {
                        indicator.classList.add('friends-score-answer-indicator--correct');
                        indicator.textContent = '✅';
                    } else {
                        indicator.classList.add('friends-score-answer-indicator--wrong');
                        indicator.textContent = '❌';
                    }
                    answersContainer.appendChild(indicator);
                });
                
                item.appendChild(answersContainer);
            }
            
        scoresList.appendChild(item);
    });
    
    scoresList.style.display = 'flex';
}

async function loadFriendsScores() {
    const emptyState = document.getElementById('friends-empty-state');
    const scoresList = document.getElementById('friends-scores-list');
    
    if (!emptyState || !scoresList) return;
    
    // Hide both initially
    emptyState.style.display = 'none';
    scoresList.style.display = 'none';
    
    try {
        const user = getCurrentUser();
        if (!user) {
            emptyState.querySelector('.friends-empty-state__title').textContent = 'Sign in to see friends\' scores';
            emptyState.style.display = 'flex';
            return;
        }
        
        const currentProfile = getCurrentUserProfile();
        const friends = currentProfile?.friends || [];
        
        if (friends.length === 0) {
            emptyState.querySelector('.friends-empty-state__title').textContent = 'No friends yet';
            emptyState.style.display = 'flex';
            return;
        }
        
        // Use preloaded data if available
        let validFriends = preloadedFriendsData;
        
        // If no preloaded data, fetch now
        if (!validFriends) {
            validFriends = await fetchFriendsData(friends);
        }
        
        if (!validFriends || validFriends.length === 0) {
            emptyState.querySelector('.friends-empty-state__title').textContent = 'Unable to load friends\' scores';
            emptyState.style.display = 'flex';
            return;
        }
        
        // Render the friends scores
        renderFriendsScores(validFriends, scoresList);
        
    } catch (error) {
        emptyState.querySelector('.friends-empty-state__title').textContent = 'Error loading friends\' scores';
        emptyState.style.display = 'flex';
    }
}

export async function showResultsScreen(score, total) {
    // Show results modal
    const resultsModal = document.getElementById('results-modal');
    if (resultsModal) {
        resultsModal.style.display = 'flex';
    }
    
    // Show the Show Results button after modal animation completes
    setTimeout(() => {
        const showResultsBtn = document.getElementById('show-results-btn');
        if (showResultsBtn) {
            showResultsBtn.style.display = 'block';
        }
    }, 500);
    
    // Update score
    const scoreElement = document.getElementById('results-score');
    if (scoreElement) {
        scoreElement.textContent = `${score}/${total}`;
    }
    
    // Load and display global stats
    await loadGlobalStats(score);
    
    // Load and display friends' scores
    await loadFriendsScores();
    
    // Start countdown timer
    startCountdownTimer();
    
    // Setup button handlers
    setupResultsButtons();
}

async function loadGlobalStats(userScore) {
    const globalPanel = document.querySelector('.results-modal__global-panel');
    
    if (!globalPanel) return;
    
    // Use pre-calculated stats (no fetching or calculation needed)
    if (!blendedGlobalStats) {
        globalPanel.innerHTML = `
            <span>Unable to load stats</span>
        `;
        return;
    }
    
    const { scoreCounts, total, todayTotal } = blendedGlobalStats;
    
    if (total === 0) {
        globalPanel.innerHTML = `
            <span>Be the first to complete today's quiz!</span>
        `;
        return;
    }
    
    // Build the score distribution display
    let html = '<div class="results-modal__score-distribution">';
    
    // Find the maximum count to scale bars
    const maxCount = Math.max(...Object.values(scoreCounts));
    
    // Build scores column
    html += '<div class="results-modal__scores-column">';
    for (let score = 4; score >= 1; score--) {
        const isUserScore = score === userScore;
        let scoreLabel;
        if (score === 4) {
            scoreLabel = 'Perfect';
        } else {
            scoreLabel = `${score} Right`;
        }
        html += `<span class="results-modal__score-label ${isUserScore ? 'results-modal__score-label--highlight' : ''}">${scoreLabel}</span>`;
    }
    html += '</div>';
    
    // Add divider
    html += '<div class="results-modal__divider"></div>';
    
    // Build bars column
    html += '<div class="results-modal__bars-column">';
    for (let score = 4; score >= 1; score--) {
        const count = scoreCounts[score];
        const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const isUserScore = score === userScore;
        
        html += `
            <div class="results-modal__bar-row ${isUserScore ? 'results-modal__bar-row--highlight' : ''}">
                <div class="results-modal__score-bar-container">
                    <div class="results-modal__score-bar" style="width: ${barWidth}%"></div>
                </div>
                <span class="results-modal__score-percentage">${percentage}%</span>
            </div>
        `;
    }
    html += '</div>';
    
    html += '</div>';
    
    // Add footer with total count
    html += `<div class="results-modal__global-footer">Based on ${total} ${total === 1 ? 'player' : 'players'}</div>`;
    
    globalPanel.innerHTML = html;
}

let countdownInterval = null;

function closeResultsModal(callback) {
    const resultsModal = document.getElementById('results-modal');
    if (resultsModal) {
        resultsModal.classList.add('results-modal--fade-out');
        setTimeout(() => {
            resultsModal.style.display = 'none';
            resultsModal.classList.remove('results-modal--fade-out');
            if (callback) callback();
        }, 300);
    } else if (callback) {
        callback();
    }
    
    // Clear countdown interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

export function startCountdownTimer() {
    // Clear any existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    const countdownElement = document.getElementById('results-countdown');
    if (!countdownElement) return;
    
    function updateCountdown() {
        // Calculate time until local midnight
        const now = new Date();
        
        // Get next midnight in user's local timezone
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const diff = tomorrow - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        countdownElement.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Update immediately
    updateCountdown();
    
    // Update every second
    countdownInterval = setInterval(updateCountdown, 1000);
}

function setupResultsButtons() {
    // Leaderboard tab switching
    const leaderboardTabs = document.querySelectorAll('.results-modal__leaderboard-tab');
    const leaderboardContent = document.querySelector('.results-modal__leaderboard-content');
    
    // Function to switch to a specific tab
    const switchToTab = (tabName) => {
        leaderboardTabs.forEach(t => {
            if (t.getAttribute('data-tab') === tabName) {
                t.classList.add('results-modal__leaderboard-tab--active');
            } else {
                t.classList.remove('results-modal__leaderboard-tab--active');
            }
        });
        
        if (tabName === 'global') {
            leaderboardContent.classList.add('show-global');
        } else {
            leaderboardContent.classList.remove('show-global');
        }
    };
    
    leaderboardTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPanel = tab.getAttribute('data-tab');
            switchToTab(targetPanel);
        });
    });
    
    // Swipe functionality for leaderboard
    const leaderboardSlider = document.querySelector('.results-modal__leaderboard-slider');
    if (leaderboardSlider) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let isSwiping = false;
        const swipeThreshold = 50; // Minimum swipe distance in pixels
        
        leaderboardSlider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            isSwiping = false;
        }, { passive: true });
        
        leaderboardSlider.addEventListener('touchmove', (e) => {
            if (isSwiping) return;
            
            const touchCurrentX = e.changedTouches[0].screenX;
            const touchCurrentY = e.changedTouches[0].screenY;
            
            const deltaX = Math.abs(touchCurrentX - touchStartX);
            const deltaY = Math.abs(touchCurrentY - touchStartY);
            
            // Detect if gesture is more horizontal than vertical
            if (deltaX > deltaY && deltaX > 10) {
                isSwiping = true;
                e.preventDefault(); // Prevent vertical scroll during horizontal swipe
            }
        }, { passive: false }); // passive: false allows preventDefault
        
        leaderboardSlider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (isSwiping) {
                handleSwipe();
            }
        }, { passive: true });
        
        const handleSwipe = () => {
            const swipeDistance = touchStartX - touchEndX;
            
            // Only process if swipe distance exceeds threshold
            if (Math.abs(swipeDistance) < swipeThreshold) return;
            
            const isShowingGlobal = leaderboardContent.classList.contains('show-global');
            
            if (swipeDistance > 0) {
                // Swiped left - show global
                if (!isShowingGlobal) {
                    switchToTab('global');
                }
            } else {
                // Swiped right - show friends
                if (isShowingGlobal) {
                    switchToTab('friends');
                }
            }
        };
    }
    
    // Overlay click to close
    const resultsOverlay = document.querySelector('.results-modal__overlay');
    if (resultsOverlay) {
        const newOverlay = resultsOverlay.cloneNode(true);
        resultsOverlay.parentNode.replaceChild(newOverlay, resultsOverlay);
        
        newOverlay.addEventListener('click', () => {
            document.getElementById('results-close-btn')?.click();
        });
    }
    
    // Share button
    const shareBtn = document.getElementById('results-share-btn');
    if (shareBtn) {
        // Remove old listeners by cloning
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        
        newShareBtn.addEventListener('click', async (e) => {
            // Prevent event from bubbling to overlay
            e.stopPropagation();
            
            // Track share button click
            if (window.trackClarityEvent) {
                window.trackClarityEvent('share_clicked');
            }
            
            const score = document.getElementById('results-score')?.textContent || '0/4';
            
            // Generate visual representation based on questionResults
            let visualScore = '';
            if (questionResults && questionResults.length > 0) {
                visualScore = questionResults.map(result => result.correct ? '✅' : '❌').join('');
            } else {
                // Fallback if questionResults not available
                const [correct, totalQ] = score.split('/').map(n => parseInt(n));
                visualScore = '✅'.repeat(correct) + '❌'.repeat(totalQ - correct);
            }
            
            const quizNum = window.quizNumber || '?';
            const shareText = `I scored ${score} on Bible Quiz #${quizNum}\n${visualScore}\n\nTry it:\nrythebibleguy.com/quiz`;
            
            // Try native share API first
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Daily Bible Quiz',
                        text: shareText
                    });
                    // Share succeeded - update tracking
                    await updateShareTracking();
                } catch (err) {
                    // User cancelled - do nothing
                    if (err.name === 'AbortError') {
                        return;
                    }
                    // Share API failed (e.g., Instagram blocking) - try clipboard fallback
                    try {
                        await navigator.clipboard.writeText(shareText);
                        // Update tracking
                        await updateShareTracking();
                        // Show feedback
                        const originalText = newShareBtn.innerHTML;
                        newShareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!';
                        setTimeout(() => {
                            newShareBtn.innerHTML = originalText;
                        }, 2000);
                    } catch (clipboardErr) {
                        console.error('Clipboard fallback failed:', clipboardErr);
                    }
                }
            } else {
                // Fallback: copy to clipboard
                try {
                    await navigator.clipboard.writeText(shareText);
                    // Update tracking
                    await updateShareTracking();
                    // Show feedback
                    const originalText = newShareBtn.innerHTML;
                    newShareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!';
                    setTimeout(() => {
                        newShareBtn.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            }
        });
    }
    
    // Share friend link button (in results modal empty state)
    const shareFriendLinkBtn = document.getElementById('results-share-friend-link-btn');
    const guestSignInBtn = document.getElementById('results-guest-signin-btn');
    if (shareFriendLinkBtn && guestSignInBtn) {
        const user = getCurrentUser();
        const friendsPanel = document.querySelector('.results-modal__friends-panel');
        
        if (!user) {
            // Show sign in button for guests
            shareFriendLinkBtn.style.display = 'none';
            guestSignInBtn.style.display = 'flex';
            
            // Wire up guest sign in button
            const newGuestSignInBtn = guestSignInBtn.cloneNode(true);
            guestSignInBtn.parentNode.replaceChild(newGuestSignInBtn, guestSignInBtn);
            
            newGuestSignInBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close results modal and open auth modal
                closeResultsModal(() => {
                    if (window.openAuthModal) {
                        window.openAuthModal();
                    }
                });
            });
        } else {
            // Show add friends button for logged-in users
            guestSignInBtn.style.display = 'none';
            shareFriendLinkBtn.style.display = 'flex';
            
            const newShareFriendBtn = shareFriendLinkBtn.cloneNode(true);
            shareFriendLinkBtn.parentNode.replaceChild(newShareFriendBtn, shareFriendLinkBtn);
            
            newShareFriendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                shareFriendLink();
            });
        }
    }
    
    // Close button
    const closeBtn = document.getElementById('results-close-btn');
    if (closeBtn) {
        // Remove old listeners by cloning
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeResultsModal();
        });
    }
}