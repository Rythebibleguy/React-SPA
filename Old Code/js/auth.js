import { 
    auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, GoogleAuthProvider, signInWithPopup, linkWithPopup,
    firestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, increment, arrayUnion
} from "./firebase-config.js";
import { getPendingQuizData, initQuiz, applySavedAnswers, showResultsScreen, clearPreloadedFriendsData } from "./quiz.js";

// --- DOM Elements ---
let welcomeView, gameView, userControls;
let userMenuBtn, userDropdown, infoBtn, guestMenuButton;
let loginBtnMain; // For backward compatibility check

// --- State ---
let currentUser = null;
let userFirestoreData = null;

// --- Auth Functions ---

export function initAuth() {
    // Return a promise that resolves when auth state is determined
    return new Promise((resolve) => {
        // Initialize DOM Elements
        welcomeView = document.getElementById('welcome-screen');
        gameView = document.getElementById('quiz-screen');
        
        // Guest menu
        const guestMenu = document.getElementById('guest-menu');
        guestMenuButton = document.getElementById('guest-menu-button');
        const guestMenuDropdown = document.getElementById('guest-menu-dropdown');
        
        // User menu
        const userMenu = document.getElementById('user-menu');
        userMenuBtn = document.getElementById('user-menu-button');
        userDropdown = document.getElementById('user-menu-dropdown');
        
        infoBtn = document.getElementById('info-button');

        // Check for old HTML (Caching issue)
        if (!userMenuBtn) {
            loginBtnMain = document.getElementById('login-btn-main');
            if (loginBtnMain) {
                alert("We've updated the site! Please refresh the page (Ctrl+F5) to see the changes.");
                resolve();
                return;
            } else {
                resolve();
                return;
            }
        }

        // Auth State Listener
        onAuthStateChanged(auth, async (user) => {
            const wasGuest = !currentUser;
            console.log('👤 Auth state changed, user:', user?.uid || 'null', 'wasGuest:', wasGuest);
            currentUser = user;
            if (user) {
                // User is signed in
                await loadUserProfile(user);
                updateUIForLogin();
                
                // Check for pending friend request (e.g., from OAuth redirect)
                const storedFriendUid = sessionStorage.getItem('pendingFriendUid');
                if (storedFriendUid && wasGuest) {
                    // Process the pending friend request
                    await processFriendRequest(storedFriendUid);
                }
                
                // If user signed in mid-session (was guest), apply their saved answers
                if (wasGuest && userFirestoreData?.history) {
                    const todayEntry = userFirestoreData.history.find(entry => entry.date === window.todayString);
                    const welcomeScreen = document.getElementById('welcome-screen');
                    const quizStarted = welcomeScreen && welcomeScreen.style.display === 'none';
                    
                    // Only apply if they have saved answers, quiz is initialized, and quiz has been started
                    if (todayEntry?.answers && document.querySelector('.quiz-screen__content') && quizStarted) {
                        const savedAnswers = todayEntry.answers;
                        const totalQuestions = savedAnswers.length;
                        
                        // Check if quiz is completed (all answers present)
                        const isCompleted = savedAnswers.every(answer => answer !== null && answer !== undefined);
                        
                        // Apply saved answers first
                        applySavedAnswers();
                        
                        if (isCompleted) {
                            // Show results after answers are visually applied
                            setTimeout(async () => {
                                const score = todayEntry.score ?? savedAnswers.filter(a => a !== null).length;
                                await showResultsScreen(score, totalQuestions);
                            }, 200);
                        }
                    }
                }
            } else {
                // User is signed out
                userFirestoreData = null;
                updateUIForLogout();
            }
            
            // Resolve promise now that auth state is determined
            resolve();
        });

    // Event Listeners for Guest Menu
    guestMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(guestMenuDropdown);
    });
    
    // Event Listeners for Logged In Button
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(userDropdown);
    });

    // Close dropdowns when clicking/tapping outside
    const handleOutsideInteraction = (e) => {
        if (!guestMenuDropdown.contains(e.target) && !guestMenuButton.contains(e.target)) {
            guestMenuDropdown.classList.remove('guest-menu__dropdown--show');
        }
        if (!userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
            userDropdown.classList.remove('user-menu__dropdown--show');
        }
    };
    
    window.addEventListener('click', handleOutsideInteraction);
    window.addEventListener('touchstart', handleOutsideInteraction);
    
    // Dropdown button handlers
    // Function to open auth modal (can be called from anywhere)
    window.openAuthModal = function() {
        const authOverlay = document.getElementById('auth-modal');
        const mainContainer = document.getElementById('app-container');
        
        if (authOverlay && mainContainer) {
            // Show overlay
            authOverlay.style.display = 'flex';
            // Trigger animations
            setTimeout(() => {
                mainContainer.classList.add('app-container--stacked-modal-active');
                authOverlay.classList.add('stacked-modal__overlay--active');
            }, 10);
        }
        
        const guestMenuDropdown = document.getElementById('guest-menu-dropdown');
        if (guestMenuDropdown) {
            guestMenuDropdown.classList.remove('guest-menu__dropdown--show');
        }
    };
    
    document.getElementById('login-signup-btn').addEventListener('click', () => {
        // Open auth modal
        window.openAuthModal();
    });
    
    // Auth modal close button
    document.getElementById('auth-modal-close').addEventListener('click', () => {
        closeAuthModal();
    });
    
    // Close auth modal when clicking outside
    document.getElementById('auth-modal').addEventListener('click', (e) => {
        if (e.target.id === 'auth-modal') {
            closeAuthModal();
        }
    });
    
    // Stats modal close button
    document.getElementById('stats-modal-close').addEventListener('click', () => {
        closeStatsModal();
    });
    
    // Close stats modal when clicking outside
    document.getElementById('stats-modal').addEventListener('click', (e) => {
        if (e.target.id === 'stats-modal') {
            closeStatsModal();
        }
    });
    
    // Profile modal close button
    document.getElementById('profile-modal-close').addEventListener('click', () => {
        closeProfileModal();
    });
    
    // Close profile modal when clicking outside
    document.getElementById('profile-modal').addEventListener('click', (e) => {
        if (e.target.id === 'profile-modal') {
            closeProfileModal();
        }
    });
    
    document.getElementById('profile-button').addEventListener('click', () => {
        openProfileModal();
        userDropdown.classList.remove('user-menu__dropdown--show');
    });
    
    document.getElementById('stats-button').addEventListener('click', () => {
        openStatsModal();
        userDropdown.classList.remove('user-menu__dropdown--show');
    });
    
    document.getElementById('logout-button').addEventListener('click', () => {
        handleLogout();
        userDropdown.classList.remove('user-menu__dropdown--show');
    });
    
    // Store references for later use
    window.guestMenu = guestMenu;
    window.userMenu = userMenu;
    
    // ========== NEW AUTH MODAL HANDLERS ==========
    // Set up event listeners once - never removed or changed
    
    // Email submit button
    document.getElementById('auth-email-submit-btn').addEventListener('click', async () => {
        await handleEmailCheck();
    });
    
    // Login button
    document.getElementById('auth-login-btn').addEventListener('click', async () => {
        await handleLogin();
    });
    
    // Signup button
    document.getElementById('auth-signup-btn').addEventListener('click', async () => {
        await handleSignup();
    });
    
    // Handle Google Sign-In Button
    const googleSignInBtn = document.querySelector('.auth-modal__btn--outline');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleGoogleSignIn();
        });
    }
    
    // Hide error icon when typing in signup name field
    document.getElementById('auth-signup-name').addEventListener('input', () => {
        const errorIcon = document.getElementById('auth-signup-name-error');
        if (errorIcon) {
            errorIcon.style.display = 'none';
        }
    });
    
    // Hide error icon when typing in profile name field
    document.getElementById('profile-name-input').addEventListener('input', () => {
        const errorIcon = document.getElementById('profile-name-error');
        if (errorIcon) {
            errorIcon.style.display = 'none';
        }
    });
    
    // Avatar color palette
    document.getElementById('profile-avatar').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleColorPalette();
    });
    
    // Close color palette when clicking outside
    window.addEventListener('click', (e) => {
        const colorPalette = document.getElementById('profile-color-palette');
        const profileAvatar = document.getElementById('profile-avatar');
        if (!colorPalette.contains(e.target) && !profileAvatar.contains(e.target)) {
            colorPalette.style.display = 'none';
        }
    }, true);
    
    // Display name editing
    document.getElementById('profile-name-edit-btn').addEventListener('click', () => {
        enterEditMode();
    });
    
    document.getElementById('profile-name-save-btn').addEventListener('click', async () => {
        await saveDisplayName();
    });
    
    document.getElementById('profile-name-cancel-btn').addEventListener('click', () => {
        exitEditMode();
    });
    
    // Save on Enter key
    document.getElementById('profile-name-input').addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            await saveDisplayName();
        } else if (e.key === 'Escape') {
            exitEditMode();
        }
    });
    
    // Share friend link button
    document.getElementById('profile-share-friend-link').addEventListener('click', () => {
        shareFriendLink();
    });
    
    }); // End of Promise - auth state listener
}

// --- View Management ---

async function showView(viewName) {
    // Only hide main views if we are switching between them
    if (viewName === 'welcome' || viewName === 'game') {
        welcomeView.style.display = 'none';
        gameView.style.display = 'none';
    }

    // Show requested view
    if (viewName === 'user-profile') {
        // Old profile modal removed - this view is now handled by profile-modal
        // Open the new profile modal instead
        const profileModal = document.getElementById('profile-modal');
        if (profileModal && currentUser) {
            await loadUserProfile(currentUser);
            profileModal.style.display = 'flex';
            profileModal.classList.add('stacked-modal__overlay--active');
            document.getElementById('app-container').style.filter = 'blur(3px)';
        }
    } else if (viewName === 'welcome') {
        welcomeView.style.display = 'block';
    } else if (viewName === 'game') {
        gameView.style.display = 'flex';
    }
}

function goBack() {
    // Old profile modal removed - goBack now only handles new modals
    // Check if any stacked modals are open
    const activeModal = document.querySelector('.stacked-modal__overlay--active');
    const mainContainer = document.getElementById('app-container');

    if (activeModal) {
        activeModal.classList.remove('stacked-modal__overlay--active');
        if (mainContainer) {
            mainContainer.classList.remove('app-container--stacked-modal-active');
        }
        // Wait for animation to finish
        setTimeout(() => {
            activeModal.style.display = 'none';
        }, 400); // Match the transition duration
    }
}

function toggleDropdown(dropdown) {
    // Check for BEM modifier based on dropdown ID
    let bemModifier = 'show';
    if (dropdown.id === 'guest-menu-dropdown') {
        bemModifier = 'guest-menu__dropdown--show';
    } else if (dropdown.id === 'user-menu-dropdown') {
        bemModifier = 'user-menu__dropdown--show';
    }
    
    const isVisible = dropdown.classList.contains(bemModifier);
    if (isVisible) {
        dropdown.classList.remove(bemModifier);
    } else {
        dropdown.classList.add(bemModifier);
    }
}

function updateUIForLogin() {
    const displayName = userFirestoreData?.displayName || currentUser?.displayName || 'User';
    const firstLetter = displayName.toLowerCase().charAt(0).toUpperCase();
    userMenuBtn.innerHTML = `
        <div class="avatar avatar--user-button">
            <span class="avatar__letter">${firstLetter}</span>
        </div>
    `;
    
    // Apply saved avatar color
    const avatarColor = userFirestoreData?.avatarColor || '#74b9ff';
    applyAvatarColor(avatarColor);
    
    // Show user menu
    window.userMenu.style.display = 'flex';
    
    // Hide guest menu
    window.guestMenu.style.display = 'none';
    
    // Mark auth state as ready
    window.authStateReady = true;
    window.currentAuthState = 'logged-in';
    
    // Show buttons immediately only if video is past 1.5s, otherwise let video trigger them
    const bibleVideo = document.getElementById('welcome-bible-video');
    
    // Fade in user menu and info button
    setTimeout(() => {
        window.userMenu.style.opacity = '1';
        window.userMenu.style.pointerEvents = 'auto';
        
        window.guestMenu.style.opacity = '0';
        window.guestMenu.style.pointerEvents = 'none';
        guestMenuButton.classList.remove('visible');
        
        // Only show buttons if animation timing (1.0s) has passed
        if (window.welcomeNavTimingPassed) {
            userMenuBtn.classList.add('visible');
            infoBtn.classList.add('visible');
        }
    }, 10);
}

function updateUIForLogout() {
    // Show guest menu
    window.guestMenu.style.display = 'flex';
    
    // Hide user menu
    window.userMenu.style.display = 'none';
    
    // Mark auth state as ready
    window.authStateReady = true;
    window.currentAuthState = 'logged-out';
    
    // Show buttons immediately only if video is past 1.5s, otherwise let video trigger them
    const bibleVideo = document.getElementById('welcome-bible-video');
    
    // Fade in guest menu and info button
    setTimeout(() => {
        window.guestMenu.style.opacity = '1';
        window.guestMenu.style.pointerEvents = 'auto';
        
        window.userMenu.style.opacity = '0';
        window.userMenu.style.pointerEvents = 'none';
        userMenuBtn.classList.remove('visible');
        
        // Only show buttons if animation timing (1.0s) has passed
        if (window.welcomeNavTimingPassed) {
            guestMenuButton.classList.add('visible');
            infoBtn.classList.add('visible');
        }
    }, 10);
}

// --- Database Operations ---

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

async function loadUserProfile(user) {
    try {
        const docRef = doc(firestore, "users", user.uid);
        const docSnap = await firestoreWithRetry(() => getDoc(docRef), 3, 1000, 'load_user_profile');
        
        if (docSnap.exists()) {
            userFirestoreData = docSnap.data();
        } else {
            await createUserProfile(user, user.displayName || "User");
        }
    } catch (error) {
        console.error("Error loading profile after retries:", error);
        // Show user-friendly error message
        alert("We're having trouble loading your profile. Please check your connection and refresh the page.");
    }
}

function createInitialProfileData(user, signUpMethod) {
    // Get display name with fallbacks and enforce 15 character limit
    const rawDisplayName = (user.displayName || user.email?.split('@')[0] || 'user').toLowerCase();
    const displayName = rawDisplayName.slice(0, 15);
    
    return {
        displayName: displayName,
        avatarColor: '#74b9ff',
        signUpMethod: signUpMethod,
        totalScore: 0,
        quizzesTaken: 0,
        totalQuestionsAnswered: 0,
        currentStreak: 0,
        maxStreak: 0,
        history: [],
        badges: [],
        friends: [],
        shares: 0,
        createdOn: window.getESTDateString()
    };
}

// Helper function to save pending quiz data after account creation
async function savePendingQuizData(user) {
    const guestStats = getPendingQuizData();
    if (!guestStats) return;
    
    try {
        const userRef = doc(firestore, "users", user.uid);
        
        // Build Firestore update with all pre-calculated stats
        const firestoreUpdate = {
            totalScore: increment(guestStats.totalScore),
            quizzesTaken: increment(guestStats.quizzesTaken),
            totalQuestionsAnswered: increment(guestStats.totalQuestionsAnswered),
            currentStreak: guestStats.currentStreak,
            maxStreak: guestStats.maxStreak,
            history: guestStats.history
        };
        
        // Add badges if any were unlocked
        if (guestStats.newlyUnlockedBadges && guestStats.newlyUnlockedBadges.length > 0) {
            firestoreUpdate.badges = arrayUnion(...guestStats.newlyUnlockedBadges);
        }
        
        // Update Firestore with complete stats (with retry)
        await firestoreWithRetry(() => updateDoc(userRef, firestoreUpdate), 3, 1000, 'save_pending_quiz_data');
        
        // Reload user profile to sync local cache
        await loadUserProfile(user);
    } catch (error) {
        console.error('❌ Error saving pending quiz data after retries:', error);
        alert('We had trouble saving your quiz results. Please check your connection.');
    }
}

async function createUserProfile(user, displayName, signUpMethod = 'google', avatarColor = '#74b9ff') {
    const profileData = createInitialProfileData(user, signUpMethod);
    // Override with custom values if provided
    if (displayName) profileData.displayName = displayName.toLowerCase();
    if (avatarColor !== '#74b9ff') profileData.avatarColor = avatarColor;

    try {
        await firestoreWithRetry(() => setDoc(doc(firestore, "users", user.uid), profileData), 3, 1000, 'create_user_profile');
        userFirestoreData = profileData;
        return true;
    } catch (error) {
        console.error("Error creating profile after retries:", error);
        alert('We had trouble creating your profile. Please check your connection and try again.');
        return false;
    }
}

// --- Action Handlers ---

async function handleLogout() {
    try {
        await signOut(auth);
        clearPreloadedFriendsData(); // Clear cached friends data
        goBack(); // Close modal
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// Available color options
const AVATAR_COLORS = [
    '#74b9ff', // Light Blue (default)
    '#a29bfe', // Lavender
    '#55efc4', // Aqua
    '#ff6b6b', // Red
    '#ff8a5b'  // Orange
];

// --- Display Name Uniqueness Check ---

async function isDisplayNameTaken(displayName, excludeUserId = null) {
    try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('displayName', '==', displayName.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        // If no results, name is available
        if (querySnapshot.empty) {
            return false;
        }
        
        // If excludeUserId is provided (for name changes), check if the only match is the current user
        if (excludeUserId) {
            let foundOtherUser = false;
            querySnapshot.forEach((doc) => {
                if (doc.id !== excludeUserId) {
                    foundOtherUser = true;
                }
            });
            return foundOtherUser;
        }
        
        // Name is taken
        return true;
    } catch (error) {
        console.error('Error checking display name:', error);
        // In case of error, allow the name to proceed (fail open)
        return false;
    }
}

function renderUserProfile() {
    if (!currentUser) return;
    
    // Display Name
    const displayName = (userFirestoreData?.displayName || currentUser.displayName || 'user').toLowerCase();
    const displayNameText = document.getElementById('profile-display-name-text');
    if (displayNameText) {
        displayNameText.textContent = displayName;
    }
    
    // Avatar Letter
    const firstLetter = displayName.charAt(0).toUpperCase();
    const avatarLetter = document.getElementById('profile-avatar-letter');
    if (avatarLetter) {
        avatarLetter.textContent = firstLetter;
    }
    
    // Apply saved avatar color
    const avatarColor = userFirestoreData?.avatarColor || '#74b9ff';
    applyAvatarColor(avatarColor);
    
    // Initialize color palette
    initializeColorPalette(avatarColor);
    
    // Email - get from Firebase Auth (not stored in Firestore for privacy)
    const email = currentUser?.email || 'No email';
    document.getElementById('profile-email').textContent = email;
    
    // Render friends list
    renderFriendsList();
}

async function renderFriendsList() {
    const friendsListContainer = document.getElementById('profile-friends-list');
    if (!friendsListContainer || !currentUser || !userFirestoreData) return;
    
    const friends = userFirestoreData.friends || [];
    
    if (friends.length === 0) {
        friendsListContainer.innerHTML = '<div class="profile-modal__friends-empty">No friends yet. Share your link to connect!</div>';
        return;
    }
    
    friendsListContainer.innerHTML = '<div class="profile-modal__friends-empty">Loading friends...</div>';
    
    try {
        // Fetch all friend profiles
        const friendProfiles = await Promise.all(
            friends.map(async (friendUid) => {
                try {
                    const friendDocRef = doc(firestore, 'users', friendUid);
                    const friendDoc = await getDoc(friendDocRef);
                    if (friendDoc.exists()) {
                        return { uid: friendUid, data: friendDoc.data() };
                    }
                    return null;
                } catch (error) {
                    return null;
                }
            })
        );
        
        // Filter out null values (deleted users or errors)
        const validFriends = friendProfiles.filter(f => f !== null);
        
        // Clean up deleted users from the friends array
        const deletedCount = friends.length - validFriends.length;
        if (deletedCount > 0) {
            const validFriendUids = validFriends.map(f => f.uid);
            try {
                const currentUserRef = doc(firestore, 'users', currentUser.uid);
                await updateDoc(currentUserRef, {
                    friends: validFriendUids
                });
                // Update local data
                userFirestoreData.friends = validFriendUids;
            } catch (error) {
                // Failed to clean up deleted friends
            }
        }
        
        if (validFriends.length === 0) {
            friendsListContainer.innerHTML = '<div class="profile-modal__friends-empty">No friends yet. Share your link to connect!</div>';
            return;
        }
        
        // Render friend items
        friendsListContainer.innerHTML = validFriends
            .map(friend => `
                <div class="profile-modal__friend-item">
                    <div class="profile-modal__friend-item-name">${friend.data.displayName || 'Friend'}</div>
                    <button class="profile-modal__friend-remove-btn" data-friend-uid="${friend.uid}" data-confirm-stage="0">×</button>
                </div>
            `)
            .join('');
        
        // Add event listeners to all remove buttons
        const removeButtons = friendsListContainer.querySelectorAll('.profile-modal__friend-remove-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target;
                const confirmStage = button.dataset.confirmStage;
                const friendUid = button.dataset.friendUid;
                
                if (confirmStage === '0') {
                    // First click: fade out ×, fade in Remove text
                    button.style.opacity = '0';
                    setTimeout(() => {
                        button.dataset.confirmStage = '1';
                        button.textContent = 'Remove';
                        button.style.opacity = '1';
                    }, 150);
                } else if (confirmStage === '1') {
                    // Second click: actually remove the friend
                    await removeFriend(friendUid);
                }
            });
        });
            
    } catch (error) {
        friendsListContainer.innerHTML = '<div class="profile-modal__friends-empty">Error loading friends</div>';
    }
}

async function removeFriend(friendUid) {
    if (!currentUser || !userFirestoreData) return;
    
    try {
        // Remove friend from current user's friends array
        const updatedFriends = (userFirestoreData.friends || []).filter(uid => uid !== friendUid);
        const currentUserRef = doc(firestore, 'users', currentUser.uid);
        await updateDoc(currentUserRef, {
            friends: updatedFriends
        });
        
        // Remove current user from friend's friends array
        const friendRef = doc(firestore, 'users', friendUid);
        const friendDoc = await getDoc(friendRef);
        if (friendDoc.exists()) {
            const friendData = friendDoc.data();
            const friendUpdatedFriends = (friendData.friends || []).filter(uid => uid !== currentUser.uid);
            await updateDoc(friendRef, {
                friends: friendUpdatedFriends
            });
        }
        
        // Update local data
        userFirestoreData.friends = updatedFriends;
        
        // Re-render the friends list
        await renderFriendsList();
        
        // Track in Clarity
        if (window.clarity) {
            window.clarity('event', 'friendship_removed');
        }
    } catch (error) {
        alert('Failed to remove friend. Please try again.');
    }
}

export async function shareFriendLink() {
    if (!currentUser) return;
    
    const friendLink = `https://rythebibleguy.com/quiz?friend=${currentUser.uid}`;
    const shareText = `Add me as a friend on Daily Bible Quiz!\n\n${friendLink}`;
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Use Web Share API on mobile, clipboard on desktop
    if (isMobile && navigator.share) {
        try {
            await navigator.share({
                text: shareText
            });
            
            // Track successful share
            if (window.trackClarityEvent) {
                window.trackClarityEvent('friend_link_shared');
            }
        } catch (error) {
            // User cancelled or share failed - try clipboard as fallback
            if (error.name === 'AbortError') {
                return; // User cancelled, do nothing
            }
            // For other errors, try clipboard
            try {
                await navigator.clipboard.writeText(shareText);
                showFriendToast('Link copied to clipboard!', 'success');
                if (window.trackClarityEvent) {
                    window.trackClarityEvent('friend_link_shared');
                }
            } catch (clipboardError) {
                console.error('Clipboard fallback failed:', clipboardError);
            }
        }
    } else {
        // Desktop: copy just the link
        try {
            await navigator.clipboard.writeText(friendLink);
            
            // Show temporary success message
            const button = document.getElementById('profile-share-friend-link');
            if (button) {
                const originalText = button.innerHTML;
                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Link Copied!
                `;
                button.style.background = '#28a745';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.style.background = '#000';
                }, 2000);
            }
            
            // Also show toast for results modal button
            const resultsButton = document.getElementById('results-share-friend-link-btn');
            if (resultsButton && !button) {
                showFriendToast('Link copied to clipboard!', 'success');
            }
            
            // Track successful copy
            if (window.trackClarityEvent) {
                window.trackClarityEvent('friend_link_shared');
            }
        } catch (error) {
            console.error('Clipboard copy failed:', error);
            alert('Failed to copy link. Please try again.');
        }
    }
}


function initializeColorPalette(currentColor) {
    const palette = document.getElementById('profile-color-palette');
    palette.innerHTML = '';
    
    AVATAR_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'profile-modal__color-swatch';
        swatch.style.background = color;
        
        if (color === currentColor) {
            swatch.classList.add('profile-modal__color-swatch--selected');
        }
        
        swatch.addEventListener('click', () => handleColorSelect(color));
        palette.appendChild(swatch);
    });
}

function toggleColorPalette() {
    const palette = document.getElementById('profile-color-palette');
    if (palette.style.display === 'none' || !palette.style.display) {
        palette.style.display = 'grid';
    } else {
        palette.style.display = 'none';
    }
}

async function handleColorSelect(color) {
    if (!currentUser || !userFirestoreData) return;
    
    // Apply color immediately
    applyAvatarColor(color);
    
    // Update selected state in palette
    document.querySelectorAll('.profile-modal__color-swatch').forEach(swatch => {
        swatch.classList.remove('profile-modal__color-swatch--selected');
    });
    event.target.classList.add('profile-modal__color-swatch--selected');
    
    // Hide palette after selection
    setTimeout(() => {
        document.getElementById('profile-color-palette').style.display = 'none';
    }, 300);
    
    // Save to Firestore
    try {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await setDoc(userDocRef, { avatarColor: color }, { merge: true });
        
        // Update local profile
        userFirestoreData.avatarColor = color;
    } catch (error) {
        console.error('Error saving avatar color:', error);
    }
}

function applyAvatarColor(color) {
    // Create a lighter shade for the gradient
    const lighterColor = lightenColor(color, 15);
    
    // Apply to profile avatar in modal (targets the .avatar element within wrapper)
    const profileAvatarWrapper = document.getElementById('profile-avatar');
    if (profileAvatarWrapper) {
        const avatarElement = profileAvatarWrapper.querySelector('.avatar');
        if (avatarElement) {
            avatarElement.style.setProperty('--avatar-color', color);
            avatarElement.style.setProperty('--avatar-color-light', lighterColor);
        }
    }
    
    // Apply to user menu button avatar (targets the .avatar element within button)
    const userMenuBtn = document.getElementById('user-menu-button');
    if (userMenuBtn) {
        const avatarElement = userMenuBtn.querySelector('.avatar');
        if (avatarElement) {
            avatarElement.style.setProperty('--avatar-color', color);
            avatarElement.style.setProperty('--avatar-color-light', lighterColor);
        }
    }
}

function lightenColor(color, percent) {
    // Convert hex to RGB
    const num = parseInt(color.replace('#', ''), 16);
    const r = (num >> 16) + Math.round(255 * percent / 100);
    const g = ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100);
    const b = (num & 0x0000FF) + Math.round(255 * percent / 100);
    
    // Clamp values to 0-255
    const newR = Math.min(255, r);
    const newG = Math.min(255, g);
    const newB = Math.min(255, b);
    
    return `#${((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0')}`;
}

// --- Display Name Editing ---

function enterEditMode() {
    const displayNameDiv = document.getElementById('profile-display-name');
    const editContainer = document.getElementById('profile-name-edit-container');
    const nameInput = document.getElementById('profile-name-input');
    const editBtn = document.getElementById('profile-name-edit-btn');
    
    // Get current display name
    const currentName = userFirestoreData?.displayName || currentUser?.displayName || 'User';
    
    // Hide display name and edit button
    displayNameDiv.style.display = 'none';
    editBtn.style.display = 'none';
    
    // Show edit container
    editContainer.style.display = 'flex';
    
    // Set input value and focus
    nameInput.value = currentName;
    setTimeout(() => nameInput.focus(), 10);
}

function exitEditMode() {
    const displayNameDiv = document.getElementById('profile-display-name');
    const editContainer = document.getElementById('profile-name-edit-container');
    const editBtn = document.getElementById('profile-name-edit-btn');
    
    // Show display name and edit button
    displayNameDiv.style.display = 'block';
    editBtn.style.display = 'flex';
    
    // Hide edit container
    editContainer.style.display = 'none';
}

async function saveDisplayName() {
    if (!currentUser || !userFirestoreData) return;
    
    const nameInput = document.getElementById('profile-name-input');
    const newName = nameInput.value.trim().toLowerCase();
    
    // Validation
    if (!newName) {
        alert('Display name cannot be empty');
        return;
    }
    
    if (newName.length > 15) {
        alert('Display name must be 15 characters or less');
        return;
    }
    
    // Check if name actually changed
    const currentName = (userFirestoreData.displayName || currentUser.displayName || 'user').toLowerCase();
    if (newName === currentName) {
        exitEditMode();
        return;
    }
    
    // Disable save button while saving
    const saveBtn = document.getElementById('profile-name-save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        // Check if display name is already taken (excluding current user)
        const nameTaken = await isDisplayNameTaken(newName, currentUser.uid);
        if (nameTaken) {
            // Show error icon
            const errorIcon = document.getElementById('profile-name-error');
            if (errorIcon) {
                errorIcon.style.display = 'flex';
            }
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            return;
        }
        
        // Update Firestore
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await setDoc(userDocRef, { displayName: newName }, { merge: true });
        
        // Update local profile data
        userFirestoreData.displayName = newName;
        
        // Update UI
        const displayNameText = document.getElementById('profile-display-name-text');
        if (displayNameText) {
            displayNameText.textContent = newName;
        }
        
        // Update avatar letter
        const firstLetter = newName.charAt(0).toUpperCase();
        const avatarLetter = document.getElementById('profile-avatar-letter');
        if (avatarLetter) {
            avatarLetter.textContent = firstLetter;
        }
        
        // Update user menu button avatar
        const userMenuBtn = document.getElementById('user-menu-button');
        if (userMenuBtn) {
            const avatarLetter = userMenuBtn.querySelector('.avatar__letter');
            if (avatarLetter) {
                avatarLetter.textContent = firstLetter;
            }
        }
        
        // Exit edit mode
        exitEditMode();
        
    } catch (error) {
        console.error('Error saving display name:', error);
        alert('Failed to save display name. Please try again.');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// ========== NEW AUTH HANDLERS ==========

async function handleEmailCheck() {
    const emailInput = document.getElementById('auth-email-input');
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('Please enter an email address');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    try {
        // Check if account exists in Firebase Auth
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        
        // Make email readonly
        emailInput.readOnly = true;
        
        // Hide email submit button
        document.getElementById('auth-email-submit-btn').style.display = 'none';
        
        // Fade out divider and social buttons
        const divider = document.querySelector('.auth-modal__divider');
        const socialButtons = document.querySelector('.auth-modal__social-btns');
        if (divider) divider.classList.add('auth-modal__divider--fade-out');
        if (socialButtons) socialButtons.classList.add('auth-modal__social-btns--fade-out');
        
        if (signInMethods.length > 0) {
            // Email exists - show login container
            showLoginContainer();
        } else {
            // Email doesn't exist - show signup container
            showSignupContainer();
        }
    } catch (error) {
        console.error('Error checking email:', error);
        alert('Error checking email. Please try again.');
    }
}

function showLoginContainer() {
    const loginContainer = document.getElementById('auth-login-container');
    loginContainer.style.display = 'block';
    loginContainer.style.opacity = '0';
    setTimeout(() => {
        loginContainer.style.opacity = '1';
        loginContainer.style.transition = 'opacity 0.3s ease';
    }, 10);
}

function showSignupContainer() {
    const signupContainer = document.getElementById('auth-signup-container');
    signupContainer.style.display = 'block';
    signupContainer.style.opacity = '0';
    setTimeout(() => {
        signupContainer.style.opacity = '1';
        signupContainer.style.transition = 'opacity 0.3s ease';
    }, 10);
}

async function handleLogin() {
    const emailInput = document.getElementById('auth-email-input');
    const passwordInput = document.getElementById('auth-login-password');
    const submitButton = document.getElementById('auth-login-btn');
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!password) {
        alert('Please enter a password');
        return;
    }
    
    // Show loading state
    const originalText = submitButton.textContent;    submitButton.classList.add('auth-modal__btn--loading');    submitButton.innerHTML = '<span class=\"auth-modal__spinner\"></span>';
    submitButton.disabled = true;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        await processPendingFriend();
        closeAuthModal();
    } catch (error) {
        // Restore button state
        submitButton.classList.remove('auth-modal__btn--loading');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        console.error('Login error:', error);
        if (error.code === 'auth/wrong-password') {
            alert('Incorrect password. Please try again.');
        } else {
            alert('Login failed. Please try again.');
        }
    }
}

async function handleSignup() {
    const emailInput = document.getElementById('auth-email-input');
    const nameInput = document.getElementById('auth-signup-name');
    const passwordInput = document.getElementById('auth-signup-password');
    const submitButton = document.getElementById('auth-signup-btn');
    
    const email = emailInput.value;
    const displayName = nameInput.value.trim();
    const password = passwordInput.value;
    
    if (!displayName) {
        alert('Please enter your display name');
        return;
    }
    
    if (displayName.length > 15) {
        alert('Display name must be 15 characters or less');
        return;
    }
    
    if (!password) {
        alert('Please enter a password');
        return;
    }
    
    // Show loading state
    const originalText = submitButton.textContent;    submitButton.classList.add('auth-modal__btn--loading');    submitButton.innerHTML = '<span class=\"auth-modal__spinner\"></span>';
    submitButton.disabled = true;
    
    try {
        // Check if display name is already taken
        const nameTaken = await isDisplayNameTaken(displayName);
        if (nameTaken) {
            // Show error icon
            const errorIcon = document.getElementById('auth-signup-name-error');
            if (errorIcon) {
                errorIcon.style.display = 'flex';
            }
            // Restore button state
            submitButton.classList.remove('auth-modal__btn--loading');
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            return;
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user, displayName, 'email', '#74b9ff');
        
        // Track successful signup
        if (window.trackClarityEvent) {
            window.trackClarityEvent('signup_email');
        }
        
        // Save any pending quiz data from guest session
        await savePendingQuizData(userCredential.user);
        
        // Process any pending friend requests
        await processPendingFriend();
        
        // Wait for Firebase to sync before closing modal
        setTimeout(() => {
            closeAuthModal();
        }, 500);
    } catch (error) {
        // Restore button state
        submitButton.classList.remove('auth-modal__btn--loading');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        console.error('Signup error:', error);
        if (error.code === 'auth/weak-password') {
            alert('Password should be at least 6 characters.');
        } else if (error.code === 'auth/email-already-in-use') {
            alert('This email is already in use.');
        } else {
            alert('Signup failed. Please try again.');
        }
    }
}

// --- Google Sign-In Handler ---
async function handleGoogleSignIn() {
    const googleBtn = document.querySelector('.auth-modal__btn--outline');
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    // Show loading state
    const originalContent = googleBtn.innerHTML;
    googleBtn.classList.add('auth-modal__btn--loading');
    googleBtn.innerHTML = '<span class="auth-modal__spinner"></span>';
    googleBtn.disabled = true;
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Get email from providerData as fallback if user.email is null
        const providerEmail = user.providerData[0]?.email;
        const finalEmail = user.email || providerEmail;
        
        // Check if user profile exists in Firestore (with retry)
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await firestoreWithRetry(() => getDoc(userDocRef), 3, 1000, 'google_signin_check_profile');
        
        if (!userDoc.exists()) {
            // Create new user profile for first-time Google sign-in (with retry)
            const profileData = createInitialProfileData(user, 'google');
            await firestoreWithRetry(() => setDoc(userDocRef, profileData), 3, 1000, 'google_signin_create_profile');
            
            // Track successful signup
            if (window.trackClarityEvent) {
                window.trackClarityEvent('signup_google');
            }
            
            // Save any pending quiz data from guest session
            await savePendingQuizData(user);
        }
        
        // Process any pending friend requests
        await processPendingFriend();
        
        // Close modal on success
        closeAuthModal();
    } catch (error) {
        // Restore button state
        googleBtn.classList.remove('auth-modal__btn--loading');
        googleBtn.innerHTML = originalContent;
        googleBtn.disabled = false;
        
        console.error('Google Sign-In error:', error);
        
        if (error.code === 'auth/popup-closed-by-user') {
            // User closed the popup, no need to show error
            return;
        } else if (error.code === 'auth/cancelled-popup-request') {
            // Another popup was opened, ignore
            return;
        } else {
            alert('Google Sign-In failed. Please try again.');
        }
    }
}

function openStatsModal() {
    const statsOverlay = document.getElementById('stats-modal');
    const mainContainer = document.getElementById('app-container');
    
    if (statsOverlay && mainContainer) {
        // Populate stats data
        populateStats();
        
        // Show overlay
        statsOverlay.style.display = 'flex';
        // Trigger animations
        setTimeout(() => {
            mainContainer.classList.add('app-container--stacked-modal-active');
            statsOverlay.classList.add('stacked-modal__overlay--active');
        }, 10);
    }
}

async function populateStats() {
    if (!currentUser || !userFirestoreData) {
        console.error('No user logged in or data not loaded');
        return;
    }

    try {
        // Use locally cached data instead of fetching from Firestore
        const history = userFirestoreData.history || [];
        const quizzesTaken = userFirestoreData.quizzesTaken || 0;
        const currentStreak = userFirestoreData.currentStreak || 0;
        const maxStreak = userFirestoreData.maxStreak || 0;
        const shares = userFirestoreData.shares || 0;

        // Calculate Perfect % (perfect scores)
        const perfectScores = history.filter(entry => entry.score === entry.totalQuestions).length;
        const winPercentage = quizzesTaken > 0 ? Math.round((perfectScores / quizzesTaken) * 100) : 0;

        // Update top stats
        document.getElementById('stats-played').textContent = quizzesTaken;
        document.getElementById('stats-win-percentage').textContent = winPercentage;
        document.getElementById('stats-current-streak').textContent = currentStreak;
        document.getElementById('stats-max-streak').textContent = maxStreak;

        // Calculate score distribution
        const scoreDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
        const maxQuestions = history.length > 0 ? history[0].totalQuestions : 4; // Assume 4 questions
        
        history.forEach(entry => {
            const score = entry.score;
            if (score >= 0 && score <= maxQuestions) {
                scoreDistribution[score] = (scoreDistribution[score] || 0) + 1;
            }
        });

        // Find the max count for scaling
        const maxCount = Math.max(...Object.values(scoreDistribution), 1);

        // Update score distribution bars
        for (let i = 0; i <= maxQuestions; i++) {
            const count = scoreDistribution[i] || 0;
            const row = document.querySelector(`.stats-modal__distribution-row[data-score="${i}"]`);
            if (row) {
                const bar = row.querySelector('.stats-modal__distribution-bar');
                const countElement = row.querySelector('.stats-modal__distribution-count');
                
                if (bar && countElement) {
                    // Calculate width percentage (minimum 7% for visibility)
                    const widthPercent = count === 0 ? 7 : Math.max(7, (count / maxCount) * 100);
                    bar.style.width = `${widthPercent}%`;
                    bar.setAttribute('data-count', count);
                    countElement.textContent = count;
                    // Remove any existing highlight
                    bar.removeAttribute('data-highlight');
                }
            }
        }

        // Highlight today's score if quiz was completed
        const todayEntry = history.find(entry => entry.date === window.todayString);
        if (todayEntry && todayEntry.score !== undefined) {
            const todayScoreRow = document.querySelector(`.stats-modal__distribution-row[data-score="${todayEntry.score}"]`);
            if (todayScoreRow) {
                const todayBar = todayScoreRow.querySelector('.stats-modal__distribution-bar');
                if (todayBar) {
                    todayBar.setAttribute('data-highlight', 'true');
                }
            }
        }

        // Populate badges
        populateBadges(currentStreak, maxStreak, quizzesTaken, history, shares);
    } catch (error) {
        console.error('Error populating stats:', error);
    }
}

// Define available badges
export const BADGES = [
    {
        id: 'first-steps',
        name: 'First Steps',
        description: 'Complete your first quiz',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4d6/512.png',
        requirement: 1,
        difficulty: 1,
        checkUnlocked: (userData) => (userData.quizzesTaken || 0) >= 1
    },
    {
        id: 'dedicated-scholar',
        name: 'Dedicated Student',
        description: 'Complete 10 quizzes',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4da/512.png',
        requirement: 10,
        difficulty: 1,
        checkUnlocked: (userData) => (userData.quizzesTaken || 0) >= 10
    },
    {
        id: 'master-scholar',
        name: 'Master Scholar',
        description: 'Complete 50 quizzes',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f393/512.png',
        requirement: 50,
        difficulty: 3,
        checkUnlocked: (userData) => (userData.quizzesTaken || 0) >= 50
    },
    {
        id: 'bible-champion',
        name: 'Bible Champion',
        description: 'Complete 100 quizzes',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.png',
        requirement: 100,
        difficulty: 4,
        checkUnlocked: (userData) => (userData.quizzesTaken || 0) >= 100
    },
    {
        id: 'perfect-quiz',
        name: 'Perfect Score',
        description: 'Complete a quiz with all questions correct',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.png',
        requirement: 1,
        difficulty: 2,
        checkUnlocked: (userData) => {
            const history = userData.history || [];
            return history.some(entry => entry.score === entry.totalQuestions && entry.totalQuestions > 0);
        }
    },
    {
        id: 'fellowship',
        name: 'Fellowship',
        description: 'Challenge a friend to play the daily quiz',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f91d/512.png',
        requirement: 1,
        difficulty: 1,
        checkUnlocked: (userData) => (userData.shares || 0) >= 1
    },
    {
        id: 'community-builder',
        name: 'Community Builder',
        description: 'Share the daily quiz with 10 friends',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3d8/512.png',
        requirement: 10,
        difficulty: 2,
        checkUnlocked: (userData) => (userData.shares || 0) >= 10
    },
    {
        id: 'streak-7',
        name: '7-Day Streak',
        description: 'Complete quizzes 7 days in a row',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.png',
        requirement: 7,
        difficulty: 1,
        checkUnlocked: (userData) => (userData.maxStreak || 0) >= 7
    },
    {
        id: 'streak-30',
        name: '30-Day Streak',
        description: 'Complete quizzes 30 days in a row',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f31f/512.png',
        requirement: 30,
        difficulty: 2,
        checkUnlocked: (userData) => (userData.maxStreak || 0) >= 30
    },
    {
        id: 'streak-100',
        name: '100-Day Streak',
        description: 'Complete quizzes 100 days in a row',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.png',
        requirement: 100,
        difficulty: 4,
        checkUnlocked: (userData) => (userData.maxStreak || 0) >= 100
    },
    {
        id: 'early-bird',
        name: 'Early Bird',
        description: 'Complete a quiz before 6 AM',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f305/512.png',
        requirement: 1,
        difficulty: 2,
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
        difficulty: 2,
        checkUnlocked: (userData) => {
            const history = userData.history || [];
            return history.some(entry => {
                if (entry.timestamp) {
                    const hour = parseInt(entry.timestamp.slice(0, 2));
                    return hour >= 22 && hour <= 23; // 22:00-23:59
                }
                return false;
            });
        }
    },
    {
        id: 'make-a-wish',
        name: 'Make a Wish',
        description: 'Complete a quiz at exactly 11:11',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/23f0/512.png',
        requirement: 1,
        difficulty: 3,
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
        id: 'lightning-fast',
        name: 'Lightning Fast',
        description: 'Complete a quiz in under 10 seconds',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/26a1/512.png',
        requirement: 1,
        difficulty: 2,
        checkUnlocked: (userData) => {
            const history = userData.history || [];
            return history.some(entry => {
                return entry.duration && entry.duration < 10;
            });
        }
    },
    {
        id: 'slow-and-steady',
        name: 'Slow & Steady',
        description: 'Take over 10 minutes to complete a quiz',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f40c/512.png',
        requirement: 1,
        difficulty: 2,
        checkUnlocked: (userData) => {
            const history = userData.history || [];
            return history.some(entry => {
                return entry.duration && entry.duration > 600;
            });
        }
    },
    {
        id: 'never-give-up',
        name: 'Never Give Up',
        description: 'Get 0/4 on a quiz but come back the next day',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4aa/512.png',
        requirement: 1,
        difficulty: 3,
        checkUnlocked: (userData) => {
            const history = userData.history || [];
            for (let i = 0; i < history.length - 1; i++) {
                const entry = history[i];
                // Check if this entry was a 0/4 score
                if (entry.score === 0 && entry.totalQuestions === 4) {
                    // Check if there's a quiz the next day
                    const [year, month, day] = entry.date.split('-').map(Number);
                    const nextDay = new Date(year, month - 1, day + 1);
                    const nextDayString = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
                    
                    // Check if any subsequent entry is from the next day
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
        id: 'christmas-spirit',
        name: 'Christmas Spirit',
        description: 'Complete a quiz on December 25th',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f384/512.png',
        requirement: 1,
        difficulty: 4,
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
        difficulty: 4,
        checkUnlocked: (userData) => {
            const history = userData.history || [];
            // Easter dates for multiple years
            const easterDates = [
                '2024-03-31', '2025-04-20', '2026-04-05', '2027-03-28', '2028-04-16',
                '2029-04-01', '2030-04-21', '2031-04-13', '2032-03-28', '2033-04-17',
                '2034-04-09', '2035-03-25', '2036-04-13', '2037-04-05', '2038-04-25'
            ];
            return history.some(entry => entry.date && easterDates.includes(entry.date));
        }
    },
    {
        id: 'double-threat',
        name: 'Double Threat',
        description: 'Complete a quiz when the month and day match',
        icon: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3b0/512.png',
        requirement: 1,
        difficulty: 3,
        checkUnlocked: (userData) => {
            const history = userData.history || [];
            return history.some(entry => {
                if (entry.date) {
                    const parts = entry.date.split('-');
                    const month = parseInt(parts[1]);
                    const day = parseInt(parts[2]);
                    return month === day && month <= 12; // 1/1, 2/2, ... 12/12
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
        difficulty: 4,
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
    // Add more badges here in the future
];

// Check for newly unlocked badges
export function checkNewlyUnlockedBadges(userData, newStats, dateKey) {
    const currentBadges = userData.badges || [];
    const newlyUnlocked = [];
    
    // Create combined data for checking
    const checkData = {
        ...userData,
        ...newStats
    };
    
    // Note: Fellowship badge is handled separately in updateShareTracking() in quiz.js
    // because it unlocks when sharing, not during quiz completion
    
    BADGES.forEach(badge => {
        // Check if badge is already unlocked
        const alreadyHas = currentBadges.some(b => b.id === badge.id);
        
        if (!alreadyHas) {
            // Check if badge criteria is now met
            const isUnlocked = badge.checkUnlocked(checkData);
            
            if (isUnlocked) {
                newlyUnlocked.push({
                    id: badge.id,
                    unlockedOn: dateKey || window.getESTDateString()
                });
            }
        }
    });
    
    return newlyUnlocked;
}

function populateBadges(currentStreak, maxStreak, quizzesTaken, history, shares) {
    const badgesGrid = document.getElementById('badges-grid');
    if (!badgesGrid) return;

    badgesGrid.innerHTML = ''; // Clear existing badges
    
    const userBadges = userFirestoreData?.badges || [];

    // Create array of badge data with sorting info
    const badgeData = BADGES.map(badge => {
        const unlockedBadge = userBadges.find(b => b.id === badge.id);
        const isUnlocked = !!unlockedBadge;
        
        // Calculate progress for progression badges
        const isStreakBadge = badge.id.startsWith('streak-');
        const isQuizBadge = ['first-steps', 'dedicated-scholar', 'master-scholar', 'bible-champion'].includes(badge.id);
        const isShareBadge = ['fellowship', 'community-builder'].includes(badge.id);
        const hasProgress = isStreakBadge || isQuizBadge || isShareBadge;
        
        let progress = 0;
        if (isStreakBadge) {
            progress = Math.min(currentStreak, badge.requirement);
        } else if (isQuizBadge) {
            progress = Math.min(quizzesTaken, badge.requirement);
        } else if (isShareBadge) {
            progress = Math.min(shares, badge.requirement);
        }
        
        const progressPercent = hasProgress ? (progress / badge.requirement) * 100 : 0;
        
        return {
            badge,
            isUnlocked,
            unlockedBadge,
            hasProgress,
            progress,
            progressPercent
        };
    });
    
    // Sort badges: unlocked first, then by difficulty (low to high), then by progress (high to low)
    badgeData.sort((a, b) => {
        // First: unlocked badges come first
        if (a.isUnlocked !== b.isUnlocked) {
            return b.isUnlocked - a.isUnlocked;
        }
        
        // Second: sort by difficulty (low to high)
        if (a.badge.difficulty !== b.badge.difficulty) {
            return a.badge.difficulty - b.badge.difficulty;
        }
        
        // Third: for locked badges, sort by progress (high to low)
        if (!a.isUnlocked && !b.isUnlocked) {
            return b.progressPercent - a.progressPercent;
        }
        
        return 0;
    });
    
    // Render sorted badges
    badgeData.forEach(({ badge, isUnlocked, unlockedBadge, hasProgress, progress, progressPercent }) => {

        const badgeItem = document.createElement('div');
        badgeItem.className = 'stats-modal__badge';
        
        // Show progress only for locked badges with progression
        let progressDisplay = '';
        if (!isUnlocked && hasProgress) {
            progressDisplay = `
                <div class="stats-modal__badge-progress-container">
                    <div class="stats-modal__badge-progress-bar">
                        <div class="stats-modal__badge-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            `;
        }
        
        badgeItem.innerHTML = `
            <div class="stats-modal__badge-icon ${!isUnlocked ? 'stats-modal__badge-icon--locked' : 'stats-modal__badge-icon--unlocked'}">
                <img src="${badge.icon}" alt="${badge.name}" />
                ${isUnlocked ? '<div class="stats-modal__badge-checkmark">✓</div>' : ''}
            </div>
            <div class="stats-modal__badge-name">${badge.name}</div>
            ${!isUnlocked ? progressDisplay : ''}
        `;

        // TODO: Add click handler to show badge details
        badgeItem.addEventListener('click', () => {
            showBadgeDetail(badge, isUnlocked, progress, unlockedBadge?.unlockedOn);
        });

        badgesGrid.appendChild(badgeItem);
    });
}

// Track if tooltip is in cooldown period
let tooltipCooldown = false;

function showBadgeDetail(badge, isUnlocked, progress, unlockedOn) {
    const tooltip = document.getElementById('badge-tooltip');
    const statsModal = document.getElementById('stats-modal');
    const statsContent = statsModal.querySelector('.stacked-modal__content');
    
    // If in cooldown, don't do anything
    if (tooltipCooldown) {
        return;
    }
    
    // If tooltip is open, just close it and don't open a new one
    if (tooltip.classList.contains('badge-tooltip--visible')) {
        tooltip.classList.remove('badge-tooltip--visible');
        statsModal.classList.remove('stacked-modal__overlay--no-scroll');
        if (statsContent) statsContent.classList.remove('stacked-modal__content--blurred');
        tooltipCooldown = true;
        setTimeout(() => {
            tooltip.style.display = 'none';
            // Add additional 200ms delay after close animation
            setTimeout(() => {
                tooltipCooldown = false;
            }, 200);
        }, 200);
        return; // Don't open the new badge
    }
    
    // Only open if tooltip was closed
    const icon = document.getElementById('badge-tooltip-icon');
    const name = document.getElementById('badge-tooltip-name');
    const description = document.getElementById('badge-tooltip-description');
    const status = document.getElementById('badge-tooltip-status');
    
    // Populate tooltip content
    icon.innerHTML = `<img src="${badge.icon}" alt="${badge.name}" />`;
    name.textContent = badge.name;
    description.textContent = badge.description;
    
    if (isUnlocked) {
        status.innerHTML = `<span class="badge-tooltip__status--unlocked">✓ Unlocked</span>`;
    } else {
        const progressPercent = (progress / badge.requirement) * 100;
        status.innerHTML = `
            <div class="badge-tooltip__progress">
                <div class="badge-tooltip__progress-bar">
                    <div class="badge-tooltip__progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="badge-tooltip__progress-text">${progress} / ${badge.requirement}</div>
            </div>
        `;
    }
    
    // Prevent scrolling on stats modal and add blur
    statsModal.classList.add('stacked-modal__overlay--no-scroll');
    if (statsContent) statsContent.classList.add('stacked-modal__content--blurred');
    
    // Show tooltip
    tooltip.style.display = 'block';
    setTimeout(() => tooltip.classList.add('badge-tooltip--visible'), 10);
}

// Close tooltip when clicking anywhere (except when opening a badge)
document.addEventListener('click', (e) => {
    const tooltip = document.getElementById('badge-tooltip');
    const statsModal = document.getElementById('stats-modal');
    const clickedBadge = e.target.closest('.stats-modal__badge');
    
    // If clicking anywhere (including the tooltip) and it's not a badge click, close it
    if (tooltip && tooltip.classList.contains('badge-tooltip--visible') && !clickedBadge) {
        tooltip.classList.remove('badge-tooltip--visible');
        if (statsModal) {
            statsModal.classList.remove('stacked-modal__overlay--no-scroll');
            const statsContent = statsModal.querySelector('.stacked-modal__content');
            if (statsContent) statsContent.classList.remove('stacked-modal__content--blurred');
        }
        tooltipCooldown = true;
        setTimeout(() => {
            tooltip.style.display = 'none';
            setTimeout(() => {
                tooltipCooldown = false;
            }, 200);
        }, 200);
    }
});

// Close tooltip on touch/scroll attempts
document.addEventListener('touchstart', (e) => {
    const tooltip = document.getElementById('badge-tooltip');
    const statsModal = document.getElementById('stats-modal');
    const clickedBadge = e.target.closest('.stats-modal__badge');
    
    if (tooltip && tooltip.classList.contains('badge-tooltip--visible') && !clickedBadge) {
        tooltip.classList.remove('badge-tooltip--visible');
        if (statsModal) {
            statsModal.classList.remove('stacked-modal__overlay--no-scroll');
            const statsContent = statsModal.querySelector('.stacked-modal__content');
            if (statsContent) statsContent.classList.remove('stacked-modal__content--blurred');
        }
        tooltipCooldown = true;
        setTimeout(() => {
            tooltip.style.display = 'none';
            setTimeout(() => {
                tooltipCooldown = false;
            }, 200);
        }, 200);
    }
});

document.addEventListener('touchmove', (e) => {
    const tooltip = document.getElementById('badge-tooltip');
    const statsModal = document.getElementById('stats-modal');
    
    if (tooltip && tooltip.classList.contains('badge-tooltip--visible')) {
        tooltip.classList.remove('badge-tooltip--visible');
        if (statsModal) {
            statsModal.classList.remove('stacked-modal__overlay--no-scroll');
            const statsContent = statsModal.querySelector('.stacked-modal__content');
            if (statsContent) statsContent.classList.remove('stacked-modal__content--blurred');
        }
        tooltipCooldown = true;
        setTimeout(() => {
            tooltip.style.display = 'none';
            setTimeout(() => {
                tooltipCooldown = false;
            }, 200);
        }, 200);
    }
}, { passive: true });

document.addEventListener('wheel', (e) => {
    const tooltip = document.getElementById('badge-tooltip');
    const statsModal = document.getElementById('stats-modal');
    
    if (tooltip && tooltip.classList.contains('badge-tooltip--visible')) {
        tooltip.classList.remove('badge-tooltip--visible');
        if (statsModal) {
            statsModal.classList.remove('stacked-modal__overlay--no-scroll');
            const statsContent = statsModal.querySelector('.stacked-modal__content');
            if (statsContent) statsContent.classList.remove('stacked-modal__content--blurred');
        }
        tooltipCooldown = true;
        setTimeout(() => {
            tooltip.style.display = 'none';
            setTimeout(() => {
                tooltipCooldown = false;
            }, 200);
        }, 200);
    }
}, { passive: true });

function closeStatsModal() {
    const statsOverlay = document.getElementById('stats-modal');
    const mainContainer = document.getElementById('app-container');
    
    if (statsOverlay && mainContainer) {
        mainContainer.classList.remove('app-container--stacked-modal-active');
        statsOverlay.classList.remove('stacked-modal__overlay--active');
        setTimeout(() => {
            statsOverlay.style.display = 'none';
        }, 400);
    }
}

function openProfileModal() {
    const profileOverlay = document.getElementById('profile-modal');
    const mainContainer = document.getElementById('app-container');
    
    if (profileOverlay && mainContainer) {
        // Render profile data
        renderUserProfile();
        
        // Show overlay
        profileOverlay.style.display = 'flex';
        // Trigger animations
        setTimeout(() => {
            mainContainer.classList.add('app-container--stacked-modal-active');
            profileOverlay.classList.add('stacked-modal__overlay--active');
        }, 10);
    }
}

function closeProfileModal() {
    exitEditMode(); // Reset name edit state when modal closes
    
    const profileOverlay = document.getElementById('profile-modal');
    const mainContainer = document.getElementById('app-container');
    
    if (profileOverlay && mainContainer) {
        mainContainer.classList.remove('app-container--stacked-modal-active');
        profileOverlay.classList.remove('stacked-modal__overlay--active');
        setTimeout(() => {
            profileOverlay.style.display = 'none';
        }, 400);
    }
}

function closeAuthModal() {
    const authOverlay = document.getElementById('auth-modal');
    const mainContainer = document.getElementById('app-container');
    
    if (authOverlay && mainContainer) {
        mainContainer.classList.remove('app-container--stacked-modal-active');
        authOverlay.classList.remove('stacked-modal__overlay--active');
        
        setTimeout(() => {
            // Force container back to 100vh to fix stuck height
            mainContainer.style.height = '100vh';
            void mainContainer.offsetHeight; // Trigger reflow
            mainContainer.style.height = '';
            
            authOverlay.style.display = 'none';
            resetAuthModal();
        }, 400);
    }
}

function resetAuthModal() {
    // Reset email input
    const emailInput = document.getElementById('auth-email-input');
    if (emailInput) {
        emailInput.value = '';
        emailInput.readOnly = false;
    }
    
    // Clear password fields
    const loginPassword = document.getElementById('auth-login-password');
    const signupName = document.getElementById('auth-signup-name');
    const signupPassword = document.getElementById('auth-signup-password');
    
    if (loginPassword) loginPassword.value = '';
    if (signupName) signupName.value = '';
    if (signupPassword) signupPassword.value = '';
    
    // Hide auth containers
    const loginContainer = document.getElementById('auth-login-container');
    const signupContainer = document.getElementById('auth-signup-container');
    
    if (loginContainer) {
        loginContainer.style.display = 'none';
        loginContainer.style.opacity = '0';
    }
    if (signupContainer) {
        signupContainer.style.display = 'none';
        signupContainer.style.opacity = '0';
    }
    
    // Show email submit button
    const emailSubmitBtn = document.getElementById('auth-email-submit-btn');
    if (emailSubmitBtn) {
        emailSubmitBtn.style.display = 'block';
        emailSubmitBtn.disabled = false;
    }
    
    // Show divider and social buttons again
    const divider = document.querySelector('.auth-modal__divider');
    const socialButtons = document.querySelector('.auth-modal__social-btns');
    if (divider) {
        divider.classList.remove('auth-modal__divider--fade-out');
    }
    if (socialButtons) {
        socialButtons.classList.remove('auth-modal__social-btns--fade-out');
    }
    
    // Reset button states
    const loginBtn = document.getElementById('auth-login-btn');
    const signupBtn = document.getElementById('auth-signup-btn');
    const googleBtn = document.querySelector('.auth-modal__btn--outline');
    
    if (loginBtn) {
        loginBtn.textContent = 'Log In';
        loginBtn.disabled = false;
    }
    if (signupBtn) {
        signupBtn.textContent = 'Sign Up';
        signupBtn.disabled = false;
    }
    if (googleBtn) {
        googleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="EA4335"/></svg>Continue with Google';
        googleBtn.disabled = false;
    }
}

// --- Export for Quiz Logic ---
export function getCurrentUserProfile() {
    return userFirestoreData;
}

export function updateLocalUserData(updates) {
    if (!userFirestoreData) return;
    userFirestoreData = { ...userFirestoreData, ...updates };
}

export function getCurrentUser() {
    return currentUser;
}

// --- Friend System Functions ---

let pendingFriendUid = null; // Store friend UID if user not logged in yet

export async function handleFriendParameter() {
    // Check URL for ?friend=UID parameter
    const urlParams = new URLSearchParams(window.location.search);
    const friendUid = urlParams.get('friend');
    
    if (!friendUid) {
        return; // No friend parameter found
    }
    
    // Track friend link clicked
    if (window.trackClarityEvent) {
        window.trackClarityEvent('friend_link_clicked');
    }
    
    if (!currentUser) {
        // User not logged in - store for after login
        pendingFriendUid = friendUid;
        sessionStorage.setItem('pendingFriendUid', friendUid);
        
        // Show persistent toast prompting to sign up/login
        const guestToast = showFriendToast('Sign in to connect with your friend!', 'info', true);
        
        // Dismiss toast on any user interaction
        const dismissToast = () => {
            if (guestToast && guestToast.parentElement) {
                guestToast.classList.remove('friend-toast--visible');
                setTimeout(() => {
                    guestToast.remove();
                }, 300);
            }
            document.removeEventListener('click', dismissToast);
            document.removeEventListener('touchstart', dismissToast);
        };
        
        document.addEventListener('click', dismissToast);
        document.addEventListener('touchstart', dismissToast);
        
        // Open auth modal after brief delay
        setTimeout(() => {
            window.openAuthModal();
        }, 1500);
        
        return;
    }
    
    // User is logged in - process friend request
    await processFriendRequest(friendUid);
}

async function processFriendRequest(friendUid) {
    if (!currentUser || !userFirestoreData) {
        return;
    }
    
    // Validate friend UID
    if (!friendUid || friendUid.length === 0) {
        showFriendToast('Invalid friend link', 'error');
        return;
    }
    
    // Can't friend yourself
    if (friendUid === currentUser.uid) {
        showFriendToast('You can\'t add yourself as a friend!', 'error');
        clearFriendParameter();
        return;
    }
    
    // Check if already friends
    const currentFriends = userFirestoreData.friends || [];
    
    if (currentFriends.includes(friendUid)) {
        showFriendToast('You\'re already friends!', 'info');
        clearFriendParameter();
        return;
    }
    
    // Show loading toast
    const loadingToast = showFriendToast('Adding friend...', 'loading', true);
    
    try {
        // Add mutual friendship (both directions)
        const currentUserRef = doc(firestore, 'users', currentUser.uid);
        const friendUserRef = doc(firestore, 'users', friendUid);
        
        // Update both users' friends arrays
        await Promise.all([
            updateDoc(currentUserRef, {
                friends: arrayUnion(friendUid)
            }),
            updateDoc(friendUserRef, {
                friends: arrayUnion(currentUser.uid)
            })
        ]);
        
        // Update local data
        userFirestoreData.friends = [...currentFriends, friendUid];
        
        // Update loading toast to success
        updateFriendToast(loadingToast, 'Friend added successfully!', 'success');
        
        // Track successful friendship
        if (window.trackClarityEvent) {
            window.trackClarityEvent('friendship_created');
        }
        
        // Clear URL parameter
        clearFriendParameter();
        
        // Refresh friends list if profile modal is open
        const profileModal = document.getElementById('profile-modal');
        if (profileModal && profileModal.style.display !== 'none') {
            await renderFriendsList();
        }
        
    } catch (error) {
        // Update loading toast to error
        updateFriendToast(loadingToast, 'Failed to add friend. Please try again.', 'error');
    }
}

function clearFriendParameter() {
    // Remove ?friend parameter from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete('friend');
    window.history.replaceState({}, document.title, url.toString());
    pendingFriendUid = null;
    sessionStorage.removeItem('pendingFriendUid');
    console.log('🧹 Cleared successfully');
}

function showFriendToast(message, type = 'info', persistent = false) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `friend-toast friend-toast--${type}`;
    
    // Add spinner for loading type
    if (type === 'loading') {
        const spinner = document.createElement('div');
        spinner.className = 'friend-toast__spinner';
        toast.appendChild(spinner);
    }
    
    // Add message text
    const textNode = document.createTextNode(message);
    toast.appendChild(textNode);
    
    // Add to page
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('friend-toast--visible');
    }, 10);
    
    // Remove after 3 seconds (unless persistent)
    if (!persistent) {
        setTimeout(() => {
            toast.classList.remove('friend-toast--visible');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    return toast;
}

function updateFriendToast(toast, message, type) {
    if (!toast) return;
    
    // Update class
    toast.className = `friend-toast friend-toast--visible friend-toast--${type}`;
    
    // Clear content
    toast.innerHTML = '';
    
    // Add message text
    const textNode = document.createTextNode(message);
    toast.appendChild(textNode);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('friend-toast--visible');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Check for pending friend after successful login/signup
export async function processPendingFriend() {
    if (pendingFriendUid && currentUser) {
        const friendUid = pendingFriendUid;
        pendingFriendUid = null; // Clear before processing
        await processFriendRequest(friendUid);
    }
}
