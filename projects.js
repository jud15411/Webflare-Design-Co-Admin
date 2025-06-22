// Projects Module
const Projects = (function() {
    'use strict';
    
    // Reference to Firebase Firestore
    let db;
    let initialized = false;
    
    // Initialize function to be called after Firebase is ready
    function init() {
        if (initialized) return Promise.resolve(true);
        
        return new Promise((resolve, reject) => {
            try {
                if (typeof firebase === 'undefined' || !firebase.app()) {
                    throw new Error('Firebase not initialized');
                }
                db = firebase.firestore();
                initialized = true;
                console.log('Projects module initialized');
                resolve(true);
            } catch (error) {
                console.error('Failed to initialize Projects module:', error);
                reject(error);
            }
        });
    }

    // Helper functions
    const getStatusColor = (status) => {
        const colors = {
            'todo': ['bg-blue-100', 'text-blue-700'],
            'in-progress': ['bg-yellow-100', 'text-yellow-700'],
            'on-hold': ['bg-orange-100', 'text-orange-700'],
            'done': ['bg-green-100', 'text-green-700'],
        };
        return colors[status] || ['bg-gray-100', 'text-gray-700'];
    };

    const getStatusText = (status) => {
        const texts = {
            'todo': 'To Do',
            'in-progress': 'In Progress',
            'on-hold': 'On Hold',
            'done': 'Done',
        };
        return texts[status] || 'Unknown';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'low': 'bg-green-200',
            'medium': 'bg-yellow-200',
            'high': 'bg-red-200',
        };
        return colors[priority] || 'bg-gray-200';
    };

    // --- DOM ELEMENT CREATION ---
    const createProjectCard = (projectId, project) => {
        const card = document.createElement('div');
        card.className = 'project-card bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4 mb-4';
        card.id = `project-${projectId}`;
        card.dataset.projectId = projectId;
        card.dataset.status = project.status;
        card.draggable = true;
        card.style.cursor = 'move';

        const statusColorClasses = getStatusColor(project.status).join(' ');
        const priorityColorClass = getPriorityColor(project.priority);
        const assignedDevelopers = project.assignedDevelopers || [];

        // Create developer avatars HTML
        const developerAvatars = assignedDevelopers.length > 0 
            ? assignedDevelopers.map(dev => 
                `<span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white text-xs font-medium" 
                      title="${escapeHTML(dev.name || dev.email || 'Unknown')}">
                    ${(dev.name || dev.email || '?').charAt(0).toUpperCase()}
                </span>`
              ).join('\n')
            : '<span class="text-xs text-gray-500">No developers assigned</span>';

        card.innerHTML = `
            <div class="flex items-start justify-between">
                <h4 class="text-lg font-semibold mb-1">${escapeHTML(project.title)}</h4>
                <div class="flex items-center gap-2">
                    <span class="status-tag px-2 py-1 rounded-full text-xs font-medium ${statusColorClasses}">${getStatusText(project.status)}</span>
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${priorityColorClass}">${project.priority || 'medium'}</span>
                </div>
            </div>
            <p class="text-gray-600 text-sm mb-2">${escapeHTML(project.description || '')}</p>
            
            <div class="mt-3 mb-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-gray-500">Assigned Developers:</span>
                    <button class="text-xs text-blue-600 hover:text-blue-800" 
                            onclick="window.Projects.assignDevelopers('${projectId}')">
                        ${assignedDevelopers.length > 0 ? 'Edit' : 'Assign'} Developers
                    </button>
                </div>
                <div class="flex flex-wrap gap-1 mt-1">
                    ${developerAvatars}
                </div>
            </div>
            
            <div class="mt-4 flex justify-between items-center">
                <div class="text-sm text-gray-500">Created: ${project.createdAt ? new Date(project.createdAt.toDate()).toLocaleDateString() : 'N/A'}</div>
                <div class="flex items-center gap-2">
                    <button class="edit-btn p-1 text-blue-600 hover:text-blue-800" onclick="window.Projects.editProject('${projectId}')">Edit</button>
                    <button class="delete-btn p-1 text-red-600 hover:text-red-800" onclick="window.Projects.deleteProject('${projectId}')">Delete</button>
                </div>
            </div>`;
        return card;
    };

    // --- DRAG AND DROP LOGIC ---
    const initDragAndDrop = () => {
        const containers = document.querySelectorAll('.projects-container');
        containers.forEach(container => {
            new Sortable(container, {
                group: 'projects',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: async (evt) => {
                    const projectId = evt.item.dataset.projectId;
                    const newStatus = evt.to.closest('.kanban-column').dataset.status;

                    if (!projectId || !newStatus) return;

                    try {
                        const projectRef = db.collection('projects').doc(projectId);
                        await projectRef.update({ 
                            status: newStatus, 
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
                        });
                        
                        const statusTag = evt.item.querySelector('.status-tag');
                        if (statusTag) {
                            statusTag.className = `status-tag px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(newStatus).join(' ')}`;
                            statusTag.textContent = getStatusText(newStatus);
                        }
                    } catch (error) {
                        console.error('Error updating project status:', error);
                        showToast('Failed to update project status.', 'error');
                    }
                },
            });
        });
    };

    // --- MODAL AND FORM HANDLING ---
    const showModal = (title, formContent, onSubmit) => {
        const modalId = 'project-modal';
        document.getElementById(modalId)?.remove(); // Remove existing modal

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 class="text-xl font-bold mb-6">${title}</h2>
                <form id="project-form">
                    ${formContent}
                    <div class="flex justify-end space-x-4 mt-6">
                        <button type="button" class="cancel-btn px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const form = modal.querySelector('#project-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            onSubmit(data);
            modal.remove();
        });

        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    };

    const addProject = () => {
        const formContent = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input type="text" name="title" class="w-full p-2 border rounded" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="2" class="w-full p-2 border rounded"></textarea>
                </div>
                
                <!-- Client Information -->
                <div class="border-t border-gray-200 pt-4 mt-4">
                    <h3 class="text-sm font-medium text-gray-900 mb-3">Client Information</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                            <input type="text" name="clientName" class="w-full p-2 border rounded" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                            <input type="email" name="clientEmail" class="w-full p-2 border rounded" required>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" class="w-full p-2 border rounded" required>
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="on-hold">On Hold</option>
                            <option value="done">Done</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select name="priority" class="w-full p-2 border rounded">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        showModal('Add New Project', formContent, async (data) => {
            try {
                const projectData = {
                    title: data.title,
                    description: data.description,
                    status: data.status,
                    priority: data.priority,
                    client: {
                        name: data.clientName,
                        email: data.clientEmail,
                        addedAt: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('projects').add(projectData);
                loadProjectsSection();
                showToast('Project added successfully!', 'success');
            } catch (error) {
                console.error('Error adding project:', error);
                showToast('Failed to add project. ' + error.message, 'error');
            }
        });
    };

    const editProject = async (projectId) => {
        try {
            const projectDoc = await db.collection('projects').doc(projectId).get();
            if (!projectDoc.exists) throw new Error('Project not found');
            const project = projectDoc.data();
            
            // Ensure client object exists with default values
            const client = project.client || { name: '', email: '' };

            const formContent = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" name="title" class="w-full p-2 border rounded" value="${escapeHTML(project.title)}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" rows="2" class="w-full p-2 border rounded">${escapeHTML(project.description || '')}</textarea>
                    </div>
                    
                    <!-- Client Information -->
                    <div class="border-t border-gray-200 pt-4 mt-4">
                        <h3 class="text-sm font-medium text-gray-900 mb-3">Client Information</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                                <input type="text" name="clientName" class="w-full p-2 border rounded" value="${escapeHTML(client.name || '')}" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                                <input type="email" name="clientEmail" class="w-full p-2 border rounded" value="${escapeHTML(client.email || '')}" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select name="status" class="w-full p-2 border rounded" required>
                                <option value="todo" ${project.status === 'todo' ? 'selected' : ''}>To Do</option>
                                <option value="in-progress" ${project.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                <option value="on-hold" ${project.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
                                <option value="done" ${project.status === 'done' ? 'selected' : ''}>Done</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select name="priority" class="w-full p-2 border rounded">
                                <option value="low" ${project.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${project.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${project.priority === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

            showModal('Edit Project', formContent, async (data) => {
                try {
                    const updateData = {
                        title: data.title,
                        description: data.description,
                        status: data.status,
                        priority: data.priority,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        'client.name': data.clientName,
                        'client.email': data.clientEmail
                    };
                    
                    // Only update client.addedAt if it's a new client
                    if (!project.client) {
                        updateData['client.addedAt'] = firebase.firestore.FieldValue.serverTimestamp();
                    }
                    
                    await db.collection('projects').doc(projectId).update(updateData);
                    loadProjectsSection();
                    showToast('Project updated successfully!', 'success');
                } catch (error) {
                    console.error('Error updating project:', error);
                    showToast('Failed to update project. ' + error.message, 'error');
                }
            });
        } catch (error) {
            console.error('Error in editProject:', error);
            showToast('Failed to load project for editing. ' + error.message, 'error');
        }
    };

    const deleteProject = (projectId) => {
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            db.collection('projects').doc(projectId).delete()
                .then(() => {
                    loadProjectsSection();
                    showToast('Project deleted.', 'success');
                })
                .catch(error => {
                    console.error('Error deleting project:', error);
                    showToast('Failed to delete project.', 'error');
                });
        }
    };

    // --- UI HELPERS ---
    const showToast = (message, type = 'info') => {
        const toastId = 'toast-notification';
        document.getElementById(toastId)?.remove();

        const toast = document.createElement('div');
        toast.id = toastId;
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-gray-800';
        toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg fixed bottom-5 right-5 z-50`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    };

    const escapeHTML = (str) => {
        if (!str) return '';
        return str.replace(/[&<>'"/]/g, (tag) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '/': '&#x2F;'
        }[tag]));
    };

    // --- MAIN SECTION LOADER ---
    const loadProjectsSection = async (container) => {
        if (!container) {
            console.error('No container provided to loadProjectsSection');
            return;
        }

        // Clear the container first to prevent duplicates
        container.innerHTML = '';
        
        // Create the kanban board structure
        const kanbanBoard = document.createElement('div');
        kanbanBoard.className = 'kanban-board grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
        
        // Create columns for each status
        ['todo', 'in-progress', 'on-hold', 'done'].forEach(status => {
            const column = document.createElement('div');
            column.className = 'kanban-column bg-gray-100 p-4 rounded-lg';
            column.dataset.status = status;
            
            const heading = document.createElement('h3');
            heading.className = 'font-semibold mb-3 capitalize text-gray-700';
            heading.textContent = getStatusText(status);
            
            const projectsContainer = document.createElement('div');
            projectsContainer.className = 'projects-container min-h-[400px]';
            
            column.appendChild(heading);
            column.appendChild(projectsContainer);
            kanbanBoard.appendChild(column);
        });
        
        // Add the kanban board to the container
        container.appendChild(kanbanBoard);

        try {
            console.log('[DEBUG] Loading projects from Firestore...');
            const projectsSnapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
            console.log(`[DEBUG] Loaded ${projectsSnapshot.size} projects`);
            
            // Clear all project containers
            const projectContainers = container.querySelectorAll('.projects-container');
            projectContainers.forEach(container => {
                container.innerHTML = '';
            });
            
            // Add projects to their respective columns
            projectsSnapshot.forEach(doc => {
                const project = { id: doc.id, ...doc.data() };
                const status = project.status || 'todo';
                const columnContainer = container.querySelector(`.kanban-column[data-status="${status}"] .projects-container`);
                if (columnContainer) {
                    columnContainer.appendChild(createProjectCard(doc.id, project));
                } else {
                    console.warn(`[DEBUG] Could not find container for status: ${status}`);
                }
            });
            
            // Initialize drag and drop
            console.log('[DEBUG] Initializing drag and drop...');
            initDragAndDrop();
            
            // The add project button is now in the parent container
            // The click event will be handled by the parent's event delegation
            
        } catch (error) {
            console.error('Error loading projects:', error);
            showToast('Failed to load projects. Please try again.', 'error');
        }
};

    // --- DEVELOPER ASSIGNMENT ---
    const assignDevelopers = async (projectId) => {
        try {
            // First fetch the current project data
            const projectDoc = await db.collection('projects').doc(projectId).get();
            if (!projectDoc.exists) {
                throw new Error('Project not found');
            }
            
            const project = { id: projectDoc.id, ...projectDoc.data() };
            const currentDevelopers = project.assignedDevelopers || [];
            
            console.log('Fetching developers and admins...');
            const developersRef = db.collection('developers');
            
            // Get ALL team members (both active and inactive)
            const teamMembersSnapshot = await developersRef.get();
                
            console.log('All team members from Firestore:');
            teamMembersSnapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`- ${doc.id}:`, {
                    ...data,
                    isAdmin: data.isAdmin === true,
                    status: data.status || 'unknown'
                });
            });
            
            // Process all team members
            const allTeamMembers = teamMembersSnapshot.docs.map(doc => {
                const data = doc.data();
                const isAdmin = data.isAdmin === true;
                const teamMember = {
                    id: doc.id,
                    type: isAdmin ? 'admin' : 'developer',
                    ...data,
                    name: data.name || data.displayName || (isAdmin ? 'Admin' : 'Developer'),
                    email: data.email || ''
                };
                console.log(`Processed team member: ${teamMember.name} (${teamMember.type})`, teamMember);
                return teamMember;
            });
            
            const adminCount = allTeamMembers.filter(m => m.type === 'admin').length;
            const devCount = allTeamMembers.filter(m => m.type === 'developer').length;
            
            console.log(`Found ${allTeamMembers.length} team members (${adminCount} admins, ${devCount} developers)`);
            
            if (allTeamMembers.length === 0) {
                showToast('No team members found in the system.', 'error');
                return;
            }
            
            // Create team member selection modal content
            const modalContent = `
                <div class="space-y-4">
                    <h3 class="text-lg font-medium">Assign Team Members to ${escapeHTML(project.title)}</h3>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        ${allTeamMembers.map(member => {
                            const isAssigned = currentDevelopers.some(d => d.id === member.id);
                            return `
                                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <input type="checkbox" 
                                           class="rounded text-blue-600" 
                                           value="${member.id}" 
                                           data-type="${member.type}"
                                           ${isAssigned ? 'checked' : ''}>
                                    <span class="ml-2">
                                        ${escapeHTML(member.name || member.email)}
                                        <span class="ml-2 text-xs px-2 py-0.5 rounded-full ${member.type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                                            ${member.type}
                                        </span>
                                    </span>
                                </label>`;
                        }).join('')}
                    </div>
                    <div class="flex justify-end space-x-3 pt-4 border-t">
                        <button type="button" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border" id="cancelAssignBtn">
                            Cancel
                        </button>
                        <button type="button" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md" id="saveDevelopersBtn">
                            Save Changes
                        </button>
                    </div>
                </div>`;
                
            // Show modal
            const modal = document.createElement('div');
            modal.id = 'assignDevelopersModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
                    ${modalContent}
                </div>`;
                
            document.body.appendChild(modal);
            
            // Handle save button click
            modal.querySelector('#saveDevelopersBtn').addEventListener('click', async () => {
                const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
                const selectedDeveloperIds = Array.from(checkboxes).map(cb => cb.value);
                
                // Get team member details for selected members
                const selectedTeamMembers = allTeamMembers
                    .filter(member => selectedDeveloperIds.includes(member.id))
                    .map(({ id, name, email, type }) => ({
                        id,
                        name,
                        email,
                        type
                    }));
                
                try {
                    // Update project with assigned team members
                    await db.collection('projects').doc(projectId).update({
                        assignedTeamMembers: selectedTeamMembers,
                        assignedDevelopers: selectedTeamMembers, // Keep for backward compatibility
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Close modal and show success message
                    modal.remove();
                    showToast('Team members assigned successfully', 'success');
                    
                    // Refresh the projects list
                    const projectsContainer = document.getElementById('projects-container');
                    if (projectsContainer) {
                        loadProjectsSection(projectsContainer);
                    }
                } catch (error) {
                    console.error('Error updating project:', error);
                    showToast('Failed to assign developers', 'error');
                }
            });
            
            // Handle cancel button
            modal.querySelector('#cancelAssignBtn').addEventListener('click', () => {
                modal.remove();
            });
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
        } catch (error) {
            console.error('Error assigning developers:', error);
            showToast('Error loading developer data', 'error');
        }
    };

    // Public API
    const publicAPI = {
        init,
        loadProjectsSection: async function(container) {
            try {
                await init();
                return loadProjectsSection(container);
            } catch (error) {
                console.error('Error in loadProjectsSection:', error);
                throw error;
            }
        },
        addProject: async function() {
            try {
                await init();
                return addProject();
            } catch (error) {
                console.error('Error in addProject:', error);
                throw error;
            }
        },
        editProject: async function(projectId) {
            try {
                await init();
                return editProject(projectId);
            } catch (error) {
                console.error('Error in editProject:', error);
                throw error;
            }
        },
        deleteProject: async function(projectId) {
            try {
                await init();
                return deleteProject(projectId);
            } catch (error) {
                console.error('Error in deleteProject:', error);
                throw error;
            }
        },
        assignDevelopers: async function(projectId) {
            try {
                await init();
                return assignDevelopers(projectId);
            } catch (error) {
                console.error('Error in assignDevelopers:', error);
                throw error;
            }
        },
        initDragAndDrop: function() {
            try {
                initDragAndDrop();
                return Promise.resolve();
            } catch (error) {
                console.error('Error initializing drag and drop:', error);
                return Promise.reject(error);
            }
        }
    };

    // Make it available globally
    window.Projects = publicAPI;
})();