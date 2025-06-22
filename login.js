// Login module
window.Login = window.Login || {
    // Initialize Firebase if not already initialized
    initFirebase: function() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase is not loaded');
            return false;
        }
        
        try {
            // Initialize Firebase if not already initialized
            if (!firebase.apps.length) {
                if (!window.config) {
                    console.error('Configuration is missing');
                    return false;
                }
                
                // Use window.firebaseConfig if available, otherwise fall back to window.config
                const firebaseConfig = window.firebaseConfig || {
                    apiKey: window.config.FIREBASE_API_KEY,
                    authDomain: window.config.FIREBASE_AUTH_DOMAIN,
                    projectId: window.config.FIREBASE_PROJECT_ID,
                    storageBucket: window.config.FIREBASE_STORAGE_BUCKET,
                    messagingSenderId: window.config.FIREBASE_MESSAGING_SENDER_ID,
                    appId: window.config.FIREBASE_APP_ID
                };
                
                if (!firebaseConfig.apiKey) {
                    console.error('Firebase configuration is missing required fields');
                    return false;
                }
                
                firebase.initializeApp(firebaseConfig);
                console.log('Firebase initialized in login module');
            }
            return true;
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            return false;
        }
    },
    
    // Initialize the login page
    init: function() {
        console.log('Initializing login module...');
        console.log('Document ready state:', document.readyState);
        console.log('Login module loaded, starting initialization');
        
        // Ensure the login container exists
        const loginContainer = document.getElementById('login-container');
        if (!loginContainer) {
            console.error('Login container not found');
            document.body.innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                    <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                        <h2 class="text-2xl font-bold text-red-600 mb-4">Error</h2>
                        <p class="text-gray-700 mb-6">Critical error: Could not initialize login system.</p>
                        <p class="text-sm text-gray-500 mb-6">Please contact support if the problem persists.</p>
                        <button onclick="window.location.reload()" 
                                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                            Refresh Page
                        </button>
                    </div>
                </div>`;
            return;
        }
        
        // Show loading state
        loginContainer.innerHTML = `
            <div class="w-full max-w-md mx-auto">
                <div class="bg-white p-8 rounded-lg shadow-md">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                        <p class="mt-4 text-gray-600">Initializing authentication...</p>
                    </div>
                </div>
            </div>`;
        
        // Initialize Firebase first
        console.log('Initializing Firebase...');
        if (!this.initFirebase()) {
            console.error('Firebase initialization failed');
            this.showError('Failed to initialize authentication service. Please check your connection and refresh the page.');
            return;
        }
        console.log('Firebase initialized successfully');
        
        // Check if user is already logged in
        console.log('Setting up auth state listener...');
        firebase.auth().onAuthStateChanged(async (user) => {
            console.log('Auth state changed, user:', user ? 'Logged in as ' + user.email : 'No user');
            if (user) {
                try {
                    // Force token refresh to get latest claims
                    const idTokenResult = await user.getIdTokenResult(true);
                    
                    // Check if user is admin or developer
                    const usersRef = firebase.firestore().collection('users');
                    const developersRef = firebase.firestore().collection('developers');
                    
                    // Get user document
                    const userDoc = await usersRef.doc(user.uid).get();
                    const userData = userDoc.data() || {};
                    const userHasAdminRole = idTokenResult.claims.admin === true || userData.isAdmin === true;
                    
                    // If user is not admin, check if they're an active developer
                    let isActiveDeveloper = false;
                    if (!userHasAdminRole) {
                        const developerDoc = await developersRef
                            .where('email', '==', user.email)
                            .limit(1)
                            .get();
                            
                        if (!developerDoc.empty) {
                            const developerData = developerDoc.docs[0].data();
                            isActiveDeveloper = developerData.status !== 'inactive';
                            
                            if (!isActiveDeveloper) {
                                // Developer is inactive, sign them out and show message
                                console.log('Inactive developer attempted to log in:', user.email);
                                await firebase.auth().signOut();
                                this.showError('Your account has been deactivated. Please contact an administrator.');
                                return;
                            }
                        } else {
                            console.log('No developer record found for:', user.email);
                        }
                    }
                    
                    const userIsDeveloper = userData.role === 'developer' || !userHasAdminRole;
                    
                    // Store user data in sessionStorage before redirecting
                    const userSessionData = {
                        uid: user.uid,
                        email: user.email,
                        role: userHasAdminRole ? 'admin' : (userIsDeveloper ? 'developer' : 'unknown'),
                        isActive: userHasAdminRole ? true : isActiveDeveloper
                    };
                    sessionStorage.setItem('user', JSON.stringify(userSessionData));
                    
                    // Redirect based on user type
                    console.log('User roles - Admin:', userHasAdminRole, 'Developer:', userIsDeveloper, 'Active:', userSessionData.isActive);
                    if (userHasAdminRole) {
                        console.log('Redirecting admin to index page');
                        window.location.href = '/index.html';
                    } else if (userIsDeveloper && isActiveDeveloper) {
                        console.log('Redirecting active developer to dashboard');
                        window.location.href = '/developer-dashboard.html';
                    } else {
                        // If user doesn't have any assigned role or is inactive
                        console.warn('User has no valid role or is inactive, showing login form');
                        sessionStorage.removeItem('user');
                        await firebase.auth().signOut();
                        this.showError('You do not have permission to access this system. Please contact an administrator.');
                    }
                } catch (error) {
                    console.error('Error checking user role:', error);
                    this.show();
                }
            } else {
                this.show();
            }
        });
    },
    // Show error message
    showError: function(message) {
        console.log('Showing login form...');
        const loginContainer = document.getElementById('login-container');
        if (!loginContainer) {
            console.error('Login container not found');
            document.body.innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-red-50 p-6">
                    <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                        <h2 class="text-2xl font-bold text-red-600 mb-4">Error</h2>
                        <p class="text-gray-700 mb-6">Critical error: Could not find login container.</p>
                        <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Refresh Page
                        </button>
                    </div>
                </div>`;
            return;
        }
        
        // Create or update error message
        let errorEl = loginContainer.querySelector('.error-message');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error-message bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded';
            loginContainer.insertBefore(errorEl, loginContainer.firstChild);
        }
        
        errorEl.textContent = message || 'An error occurred. Please try again.';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorEl.style.opacity = '0';
            setTimeout(() => errorEl.remove(), 300);
        }, 5000);
    },
    
    // Show the login form
    show: function() {
        const appContainer = document.body.firstElementChild;
        if (!appContainer) return;

        // Clear the entire app container
        appContainer.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-100">
                <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
                    <div class="text-center">
                        <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
                            Webflare Design Co.
                        </h2>
                        <p class="mt-2 text-sm text-gray-600">
                            Sign in to your admin or developer account
                        </p>
                    </div>
                    <form id="login-form" class="mt-8 space-y-6">
                        <div class="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label for="email" class="sr-only">Email address</label>
                                <input id="email" name="email" type="email" autocomplete="email" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                                       placeholder="Email address">
                            </div>
                            <div>
                                <label for="password" class="sr-only">Password</label>
                                <input id="password" name="password" type="password" autocomplete="current-password" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                                       placeholder="Password">
                            </div>
                        </div>

                        <div id="login-error" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong class="font-bold">Error: </strong>
                            <span class="block sm:inline" id="login-error-message"></span>
                        </div>

                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <input id="remember-me" name="remember-me" type="checkbox" 
                                       class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                                <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                                    Remember me
                                </label>
                            </div>
                            <div class="text-sm">
                                <a href="#" class="font-medium text-blue-600 hover:text-blue-500">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <div id="login-error" class="hidden text-red-600 text-sm"></div>

                        <div>
                            <button type="submit" 
                                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                    <svg class="h-5 w-5 text-blue-500 group-hover:text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                                    </svg>
                                </span>
                                Sign in
                            </button>
                        </div>
                    </form>
                    <div class="text-center text-sm text-gray-500 mt-4">
                        <p>Need an account? <a href="#" class="text-blue-600 hover:text-blue-500 font-medium">Contact administrator</a></p>
                    </div>
                </div>
            </div>
        `;

        // Set up form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.onsubmit = this.handleLogin.bind(this);
        }
    },

    // Handle login form submission
    handleLogin: async function(e) {
        e.preventDefault();
        
        const loginForm = e.target;
        const email = loginForm.email.value.trim();
        const password = loginForm.password.value;
        const rememberMe = loginForm['remember-me'].checked;
        const loginErrorElement = document.getElementById('login-error');
        const loginErrorMessageElement = document.getElementById('login-error-message');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Reset error state
        if (loginErrorElement) {
            loginErrorElement.classList.add('hidden');
        }
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
            `;
            
            // Initialize Firebase if not already initialized
            if (!this.initFirebase()) {
                throw new Error('Failed to initialize Firebase');
            }
            
            const auth = firebase.auth();
            const errorElement = document.getElementById('login-error');
            
            if (!errorElement) {
                throw new Error('Error element not found');
            }
            
            // Set persistence based on remember me
            const persistence = rememberMe ? 
                firebase.auth.Auth.Persistence.LOCAL : 
                firebase.auth.Auth.Persistence.SESSION;
                
            console.log('Setting auth persistence to:', persistence);
            await auth.setPersistence(persistence);
            
            // Sign in with email and password
            console.log('Attempting to sign in with email:', email);
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log('Sign in successful, user:', user.uid);
            
            console.log('User signed in:', user.uid);
            
            // Force token refresh to get latest claims
            await user.getIdToken(true);
            
            // Check if user is admin by checking custom claims
            const idTokenResult = await user.getIdTokenResult();
            const isAdmin = idTokenResult.claims.admin === true || 
                          idTokenResult.claims.email_verified === true;
            
            console.log('User claims:', idTokenResult.claims);
            
            // If not admin via claims, check users collection as fallback
            if (!isAdmin) {
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .get();
                
                const userData = userDoc.data() || {};
                
                if (!userDoc.exists || !userData.isAdmin) {
                    await auth.signOut();
                    throw new Error('You do not have admin access');
                }
                
                // If user is admin in Firestore but not in claims, try to update claims
                if (userData && userData.isAdmin) {
                    try {
                        // Try to use Firebase Functions if available
                        if (firebase.functions) {
                            const setAdminRole = firebase.functions().httpsCallable('setAdminRole');
                            await setAdminRole({ uid: user.uid, admin: true });
                            // Force token refresh
                            await user.getIdToken(true);
                        } else {
                            console.warn('Firebase Functions not available. Using Firestore admin flag.');
                            // If Firebase Functions isn't available, we'll rely on the Firestore flag
                        }
                    } catch (funcError) {
                        console.warn('Error calling setAdminRole function:', funcError);
                        // Continue with the login even if function call fails
                    }
                }
            }
            
            // If we get here, login was successful
            console.log('Login successful, checking user type...');
            
            // Check if user is admin or developer
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .get();
                
            const userData = userDoc.data() || {};
            
            // Check admin status from both claims and Firestore
            const userHasAdminRole = idTokenResult.claims.admin === true || 
                                   (userData && userData.isAdmin === true);
            
            // If user is not admin, check if they have developer role
            let userIsDeveloper = false;
            if (!userHasAdminRole) {
                userIsDeveloper = userData && (
                    userData.role === 'developer' || 
                    userData.isDeveloper === true ||
                    // If no role is explicitly set, default to developer
                    (userData.role === undefined && userData.isAdmin === undefined)
                );
                
                // If no role is set at all, set default role to developer
                if (userData.role === undefined && userData.isAdmin === undefined) {
                    try {
                        await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .set({ 
                                role: 'developer',
                                email: user.email,
                                lastLogin: firebase.firestore.FieldValue.serverTimestamp() 
                            }, { merge: true });
                        console.log('Set default developer role for user');
                    } catch (error) {
                        console.error('Error setting default role:', error);
                    }
                }
            }
            
            console.log('User roles - Admin:', userHasAdminRole, 'Developer:', userIsDeveloper);
            
            // Redirect based on user type
            if (userHasAdminRole) {
                console.log('Redirecting to admin dashboard');
                // Force a hard redirect to ensure the page fully reloads
                window.location.replace('/index.html');
                return; // Prevent further execution
            } 
            
            if (userIsDeveloper) {
                console.log('Redirecting to developer dashboard');
                // Force a hard redirect to ensure the page fully reloads
                window.location.replace('/developer-dashboard.html');
                return; // Prevent further execution
            }
            
            // If user doesn't have any assigned role
            console.warn('User has no assigned role, logging out');
            await auth.signOut();
            throw new Error('Your account is not properly configured. Please contact your administrator.');
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Format error message
            let errorMessage = 'Failed to sign in. Please try again.';
            
            switch(error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Invalid email or password';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection and try again.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
            
            // Show error to user
            if (loginErrorElement && loginErrorMessageElement) {
                loginErrorMessageElement.textContent = errorMessage;
                loginErrorElement.classList.remove('hidden');
                loginErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // Fallback to alert if error elements not found
                alert(errorMessage);
            }
            
            // Re-enable the submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            
            // Focus back on the email field
            const emailField = loginForm.email;
            if (emailField) {
                emailField.focus();
            }
        }
    },
    
    // Show password change modal for developers
    showPasswordChangeModal: function(user) {
        const appContainer = document.body.firstElementChild;
        if (!appContainer) return;
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white rounded-lg p-6 w-full max-w-md';
        
        // Add HTML content
        modalContent.innerHTML = `
            <h3 class="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
            <p class="text-sm text-gray-600 mb-4">Please change your password to continue.</p>
            
            <form id="password-change-form" class="space-y-4">
                <div>
                    <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input type="password" id="new-password" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Enter new password">
                </div>
                
                <div>
                    <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input type="password" id="confirm-password" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Confirm new password">
                </div>
                
                <div id="password-error" class="hidden text-red-600 text-sm mt-2"></div>
                
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Update Password
                    </button>
                </div>
            </form>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Handle form submission
        const passwordForm = modalContent.querySelector('#password-change-form');
        const passwordErrorElement = modalContent.querySelector('#password-error');
        
        passwordForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate passwords
            if (newPassword !== confirmPassword) {
                errorElement.textContent = 'Passwords do not match';
                errorElement.classList.remove('hidden');
                return;
            }
            
            if (newPassword.length < 6) {
                errorElement.textContent = 'Password must be at least 6 characters';
                errorElement.classList.remove('hidden');
                return;
            }
            
            errorElement.classList.add('hidden');
            
            try {
                // Update password
                await user.updatePassword(newPassword);
                
                // Update Firestore
                await firebase.firestore().collection('users').doc(user.uid).update({
                    mustChangePassword: false,
                    lastPasswordChange: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Remove modal
                modal.remove();
                
                // Show success message
                alert('Password updated successfully!');
                
            } catch (error) {
                console.error('Password update error:', error);
                errorElement.textContent = error.message || 'Failed to update password. Please try again.';
                errorElement.classList.remove('hidden');
            }
        };
        
        // Handle clicks outside modal
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                // Sign out user if they close the modal
                auth.signOut();
            }
        };
    }
};
