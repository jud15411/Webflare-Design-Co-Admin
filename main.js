document.addEventListener('DOMContentLoaded', () => {
    // Note: db and auth are initialized in firebase-config.js and are globally available.

    const content = document.getElementById('content');
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const logoutButton = document.getElementById('logout-button');
    const loading = document.getElementById('loading');

    function showLoadingState() {
        if (loading) loading.style.display = 'flex';
        if (content) content.classList.add('hidden');
    }

    function hideLoadingState() {
        if (loading) loading.style.display = 'none';
        if (content) content.classList.remove('hidden');
    }

    function loadContent(view) {
        showLoadingState();
        console.log(`Loading view: ${view}`);
        
        setTimeout(() => {
            try {
                if (view === 'projects') {
                    if (window.Projects && typeof window.Projects.loadProjectsSection === 'function') {
                        console.log('Calling Projects.loadProjectsSection()');
                        window.Projects.loadProjectsSection();
                    } else {
                        console.error('Projects module not properly initialized:', {
                            ProjectsExists: !!window.Projects,
                            loadProjectsSectionExists: window.Projects ? typeof window.Projects.loadProjectsSection : 'Projects not defined'
                        });
                        throw new Error('Projects module not properly initialized');
                    }
                } else if (view === 'tasks') {
                    console.log('Initializing tasks view');
                    initTasks();
                } else if (view === 'contracts') {
                        loadContracts();
                } else if (view === 'invoices') {
                        loadInvoices();
                } else if (view === 'dashboard' && window.Dashboard && typeof window.Dashboard.loadDashboardSection === 'function') {
                    window.Dashboard.loadDashboardSection();
                } else {
                    const errorMsg = `View '${view}' not found or its script has not loaded.`;
                    console.error(errorMsg);
                    if (content) {
                        content.innerHTML = `<p class="text-red-500 p-4">${errorMsg}</p>`;
                    }
                }
            } catch (error) {
                console.error(`Error loading view '${view}':`, error);
                if (content) {
                    content.innerHTML = `
                        <div class="p-4">
                            <h2 class="text-xl font-bold text-red-600 mb-2">Error loading ${view}</h2>
                            <p class="text-red-500">${error.message}</p>
                            <p class="mt-2 text-sm text-gray-600">Check the console for more details.</p>
                        </div>`;
                }
            } finally {
                hideLoadingState();
            }
        }, 100); // Slightly increased timeout to ensure scripts are loaded
    }

    // Function to setup navigation event listeners
    function setupNavigation() {
        console.log('Setting up navigation...');
        
        // Log the navigation container HTML for debugging
        const navContainer = document.querySelector('nav');
        if (navContainer) {
            console.log('Navigation container HTML:', navContainer.outerHTML);
        } else {
            console.error('Navigation container not found!');
        }
        
        // Remove existing event listeners first to prevent duplicates
        document.removeEventListener('click', handleNavClick);
        
        // Add new event listener
        document.addEventListener('click', handleNavClick);
        
        // Log the nav links we found
        const navLinks = document.querySelectorAll('[data-view]');
        console.log('Navigation links found:', navLinks.length);
        navLinks.forEach((link, index) => {
            console.log(`Nav link #${index + 1}:`);
            console.log('- Text:', link.textContent.trim());
            console.log('- data-view:', link.dataset.view);
            console.log('- HTML:', link.outerHTML);
        });
    }
    
    // Handle navigation clicks
    function handleNavClick(e) {
        console.log('Navigation click detected', e.target);
        
        const navLink = e.target.closest('[data-view]');
        console.log('Found nav link:', navLink);
        
        if (!navLink) {
            console.log('No data-view attribute found on clicked element or its parents');
            return;
        }
        
        e.preventDefault();
        const view = navLink.dataset.view;
        console.log('Loading view:', view);
        
        // Update active state
        const allNavLinks = document.querySelectorAll('[data-view]');
        console.log('Found nav links:', allNavLinks.length);
        
        allNavLinks.forEach(l => l.classList.remove('bg-gray-700'));
        navLink.classList.add('bg-gray-700');
        
        // Load the content
        loadContent(view);
    }

    // Firebase Auth State Observer
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('User is signed in:', user.email);
            if (loginContainer) loginContainer.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'block';
            
            const projectsLink = document.querySelector('[data-view="projects"]');
            if(projectsLink) {
                projectsLink.classList.add('bg-gray-700');
            }
            loadContent('projects');

        } else {
            console.log('User is signed out.');
            if (loginContainer) loginContainer.style.display = 'block';
            if (adminPanel) adminPanel.style.display = 'none';
            if (content) content.innerHTML = '';
            hideLoadingState();
        }
    });

    // Logout button handler
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().catch(error => {
                console.error('Sign out error:', error);
            });
        });
    }

    // Initialize idle timeout
    let idleTimeout;
    const idleDuration = 10 * 60 * 1000; // 10 minutes in milliseconds

    // Reset idle timeout on user activity
    function resetIdleTimeout() {
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
            // Show a warning dialog before logging out
            const warning = document.createElement('div');
            warning.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            warning.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-lg">
                    <h3 class="text-xl font-bold mb-4">Session Expiring</h3>
                    <p class="mb-4">Your session will expire in 30 seconds due to inactivity.</p>
                    <div class="flex justify-end space-x-3">
                        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onclick="resetIdleTimeout(); this.closest('.fixed').remove()">
                            Continue Session
                        </button>
                        <button class="px-4 py-2 text-gray-600 hover:text-gray-800" onclick="signOut(); this.closest('.fixed').remove()">
                            Log Out
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(warning);

            // Set a final timeout to log out after 30 seconds
            setTimeout(() => {
                signOut();
            }, 30000); // 30 seconds
        }, idleDuration);
    }

    // Reset timeout on any user activity
    document.addEventListener('mousemove', resetIdleTimeout);
    document.addEventListener('keypress', resetIdleTimeout);
    document.addEventListener('click', resetIdleTimeout);
    document.addEventListener('scroll', resetIdleTimeout);

    // Check if user is already logged in
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is logged in
            try {
                // Check if user is admin
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().role === 'admin') {
                    // User is admin, show main content
                    hideLoading();
                    content.innerHTML = `
                        <div class="min-h-screen flex">
                            <!-- Sidebar -->
                            <div class="w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white">
                                <div class="p-6">
                                    <h1 class="text-3xl font-bold">Webflare Admin</h1>
                                </div>
                                <nav class="mt-4">
                                    <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200" data-view="projects">
                                        <div class="flex items-center">
                                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                            <span>Projects</span>
                                        </div>
                                    </a>
                                    <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200" data-view="tasks">
                                        <div class="flex items-center">
                                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                                            </svg>
                                            <span>Tasks</span>
                                        </div>
                                    </a>
                                    <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200" onclick="loadContracts()">
                                        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        Contracts
                                    </a>
                                    <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200" onclick="loadInvoices()">
                                        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Invoices
                                    </a>
                                    <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200" onclick="loadDevelopers()">
                                        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                        Developers
                                    </a>
                                    <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200" onclick="signOut()">
                                        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                        </svg>
                                        Sign Out
                                    </a>
                                </nav>
                            </div>
                            <!-- Main Content -->
                            <div class="flex-1 p-8">
                                <div id="main-content"></div>
                            </div>
                        </div>
                    `;
                    // Setup navigation
                    setupNavigation();
                    
                    // Load default section
                    loadContent('projects');
                    
                    // Start idle timeout
                    resetIdleTimeout();
                } else {
                    // User is not admin
                    signOut();
                }
            } catch (error) {
                console.error('Error checking user role:', error);
                signOut();
            }
        } else {
            // User is not logged in
            showLoginForm();
        }
    });
});

// ----- GLOBAL HELPER FUNCTIONS -----
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

function signOut() {
    if (typeof auth !== 'undefined') {
        auth.signOut().catch(err => console.error('Sign-out error:', err));
    }
}

// Safe wrapper that loads the Projects section (dynamically if necessary)
function loadProjects() {
    if (window.Projects && typeof window.Projects.loadProjectsSection === 'function') {
        window.Projects.loadProjectsSection();
    } else {
        const script = document.createElement('script');
        script.src = 'projects.js';
        script.onload = () => window.Projects?.loadProjectsSection();
        document.body.appendChild(script);
    }
}

// Function to show login form
function showLoginForm() {
    const content = document.getElementById('content');
    hideLoading();
    content.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
            <div class="bg-white p-8 rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold mb-4">Admin Login</h2>
                <form id="loginForm">
                    <div class="mb-4">
                        <input type="email" id="email" class="w-full p-2 rounded border" placeholder="Email">
                    </div>
                    <div class="mb-4">
                        <input type="password" id="password" class="w-full p-2 rounded border" placeholder="Password">
                    </div>
                    <button type="submit" 
                        class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
                        <span class="flex items-center justify-center">
                            <span>Secure Login</span>
                            <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                            </svg>
                        </span>
                    </button>
                    <div id="loginError" class="hidden text-red-500 text-base mt-4"></div>
                </form>
            </div>
        </div>
    `;

    // Handle login form submission
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('loginError');
        loginError.textContent = '';
        loginError.classList.add('hidden');

        // Validate inputs
        if (!email || !password) {
            loginError.textContent = 'Please fill in all fields';
            loginError.classList.remove('hidden');
            return;
        }

        try {
            showLoading();
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Check if user is admin
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists || userDoc.data().role !== 'admin') {
                throw new Error('Access denied. Admin privileges required.');
            }
            
            // User is authenticated and admin
            hideLoading();
            content.innerHTML = `
                <div class="min-h-screen flex">
                    <!-- Sidebar -->
                    <div class="w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white">
                        <div class="p-6">
                            <h1 class="text-3xl font-bold">Webflare Admin</h1>
                        </div>
                        <nav class="mt-4">
                            <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200" onclick="loadProjects()">
                                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                                Projects
                            </a>
                            <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200">
                                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                </svg>
                                Tasks
                            </a>
                            <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200">
                                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                                </svg>
                                Contracts
                            </a>
                            <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200">
                                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Invoices
                            </a>
                            <a href="#" class="block px-6 py-3 hover:bg-gray-700 transition duration-200">
                                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                </svg>
                                Developers
                            </a>
                            <a href="#" onclick="signOut()" class="block px-6 py-3 hover:bg-gray-700 transition duration-200">
                                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                                Logout
                            </a>
                        </nav>
                    </div>

                    <!-- Main Content -->
                    <div class="flex-1 p-8">
                        <h2 class="text-2xl font-bold mb-4">Welcome, ${user.email}</h2>
                        <div id="main-content"></div>
                    </div>
                </div>
            `;

            // Initialize content based on selected menu item
            const menuItems = document.querySelectorAll('nav a');
            menuItems.forEach(item => {
                item.addEventListener('click', async function() {
                    const mainContent = document.getElementById('main-content');
                    showLoading();
                    
                    try {
                        switch(item.textContent.trim()) {
                            case 'Projects':
                                // Load projects.js if not already loaded
                                if (typeof window.loadProjectsSection !== 'function') {
                                    const script = document.createElement('script');
                                    script.src = 'projects.js';
                                    script.onload = async () => {
                                        await window.loadProjectsSection();
                                    };
                                    document.body.appendChild(script);
                                } else {
                                    await window.loadProjectsSection();
                                }
                                break;
                            case 'Tasks':
                                await loadTasks();
                                break;
                            case 'Contracts':
                                await loadContracts();
                                break;
                            case 'Invoices':
                                await loadInvoices();
                                break;
                            case 'Developers':
                                await loadDevelopers();
                                break;
                        }
                        hideLoading();
                    } catch (error) {
                        console.error('Error loading section:', error);
                        hideLoading();
                        mainContent.innerHTML = `
                            <div class="pl-12 w-full px-6 py-4 rounded-xl border border-white/20 bg-white/5 focus:ring-2 focus:ring-white focus:border-white">
                                <strong>Error:</strong> ${error.message || 'Failed to load section. Please try again.'}
                            </div>
                        `;
                    }
                });
            });

        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
            hideLoading();
        }
    });
}

// Function to initialize tasks from tasks.js
async function initTasks() {
    const mainContent = document.getElementById('main-content');
    
    // First clear any existing content
    mainContent.innerHTML = '';
    
    // Show loading state
    showLoading();
    
    // Check if tasks.js is loaded
    if (typeof window.Tasks === 'undefined') {
        // If tasks.js is not loaded, create a script element to load it
        const script = document.createElement('script');
        script.src = 'tasks.js';
        script.onload = () => {
            // Now that tasks.js is loaded, try loading tasks
            try {
                if (window.Tasks && typeof window.Tasks.loadTasks === 'function') {
                    window.Tasks.loadTasks();
                } else if (typeof window.loadTasks === 'function') {
                    // Fallback to global loadTasks for backward compatibility
                    window.loadTasks();
                } else {
                    throw new Error('Tasks module not properly initialized');
                }
                hideLoading();
            } catch (error) {
                console.error('Error initializing tasks:', error);
                mainContent.innerHTML = `
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <strong>Error:</strong> ${error.message || 'Failed to initialize tasks. Please try again.'}
                    </div>
                `;
                hideLoading();
            }
        };
        script.onerror = () => {
            console.error('Failed to load tasks.js');
            mainContent.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> Failed to load tasks module. Please refresh the page and try again.
                </div>
            `;
            hideLoading();
        };
        document.body.appendChild(script);
    } else {
        // If tasks.js is already loaded, just load the tasks
        try {
            if (window.Tasks && typeof window.Tasks.loadTasks === 'function') {
                window.Tasks.loadTasks();
            } else if (typeof window.loadTasks === 'function') {
                // Fallback to global loadTasks for backward compatibility
                window.loadTasks();
            } else {
                throw new Error('Tasks module not properly initialized');
            }
            hideLoading();
        } catch (error) {
            console.error('Error loading tasks:', error);
            mainContent.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> ${error.message || 'Failed to load tasks. Please try again.'}
                </div>
            `;
            hideLoading();
        }
    }
}

// Add sign out function
function signOut() {
    auth.signOut().then(() => {
        showLoginForm();
    }).catch(error => {
        alert('Error signing out: ' + error.message);
    });
}

// Helper functions for loading different sections
async function loadProjects() {
    const mainContent = document.getElementById('main-content');
    
    // First clear any existing content
    mainContent.innerHTML = '';
    
    // Show loading state
    showLoading();
    
    // Check if projects.js is loaded
    if (!window.Projects?.loadProjectsSection) {
        // If projects.js is not loaded, create a script element to load it
        const script = document.createElement('script');
        script.src = 'projects.js';
        script.type = 'module'; // Add type=module to ensure proper loading
        script.onload = () => {
            // Give a small delay to ensure the module is fully initialized
            setTimeout(() => {
                try {
                    window.Projects.loadProjectsSection();
                    hideLoading();
                } catch (error) {
                    console.error('Error loading projects:', error);
                    mainContent.innerHTML = `
                        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            <strong>Error:</strong> ${error.message || 'Failed to load projects. Please try again.'}
                        </div>
                    `;
                    hideLoading();
                }
            }, 100); // Small delay to ensure module is ready
        };
        script.onerror = (error) => {
            console.error('Error loading projects.js:', error);
            mainContent.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> Failed to load projects.js. Please try refreshing the page.
                </div>
            `;
            hideLoading();
        };
        document.body.appendChild(script);
    } else {
        // If projects.js is already loaded, just load the projects
        try {
            window.Projects.loadProjectsSection();
            hideLoading();
        } catch (error) {
            console.error('Error loading projects:', error);
            mainContent.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> ${error.message || 'Failed to load projects. Please try again.'}
                </div>
            `;
            hideLoading();
        }
    }
}

async function loadContracts() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content element not found');
        return;
    }
    
    // First clear any existing content
    mainContent.innerHTML = '';
    
    // Show loading state
    showLoading();
    
    try {
        // Load contracts.js if not already loaded
        if (typeof window.Contracts === 'undefined') {
            const script = document.createElement('script');
            script.src = 'contracts.js';
            script.onload = async () => {
                try {
                    // First load the contracts section HTML
                    await window.Contracts.loadContractsSection();
                    // Then initialize it
                    await window.Contracts.initializeContractsSection();
                } catch (error) {
                    console.error('Error initializing contracts:', error);
                    mainContent.innerHTML = `
                        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            <strong>Error:</strong> ${error.message || 'Failed to initialize contracts. Please try again.'}
                        </div>`;
                } finally {
                    hideLoading();
                }
            };
            script.onerror = () => {
                console.error('Failed to load contracts.js');
                mainContent.innerHTML = `
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <strong>Error:</strong> Failed to load contracts module. Please refresh the page.
                    </div>`;
                hideLoading();
            };
            document.body.appendChild(script);
        } else {
            // If already loaded, just reload the section
            try {
                await window.Contracts.loadContractsSection();
                await window.Contracts.initializeContractsSection();
                hideLoading();
            } catch (error) {
                console.error('Error reloading contracts:', error);
                mainContent.innerHTML = `
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <strong>Error:</strong> ${error.message || 'Failed to reload contracts. Please try again.'}
                    </div>`;
                hideLoading();
            }
        }
    } catch (error) {
        console.error('Error in loadContracts:', error);
        mainContent.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> ${error.message || 'An unexpected error occurred while loading contracts.'}
            </div>`;
        hideLoading();
    }
}

async function loadInvoices() {
    const mainContent=document.getElementById('main-content');
    if(!mainContent){console.error('Main content element not found');return;}
    mainContent.innerHTML='';
    showLoading();
    try{
      if(typeof window.Invoices==='undefined'){
        const script=document.createElement('script');
        script.src='invoices.js';
        script.onload=async()=>{
          try{
            await window.Invoices.loadInvoicesSection();
            await window.Invoices.initializeInvoicesSection();
          }catch(err){
            console.error('Error initializing invoices',err);
            mainContent.innerHTML=`<div class="error">${err.message||'Failed to initialize invoices.'}</div>`;
          }finally{hideLoading();}
        };
        script.onerror=()=>{
          mainContent.innerHTML='<div class="error">Failed to load invoices module.</div>';
          hideLoading();
        };
        document.body.appendChild(script);
      }else{
        await window.Invoices.loadInvoicesSection();
        await window.Invoices.initializeInvoicesSection();
        hideLoading();
      }
    }catch(error){
      mainContent.innerHTML=`<div class="error">${error.message}</div>`;
      hideLoading();
    }
}

async function loadDevelopers() {
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="bg-white p-8 rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold mb-4">Developers</h2>
            <p class="text-gray-600">Developers section will be implemented soon...</p>
        </div>
    `;
}