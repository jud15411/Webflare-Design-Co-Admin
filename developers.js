// Create the Developers module
(function() {
  'use strict';
  
  console.log('[Developers] Module loading...');

  // Helper functions
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Check if Firebase is available
  if (!window.firebase) {
    console.error('[Developers] Firebase not loaded');
    return {}; // Return empty object if Firebase is not available
  }

  // Initialize Firebase services
  const { firebase } = window;
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Create the Developers object
  const Developers = {};
  
  // Initialize module state
  Developers.__initialized = false;
  Developers.__initializing = false;
  Developers.__error = null;
  Developers._isLoading = false;
  
  /**
   * Show an error message to the user
   * @param {string} title - The title of the error
   * @param {string} message - The error message
   * @param {number} [duration=5000] - How long to show the error in ms
   */
  Developers.showError = function(title, message, duration = 5000) {
    console.error(`[Developers] ${title}:`, message);
    
    // Create or get notification container
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'fixed top-4 right-4 z-50 space-y-2 w-80';
      document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg';
    notification.role = 'alert';
    
    // Add title if provided
    if (title) {
      const titleEl = document.createElement('p');
      titleEl.className = 'font-bold';
      titleEl.textContent = title;
      notification.appendChild(titleEl);
    }
    
    // Add message
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    notification.appendChild(messageEl);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-1 right-1 text-red-500 hover:text-red-700';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => notification.remove();
    notification.appendChild(closeButton);
    
    // Add to container
    container.appendChild(notification);
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode === container) {
          notification.style.opacity = '0';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }
    
    return notification;
  };
  
  /**
   * Show a success message to the user
   * @param {string} message - The success message
   * @param {number} [duration=3000] - How long to show the message in ms
   */
  Developers.showSuccess = function(message, duration = 3000) {
    console.log('[Developers] Success:', message);
    
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'fixed top-4 right-4 z-50 space-y-2 w-80';
      document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = 'bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg';
    notification.role = 'alert';
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    notification.appendChild(messageEl);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-1 right-1 text-green-500 hover:text-green-700';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => notification.remove();
    notification.appendChild(closeButton);
    
    container.appendChild(notification);
    
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode === container) {
          notification.style.opacity = '0';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }
    
    return notification;
  };
  
  /**
   * Show or hide loading state
   * @param {boolean} isLoading - Whether to show or hide loading state
   * @param {string} [message='Loading...'] - Optional loading message
   */
  Developers.showLoading = function(isLoading, message = 'Loading...') {
    this._isLoading = isLoading;
    
    // Create or get loading overlay
    let overlay = document.getElementById('loading-overlay');
    
    if (isLoading) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const spinner = document.createElement('div');
        spinner.className = 'bg-white p-6 rounded-lg shadow-xl text-center';
        spinner.innerHTML = `
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-700">${message}</p>
        `;
        
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
      }
    } else if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay && overlay.parentNode === document.body) {
          document.body.removeChild(overlay);
          document.body.style.overflow = '';
        }
      }, 300);
    }
  };

  /**
   * Initialize the Developers module
   * @returns {Promise<boolean>}
   */
  Developers.init = async function() {
    try {
      // Prevent multiple initializations
      if (this.__initialized) {
        console.log('[Developers] Module already initialized');
        return true;
      }
      
      // Prevent concurrent initializations
      if (this.__initializing) {
        console.log('[Developers] Initialization already in progress');
        return new Promise((resolve, reject) => {
          const checkInitialized = setInterval(() => {
            if (this.__initialized) {
              clearInterval(checkInitialized);
              resolve(true);
            } else if (this.__error) {
              clearInterval(checkInitialized);
              reject(this.__error);
            }
          }, 100);
        });
      }
      
      // Mark as initializing
      this.__initializing = true;
      this.__error = null;
      
      console.log('[Developers] Initializing module...');
      
      // Check authentication
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please sign in.');
      }
      
      // Mark as initialized
      this.__initialized = true;
      this.__initializing = false;
      
      console.log('[Developers] Module initialized successfully');
      return true;
      
    } catch (error) {
      console.error('[Developers] Initialization error:', error);
      this.__error = error;
      this.__initialized = false;
      this.__initializing = false;
      throw error;
    }
  };

  /**
   * Create the developers section HTML
   * @returns {string} HTML string
   */
  Developers.createDevelopersSectionHTML = function() {
    return `
      <div id="developers-container" class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Developers</h2>
          <button id="addDeveloperBtn" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center">
            <i class="fas fa-user-plus mr-2"></i>
            Add Developer
          </button>
        </div>
        
        <!-- Tabs -->
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            <button id="activeTab" class="tab-button border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="active">
              Active Developers
              <span id="activeCount" class="bg-blue-100 text-blue-600 hidden ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium">0</span>
            </button>
            <button id="inactiveTab" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="inactive">
              Inactive Developers
              <span id="inactiveCount" class="bg-gray-100 text-gray-600 hidden ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium">0</span>
            </button>
          </nav>
        </div>
        
        <!-- Active Developers -->
        <div id="active" class="tab-content">
          <div class="bg-white shadow overflow-hidden sm:rounded-md">
            <ul id="activeDevelopersList" class="divide-y divide-gray-200">
              <li class="flex items-center justify-center py-8">
                <div class="animate-pulse text-gray-500">Loading active developers...</div>
              </li>
            </ul>
          </div>
        </div>
        
        <!-- Inactive Developers -->
        <div id="inactive" class="tab-content hidden">
          <div class="bg-white shadow overflow-hidden sm:rounded-md">
            <ul id="inactiveDevelopersList" class="divide-y divide-gray-200">
              <li class="flex items-center justify-center py-8">
                <div class="animate-pulse text-gray-500">Loading inactive developers...</div>
              </li>
            </ul>
          </div>
        </div>
      </div>`;
  };
  
  /**
   * Set up tab switching
   */
  Developers.setupTabs = function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // Update active tab button
        tabButtons.forEach(btn => {
          btn.classList.remove('border-blue-500', 'text-blue-600');
          btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });
        button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        button.classList.add('border-blue-500', 'text-blue-600');
        
        // Show active tab content
        tabContents.forEach(content => {
          content.classList.add('hidden');
        });
        document.getElementById(tabId).classList.remove('hidden');
      });
    });
    
    // Activate the first tab by default if none is active
    const activeTabs = document.querySelectorAll('.tab-button[class*="border-blue-500"]');
    if (activeTabs.length === 0 && tabButtons.length > 0) {
      tabButtons[0].click();
    }
  };
  
  /**
   * Load and render the developers section
   * @returns {Promise<void>}
   */
  Developers.loadDevelopersSection = async function() {
    try {
      const main = qs('#main-content');
      if (!main) { 
        throw new Error('Main content container not found');
      }
      
      // Show loading state
      main.innerHTML = `
        <div class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span class="ml-4 text-gray-600">Loading developers...</span>
        </div>`;
      
      // Initialize the module if not already done
      if (!this.__initialized) {
        await this.init();
      }
      
      // Render the developers section
      main.innerHTML = this.createDevelopersSectionHTML();
      
      // Set up tabs
      this.setupTabs();
      
      // Load developers data
      await this.loadDevelopers();
      
    } catch (error) {
      console.error('[Developers] Error loading section:', error);
      this.showError(
        'Failed to load developers',
        error.message || 'Please try again later.'
      );
      throw error;
    }
  };

  /**
   * Load developers from Firestore
   * @returns {Promise<void>}
   */
  Developers.loadDevelopers = async function() {
    console.log('[Developers] Starting to load developers...');
    
    // Prevent multiple simultaneous loads
    if (this._isLoading) {
      console.log('[Developers] Load already in progress');
      return;
    }
    
    this._isLoading = true;
    
    // Get the main container
    const container = qs('#developers-container');
    if (!container) {
      console.error('Main developers container not found');
      this._isLoading = false;
      this.showError('Error', 'Could not find the developers section. The page may not have loaded correctly.');
      return;
    }
    
    // Get the active and inactive containers
    const activeContainer = qs('#activeDevelopersList');
    const inactiveContainer = qs('#inactiveDevelopersList');
    
    if (!activeContainer || !inactiveContainer) {
      console.error('Developers list containers not found');
      this._isLoading = false;
      this.showError('Error', 'Could not find developer lists. The page may not have loaded correctly.');
      return;
    }
    
    // Show loading state in both containers
    activeContainer.innerHTML = `
      <li class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-gray-600">Loading active developers...</span>
      </li>`;
      
    inactiveContainer.innerHTML = `
      <li class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-gray-600">Loading inactive developers...</span>
      </li>`;
    
    try {
      // Get current user
      const user = auth.currentUser;
      console.log('[Developers] Current user:', user ? user.uid : 'No user');
      
      if (!user) {
        console.warn('[Developers] No authenticated user');
        // Try to get the current user from auth state
        return new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) {
              console.log('[Developers] User authenticated via auth state:', user.uid);
              await this.loadDevelopers();
            } else {
              console.error('[Developers] User not authenticated after auth state check');
              container.innerHTML = `
                <div class="text-center py-12">
                  <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                    <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                  </div>
                  <h3 class="mt-4 text-lg font-medium text-gray-900">Authentication Required</h3>
                  <p class="mt-2 text-sm text-gray-500">You need to be signed in to view this page.</p>
                  <div class="mt-6">
                    <a href="/login.html" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Go to Login
                    </a>
                  </div>
                </div>`;
            }
            resolve();
          });
        });
      }
      
      // Check if user is admin from Firestore admins collection
      console.log('[Developers] Checking admin status in Firestore for user:', user.uid);
      
      let isAdmin = false;
      try {
        const adminDoc = await db.collection('admins').doc(user.uid).get({
          source: 'server' // Force network request to get fresh data
        });
        isAdmin = adminDoc.exists;
        
        console.log('[Developers] Admin check result:', { 
          exists: adminDoc.exists, 
          data: adminDoc.data() 
        });
        
        if (!isAdmin) {
          console.warn('[Developers] User is not listed in the admins collection');
          this.showNotAdminUI(container);
          this._isLoading = false;
          return;
        }
      } catch (error) {
        console.error('[Developers] Error checking admin status:', error);
        this.showError('Error', `Failed to verify admin status: ${error.message || 'Please try again later.'}`);
        this._isLoading = false;
        return;
      }
      
      // If we get here, user is admin
      console.log('[Developers] User is authorized as admin, fetching developers...');
      
      // Fetch developers from Firestore with error handling
      let developersSnapshot;
      try {
        developersSnapshot = await db.collection('developers')
          .orderBy('createdAt', 'desc')
          .get({ source: 'server' });
        
        console.log(`[Developers] Successfully fetched ${developersSnapshot.size} developers`);
      } catch (error) {
        console.error('[Developers] Error fetching developers:', error);
        this.showError('Error', `Failed to load developers: ${error.message || 'Please try again later.'}`);
        this._isLoading = false;
        return;
      }
      
      if (developersSnapshot.empty) {
        console.log('[Developers] No developers found in the database');
        activeContainer.innerHTML = `
          <div class="text-center py-12">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100">
              <i class="fas fa-users text-gray-400 text-2xl"></i>
            </div>
            <h3 class="mt-4 text-lg font-medium text-gray-900">No Developers Found</h3>
            <p class="mt-2 text-sm text-gray-500">There are no developers in the database yet.</p>
            <div class="mt-6">
              <button id="addFirstDeveloperBtn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <i class="fas fa-plus mr-2"></i>Add First Developer
              </button>
            </div>
          </div>`;
          
        // Clear the inactive container
        inactiveContainer.innerHTML = `
          <div class="text-center py-12">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100">
              <i class="fas fa-users text-gray-400 text-2xl"></i>
            </div>
            <h3 class="mt-4 text-lg font-medium text-gray-900">No Inactive Developers</h3>
            <p class="mt-2 text-sm text-gray-500">There are no inactive developers in the database.</p>
          </div>`;
        this._isLoading = false;
        return;
      }
      
      // Process developers
      const developers = [];
      developersSnapshot.forEach(doc => {
        developers.push({ id: doc.id, ...doc.data() });
      });
      
      // Render active and inactive developers in their respective containers
      this.renderDevelopersList(activeContainer, developers);
      this.renderDevelopersList(inactiveContainer, developers);
      
      // Update the count badges
      const activeCount = developers.filter(d => d.status !== 'inactive').length;
      const inactiveCount = developers.filter(d => d.status === 'inactive').length;
      
      const activeCountEl = document.getElementById('activeCount');
      const inactiveCountEl = document.getElementById('inactiveCount');
      
      if (activeCountEl) {
        activeCountEl.textContent = activeCount;
        activeCountEl.classList.toggle('hidden', activeCount === 0);
      }
      
      if (inactiveCountEl) {
        inactiveCountEl.textContent = inactiveCount;
        inactiveCountEl.classList.toggle('hidden', inactiveCount === 0);
      }
      
    } catch (error) {
      console.error('[Developers] Error in loadDevelopers:', error);
      this.showError(
        'An error occurred',
        error.message || 'Failed to load developers. Please try again.'
      );
      throw error;
    } finally {
      this._isLoading = false;
    }
  };

  /**
   * Render developers list with enhanced UI
   * @param {HTMLElement} container - The container to render in
   * @param {Array} developers - Array of developer objects
   */
  Developers.renderDevelopersList = function(container, developers) {
    if (!container) return;
    
    // Determine if this is the active or inactive list
    const isActiveList = container.id === 'activeDevelopersList';
    const status = isActiveList ? 'active' : 'inactive';
    const filteredDevelopers = developers.filter(dev => 
      isActiveList ? (dev.status !== 'inactive') : (dev.status === 'inactive')
    );
    
    // If no developers, show empty state
    if (filteredDevelopers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100">
            <i class="fas fa-users text-gray-400 text-2xl"></i>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">
            ${isActiveList ? 'No Active Developers' : 'No Inactive Developers'}
          </h3>
          <p class="mt-2 text-sm text-gray-500">
            ${isActiveList 
              ? 'There are no active developers in the database.' 
              : 'There are no inactive developers in the database.'}
          </p>
          ${isActiveList ? `
            <div class="mt-6">
              <button id="addFirstDeveloperBtn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <i class="fas fa-plus mr-2"></i>Add First Developer
              </button>
            </div>`
          : ''}
        </div>`;
      return;
    }
    
    // Otherwise, render the developers list
    container.innerHTML = `
      <div class="bg-white shadow overflow-hidden sm:rounded-md">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              ${isActiveList ? 'Active' : 'Inactive'} Developers 
              <span class="text-sm text-gray-500 font-normal">(${filteredDevelopers.length})</span>
            </h3>
          </div>
          
          <!-- Search and Filter Bar -->
          <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1 max-w-lg">
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-search text-gray-400"></i>
                </div>
                <input type="text" id="${status}SearchDevelopers" class="search-developers focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border" placeholder="Search ${isActiveList ? 'active' : 'inactive'} developers...">
              </div>
            </div>
          </div>
        </div>
        
        <!-- Developers List -->
        <ul class="divide-y divide-gray-200">
          ${filteredDevelopers.map(dev => this.createDeveloperCard(dev)).join('')}
        </ul>
      </div>`;
    
    // Initialize search and filter functionality
    this.setupSearchAndFilter();
  };
  
  /**
   * Setup search and filter functionality
   */
  Developers.setupSearchAndFilter = function() {
    const searchInput = qs('#searchDevelopers');
    const filterSelect = qs('#filterStatus');
    const developerItems = qsa('.developer-item');
    const noResults = qs('#noDevelopersFound');
    
    if (!searchInput || !filterSelect) return;
    
    const filterDevelopers = () => {
      const searchTerm = searchInput.value.toLowerCase();
      const statusFilter = filterSelect.value;
      let hasVisibleItems = false;
      
      developerItems.forEach(item => {
        const name = item.getAttribute('data-name')?.toLowerCase() || '';
        const email = item.getAttribute('data-email')?.toLowerCase() || '';
        const status = item.getAttribute('data-status') || '';
        
        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        
        if (matchesSearch && matchesStatus) {
          item.classList.remove('hidden');
          hasVisibleItems = true;
        } else {
          item.classList.add('hidden');
        }
      });
      
      // Show/hide no results message
      if (noResults) {
        noResults.classList.toggle('hidden', hasVisibleItems);
        noResults.classList.toggle('block', !hasVisibleItems);
      }
    };
    
    searchInput.addEventListener('input', filterDevelopers);
    filterSelect.addEventListener('change', filterDevelopers);
  };
  
  /**
   * Create HTML for a developer card
   * @param {Object} developer - Developer data
   * @returns {string} HTML string
   */
  Developers.createDeveloperCard = function(developer) {
    if (!developer) return '';
    
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      'on-leave': 'bg-yellow-100 text-yellow-800'
    };
    
    const statusText = developer.status ? developer.status.replace('-', ' ') : 'unknown';
    const statusColor = statusColors[developer.status] || 'bg-gray-100 text-gray-800';
    
    return `
      <li class="developer-item" data-id="${developer.id}" data-name="${developer.name || ''}" data-email="${developer.email || ''}" data-status="${developer.status || ''}">
        <div class="px-4 py-4 sm:px-6 hover:bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                ${developer.avatar ? 
                  `<img src="${developer.avatar}" alt="${developer.name}" class="h-full w-full object-cover">` : 
                  `<i class="fas fa-user text-gray-400 text-xl"></i>`
                }
              </div>
              <div class="ml-4">
                <div class="flex items-center">
                  <h4 class="text-sm font-medium text-blue-600 truncate">${developer.name || 'Unnamed Developer'}</h4>
                  <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                    ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
                  </span>
                </div>
                <div class="mt-1 text-sm text-gray-500">${developer.role || 'Developer'}</div>
                <div class="mt-1 text-xs text-gray-400">
                  <i class="far fa-envelope mr-1"></i> ${developer.email || 'No email'}
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button type="button" class="edit-developer inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" data-id="${developer.id}">
                <i class="fas fa-edit mr-1"></i> Edit
              </button>
              <button type="button" class="deactivate-developer inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500" data-id="${developer.id}" data-name="${developer.name || 'this developer'}">
                <i class="fas fa-user-slash mr-1"></i> ${developer.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
              </button>
            </div>
          </div>
          ${developer.skills?.length > 0 ? `
          ` : ''}
        </div>
      </div>
    </li>`;
};

  /**
   * Show a custom confirmation modal
   * @param {string} title - Modal title
   * @param {string} message - Confirmation message
   * @param {string} confirmText - Text for the confirm button
   * @param {string} cancelText - Text for the cancel button
   * @param {Function} onConfirm - Callback when confirmed
   * @param {string} [confirmButtonClass='bg-red-600 hover:bg-red-700'] - CSS class for confirm button
   */
  Developers.showConfirmationModal = function(title, message, confirmText, cancelText, onConfirm, confirmButtonClass = 'bg-red-600 hover:bg-red-700') {
    // Remove any existing modals
    const existingModal = document.getElementById('confirmation-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
      <div id="confirmation-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">${title}</h3>
            <p class="text-gray-600 mb-6">${message}</p>
            <div class="flex justify-end space-x-3">
              <button id="confirm-cancel" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                ${cancelText}
              </button>
              <button id="confirm-ok" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-white ${confirmButtonClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                ${confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Get modal elements
    const modal = document.getElementById('confirmation-modal');
    const confirmBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    
    // Handle confirm button click
    confirmBtn.addEventListener('click', () => {
      modal.remove();
      onConfirm();
    });
    
    // Handle cancel button click
    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Close on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  };
  
  /**
   * Show confirmation dialog for deactivating a developer
   * @param {string} developerId - ID of the developer to deactivate
   * @param {string} developerName - Name of the developer for the confirmation message
   */
  Developers.confirmDeactivateDeveloper = function(developerId, developerName) {
    if (!developerId) {
      console.error('No developer ID provided for deactivation');
      return;
    }
    
    this.showConfirmationModal(
      'Deactivate Developer',
      `Are you sure you want to deactivate ${developerName}? They will no longer be able to access the system.`,
      'Deactivate',
      'Cancel',
      () => this.updateDeveloperStatus(developerId, 'inactive'),
      'bg-yellow-600 hover:bg-yellow-700'
    );
  };
  
  /**
   * Show confirmation dialog for reactivating a developer
   * @param {string} developerId - ID of the developer to reactivate
   * @param {string} developerName - Name of the developer for the confirmation message
   */
  Developers.confirmReactivateDeveloper = function(developerId, developerName) {
    if (!developerId) {
      console.error('No developer ID provided for reactivation');
      return;
    }
    
    this.showConfirmationModal(
      'Reactivate Developer',
      `Are you sure you want to reactivate ${developerName}? They will regain access to the system.`,
      'Reactivate',
      'Cancel',
      () => this.updateDeveloperStatus(developerId, 'active'),
      'bg-green-600 hover:bg-green-700'
    );
  };
  
  /**
   * Update a developer's status (active/inactive)
   * @param {string} developerId - ID of the developer to update
   * @param {string} status - New status ('active' or 'inactive')
   */
  Developers.updateDeveloperStatus = async function(developerId, status) {
    if (!developerId || !status) {
      console.error('Developer ID and status are required');
      return;
    }
    
    try {
      // Show loading state
      this.showLoading(true);
      
      // Get current user
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to perform this action');
      }
      
      // Check if user is admin
      const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
      if (!userDoc.exists || !userDoc.data().isAdmin) {
        throw new Error('You do not have permission to perform this action');
      }
      
      // Update the developer's status in Firestore
      await firebase.firestore().collection('developers').doc(developerId).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
      });
      
      console.log(`[Developers] Developer ${developerId} status updated to ${status}`);
      
      // Show success message
      this.showSuccess(`Developer ${status === 'active' ? 'reactivated' : 'deactivated'} successfully`);
      
      // Reload the developers list
      await this.loadDevelopers();
      
    } catch (error) {
      console.error(`[Developers] Error updating developer status:`, error);
      this.showError(
        'Failed to update developer status',
        error.message || 'Please try again later.'
      );
    } finally {
      this.showLoading(false);
    }
  };

  /**
   * Setup event delegation for developer actions
   */
  Developers.setupEventDelegation = function() {
    // Use event delegation on the document to handle dynamically added elements
    document.addEventListener('click', async (e) => {
      const deactivateBtn = e.target.closest('.deactivate-developer');
      const editBtn = e.target.closest('.edit-developer');
      
      if (deactivateBtn) {
        e.preventDefault();
        const developerId = deactivateBtn.getAttribute('data-id');
        const developerName = deactivateBtn.getAttribute('data-name');
        const isInactive = deactivateBtn.textContent.trim().toLowerCase().includes('reactivate');
        
        if (isInactive) {
          this.confirmReactivateDeveloper(developerId, developerName);
        } else {
          this.confirmDeactivateDeveloper(developerId, developerName);
        }
      } else if (editBtn) {
        e.preventDefault();
        const developerId = editBtn.getAttribute('data-id');
        
        try {
          this.showLoading(true, 'Loading developer data...');
          const developerDoc = await firebase.firestore()
            .collection('developers')
            .doc(developerId)
            .get();
            
          if (developerDoc.exists) {
            this.showEditDeveloperModal(developerId, {
              ...developerDoc.data(),
              id: developerDoc.id
            });
          } else {
            throw new Error('Developer not found');
          }
        } catch (error) {
          console.error('Error loading developer data:', error);
          this.showError('Failed to load developer data', error.message || 'Please try again later.');
        } finally {
          this.showLoading(false);
        }
      }
    });
  };

  /**
   * Show the edit developer modal
   * @param {string} developerId - ID of the developer to edit
   * @param {Object} developerData - Current developer data
   */
  /**
   * Generate a random temporary password
   * @returns {string} A random 12-character password
   */
  Developers.generateTemporaryPassword = function() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  /**
   * Reset a developer's password to a temporary password
   * @param {string} email - The developer's email
   * @param {string} developerId - The developer's document ID
   */
  Developers.resetDeveloperPassword = async function(email, developerId) {
    try {
      this.showLoading(true, 'Resetting password...');
      
      // Generate a temporary password
      const tempPassword = this.generateTemporaryPassword();
      
      // Get the user by email
      const userRecord = await firebase.auth().getUserByEmail(email);
      
      // Update the password in Firebase Auth
      await firebase.auth().updateUser(userRecord.uid, {
        password: tempPassword
      });
      
      // Store the temporary password in Firestore
      await firebase.firestore()
        .collection('developers')
        .doc(developerId)
        .update({
          tempPassword: tempPassword,
          passwordUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: firebase.auth().currentUser?.uid || 'system'
        });
      
      this.showSuccess('Password reset successfully');
      
      // Show the temporary password in a secure way
      this.showConfirmationModal(
        'Temporary Password',
        `Password has been reset. The temporary password is: <div class='mt-2 p-2 bg-gray-100 rounded font-mono text-sm break-all'>${tempPassword}</div><p class='mt-2 text-sm text-red-600'>Please copy this password and share it securely with the developer.</p>`,
        'I\'ve copied the password',
        '',
        () => {},
        'bg-blue-600 hover:bg-blue-700',
        true
      );
      
      return tempPassword;
    } catch (error) {
      console.error('Error resetting password:', error);
      this.showError('Failed to reset password', error.message || 'Please try again later.');
      throw error;
    } finally {
      this.showLoading(false);
    }
  };

  /**
   * Show the edit developer modal
   * @param {string} developerId - ID of the developer to edit
   * @param {Object} developerData - Current developer data
   */
  Developers.showEditDeveloperModal = function(developerId, developerData = {}) {
    // Remove any existing modals
    const existingModal = document.getElementById('edit-developer-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
      <div id="edit-developer-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium text-gray-900">Edit Developer</h3>
              <button type="button" class="text-gray-400 hover:text-gray-500" id="close-edit-modal">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <form id="edit-developer-form" class="space-y-4">
              <input type="hidden" id="edit-developer-id" value="${developerId}">
              
              <div>
                <label for="edit-name" class="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" id="edit-name" name="name" required
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value="${developerData.name || ''}">
              </div>
              
              <div>
                <label for="edit-email" class="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" id="edit-email" name="email" required
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value="${developerData.email || ''}">
              </div>
              
              <div>
                <label for="edit-role" class="block text-sm font-medium text-gray-700">Role</label>
                <input type="text" id="edit-role" name="role"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value="${developerData.role || ''}" placeholder="e.g., Frontend Developer">
              </div>
              
              <div>
                <label for="edit-status" class="block text-sm font-medium text-gray-700">Status</label>
                <select id="edit-status" name="status"
                  class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="active" ${developerData.status === 'active' ? 'selected' : ''}>Active</option>
                  <option value="inactive" ${developerData.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                  <option value="on-leave" ${developerData.status === 'on-leave' ? 'selected' : ''}>On Leave</option>
                </select>
              </div>
              
              <div class="pt-4 flex flex-col space-y-3">
                <div class="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div>
                    <h4 class="text-sm font-medium text-gray-700">Password</h4>
                    <p class="text-xs text-gray-500">Reset the developer's password</p>
                  </div>
                  <button type="button" id="reset-password" class="px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
                    Reset Password
                  </button>
                </div>
                
                <div class="flex justify-end space-x-3 pt-2">
                  <button type="button" id="cancel-edit" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Cancel
                  </button>
                  <button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Get modal elements
    const modal = document.getElementById('edit-developer-modal');
    const form = document.getElementById('edit-developer-form');
    const closeBtn = document.getElementById('close-edit-modal');
    const cancelBtn = document.getElementById('cancel-edit');
    const resetPasswordBtn = document.getElementById('reset-password');
    
    // Handle password reset
    resetPasswordBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Show confirmation dialog
      this.showConfirmationModal(
        'Reset Password',
        `Are you sure you want to reset the password for ${developerData.name || 'this developer'}? A temporary password will be generated.`,
        'Reset Password',
        'Cancel',
        async () => {
          try {
            await this.resetDeveloperPassword(developerData.email, developerId);
          } catch (error) {
            // Error is already handled in the resetDeveloperPassword method
          }
        },
        'bg-amber-600 hover:bg-amber-700'
      );
    });
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        name: document.getElementById('edit-name').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        role: document.getElementById('edit-role').value.trim(),
        status: document.getElementById('edit-status').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: firebase.auth().currentUser?.uid || 'system'
      };
      
      try {
        this.showLoading(true, 'Updating developer...');
        
        await firebase.firestore()
          .collection('developers')
          .doc(developerId)
          .update(formData);
        
        this.showSuccess('Developer updated successfully');
        await this.loadDevelopers();
        modal.remove();
      } catch (error) {
        console.error('Error updating developer:', error);
        this.showError('Failed to update developer', error.message || 'Please try again later.');
      } finally {
        this.showLoading(false);
      }
    });
    
    // Close modal handlers
    const closeModal = () => modal.remove();
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Close on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  };

  // Initialize the module when the script loads
  const initModule = () => {
    console.log('[Developers] Initializing module');
    console.log('[Developers] Developers object:', Developers);
    
    // Setup event delegation
    if (typeof Developers.setupEventDelegation === 'function') {
      console.log('[Developers] Setting up event delegation');
      Developers.setupEventDelegation();
    } else {
      console.error('[Developers] setupEventDelegation is not a function');
    }
  };

  // Initialize based on document ready state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
  } else {
    // If the document is already loaded, initialize immediately
    initModule();
  }

  // Add a test method that we can call from the console
  Developers.testDevelopersModule = function() {
    console.log('[Developers] Test function called');
    console.log('showAddDeveloperModal exists:', typeof this.showAddDeveloperModal === 'function');
    return 'Test function called successfully';
  };
  
  // Add the showAddDeveloperModal method to the Developers object
  Developers.showAddDeveloperModal = showAddDeveloperModal;
  
  // Add the togglePasswordVisibility method to the Developers object
  Developers.togglePasswordVisibility = togglePasswordVisibility;
  
  // Add the createFirebaseUser method to the Developers object
  Developers.createFirebaseUser = createFirebaseUser;
  
  console.log('[Developers] Module loaded and ready');
  console.log('[Developers] Available methods:', Object.keys(Developers));
  
  // Debug: Log that the module is fully loaded
  console.log('[Developers] Module execution complete');
  
  // Assign to window.Developers if not already set
  if (typeof window.Developers === 'undefined') {
    window.Developers = Developers;
  }
  
  // Function to show the add developer modal
  function showAddDeveloperModal() {
    console.log('Showing add developer modal');
    
    // Create and show the modal
    const modal = document.createElement('div');
    modal.id = 'developer-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Add New Developer</h3>
          <button type="button" id="closeDeveloperModal" class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
            <span class="sr-only">Close modal</span>
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="addDeveloperForm" class="p-6">
          <p class="text-gray-600 mb-4">Add a new developer to the system.</p>
          <div class="mt-4">
            <label for="developerName" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" id="developerName" name="name" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          </div>
          <div class="mt-4">
            <label for="developerEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="developerEmail" name="email" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          </div>
          <div class="mt-4">
            <label for="developerRole" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input type="text" id="developerRole" name="role" placeholder="e.g., Frontend Developer"
                   class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          </div>
          <div class="mt-4">
            <label for="temporaryPassword" class="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
            <div class="relative">
              <input type="password" id="temporaryPassword" name="temporaryPassword" required minlength="8"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a temporary password">
              <button type="button" 
                      onclick="togglePasswordVisibility('temporaryPassword', 'toggleTempPw')"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center"
                      id="toggleTempPw">
                <i class="far fa-eye text-gray-500 hover:text-gray-700"></i>
              </button>
            </div>
            <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters long</p>
          </div>
          <div class="mt-4">
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div class="relative">
              <input type="password" id="confirmPassword" name="confirmPassword" required minlength="8"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm the temporary password">
              <button type="button" 
                      onclick="togglePasswordVisibility('confirmPassword', 'toggleConfirmPw')"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center"
                      id="toggleConfirmPw">
                <i class="far fa-eye text-gray-500 hover:text-gray-700"></i>
              </button>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button type="button" id="cancelAddDeveloper" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Add Developer
            </button>
          </div>
        </form>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Get form and input elements
    const form = modal.querySelector('#addDeveloperForm');
    const nameInput = modal.querySelector('#developerName');
    const emailInput = modal.querySelector('#developerEmail');
    const roleInput = modal.querySelector('#developerRole');
    
    // Focus on the first input
    if (nameInput) nameInput.focus();
    
    // Close modal handlers
    const closeModal = () => document.body.removeChild(modal);
    
    modal.querySelector('#closeDeveloperModal').addEventListener('click', closeModal);
    modal.querySelector('#cancelAddDeveloper').addEventListener('click', closeModal);
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = nameInput.value.trim();
      const email = emailInput.value.trim().toLowerCase();
      const role = roleInput.value.trim();
      const password = document.getElementById('temporaryPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Basic validation
      if (!name || !email || !password || !confirmPassword) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }
      
      if (password.length < 8) {
        showToast('Password must be at least 8 characters long', 'error');
        return;
      }
      
      // Disable form and show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const submitBtnText = submitBtn.querySelector('#submitBtnText');
      const submitBtnSpinner = submitBtn.querySelector('#submitBtnSpinner');
      
      submitBtn.disabled = true;
      submitBtnText.textContent = 'Creating Account...';
      submitBtnSpinner.classList.remove('hidden');
      
      try {
        // Get current admin user
        const adminUser = auth.currentUser;
        if (!adminUser) {
          throw new Error('You must be logged in to add a developer');
        }
        
        // Check if user is admin
        const adminDoc = await db.collection('admins').doc(adminUser.uid).get();
        if (!adminDoc.exists || !adminDoc.data().isAdmin) {
          throw new Error('You do not have permission to add developers');
        }
        
        // Create Firebase auth user
        const userId = await createFirebaseUser(email, password, name);
        
        // Add developer to Firestore
        await db.collection('developers').doc(userId).set({
          name,
          email,
          role: role || 'Developer',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: adminUser.uid,
          status: 'active',
          lastPasswordChange: null,  // Will be set after first password change
          requiresPasswordChange: true,  // Force password change on first login
          temporaryPassword: password  // Store temporarily for verification
        });
        
        // Add user to the 'users' collection for role-based access
        await db.collection('users').doc(userId).set({
          email,
          displayName: name,
          role: 'developer',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: null,  // Will be set on first successful login
          isActive: true,
          requirePasswordChange: true
        });
        
        // Show success message
        showToast('Developer account created successfully. They will be required to change their password on first login.', 'success');
        
        // Close the modal
        closeModal();
        
        // Refresh the developers list
        if (window.location.hash === '#developers') {
          Developers.loadDevelopersSection();
        }
        
      } catch (error) {
        console.error('Error adding developer:', error);
        let errorMessage = 'Error creating developer account';
        
        // More specific error messages
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'A user with this email already exists';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Please enter a valid email address';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please choose a stronger password';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
      } finally {
        // Re-enable form
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtnText.textContent = 'Add Developer';
          submitBtnSpinner.classList.add('hidden');
        }
      }
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  // Add password toggle functionality to the window object
  window.togglePasswordVisibility = function(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (input && button) {
      const icon = button.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    }
  };

  // Handle add developer button clicks through event delegation
  function handleAddDeveloperClick(e) {
    const addBtn = e.target.closest('#addFirstDeveloperBtn, #addDeveloperBtn');
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if a modal is already open
      if (!document.getElementById('developer-modal')) {
        showAddDeveloperModal();
      }
    }
  }
  
  // Add the event listener
  document.addEventListener('click', handleAddDeveloperClick);
  
  // Function to create a Firebase user with email and password
  async function createFirebaseUser(email, password, displayName) {
    try {
      // Create the user with email and password
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Update user profile with display name
      await user.updateProfile({
        displayName: displayName
      });
      
      // Sign out the current session to force login
      await auth.signOut();
      
      return user.uid;
    } catch (error) {
      console.error('Error creating Firebase user:', error);
      throw error;
    }
  }
  
  return Developers;
})();

// Debug: Log that the script has been executed
console.log('[Developers] Script execution complete');
console.log('window.Developers available:', typeof window.Developers !== 'undefined');
if (typeof window.Developers !== 'undefined') {
  console.log('window.Developers methods:', Object.keys(window.Developers));
}
