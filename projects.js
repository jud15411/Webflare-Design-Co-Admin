// Projects Module
(function() {
    'use strict';
    
    // Reference to Firebase Firestore
    const db = firebase.firestore();

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

        card.innerHTML = `
            <div class="flex items-start justify-between">
                <h4 class="text-lg font-semibold mb-1">${escapeHTML(project.title)}</h4>
                <div class="flex items-center gap-2">
                    <span class="status-tag px-2 py-1 rounded-full text-xs font-medium ${statusColorClasses}">${getStatusText(project.status)}</span>
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${priorityColorClass}">${project.priority || 'medium'}</span>
                </div>
            </div>
            <p class="text-gray-600 text-sm mb-4">${escapeHTML(project.description || '')}</p>
            <div class="mt-4 flex justify-between items-center">
                <div class="text-sm text-gray-500">Created: ${project.createdAt ? new Date(project.createdAt.toDate()).toLocaleDateString() : 'N/A'}</div>
                <div class="flex items-center gap-2">
                    <button class="edit-btn p-1 text-blue-600 hover:text-blue-800" onclick="window.Projects.editProject('${projectId}')">Edit</button>
                    <button class="delete-btn p-1 text-red-600 hover:text-red-800" onclick="window.Projects.deleteProject('${projectId}')">Delete</button>
                </div>
            </div>
        `;
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
                    <textarea name="description" rows="3" class="w-full p-2 border rounded"></textarea>
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
                await db.collection('projects').add({ 
                    ...data, 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() 
                });
                loadProjectsSection();
                showToast('Project added successfully!', 'success');
            } catch (error) {
                console.error('Error adding project:', error);
                showToast('Failed to add project.', 'error');
            }
        });
    };

    const editProject = async (projectId) => {
        try {
            const projectDoc = await db.collection('projects').doc(projectId).get();
            if (!projectDoc.exists) throw new Error('Project not found');
            const project = projectDoc.data();

            const formContent = `
                <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input type="text" name="title" class="w-full p-2 border rounded" value="${escapeHTML(project.title)}" required>
                <label class="block text-sm font-medium text-gray-700 mt-4 mb-2">Description</label>
                <textarea name="description" class="w-full p-2 border rounded">${escapeHTML(project.description || '')}</textarea>
                <label class="block text-sm font-medium text-gray-700 mt-4 mb-2">Priority</label>
                <select name="priority" class="w-full p-2 border rounded">
                    <option value="low" ${project.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${project.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${project.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
                <label class="block text-sm font-medium text-gray-700 mt-4 mb-2">Status</label>
                <select name="status" class="w-full p-2 border rounded">
                    <option value="todo" ${project.status === 'todo' ? 'selected' : ''}>To Do</option>
                    <option value="in-progress" ${project.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="on-hold" ${project.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
                    <option value="done" ${project.status === 'done' ? 'selected' : ''}>Done</option>
                </select>
            `;
            showModal('Edit Project', formContent, async (data) => {
                try {
                    await db.collection('projects').doc(projectId).update({ 
                        ...data, 
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
                    });
                    loadProjectsSection();
                    showToast('Project updated successfully!', 'success');
                } catch (error) {
                    console.error('Error updating project:', error);
                    showToast('Failed to update project.', 'error');
                }
            });
        } catch (error) {
            console.error('Error fetching project for edit:', error);
            showToast('Failed to load project details.', 'error');
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
    const loadProjectsSection = async () => {
        // Prefer main-content inside admin panel, fallback to content
        const container = document.getElementById('main-content') || document.getElementById('content');
        if (!container) return;

        // Clear the container first to prevent duplicates
        container.innerHTML = '';
        
        const projectsHTML = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Projects</h2>
                    <button id="add-project-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        + Add Project
                    </button>
                </div>
                <div class="kanban-board grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${['todo', 'in-progress', 'on-hold', 'done'].map(status => `
                        <div class="kanban-column bg-gray-100 p-4 rounded-lg" data-status="${status}">
                            <h3 class="font-semibold mb-3 capitalize text-gray-700">${getStatusText(status)}</h3>
                            <div class="projects-container min-h-[400px]"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = projectsHTML;

        try {
            const projectsSnapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
            const projectsContainer = container.querySelector('.kanban-board');
            
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
                }
            });
            
            // Initialize drag and drop
            initDragAndDrop();
            
            // Add event listener for the main add project button
            const addProjectBtn = container.querySelector('#add-project-btn');
            if (addProjectBtn) {
                addProjectBtn.addEventListener('click', () => {
                    addProject('todo');
                });
            }
            
        } catch (error) {
            console.error('Error loading projects:', error);
            showToast('Failed to load projects. Please try again.', 'error');
        }
};

    // Public API
    const Projects = {
        loadProjectsSection,
        addProject,
        editProject,
        deleteProject
    };

    // Make it available globally
    window.Projects = Projects;
})();