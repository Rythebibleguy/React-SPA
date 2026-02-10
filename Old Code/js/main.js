import { initQuiz, loadRemainingQuestions, initQuizUI, showResultsScreen, startCountdownTimer, loadNonCriticalData, startStatsPreload, applySavedAnswers } from "./quiz.js";
import { initAuth, getCurrentUser, getCurrentUserProfile, handleFriendParameter } from "./auth.js";

// Clarity tracking helper
function trackClarityEvent(eventName, properties = {}) {
    if (window.clarity) {
        clarity("event", eventName, properties);
    }
}

// Make trackClarityEvent available globally
window.trackClarityEvent = trackClarityEvent;

// Make initQuizUI available globally for inline handler
window.initQuizUI = initQuizUI;

// Function to check if quiz is completed and show results
function checkAndShowCompletedQuiz() {
    const user = getCurrentUser();
    if (user) {
        const userData = getCurrentUserProfile();
        if (userData?.history) {
            const todayEntry = userData.history.find(entry => entry.date === window.todayString);
            if (todayEntry && todayEntry.answers) {
                const savedAnswers = todayEntry.answers;
                const isCompleted = savedAnswers.every(answer => answer !== null && answer !== undefined);
                
                if (isCompleted) {
                    // Apply visual state first, then show results
                    setTimeout(() => {
                        applySavedAnswers();
                        // Show results after answers are visually applied
                        setTimeout(() => {
                            showResultsScreen(
                                todayEntry.score, 
                                todayEntry.totalQuestions
                            );
                        }, 200);
                    }, 100);
                } else {
                    // Quiz partially completed, apply saved answers
                    setTimeout(() => {
                        applySavedAnswers();
                    }, 100);
                }
            }
        }
    }
}

// Make it available globally for inline handler
window.checkAndShowCompletedQuiz = checkAndShowCompletedQuiz;

// Initialize everything - run immediately since script loads after DOM
async function initialize() {
    // Track page load
    trackClarityEvent('page_loaded');
    
    // Start stats preload immediately (runs in parallel with auth)
    startStatsPreload();
    
    await initAuth(); // Wait for auth to complete before continuing
    
    // Check for friend parameter in URL
    await handleFriendParameter();
    
    await initQuiz();
    
    // Load remaining questions after page fully loads
    if (document.readyState === 'complete') {
        // Page already loaded, fetch remaining questions now
        await loadRemainingQuestions();
        loadNonCriticalData(); // Load non-critical data in background
    } else {
        // Wait for page to fully load
        window.addEventListener('load', async () => {
            await loadRemainingQuestions();
            loadNonCriticalData(); // Load non-critical data in background
        });
    }
    
    // Handle Info Button
    const infoBtn = document.getElementById('info-button');
    const infoModal = document.getElementById('info-modal-overlay');
    const infoCloseBtn = document.getElementById('info-modal-close-button');
    
    infoBtn.addEventListener('click', () => {
        infoModal.style.display = 'flex';
    });
    
    infoCloseBtn.addEventListener('click', () => {
        infoModal.classList.add('fade-out');
        setTimeout(() => {
            infoModal.style.display = 'none';
            infoModal.classList.remove('fade-out');
        }, 190);
    });
    
    // Handle Show Results Button
    const showResultsBtn = document.getElementById('show-results-btn');
    if (showResultsBtn) {
        showResultsBtn.addEventListener('click', () => {
            const resultsModal = document.getElementById('results-modal');
            if (resultsModal) {
                resultsModal.style.display = 'flex';
                startCountdownTimer();
            }
        });
    }
    
    // Close info when clicking outside
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.add('fade-out');
            setTimeout(() => {
                infoModal.style.display = 'none';
                infoModal.classList.remove('fade-out');
            }, 190);
        }
    });
    
    // Handle Stacked Modal Close
    const stackedOverlay = document.getElementById('stacked-modal-overlay');
    const stackedCloseBtn = document.getElementById('stacked-modal-close');
    const mainContainer = document.getElementById('app-container');
    
    if (stackedOverlay && stackedCloseBtn && mainContainer) {
        const closeStackedModal = () => {
            // Remove active classes to trigger reverse animation
            mainContainer.classList.remove('stacked-active');
            stackedOverlay.classList.remove('active');
            // Hide overlay after animation completes
            setTimeout(() => {
                stackedOverlay.style.display = 'none';
            }, 400);
        };
        
        stackedCloseBtn.addEventListener('click', closeStackedModal);
        
        // Close when clicking the overlay background
        stackedOverlay.addEventListener('click', (e) => {
            if (e.target === stackedOverlay) {
                closeStackedModal();
            }
        });
    }
}

// Run initialization immediately or when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}