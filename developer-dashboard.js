// Developer Dashboard Module
(function() {
  // Helper functions
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
  const { firebase } = window;
  
  if (!firebase) {
    console.error('Firebase not loaded');
    return;
  }

  const db = firebase.firestore();
  const auth = firebase.auth();
  const DeveloperDashboard = (window.DeveloperDashboard = { __initialized: true });

  // Initialize the dashboard
  DeveloperDashboard.init = function() {
    console.log('Initializing developer dashboard...');
    
    // Set up auth state listener
    auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      
      if (!user) {
        console.log('No authenticated user, redirecting to login');
        window.location.href = '/login.html';
        return;
      }

      try {
        // Verify user role before proceeding
        const isDeveloper = await this.verifyUserRole(user);
        console.log('User role verified. Is developer?', isDeveloper);
        
        if (!isDeveloper) {
          console.log('User is not a developer, signing out...');
          await auth.signOut();
          window.location.href = '/login.html';
          return;
        }
        
        // If we get here, user is authenticated and is a developer
        console.log('User is a developer, loading dashboard...');
        this.cleanup();
        this.setupEventListeners();
        this.loadDashboard();
        
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        this.showError('Error verifying your access. Please try again.');
        // Sign out and redirect to login on error
        auth.signOut().then(() => {
          window.location.href = '/login.html';
        });
      }
    }, (error) => {
      console.error('Auth state listener error:', error);
      this.showError('Authentication error. Please refresh the page.');
    });
  };

  // Clean up event listeners
  DeveloperDashboard.cleanup = function() {
    if (this.unsubscribeProjects) this.unsubscribeProjects();
    if (this.unsubscribeTasks) this.unsubscribeTasks();
    if (this.unsubscribeUser) this.unsubscribeUser();
    
    document.removeEventListener('click', this.handleDocumentClick);
    delete this.handleDocumentClick;
  };

  // Set up event listeners
  DeveloperDashboard.setupEventListeners = function() {
    // Remove any existing click handlers first
    document.removeEventListener('click', this.handleDocumentClick);
    
    // Store reference to the handler for later removal
    this.handleDocumentClick = (e) => {
      if (e.target.matches('#refreshDashboard')) {
        e.preventDefault();
        this.loadDashboard();
      } else if (e.target.matches('.task-status-toggle')) {
        e.preventDefault();
        const taskId = e.target.closest('[data-task-id]')?.dataset.taskId;
        const newStatus = e.target.dataset.status;
        if (taskId) this.updateTaskStatus(taskId, newStatus);
      }
    };
    
    document.addEventListener('click', this.handleDocumentClick);
  };

  // Load the dashboard data
  DeveloperDashboard.loadDashboard = async function() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      this.showLoading(true);
      
      // Load user data
      await this.loadUserProfile(currentUser.uid);
      
      // Set up real-time listeners
      this.setupRealtimeListeners(currentUser.uid);
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.showError('Failed to load dashboard. Please try again.');
    } finally {
      this.showLoading(false);
    }
  };

  // Load user profile data
  DeveloperDashboard.loadUserProfile = async function(userId) {
    return new Promise((resolve, reject) => {
      this.unsubscribeUser = db.collection('users').doc(userId)
        .onSnapshot(
          (doc) => {
            if (doc.exists) {
              const userData = doc.data();
              this.updateUserProfileUI(userData);
              resolve(userData);
            } else {
              reject(new Error('User profile not found'));
            }
          },
          (error) => {
            console.error('Error loading user profile:', error);
            reject(error);
          }
        );
    });
  };

  // Set up real-time listeners for projects and tasks
  DeveloperDashboard.setupRealtimeListeners = function(userId) {
    // Listen for assigned projects
    this.unsubscribeProjects = db.collection('projects')
      .where('teamMembers', 'array-contains', userId)
      .orderBy('dueDate', 'asc')
      .onSnapshot(
        (snapshot) => {
          const projects = [];
          snapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
          });
          this.updateProjectsUI(projects);
          
          // Load tasks for these projects
          this.loadTasks(userId, projects.map(p => p.id));
        },
        (error) => {
          console.error('Error loading projects:', error);
          this.showError('Failed to load projects');
        }
      );
  };

  // Load tasks for the developer
  DeveloperDashboard.loadTasks = function(userId, projectIds) {
    if (!projectIds || projectIds.length === 0) {
      this.updateTasksUI([]);
      return;
    }
    
    this.unsubscribeTasks = db.collection('tasks')
      .where('projectId', 'in', projectIds)
      .where('assignedTo', '==', userId)
      .orderBy('dueDate', 'asc')
      .onSnapshot(
        (snapshot) => {
          const tasks = [];
          snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
          });
          this.updateTasksUI(tasks);
        },
        (error) => {
          console.error('Error loading tasks:', error);
          this.showError('Failed to load tasks');
        }
      );
  };

  // Update task status
  DeveloperDashboard.updateTaskStatus = async function(taskId, newStatus) {
    try {
      await db.collection('tasks').doc(taskId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // The real-time listener will update the UI
    } catch (error) {
      console.error('Error updating task status:', error);
      this.showError('Failed to update task status');
    }
  };

  // Update user profile UI
  DeveloperDashboard.updateUserProfileUI = function(userData) {
    const welcomeEl = qs('#welcomeMessage');
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome back, ${userData.displayName || 'Developer'}!`;
    }
    
    // Update any other profile-related UI elements
  };

  // Update projects UI
  DeveloperDashboard.updateProjectsUI = function(projects) {
    const container = qs('#projectsContainer');
    if (!container) return;
    
    if (projects.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-lg shadow p-6 text-center">
          <i class="fas fa-project-diagram text-4xl text-gray-300 mb-3"></i>
          <h3 class="text-lg font-medium text-gray-700">No projects assigned</h3>
          <p class="text-gray-500 mt-1">You don't have any projects assigned yet.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${projects.map(project => this.createProjectCard(project)).join('')}
      </div>
    `;
  };

  // Create project card HTML
  DeveloperDashboard.createProjectCard = function(project) {
    const dueDate = project.dueDate?.toDate ? 
      project.dueDate.toDate().toLocaleDateString() : 'No due date';
      
    return `
      <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div class="p-6">
          <div class="flex justify-between items-start">
            <h3 class="text-lg font-semibold text-gray-900">${project.name || 'Unnamed Project'}</h3>
            <span class="px-2 py-1 text-xs rounded-full ${
              project.status === 'completed' ? 'bg-green-100 text-green-800' :
              project.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }">
              ${project.status || 'Not started'}
            </span>
          </div>
          
          <p class="mt-2 text-sm text-gray-600">${project.description || 'No description'}</p>
          
          <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>Due: ${dueDate}</span>
              <span>${project.tasks?.length || 0} tasks</span>
            </div>
            
            <div class="mt-3">
              <a href="#" class="text-blue-600 hover:text-blue-800 text-sm font-medium" 
                 onclick="DeveloperDashboard.viewProject('${project.id}')">
                View Project <i class="fas fa-arrow-right ml-1"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Update tasks UI
  DeveloperDashboard.updateTasksUI = function(tasks) {
    const container = qs('#tasksContainer');
    if (!container) return;
    
    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-lg shadow p-6 text-center">
          <i class="fas fa-tasks text-4xl text-gray-300 mb-3"></i>
          <h3 class="text-lg font-medium text-gray-700">No tasks assigned</h3>
          <p class="text-gray-500 mt-1">You don't have any tasks assigned yet.</p>
        </div>
      `;
      return;
    }
    
    // Group tasks by status
    const todoTasks = tasks.filter(t => t.status === 'todo' || !t.status);
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- To Do -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-medium text-gray-700">To Do</h3>
            <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              ${todoTasks.length}
            </span>
          </div>
          <div class="space-y-3">
            ${todoTasks.map(task => this.createTaskCard(task)).join('')}
          </div>
        </div>
        
        <!-- In Progress -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-medium text-blue-700">In Progress</h3>
            <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              ${inProgressTasks.length}
            </span>
          </div>
          <div class="space-y-3">
            ${inProgressTasks.map(task => this.createTaskCard(task)).join('')}
          </div>
        </div>
        
        <!-- Completed -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-medium text-green-700">Completed</h3>
            <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              ${completedTasks.length}
            </span>
          </div>
          <div class="space-y-3">
            ${completedTasks.map(task => this.createTaskCard(task)).join('')}
          </div>
        </div>
      </div>
    `;
  };

  // Create task card HTML
  DeveloperDashboard.createTaskCard = function(task) {
    const dueDate = task.dueDate?.toDate ? 
      task.dueDate.toDate().toLocaleDateString() : 'No due date';
      
    return `
      <div class="bg-white rounded-lg shadow p-4" data-task-id="${task.id}">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-medium text-gray-900">${task.title || 'Untitled Task'}</h4>
            <p class="text-sm text-gray-500 mt-1">${task.projectName || ''}</p>
          </div>
          <div class="dropdown relative">
            <button class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="dropdown-menu hidden absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10">
              <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                 data-status="in-progress">Mark In Progress</a>
              <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                 data-status="completed">Mark Complete</a>
            </div>
          </div>
        </div>
        
        <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs text-gray-500">Due: ${dueDate}</span>
          <div class="flex space-x-2">
            ${task.status === 'completed' ? `
              <button class="task-status-toggle px-2 py-1 text-xs rounded bg-green-100 text-green-800" 
                      data-status="in-progress">
                Reopen
              </button>
            ` : `
              ${task.status === 'in-progress' ? `
                <button class="task-status-toggle px-2 py-1 text-xs rounded bg-blue-100 text-blue-800" 
                        data-status="completed">
                  Complete
                </button>
                <button class="task-status-toggle px-2 py-1 text-xs rounded bg-gray-100 text-gray-800" 
                        data-status="todo">
                  Move to To Do
                </button>
              ` : `
                <button class="task-status-toggle px-2 py-1 text-xs rounded bg-blue-100 text-blue-800" 
                        data-status="in-progress">
                  Start
                </button>
              `}
            `}
          </div>
        </div>
      </div>
    `;
  };

  // Show loading state
  DeveloperDashboard.showLoading = function(show) {
    const loadingEl = qs('#loadingOverlay');
    if (loadingEl) {
      loadingEl.style.display = show ? 'flex' : 'none';
    }
  };

  // Show error message
  DeveloperDashboard.showError = function(message) {
    const errorEl = qs('#errorMessage');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
      setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }
  };

  // View project details
  DeveloperDashboard.viewProject = function(projectId) {
    // Implement project view navigation
    console.log('View project:', projectId);
    // You can implement this to show project details in a modal or navigate to a project page
  };

  // Verify user role
  DeveloperDashboard.verifyUserRole = async function(user) {
    console.log('Verifying user role for:', user.uid);
    
    try {
      // First check the ID token claims (force refresh to get latest claims)
      console.log('Getting ID token result...');
      const idTokenResult = await user.getIdTokenResult(true);
      console.log('ID token claims:', idTokenResult.claims);
      
      // Check for admin or developer claims
      if (idTokenResult.claims.admin === true) {
        console.log('User is an admin (from token claims)');
        return true;
      }
      
      if (idTokenResult.claims.developer === true) {
        console.log('User is a developer (from token claims)');
        return true;
      }
      
      // Check Firestore user document
      console.log('Checking Firestore users collection...');
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log('User document data:', userData);
        
        if (userData.role === 'developer' || userData.role === 'admin') {
          console.log(`User has '${userData.role}' role in users collection`);
          return true;
        }
        
        if (userData.isAdmin === true) {
          console.log('User has isAdmin flag set to true');
          return true;
        }
      } else {
        console.log('No user document found in users collection');
      }
      
      // Check developers collection as fallback
      console.log('Checking developers collection...');
      const devDoc = await db.collection('developers').doc(user.uid).get();
      
      if (devDoc.exists) {
        console.log('User found in developers collection');
        return true;
      }
      
      console.warn('User does not have developer access:', user.uid);
      return false;
      
    } catch (error) {
      console.error('Error verifying user role:', error);
      // Instead of throwing, we'll return false to trigger a sign-out
      // This prevents unhandled promise rejections
      return false;
    }
  };

  // Note: checkUserRoleInFirestore has been removed as its functionality is now part of verifyUserRole

  // Initialize the dashboard when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the dashboard page
    if (document.querySelector('#developerDashboard')) {
      // Show loading state
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');
      
      // Wait for Firebase Auth to be ready
      const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
        try {
          if (user) {
            // Verify user role before initializing the dashboard
            const hasAccess = await DeveloperDashboard.verifyUserRole(user);
            if (hasAccess) {
              DeveloperDashboard.init();
            }
          } else {
            // Redirect to login if not authenticated
            window.location.href = '/login.html';
          }
        } catch (error) {
          console.error('Error during authentication check:', error);
          window.location.href = '/login.html';
        } finally {
          if (loadingOverlay) loadingOverlay.classList.add('hidden');
          unsubscribe();
        }
      });
    }
  });

})();
