console.log('[DEBUG] main.js script loaded');

// Global state and elements
let content, loginContainer, adminPanel, logoutButton, loading;

// Check if Firebase is available in global scope
console.log('[DEBUG] Firebase available:', typeof firebase !== 'undefined' ? 'Yes' : 'No');
if (typeof firebase !== 'undefined') {
    console.log('[DEBUG] Firebase version:', firebase.SDK_VERSION || 'Unknown');
}

// Check if config is loaded
console.log('[DEBUG] Window.env available:', typeof window.env !== 'undefined' ? 'Yes' : 'No');
if (window.env) {
    console.log('[DEBUG] Config keys:', Object.keys(window.env));
}

// Initialize the application
function initApp() {
    console.log('[DEBUG] initApp started');
    
    try {
        console.log('[DEBUG] Initializing DOM elements');
        // Initialize DOM elements
        content = document.getElementById('main-content'); // Changed from 'content' to 'main-content'
        loginContainer = document.getElementById('login-container');
        adminPanel = document.getElementById('admin-panel');
        logoutButton = document.getElementById('logout-button');
        loading = document.getElementById('loading');
        
        console.log('[DEBUG] DOM elements:', { 
            content: !!content, 
            loginContainer: !!loginContainer, 
            adminPanel: !!adminPanel, 
            logoutButton: !!logoutButton, 
            loading: !!loading 
        });
        
        if (!content) console.error('Main content element not found');
        if (!loading) console.error('Loading element not found');
        
        console.log('[DEBUG] Setting up auth state observer');
        // Set up auth state observer
        setupAuthStateObserver();
        console.log('[DEBUG] Auth state observer set up');
        
        console.log('[DEBUG] Setting up navigation');
        // Initialize navigation
        setupNavigation();
        console.log('[DEBUG] Navigation set up');
        
        // If we have a hash in the URL, load that view
        const initialView = window.location.hash.substring(1) || 'dashboard';
        console.log(`[DEBUG] Loading initial view: ${initialView}`);
        loadContent(initialView);
        
        console.log('[DEBUG] Application initialized');
    } catch (error) {
        console.error('[DEBUG] Error in initApp:', error);
        // Show error to user
        if (content) {
            content.innerHTML = `
                <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <h3 class="font-bold">Application Error</h3>
                    <p>${error.message || 'An unknown error occurred'}</p>
                    <pre class="text-xs mt-2 p-2 bg-gray-100 overflow-auto">${error.stack || 'No stack trace'}</pre>
                    <button onclick="window.location.reload()" class="mt-2 px-4 py-1 bg-blue-500 text-white rounded">
                        Reload Page
                    </button>
                </div>
            `;
        }
        
        // Also update loading screen if it exists
        if (loading) {
            loading.innerHTML = `
                <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <h3 class="font-bold">Initialization Error</h3>
                    <p>${error.message || 'An error occurred during initialization'}</p>
                    <button onclick="window.location.reload()" class="mt-2 px-4 py-1 bg-blue-500 text-white rounded">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
}

// Show loading state
function showLoadingState() {
    console.log('Showing loading state');
    if (loading) loading.style.display = 'flex';
    if (content) content.classList.add('hidden');
}

// Hide loading state
function hideLoadingState() {
    console.log('Hiding loading state');
    if (loading) loading.style.display = 'none';
    if (content) content.classList.remove('hidden');
}

// Show error message
function showError(message) {
    console.error(message);
    if (content) {
        content.innerHTML = `
            <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                <p>${message}</p>
            </div>
        `;
    }
}

// Set up auth state observer
function setupAuthStateObserver() {
    console.log('[DEBUG] setupAuthStateObserver called');
    
    try {
        if (!window.firebase || !window.firebase.auth) {
            const errorMsg = 'Firebase auth not available. Make sure Firebase SDK is loaded before main.js';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        if (!auth) {
            const errorMsg = 'Firebase auth not initialized. Make sure firebase-config.js is loaded and initialized.';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        console.log('[DEBUG] Setting up auth state change listener');
        
        // Add a small delay to ensure Firebase is fully initialized
        setTimeout(() => {
            try {
                const unsubscribe = auth.onAuthStateChanged(
                    (user) => {
                        console.log('[DEBUG] Auth state changed callback');
                        handleAuthStateChange(user);
                    },
                    (error) => {
                        console.error('[DEBUG] Auth state change error:', error);
                        showError('Authentication error. Please refresh the page.');
                    }
                );
                
                console.log('[DEBUG] Auth state change listener set up');
                
                // Store the unsubscribe function in case we need it
                window.__unsubscribeAuth = unsubscribe;
            } catch (error) {
                console.error('[DEBUG] Error setting up auth listener:', error);
                showError('Failed to set up authentication. Please refresh the page.');
            }
        }, 100);
    } catch (error) {
        console.error('[DEBUG] Error in setupAuthStateObserver:', error);
        showError('Authentication system error. Please refresh the page.');
        throw error; // Re-throw to be caught by the caller
    }
}

// Track auth state to prevent multiple simultaneous checks
let authStateCheckInProgress = false;

// Handle auth state changes
async function handleAuthStateChange(user) {
    console.log('[DEBUG] Auth state changed:', user ? 'User signed in' : 'User signed out');
    
    // Prevent multiple simultaneous auth state checks
    if (authStateCheckInProgress) {
        console.log('[DEBUG] Auth state check already in progress, skipping...');
        return;
    }
    
    authStateCheckInProgress = true;
    
    try {
        if (user) {
            // User is signed in
            try {
                console.log('[DEBUG] Getting user document for:', user.uid);
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .get({ source: 'server' }); // Force network request
                
                if (!userDoc.exists) {
                    console.warn('[DEBUG] User document not found in Firestore');
                    throw new Error('User not found in database');
                }
                
                const userData = userDoc.data() || {};
                console.log('[DEBUG] User data from Firestore:', userData);
                
                // Store user data in session
                window.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    role: userData.role || 'developer',
                    name: userData.name || user.email?.split('@')[0] || 'User',
                    mustChangePassword: userData.mustChangePassword === true
                };
                
                // Handle developer password change flow
                if (userData.role === 'developer' && userData.mustChangePassword) {
                    console.log('[DEBUG] Developer needs to change password');
                    showLoginForm();
                    return;
                }
                
                // Check user role and permissions
                console.log('[DEBUG] Checking user role...');
                await checkUserRole(user);
                
            } catch (error) {
                console.error('[DEBUG] Error in auth state change handler:', error);
                
                // Don't sign out if we're already on the login page
                if (!window.location.pathname.includes('login.html')) {
                    await auth.signOut();
                }
                
                // Show error to user if on login page
                const errorElement = document.getElementById('login-error');
                if (errorElement) {
                    errorElement.textContent = 'Authentication error. Please sign in again.';
                    errorElement.classList.remove('hidden');
                }
                
                // Ensure we show the login form
                if (!document.getElementById('login-form')) {
                    showLoginForm();
                }
            }
        } else {
            // User is signed out
            console.log('[DEBUG] No user signed in, showing login form');
            window.currentUser = null;
            showLoginForm();
        }
    } catch (error) {
        console.error('[DEBUG] Unhandled error in auth state change:', error);
    } finally {
        authStateCheckInProgress = false;
    }
    // Helper to enforce password reset for developer accounts
    async function enforceDeveloperPasswordReset(user){
        try{
            if(!db) return false;
            const snap = await db.collection('developers').where('email','==',user.email).limit(1).get();
            if(snap.empty) return false;
            const devDoc = snap.docs[0];
            const devData = devDoc.data();
            if(!devData.mustChangePassword) return false;
            // Show modal to prompt new password
            return await new Promise((resolve)=>{
                const modal = document.createElement('div');
                modal.className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML=`<div class="bg-white rounded-lg w-full max-w-sm p-6">
                    <h3 class="text-lg font-semibold mb-4">Set New Password</h3>
                    <p class="text-sm text-gray-600 mb-4">Please create a new password to continue.</p>
                    <div class="space-y-3">
                        <input type="password" id="newPwd" placeholder="New password" class="w-full px-3 py-2 border rounded" />
                        <input type="password" id="confirmPwd" placeholder="Confirm password" class="w-full px-3 py-2 border rounded" />
                        <div id="pwdErr" class="text-red-600 text-sm hidden"></div>
                        <button id="savePwdBtn" class="w-full py-2 bg-blue-600 text-white rounded">Save Password</button>
                    </div>
                </div>`;
                document.body.appendChild(modal);
                const errEl = modal.querySelector('#pwdErr');
                modal.querySelector('#savePwdBtn').addEventListener('click',async ()=>{
                    const p1 = modal.querySelector('#newPwd').value.trim();
                    const p2 = modal.querySelector('#confirmPwd').value.trim();
                    if(!p1 || p1.length<6){ errEl.textContent='Password must be at least 6 characters.'; errEl.classList.remove('hidden'); return; }
                    if(p1!==p2){ errEl.textContent='Passwords do not match.'; errEl.classList.remove('hidden'); return; }
                    errEl.classList.add('hidden');
                    try{
                        await user.updatePassword(p1);
                        await db.collection('developers').doc(devDoc.id).update({mustChangePassword:false, passwordUpdatedAt:new Date()});
                        modal.remove();
                        resolve(true);
                    }catch(e){
                        console.error('updatePassword error',e);
                        errEl.textContent = e.message || 'Failed to update password.';
                        errEl.classList.remove('hidden');
                    }
                });
            });
        }catch(e){
            console.error('enforceDeveloperPasswordReset error',e);
            return false;
        }
    }
}

// Check user role
async function checkUserRole(user) {
    console.log('[DEBUG] checkUserRole called for user:', user.uid);
    
    // Track if we're already checking role to prevent loops
    if (window._checkingUserRole) {
        console.log('[DEBUG] Role check already in progress, skipping...');
        return;
    }
    
    window._checkingUserRole = true;
    
    try {
        // First, check if user has admin claim
        const idTokenResult = await user.getIdTokenResult(true); // Force refresh
        const isAdmin = idTokenResult.claims.admin === true || 
                      idTokenResult.claims.email_verified === true;
        
        console.log('[DEBUG] User claims:', idTokenResult.claims);
        
        if (isAdmin) {
            console.log('[DEBUG] User has admin claims, showing admin UI');
            await showAdminUIAndLoadView();
            return;
        }
        
        // If no admin claims, check Firestore
        if (!db) {
            console.error('[DEBUG] Firestore not initialized');
            throw new Error('Database not available. Please try again later.');
        }
        
        console.log('[DEBUG] Fetching user document from Firestore');
        const [userDoc, developerDoc] = await Promise.all([
            db.collection('users').doc(user.uid).get({ source: 'server' }),
            db.collection('developers').doc(user.uid).get({ source: 'server' })
        ]);
        
        console.log('[DEBUG] User document:', userDoc.exists ? 'exists' : 'does not exist');
        console.log('[DEBUG] Developer document:', developerDoc.exists ? 'exists' : 'does not exist');
        
        if (userDoc.exists) {
            const userData = userDoc.data() || {};
            console.log('[DEBUG] User data:', userData);
            
            // Check if user is an admin
            if (userData.role === 'admin' || userData.isAdmin === true) {
                console.log('[DEBUG] User is admin in Firestore, showing admin UI');
                await showAdminUIAndLoadView();
                return;
            } 
            // Check if user is a developer
            else if (developerDoc.exists || userData.role === 'developer') {
                console.log('[DEBUG] User is a developer, redirecting to developer dashboard');
                // Set developer flag in session
                window.currentUser = window.currentUser || {};
                window.currentUser.role = 'developer';
                
                // Redirect to developer dashboard
                window.location.hash = 'developer-dashboard';
                await loadContent('developer-dashboard');
                return;
            } 
            else {
                console.log('[DEBUG] User does not have sufficient permissions');
                showError('You do not have permission to access this system.');
            }
        } else {
            console.log('[DEBUG] No user document found');
            showError('No user profile found. Please contact support.');
        }
        
        // If we get here, the user is not authorized
        console.log('[DEBUG] Signing out unauthorized user');
        await auth.signOut();
        
    } catch (error) {
        console.error('[DEBUG] Error in checkUserRole:', error);
        let errorMessage = 'Error verifying your permissions. ';
        
        // Handle specific error cases
        if (error.code) {
            switch (error.code) {
                case 'permission-denied':
                    errorMessage = 'You do not have permission to access this resource.';
                    break;
                case 'unavailable':
                    errorMessage = 'The service is currently unavailable. Please try again later.';
                    break;
                case 'not-found':
                    errorMessage = 'The requested resource was not found.';
                    break;
                case 'resource-exhausted':
                    errorMessage = 'The service has been exhausted. Please try again later.';
                    break;
                case 'failed-precondition':
                    errorMessage = 'The operation was rejected because the system is not in a state required for the operation.';
                    break;
                case 'unauthenticated':
                    errorMessage = 'User is not authenticated. Please sign in again.';
                    break;
                case 'cancelled':
                    errorMessage = 'The operation was cancelled.';
                    break;
                case 'already-exists':
                    errorMessage = 'The requested resource already exists.';
                    break;
                case 'aborted':
                    errorMessage = 'The operation was aborted. Please try again.';
                    break;
                case 'out-of-range':
                    errorMessage = 'The operation was attempted past the valid range.';
                    break;
                case 'unimplemented':
                    errorMessage = 'This operation is not implemented or supported.';
                    break;
                case 'internal':
                    errorMessage = 'An internal error occurred. Please try again later.';
                    break;
                case 'unavailable':
                    errorMessage = 'The service is currently unavailable. Please try again later.';
                    break;
                case 'data-loss':
                    errorMessage = 'Unrecoverable data loss or corruption occurred.';
                    break;
                default:
                    errorMessage = 'An unexpected error occurred. Please try again.';
            }
        } else {
            errorMessage = error.message || 'An unknown error occurred.';
        }
        
        console.error('[DEBUG] Authentication error:', errorMessage);
        showError(errorMessage);
        
        // Only sign out if not already on login page
        if (!window.location.pathname.includes('login.html')) {
            try {
                await auth.signOut();
            } catch (signOutError) {
                console.error('[DEBUG] Error during sign out:', signOutError);
            }
        }
    } finally {
        window._checkingUserRole = false;
        hideLoadingState();
    }
    

}

// Helper function to show admin UI and load view
async function showAdminUIAndLoadView() {
    console.log('[DEBUG] showAdminUIAndLoadView called');
    
    return new Promise((resolve) => {
        console.log('[DEBUG] Inside showAdminUIAndLoadView promise');
        
        showAdminUI(async () => {
            console.log('[DEBUG] showAdminUI callback executed');
            
            try {
                // Get the initial view from the URL or default to 'dashboard'
                const initialView = window.location.hash.substring(1) || 'dashboard';
                console.log(`[DEBUG] Loading initial view: ${initialView}`);
                
                // Log the current URL and hash
                console.log(`[DEBUG] Current URL: ${window.location.href}`);
                console.log(`[DEBUG] Current hash: ${window.location.hash}`);
                
                // Try multiple selectors to find the content container
                console.log('[DEBUG] Looking for content container...');
                const contentContainer = document.querySelector('.min-h-screen .flex-1.overflow-hidden') || 
                                      document.getElementById('main-content') || 
                                      document.getElementById('content') ||
                                      document.querySelector('main');
                
                console.log('[DEBUG] Content container found:', contentContainer);
                
                if (!contentContainer) {
                    console.error('[DEBUG] Content container not found. Available elements:');
                    console.log('[DEBUG] Document body:', document.body.innerHTML);
                    throw new Error('Content container not found');
                }
                
                console.log('[DEBUG] Loading content for view:', initialView);
                
                // Load the initial content
                await loadContent(initialView);
                console.log('[DEBUG] Content loaded successfully');
                resolve();
            } catch (error) {
                console.error('[DEBUG] Error in admin UI callback:', error);
                
                // Show more detailed error in the console
                if (error.stack) {
                    console.error('[DEBUG] Error stack:', error.stack);
                }
                
                // Show error to user
                showError('Failed to load the admin interface. Please check the console for details and refresh the page.');
                
                // Still resolve to prevent unhandled promise rejection
                resolve();
            } finally {
                console.log('[DEBUG] Hiding loading state');
                hideLoadingState();
            }
        });
    });
}

// Show admin UI
function showAdminUI(callback) {
    console.log('[DEBUG] showAdminUI called');
    
    try {
        console.log('[DEBUG] Document body:', document.body);
        console.log('[DEBUG] Document head:', document.head);
        
        // Get the app container (first div in body)
        const appContainer = document.body.firstElementChild;
        console.log('[DEBUG] App container:', appContainer);
        
        if (!appContainer) {
            console.error('[DEBUG] App container not found in body');
            console.log('[DEBUG] Document body children:', document.body.children);
            throw new Error('App container not found');
        }
        
        console.log('[DEBUG] Rendering admin UI');
        
        // Create the admin UI HTML
        const adminUIHTML = `
            <div class="min-h-screen flex bg-gray-100">
                <!-- Sidebar -->
                <div class="w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white flex-shrink-0 flex flex-col h-full">
                    <div class="p-6 pb-4 border-b border-gray-700">
                        <div class="flex items-center space-x-3">
                            <img src="admin-logo.png" alt="Webflare Design Co. Logo" class="h-10 w-auto filter brightness-0 invert">
                            <div>
                                <h1 class="text-xl font-bold text-white">Webflare Design Co.</h1>
                                <p class="text-xs text-gray-400">Admin Panel</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Navigation -->
                    <nav class="mt-6">
                        <div>
                            <a href="#dashboard" data-view="dashboard" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white">
                                <svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                Dashboard
                            </a>
                            <a href="#projects" data-view="projects" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white">
                                <svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Projects
                            </a>
                            <a href="#tasks" data-view="tasks" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white">
                                <svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Tasks
                            </a>
                            <a href="#invoices" data-view="invoices" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white">
                                <svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Invoices
                            </a>
                            <a href="#contracts" data-view="contracts" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white">
                                <svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Contracts
                            </a>
                            <a href="#developers" data-view="developers" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white">
                                <svg class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v-2m0-6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v-2m0-6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4" />
                                </svg>
                                Developers
                            </a>
                        </div>
                    </nav>
                    
                    <!-- User profile -->
                    <div class="px-6 py-4 border-t border-gray-700">
                        <div class="flex items-center">
                            <div class="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                ${auth.currentUser ? auth.currentUser.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium text-white">
                                    ${auth.currentUser ? auth.currentUser.email : 'User'}
                                </p>
                                <button id="logout-button" class="text-xs text-gray-400 hover:text-white">
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="flex-1 overflow-hidden" id="main-content">
                    <!-- Content will be loaded here -->
                </div>
            </div>
        `;
        
        // Set the HTML content
        appContainer.innerHTML = adminUIHTML;
        
        // Set up logout button
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                try {
                    await auth.signOut();
                    // The auth state change handler will handle the UI update
                } catch (error) {
                    console.error('Error signing out:', error);
                    showError('Failed to sign out. Please try again.');
                }
            };
        }
        
        // Set up navigation
        setupNavigation();
        
        console.log('[DEBUG] Admin UI rendered successfully');
        
        // Execute callback if provided
        if (typeof callback === 'function') {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                try {
                    callback();
                } catch (error) {
                    console.error('[DEBUG] Error in admin UI callback:', error);
                    showError('Failed to initialize admin interface');
                }
            }, 50);
        }
    } catch (error) {
        console.error('Error in showAdminUI:', error);
        
        // Show error to user
        const errorContainer = document.createElement('div');
        errorContainer.className = 'p-4 bg-red-100 border border-red-400 text-red-700 rounded';
        errorContainer.innerHTML = `
            <h3 class="font-bold">Error Loading Admin UI</h3>
            <p>${error.message || 'An unknown error occurred'}</p>
            <button onclick="window.location.reload()" class="mt-2 px-4 py-1 bg-blue-500 text-white rounded">
                Reload Page
            </button>
        `;
        
        // Try to show error in the content area or append to body
        const contentArea = document.getElementById('main-content') || document.body;
        contentArea.innerHTML = '';
        contentArea.appendChild(errorContainer);
        
        // Still call the callback if provided, to ensure loading state is cleared
        if (typeof callback === 'function') {
            callback();
        }
    }
}

// Set up sign out button
function setupSignOutButton() {
    const signOutBtn = document.getElementById('sign-out-button');
    if (signOutBtn) {
        signOutBtn.onclick = async () => {
            try {
                await auth.signOut();
                // The auth state change handler will update the UI
            } catch (error) {
                console.error('Sign out error:', error);
            }
        };
    }
}

// Set up navigation and event delegation
function setupNavigation() {
    console.log('[DEBUG] Setting up navigation');
    
    // Set up sign out button
    setupSignOutButton();
    
    // Handle navigation clicks
    document.addEventListener('click', (e) => {
        // Handle navigation links with nav-link class
        let navLink = e.target.closest('.nav-link');
        if (navLink) {
            e.preventDefault();
            const view = navLink.getAttribute('href').substring(1);
            console.log('[DEBUG] Navigation link clicked, view:', view);
            loadContent(view);
            return;
        }
        
        // Handle navigation links with data-view attribute (for sidebar)
        const navItem = e.target.closest('[data-view]');
        if (navItem) {
            e.preventDefault();
            const view = navItem.getAttribute('data-view');
            console.log('[DEBUG] Sidebar nav item clicked, view:', view);
            loadContent(view);
            return;
        }
        
        // Handle add project button
        const addProjectBtn = e.target.closest('#add-project-btn');
        if (addProjectBtn && window.Projects && window.Projects.addProject) {
            e.preventDefault();
            console.log('[DEBUG] Add project button clicked');
            window.Projects.addProject('todo');
            return;
        }
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const view = window.location.hash.substring(1) || 'dashboard';
        console.log('[DEBUG] Popstate, loading view:', view);
        loadContent(view);
    });
    
    console.log('[DEBUG] Navigation setup complete');
}

// Load specific content view
async function loadContent(view) {
    console.log(`[DEBUG] Loading view: ${view}`);
    
    try {
        // Find the main content area in the flex container
        const mainContent = document.querySelector('.min-h-screen .flex-1.overflow-hidden') || 
                          document.getElementById('main-content') || 
                          document.getElementById('content');
        
        if (!mainContent) {
            console.error('[DEBUG] Main content area not found');
            throw new Error('Content element not found');
        }
        
        console.log(`[DEBUG] Found main content area for view: ${view}`);
        
        // Show loading state
        mainContent.innerHTML = `
            <div class="p-6">
                <div class="flex justify-center items-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    <span class="ml-3 text-gray-600">Loading ${view}...</span>
                </div>
            </div>`;
        
        // Update URL
        window.history.pushState({}, '', `#${view}`);
        
        // Update active nav link
        document.querySelectorAll('nav a[data-view]').forEach(link => {
            const linkView = link.getAttribute('data-view');
            if (linkView) {
                // Remove active classes
                link.classList.remove('bg-gray-700', 'text-white');
                // Add active class if this is the current view
                if (linkView === view) {
                    link.classList.add('bg-gray-700', 'text-white');
                }
            }
        });
        
        // Update page title
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            const formattedTitle = view.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            pageTitle.textContent = formattedTitle;
        }
        
        console.log(`[DEBUG] Loading content for view: ${view}`);
        
        // Load appropriate content
        let contentLoader;
        switch(view) {
            case 'dashboard':
                // If user is a developer, redirect to developer dashboard
                if (window.currentUser && window.currentUser.role === 'developer') {
                    view = 'developer-dashboard';
                    window.history.replaceState({}, '', `#${view}`);
                    return loadContent(view);
                }
                contentLoader = loadDashboard();
                break;
            case 'developer-dashboard':
                mainContent.innerHTML = `
                    <div class="p-6">
                        <h2 class="text-2xl font-bold mb-6">Developer Dashboard</h2>
                        <div class="bg-white rounded-lg shadow p-6">
                            <h3 class="text-xl font-semibold mb-4">Welcome, ${window.currentUser?.name || 'Developer'}!</h3>
                            <p class="text-gray-600 mb-4">This is your developer dashboard. Here you can view your assigned tasks and projects.</p>
                            <div id="developer-tasks" class="mt-6">
                                <h4 class="text-lg font-medium mb-3">Your Tasks</h4>
                                <div class="bg-gray-50 p-4 rounded border border-gray-200">
                                    <p class="text-gray-500 text-center">Loading tasks...</p>
                                </div>
                            </div>
                        </div>
                    </div>`;
                
                // Here you can load developer-specific content
                contentLoader = loadDeveloperDashboard();
                break;
            case 'projects':
                mainContent.innerHTML = `
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold">Projects</h2>
                            <button id="add-project-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                                + Add Project
                            </button>
                        </div>
                        <div id="projects-container">
                            <div class="flex justify-center items-center h-64">
                                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                                <span class="ml-3 text-gray-600">Loading projects...</span>
                            </div>
                        </div>
                    </div>`;
                
                try {
                    // Check if Projects module is available
                    if (typeof window.Projects === 'undefined' || typeof window.Projects.loadProjectsSection !== 'function') {
                        throw new Error('Projects module not properly initialized. Make sure projects.js is loaded correctly.');
                    }
                    
                    // Get the projects container
                    const projectsContainer = mainContent.querySelector('#projects-container');
                    if (!projectsContainer) {
                        throw new Error('Projects container not found');
                    }
                    
                    // Load projects using the Projects module
                    await window.Projects.loadProjectsSection(projectsContainer);
                    
                    // Set up the add project button
                    const addProjectBtn = mainContent.querySelector('#add-project-btn');
                    if (addProjectBtn) {
                        addProjectBtn.addEventListener('click', () => {
                            if (window.Projects && typeof window.Projects.addProject === 'function') {
                                window.Projects.addProject();
                            } else {
                                console.error('Projects.addProject function not available');
                                alert('Add project functionality is not available. Please check the console for more details.');
                            }
                        });
                    }
                    
                    contentLoader = Promise.resolve();
                } catch (error) {
                    console.error('Error loading projects:', error);
                    const projectsContainer = mainContent.querySelector('#projects-container');
                    if (projectsContainer) {
                        projectsContainer.innerHTML = `
                            <div class="bg-red-50 border-l-4 border-red-500 p-4">
                                <div class="flex">
                                    <div class="flex-shrink-0">
                                        <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <div class="ml-3">
                                        <p class="text-sm text-red-700">
                                            ${error.message || 'Failed to load projects. Please try again later.'}
                                        </p>
                                    </div>
                                </div>
                            </div>`;
                    }
                    throw error;
                }
                break;
            case 'tasks':
                mainContent.innerHTML = `
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold">Tasks</h2>
                            <button id="add-task-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                                + Add Task
                            </button>
                        </div>
                        <div id="tasks-container">
                            <div class="flex justify-center items-center h-64">
                                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                                <span class="ml-3 text-gray-600">Loading tasks...</span>
                            </div>
                        </div>
                    </div>`;
                
                try {
                    if (window.Tasks && typeof window.Tasks.loadTasks === 'function') {
                        // Initialize the Tasks module first
                        await window.Tasks.init();
                        
                        // Then load the tasks
                        contentLoader = window.Tasks.loadTasks()
                            .then(() => {
                                // Initialize drag and drop after tasks are loaded
                                if (typeof window.Tasks.initTaskDragAndDrop === 'function') {
                                    window.Tasks.initTaskDragAndDrop();
                                }
                                
                                // Set up the add task button
                                const addTaskBtn = mainContent.querySelector('#add-task-btn');
                                if (addTaskBtn) {
                                    addTaskBtn.addEventListener('click', () => {
                                        window.Tasks.addTask('backlog');
                                    });
                                }
                            });
                    } else {
                        throw new Error('Tasks module not available');
                    }
                } catch (error) {
                    console.error('Error loading tasks:', error);
                    const tasksContainer = mainContent.querySelector('#tasks-container');
                    if (tasksContainer) {
                        tasksContainer.innerHTML = `
                            <div class="bg-red-50 border-l-4 border-red-500 p-4">
                                <div class="flex">
                                    <div class="flex-shrink-0">
                                        <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <div class="ml-3">
                                        <p class="text-sm text-red-700">
                                            ${error.message || 'Failed to load tasks. Please try again later.'}
                                        </p>
                                    </div>
                                </div>
                            </div>`;
                    }
                    throw error;
                }
                break;
            case 'contracts':
                if (window.Contracts && typeof window.Contracts.loadContractsSection === 'function') {
                    await window.Contracts.loadContractsSection();
                    contentLoader = Promise.resolve();
                } else {
                    throw new Error('Contracts module not available');
                }
                break;
            case 'invoices':
                // Create a simple container for the invoices module to use
                mainContent.innerHTML = `
                    <div id="invoices-page">
                        <div id="invoices-container"></div>
                    </div>`;
                
                const container = document.getElementById('invoices-container') || mainContent;
                
                // Debug: Log the current state of window.Invoices
                console.log('Invoices module state:', {
                    'window.Invoices exists': !!window.Invoices,
                    'window.Invoices.init is function': window.Invoices && typeof window.Invoices.init === 'function',
                    'Available methods': window.Invoices ? Object.keys(window.Invoices).filter(k => typeof window.Invoices[k] === 'function') : []
                });
                
                // Check if Invoices module is loaded
                if (!window.Invoices) {
                    const errorMsg = 'Invoices module not found. Make sure invoices.js is loaded.';
                    console.error(errorMsg);
                    container.innerHTML = `
                        <div class="p-6 text-center text-red-600">
                            <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                            <h3 class="text-lg font-medium">Failed to load Invoices module</h3>
                            <p class="mt-2 text-sm text-gray-600">${errorMsg}</p>
                            <div class="mt-4 space-x-2">
                                <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Reload Page
                                </button>
                            </div>
                        </div>`;
                    return;
                }
                
                // Check if init function exists
                if (typeof window.Invoices.init !== 'function') {
                    const errorMsg = 'Invoices.init is not a function. Available methods: ' + 
                        Object.keys(window.Invoices).filter(k => typeof window.Invoices[k] === 'function').join(', ');
                    console.error(errorMsg);
                    container.innerHTML = `
                        <div class="p-6 text-center text-red-600">
                            <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                            <h3 class="text-lg font-medium">Invoices Module Error</h3>
                            <p class="mt-2 text-sm text-gray-600">${errorMsg}</p>
                            <div class="mt-4 space-x-2">
                                <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Reload Page
                                </button>
                            </div>
                        </div>`;
                    return;
                }
                
                // Try to initialize the module
                try {
                    console.log('Initializing Invoices module...');
                    await window.Invoices.init();
                    console.log('Invoices module initialized successfully');
                    contentLoader = Promise.resolve();
                } catch (error) {
                    console.error('Failed to initialize Invoices module:', error);
                    container.innerHTML = `
                        <div class="p-6 text-center text-red-600">
                            <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                            <h3 class="text-lg font-medium">Initialization Failed</h3>
                            <p class="mt-2 text-sm text-gray-600">${error.message || 'Failed to initialize Invoices module'}</p>
                            <div class="mt-4 space-x-2">
                                <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Reload Page
                                </button>
                                <button onclick="loadContent('invoices')" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                                    Try Again
                                </button>
                            </div>
                        </div>`;
                }
                break;
            case 'developers':
                await loadDevelopers();
                contentLoader = Promise.resolve();
                break;
            default:
                console.log(`[DEBUG] View not found: ${view}`);
                throw new Error(`View "${view}" not found`);
        }
        
        // Wait for content to load if it's a promise
        if (contentLoader && typeof contentLoader.then === 'function') {
            await contentLoader;
        }
        
        console.log(`[DEBUG] Successfully loaded view: ${view}`);
        
    } catch (error) {
        console.error(`[DEBUG] Error loading view ${view}:`, error);
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="text-center py-8">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                            <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                            </svg>
                        </div>
                        <h2 class="mt-3 text-lg font-medium text-gray-900">Error Loading Page</h2>
                        <p class="text-sm text-gray-500">
                            ${error.message || 'An error occurred while loading the page.'}
                        </p>
                        <div class="mt-6">
                            <button onclick="window.location.href='#dashboard'" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                                </svg>
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>`;
            
        }
    }
}

// Show login form
function showLoginForm() {
    Login.show();
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const errorElement = document.getElementById('login-error');
    
    if (!email || !password) {
        if (errorElement) errorElement.classList.remove('hidden');
        return;
    }
    
    try {
        showLoadingState();
        await auth.signInWithEmailAndPassword(email, password);
        // Auth state change handler will take care of the rest
    } catch (error) {
        console.error('Login error:', error);
        if (errorElement) {
            errorElement.textContent = error.message || 'Failed to sign in. Please try again.';
            errorElement.classList.remove('hidden');
        }
    } finally {
        hideLoadingState();
    }
}

// Helper function to create stat card
function createStatCard({ title, value, change, subtitle = '', icon, iconBg, iconColor, trend = 'up', borderColor, bgColor, textColor, valueColor }) {
    return `
        <div class="${bgColor} ${borderColor} border rounded-xl p-5 transition-all duration-200 hover:shadow-md">
            <div class="flex items-center justify-between">
                <div class="space-y-1">
                    <p class="text-sm font-medium ${textColor}">${title}</p>
                    <div class="flex items-baseline">
                        <p class="text-2xl font-bold ${valueColor}">${value}</p>
                        ${change ? `
                            <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                ${trend === 'up' ? '↑' : '↓'} ${change}
                            </span>
                        ` : ''}
                    </div>
                    ${subtitle ? `<p class="text-xs ${textColor} opacity-75">${subtitle}</p>` : ''}
                </div>
                <div class="p-3 rounded-lg bg-white bg-opacity-70 shadow-sm">
                    <i class="fas fa-${icon} ${iconColor} text-xl"></i>
                </div>
            </div>
        </div>`;
}

// Helper function to create project card
function createProjectCard({ title, progress, status, statusColor, team, dueDate, progressColor }) {
    return `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
            <div class="flex justify-between items-start">
                <h4 class="font-medium text-gray-900">${title}</h4>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                    ${status}
                </span>
            </div>
            <div class="mt-4">
                <div class="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>${progress}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="${progressColor} h-2 rounded-full" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="mt-4 flex items-center justify-between">
                <div class="flex -space-x-2">
                    ${team.map(member => `
                        <div class="h-8 w-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700">
                            ${member}
                        </div>`).join('')}
                </div>
                <span class="text-xs text-gray-500">Due ${dueDate}</span>
            </div>
        </div>`;
}

// Helper function to create activity item
function createActivityItem({ icon, iconBg, iconColor, title, time, description, meta, metaColor }) {
    return `
        <div class="p-4 hover:bg-gray-50 transition-colors duration-150">
            <div class="flex items-start">
                <div class="flex-shrink-0 h-10 w-10 rounded-full ${iconBg} flex items-center justify-center">
                    <i class="fas fa-${icon} ${iconColor}"></i>
                </div>
                <div class="ml-4 flex-1">
                    <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-gray-900">${title}</p>
                        <span class="text-xs text-gray-500">${time}</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">${description}</p>
                    ${meta ? `
                        <div class="mt-1.5 flex items-center text-xs ${metaColor} font-medium">
                            ${meta.icon ? `<i class="fas fa-${meta.icon} mr-1"></i>` : ''}
                            ${meta.type === 'amount' ? `
                                <span class="font-semibold">${meta.amount}</span>
                                <span class="mx-1">•</span>
                                <span>${meta.text}</span>
                            ` : `
                                <span>${meta.text}</span>
                            `}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>`;
}

// Helper function to create quick action button
function createQuickAction({ icon, label, href, iconBg, iconColor, hoverBg, hoverBorder }) {
    return `
        <a href="${href}" class="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:${hoverBorder} hover:${hoverBg} transition-colors duration-150">
            <div class="h-10 w-10 rounded-full ${iconBg} flex items-center justify-center ${iconColor} mb-2">
                <i class="fas fa-${icon}"></i>
            </div>
            <span class="text-xs font-medium text-gray-700 text-center">${label}</span>
        </a>`;
}

// Helper function to create timeline item
function createTimelineItem({ title, percentage, status, color, icon }) {
    const colorClasses = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-800', progress: 'bg-blue-600' },
        green: { bg: 'bg-green-100', text: 'text-green-800', progress: 'bg-green-600' },
        yellow: { bg: 'bg-amber-100', text: 'text-amber-800', progress: 'bg-amber-400' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-800', progress: 'bg-purple-600' },
        red: { bg: 'bg-red-100', text: 'text-red-800', progress: 'bg-red-600' }
    };
    
    return `
        <div class="mb-6 last:mb-0">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center">
                    <div class="${colorClasses[color].bg} ${colorClasses[color].text} h-8 w-8 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-${icon} text-xs"></i>
                    </div>
                    <span class="text-sm font-medium text-gray-900">${title}</span>
                </div>
                <span class="text-xs font-medium ${status === 'In Progress' ? 'text-blue-600' : 'text-gray-500'}">
                    ${status}
                </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div class="${colorClasses[color].progress} h-2 rounded-full" style="width: ${percentage}%"></div>
            </div>
            <div class="flex justify-between">
                <span class="text-xs text-gray-500">${percentage}% complete</span>
                <span class="text-xs text-gray-400">${100-percentage}% remaining</span>
            </div>
        </div>`;
}

// Helper function to format timestamp
function formatTimeAgo(timestamp) {
    if (!timestamp || !timestamp.seconds) return 'just now';
    
    const now = new Date();
    const date = new Date(timestamp.seconds * 1000);
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `${interval} years ago`;
    if (interval === 1) return '1 year ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `${interval} months ago`;
    if (interval === 1) return '1 month ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `${interval} days ago`;
    if (interval === 1) return 'yesterday';
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `${interval} hours ago`;
    if (interval === 1) return '1 hour ago';
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `${interval} minutes ago`;
    if (interval === 1) return '1 minute ago';
    
    return 'just now';
}

// Helper function to get recent activity HTML
async function getRecentActivity(projectsData, tasksData, invoicesData) {
    try {
        // Get recent projects
        const recentProjects = projectsData
            .slice(0, 3)
            .map(project => ({
                type: 'project',
                id: project.id,
                ...project,
                timestamp: project.createdAt || { seconds: Date.now() / 1000 }
            }));
        
        // Get recent tasks
        const recentTasks = tasksData
            .slice(0, 3)
            .map(task => ({
                type: 'task',
                id: task.id,
                ...task,
                timestamp: task.dueDate || task.createdAt || { seconds: Date.now() / 1000 }
            }));
        
        // Get recent invoices
        const recentInvoices = invoicesData
            .slice(0, 3)
            .map(invoice => ({
                type: 'invoice',
                id: invoice.id,
                ...invoice,
                timestamp: invoice.createdAt || { seconds: Date.now() / 1000 }
            }));
        
        // Combine and sort all activities
        const allActivities = [...recentProjects, ...recentTasks, ...recentInvoices]
            .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
            .slice(0, 5);
        
        // Generate HTML for activities
        if (allActivities.length === 0) {
            return `
                <div class="p-6 text-center text-gray-500">
                    <p>No recent activity to display</p>
                </div>`;
        }
        
        return allActivities.map(activity => {
            let icon = '';
            let title = '';
            let description = '';
            
            switch(activity.type) {
                case 'project':
                    icon = '📁';
                    title = `New Project: ${activity.name || 'Untitled Project'}`;
                    description = activity.description ? 
                        `${activity.description.substring(0, 60)}${activity.description.length > 60 ? '...' : ''}` : 
                        'No description';
                    break;
                case 'task':
                    icon = '✅';
                    title = `Task ${activity.status === 'completed' ? 'completed' : 'updated'}: ${activity.title || 'Untitled Task'}`;
                    description = `Status: ${activity.status || 'pending'}`;
                    if (activity.dueDate) {
                        description += ` • Due: ${new Date(activity.dueDate.seconds * 1000).toLocaleDateString()}`;
                    }
                    break;
                case 'invoice':
                    icon = '💰';
                    title = `Invoice ${activity.status}: #${activity.invoiceNumber || activity.id.substring(0, 6)}`;
                    description = `Amount: $${(parseFloat(activity.amount) || 0).toFixed(2)} • ${activity.clientName || 'Unknown Client'}`;
                    break;
                default:
                    return '';
            }
            
            return `
                <div class="p-4 hover:bg-gray-50">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 text-lg">
                            ${icon}
                        </div>
                        <div class="ml-4 flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">
                                ${title}
                            </p>
                            <p class="text-sm text-gray-500 truncate">
                                ${description}
                            </p>
                            <p class="text-xs text-gray-400 mt-1">
                                ${formatTimeAgo(activity.timestamp)}
                            </p>
                        </div>
                    </div>
                </div>`;
        }).join('');
        
    } catch (error) {
        console.error('Error getting recent activity:', error);
        return `
            <div class="p-6 text-center text-red-500">
                <p>Error loading recent activity</p>
            </div>`;
    }
}

// Helper function to get project status HTML
function getProjectStatus(projectsData) {
    try {
        if (!projectsData || projectsData.length === 0) {
            return `
                <div class="text-center py-4">
                    <p class="text-gray-500">No projects found</p>
                </div>`;
        }
        
        // Count projects by status
        const statusCounts = {};
        projectsData.forEach(project => {
            const status = project.status || 'planning';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // Define status colors and labels
        const statusConfig = {
            'planning': { label: 'Planning', color: 'bg-gray-200', text: 'text-gray-800' },
            'in-progress': { label: 'In Progress', color: 'bg-blue-200', text: 'text-blue-800' },
            'on-hold': { label: 'On Hold', color: 'bg-yellow-200', text: 'text-yellow-800' },
            'completed': { label: 'Completed', color: 'bg-green-200', text: 'text-green-800' },
            'cancelled': { label: 'Cancelled', color: 'bg-red-200', text: 'text-red-800' }
        };
        
        // Generate status items
        return Object.entries(statusConfig).map(([status, config]) => {
            const count = statusCounts[status] || 0;
            const percentage = projectsSnapshot.size > 0 
                ? Math.round((count / projectsSnapshot.size) * 100) 
                : 0;
                
            return `
                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium">${config.label}</span>
                        <span class="text-gray-500">${count} (${percentage}%)</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full ${config.color} ${config.text}" 
                             style="width: ${percentage}%">
                        </div>
                    </div>
                </div>`;
        }).join('');
        
    } catch (error) {
        console.error('Error getting project status:', error);
        return `
            <div class="text-center py-4 text-red-500">
                <p>Error loading project status</p>
            </div>`;
    }
}

// Load dashboard view
async function loadDashboard() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content element not found');
        return;
    }
    
    // Show loading state
    mainContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p class="ml-4 text-gray-600">Loading dashboard data...</p>
        </div>`;
    
    try {
        // Fetch data in parallel
        const [projectsSnapshot, tasksSnapshot, invoicesSnapshot, developersSnapshot] = await Promise.all([
            firebase.firestore().collection('projects').get(),
            firebase.firestore().collection('tasks')
                .where('status', 'in', ['in-progress', 'pending', 'overdue']).get(),
            firebase.firestore().collection('invoices')
                .where('status', 'in', ['pending', 'sent', 'overdue']).get(),
            firebase.firestore().collection('developers')
                .where('status', '==', 'active').get()
        ]);
        
        // Process data
        const projects = projectsSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log(`Project ${doc.id}:`, data); // Log the raw project data
            return { 
                id: doc.id, 
                name: data.name || data.projectName || data.title || '',
                client: data.client || data.clientName || data.customer || null,
                dueDate: data.dueDate || data.endDate || null,
                ...data 
            };
        });
        
        console.log('Processed projects:', projects); // Log the processed projects
        
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const developers = developersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate stats
        const totalProjects = projectsSnapshot.size;
        const activeTasks = tasksSnapshot.size;
        const pendingInvoices = invoicesSnapshot.size;
        const activeDevelopers = developersSnapshot.size;
        
        // Calculate total pending amount
        let totalPendingAmount = 0;
        invoicesSnapshot.forEach(doc => {
            const invoice = doc.data();
            totalPendingAmount += parseFloat(invoice.amount || 0);
        });
        
        // Get overdue tasks count
        const overdueTasks = tasksSnapshot.docs.filter(
            doc => doc.data().status === 'overdue'
        ).length;
        
        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            }).format(amount);
        };
        
        // Render the dashboard with real data
        mainContent.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- Header with Title -->
                <div class="mb-8">
                    <div class="mb-6">
                        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p class="mt-1 text-sm text-gray-500">Welcome back! Here's what's happening today.</p>
                    </div>

                    <!-- Stats Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${createStatCard({
                            title: 'Total Projects',
                            value: totalProjects.toString(),
                            change: '',
                            icon: 'folder-open',
                            iconBg: 'bg-blue-100',
                            iconColor: 'text-blue-600',
                            trend: 'up',
                            borderColor: 'border-blue-200',
                            bgColor: 'bg-gradient-to-br from-blue-50 to-white',
                            textColor: 'text-blue-700',
                            valueColor: 'text-blue-900'
                        })}
                        
                        ${createStatCard({
                            title: 'Active Tasks',
                            value: activeTasks.toString(),
                            subtitle: overdueTasks > 0 ? `${overdueTasks} overdue` : 'All on track',
                            icon: 'tasks',
                            iconBg: overdueTasks > 0 ? 'bg-red-100' : 'bg-green-100',
                            iconColor: overdueTasks > 0 ? 'text-red-600' : 'text-green-600',
                            borderColor: overdueTasks > 0 ? 'border-red-200' : 'border-green-200',
                            bgColor: overdueTasks > 0 ? 'bg-gradient-to-br from-red-50 to-white' : 'bg-gradient-to-br from-green-50 to-white',
                            textColor: overdueTasks > 0 ? 'text-red-700' : 'text-green-700',
                            valueColor: overdueTasks > 0 ? 'text-red-900' : 'text-green-900'
                        })}
                        
                        ${createStatCard({
                            title: 'Pending Invoices',
                            value: pendingInvoices.toString(),
                            subtitle: `${formatCurrency(totalPendingAmount)} pending`,
                            icon: 'file-invoice-dollar',
                            iconBg: 'bg-amber-100',
                            iconColor: 'text-amber-600',
                            borderColor: 'border-amber-200',
                            bgColor: 'bg-gradient-to-br from-amber-50 to-white',
                            textColor: 'text-amber-700',
                            valueColor: 'text-amber-900'
                        })}
                        
                        ${createStatCard({
                            title: 'Team Members',
                            value: activeDevelopers.toString(),
                            subtitle: 'Active developers',
                            icon: 'users',
                            iconBg: 'bg-purple-100',
                            iconColor: 'text-purple-600',
                            borderColor: 'border-purple-200',
                            bgColor: 'bg-gradient-to-br from-purple-50 to-white',
                            textColor: 'text-purple-700',
                            valueColor: 'text-purple-900'
                        })}
                    </div>
                </div>
                
                <!-- Main Content -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Left Column (2/3 width) -->
                    <div class="lg:col-span-2 space-y-6">
                        <!-- Projects Overview -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-semibold text-gray-900">Recent Projects</h3>
                            </div>
                            <div class="divide-y divide-gray-200">
                                ${projects && projects.length > 0 ? 
                                    projects.slice(0, 5).map(project => {
                                        const projectName = project.name || 'Unnamed Project';
                                        // Handle both string and object client data
                                        let clientName = 'No client';
                                        if (project.client) {
                                            if (typeof project.client === 'object' && project.client !== null) {
                                                clientName = project.client.name || project.client.displayName || 'Client';
                                            } else {
                                                clientName = project.client;
                                            }
                                        }
                                        let dueDate = 'No due date';
                                        
                                        try {
                                            if (project.dueDate && project.dueDate.seconds) {
                                                dueDate = new Date(project.dueDate.seconds * 1000).toLocaleDateString();
                                            } else if (project.dueDate && typeof project.dueDate.toDate === 'function') {
                                                dueDate = project.dueDate.toDate().toLocaleDateString();
                                            }
                                        } catch (e) {
                                            console.error('Error formatting date:', e);
                                        }
                                        
                                        return `
                                            <div class="px-6 py-4 hover:bg-gray-50 cursor-pointer" onclick="loadProjectDetails('${project.id}')">
                                                <div class="flex items-center justify-between">
                                                    <div class="flex items-center">
                                                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                            <span class="text-indigo-600 font-medium">
                                                                ${projectName.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div class="ml-4">
                                                            <div class="text-sm font-medium text-gray-900">${projectName}</div>
                                                            <div class="text-sm text-gray-500">${clientName}</div>
                                                        </div>
                                                    </div>
                                                    <div class="text-sm text-gray-500">
                                                        ${dueDate}
                                                    </div>
                                                </div>
                                            </div>`;
                                    }).join('') : 
                                    `<div class="px-6 py-8 text-center text-gray-500">
                                        <i class="fas fa-folder-open text-4xl mb-2 text-gray-300"></i>
                                        <p>No projects found</p>
                                    </div>`
                                }
                            </div>
                        </div>
                        
                        <!-- Tasks Overview -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-semibold text-gray-900">Recent Tasks</h3>
                            </div>
                            <div class="divide-y divide-gray-200">
                                ${tasks.slice(0, 5).map(task => `
                                    <div class="px-6 py-4 hover:bg-gray-50">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center">
                                                <input type="checkbox" 
                                                    ${task.status === 'completed' ? 'checked' : ''}
                                                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                                <div class="ml-3">
                                                    <div class="text-sm font-medium text-gray-900">
                                                        ${task.title || 'Untitled Task'}
                                                    </div>
                                                    <div class="text-sm text-gray-500">
                                                        ${task.projectName || 'No project'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="text-sm ${task.status === 'overdue' ? 'text-red-600' : 'text-gray-500'}">
                                                ${task.dueDate ? new Date(task.dueDate.seconds * 1000).toLocaleDateString() : 'No due date'}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Sidebar -->
                    <div class="space-y-6">
                        <!-- Quick Actions -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
                            </div>
                            <div class="p-4 grid grid-cols-2 gap-4">
                                <a href="#new-project" class="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50">
                                    <div class="mx-auto h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <i class="fas fa-plus text-indigo-600"></i>
                                    </div>
                                    <div class="mt-2 text-sm font-medium text-gray-900">New Project</div>
                                </a>
                                <a href="#new-task" class="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50">
                                    <div class="mx-auto h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <i class="fas fa-tasks text-green-600"></i>
                                    </div>
                                    <div class="mt-2 text-sm font-medium text-gray-900">New Task</div>
                                </a>
                                <a href="#new-invoice" class="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50">
                                    <div class="mx-auto h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                        <i class="fas fa-file-invoice-dollar text-yellow-600"></i>
                                    </div>
                                    <div class="mt-2 text-sm font-medium text-gray-900">New Invoice</div>
                                </a>
                                <a href="#reports" class="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50">
                                    <div class="mx-auto h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                        <i class="fas fa-chart-bar text-purple-600"></i>
                                    </div>
                                    <div class="mt-2 text-sm font-medium text-gray-900">View Reports</div>
                                </a>
                            </div>
                        </div>
                        
                        <!-- Recent Activity -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-semibold text-gray-900">Recent Activity</h3>
                            </div>
                            <div class="divide-y divide-gray-200">
                                ${getRecentActivity(projects, tasks, invoices)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    } catch (error) {
        console.error('Error in loadDashboard:', error);
        mainContent.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="bg-red-50 border-l-4 border-red-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-red-700">
                                Failed to load dashboard. Please try again later.
                                ${error.message ? `<br><span class="text-xs">${error.message}</span>` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            </div>`;
    }
}

// Initialize Projects UI
async function loadProjects() {
    console.log('[DEBUG] loadProjects called');
    
    // Get the main content container
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content container not found');
        return;
    }
    
    // Create the projects container structure
    const projectsContainer = document.createElement('div');
    projectsContainer.className = 'p-6';
    
    // Create header with title and add button
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-6';
    
    const title = document.createElement('h2');
    title.className = 'text-2xl font-bold';
    title.textContent = 'Projects';
    
    const addButton = document.createElement('button');
    addButton.id = 'add-project-btn';
    addButton.className = 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600';
    addButton.textContent = '+ Add Project';
    
    header.appendChild(title);
    header.appendChild(addButton);
    
    // Create search bar
    const searchContainer = document.createElement('div');
    searchContainer.className = 'bg-white rounded-lg shadow overflow-hidden';
    
    const searchBar = document.createElement('div');
    searchBar.className = 'p-4 border-b border-gray-200';
    
    const searchInputContainer = document.createElement('div');
    searchInputContainer.className = 'flex items-center justify-between';
    
    const searchInputWrapper = document.createElement('div');
    searchInputWrapper.className = 'flex-1';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'project-search';
    searchInput.placeholder = 'Search projects...';
    searchInput.className = 'w-full max-w-md px-4 py-2 border rounded-md';
    searchInputWrapper.appendChild(searchInput);
    searchInputContainer.appendChild(searchInputWrapper);
    searchBar.appendChild(searchInputContainer);
    searchContainer.appendChild(searchBar);
    
    // Create projects content area
    const projectsContent = document.createElement('div');
    projectsContent.id = 'projects-container';
    projectsContent.className = 'p-4';
    
    // Add loading spinner
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'flex justify-center items-center py-12';
    loadingSpinner.innerHTML = `
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    `;
    
    projectsContent.appendChild(loadingSpinner);
    searchContainer.appendChild(projectsContent);
    
    // Assemble the structure
    projectsContainer.appendChild(header);
    projectsContainer.appendChild(searchContainer);
    
    // Clear and set the main content
    mainContent.innerHTML = '';
    mainContent.appendChild(projectsContainer);
    
    // Load projects using the Projects module
    try {
        console.log('[DEBUG] Loading projects section...');
        
        // Wait for Projects module to be available
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = 100; // ms
        
        while (!window.Projects && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            attempts++;
        }
        
        console.log('[DEBUG] window.Projects:', window.Projects);
        
        if (window.Projects && typeof window.Projects.loadProjectsSection === 'function') {
            console.log('[DEBUG] Calling Projects.loadProjectsSection()');
            
            // Get the projects container
            const projectsContainer = document.getElementById('projects-container');
            if (!projectsContainer) {
                throw new Error('Projects container not found in the DOM');
            }
            
            // Call the Projects module with the container
            await window.Projects.loadProjectsSection(projectsContainer);
            console.log('[DEBUG] Projects.loadProjectsSection() completed');
        } else {
            const errorMsg = 'Projects module not properly initialized. Make sure projects.js is loaded correctly.';
            console.error('[DEBUG]', errorMsg, 'Attempted', attempts, 'times');
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('[DEBUG] Error in loadProjects:', error);
        
        // Create error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'p-4 bg-red-100 border border-red-400 text-red-700 rounded';
        errorContainer.innerHTML = `
            <h3 class="font-bold">Error Loading Projects</h3>
            <p>${error.message || 'An error occurred while loading projects'}</p>
            <p class="text-sm mt-2">Check the console for more details.</p>
        `;
        
        // Try to find a container to show the error
        const container = document.getElementById('projects-container') || mainContent;
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorContainer);
        } else {
            console.error('Could not find main content area to display error');
        }
    }
}
function initTasks() {
    console.log('Loading tasks section...');
    const tasksContainer = document.getElementById('main-content');
    if (!tasksContainer) {
        console.error('Main content container not found');
        return;
    }
    
    // Show loading state
    tasksContainer.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span class="ml-3 text-gray-600">Loading tasks...</span>
        </div>`;
    
    // Initialize and load tasks
    if (window.Tasks && typeof window.Tasks.init === 'function') {
        console.log('Initializing Tasks module');
        window.Tasks.init()
            .then(() => {
                console.log('Tasks module initialized, loading tasks...');
                return window.Tasks.loadTasks();
            })
            .catch(error => {
                console.error('Error loading tasks section:', error);
                tasksContainer.innerHTML = `
                    <div class="p-6 text-center text-red-600">
                        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                        <h3 class="text-lg font-medium">Failed to load tasks</h3>
                        <p class="mt-2 text-sm text-gray-600">${error.message || 'An error occurred while loading tasks'}</p>
                        <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Try Again
                        </button>
                    </div>`;
            });
    } else {
        console.error('Tasks module not available');
        tasksContainer.innerHTML = `
            <div class="p-6 text-center text-yellow-600">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <h3 class="text-lg font-medium">Tasks Module Not Available</h3>
                <p class="mt-2 text-sm text-gray-600">The tasks module failed to load. Please refresh the page or contact support.</p>
                <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Refresh Page
                </button>
            </div>`;
    }
}

async function loadContracts() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // Show loading state
    mainContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span class="ml-4 text-gray-600">Loading contracts...</span>
        </div>
    `;
    
    try {
        // Initialize the Contracts module if not already done
        if (typeof window.Contracts === 'undefined' || !window.Contracts.__initialized) {
            console.log('Initializing Contracts module...');
            await window.Contracts.init();
        }
        
        // Load the contracts section
        await window.Contracts.loadContractsSection();
    } catch (error) {
        console.error('Error loading contracts:', error);
        mainContent.innerHTML = `
            <div class="bg-red-50 border-l-4 border-red-400 p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-700">
                            Failed to load contracts. ${error.message || 'Please try again later.'}
                        </p>
                    </div>
                </div>
            </div>
            <div class="mt-4">
                <button onclick="loadContracts()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Retry
                </button>
            </div>
        `;
    }
}

function loadInvoices() {
    console.log('[DEBUG] loadInvoices called');
    
    // Get the main content container
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content container not found');
        return;
    }
    
    // Show loading state
    mainContent.innerHTML = `
        <div class="flex flex-col items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p class="mt-4 text-gray-600">Loading invoices...</p>
        </div>`;
    
    // Initialize the Invoices module if available
    if (window.Invoices) {
        console.log('[DEBUG] Initializing Invoices module');
        
        // Initialize the module - this will handle loading the UI
        window.Invoices.init()
            .then(() => {
                console.log('[DEBUG] Invoices module initialized successfully');
            })
            .catch(error => {
                console.error('Error initializing Invoices module:', error);
                mainContent.innerHTML = `
                    <div class="p-6 text-center text-red-600">
                        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                        <h3 class="text-lg font-medium">Failed to load invoices</h3>
                        <p class="mt-2 text-sm text-gray-600">${error.message || 'An error occurred while loading invoices'}</p>
                        <button onclick="loadInvoices()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Try Again
                        </button>
                    </div>`;
            });
    } else {
        console.error('Invoices module not available');
        mainContent.innerHTML = `
            <div class="p-6 text-center text-yellow-600">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <h3 class="text-lg font-medium">Invoices Module Not Available</h3>
                <p class="mt-2 text-sm text-gray-600">The invoices module failed to load. Please refresh the page or contact support.</p>
                <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Refresh Page
                </button>
            </div>`;
    }
}

// Helper function to show error messages
function showError(message) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-400 p-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-red-700">
                        ${message}
                    </p>
                </div>
            </div>
        </div>`;
}

async function loadDevelopers() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content element not found');
        return;
    }
    
    // Show loading state
    mainContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span class="ml-4 text-gray-600">Loading developers...</span>
        </div>
    `;
    
    try {
        console.log('[DEBUG] Starting to load developers module...');
        
        // Check if loadScript function is available
        if (typeof loadScript !== 'function') {
            throw new Error('loadScript function is not available. Make sure it is defined in index.html');
        }
        
        // Load developers.js if not already loaded
        if (typeof window.Developers === 'undefined') {
            console.log('[DEBUG] Developers module not found, loading developers.js...');
            try {
                await loadScript('developers.js');
                console.log('[DEBUG] developers.js loaded, checking for Developers object...');
                
                // Wait a bit for the script to be fully parsed and executed
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Check again if Developers is defined
                if (typeof window.Developers === 'undefined') {
                    throw new Error('Failed to load Developers module: window.Developers is still undefined');
                }
                
                console.log('[DEBUG] Developers module loaded successfully:', window.Developers);
            } catch (scriptError) {
                console.error('[DEBUG] Error loading developers.js:', scriptError);
                throw new Error(`Failed to load developers module: ${scriptError.message}`);
            }
        } else {
            console.log('[DEBUG] Developers module already loaded');
        }
        
        // Initialize the Developers module if it exists and has an init function
        if (window.Developers && typeof window.Developers.init === 'function') {
            console.log('[DEBUG] Initializing Developers module...');
            try {
                await window.Developers.init();
                console.log('[DEBUG] Developers module initialized successfully');
            } catch (initError) {
                console.error('[DEBUG] Error initializing Developers module:', initError);
                throw new Error(`Failed to initialize Developers module: ${initError.message}`);
            }
        } else {
            console.warn('[DEBUG] Developers module does not have an init function, continuing without initialization');
        }
        
        // Load the developers section
        if (window.Developers && typeof window.Developers.loadDevelopersSection === 'function') {
            console.log('[DEBUG] Loading developers section...');
            try {
                await window.Developers.loadDevelopersSection();
                console.log('[DEBUG] Developers section loaded successfully');
            } catch (loadError) {
                console.error('[DEBUG] Error loading developers section:', loadError);
                throw new Error(`Failed to load developers section: ${loadError.message}`);
            }
        } else {
            const errorMsg = 'Developers module does not have a loadDevelopersSection function';
            console.error('[DEBUG]', errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error loading developers:', error);
        mainContent.innerHTML = `
            <div class="bg-red-50 border-l-4 border-red-400 p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-700">
                            Failed to load developers. ${error.message || 'Please try again later.'}
                        </p>
                    </div>
                </div>
            </div>
            <div class="mt-4">
                <button onclick="loadDevelopers()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Retry
                </button>
            </div>
        `;
    }
}

// Check if Firebase is available
function isFirebaseAvailable() {
    return typeof firebase !== 'undefined' && 
           firebase.app && 
           typeof firebase.app === 'function' &&
           firebase.auth &&
           firebase.firestore;
}

// Initialize the app when the DOM is fully loaded
console.log('[DEBUG] Adding DOMContentLoaded listener');
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] DOMContentLoaded event fired');
    
    if (!isFirebaseAvailable()) {
        console.error('Firebase SDK not loaded. Make sure firebase scripts are included before main.js');
        // Show error to user
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <h3 class="font-bold">Initialization Error</h3>
                    <p>Firebase SDK not loaded. Please check the console for details.</p>
                    <button onclick="window.location.reload()" class="mt-2 px-4 py-1 bg-blue-500 text-white rounded">
                        Reload Page
                    </button>
                </div>
            `;
        }
        return;
    }
    
    console.log('[DEBUG] Calling initApp');
    try {
        initApp();
        console.log('[DEBUG] initApp completed successfully');
    } catch (error) {
        console.error('[DEBUG] Error in initApp:', error);
    }
});

// Expose functions to window object for global access
if (typeof window !== 'undefined') {
    window.initApp = initApp;
    window.setupNavigation = setupNavigation;
    window.loadContent = loadContent;
    window.showLoginForm = showLoginForm;
    window.handleLogin = handleLogin;
    window.loadDashboard = loadDashboard;
    window.loadProjects = loadProjects;
    window.initTasks = initTasks;
    window.loadContracts = loadContracts;
    window.loadInvoices = loadInvoices;
    window.loadDevelopers = loadDevelopers;
}
